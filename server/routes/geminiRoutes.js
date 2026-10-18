import express from "express";
import {
	explainContent,
	suggestDocumentation,
	generateReadme,
} from "../controllers/geminiController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.post("/explain", explainContent);
router.post("/docs", suggestDocumentation);
router.post("/readme", generateReadme);

export default router;
