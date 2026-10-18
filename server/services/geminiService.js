const defaultModel = "gemini-2.5-flash";
const endpoint = "https://generativelanguage.googleapis.com/v1beta/models";

export async function generateWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("Gemini AI is not configured on the server");
    error.status = 503;
    throw error;
  }

  const model = process.env.GEMINI_MODEL || defaultModel;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `${endpoint}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      }
    );

    if (response.status === 429) {
      const error = new Error("Gemini is temporarily rate limited. Try again shortly.");
      error.status = 429;
      throw error;
    }
    if (!response.ok) {
      const error = new Error("Gemini could not complete the request");
      error.status = response.status >= 500 ? 502 : 502;
      throw error;
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!result) {
      const error = new Error("Gemini returned an empty response");
      error.status = 502;
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Gemini request timed out; try again");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export { defaultModel };
