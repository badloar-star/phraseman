import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const course = readFileSync(
  "components/learning-v2/LearningV2ChaptersCourse.tsx",
  "utf8",
);
const outcome = readFileSync(
  "components/LearningV2SessionOutcomeSheet.tsx",
  "utf8",
);

// зачем (координатор §49, 2026-10-02): карта уроков с 30.09 — аккордеон глав
// LearningV2ChaptersCourse (4fa4ab32b); прокручиваемая карта LearningV2PulseCourse
// не рендерилась и удалена. Прогрев повторов теперь срабатывает при раскрытии
// главы, а не после остановки прокрутки — сторожим это и отсутствие вечных анимаций.
const toggleChapter = course.slice(course.indexOf("const toggleChapter = useCallback"), course.indexOf("const openLesson = useCallback"));
assert.match(toggleChapter, /if \(next !== null\) \{[\s\S]*props\.onVisibleSessionsSettled\?\.\(/);
assert.doesNotMatch(course, /withRepeat|Animated\.loop/);

assert.match(outcome, /const sceneProgress = useSharedValue\(0\)/);
assert.match(outcome, /const leave = useCallback/);
assert.match(outcome, /const dismiss = useCallback[\s\S]{0,180}leave\(onClose\)/);
assert.match(outcome, /leave\(onPrimaryPress, true\)/);
assert.match(outcome, /leave\(onSecondaryPress, true\)/);
assert.doesNotMatch(outcome, /withRepeat/);

console.log("LEARNING V2 MOTION PERFORMANCE CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_motion_performance_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
