import type { LearningV2ModeNativePayloadV1 } from "../../contracts/mode_native_payload_v1";
import type { Lesson1ChoreographyStepV1 } from "./lesson1_session_choreography_v1";

export const LESSON2_SESSION_01_MODE_NATIVE_PLAN_ID_V1 =
  "lesson2-session01-full-b1-exact-mode-native-v1" as const;
export const LESSON2_SESSION_02_MODE_NATIVE_PLAN_ID_V1 =
  "lesson2-session02-full-b1-exact-mode-native-v1" as const;
export const LESSON2_SESSION_03_MODE_NATIVE_PLAN_ID_V1 =
  "lesson2-session03-full-b1-exact-mode-native-v1" as const;
export const LESSON2_SESSION_04_MODE_NATIVE_PLAN_ID_V1 =
  "lesson2-session04-full-b1-exact-mode-native-v1" as const;

/** Exact approved Full B1 family order for Lesson 2 Session 1. */
export const LESSON2_SESSION_01_MODE_NATIVE_FAMILIES_V1 = Object.freeze([
  "phrase_builder",
  "listen_choose",
  "context_gap_grammar",
  "speed_match",
  "listen_build_dictation",
  "phrase_builder",
  "scripted_repeat_compare",
  "context_gap_grammar",
  "listen_choose",
  "speed_match",
  "listen_build_dictation",
  "phrase_builder",
  "scripted_repeat_compare",
  "context_gap_grammar",
  "listen_choose",
  "speed_match",
  "scripted_repeat_compare",
] as const satisfies readonly LearningV2ModeNativePayloadV1["family"][]);

/** Exact approved Full B1 family order for Lesson 2 Session 2. */
export const LESSON2_SESSION_02_MODE_NATIVE_FAMILIES_V1 =
  LESSON2_SESSION_01_MODE_NATIVE_FAMILIES_V1;


/** Exact approved Full B1 family order for Lesson 2 Session 4. */
export const LESSON2_SESSION_04_MODE_NATIVE_FAMILIES_V1 =
  LESSON2_SESSION_01_MODE_NATIVE_FAMILIES_V1;

const LESSON2_MODE_NATIVE_PLAN_IDS_V1 = new Set<string>([
  LESSON2_SESSION_01_MODE_NATIVE_PLAN_ID_V1,
  LESSON2_SESSION_02_MODE_NATIVE_PLAN_ID_V1,
  LESSON2_SESSION_03_MODE_NATIVE_PLAN_ID_V1,
  LESSON2_SESSION_04_MODE_NATIVE_PLAN_ID_V1,
]);

export function isLesson2ModeNativePlanIdV1(value: string | undefined): boolean {
  return value !== undefined && LESSON2_MODE_NATIVE_PLAN_IDS_V1.has(value);
}

/** Independent exact choreography contract shared by authored Lesson 2 sessions. */
export function lesson2ModeNativeStepsV1(): readonly Lesson1ChoreographyStepV1[] {
  return Object.freeze([
    { family: "phrase_builder", purpose: "supported_practice", targetKind: "vocabulary", sourceVocabularyIndex: 0, learningStage: "recognize" },
    { family: "listen_choose", purpose: "supported_practice", targetKind: "vocabulary", sourceVocabularyIndex: 1, learningStage: "recognize" },
    { family: "context_gap_grammar", purpose: "supported_practice", targetKind: "vocabulary", sourceVocabularyIndex: 2, learningStage: "recognize" },
    { family: "speed_match", purpose: "supported_practice", targetKind: "vocabulary_grid", sourceVocabularyIndices: [], learningStage: "retrieve_meaning" },
    { family: "listen_build_dictation", purpose: "guided_practice", targetKind: "vocabulary", sourceVocabularyIndex: 0, learningStage: "retrieve_meaning" },
    { family: "phrase_builder", purpose: "guided_practice", targetKind: "vocabulary", sourceVocabularyIndex: 1, learningStage: "retrieve_meaning" },
    { family: "scripted_repeat_compare", purpose: "guided_practice", targetKind: "vocabulary", sourceVocabularyIndex: 2, learningStage: "retrieve_meaning" },
    { family: "context_gap_grammar", purpose: "retrieval_practice", targetKind: "vocabulary", sourceVocabularyIndex: 1, learningStage: "build_form" },
    { family: "listen_choose", purpose: "retrieval_practice", targetKind: "vocabulary", sourceVocabularyIndex: 0, learningStage: "build_form" },
    { family: "speed_match", purpose: "retrieval_practice", targetKind: "vocabulary_grid", sourceVocabularyIndices: [0, 1, 2], learningStage: "retrieve_meaning" },
    { family: "listen_build_dictation", purpose: "retrieval_practice", targetKind: "vocabulary", sourceVocabularyIndex: 2, learningStage: "build_form" },
    { family: "phrase_builder", purpose: "near_transfer", targetKind: "phrase", sourcePhraseIndex: 0, learningStage: "apply_in_phrase" },
    { family: "scripted_repeat_compare", purpose: "near_transfer", targetKind: "phrase", sourcePhraseIndex: 1, learningStage: "apply_in_phrase" },
    { family: "context_gap_grammar", purpose: "near_transfer", targetKind: "phrase", sourcePhraseIndex: 2, learningStage: "apply_in_phrase" },
    { family: "listen_choose", purpose: "near_transfer", targetKind: "phrase", sourcePhraseIndex: 0, learningStage: "apply_in_phrase" },
    { family: "speed_match", purpose: "independent_check", targetKind: "vocabulary_grid", sourceVocabularyIndices: [0, 1, 2], learningStage: "retrieve_meaning" },
    { family: "scripted_repeat_compare", purpose: "independent_check", targetKind: "phrase", sourcePhraseIndex: 4, learningStage: "speak_with_model" },
  ]);
}

/** Exact approved Full B1 family order for Lesson 2 Session 3. */
export const LESSON2_SESSION_03_MODE_NATIVE_FAMILIES_V1 =
  LESSON2_SESSION_01_MODE_NATIVE_FAMILIES_V1;
