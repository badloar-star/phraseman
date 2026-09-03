import { EPISODE_03_SESSION_12_GOAL_V2, EPISODE_03_SESSION_12_INTRO_V2, EPISODE_03_SESSION_12_MODE_NATIVE_PRACTICE_V2, EPISODE_03_SESSION_12_PHRASES_V2, EPISODE_03_SESSION_12_SUMMARY_V2, EPISODE_03_SESSION_12_TITLE_V2, EPISODE_03_SESSION_12_VOCABULARY_V2 } from "./episode_03_session_12_content_v2";
import { LESSON3_SESSION_12_MODE_NATIVE_PLAN_ID_V1 } from "./lesson3_session_choreography_v1";
import type { SessionSource } from "./session_shard_from_source_v1";

export const EPISODE_03_SESSION_12_SOURCE: SessionSource = Object.freeze({
  packageId: "learning-v2-en-v1", targetLanguage: "en", episodeOrdinal: 3, requiredSessionOrdinal: 12,
  canDoOutcomeId: "obj-en-definite-article-table-guided-application", generationInputFingerprint: "en-e03-s12-table-the-guided-v2",
  sessionKindOverride: "words_then_phrases", distractorAuthorship: "manual", title: EPISODE_03_SESSION_12_TITLE_V2,
  summary: EPISODE_03_SESSION_12_SUMMARY_V2, learningGoal: EPISODE_03_SESSION_12_GOAL_V2, introPages: EPISODE_03_SESSION_12_INTRO_V2,
  newVocabulary: EPISODE_03_SESSION_12_VOCABULARY_V2, phrases: EPISODE_03_SESSION_12_PHRASES_V2,
  modeNativePlanId: LESSON3_SESSION_12_MODE_NATIVE_PLAN_ID_V1, modeNativePractice: EPISODE_03_SESSION_12_MODE_NATIVE_PRACTICE_V2,
});
