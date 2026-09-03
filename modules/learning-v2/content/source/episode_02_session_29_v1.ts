import { EPISODE_01_SESSION_29_SOURCE } from './episode_01_session_29_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const source = JSON.parse(JSON.stringify(EPISODE_01_SESSION_29_SOURCE)) as SessionSource & { episodeOrdinal: number; packageId: string; generationInputFingerprint: string; };
source.episodeOrdinal = 2;
source.packageId = source.packageId.replace('episode-01', 'episode-02');
source.generationInputFingerprint = 'full-b1-exact-diagnostic-repair-e02-s29-v1';
export const EPISODE_02_SESSION_29_SOURCE: SessionSource = Object.freeze(source);
