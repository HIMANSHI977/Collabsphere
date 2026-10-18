
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Note from "../models/Note.js";
import ProjectFile from "../models/ProjectFile.js";
import Activity from "../models/Activity.js";
import User from "../models/User.js";
import { findOwnedProject } from "../utils/projectAccess.js";
import recordActivity from "../utils/recordActivity.js";

const validStatuses = ["planning", "in-progress", "completed"];

function transactionsUnsupported(error) {
  return (
    error.code === 20 ||
    error.codeName === "IllegalOperation" ||
    /transactions are only allowed|does not support transactions/i.test(
      error.message || ""
    )
  );
}

export const createProject = async (req, res, next) => {
  try {
    const { name, description = "", status = "planning" } = req.body || {};

    if (typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Project name must contain at least 2 characters",
      });
    }

    if (typeof description !== "string" || description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Description must be a string of at most 1000 characters",
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project status",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description.trim(),
      status,
      createdBy: req.user._id,
      members: [],
    });

    await recordActivity({
      project: project._id,
      user: req.user._id,
      action: "project.created",
      resourceType: "project",
      resourceId: project._id,
      details: `Created ${project.name}`,
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [{ createdBy: req.user._id }, { members: req.user._id }],
    })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects: projects.map((project) => ({
        ...project.toObject(),
        role: String(project.createdBy?._id || project.createdBy) === String(req.user._id)
          ? "owner"
          : "member",
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const { name, description, status } = req.body || {};
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Project name must contain at least 2 characters",
        });
      }

      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        description.length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message: "Description must be a string of at most 1000 characters",
        });
      }

      updates.description = description.trim();
    }

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project status",
        });
      }

      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update",
      });
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: id,
        createdBy: req.user._id,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you do not have permission to update it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  let session;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const filter = {
      _id: id,
      createdBy: req.user._id,
    };
    const ownedProject = await Project.findOne(filter).select("_id");

    if (!ownedProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you do not have permission to delete it",
      });
    }

    const storedFiles = await ProjectFile.find({ project: id })
      .select("storageName")
      .lean();

    async function removeRelatedRecords(options = {}) {
      await Task.deleteMany({ project: id }, options);
      await Note.deleteMany({ project: id }, options);
      await ProjectFile.deleteMany({ project: id }, options);
      await Activity.deleteMany({ project: id }, options);
      const deletedProject = await Project.findOneAndDelete(filter, options);
      if (!deletedProject) {
        const error = new Error("Project was already deleted");
        error.status = 404;
        throw error;
      }
    }

    try {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        await removeRelatedRecords({ session });
      });
    } catch (error) {
      if (!transactionsUnsupported(error)) throw error;

      await removeRelatedRecords();
    } finally {
      await session?.endSession();
    }

    const uploadDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));
    await Promise.all(
      storedFiles.map(async ({ storageName }) => {
        if (!storageName || path.basename(storageName) !== storageName) return;
        try {
          await unlink(path.join(uploadDirectory, storageName));
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error("Unable to remove project upload from disk:", error.message);
          }
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Users can only view their own projects.
    const project = await Project.findOne({
      _id: id,
      $or: [{ createdBy: req.user._id }, { members: req.user._id }],
    })
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .select("+shareId");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you do not have permission to view it",
      });
    }

    const projectData = project.toObject();
    const isOwner = String(project.createdBy?._id || project.createdBy) === String(req.user._id);
    if (!isOwner) delete projectData.shareId;

    return res.status(200).json({
      success: true,
      project: {
        ...projectData,
        role: isOwner ? "owner" : "member",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addProjectMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid member email" });
    }

    const project = await findOwnedProject(id, req.user._id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or owner permission required" });
    }

    const member = await User.findOne({ email }).select("_id name email");
    if (!member) {
      return res.status(404).json({ success: false, message: "No registered user has that email" });
    }
    if (String(member._id) === String(project.createdBy)) {
      return res.status(400).json({ success: false, message: "The project owner is already a member" });
    }

    const updatedProject = await Project.findOneAndUpdate(
      { _id: id, createdBy: req.user._id },
      { $addToSet: { members: member._id } },
      { new: true }
    ).populate("members", "name email");

    if (!(project.members || []).some((idValue) => String(idValue) === String(member._id))) {
      await recordActivity({
        project: id,
        user: req.user._id,
        action: "project.member_added",
        resourceType: "project",
        resourceId: member._id,
        details: `Added ${member.name} to the project`,
      });
    }

    return res.status(200).json({ success: true, members: updatedProject.members });
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid project or member ID" });
    }

    const project = await findOwnedProject(id, req.user._id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or owner permission required" });
    }
    if (String(project.createdBy) === String(memberId)) {
      return res.status(400).json({ success: false, message: "The project owner cannot be removed" });
    }

    const member = await User.findById(memberId).select("name");
    const updatedProject = await Project.findOneAndUpdate(
      { _id: id, createdBy: req.user._id, members: memberId },
      { $pull: { members: memberId } },
      { new: true }
    ).populate("members", "name email");

    if (!updatedProject) {
      return res.status(404).json({ success: false, message: "Project member not found" });
    }

    await recordActivity({
      project: id,
      user: req.user._id,
      action: "project.member_removed",
      resourceType: "project",
      resourceId: memberId,
      details: `Removed ${member?.name || "a member"} from the project`,
    });

    return res.status(200).json({ success: true, members: updatedProject.members });
  } catch (error) {
    next(error);
  }
};

export const updateProjectSharing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enabled, publicReadme } = req.body || {};
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ success: false, message: "enabled must be a boolean" });
    }
    if (publicReadme !== undefined && (typeof publicReadme !== "string" || publicReadme.length > 50000)) {
      return res.status(400).json({ success: false, message: "Public README must be text no longer than 50000 characters" });
    }

    const project = await Project.findOne({ _id: id, createdBy: req.user._id })
      .select("+shareId");
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or owner permission required" });
    }

    const shareId = enabled
      ? project.shareId || randomBytes(24).toString("base64url")
      : null;
    const setFields = {
      isPublic: enabled,
      ...(publicReadme === undefined ? {} : { publicReadme }),
      ...(enabled ? { shareId } : {}),
    };

    const updatedProject = await Project.findOneAndUpdate(
      { _id: id, createdBy: req.user._id },
      {
        $set: setFields,
        ...(enabled ? {} : { $unset: { shareId: 1 } }),
      },
      { new: true }
    );

    await recordActivity({
      project: id,
      user: req.user._id,
      action: "project.sharing_changed",
      resourceType: "project",
      resourceId: id,
      details: enabled ? "Enabled public project sharing" : "Revoked public project sharing",
    });

    return res.status(200).json({
      success: true,
      isPublic: updatedProject.isPublic,
      shareId,
    });
  } catch (error) {
    next(error);
  }
};