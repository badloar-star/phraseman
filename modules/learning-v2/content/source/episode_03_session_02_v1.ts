import {
  EPISODE_03_SESSION_02_GOAL_V2,
  EPISODE_03_SESSION_02_INTRO_V2,
  EPISODE_03_SESSION_02_MODE_NATIVE_PRACTICE_V2,
  EPISODE_03_SESSION_02_PHRASES_V2,
  EPISODE_03_SESSION_02_SUMMARY_V2,
  EPISODE_03_SESSION_02_TITLE_V2,
  EPISODE_03_SESSION_02_VOCABULARY_V2,
} from "./episode_03_session_02_content_v2";
import { LESSON3_SESSION_02_MODE_NATIVE_PLAN_ID_V1 } from "./lesson3_session_choreography_v1";
import type { SessionSource } from "./session_shard_from_source_v1";

/** Exact Full B1 Lesson 3 / Session 2 packet: apple, vowel-sound `an`, and approved WH-question retrieval. */
export const EPISODE_03_SESSION_02_SOURCE: SessionSource = Object.freeze({
  packageId: "learning-v2-en-v1",
  targetLanguage: "en",
  episodeOrdinal: 3,
  requiredSessionOrdinal: 2,
  canDoOutcomeId: "obj-en-indefinite-article-vowel-sound-and-wh-retrieval",
  generationInputFingerprint: "en-e03-s02-apple-an-wh-review-v2",
  sessionKindOverride: "words_then_phrases",
  distractorAuthorship: "manual",
  title: EPISODE_03_SESSION_02_TITLE_V2,
  summary: EPISODE_03_SESSION_02_SUMMARY_V2,
  learningGoal: EPISODE_03_SESSION_02_GOAL_V2,
  introPages: EPISODE_03_SESSION_02_INTRO_V2,
  newVocabulary: EPISODE_03_SESSION_02_VOCABULARY_V2,
  phrases: EPISODE_03_SESSION_02_PHRASES_V2,
  modeNativePlanId: LESSON3_SESSION_02_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: EPISODE_03_SESSION_02_MODE_NATIVE_PRACTICE_V2,
});
