/** Lesson 2 Session 39: exact spoken brave-production packet. */
import { EPISODE_01_SESSION_39_SOURCE } from './episode_01_session_39_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const source = JSON.parse(JSON.stringify(EPISODE_01_SESSION_39_SOURCE)) as SessionSource & {
  episodeOrdinal: number;
  packageId: string;
  generationInputFingerprint: string;
};

source.episodeOrdinal = 2;
source.packageId = source.packageId.replace('episode-01', 'episode-02');
source.generationInputFingerprint = 'full-b1-exact-spoken-brave-e02-s39-v1';

export const EPISODE_02_SESSION_39_SOURCE: SessionSource = Object.freeze(source);
