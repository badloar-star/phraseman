import { EPISODE_01_SESSION_48_SOURCE } from './episode_01_session_48_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const source = JSON.parse(JSON.stringify(EPISODE_01_SESSION_48_SOURCE)) as SessionSource & {
  requiredSessionOrdinal: number;
  generationInputFingerprint: string;
  newVocabulary: unknown[];
  newVocabularyExceptionReason: string;
};

source.requiredSessionOrdinal = 56;
source.generationInputFingerprint = 'full-b1-exact-checkpoint-e01-s56-v1';
source.newVocabulary = [];
source.newVocabularyExceptionReason = 'checkpoint_retrieval_only';

export const EPISODE_01_SESSION_56_SOURCE: SessionSource = Object.freeze(source);
