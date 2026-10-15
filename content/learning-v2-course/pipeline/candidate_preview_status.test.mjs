import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { sessionProjectionChanged } from "./candidate_preview_status.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "candidate-preview-status-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("unchanged release sessions are not mislabeled as candidate changes", (t) => {
  const root = fixture(t);
  const canonical = path.join(root, "canonical");
  const candidate = path.join(root, "candidate");
  fs.mkdirSync(canonical);
  fs.mkdirSync(candidate);
  fs.writeFileSync(path.join(canonical, "learner.json"), '{"tasks":[]}');
  fs.writeFileSync(path.join(candidate, "learner.json"), '{"tasks":[]}');

  assert.equal(sessionProjectionChanged(candidate, canonical), false);
});

test("changed candidate session is detected by exact relative-path bytes", (t) => {
  const root = fixture(t);
  const canonical = path.join(root, "canonical");
  const candidate = path.join(root, "candidate");
  fs.mkdirSync(canonical);
  fs.mkdirSync(candidate);
  fs.writeFileSync(path.join(canonical, "learner.json"), '{"tasks":[]}');
  fs.writeFileSync(path.join(candidate, "learner.json"), '{"tasks":[1]}');

  assert.equal(sessionProjectionChanged(candidate, canonical), true);
});

test("new candidate sessions are detected, and incomplete projections fail closed", (t) => {
  const root = fixture(t);
  const absentCanonical = path.join(root, "absent");
  const candidate = path.join(root, "candidate");
  fs.mkdirSync(candidate);
  fs.writeFileSync(path.join(candidate, "learner.json"), '{"tasks":[]}');
  assert.equal(sessionProjectionChanged(candidate, absentCanonical), true);
  assert.throws(() => sessionProjectionChanged(path.join(root, "missing"), absentCanonical), /candidate_projection_missing/u);
});
