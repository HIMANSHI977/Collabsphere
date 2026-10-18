import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import Note from "../models/Note.js";
import Project from "../models/Project.js";
import ProjectFile from "../models/ProjectFile.js";
import Task from "../models/Task.js";
import { findProjectAccess } from "../utils/projectAccess.js";

export async function getProjectAnalytics(req, res, next) {
  try {
    const { projectId } = req.query;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "A valid project ID is required" });
    }

    const project = await findProjectAccess(projectId, req.user._id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or access denied" });
    }

    const populatedProject = await Project.findById(projectId)
      .populate("createdBy", "name email")
      .populate("members", "name email");
    const [noteCounts, fileCounts, taskCounts, recentActivity] = await Promise.all([
      Note.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      ]),
      ProjectFile.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: "$uploadedBy", count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      ]),
      Activity.find({ project: projectId })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .limit(30),
    ]);

    const users = [populatedProject.createdBy, ...populatedProject.members];
    const contributions = users.map((user) => {
      const matches = (rows) => rows.find((row) => String(row._id) === String(user._id))?.count || 0;
      return {
        user: { id: user._id, name: user.name, email: user.email },
        role: String(user._id) === String(populatedProject.createdBy._id) ? "owner" : "member",
        notesCreated: matches(noteCounts),
        filesUploaded: matches(fileCounts),
        tasksCreated: matches(taskCounts),
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        members: users.length,
        notes: noteCounts.reduce((sum, row) => sum + row.count, 0),
        files: fileCounts.reduce((sum, row) => sum + row.count, 0),
        tasks: taskCounts.reduce((sum, row) => sum + row.count, 0),
      },
      contributions,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
}
