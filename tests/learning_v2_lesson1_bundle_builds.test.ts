// зачем (инцидент 04.10, 🔴): «Learning V2, урок 1, занятие 1 не открывается» — тап, «Начать», окно закрывается; в логе
// learning_v2_factory_session_unavailable. Причина: материал занятия из бандла бракуется на шаге audio_child, когда в таблице озвучки
// (learning_v2_factory_production_audio_entries_v1.generated.ts) нет записи для реплики текущего контента — например после перегенерации
// текстов без перегенерации озвучки. Ленивая загрузка таблицы ни при чём (она грузится). Ни один тест этого не ловил: сторож «собирается
// ли занятие из бандла» держим здесь. Красный тест = контент и озвучка разошлись; список пропавших реплик печатает [V2-BUNDLED].
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
import { FACTORY_NATIVE_MANIFEST_V1 } from "../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated";

// зачем (релиз-гейт, решение координатора 04.10): сборка в стор не должна пройти, если хоть у одного встроенного занятия (урок 1–N из манифеста
// фабрики) нет озвучки для какой-либо реплики. Поэтому проверяем ВСЕ строки манифеста, а не только урок 1; запускает scripts/learning_v2_audio_coverage_gate.mjs
// (release:precheck и eas-build-post-install).
const locatorFor = (lessonOrdinal: number, sessionOrdinal: number) => ({
  environment: "production" as const,
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "learning-v2",
  lessonOrdinal,
  sessionOrdinal,
});

describe("every bundled factory session builds from the bundle (no network)", () => {
  test("the manifest is not empty and lesson 1 sessions 1-3 are in it", () => {
    expect(FACTORY_NATIVE_MANIFEST_V1.length).toBeGreaterThanOrEqual(3);
    for (const sessionOrdinal of [1, 2, 3]) {
      expect(FACTORY_NATIVE_MANIFEST_V1.some((row) => row.lessonOrdinal === 1 && row.sessionOrdinal === sessionOrdinal)).toBe(true);
    }
  });

  test.each(FACTORY_NATIVE_MANIFEST_V1.map((row) => [row.lessonOrdinal, row.sessionOrdinal] as const))(
    "lesson %i session %i (en/ru) has complete bundled audio and builds",
    (lessonOrdinal, sessionOrdinal) => {
      const missing: string[] = [];
      const spy = jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
        const line = String(args[0]);
        if (line.includes("[V2-BUNDLED] audio_entry_missing")) missing.push(line.replace("[V2-BUNDLED] audio_entry_missing ", ""));
      });
      try {
        const material = bundledLearningV2CourseSessionMaterialV3(locatorFor(lessonOrdinal, sessionOrdinal) as never);
        expect({ built: material !== null, firstMissingAudio: missing.slice(0, 5) }).toEqual({ built: true, firstMissingAudio: [] });
      } finally {
        spy.mockRestore();
      }
    },
  );
});
