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
import {
  LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { materializeFactoryNativeLearningV2SessionV1 } from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import { bundledLearningV2CourseSessionMaterialV3 } from "../app/learning_v2_course_released_session_client_v3";
import { learningV2FactoryMissingAudioInteractionIdsV1 } from "../app/learning_v2_factory_production_audio_v1";
import {
  LEARNING_V2_RELEASED_SESSION_COUNT_V1,
  isLearningV2SessionReleasedV1,
} from "../app/learning_v2_session_availability_v1";

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

  test("an omitted audio interaction carries its pending word cards to the next retained interaction", () => {
    const raw = materializeFactoryNativeLearningV2SessionV1({
      lessonOrdinal: 1,
      sessionOrdinal: 12,
      interfaceLocale: "ru",
    });
    const filtered = materializeFactoryNativeLearningV2SessionV1({
      lessonOrdinal: 1,
      sessionOrdinal: 12,
      interfaceLocale: "ru",
      disabledInteractionIds: ["en:lesson-01:session-12:i08"],
    });
    expect(raw).not.toBeNull();
    expect(filtered).not.toBeNull();
    expect(raw!.wordEncounterQueuesByInteractionId["lesson-01:session:12:i08"]).toHaveLength(1);
    expect(filtered!.wordEncounterQueuesByInteractionId["lesson-01:session:12:i08"]).toBeUndefined();
    expect(filtered!.wordEncounterQueuesByInteractionId["lesson-01:session:12:i09"])
      .toEqual(raw!.wordEncounterQueuesByInteractionId["lesson-01:session:12:i08"]);
  });

  test.each([
    [6, ["lesson-01:session:06:i16", "lesson-01:session:06:i19"]],
    [7, ["lesson-01:session:07:i14", "lesson-01:session:07:i16"]],
    [8, ["lesson-01:session:08:i17:s02"]],
    [9, ["lesson-01:session:09:i14", "lesson-01:session:09:i18:s02", "lesson-01:session:09:i18:s04"]],
    [10, ["lesson-01:session:10:i12", "lesson-01:session:10:i18"]],
    [11, ["lesson-01:session:11:i17", "lesson-01:session:11:i18"]],
    [12, ["lesson-01:session:12:i08", "lesson-01:session:12:i16", "lesson-01:session:12:i20"]],
    [13, ["lesson-01:session:13:i18"]],
    [14, ["lesson-01:session:14:i10"]],
    [15, ["lesson-01:session:15:i15", "lesson-01:session:15:i17:s02"]],
  ] as const)("released lesson 1 session %i omits only source-bound incomplete audio interactions", (sessionOrdinal, omittedIds) => {
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
    expect(material).not.toBeNull();
    const interactionIds = material!.learnerChild.interactions.map((interaction) => interaction.interactionId);
    expect(interactionIds).not.toEqual(expect.arrayContaining(omittedIds));
    expect(learningV2FactoryMissingAudioInteractionIdsV1(material!.learnerChild)).toEqual([]);
    expect(material!.evaluatorCapsuleChild.entries.map((entry) => entry.interactionId))
      .not.toEqual(expect.arrayContaining(omittedIds));
    expect(material!.auxiliaryChild.entries.map((entry) => entry.interactionId))
      .not.toEqual(expect.arrayContaining(omittedIds));
  });

  test("the app exposes exactly sessions 1-15 and keeps session 16 hidden", () => {
    expect(LEARNING_V2_RELEASED_SESSION_COUNT_V1).toBe(15);
    expect(isLearningV2SessionReleasedV1(1, 1)).toBe(true);
    expect(isLearningV2SessionReleasedV1(1, 11)).toBe(true);
    expect(isLearningV2SessionReleasedV1(1, 12)).toBe(true);
    expect(isLearningV2SessionReleasedV1(1, 13)).toBe(true);
    expect(isLearningV2SessionReleasedV1(1, 14)).toBe(true);
    expect(isLearningV2SessionReleasedV1(1, 15)).toBe(true);
    expect(isLearningV2SessionReleasedV1(1, 16)).toBe(false);
  });
});
