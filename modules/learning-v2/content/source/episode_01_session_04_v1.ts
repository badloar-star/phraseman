// Word-first rewrite authorized by the continuous owner contract on 2026-08-24.
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_04_EXACT_GOAL_V2,
  EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2,
  EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2,
  EPISODE_01_SESSION_04_EXACT_SUMMARY_V2,
  EPISODE_01_SESSION_04_EXACT_TITLE_V2,
  EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2,
} from './episode_01_session_04_exact_v2';
import { LESSON1_SESSION_04_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[3]!;

export const EPISODE_01_SESSION_04_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'full-b1-exact-i-am-states-e01-s04-v2',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  reviewConstructIds: ['affirmative_self_statement'],
  title: EPISODE_01_SESSION_04_EXACT_TITLE_V2,
  summary: EPISODE_01_SESSION_04_EXACT_SUMMARY_V2,
  learningGoal: EPISODE_01_SESSION_04_EXACT_GOAL_V2,
  introPages: EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  newVocabulary: EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2,
  phrases: EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2,
  modeNativePlanId: LESSON1_SESSION_04_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2,
});
