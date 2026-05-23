import type { LeagueState } from './league_engine';

type EmptyParticipantsInput = {
  localLeagueHydrated: boolean;
  participantCount: number;
};

let cachedLeagueStateSnapshot: LeagueState | null = null;

export function rememberLeagueStateSnapshot(state: LeagueState | null | undefined): LeagueState | null {
  cachedLeagueStateSnapshot = state ?? null;
  return cachedLeagueStateSnapshot;
}

export function clearCachedLeagueStateSnapshot(): void {
  cachedLeagueStateSnapshot = null;
}

export function getCachedLeagueStateSync(): LeagueState | null {
  return cachedLeagueStateSnapshot;
}

export function shouldShowLeagueEmptyParticipants(input: EmptyParticipantsInput): boolean {
  return input.localLeagueHydrated && input.participantCount <= 0;
}

export default function __RouteShim() { return null; }
