import assert from "node:assert/strict";
import { afterEach, test, mock } from "node:test";
import Activity from "../models/Activity.js";
import recordActivity from "../utils/recordActivity.js";

afterEach(() => mock.restoreAll());

test("activity writes are best-effort and do not fail completed resource operations", async () => {
  mock.method(Activity, "create", async () => {
    throw new Error("private database details must not be logged");
  });
  const log = mock.method(console, "error", () => {});

  const result = await recordActivity({
    project: "507f1f77bcf86cd799439011",
    user: "507f191e810c19729de860ea",
    action: "note.created",
    resourceType: "note",
    details: "Created a note",
  });

  assert.equal(result, null);
  assert.equal(log.mock.callCount(), 1);
  assert.deepEqual(log.mock.calls[0].arguments, ["Project activity could not be recorded"]);
});
