
import express from "express";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateProjectSharing,
} from "../controllers/projectController.js";

import { getProjectActivity } from "../controllers/activityController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Every project route requires authentication.
router.use(protect);

// Project activity feed.
router.get("/:id/activity", getProjectActivity);

// Project CRUD routes.
router
  .route("/")
  .get(getProjects)
  .post(createProject);

router
  .route("/:id")
  .get(getProjectById)
  .put(updateProject)
  .delete(deleteProject);

// Project collaboration routes.
router.post("/:id/members", addProjectMember);
router.delete("/:id/members/:memberId", removeProjectMember);
router.patch("/:id/sharing", updateProjectSharing);

export default router;
