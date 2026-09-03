/** Lesson 2 Session 44: exact guided curious-application packet. */
import { EPISODE_01_SESSION_44_SOURCE } from './episode_01_session_44_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const source = JSON.parse(JSON.stringify(EPISODE_01_SESSION_44_SOURCE)) as SessionSource & {
  episodeOrdinal: number;
  packageId: string;
  generationInputFingerprint: string;
};

source.episodeOrdinal = 2;
source.packageId = source.packageId.replace('episode-01', 'episode-02');
source.generationInputFingerprint = 'full-b1-exact-guided-curious-e02-s44-v1';

export const EPISODE_02_SESSION_44_SOURCE: SessionSource = Object.freeze(source);
