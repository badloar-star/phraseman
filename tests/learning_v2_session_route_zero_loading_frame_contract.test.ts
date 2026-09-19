import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync("app/learning_v2_direct_session_player_v1.tsx", "utf8");

assert.match(
  player,
  /initialReadyHandleRef\.current[\s\S]{0,500}isAuthoringPreview[\s\S]{0,260}buildLearningV2DevUnlockedDraftDevicePreviewV1/,
  "dev sessions must materialize synchronously on the first render",
);
assert.doesNotMatch(
  player,
  /setReadyHandle\(null\);\s*setMaterial\(null\);\s*if \(isAuthoringPreview\)/,
  "the dev route must not clear ready material for an intermediate frame",
);
assert.doesNotMatch(
  player,
  /if \(!loadFailed\)[\s\S]{0,180}styles\.screen/,
  "the route must not render an empty full-screen loading frame",
);
assert.doesNotMatch(
  player,
  /restartInterruptedRun[\s\S]{0,900}setMaterial\(null\)/,
  "background recovery must keep the verified material mounted",
);
assert.doesNotMatch(
  player,
  /prepareCurrentLearningV2CourseSessionV3/,
  "production preparation must finish on the map before route mount",
);
assert.doesNotMatch(
  player,
  /Подготавливаем(?: занятие| локальное аудио)/,
  "a loading message must never be rendered by the session route",
);

console.log("LEARNING V2 SESSION ROUTE ZERO LOADING FRAME CONTRACT: PASS");
