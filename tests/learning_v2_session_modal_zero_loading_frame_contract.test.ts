import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeEol } from './helpers/read_source';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const lessons = normalizeEol(readFileSync("app/(tabs)/lessons.tsx", "utf8"));

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
// Раскрытие главы — пользовательский жест, поэтому оно не может запускать
// materialize/hash до следующего тапа. Прогрев разрешён только idle-планировщику.
const visibleSettled = lessons.slice(
  lessons.indexOf("const handleLearningV2VisibleSessionsSettled"),
  lessons.indexOf("const [learningV2DenialHint"),
);
assert.doesNotMatch(visibleSettled, /prewarmLearningV2SessionLaunch\(/);
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
