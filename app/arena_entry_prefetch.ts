import { createArenaEntryPrefetch } from '../modules/arena/entry_prefetch';
import {
  arenaV2MatchAccept,
  arenaV2MatchPlan,
  rememberArenaViewerSeat,
} from './arena_client';

const arenaEntryPrefetch = createArenaEntryPrefetch({
  accept: arenaV2MatchAccept,
  loadPlan: arenaV2MatchPlan,
  rememberViewerSeat: rememberArenaViewerSeat,
  nowMs: () => Date.now(),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

export const arenaEntryPrefetchStart = arenaEntryPrefetch.start;
export const arenaEntryPrefetchPeek = arenaEntryPrefetch.peek;
