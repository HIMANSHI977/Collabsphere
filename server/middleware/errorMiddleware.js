export function notFoundMiddleware(req, res) {
  return res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

export default function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let safeMessage = error.message;

  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    safeMessage = "Request body must contain valid JSON.";
  } else if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    safeMessage = "File exceeds the 5 MB upload limit.";
  } else if (error.name === "MulterError") {
    statusCode = 400;
    safeMessage = "The upload request is invalid.";
  } else if (error.status === 400 && error.message?.startsWith("Unsupported file type")) {
    statusCode = 400;
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    safeMessage = Object.values(error.errors)
      .map((validationError) => validationError.message)
      .join("; ");
  } else if (error.name === "CastError") {
    statusCode = 400;
    safeMessage = "A request value has an invalid format.";
  } else if (error.code === 11000) {
    statusCode = 409;
    safeMessage = "A record with that value already exists.";
  }

  const clientError = statusCode >= 400 && statusCode < 500;
  const message = clientError
    ? safeMessage
    : "An unexpected server error occurred.";

  if (!clientError) {
    console.error("Unhandled API error:", error);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
}
