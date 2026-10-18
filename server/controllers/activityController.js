
import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import { findProjectAccess } from "../utils/projectAccess.js";

export async function getProjectActivity(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const project = await findProjectAccess(id, req.user._id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or access denied.",
      });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(requestedLimit)
      ? 50
      : Math.min(Math.max(requestedLimit, 1), 100);

    const activities = await Activity.find({
      project: project._id,
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        name: project.name,
      },
      count: activities.length,
      activities,
    });
  } catch (error) {
    next(error);
  }
}
