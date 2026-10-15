import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const read = (path: string) => readFileSync(path, "utf8");

const lessons = read("app/(tabs)/lessons.tsx");
const player = read("app/learning_v2_direct_session_player_v1.tsx");
const client = read("app/learning_v2_course_released_session_client_v3.ts");
const copy = read("app/learning_v2_session_copy.ts");

// R09 (15.10): подготовка и передача «готово» — в общем модуле запуска; вкладка «Уроки» (и Главная) зовут его
const launch = read("app/learning_v2_session_launch_v1.ts");
assert.match(launch, /prepareCurrentLearningV2CourseSessionV3/);
assert.match(launch, /stageLearningV2CourseSessionReadyHandoffV3/);
assert.match(lessons, /prepareLearningV2SessionRunV1\(/);
assert.match(lessons, /stageLearningV2ReadyHandoffV1\(ready\.handle\)/);
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
}

if (typeof test === "function") {
  test("learning_v2_direct_intro_gate_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
