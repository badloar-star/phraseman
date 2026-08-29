// Word-first rewrite authorized by the continuous owner contract on 2026-08-24.
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_03_WORD_FIRST_GOAL,
  EPISODE_01_SESSION_03_WORD_FIRST_INTRO,
  EPISODE_01_SESSION_03_WORD_FIRST_SUMMARY,
  EPISODE_01_SESSION_03_WORD_FIRST_TITLE,
} from './episode_01_session_03_intro_word_first_v1';
import { EPISODE_01_SESSION_03_VOCABULARY_V1 } from './episode_01_session_03_vocabulary_v1';
import { EPISODE_01_SESSION_03_CONTRACTION_PHRASES } from './episode_01_session_03_phrases_word_first_v1';
import { EPISODE_01_SESSION_03_MODE_NATIVE_PRACTICE_V1 } from './episode_01_session_03_mode_native_v1';
import { LESSON1_SESSION_03_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[2]!;

export const EPISODE_01_SESSION_03_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'owner-mode-native-contraction-e01-s03-v1',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  title: EPISODE_01_SESSION_03_WORD_FIRST_TITLE,
  summary: EPISODE_01_SESSION_03_WORD_FIRST_SUMMARY,
  learningGoal: EPISODE_01_SESSION_03_WORD_FIRST_GOAL,
  introPages: EPISODE_01_SESSION_03_WORD_FIRST_INTRO,
  newVocabulary: EPISODE_01_SESSION_03_VOCABULARY_V1,
  phrases: EPISODE_01_SESSION_03_CONTRACTION_PHRASES,
  modeNativePlanId: LESSON1_SESSION_03_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: EPISODE_01_SESSION_03_MODE_NATIVE_PRACTICE_V1,
});
