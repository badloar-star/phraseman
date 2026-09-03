import {
  EPISODE_02_SESSION_04_GOAL_V2,
  EPISODE_02_SESSION_04_INTRO_V2,
  EPISODE_02_SESSION_04_MODE_NATIVE_PRACTICE_V2,
  EPISODE_02_SESSION_04_PHRASES_V2,
  EPISODE_02_SESSION_04_SUMMARY_V2,
  EPISODE_02_SESSION_04_TITLE_V2,
  EPISODE_02_SESSION_04_VOCABULARY_V2,
} from "./episode_02_session_04_content_v2";
import { LESSON2_SESSION_04_MODE_NATIVE_PLAN_ID_V1 } from "./lesson2_session_choreography_v1";
import type { SessionSource } from "./session_shard_from_source_v1";

/** Dedicated exact source: no prior session learner-facing payload is inherited. */
export const EPISODE_02_SESSION_04_SOURCE: SessionSource = Object.freeze({
  packageId: "learning-v2-en-v1",
  targetLanguage: "en",
  episodeOrdinal: 2,
  requiredSessionOrdinal: 4,
  canDoOutcomeId: "obj-en-present-be-negation-guided-application",
  generationInputFingerprint: "en-e02-s04-negation-guided-application-v2",
  sessionKindOverride: "words_then_phrases",
  distractorAuthorship: "manual",
  title: EPISODE_02_SESSION_04_TITLE_V2,
  summary: EPISODE_02_SESSION_04_SUMMARY_V2,
  learningGoal: EPISODE_02_SESSION_04_GOAL_V2,
  introPages: EPISODE_02_SESSION_04_INTRO_V2,
  newVocabulary: EPISODE_02_SESSION_04_VOCABULARY_V2,
  phrases: EPISODE_02_SESSION_04_PHRASES_V2,
  modeNativePlanId: LESSON2_SESSION_04_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: EPISODE_02_SESSION_04_MODE_NATIVE_PRACTICE_V2,
});
