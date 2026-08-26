import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(__dirname, "../app/learning_v2_session_intro.tsx"),
  "utf8",
);

assert.match(source, /function IntroAnswerShake/);
assert.match(source, /withSequence\([\s\S]*withTiming\(-7/);
assert.match(source, /wrongChoiceNudge/);
assert.match(source, /marginHorizontal:\s*-14/);
assert.match(source, /readerParagraph:\s*\{\s*fontSize:\s*15,\s*lineHeight:\s*22/);

process.stdout.write("LEARNING V2 INTRO INTERACTION POLISH 2026-08-26 GATE: PASS\n");
