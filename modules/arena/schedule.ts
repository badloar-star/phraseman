import type { ArenaMatch } from './contract';

export type ArenaClockPhase =
  | { kind: 'waiting' }
  | { kind: 'countdown'; startsAtMs: number; remainingMs: number }
  | { kind: 'question'; taskIndex: number; remainingMs: number }
  | { kind: 'reveal'; taskIndex: number; remainingMs: number }
  | { kind: 'complete' };

export function arenaClockPhase(match: ArenaMatch, nowMs: number): ArenaClockPhase {
  if (match.terminal || match.state === 'settled' || match.state === 'aborted') return { kind: 'complete' };
  if (match.state === 'countdown') {
    return {
      kind: 'countdown',
      startsAtMs: match.stateDeadlineAtMs,
      remainingMs: Math.max(0, match.stateDeadlineAtMs - nowMs),
    };
  }
  if (match.state === 'task_active') {
    return { kind: 'question', taskIndex: match.currentTaskIndex, remainingMs: Math.max(0, match.stateDeadlineAtMs - nowMs) };
  }
  if (match.state === 'task_reveal') {
    return { kind: 'reveal', taskIndex: match.currentTaskIndex, remainingMs: Math.max(0, match.stateDeadlineAtMs - nowMs) };
  }
  return { kind: 'waiting' };
}
