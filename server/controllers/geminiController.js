import { generateWithGemini } from "../services/geminiService.js";

const maxTextLength = 20000;

function validateText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    return `${label} is required`;
  }
  if (value.length > maxTextLength) {
    return `${label} must be no longer than ${maxTextLength} characters`;
  }
  return null;
}

async function runPrompt(req, res, next, buildPrompt) {
  try {
    const validationMessage = buildPrompt.validation(req.body || {});
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }
    const result = await generateWithGemini(buildPrompt.create(req.body));
    return res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
}

export function explainContent(req, res, next) {
  return runPrompt(req, res, next, {
    validation: ({ text, action }) => {
      if (action !== undefined && !["explain", "improve"].includes(action)) {
        return "Action must be explain or improve";
      }
      return validateText(text, "Text to explain");
    },
    create: ({ text, kind, action }) => action === "improve"
      ? `Review the following ${kind === "code" ? "code" : "note"}. Suggest specific, useful improvements, explain why each helps, and do not rewrite or invent unrelated content.\n\n${text}`
      : `Explain the following ${kind === "code" ? "code" : "note content"} clearly. Use concise sections and do not invent context.\n\n${text}`,
  });
}

export function suggestDocumentation(req, res, next) {
  return runPrompt(req, res, next, {
    validation: ({ codeText }) => validateText(codeText, "Code text"),
    create: ({ codeText }) =>
      `Write useful developer documentation for this code. Explain purpose, key functions, inputs, outputs, and usage based only on the supplied code.\n\n${codeText}`,
  });
}

export function generateReadme(req, res, next) {
  return runPrompt(req, res, next, {
    validation: ({ projectDescription, codeOverview }) => {
      return validateText(projectDescription, "Project description") ||
        validateText(codeOverview, "Code overview");
    },
    create: ({ projectDescription, codeOverview }) =>
      `Generate a well-structured Markdown README for the project described below. Clearly label unknown setup details as placeholders and do not invent commands or credentials.\n\nProject description:\n${projectDescription}\n\nCode overview:\n${codeOverview}`,
  });
}
