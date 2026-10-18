import express from "express";
import {
	listNotes,
	createNote,
	getNote,
	updateNote,
	deleteNote,
} from "../controllers/noteController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(listNotes).post(createNote);
router.route("/:id").get(getNote).put(updateNote).delete(deleteNote);

export default router;
