import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import Project from "../models/Project.js";
import { explainContent, generateReadme } from "../controllers/geminiController.js";
import { getPublicProject } from "../controllers/publicController.js";

const originalKey = process.env.GEMINI_API_KEY;
function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

afterEach(() => {
  mock.restoreAll();
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

test("Gemini explain validates empty input without making provider calls", async () => {
  process.env.GEMINI_API_KEY = "";
  const res = response();
  await explainContent({ body: { text: " " } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 400);
});

test("Gemini explain reports missing server key instead of fabricated output", async () => {
  process.env.GEMINI_API_KEY = "";
  const res = response();
  let forwarded;
  await explainContent({ body: { text: "Useful content" } }, res, (error) => { forwarded = error; });
  assert.equal(res.statusCode, null);
  assert.equal(forwarded.status, 503);
  assert.match(forwarded.message, /not configured/i);
});

test("Gemini explain returns actual parsed provider text", async () => {
  process.env.GEMINI_API_KEY = "test-only-provider-key";
  const fetchMock = mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(String(url), /models\/gemini-2\.5-flash:generateContent/);
    const payload = JSON.parse(options.body);
    assert.match(payload.contents[0].parts[0].text, /const answer = 42/);
    return {
      ok: true,
      async json() {
        return { candidates: [{ content: { parts: [{ text: "The code defines an answer constant." }] } }] };
      },
    };
  });
  const res = response();
  await explainContent({ body: { text: "const answer = 42;", kind: "code" } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.result, "The code defines an answer constant.");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("README generation validates both required fields", async () => {
  const res = response();
  await generateReadme({ body: { projectDescription: "A tool" } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /code overview/i);
});

test("public share response excludes private fields", async () => {
  const project = {
    _id: "507f1f77bcf86cd799439011",
    name: "Public project",
    description: "Public summary",
    status: "planning",
    publicReadme: "# Public README",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  };
  mock.method(Project, "findOne", (filter) => {
    assert.deepEqual(filter, { shareId: "a".repeat(32), isPublic: true });
    return { select: async () => project };
  });
  const res = response();
  await getPublicProject({ params: { shareId: "a".repeat(32) } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Object.keys(res.body.project).sort(), [
    "createdAt", "description", "id", "name", "readme", "status", "updatedAt",
  ]);
  assert.equal("members" in res.body.project, false);
  assert.equal("shareId" in res.body.project, false);
});
