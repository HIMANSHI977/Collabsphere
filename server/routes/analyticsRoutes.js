import express from "express";
import { getProjectAnalytics } from "../controllers/analyticsController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/project", getProjectAnalytics);

export default router;
