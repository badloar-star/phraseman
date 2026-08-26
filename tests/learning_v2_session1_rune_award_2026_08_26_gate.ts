import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { learningV2InteractionRuneAwardV1 } from "../app/learning_v2_interaction_rune_award_v1";

const root = resolve(__dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

assert.equal(
  learningV2InteractionRuneAwardV1({ learnerAttempts: 1, hintUsed: false }),
  3,
  "a clean first attempt must award three runes",
);
assert.equal(
  learningV2InteractionRuneAwardV1({ learnerAttempts: 2, hintUsed: false }),
  2,
  "a correct second attempt must award two runes",
);
assert.equal(
  learningV2InteractionRuneAwardV1({ learnerAttempts: 3, hintUsed: false }),
  1,
  "a correct answer after earlier errors must award one rune",
);
assert.equal(
  learningV2InteractionRuneAwardV1({ learnerAttempts: 1, hintUsed: true }),
  1,
  "using a hint caps the award at one rune",
);
assert.equal(
  learningV2InteractionRuneAwardV1({ learnerAttempts: 1, hintUsed: false, skipped: true }),
  0,
  "a skipped interaction must award zero runes",
);

const player = read("app/learning_v2_direct_session_player_v1.tsx");
assert.ok(
  player.includes("learningV2InteractionRuneAwardV1"),
  "the runtime must use the canonical per-interaction award ladder",
);
assert.ok(
  player.includes("stars_10.webp") && player.includes("<Image"),
  "the top-right rune HUD must render the existing rune asset",
);
assert.ok(
  !player.includes("<RuneGlyph"),
  "the Learning V2 rune HUD must not fall back to a text symbol",
);

const flight = read("components/LearningV2RuneFlight.tsx");
assert.ok(
  flight.includes("stars_10.webp") && flight.includes("<Animated.Image"),
  "the award flight must animate the same real rune asset",
);
assert.ok(
  !flight.includes("pickRuneGlyphs") && !flight.includes("<Text"),
  "the Learning V2 award flight must not animate text glyphs",
);

process.stdout.write("LEARNING V2 SESSION 1 RUNE AWARD 2026-08-26 GATE: PASS\n");
