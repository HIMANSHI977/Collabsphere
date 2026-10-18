
import express from "express";
import cors from "cors";
import "./config/loadEnv.js";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import geminiRoutes from "./routes/geminiRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import errorMiddleware, { notFoundMiddleware } from "./middleware/errorMiddleware.js";

const app = express();
app.disable("x-powered-by");

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        const error = new Error("Origin is not allowed by CORS");
        error.status = 403;
        callback(error);
      }
    },
  })
);

app.use(express.json({ limit: "450kb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CollabSphere API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/gemini", geminiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/public", publicRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
