import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("health endpoint returns a successful API response", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
});

test("unknown API endpoint returns consistent JSON 404", async () => {
  const response = await fetch(`${baseUrl}/api/not-registered`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.match(body.message, /not found/i);
});

test("malformed JSON returns a safe 400 response", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Request body must contain valid JSON.");
});

test("feature API families are mounted and protected", async () => {
  const paths = [
    "/api/notes?projectId=507f1f77bcf86cd799439011",
    "/api/files?projectId=507f1f77bcf86cd799439011",
    "/api/analytics/project?projectId=507f1f77bcf86cd799439011",
  ];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.json();
    assert.equal(response.status, 401, `${path} should require authentication`);
    assert.equal(body.success, false);
  }

  const aiResponse = await fetch(`${baseUrl}/api/gemini/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "not sent without auth" }),
  });
  assert.equal(aiResponse.status, 401);
});

test("public share route is mounted without authentication and hides invalid IDs", async () => {
  const response = await fetch(`${baseUrl}/api/public/projects/invalid`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.message, "Public project not found");
});
