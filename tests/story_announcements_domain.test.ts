import { strict as assert } from "node:assert";
import {
  storyAdminRole,
  parseStoryCommand,
  applyStoryCommand,
} from "../functions/src/story_announcements_domain";
const content = {
  templateId: "leaf",
  title: "",
  badge: "Новое",
  blocks: [],
  titleSize: 34,
  align: "left",
  decoration: true,
  lifetime: 2,
  unit: "hours",
  durationMs: 8000,
};
const make = (action: string, expectedRevision = 0) =>
  parseStoryCommand({
    id: "news_1",
    operationId: "operation_12345678",
    action,
    expectedRevision,
    content,
  });
test("admin claim and campaign permission required", () => {
  for (const token of [
    undefined,
    {},
    { admin: false },
    { admin: true, adminRole: "support" },
    { admin: true, adminRole: "analyst" },
  ])
    assert.throws(() => storyAdminRole(token, true));
  assert.equal(storyAdminRole({ admin: true }, true), "owner");
  assert.equal(
    storyAdminRole({ admin: true, adminRole: "analyst" }, false),
    "analyst",
  );
});
test("publish computes server expiry; stop removes feed; stale edits rejected", () => {
  const p = applyStoryCommand(make("publish"), null, [], 1000);
  assert.equal(p.items.length, 1);
  assert.equal(p.document.expiresAtMs, 7201000);
  assert.throws(
    () => applyStoryCommand(make("stop", 0), p.document, p.items, 2000),
    /revision_conflict/,
  );
  const off = applyStoryCommand(make("stop", 1), p.document, p.items, 2000);
  assert.equal(off.items.length, 0);
  assert.equal(off.document.status, "draft");
  assert.equal(off.document.revision, 2);
});
test("save is not publication; feed strips admin metadata", () => {
  assert.equal(applyStoryCommand(make("save"), null, [], 1000).items.length, 0);
  const p = applyStoryCommand(make("publish"), null, [], 1000);
  const copy = applyStoryCommand(
    parseStoryCommand({ ...make("save"), id: "news_2" }),
    null,
    [{ ...p.items[0], updatedBy: "private" }],
    2000,
  );
  assert.equal("updatedBy" in copy.items[0], false);
});
