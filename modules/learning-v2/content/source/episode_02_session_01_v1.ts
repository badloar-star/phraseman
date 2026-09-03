import {
  EPISODE_02_SESSION_01_GOAL_V2,
  EPISODE_02_SESSION_01_INTRO_V2,
  EPISODE_02_SESSION_01_MODE_NATIVE_PRACTICE_V2,
  EPISODE_02_SESSION_01_PHRASES_V2,
  EPISODE_02_SESSION_01_SUMMARY_V2,
  EPISODE_02_SESSION_01_TITLE_V2,
  EPISODE_02_SESSION_01_VOCABULARY_V2,
} from "./episode_02_session_01_content_v2";
import { LESSON2_SESSION_01_MODE_NATIVE_PLAN_ID_V1 } from "./lesson2_session_choreography_v1";
import type { SessionSource } from "./session_shard_from_source_v1";

/** Dedicated source: no Episode 1 or legacy learner-facing payload is inherited. */
export const EPISODE_02_SESSION_01_SOURCE: SessionSource = Object.freeze({
  packageId: "learning-v2-en-v1",
  targetLanguage: "en",
  episodeOrdinal: 2,
  requiredSessionOrdinal: 1,
  canDoOutcomeId: "obj-en-present-be-negation",
  generationInputFingerprint: "en-e02-s01-present-be-negation-v2",
  sessionKindOverride: "words_then_phrases",
  distractorAuthorship: "manual",
  title: EPISODE_02_SESSION_01_TITLE_V2,
  summary: EPISODE_02_SESSION_01_SUMMARY_V2,
  learningGoal: EPISODE_02_SESSION_01_GOAL_V2,
  introPages: EPISODE_02_SESSION_01_INTRO_V2,
  newVocabulary: EPISODE_02_SESSION_01_VOCABULARY_V2,
  phrases: EPISODE_02_SESSION_01_PHRASES_V2,
  modeNativePlanId: LESSON2_SESSION_01_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: EPISODE_02_SESSION_01_MODE_NATIVE_PRACTICE_V2,
});
