// Checkpoint rewrite authorized by the continuous owner contract on 2026-08-24.
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_08_CHECKPOINT_GOAL,
  EPISODE_01_SESSION_08_CHECKPOINT_INTRO,
  EPISODE_01_SESSION_08_CHECKPOINT_SUMMARY,
  EPISODE_01_SESSION_08_CHECKPOINT_TITLE,
} from './episode_01_session_08_intro_checkpoint_v1';
import { EPISODE_01_SESSION_08_CHECKPOINT_PHRASES } from './episode_01_session_08_phrases_checkpoint_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[7]!;

export const EPISODE_01_SESSION_08_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'owner-checkpoint-rewrite-e01-s08-v1',
  sessionKindOverride: 'checkpoint',
  distractorAuthorship: 'manual',
  title: EPISODE_01_SESSION_08_CHECKPOINT_TITLE,
  summary: EPISODE_01_SESSION_08_CHECKPOINT_SUMMARY,
  learningGoal: EPISODE_01_SESSION_08_CHECKPOINT_GOAL,
  introPages: EPISODE_01_SESSION_08_CHECKPOINT_INTRO,
  phrases: EPISODE_01_SESSION_08_CHECKPOINT_PHRASES,
});
