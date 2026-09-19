import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");

const sheetUsage =
  lessons.match(/<LearningV2SessionOutcomeSheet[\s\S]*?\n\s*\/>/)?.[0] ?? "";

assert.ok(
  sheetUsage,
  "Learning V2 session modal must remain mounted from the lessons map",
);
assert.doesNotMatch(
  sheetUsage,
  /actionsDisabled=/,
  "a visible session modal must never expose a loading/disabled-buttons frame",
);
assert.match(
  lessons,
  /prepareLearningV2SessionBeforeModal/,
  "the map must keep a reusable preparation pipeline",
);
assert.match(
  lessons,
  /learningV2PreparedLaunchesRef/,
  "prepared session launches must be retained on the map for instant modal opening",
);
assert.match(
  lessons,
  /setSelectedLearningV2Session\([\s\S]{0,360}void prepareLearningV2SessionBeforeModal/,
  "the metadata-only modal must mount synchronously before preparation is observed",
);
assert.doesNotMatch(
  lessons,
  /Promise\.all\(completed\.map/,
  "completed-session audio preparation must not fan out without a bound",
);
assert.match(lessons, /onVisibleSessionsSettled/);
assert.match(lessons, /repeats[\s\S]{0,160}slice\(0, 7\)/);
assert.match(lessons, /learningV2PreparedLaunchesRef\.current\.size > 8/);

console.log("LEARNING V2 SESSION MODAL ZERO LOADING FRAME CONTRACT: PASS");
