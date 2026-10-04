// зачем (инцидент 04.10, 🔴): «Learning V2, урок 1, занятие 1 не открывается» — тап, «Начать», окно закрывается; в логе
// learning_v2_factory_session_unavailable. Причина: материал занятия из бандла бракуется на шаге audio_child, когда в таблице озвучки
// (learning_v2_factory_production_audio_entries_v1.generated.ts) нет записи для реплики текущего контента — например после перегенерации
// текстов без перегенерации озвучки. Ленивая загрузка таблицы ни при чём (она грузится). Ни один тест этого не ловил: сторож «собирается
// ли занятие 1 из бандла» держим здесь. Красный тест = контент и озвучка разошлись; список пропавших реплик печатает [V2-BUNDLED].
jest.mock("@react-native-firebase/app", () => ({ getApp: jest.fn(() => ({})) }));
jest.mock("@react-native-firebase/functions", () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock("../app/cloud_sync", () => ({ ensureAnonUser: jest.fn(async () => "stable-1") }));
jest.mock("../app/stable_id", () => ({ peekStableId: jest.fn(() => "stable-1") }));
jest.mock("../app/learning_v2_course_session_audio_preload_v1", () => ({
  preloadLearningV2CourseSessionAudioV1: jest.fn(),
  isLearningV2CourseSessionAudioPreloadHandleV1: jest.fn(() => true),
  getLearningV2CourseSessionAudioPreloadSummaryV1: jest.fn(),
}));

/* eslint-disable import/first -- native/transport seams are mocked first */
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";

const locatorFor = (sessionOrdinal: number) => ({
  environment: "production" as const,
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  lessonOrdinal: 1,
  sessionOrdinal,
});

describe("lesson 1 sessions build from the bundle (no network)", () => {
  test.each([1, 2, 3])("lesson 1 session %i (en/ru) has complete bundled audio and builds", (sessionOrdinal) => {
    const missing: string[] = [];
    const spy = jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
      const line = String(args[0]);
      if (line.includes("[V2-BUNDLED] audio_entry_missing")) missing.push(line.replace("[V2-BUNDLED] audio_entry_missing ", ""));
    });
    try {
      const material = bundledLearningV2CourseSessionMaterialV3(locatorFor(sessionOrdinal) as never);
      expect({ built: material !== null, firstMissingAudio: missing.slice(0, 5) }).toEqual({ built: true, firstMissingAudio: [] });
    } finally {
      spy.mockRestore();
    }
  });
});
