import type { ArenaMatch, ArenaMatchReward } from './contract';

export type ArenaQuickResultPresentation = Readonly<{
  match: ArenaMatch;
  reward: ArenaMatchReward;
  viewerSeat: 'a' | 'b';
}>;

export type ArenaQuickResultState = Readonly<{
  matchId: string | null;
  viewerSeat: 'a' | 'b' | null;
  quickKnown: boolean;
  syncResolved: boolean;
  versionFloor: number;
  terminalSyncRequestedVersion: number | null;
  latestLive: ArenaMatch | null;
  presentation: ArenaQuickResultPresentation | null;
}>;

export type ArenaQuickResultEvent =
  | Readonly<{ type: 'live'; matchId: string; match: ArenaMatch | null }>
  | Readonly<{ type: 'terminal_sync_requested'; matchId: string; version: number }>
  | Readonly<{
    type: 'sync';
    matchId: string;
    version: number;
    state?: string;
    match?: ArenaMatch;
    viewerSeat?: 'a' | 'b';
    viewerReward?: ArenaMatchReward;
  }>;

export function arenaQuickResultInitialState(
  matchId: string | null,
  viewerSeat: 'a' | 'b' | null = null,
  quickKnown = false,
): ArenaQuickResultState {
  return {
    matchId,
    viewerSeat,
    quickKnown,
    syncResolved: false,
    versionFloor: 0,
    terminalSyncRequestedVersion: null,
    latestLive: null,
    presentation: null,
  };
}

function coherentPresentation(
  match: ArenaMatch | null | undefined,
  viewerSeat: 'a' | 'b' | null,
  privateReward?: ArenaMatchReward,
): ArenaQuickResultPresentation | null {
  if (!match || match.mode !== 'quick' || (!match.terminal && match.state !== 'settled' && match.state !== 'aborted')) {
    return null;
  }
  if (!viewerSeat) return null;
  const reward = privateReward ?? match.result?.rewards?.[viewerSeat];
  return reward ? { match, reward, viewerSeat } : null;
}

function terminal(match: ArenaMatch | null | undefined): boolean {
  return Boolean(match && (match.terminal || match.state === 'settled' || match.state === 'aborted'));
}

export function arenaQuickResultReduce(
  state: ArenaQuickResultState,
  event: ArenaQuickResultEvent,
): ArenaQuickResultState {
  if (!state.matchId || event.matchId !== state.matchId || state.presentation) return state;

  if (event.type === 'terminal_sync_requested') {
    return {
      ...state,
      terminalSyncRequestedVersion: Math.max(
        state.terminalSyncRequestedVersion ?? 0,
        event.version,
      ),
    };
  }

  if (event.type === 'live') {
    const incoming = event.match;
    const latestLive = incoming && (!state.latestLive || incoming.version >= state.latestLive.version)
      ? incoming
      : state.latestLive;
    const quickKnown = state.quickKnown || incoming?.mode === 'quick';
    return { ...state, latestLive, quickKnown };
  }

  const viewerSeat = event.viewerSeat ?? state.viewerSeat;
  const syncMatch = event.match;
  const versionFloor = Math.max(state.versionFloor, event.version, syncMatch?.version ?? 0);
  const terminalSync = terminal(syncMatch) || event.state === 'settled' || event.state === 'aborted';
  const terminalMatch = terminal(syncMatch)
    ? syncMatch
    : terminalSync && state.latestLive && state.latestLive.version >= versionFloor
      ? state.latestLive
      : null;
  const syncPresentation = terminalSync
    ? coherentPresentation(terminalMatch, viewerSeat, event.viewerReward)
    : null;
  if (syncPresentation) {
    return {
      ...state,
      viewerSeat,
      quickKnown: true,
      syncResolved: true,
      versionFloor,
      presentation: syncPresentation,
    };
  }
  return {
    ...state,
    viewerSeat,
    quickKnown: state.quickKnown || syncMatch?.mode === 'quick',
    syncResolved: true,
    versionFloor,
    presentation: null,
  };
}

/**
 * Returns the exact terminal public version that needs one caller-private sync.
 * Public listener data can wake the orchestrator but can never authorize XP
 * presentation by itself.
 */
export function arenaQuickResultTerminalSyncVersion(
  state: ArenaQuickResultState,
): number | null {
  if (!state.syncResolved || state.presentation) return null;
  const live = state.latestLive;
  if (!live || live.mode !== 'quick' || !terminal(live)) return null;
  if (live.version < state.versionFloor) return null;
  if ((state.terminalSyncRequestedVersion ?? 0) >= live.version) return null;
  return live.version;
}
