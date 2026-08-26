import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const overlay = readFileSync(
  resolve(root, "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx"),
  "utf8",
);

assert.match(overlay, /NEW_WORD_AUTO_FLIP_MS\s*=\s*3_?000/);
assert.match(overlay, /createLearningV2NewWordAutoFlipControllerV1\(\{/);
assert.match(overlay, /delayMs:\s*NEW_WORD_AUTO_FLIP_MS/);
assert.match(overlay, /controller\.arm\(\)/);
assert.match(overlay, /controller\.dispose\(\)/);
assert.match(overlay, /autoFlipControllerRef\.current\?\.manualFlip\(\)/);
assert.match(overlay, /testID="learning-v2-new-word-save"/);
assert.match(overlay, /styles\.cardBookmark/);
assert.equal(
  (overlay.match(/name=\{saved \? "bookmark" : "bookmark-outline"\}/g) ?? []).length,
  1,
  "the blocking word card must expose exactly one bookmark control",
);
assert.ok(
  !overlay.includes("<V2Chip"),
  "the bookmark must not be wrapped in the oversized 3D answer-chip shell",
);
assert.match(overlay, /styles\.continueRow/);

process.stdout.write("LEARNING V2 NEW WORD OVERLAY 2026-08-26 GATE: PASS\n");
