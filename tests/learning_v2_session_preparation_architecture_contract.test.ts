import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeEol } from './helpers/read_source';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const lessons = normalizeEol(readFileSync("app/(tabs)/lessons.tsx", "utf8"));
const rootLayout = normalizeEol(readFileSync("app/_layout.tsx", "utf8"));
const pulse = normalizeEol(readFileSync(
  "components/learning-v2/LearningV2ChaptersCourse.tsx",
  "utf8",
));
const sheet = normalizeEol(readFileSync(
  "components/LearningV2SessionOutcomeSheet.tsx",
  "utf8",
));
const client = normalizeEol(readFileSync(
  "app/learning_v2_course_released_session_client_v3.ts",
  "utf8",
));
// зачем (владелец 22.10, «только TTS»): записанных mp3 в занятиях нет — модуль прогрева записей и встроенный пакет
// урока 1 удалены, их проверки сняты; корень приложения больше не сеет кэш записей.
assert.doesNotMatch(
  rootLayout,
  /seedLearningV2BootstrapAudioCacheV1/,
  "recorded lesson audio is retired: the root layout must not seed a recorded-audio cache",
);
assert.doesNotMatch(
  lessons,
  /learningV2AudioReadyLessons|isLessonAudioReady|onLessonAudioPendingPress/,
  "audio readiness must never gate Learning V2 navigation",
);

assert.match(
  lessons,
  /prewarmCurrentLearningV2SessionOnEntry/,
  "the current session must start preparing as soon as Learning V2 opens",
);
assert.match(
  lessons,
  /learningV2ProgressHydrated/,
  "entry prewarm must use hydrated local progress, not the default placeholder",
);
assert.match(
  lessons,
  // 17.10: «Пропуск основателя» удалён — прогрев занятия при входе идёт, когда раздел V2 открыт и активен
  /if \(page === "v2" && lessonsRuntimeActive\) \{[\s\S]{0,2500}prewarmCurrentLearningV2SessionOnEntry/,
  "entry prewarm runs while the V2 section is open and active",
);
// зачем (координатор §49, 2026-10-02): карта уроков с 30.09 — аккордеон глав
// LearningV2ChaptersCourse (4fa4ab32b); прокручиваемая карта LearningV2PulseCourse
// не рендерилась и удалена. Прогрев повторов теперь срабатывает при раскрытии
// главы, а не после остановки прокрутки — сторожим это и отсутствие вечных анимаций.
assert.match(
  pulse,
  /props\.onVisibleSessionsSettled\?\.\(selectedLessonOrdinal, visible\)/,
  "the chapters map must report the sessions of an expanded chapter for prewarm",
);
assert.match(lessons, /onVisibleSessionsSettled=\{handleLearningV2VisibleSessionsSettled\}/);

const pressHandler = lessons.slice(
  lessons.indexOf("const handleLearningV2SessionPress"),
  lessons.indexOf("const handleLessonsBack"),
);
assert.ok(pressHandler.length > 0, "session press handler missing");
assert.ok(
  pressHandler.indexOf("setSelectedLearningV2Session") <
    pressHandler.indexOf("prewarmLearningV2SessionLaunch"),
  "tap must mount the metadata-only modal synchronously before preparation",
);
assert.doesNotMatch(
  pressHandler,
  /prewarmLearningV2SessionLaunch[\s\S]*?\.then\([\s\S]*?setSelectedLearningV2Session/,
  "modal visibility must not wait for preparation",
);

const preparationWrapper = lessons.slice(
  lessons.indexOf("const prepareLearningV2SessionLaunch"),
  lessons.indexOf("useEffect(() =>", lessons.indexOf("const prepareLearningV2SessionLaunch")),
);
const navigationPreparation = preparationWrapper.slice(
  0,
  preparationWrapper.indexOf("const prewarmLearningV2SessionLaunch"),
);
assert.doesNotMatch(
  navigationPreparation,
  /prepareLearningV2AudioSession/,
  "navigation preparation must never wait for network-capable audio preparation",
);
// зачем (владелец 22.10, «только TTS»): записей нет — фоновый прогрев готовит только материал занятия, звук не готовит.
assert.match(
  preparationWrapper,
  /const prewarmLearningV2SessionLaunch[\s\S]*?prepareLearningV2SessionBeforeModal/,
  "background prewarm must prepare the session material before the local-only handoff",
);
assert.doesNotMatch(
  preparationWrapper,
  /prepareLearningV2AudioSession/,
  "recorded lesson audio is retired: prewarm must not prepare recorded audio",
);

const launchHandler = lessons.slice(
  lessons.indexOf("const launchSelectedLearningV2Session"),
  lessons.indexOf("// Витрина звёзд"),
);
assert.match(launchHandler, /setSelectedLearningV2Session\(null\)/);
assert.match(launchHandler, /LEARNING_V2_SESSION_MODAL_EXIT_MS/);
assert.match(launchHandler, /Promise\.all/);

assert.match(client, /getLearningV2CourseSessionReadyTimingV3/);
assert.match(client, /materialReadyAtMs/);
assert.match(client, /audioReadyAtMs/);
assert.match(sheet, /onMounted/);
assert.match(lessons, /startLearningV2SessionLaunchTraceV1/);
assert.match(lessons, /markLearningV2SessionLaunchStageV1/);
assert.match(lessons, /"modal_mounted"/);
assert.match(lessons, /"material_ready"/);
assert.match(lessons, /"audio_ready"/);

console.log("LEARNING V2 SESSION PREPARATION ARCHITECTURE CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_session_preparation_architecture_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
