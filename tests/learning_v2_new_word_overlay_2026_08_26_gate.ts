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
assert.ok(
  !overlay.includes("NEW_WORD_POCKET_FLIGHT_Y_RATIO"),
  "the card flight must not guess its footer endpoint from screen height",
);
assert.match(overlay, /measurePocketTarget/);
assert.match(overlay, /measureInWindow/);
assert.match(overlay, /pocketFlightX/);
assert.match(overlay, /pocketFlightY/);
assert.match(
  overlay,
  /inputRange:\s*\[0,\s*0\.9,\s*1\]/,
  "the flying card must remain visible until it reaches the footer",
);
assert.match(overlay, /hintPulse/);
assert.match(overlay, /RNAnimated\.loop\(/);
assert.match(overlay, /outputRange:\s*\[0\.58,\s*1\]/);
assert.match(
  overlay,
  /flipOnPressIn/,
  "the canonical card must opt into immediate, interruptible flip taps",
);
assert.ok(
  !/entering=\{entering\}/.test(overlay),
  "the entrance animation must never gate card or Continue touches",
);
assert.match(overlay, /const entranceProgress = useRef\(new RNAnimated\.Value\(0\)\)\.current/);
assert.match(overlay, /continuingRef\.current/);
assert.match(overlay, /if \(continuingRef\.current\) return/);

process.stdout.write("LEARNING V2 NEW WORD OVERLAY 2026-08-26 GATE: PASS\n");
