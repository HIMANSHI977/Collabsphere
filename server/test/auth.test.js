import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { login, register } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const userId = "507f1f77bcf86cd799439012";
const originalSecret = process.env.JWT_SECRET;

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

afterEach(() => {
  mock.restoreAll();
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

test("register hashes password and returns a signed token", async () => {
  process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  const user = {
    _id: userId,
    name: "Test User",
    email: "test@example.com",
  };
  mock.method(User, "findOne", async () => null);
  mock.method(bcrypt, "hash", async (password, rounds) => {
    assert.equal(password, "password123");
    assert.equal(rounds, 12);
    return "hashed-password";
  });
  mock.method(User, "create", async (data) => {
    assert.equal(data.password, "hashed-password");
    assert.equal(data.email, "test@example.com");
    return user;
  });

  const response = createResponse();
  await register(
    {
      body: {
        name: " Test User ",
        email: "TEST@example.com",
        password: "password123",
      },
    },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 201);
  assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).sub, userId);
  assert.equal(response.body.user.email, user.email);
});

test("login returns a useful unauthorized response for invalid credentials", async () => {
  const userQuery = {
    select: async () => null,
  };
  mock.method(User, "findOne", (filter) => {
    assert.deepEqual(filter, { email: "missing@example.com" });
    return userQuery;
  });

  const response = createResponse();
  await login(
    { body: { email: " Missing@example.com ", password: "wrong-password" } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.message, "Invalid email or password");
});

test("login verifies password and returns a signed token", async () => {
  process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  const user = {
    _id: userId,
    name: "Test User",
    email: "test@example.com",
    password: "stored-hash",
  };
  mock.method(User, "findOne", () => ({ select: async () => user }));
  mock.method(bcrypt, "compare", async (password, hash) => {
    assert.equal(password, "correct-password");
    assert.equal(hash, "stored-hash");
    return true;
  });
  const response = createResponse();
  await login(
    { body: { email: "TEST@example.com", password: "correct-password" } },
    response,
    (error) => assert.fail(error)
  );
  assert.equal(response.statusCode, 200);
  assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).sub, userId);
  assert.equal(response.body.user.name, "Test User");
});

test("protect rejects missing, invalid, and expired tokens", async () => {
  process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  const next = mock.fn();

  const missingResponse = createResponse();
  await protect({ headers: {} }, missingResponse, next);
  assert.equal(missingResponse.statusCode, 401);

  const invalidResponse = createResponse();
  await protect(
    { headers: { authorization: "Bearer invalid-token" } },
    invalidResponse,
    next
  );
  assert.equal(invalidResponse.statusCode, 401);

  const expiredToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: -1,
  });
  const expiredResponse = createResponse();
  await protect(
    { headers: { authorization: `Bearer ${expiredToken}` } },
    expiredResponse,
    next
  );
  assert.equal(expiredResponse.statusCode, 401);
  assert.equal(next.mock.callCount(), 0);
});

test("protect attaches an existing user for a valid token", async () => {
  process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  const user = { _id: userId, email: "test@example.com" };
  mock.method(User, "findById", async (id) => {
    assert.equal(id, userId);
    return user;
  });
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const response = createResponse();
  const next = mock.fn();

  await protect(req, response, next);

  assert.equal(req.user, user);
  assert.equal(next.mock.callCount(), 1);
});
