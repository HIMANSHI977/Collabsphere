import assert from "node:assert/strict";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { afterEach, test, mock } from "node:test";
import Project from "../models/Project.js";
import ProjectFile from "../models/ProjectFile.js";
import Activity from "../models/Activity.js";
import { getProjectFileText, deleteProjectFile, uploadProjectFile, downloadProjectFile } from "../controllers/fileController.js";
import { validateUploadFile } from "../middleware/uploadMiddleware.js";

const fileId = "507f1f77bcf86cd799439011";
const projectId = "507f191e810c19729de860ea";
const userId = "507f1f77bcf86cd799439012";
const uploadDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

afterEach(() => mock.restoreAll());

test("upload allowlist accepts a supported UTF-8 text file", async () => {
  const result = await new Promise((resolve, reject) => {
    validateUploadFile({}, { originalname: "readme.md", mimetype: "text/markdown" }, (error, accepted) => {
      if (error) reject(error);
      else resolve(accepted);
    });
  });
  assert.equal(result, true);
});

test("upload allowlist rejects executable and mismatched types", async () => {
  await assert.rejects(new Promise((resolve, reject) => {
    validateUploadFile({}, { originalname: "payload.exe", mimetype: "application/octet-stream" }, (error, accepted) => {
      if (error) reject(error);
      else resolve(accepted);
    });
  }), /unsupported file type/i);

  await assert.rejects(new Promise((resolve, reject) => {
    validateUploadFile({}, { originalname: "photo.png", mimetype: "text/html" }, (error, accepted) => {
      if (error) reject(error);
      else resolve(accepted);
    });
  }), /unsupported file type/i);
});

test("file text endpoint rejects access outside project membership", async () => {
  mock.method(ProjectFile, "findById", async () => ({ project: projectId }));
  mock.method(Project, "findOne", async () => null);
  const res = response();
  await getProjectFileText({ params: { id: fileId }, query: {}, user: { _id: userId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 404);
});

test("file text endpoint rejects unsupported preview extensions", async () => {
  mock.method(ProjectFile, "findById", async () => ({
    project: projectId,
    originalName: "binary.exe",
    storageName: "opaque-id.exe",
    size: 42,
  }));
  mock.method(Project, "findOne", async () => ({ _id: projectId }));
  const res = response();
  await getProjectFileText({ params: { id: fileId }, query: {}, user: { _id: userId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 415);
});

test("authorized member can preview UTF-8 text and delete stored file", async () => {
  const storageName = `${randomUUID()}.txt`;
  const filepath = path.join(uploadDirectory, storageName);
  const content = "# Safe project note\nhello";
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(filepath, content, "utf8");
  const fileRecord = {
    _id: fileId,
    project: projectId,
    originalName: "readme.txt",
    storageName,
    size: Buffer.byteLength(content),
    async deleteOne() {},
  };

  try {
    mock.method(ProjectFile, "findById", async () => fileRecord);
    mock.method(Project, "findOne", async () => ({ _id: projectId }));
    mock.method(Activity, "create", async () => ({}));

    const previewResponse = response();
    await getProjectFileText({ params: { id: fileId }, query: {}, user: { _id: userId } }, previewResponse, (error) => assert.fail(error));
    assert.equal(previewResponse.statusCode, 200);
    assert.equal(previewResponse.body.content, content);

    const deleteResponse = response();
    await deleteProjectFile({ params: { id: fileId }, user: { _id: userId } }, deleteResponse, (error) => assert.fail(error));
    assert.equal(deleteResponse.statusCode, 200);
  } finally {
    await unlink(filepath).catch(() => {});
  }
});

test("authorized member can upload text content without exposing its storage name", async () => {
  const storageName = `${randomUUID()}.txt`;
  const filepath = path.join(uploadDirectory, storageName);
  const content = "const answer = 42;";
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(filepath, content, "utf8");

  try {
    mock.method(Project, "findOne", async () => ({ _id: projectId }));
    mock.method(ProjectFile, "create", async (data) => ({
      ...data,
      _id: fileId,
      toObject() { return { ...data, _id: fileId }; },
    }));
    mock.method(Activity, "create", async () => ({}));
    const res = response();
    await uploadProjectFile({
      body: { projectId },
      file: {
        filename: storageName,
        originalname: "snippet.txt",
        mimetype: "text/plain",
        size: Buffer.byteLength(content),
      },
      user: { _id: userId },
    }, res, (error) => assert.fail(error));

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.file.originalName, "snippet.txt");
    assert.equal("storageName" in res.body.file, false);
  } finally {
    await unlink(filepath).catch(() => {});
  }
});

test("authorized member download resolves only inside managed upload storage", async () => {
  const storageName = `${randomUUID()}.txt`;
  const filepath = path.join(uploadDirectory, storageName);
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(filepath, "download fixture", "utf8");
  mock.method(ProjectFile, "findById", async () => ({
    project: projectId,
    storageName,
    originalName: "download.txt",
    mimeType: "text/plain",
  }));
  mock.method(Project, "findOne", async () => ({ _id: projectId }));

  const res = {
    headersSent: false,
    statusCode: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    download(filePath, originalName) {
      this.filePath = filePath;
      this.downloadName = originalName;
      return this;
    },
  };
  try {
    await downloadProjectFile({ params: { id: fileId }, query: {}, user: { _id: userId } }, res, (error) => assert.fail(error));
    assert.equal(res.filePath, filepath);
    assert.equal(res.downloadName, "download.txt");
  } finally {
    await unlink(filepath).catch(() => {});
  }
});
