import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Activity from "../models/Activity.js";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const projectId = "507f1f77bcf86cd799439011";
const taskId = "507f191e810c19729de860ea";
const userId = "507f1f77bcf86cd799439012";

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
});

test("createTask validates required title before querying database", async () => {
  const projectLookup = mock.method(Project, "findOne", () => {
    assert.fail("Project must not be queried when title is missing");
  });
  const response = createResponse();

  await createTask(
    { body: { projectId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /title/i);
  assert.equal(projectLookup.mock.callCount(), 0);
});

test("createTask associates the task with the owned project", async () => {
  const project = { _id: projectId };
  const task = { _id: taskId, title: "Ship task board", project: projectId };

  mock.method(Project, "findOne", async (filter) => {
    assert.deepEqual(filter, {
      _id: projectId,
      $or: [{ createdBy: userId }, { members: userId }],
    });
    return project;
  });
  mock.method(Task, "create", async (data) => {
    assert.equal(data.project, project._id);
    assert.equal(data.createdBy, userId);
    return task;
  });
  mock.method(Activity, "create", async () => ({}));

  const response = createResponse();
  await createTask(
    {
      body: { title: "Ship task board", projectId },
      user: { _id: userId },
    },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.task, task);
});

test("getTasks rejects missing or invalid project IDs", async () => {
  const projectLookup = mock.method(Project, "findOne", () => {
    assert.fail("Invalid project IDs must not be queried");
  });
  const response = createResponse();

  await getTasks(
    { query: {}, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 400);
  assert.equal(projectLookup.mock.callCount(), 0);
});

test("getTasks returns tasks scoped to the accessible project", async () => {
  const tasks = [{ _id: taskId, title: "Ship task board" }];
  mock.method(Project, "findOne", async () => ({ _id: projectId }));
  mock.method(Task, "find", (filter) => {
    assert.deepEqual(filter, { project: projectId });
    return { sort: async () => tasks };
  });

  const response = createResponse();
  await getTasks(
    { query: { projectId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.tasks, tasks);
});

test("updateTask applies a valid status and priority update", async () => {
  const task = {
    _id: taskId,
    project: projectId,
    status: "todo",
    priority: "medium",
    async save() {},
  };
  mock.method(Task, "findOne", async (filter) => {
    assert.deepEqual(filter, { _id: taskId });
    return task;
  });
  mock.method(Project, "findOne", async (filter) => {
    assert.deepEqual(filter, {
      _id: projectId,
      $or: [{ createdBy: userId }, { members: userId }],
    });
    return { _id: projectId };
  });
  mock.method(Activity, "create", async () => ({}));

  const response = createResponse();
  await updateTask(
    {
      params: { id: taskId },
      body: { status: "done", priority: "high" },
      user: { _id: userId },
    },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.task.status, "done");
  assert.equal(response.body.task.priority, "high");
});

test("updateTask rejects empty updates and invalid statuses", async () => {
  const task = { project: projectId, async save() {} };
  mock.method(Task, "findOne", async () => task);
  mock.method(Project, "findOne", async () => ({ _id: projectId }));

  const emptyResponse = createResponse();
  await updateTask(
    { params: { id: taskId }, body: {}, user: { _id: userId } },
    emptyResponse,
    (error) => assert.fail(error)
  );
  assert.equal(emptyResponse.statusCode, 400);

  const invalidResponse = createResponse();
  await updateTask(
    {
      params: { id: taskId },
      body: { status: "blocked" },
      user: { _id: userId },
    },
    invalidResponse,
    (error) => assert.fail(error)
  );
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(task.status, undefined);
});

test("deleteTask returns not found when the task is not owned by the user", async () => {
  const deletion = mock.method(Task, "findOne", async () => null);
  const response = createResponse();

  await deleteTask(
    { params: { id: taskId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 404);
  assert.equal(deletion.mock.callCount(), 1);
});

test("deleteTask deletes an owned task", async () => {
  const calls = [];
  mock.method(Task, "findOne", async (filter) => {
    assert.deepEqual(filter, { _id: taskId });
    return {
      project: projectId,
      title: "Delete test task",
      async deleteOne() {
        calls.push("deleted");
      },
    };
  });
  mock.method(Project, "findOne", async () => ({ _id: projectId }));
  mock.method(Activity, "create", async () => ({}));

  const response = createResponse();
  await deleteTask(
    { params: { id: taskId }, user: { _id: userId } },
    response,
    (error) => assert.fail(error)
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, ["deleted"]);
});
