import type { ArenaExpansionCopyKey } from './expansion_copy';
import type { ArenaLabRecoveryItem } from './expansion_contract';
import type { ArenaTaskMode } from './contract';

export function arenaModeCopyKey(mode: ArenaTaskMode): ArenaExpansionCopyKey {
  if (mode === 'guess_phrase') return 'modeGuess';
  if (mode === 'fill_gap') return 'modeGap';
  if (mode === 'find_oddity') return 'modeOddity';
  if (mode === 'translate_build') return 'modeTranslate';
  return 'modeSpeed';
}

export function visibleArenaRecoveryItems(items: readonly ArenaLabRecoveryItem[]): readonly ArenaLabRecoveryItem[] {
  return items.slice(0, 3);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
}

export function evaluateArenaLabRecovery(expected: unknown, answer: unknown): boolean {
  return JSON.stringify(canonical(expected)) === JSON.stringify(canonical(answer));
}

export function evaluateArenaLabSpeedAttempt(expected: unknown, pairIndex: number, selectedIndex: number): boolean {
  if (!expected || typeof expected !== 'object') return false;
  const pairs = (expected as { pairs?: unknown }).pairs;
  if (!Array.isArray(pairs)) return false;
  if (typeof pairs[pairIndex] === 'number') return pairs[pairIndex] === selectedIndex;
  return pairs.some((pair) => pair && typeof pair === 'object'
    && (pair as { pairIndex?: unknown }).pairIndex === pairIndex
    && (pair as { selectedIndex?: unknown }).selectedIndex === selectedIndex);
}

export function arenaLabRecoveryPairCount(expected: unknown): number {
  if (!expected || typeof expected !== 'object') return 0;
  const pairs = (expected as { pairs?: unknown }).pairs;
  return Array.isArray(pairs) ? pairs.length : 0;
}
