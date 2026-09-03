/** Lesson 2 Session 34: exact guided contraction-extension packet. */
import { EPISODE_01_SESSION_34_SOURCE } from './episode_01_session_34_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const source = JSON.parse(JSON.stringify(EPISODE_01_SESSION_34_SOURCE)) as SessionSource & {
  episodeOrdinal: number;
  packageId: string;
  generationInputFingerprint: string;
};

source.episodeOrdinal = 2;
source.packageId = source.packageId.replace('episode-01', 'episode-02');
source.generationInputFingerprint = 'full-b1-exact-guided-contraction-e02-s34-v1';

export const EPISODE_02_SESSION_34_SOURCE: SessionSource = Object.freeze(source);
