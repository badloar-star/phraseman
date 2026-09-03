/** Lesson 2 Session 37: exact diagnostic lonely-contrast packet. */
import { EPISODE_01_SESSION_37_SOURCE } from './episode_01_session_37_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const source = JSON.parse(JSON.stringify(EPISODE_01_SESSION_37_SOURCE)) as SessionSource & {
  episodeOrdinal: number;
  packageId: string;
  generationInputFingerprint: string;
};

source.episodeOrdinal = 2;
source.packageId = source.packageId.replace('episode-01', 'episode-02');
source.generationInputFingerprint = 'full-b1-exact-diagnostic-lonely-e02-s37-v1';

export const EPISODE_02_SESSION_37_SOURCE: SessionSource = Object.freeze(source);
