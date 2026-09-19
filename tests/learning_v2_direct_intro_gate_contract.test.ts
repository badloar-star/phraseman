import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const lessons = read("app/(tabs)/lessons.tsx");
const player = read("app/learning_v2_direct_session_player_v1.tsx");
const client = read("app/learning_v2_course_released_session_client_v3.ts");
const copy = read("app/learning_v2_session_copy.ts");

assert.match(lessons, /prepareCurrentLearningV2CourseSessionV3/);
assert.match(lessons, /stageLearningV2CourseSessionReadyHandoffV3/);
assert.match(
  lessons,
  /Promise\.all\(\[prepared, modalExit\]\)[\s\S]{0,1800}sessionRunId:\s*ready\.sessionRunId/,
);
assert.match(player, /consumeLearningV2CourseSessionReadyHandoffV3/);
assert.match(player, /sessionRunId\?: string \| string\[\]/);
assert.match(client, /export function stageLearningV2CourseSessionReadyHandoffV3/);
assert.match(client, /export function consumeLearningV2CourseSessionReadyHandoffV3/);

assert.doesNotMatch(player, /copy\.preparing/);
assert.doesNotMatch(player, /styles\.preparingContent/);
assert.doesNotMatch(copy, /Подготавливаем занятие и локальное аудио/);
assert.doesNotMatch(copy, /Preparing the lesson and local audio/);

console.log("LEARNING V2 DIRECT INTRO GATE CONTRACT: PASS");
