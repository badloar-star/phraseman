import type { PhraseErrorTraps } from '../types/feedback';
import { TRAPS_1_8 } from './error_traps_1_8';
import { TRAPS_9_16 } from './error_traps_9_16';
import { TRAPS_17_24 } from './error_traps_17_24';
import { TRAPS_25_32 } from './error_traps_25_32';

type TrapsLoader = () => Readonly<Record<number, readonly PhraseErrorTraps[]>>;

const RANGE_LOADERS: readonly { min: number; max: number; load: TrapsLoader }[] = [
  { min: 1,  max: 8,  load: () => TRAPS_1_8 },
  { min: 9,  max: 16, load: () => TRAPS_9_16 },
  { min: 17, max: 24, load: () => TRAPS_17_24 },
  { min: 25, max: 32, load: () => TRAPS_25_32 },
];

const cache = new Map<number, Readonly<Record<number, readonly PhraseErrorTraps[]>>>();

export function loadTrapsForLesson(lessonId: number): readonly PhraseErrorTraps[] | undefined {
  const range = RANGE_LOADERS.find(r => lessonId >= r.min && lessonId <= r.max);
  if (!range) return undefined;
  if (!cache.has(range.min)) cache.set(range.min, range.load());
  return cache.get(range.min)![lessonId];
}

export function getErrorTrapsByIndex(lessonId: number, phraseIndex: number): PhraseErrorTraps | undefined {
  return loadTrapsForLesson(lessonId)?.find(p => p.phraseIndex === phraseIndex);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
