import { EPISODE_03_SESSION_03_GOAL_V2, EPISODE_03_SESSION_03_INTRO_V2, EPISODE_03_SESSION_03_MODE_NATIVE_PRACTICE_V2, EPISODE_03_SESSION_03_PHRASES_V2, EPISODE_03_SESSION_03_SUMMARY_V2, EPISODE_03_SESSION_03_TITLE_V2, EPISODE_03_SESSION_03_VOCABULARY_V2 } from "./episode_03_session_03_content_v2";
import { LESSON3_SESSION_03_MODE_NATIVE_PLAN_ID_V1 } from "./lesson3_session_choreography_v1";
import type { SessionSource } from "./session_shard_from_source_v1";

export const EPISODE_03_SESSION_03_SOURCE: SessionSource = Object.freeze({
  packageId: "learning-v2-en-v1", targetLanguage: "en", episodeOrdinal: 3, requiredSessionOrdinal: 3,
  canDoOutcomeId: "obj-en-indefinite-article-consonant-sound-and-wh-contrast",
  generationInputFingerprint: "en-e03-s03-book-a-wh-contrast-v2", sessionKindOverride: "words_then_phrases", distractorAuthorship: "manual",
  title: EPISODE_03_SESSION_03_TITLE_V2, summary: EPISODE_03_SESSION_03_SUMMARY_V2, learningGoal: EPISODE_03_SESSION_03_GOAL_V2,
  introPages: EPISODE_03_SESSION_03_INTRO_V2, newVocabulary: EPISODE_03_SESSION_03_VOCABULARY_V2, phrases: EPISODE_03_SESSION_03_PHRASES_V2,
  modeNativePlanId: LESSON3_SESSION_03_MODE_NATIVE_PLAN_ID_V1, modeNativePractice: EPISODE_03_SESSION_03_MODE_NATIVE_PRACTICE_V2,
});
