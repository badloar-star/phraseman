import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const overlay = readFileSync(
  resolve(root, "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx"),
  "utf8",
);

// зачем (владелец 22.10, колонка «Предлагаем» №23): авто-переворот, подсказка «переверни» и переворот касанием отменены — перевод на лицевой стороне; здесь держим их отсутствие
assert.doesNotMatch(overlay, /NEW_WORD_AUTO_FLIP_MS|createLearningV2NewWordAutoFlipControllerV1|autoFlipControllerRef|flippedRef|flipOnPressIn|hintPulse/);
assert.match(overlay, /testID="learning-v2-new-word-face"/);
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
assert.ok(
  !/entering=\{entering\}/.test(overlay),
  "the entrance animation must never gate card or Continue touches",
);
assert.match(overlay, /const entranceProgress = useRef\(new RNAnimated\.Value\(0\)\)\.current/);
assert.match(overlay, /continuingRef\.current/);
assert.match(overlay, /if \(continuingRef\.current\) return/);
assert.match(overlay, /maxWidth:\s*330/);
assert.match(overlay, /maxHeight:\s*["']62%["']/);
assert.doesNotMatch(overlay, /styles\.backdrop/);
assert.match(overlay, /pointerEvents="box-none"/);
assert.match(overlay, /onLayout=\{\(\) => \{/);
assert.match(overlay, /onPresented\(\)/);
assert.doesNotMatch(
  overlay,
  /styles\.backdrop,\s*\{\s*backgroundColor:\s*t\.bgPrimary\s*\}/,
  "the word encounter must remain a compact floating card instead of painting a full-screen page",
);

process.stdout.write("LEARNING V2 NEW WORD OVERLAY 2026-08-26 GATE: PASS\n");
