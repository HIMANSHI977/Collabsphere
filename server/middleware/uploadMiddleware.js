import multer from "multer";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const uploadDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));
const maxFileSize = 5 * 1024 * 1024;
const allowedTypes = new Map([
  [".png", new Set(["image/png"])],
  [".jpg", new Set(["image/jpeg"])],
  [".jpeg", new Set(["image/jpeg"])],
  [".gif", new Set(["image/gif"])],
  [".webp", new Set(["image/webp"])],
  [".txt", new Set(["text/plain"])],
  [".md", new Set(["text/markdown", "text/plain", "text/x-markdown"])],
  [".json", new Set(["application/json", "text/plain"])],
  [".js", new Set(["text/javascript", "application/javascript", "text/plain"])],
  [".jsx", new Set(["text/javascript", "application/javascript", "text/plain"])],
  [".ts", new Set(["text/plain", "video/mp2t"])],
  [".tsx", new Set(["text/plain"])],
  [".html", new Set(["text/html", "text/plain"])],
  [".css", new Set(["text/css", "text/plain"])],
  [".py", new Set(["text/x-python", "text/plain", "application/x-python-code"])],
  [".java", new Set(["text/x-java-source", "text/plain"])],
  [".c", new Set(["text/plain"])],
  [".h", new Set(["text/plain"])],
  [".cpp", new Set(["text/plain"])],
  [".go", new Set(["text/plain"])],
  [".rs", new Set(["text/plain"])],
  [".sh", new Set(["text/x-shellscript", "text/plain", "application/x-sh"])],
]);

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    mkdir(uploadDirectory, { recursive: true })
      .then(() => callback(null, uploadDirectory))
      .catch(callback);
  },
  filename(_req, file, callback) {
    callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

export function validateUploadFile(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const acceptedMimeTypes = allowedTypes.get(extension);
  if (!acceptedMimeTypes || !acceptedMimeTypes.has(file.mimetype.toLowerCase())) {
    const error = new Error("Unsupported file type. Upload an image or text/code file from the accepted formats.");
    error.status = 400;
    return callback(error);
  }
  callback(null, true);
}

const upload = multer({
  storage,
  fileFilter: validateUploadFile,
  limits: { fileSize: maxFileSize, files: 1 },
});

export const uploadSingleProjectFile = upload.single("file");
export const supportedTextExtensions = new Set([
  ".txt", ".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".html",
  ".css", ".py", ".java", ".c", ".h", ".cpp", ".go", ".rs", ".sh",
]);
export { maxFileSize };
