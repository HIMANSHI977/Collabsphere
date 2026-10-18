import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import Note from "../models/Note.js";
import Project from "../models/Project.js";
import Activity from "../models/Activity.js";
import { createNote, listNotes, updateNote, deleteNote } from "../controllers/noteController.js";

const projectId = "507f1f77bcf86cd799439011";
const noteId = "507f191e810c19729de860ea";
const userId = "507f1f77bcf86cd799439012";

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

afterEach(() => mock.restoreAll());

test("createNote validates title before persistence", async () => {
  const create = mock.method(Note, "create", () => assert.fail("Invalid note must not be saved"));
  const res = response();
  await createNote({ body: { projectId, content: "x" }, user: { _id: userId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});

test("createNote stores Markdown for a project member and logs activity", async () => {
  mock.method(Project, "findOne", async (filter) => {
    assert.deepEqual(filter, { _id: projectId, $or: [{ createdBy: userId }, { members: userId }] });
    return { _id: projectId };
  });
  const note = { _id: noteId, title: "Plan", content: "# Plan" };
  mock.method(Note, "create", async (data) => {
    assert.equal(data.content, "# Plan");
    assert.equal(data.updatedBy, userId);
    return note;
  });
  mock.method(Activity, "create", async (data) => {
    assert.equal(data.action, "note.created");
    return data;
  });
  const res = response();
  await createNote({ body: { projectId, title: "Plan", content: "# Plan" }, user: { _id: userId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.note, note);
});

test("listNotes denies users without project membership", async () => {
  mock.method(Project, "findOne", async () => null);
  mock.method(Note, "find", () => assert.fail("Notes must not be read"));
  const res = response();
  await listNotes({ query: { projectId }, user: { _id: userId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 404);
});

test("updateNote rejects empty updates", async () => {
  mock.method(Note, "findById", async () => ({ project: projectId }));
  const res = response();
  await updateNote({ params: { id: noteId }, body: {}, user: { _id: userId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 400);
});

test("updateNote saves Markdown changes for a project member", async () => {
  const note = {
    _id: noteId,
    project: projectId,
    title: "Old title",
    content: "Old content",
    async save() {},
  };
  mock.method(Note, "findById", async () => note);
  mock.method(Project, "findOne", async () => ({ _id: projectId }));
  mock.method(Activity, "create", async (data) => {
    assert.equal(data.action, "note.updated");
    return data;
  });
  const res = response();
  await updateNote(
    { params: { id: noteId }, body: { title: "New title", content: "## Decisions" }, user: { _id: userId } },
    res,
    (error) => assert.fail(error)
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.note.title, "New title");
  assert.equal(res.body.note.content, "## Decisions");
  assert.equal(res.body.note.updatedBy, userId);
});

test("deleteNote removes an authorized note and records activity", async () => {
  const note = {
    _id: noteId,
    project: projectId,
    title: "Plan",
    async deleteOne() {},
  };
  mock.method(Note, "findById", async () => note);
  mock.method(Project, "findOne", async () => ({ _id: projectId }));
  mock.method(Activity, "create", async (data) => {
    assert.equal(data.action, "note.deleted");
    return data;
  });
  const res = response();
  await deleteNote({ params: { id: noteId }, user: { _id: userId } }, res, (error) => assert.fail(error));
  assert.equal(res.statusCode, 200);
});
