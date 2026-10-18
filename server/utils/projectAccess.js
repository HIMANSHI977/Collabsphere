import mongoose from "mongoose";
import Project from "../models/Project.js";

export async function findProjectAccess(projectId, userId) {
  if (!mongoose.isValidObjectId(projectId)) return null;

  return Project.findOne({
    _id: projectId,
    $or: [{ createdBy: userId }, { members: userId }],
  });
}

export async function findOwnedProject(projectId, userId) {
  if (!mongoose.isValidObjectId(projectId)) return null;

  return Project.findOne({
    _id: projectId,
    createdBy: userId,
  });
}
