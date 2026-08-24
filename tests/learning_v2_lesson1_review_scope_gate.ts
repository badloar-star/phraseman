import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(__dirname, "..");
const outputDir = mkdtempSync(join(tmpdir(), "lesson1-review-scope-"));
for (const builder of [
  "build_learning_v2_lesson1_review_mock.mjs",
  "build_learning_v2_lesson1_real_session_mock.mjs",
]) {
  const result = spawnSync(
    process.execPath,
    [
      join(ROOT, "scripts", builder),
      "--from",
      "19",
      "--to",
      "19",
      "--output",
      join(outputDir, `${builder}.html`),
      "--data-output",
      join(outputDir, `${builder}-data.js`),
    ],
    { cwd: ROOT, encoding: "utf8" },
  );

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /lesson1_review_out_of_order:requestedThrough=19:current=11:lockedThrough=10/u,
    `${builder} must fail on a future session before its ordinary content gates run`,
  );
}

process.stdout.write("LESSON 1 REVIEW SCOPE GATE: PASS\n");
