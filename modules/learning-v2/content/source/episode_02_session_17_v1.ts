/** Lesson 2 takes the approved prerequisite-safe `you / we / they + are` packet. */
import { EPISODE_01_SESSION_17_SOURCE } from './episode_01_session_17_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const source = JSON.parse(JSON.stringify(EPISODE_01_SESSION_17_SOURCE)) as SessionSource & {
  episodeOrdinal: number;
  packageId: string;
  generationInputFingerprint: string;
};
source.episodeOrdinal = 2;
source.packageId = source.packageId.replace('episode-01', 'episode-02');
source.generationInputFingerprint = 'full-b1-exact-you-we-they-are-e02-s17-v1';

export const EPISODE_02_SESSION_17_SOURCE: SessionSource = Object.freeze(source);
