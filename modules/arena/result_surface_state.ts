import type { ArenaMatch } from './contract';

export type ArenaResultSurfaceKind =
  | 'neutral_pending'
  | 'quick_pending'
  | 'quick_ready'
  | 'standard';

function terminal(match: ArenaMatch | null): boolean {
  return Boolean(match && (match.terminal || match.state === 'settled' || match.state === 'aborted'));
}

/**
 * First-render routing for results.
 *
 * A route id is not evidence of a draw. Until a terminal match or the frozen
 * quick latch exists, the only honest surface is pending. This selector keeps
 * that ordering independent from React/listener timing.
 */
export function arenaResultSurfaceKind(input: Readonly<{
  matchId: string | null;
  match: ArenaMatch | null;
  quickKnown: boolean;
  quickReady: boolean;
}>): ArenaResultSurfaceKind {
  if (!input.matchId) return 'standard';
  if (input.quickReady) return 'quick_ready';
  if (input.quickKnown) return 'quick_pending';
  if (!terminal(input.match)) return 'neutral_pending';
  return input.match?.mode === 'quick' ? 'neutral_pending' : 'standard';
}
