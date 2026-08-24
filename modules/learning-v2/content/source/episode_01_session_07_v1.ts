// Voice rewrite authorized by the continuous owner contract on 2026-08-24.
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_07_VOICE_GOAL,
  EPISODE_01_SESSION_07_VOICE_INTRO,
  EPISODE_01_SESSION_07_VOICE_SUMMARY,
  EPISODE_01_SESSION_07_VOICE_TITLE,
} from './episode_01_session_07_intro_voice_v1';
import { EPISODE_01_SESSION_07_VOICE_PHRASES } from './episode_01_session_07_phrases_voice_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[6]!;

export const EPISODE_01_SESSION_07_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'owner-voice-rewrite-e01-s07-v1',
  sessionKindOverride: 'voice',
  distractorAuthorship: 'manual',
  title: EPISODE_01_SESSION_07_VOICE_TITLE,
  summary: EPISODE_01_SESSION_07_VOICE_SUMMARY,
  learningGoal: EPISODE_01_SESSION_07_VOICE_GOAL,
  introPages: EPISODE_01_SESSION_07_VOICE_INTRO,
  phrases: EPISODE_01_SESSION_07_VOICE_PHRASES,
});
