import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

const hud = read("components/session_attempts/SessionAttemptsHud.tsx");
const motion = read("constants/motionHybrid.ts");
const motionCatalog = read("docs/v2/mockups/25-learning-v2-motion-catalog.html");

assert.ok(
  hud.includes("SESSION_ATTEMPTS_MOTION") &&
    hud.includes("useReduceMotion"),
  "the shared HUD must own canonical and reduced-motion loss behavior",
);
assert.ok(
  motion.includes("exhaustedModalDelayMs"),
  "the modal delay must remain a shared motion constant",
);
const shakeOffsetsMatch = motion.match(/shakeOffsetsPx:\s*\[([^\]]+)\]/u);
const shakeSegmentMatch = motion.match(/shakeSegmentMs:\s*(\d+)/u);
const modalDelayMatch = motion.match(/exhaustedModalDelayMs:\s*(\d+)/u);
assert.ok(shakeOffsetsMatch && shakeSegmentMatch && modalDelayMatch);
const shakeSegments = shakeOffsetsMatch[1]
  .split(",")
  .map((value) => Number(value.trim()));
const shakeDurationMs = shakeSegments.length * Number(shakeSegmentMatch[1]);
assert.ok(
  Number(modalDelayMatch[1]) >= shakeDurationMs,
  `exhausted modal must wait for the ${shakeDurationMs}ms heart animation`,
);
assert.ok(
  motionCatalog.includes('data-motion-example="attempt-loss"') &&
    motionCatalog.includes('data-motion-example="attempt-loss-reduced"') &&
    motionCatalog.includes('data-motion-example="attempt-refill"') &&
    motionCatalog.includes('data-motion-example="attempt-refill-reduced"'),
  "the motion catalog must show normal and reduced-motion loss/refill",
);
for (const label of [
  "pop 1 → 1.22 → .64",
  "tilt + drop + halo",
  "stagger 0 / 70 / 140 ms",
  "spring + halo",
  "fill → outline",
  "модал после финального состояния",
]) {
  assert.ok(motionCatalog.includes(label), `motion catalog is missing: ${label}`);
}

assert.ok(
  !motionCatalog.includes("Попытка потеряна"),
  "attempt loss motion must not create a toast",
);

console.log("LEARNING V2 SESSION ATTEMPTS MOTION GATE: PASS");
