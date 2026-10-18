import mongoose from "mongoose";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ProjectFile from "../models/ProjectFile.js";
import { findProjectAccess } from "../utils/projectAccess.js";
import recordActivity from "../utils/recordActivity.js";
import { supportedTextExtensions } from "../middleware/uploadMiddleware.js";

const uploadDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));
const maxTextPreviewSize = 200 * 1024;
const maxAiCodeSize = 20000;

function storedPath(storageName) {
  if (!storageName || path.basename(storageName) !== storageName) return null;
  return path.join(uploadDirectory, storageName);
}

function safeOriginalName(name) {
  return path.basename(String(name).replaceAll("\\", "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 255);
}

function fileResponse(file) {
  const data = file.toObject ? file.toObject() : { ...file };
  delete data.storageName;
  return data;
}

async function getAuthorizedFile(id, userId) {
  if (!mongoose.isValidObjectId(id)) return { error: "invalid" };
  const file = await ProjectFile.findById(id);
  if (!file) return { error: "missing" };
  if (!(await findProjectAccess(file.project, userId))) return { error: "missing" };
  return { file };
}

export async function listProjectFiles(req, res, next) {
  try {
    const { projectId } = req.query;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "A valid project ID is required" });
    }
    if (!(await findProjectAccess(projectId, req.user._id))) {
      return res.status(404).json({ success: false, message: "Project not found or access denied" });
    }
    const files = await ProjectFile.find({ project: projectId })
      .select("-storageName")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: files.length, files });
  } catch (error) {
    next(error);
  }
}

export async function uploadProjectFile(req, res, next) {
  let stored;
  try {
    const projectId = req.body?.projectId;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Choose a file to upload" });
    }
    stored = storedPath(req.file.filename);
    if (!mongoose.isValidObjectId(projectId)) {
      await unlink(stored);
      return res.status(400).json({ success: false, message: "A valid project ID is required" });
    }
    if (!(await findProjectAccess(projectId, req.user._id))) {
      await unlink(stored);
      return res.status(404).json({ success: false, message: "Project not found or access denied" });
    }

    const normalizedName = safeOriginalName(req.file.originalname);
    if (!normalizedName) {
      await unlink(stored);
      return res.status(400).json({ success: false, message: "Filename is invalid" });
    }
    const extension = path.extname(normalizedName).toLowerCase();
    const signature = await readFile(stored);
    if (extension.startsWith(".")) {
      const imageValid = {
        ".png": signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        ".jpg": signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff,
        ".jpeg": signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff,
        ".gif": signature.subarray(0, 4).toString("ascii") === "GIF8",
        ".webp": signature.subarray(0, 4).toString("ascii") === "RIFF" && signature.subarray(8, 12).toString("ascii") === "WEBP",
      }[extension];
      if (imageValid === false) {
        await unlink(stored);
        return res.status(400).json({ success: false, message: "Image content does not match its file type" });
      }
    }
    if (supportedTextExtensions.has(extension)) {
      if (signature.includes(0)) {
        await unlink(stored);
        return res.status(400).json({ success: false, message: "Binary content is not accepted as a text or code file" });
      }
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(signature);
      } catch {
        await unlink(stored);
        return res.status(400).json({ success: false, message: "Text and code uploads must use UTF-8 encoding" });
      }
    }

    const file = await ProjectFile.create({
      originalName: normalizedName,
      storageName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      project: projectId,
      uploadedBy: req.user._id,
    });
    await recordActivity({
      project: projectId,
      user: req.user._id,
      action: "file.uploaded",
      resourceType: "file",
      resourceId: file._id,
      details: `Uploaded ${file.originalName}`,
    });
    return res.status(201).json({ success: true, file: fileResponse(file) });
  } catch (error) {
    if (stored) await unlink(stored).catch(() => {});
    next(error);
  }
}

export async function downloadProjectFile(req, res, next) {
  try {
    const result = await getAuthorizedFile(req.params.id, req.user._id);
    if (result.error) {
      return res.status(result.error === "invalid" ? 400 : 404).json({
        success: false,
        message: result.error === "invalid" ? "Invalid file ID" : "File not found or access denied",
      });
    }
    const filepath = storedPath(result.file.storageName);
    if (!filepath) return res.status(404).json({ success: false, message: "File not found" });

    if (req.query.inline === "true" && result.file.mimeType.startsWith("image/")) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.type(result.file.mimeType);
      return res.sendFile(filepath, (error) => {
        if (error && !res.headersSent) next(error);
      });
    }
    return res.download(filepath, result.file.originalName, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectFileText(req, res, next) {
  try {
    const result = await getAuthorizedFile(req.params.id, req.user._id);
    if (result.error) {
      return res.status(result.error === "invalid" ? 400 : 404).json({
        success: false,
        message: result.error === "invalid" ? "Invalid file ID" : "File not found or access denied",
      });
    }
    const file = result.file;
    const extension = path.extname(file.originalName).toLowerCase();
    if (!supportedTextExtensions.has(extension)) {
      return res.status(415).json({ success: false, message: "This file type cannot be previewed as text" });
    }
    const limit = req.query.ai === "true" ? maxAiCodeSize : maxTextPreviewSize;
    if (file.size > limit) {
      return res.status(413).json({
        success: false,
        message: req.query.ai === "true"
          ? "Code file exceeds the 20000 character AI input limit"
          : "Text preview is limited to 200 KB",
      });
    }
    const filepath = storedPath(file.storageName);
    if (!filepath) return res.status(404).json({ success: false, message: "File not found" });
    const buffer = await readFile(filepath);
    if (buffer.includes(0)) {
      return res.status(415).json({ success: false, message: "Binary content cannot be previewed or sent to AI" });
    }
    const content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    if (req.query.ai === "true" && content.length > maxAiCodeSize) {
      return res.status(413).json({ success: false, message: "Code file exceeds the 20000 character AI input limit" });
    }
    return res.status(200).json({ success: true, content });
  } catch (error) {
    if (error instanceof TypeError) {
      return res.status(415).json({ success: false, message: "File is not valid UTF-8 text" });
    }
    next(error);
  }
}

export async function deleteProjectFile(req, res, next) {
  try {
    const result = await getAuthorizedFile(req.params.id, req.user._id);
    if (result.error) {
      return res.status(result.error === "invalid" ? 400 : 404).json({
        success: false,
        message: result.error === "invalid" ? "Invalid file ID" : "File not found or access denied",
      });
    }
    const { file } = result;
    const filepath = storedPath(file.storageName);
    if (!filepath) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    await unlink(filepath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    await file.deleteOne();
    await recordActivity({
      project: file.project,
      user: req.user._id,
      action: "file.deleted",
      resourceType: "file",
      resourceId: file._id,
      details: `Deleted ${file.originalName}`,
    });
    return res.status(200).json({ success: true, message: "File deleted" });
  } catch (error) {
    next(error);
  }
}
