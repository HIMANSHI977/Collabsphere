import assert from "node:assert/strict";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { afterEach, test, mock } from "node:test";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Note from "../models/Note.js";
import ProjectFile from "../models/ProjectFile.js";
import Activity from "../models/Activity.js";
import User from "../models/User.js";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateProjectSharing,
} from "../controllers/projectController.js";

const projectId = "507f1f77bcf86cd799439011";
const userId = "507f191e810c19729de860ea";
const uploadDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));

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

function mockOwnedProject() {
  mock.method(Project, "findOne", () => ({
    select: async () => ({ _id: projectId }),
  }));
}

afterEach(() => {
  mock.restoreAll();
});

test("createProject validates required name before database access", async () => {
  const create = mock.method(Project, "create", () => {
    assert.fail("Invalid project must not be persisted");
  });
  const response = createResponse();

  await createProject(
    { body: {}, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});

test("createProject stores project with authenticated owner", async () => {
  const project = { _id: projectId, name: "New project" };
  mock.method(Project, "create", async (data) => {
    assert.deepEqual(data, {
      name: "New project",
      description: "",
      status: "planning",
      createdBy: userId,
      members: [],
    });
    return project;
  });
  mock.method(Activity, "create", async () => ({}));
  const response = createResponse();

  await createProject(
    { body: { name: " New project " }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.project, project);
});

test("getProjects includes projects owned by or shared with the authenticated user", async () => {
  const project = {
    createdBy: { _id: userId },
    toObject: () => ({ _id: projectId }),
  };
  mock.method(Project, "find", (filter) => {
    assert.deepEqual(filter, { $or: [{ createdBy: userId }, { members: userId }] });
    return {
      populate() { return this; },
      sort: async () => [project],
    };
  });
  const response = createResponse();

  await getProjects({ user: { _id: userId } }, response, (error) => {
    assert.fail(error);
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.projects, [{
    _id: projectId,
    role: "owner",
  }]);
});

test("getProjectById returns an accessible project and rejects invalid IDs", async () => {
  const project = {
    createdBy: { _id: userId },
    toObject: () => ({ _id: projectId }),
  };
  const lookup = mock.method(Project, "findOne", (filter) => {
    assert.deepEqual(filter, { _id: projectId, $or: [{ createdBy: userId }, { members: userId }] });
    return {
      populate() { return this; },
      select() { return Promise.resolve(project); },
    };
  });
  const response = createResponse();
  await getProjectById(
    { params: { id: projectId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.project.role, "owner");

  lookup.mock.restore();
  const invalidResponse = createResponse();
  await getProjectById(
    { params: { id: "bad-id" }, user: { _id: userId } },
    invalidResponse,
    (error) => assert.fail(error)
  );
  assert.equal(invalidResponse.statusCode, 400);
});

test("updateProject validates values and scopes update to owner", async () => {
  const response = createResponse();
  const update = mock.method(Project, "findOneAndUpdate", async () => ({
    _id: projectId,
    name: "Updated project",
  }));

  await updateProject(
    {
      params: { id: projectId },
      body: { name: "Updated project", status: "completed" },
      user: { _id: userId },
    },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(update.mock.calls[0].arguments[0], {
    _id: projectId,
    createdBy: userId,
  });
  assert.equal(update.mock.calls[0].arguments[1].$set.name, "Updated project");

  const badResponse = createResponse();
  await updateProject(
    {
      params: { id: projectId },
      body: { status: "unknown" },
      user: { _id: userId },
    },
    badResponse,
    (error) => assert.fail(error)
  );
  assert.equal(badResponse.statusCode, 400);
});

test("deleteProject removes tasks and project in a transaction", async () => {
  const calls = [];
  const session = {
    async withTransaction(callback) {
      calls.push("transaction:start");
      await callback();
      calls.push("transaction:commit");
    },
    async endSession() {
      calls.push("session:end");
    },
  };

  mockOwnedProject();
  mock.method(ProjectFile, "find", () => ({
    select: () => ({ lean: async () => [] }),
  }));
  mock.method(mongoose, "startSession", async () => session);
  mock.method(Task, "deleteMany", async (filter, options) => {
    assert.deepEqual(filter, { project: projectId });
    assert.equal(options.session, session);
    calls.push("tasks:delete");
  });
  mock.method(Note, "deleteMany", async (_filter, options) => {
    assert.equal(options.session, session);
    calls.push("notes:delete");
  });
  mock.method(ProjectFile, "deleteMany", async (_filter, options) => {
    assert.equal(options.session, session);
    calls.push("files:delete");
  });
  mock.method(Activity, "deleteMany", async (_filter, options) => {
    assert.equal(options.session, session);
    calls.push("activity:delete");
  });
  mock.method(Project, "findOneAndDelete", async (filter, options) => {
    assert.deepEqual(filter, { _id: projectId, createdBy: userId });
    assert.equal(options.session, session);
    calls.push("project:delete");
    return { _id: projectId };
  });

  const response = createResponse();
  await deleteProject(
    { params: { id: projectId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [
    "transaction:start",
    "tasks:delete",
    "notes:delete",
    "files:delete",
    "activity:delete",
    "project:delete",
    "transaction:commit",
    "session:end",
  ]);
});

test("deleteProject uses task-first cleanup when transactions are unsupported", async () => {
  const calls = [];
  const session = {
    async withTransaction() {
      const error = new Error("Transaction numbers are only allowed on a replica set member");
      error.code = 20;
      throw error;
    },
    async endSession() {
      calls.push("session:end");
    },
  };

  mockOwnedProject();
  mock.method(ProjectFile, "find", () => ({
    select: () => ({ lean: async () => [] }),
  }));
  mock.method(mongoose, "startSession", async () => session);
  mock.method(Task, "deleteMany", async (filter, options) => {
    assert.deepEqual(filter, { project: projectId });
    assert.equal(options?.session, undefined);
    calls.push("tasks:delete");
  });
  mock.method(Note, "deleteMany", async (_filter, options) => {
    assert.deepEqual(options, {});
    calls.push("notes:delete");
  });
  mock.method(ProjectFile, "deleteMany", async (_filter, options) => {
    assert.deepEqual(options, {});
    calls.push("files:delete");
  });
  mock.method(Activity, "deleteMany", async (_filter, options) => {
    assert.deepEqual(options, {});
    calls.push("activity:delete");
  });
  mock.method(Project, "findOneAndDelete", async (filter, options) => {
    assert.deepEqual(filter, { _id: projectId, createdBy: userId });
    assert.deepEqual(options, {});
    calls.push("project:delete");
    return { _id: projectId };
  });

  const response = createResponse();
  await deleteProject(
    { params: { id: projectId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [
    "tasks:delete",
    "notes:delete",
    "files:delete",
    "activity:delete",
    "project:delete",
    "session:end",
  ]);
});

test("deleteProject removes stored upload content after database cascade", async () => {
  const storageName = `${randomUUID()}.txt`;
  const filepath = path.join(uploadDirectory, storageName);
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(filepath, "project file", "utf8");
  const session = {
    async withTransaction(callback) { await callback(); },
    async endSession() {},
  };

  mockOwnedProject();
  mock.method(ProjectFile, "find", () => ({
    select: () => ({ lean: async () => [{ storageName }] }),
  }));
  mock.method(mongoose, "startSession", async () => session);
  mock.method(Task, "deleteMany", async () => {});
  mock.method(Note, "deleteMany", async () => {});
  mock.method(ProjectFile, "deleteMany", async () => {});
  mock.method(Activity, "deleteMany", async () => {});
  mock.method(Project, "findOneAndDelete", async () => ({ _id: projectId }));

  try {
    const response = createResponse();
    await deleteProject(
      { params: { id: projectId }, user: { _id: userId } },
      response,
      (error) => assert.fail(error)
    );
    assert.equal(response.statusCode, 200);
    await assert.rejects(unlink(filepath), { code: "ENOENT" });
  } finally {
    await unlink(filepath).catch(() => {});
  }
});

test("deleteProject rejects invalid IDs before database access", async () => {
  const find = mock.method(Project, "findOne", () => {
    assert.fail("Project query should not run for an invalid ID");
  });

  const response = createResponse();
  await deleteProject(
    { params: { id: "invalid" }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 400);
  assert.equal(find.mock.callCount(), 0);
});

test("deleteProject returns not found for projects the user does not own", async () => {
  mock.method(Project, "findOne", () => ({ select: async () => null }));
  const startSession = mock.method(mongoose, "startSession", async () => {
    assert.fail("No transaction should start for an unowned project");
  });

  const response = createResponse();
  await deleteProject(
    { params: { id: projectId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 404);
  assert.equal(startSession.mock.callCount(), 0);
});

test("addProjectMember adds a registered user and records the change", async () => {
  const memberId = "507f1f77bcf86cd799439013";
  mock.method(Project, "findOne", async (filter) => {
    assert.deepEqual(filter, { _id: projectId, createdBy: userId });
    return { _id: projectId, createdBy: userId, members: [] };
  });
  mock.method(User, "findOne", (filter) => {
    assert.deepEqual(filter, { email: "member@example.com" });
    return { select: async () => ({ _id: memberId, name: "Member" }) };
  });
  mock.method(Project, "findOneAndUpdate", () => ({
    populate: async () => ({ members: [{ _id: memberId, name: "Member" }] }),
  }));
  mock.method(Activity, "create", async (data) => {
    assert.equal(data.action, "project.member_added");
    return data;
  });
  const response = createResponse();
  await addProjectMember(
    { params: { id: projectId }, body: { email: "Member@Example.com" }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.members[0]._id, memberId);
});

test("removeProjectMember removes a member and records the change", async () => {
  const memberId = "507f1f77bcf86cd799439013";
  mock.method(Project, "findOne", async () => ({ _id: projectId, createdBy: userId }));
  mock.method(User, "findById", () => ({ select: async () => ({ name: "Member" }) }));
  mock.method(Project, "findOneAndUpdate", () => ({
    populate: async () => ({ members: [] }),
  }));
  mock.method(Activity, "create", async (data) => {
    assert.equal(data.action, "project.member_removed");
    return data;
  });
  const response = createResponse();
  await removeProjectMember(
    { params: { id: projectId, memberId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );
  assert.equal(response.statusCode, 200);
});

test("updateProjectSharing creates and revokes the public identifier", async () => {
  const updateCalls = [];
  mock.method(Project, "findOne", () => ({
    select: async () => ({ _id: projectId, shareId: undefined }),
  }));
  mock.method(Project, "findOneAndUpdate", async (_filter, update) => {
    updateCalls.push(update);
    return { isPublic: update.$set.isPublic };
  });
  mock.method(Activity, "create", async () => ({}));

  const enabledResponse = createResponse();
  await updateProjectSharing(
    { params: { id: projectId }, body: { enabled: true, publicReadme: "# Public" }, user: { _id: userId } },
    enabledResponse,
    (error) => assert.fail(error)
  );
  assert.equal(enabledResponse.statusCode, 200);
  assert.equal(enabledResponse.body.shareId.length, 32);

  const revokedResponse = createResponse();
  await updateProjectSharing(
    { params: { id: projectId }, body: { enabled: false }, user: { _id: userId } },
    revokedResponse,
    (error) => assert.fail(error)
  );
  assert.deepEqual(updateCalls[1].$unset, { shareId: 1 });
  assert.equal(revokedResponse.body.shareId, null);
});
