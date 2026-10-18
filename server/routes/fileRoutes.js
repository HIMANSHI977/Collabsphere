import express from "express";
import {
	listProjectFiles,
	uploadProjectFile,
	downloadProjectFile,
	getProjectFileText,
	deleteProjectFile,
} from "../controllers/fileController.js";
import protect from "../middleware/authMiddleware.js";
import { uploadSingleProjectFile } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", listProjectFiles);
router.post("/", uploadSingleProjectFile, uploadProjectFile);
router.get("/:id/content", getProjectFileText);
router.get("/:id", downloadProjectFile);
router.delete("/:id", deleteProjectFile);

export default router;
