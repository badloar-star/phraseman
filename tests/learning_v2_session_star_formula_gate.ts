import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "app/learning_v2_session_star_results_store.ts",
  "utf8",
);

assert.match(
  source,
  /entry\.disposition === ['"]completed['"][\s\S]{0,120}entry\.learnerAttempts <= 1[\s\S]{0,80}!entry\.hintUsed/u,
  "skipped interactions must stay in the denominator but never count as clean answers",
);

console.log("LEARNING V2 SESSION STAR FORMULA GATE: PASS");
