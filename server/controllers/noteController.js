import mongoose from "mongoose";
import Note from "../models/Note.js";
import { findProjectAccess } from "../utils/projectAccess.js";
import recordActivity from "../utils/recordActivity.js";

const maxContentLength = 100000;

export async function listNotes(req, res, next) {
  try {
    const { projectId } = req.query;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "A valid project ID is required" });
    }
    if (!(await findProjectAccess(projectId, req.user._id))) {
      return res.status(404).json({ success: false, message: "Project not found or access denied" });
    }

    const notes = await Note.find({ project: projectId })
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, count: notes.length, notes });
  } catch (error) {
    next(error);
  }
}

export async function createNote(req, res, next) {
  try {
    const { projectId, title, content = "" } = req.body || {};
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "A valid project ID is required" });
    }
    if (typeof title !== "string" || !title.trim() || title.trim().length > 160) {
      return res.status(400).json({ success: false, message: "Note title is required and must be at most 160 characters" });
    }
    if (typeof content !== "string" || content.length > maxContentLength) {
      return res.status(400).json({ success: false, message: "Note content must be text under 100000 characters" });
    }
    if (!(await findProjectAccess(projectId, req.user._id))) {
      return res.status(404).json({ success: false, message: "Project not found or access denied" });
    }

    const note = await Note.create({
      project: projectId,
      title: title.trim(),
      content,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    await recordActivity({
      project: projectId,
      user: req.user._id,
      action: "note.created",
      resourceType: "note",
      resourceId: note._id,
      details: `Created note ${note.title}`,
    });
    return res.status(201).json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

export async function getNote(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid note ID" });
    }
    const note = await Note.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("updatedBy", "name");
    if (!note || !(await findProjectAccess(note.project, req.user._id))) {
      return res.status(404).json({ success: false, message: "Note not found or access denied" });
    }
    return res.status(200).json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

export async function updateNote(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid note ID" });
    }
    const { title, content } = req.body || {};
    if (title === undefined && content === undefined) {
      return res.status(400).json({ success: false, message: "Provide a title or content to update" });
    }
    if (title !== undefined && (typeof title !== "string" || !title.trim() || title.trim().length > 160)) {
      return res.status(400).json({ success: false, message: "Note title is required and must be at most 160 characters" });
    }
    if (content !== undefined && (typeof content !== "string" || content.length > maxContentLength)) {
      return res.status(400).json({ success: false, message: "Note content must be text under 100000 characters" });
    }

    const note = await Note.findById(req.params.id);
    if (!note || !(await findProjectAccess(note.project, req.user._id))) {
      return res.status(404).json({ success: false, message: "Note not found or access denied" });
    }
    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content;
    note.updatedBy = req.user._id;
    await note.save();
    await recordActivity({
      project: note.project,
      user: req.user._id,
      action: "note.updated",
      resourceType: "note",
      resourceId: note._id,
      details: `Updated note ${note.title}`,
    });
    return res.status(200).json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

export async function deleteNote(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid note ID" });
    }
    const note = await Note.findById(req.params.id);
    if (!note || !(await findProjectAccess(note.project, req.user._id))) {
      return res.status(404).json({ success: false, message: "Note not found or access denied" });
    }
    await note.deleteOne();
    await recordActivity({
      project: note.project,
      user: req.user._id,
      action: "note.deleted",
      resourceType: "note",
      resourceId: note._id,
      details: `Deleted note ${note.title}`,
    });
    return res.status(200).json({ success: true, message: "Note deleted" });
  } catch (error) {
    next(error);
  }
}
