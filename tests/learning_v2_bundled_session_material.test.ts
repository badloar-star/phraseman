// зачем: владелец 2026-08-17 — «первый урок уже должен быть в бандле», «убери
// сервер наглухо». Урок 1 (10 написанных сессий) лежал в коде месяцами, но
// проигрыватель ни разу его не читал — экран всегда уходил в сеть, даже за
// контентом, который уже был на телефоне, и висел на «Подготавливаем занятие».
//
// Мокаются только модули с нативными/сетевыми зависимостями (Firebase, expo
// fetch через аудио-предзагрузку) — само содержимое урока (runtime парсеры,
// конвертер шарда) остаётся настоящим. Тест доказывает, что
// bundledLearningV2CourseSessionMaterialV3 отдаёт РАБОЧИЙ материал: не просто
// непустой объект, а такой, который реально проходит
// createLearningV2CourseSessionDeviceRunV1 — то, что фактически запускает
// сессию на устройстве. Именно на этом шаге в процессе разработки нашлись три
// реальных дефекта конвертера, которые более ранние проверки (сборка/разбор
// каждого ребёнка по отдельности) не ловили.
jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({})),
}));
jest.mock("@react-native-firebase/functions", () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock("../app/app_check_init", () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock("../app/cloud_sync", () => ({
  ensureAnonUser: jest.fn(async () => "stable-1"),
}));
jest.mock("../app/stable_id", () => ({
  peekStableId: jest.fn(() => "stable-1"),
}));
jest.mock("../app/learning_v2_course_session_audio_preload_v1", () => ({
  preloadLearningV2CourseSessionAudioV1: jest.fn(),
  isLearningV2CourseSessionAudioPreloadHandleV1: jest.fn(() => true),
  getLearningV2CourseSessionAudioPreloadSummaryV1: jest.fn(),
}));

/* eslint-disable import/first -- native/transport seams are mocked first */
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";
import { createLearningV2CourseSessionDeviceRunV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";
import { authoredLearningV2SessionCount } from "../modules/learning-v2/content/source/authored_sessions_v1";
/* eslint-enable import/first */

const LOCATOR = Object.freeze({
  environment: "production" as const,
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  lessonOrdinal: 1,
});

describe("bundled Learning V2 session material (no network)", () => {
  test("returns null for a lesson that has no local content", () => {
    expect(
      bundledLearningV2CourseSessionMaterialV3({
        ...LOCATOR,
        lessonOrdinal: 2,
        sessionOrdinal: 1,
      }),
    ).toBeNull();
  });

  test("returns null for a session number beyond what's written", () => {
    expect(
      bundledLearningV2CourseSessionMaterialV3({
        ...LOCATOR,
        sessionOrdinal: authoredLearningV2SessionCount() + 1,
      }),
    ).toBeNull();
  });

  test("every written session (1..N) produces material that starts a real device run", () => {
    const count = authoredLearningV2SessionCount();
    expect(count).toBeGreaterThanOrEqual(10);
    for (let sessionOrdinal = 1; sessionOrdinal <= count; sessionOrdinal += 1) {
      const material = bundledLearningV2CourseSessionMaterialV3({
        ...LOCATOR,
        sessionOrdinal,
      });
      expect(material).not.toBeNull();
      if (!material) continue;
      expect(material.lessonOrdinal).toBe(1);
      expect(material.sessionOrdinal).toBe(sessionOrdinal);
      expect(material.courseSessionId).toBe(
        `lesson-01:session:${String(sessionOrdinal).padStart(2, "0")}`,
      );
      // Не должно бросить — это и есть проверка, которую раньше никто не
      // проходил до конца: courseSessionId, состав интро/капсулы/вспомогательного
      // должны буквально совпадать между всеми четырьмя детьми.
      expect(() =>
        createLearningV2CourseSessionDeviceRunV1({
          environment: LOCATOR.environment,
          targetLanguage: LOCATOR.targetLanguage,
          studyTarget: LOCATOR.studyTarget,
          learnerSourceLocale: LOCATOR.learnerSourceLocale,
          seasonId: LOCATOR.seasonId,
          releaseId: material.releaseId,
          activeRootFingerprint: material.activeRootFingerprint,
          activeHeadFingerprint: material.activeHeadFingerprint,
          lessonId: material.lessonId,
          lessonOrdinal: material.lessonOrdinal,
          courseSessionId: material.courseSessionId,
          sessionOrdinal: material.sessionOrdinal,
          packageFingerprint: material.packageFingerprint,
          childSetFingerprint: material.childSetFingerprint,
          introChild: material.introChild,
          learnerChild: material.learnerChild,
          evaluatorCapsuleChild: material.evaluatorCapsuleChild,
          auxiliaryChild: material.auxiliaryChild,
        } as never),
      ).not.toThrow();
    }
  });
});
