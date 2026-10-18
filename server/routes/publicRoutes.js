import express from "express";
import { getPublicProject } from "../controllers/publicController.js";

const router = express.Router();

router.get("/projects/:shareId", getPublicProject);

export default router;
