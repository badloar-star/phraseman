import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sessionId = "en:lesson-01:session-45";
const sourceDir = path.join(root, "mockup/reviewed-source/en/l01/s45");
const releaseDir = path.join(root, "release/en/l01/s45");
const artifacts = [
  "intro.json",
  "learner.json",
  "learner.uk.json",
  "answers.json",
  "auxiliary.json",
];

const readJson = (directory, filename) => JSON.parse(
  fs.readFileSync(path.join(directory, filename), "utf8"),
);

function collectIds(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:courseSessionId|interactionId|pageId|responseId)$/u.test(key) && typeof child === "string") {
      found.push([key, child]);
    }
    collectIds(child, found);
  }
  return found;
}

test("L01/S45 canonical release exactly matches every reviewed source artifact", () => {
  for (const filename of artifacts) {
    const source = readJson(sourceDir, filename);
    const release = readJson(releaseDir, filename);
    assert.deepEqual(release, source, `${filename} must preserve reviewed source semantics`);
  }
});

test("L01/S45 release keeps only canonical session-scoped IDs", () => {
  for (const filename of artifacts) {
    const release = readJson(releaseDir, filename);
    for (const [field, id] of collectIds(release)) {
      if (field === "courseSessionId") assert.equal(id, sessionId, `${filename}:${field}`);
      else assert.ok(id.startsWith(`${sessionId}:`), `${filename}:${field}:${id}`);
    }
  }
});
