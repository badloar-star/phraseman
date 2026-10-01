import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
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
  /setSelectedLearningV2Session\([\s\S]{0,360}void prewarmLearningV2SessionLaunch/,
  "the metadata-only modal must mount synchronously before preparation is observed",
);
assert.doesNotMatch(
  lessons,
  /Promise\.all\(completed\.map/,
  "completed-session audio preparation must not fan out without a bound",
);
assert.match(lessons, /onVisibleSessionsSettled/);
// зачем (координатор §47, 2026-10-01): аудит 20.09 ужал прогрев повторов с 7 до 2
// на остановку прокрутки (налог на скролл). Потолок сторожим строже: не больше 2.
assert.match(lessons, /const repeats = available[\s\S]{0,160}\.slice\(0, 2\)/);
assert.match(lessons, /learningV2PreparedLaunchesRef\.current\.size > 8/);

console.log("LEARNING V2 SESSION MODAL ZERO LOADING FRAME CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_session_modal_zero_loading_frame_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
