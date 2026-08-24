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
import {
  createLearningV2CourseSessionDeviceRunV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  AUTHORED_EPISODE_01_SESSIONS,
  authoredLearningV2SessionCount,
} from "../modules/learning-v2/content/source/authored_sessions_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
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

  test("rejects a session coordinate beyond the 56-session topology", () => {
    expect(() =>
      bundledLearningV2CourseSessionMaterialV3({
        ...LOCATOR,
        sessionOrdinal: authoredLearningV2SessionCount() + 1,
      }),
    ).toThrow("learning_v2_course_released_session_app_client_v3_invalid");
  });

  test("all 56 candidates produce the exact 3-intro + 12-practice real device run before review release", () => {
    const count = authoredLearningV2SessionCount();
    expect(count).toBe(56);
    for (const source of AUTHORED_EPISODE_01_SESSIONS) {
      const sessionOrdinal = source.requiredSessionOrdinal;
      const courseSessionId = `lesson-01:session:${String(sessionOrdinal).padStart(2, "0")}`;
      const children = buildSessionChildBodiesFromShard(
        buildSessionShardFromSource(source),
        "ru",
        courseSessionId,
      );
      // Candidate playback intentionally uses the same canonical device run as
      // the application, while released bundled material remains fail-closed
      // until independent review receipts exist.
      const run = createLearningV2CourseSessionDeviceRunV1({
          environment: LOCATOR.environment,
          targetLanguage: "en",
          studyTarget: "en",
          learnerSourceLocale: "ru",
          seasonId: LOCATOR.seasonId,
          releaseId: "candidate.lesson-01.v1",
          activeRootFingerprint: "a".repeat(64),
          activeHeadFingerprint: "b".repeat(64),
          lessonId: "lesson-01",
          lessonOrdinal: 1,
          courseSessionId,
          sessionOrdinal,
          packageFingerprint: "c".repeat(64),
          childSetFingerprint: "d".repeat(64),
          introChild: children.intro,
          learnerChild: children.learner,
          evaluatorCapsuleChild: children.evaluatorCapsule,
          auxiliaryChild: children.auxiliary,
        } as never);
      expect(getLearningV2CourseSessionDeviceRunSummaryV1(run)).toMatchObject({
        sessionOrdinal,
        introInteractionCount: 3,
        practiceInteractionCount: 12,
        interactionCount: 15,
      });
    }
  });
});
