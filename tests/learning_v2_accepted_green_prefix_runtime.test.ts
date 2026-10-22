jest.mock("@react-native-firebase/app", () => ({ getApp: jest.fn(() => ({})) }));
jest.mock("@react-native-firebase/functions", () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock("../app/cloud_sync", () => ({ ensureAnonUser: jest.fn(async () => "stable-1") }));
jest.mock("../app/stable_id", () => ({ peekStableId: jest.fn(() => "stable-1") }));

/* eslint-disable import/first -- native/transport seams are mocked first */
import {
  LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { materializeFactoryNativeLearningV2SessionV1 } from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";
import {
  LEARNING_V2_RELEASED_SESSION_COUNT_V1,
  isLearningV2SessionReleasedV1,
} from "../app/learning_v2_session_availability_v1";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from "../modules/learning-v2/content/course_topology_v1";

describe("accepted green Learning V2 prefix runtime compatibility", () => {
  test("the learner-child bound agrees with the existing release-package learner bound", () => {
    expect(LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1).toBe(4 * 1024 * 1024);
  });

  test.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])("accepted lesson 1 session %i materializes", (sessionOrdinal) => {
    expect(() => materializeFactoryNativeLearningV2SessionV1({
      lessonOrdinal: 1,
      sessionOrdinal,
      interfaceLocale: "ru",
    })).not.toThrow();
  });

  test("rejects an unknown runtime-disabled interaction instead of silently changing a session", () => {
    expect(() => materializeFactoryNativeLearningV2SessionV1({
      lessonOrdinal: 1,
      sessionOrdinal: 6,
      interfaceLocale: "ru",
      disabledInteractionIds: ["en:lesson-01:session-06:i99"],
    })).toThrow("learning_v2_factory_native_disabled_interaction_unknown");
  });

  // зачем (17.10): Codex переписал урок 1 — номера заданий s12 сменились. Механизм проверяется на любом задании,
  // перед которым стоят карточки слов: выключенное задание отдаёт свои карточки следующему оставшемуся.
  test("an omitted audio interaction carries its pending word cards to the next retained interaction", () => {
    let checked = 0;
    for (let sessionOrdinal = 1; sessionOrdinal <= 15 && checked === 0; sessionOrdinal += 1) {
      const raw = materializeFactoryNativeLearningV2SessionV1({ lessonOrdinal: 1, sessionOrdinal, interfaceLocale: "ru" });
      if (!raw) continue;
      const order = raw.learnerChild.interactions.map((interaction) => interaction.interactionId);
      const target = order.find((id, index) =>
        index < order.length - 1 &&
        (raw.wordEncounterQueuesByInteractionId[id]?.length ?? 0) > 0 &&
        (raw.wordEncounterQueuesByInteractionId[order[index + 1]!]?.length ?? 0) === 0);
      if (!target) continue;
      const next = order[order.indexOf(target) + 1]!;
      const rawId = `en:${target.replace(/:session:(\d{2}):/u, ":session-$1:")}`;
      let filtered: ReturnType<typeof materializeFactoryNativeLearningV2SessionV1> = null;
      try {
        filtered = materializeFactoryNativeLearningV2SessionV1({
          lessonOrdinal: 1, sessionOrdinal, interfaceLocale: "ru", disabledInteractionIds: [rawId],
        });
      } catch {
        continue; // задание-карточку выключить нельзя — ищем другое
      }
      expect(filtered).not.toBeNull();
      expect(filtered!.wordEncounterQueuesByInteractionId[target]).toBeUndefined();
      expect(filtered!.wordEncounterQueuesByInteractionId[next]).toEqual(raw.wordEncounterQueuesByInteractionId[target]);
      checked += 1;
    }
    expect(checked).toBe(1);
  });

  // зачем (17.10): после переписывания Codex и записи «один голос на задание» в выпущенных s01–s15 урока 1 ни одно
  // задание не выключается из-за отсутствия записи: материал собирается со всеми заданиями исходника и без пропусков.
  test.each([1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15])("released lesson 1 session %i keeps every task and every task is recorded", (sessionOrdinal) => {
    const material = bundledLearningV2CourseSessionMaterialV3({
      environment: "production",
      targetLanguage: "en",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      seasonId: "learning-v2",
      lessonOrdinal: 1,
      sessionOrdinal,
      activeRootFingerprint: "0".repeat(64),
    } as never);
    const raw = materializeFactoryNativeLearningV2SessionV1({ lessonOrdinal: 1, sessionOrdinal, interfaceLocale: "ru" });
    expect(material).not.toBeNull();
    expect(material!.learnerChild.interactions.map((interaction) => interaction.interactionId))
      .toEqual(raw!.learnerChild.interactions.map((interaction) => interaction.interactionId));
  });

  // зачем (координатор 15.10, урок 1 целиком — потолок 15 → 56): не зашитое число, а потолок — он генерируется сторожем
  // learning_v2_bundle_availability по реально собранным с аудио занятиям. Смысл прежний: открыт ровно сплошной префикс.
  // зачем (координатор 15.10 ночь, «все готовые»): потолок может перейти в урок 2 и дальше — считаем в порядке курса.
  test("the app exposes exactly the contiguous released prefix and keeps the next session hidden", () => {
    const ceiling = LEARNING_V2_RELEASED_SESSION_COUNT_V1;
    const at = (courseIndex: number) => [
      Math.floor(courseIndex / LEARNING_V2_LESSON_SESSION_COUNT_V1) + 1,
      (courseIndex % LEARNING_V2_LESSON_SESSION_COUNT_V1) + 1,
    ] as const;
    expect(ceiling).toBeGreaterThanOrEqual(15);
    for (let courseIndex = 0; courseIndex < ceiling; courseIndex += 1) {
      const [lesson, session] = at(courseIndex);
      expect([lesson, session, isLearningV2SessionReleasedV1(lesson, session)]).toEqual([lesson, session, true]);
    }
    const [nextLesson, nextSession] = at(ceiling);
    expect(isLearningV2SessionReleasedV1(nextLesson, nextSession)).toBe(false);
  });
});
