// Word-first rewrite authorized by the continuous owner contract on 2026-08-24.
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import { EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2 } from './episode_01_session_03_content_v2';
import { EPISODE_01_SESSION_03_VOCABULARY_V1 } from './episode_01_session_03_vocabulary_v1';
import { EPISODE_01_SESSION_03_FULL_B1_PHRASES_V2 } from './episode_01_session_03_phrases_full_b1_v2';
import { EPISODE_01_SESSION_03_FULL_B1_INTRO_V2 } from './episode_01_session_03_intro_full_b1_v2';
import { EPISODE_01_SESSION_03_MODE_NATIVE_FULL_B1_V2 } from './episode_01_session_03_mode_native_full_b1_v2';
import { LESSON1_SESSION_03_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[2]!;

export const EPISODE_01_SESSION_03_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'owner-full-b1-e01-s03-v2',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  title: EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2.title,
  summary: EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2.summary,
  learningGoal: EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2.goal,
  reviewConstructIds: ['affirmative_self_statement'],
  introPages: EPISODE_01_SESSION_03_FULL_B1_INTRO_V2,
  newVocabulary: EPISODE_01_SESSION_03_VOCABULARY_V1,
  phrases: EPISODE_01_SESSION_03_FULL_B1_PHRASES_V2,
  modeNativePlanId: LESSON1_SESSION_03_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: EPISODE_01_SESSION_03_MODE_NATIVE_FULL_B1_V2,
});
