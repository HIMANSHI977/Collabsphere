import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Note from "../models/Note.js";
import ProjectFile from "../models/ProjectFile.js";
import Task from "../models/Task.js";
import Activity from "../models/Activity.js";
import { getProjectAnalytics } from "../controllers/analyticsController.js";

const projectId = "507f1f77bcf86cd799439011";
const ownerId = "507f191e810c19729de860ea";
const memberId = "507f191e810c19729de860eb";

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

afterEach(() => mock.restoreAll());

test("analytics reports database aggregates and recent activity for members", async () => {
  const owner = { _id: ownerId, name: "Owner", email: "owner@example.com" };
  const member = { _id: memberId, name: "Member", email: "member@example.com" };
  mock.method(Project, "findOne", async () => ({ _id: projectId }));
  mock.method(Project, "findById", () => ({
    populate() { return this; },
    then(resolve) { resolve({ createdBy: owner, members: [member] }); },
  }));
  mock.method(Note, "aggregate", async () => [{ _id: ownerId, count: 2 }]);
  mock.method(ProjectFile, "aggregate", async () => [{ _id: memberId, count: 3 }]);
  mock.method(Task, "aggregate", async () => [{ _id: memberId, count: 4 }]);
  const activity = [{ _id: "event1", action: "note.created" }];
  mock.method(Activity, "find", () => ({
    populate() { return this; },
    sort() { return this; },
    limit: async (value) => {
      assert.equal(value, 30);
      return activity;
    },
  }));

  const res = response();
  await getProjectAnalytics(
    { query: { projectId }, user: { _id: memberId } },
    res,
    (error) => assert.fail(error)
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.summary, { members: 2, notes: 2, files: 3, tasks: 4 });
  assert.equal(res.body.contributions[0].notesCreated, 2);
  assert.equal(res.body.contributions[1].filesUploaded, 3);
  assert.equal(res.body.contributions[1].tasksCreated, 4);
  assert.deepEqual(res.body.recentActivity, activity);
});

test("analytics rejects users without access to the project", async () => {
  mock.method(Project, "findOne", async () => null);
  mock.method(Note, "aggregate", () => assert.fail("No private aggregate should run"));
  const res = response();
  await getProjectAnalytics(
    { query: { projectId }, user: { _id: memberId } },
    res,
    (error) => assert.fail(error)
  );
  assert.equal(res.statusCode, 404);
});

test("analytics rejects malformed project IDs", async () => {
  const lookup = mock.method(Project, "findOne", () => assert.fail("Invalid ID must not query"));
  const res = response();
  await getProjectAnalytics({ query: { projectId: "bad" }, user: { _id: memberId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 400);
  assert.equal(lookup.mock.callCount(), 0);
  assert.ok(mongoose.isValidObjectId(projectId));
});
