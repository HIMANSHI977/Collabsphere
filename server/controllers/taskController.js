import mongoose from "mongoose";
import Task from "../models/Task.js";
import { findProjectAccess } from "../utils/projectAccess.js";
import recordActivity from "../utils/recordActivity.js";

const validStatuses = ["todo", "in-progress", "done"];
const validPriorities = ["low", "medium", "high"];

async function findOwnedProject(projectId, userId) {
  return findProjectAccess(projectId, userId);
}

// Create a task
export async function createTask(req, res, next) {
  try {
    const {
      title,
      description = "",
      status = "todo",
      priority = "medium",
      dueDate = null,
      projectId,
    } = req.body || {};

    if (typeof title !== "string" || title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Task title must contain at least 2 characters.",
      });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Task title cannot exceed 150 characters.",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 2000 characters.",
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status.",
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority.",
      });
    }

    if (
      dueDate !== null &&
      (typeof dueDate !== "string" ||
        Number.isNaN(Date.parse(dueDate)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid due date.",
      });
    }

    const project = await findOwnedProject(
      projectId,
      req.user._id
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied.",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || null,
      project: project._id,
      createdBy: req.user._id,
    });

    await recordActivity({
      project: project._id,
      user: req.user._id,
      action: "task.created",
      resourceType: "task",
      resourceId: task._id,
      details: `Created task ${task.title}`,
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task,
    });
  } catch (error) {
    next(error);
  }
}

// Get all tasks for a project
export async function getTasks(req, res, next) {
  try {
    const { projectId } = req.query;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "A valid project ID is required.",
      });
    }

    const project = await findOwnedProject(
      projectId,
      req.user._id
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied.",
      });
    }

    const tasks = await Task.find({
      project: project._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    next(error);
  }
}

// Update a task
export async function updateTask(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const task = await Task.findOne({
      _id: id,
    });

    if (!task || !(await findProjectAccess(task.project, req.user._id))) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const { title, description, status, priority, dueDate } =
      req.body || {};

    if (
      title === undefined &&
      description === undefined &&
      status === undefined &&
      priority === undefined &&
      dueDate === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one task field to update.",
      });
    }

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        title.trim().length < 2 ||
        title.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "Task title must contain 2–150 characters.",
        });
      }

      task.title = title.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        description.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 2000 characters.",
        });
      }

      task.description = description.trim();
    }

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status.",
        });
      }

      task.status = status;
    }

    if (priority !== undefined) {
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority.",
        });
      }

      task.priority = priority;
    }

    if (dueDate !== undefined) {
      if (
        dueDate !== null &&
        (typeof dueDate !== "string" ||
          Number.isNaN(Date.parse(dueDate)))
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid due date.",
        });
      }

      task.dueDate = dueDate || null;
    }

    await task.save();

    await recordActivity({
      project: task.project,
      user: req.user._id,
      action: "task.updated",
      resourceType: "task",
      resourceId: task._id,
      details: `Updated task ${task.title}`,
    });

    return res.status(200).json({
      success: true,
      message: "Task updated successfully.",
      task,
    });
  } catch (error) {
    next(error);
  }
}

// Delete a task
export async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const task = await Task.findOne({
      _id: id,
    });

    if (!task || !(await findProjectAccess(task.project, req.user._id))) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    await task.deleteOne();
    await recordActivity({
      project: task.project,
      user: req.user._id,
      action: "task.deleted",
      resourceType: "task",
      resourceId: task._id,
      details: `Deleted task ${task.title}`,
    });

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
