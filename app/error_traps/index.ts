import type { PhraseErrorTraps } from '../types/feedback';

type TrapsLoader = () => Readonly<Record<number, readonly PhraseErrorTraps[]>>;

const RANGE_LOADERS: ReadonlyArray<{ min: number; max: number; load: TrapsLoader }> = [
  { min: 1,  max: 8,  load: () => require('./error_traps_1_8').TRAPS_1_8 },
  { min: 9,  max: 16, load: () => require('./error_traps_9_16').TRAPS_9_16 },
  { min: 17, max: 24, load: () => require('./error_traps_17_24').TRAPS_17_24 },
  { min: 25, max: 32, load: () => require('./error_traps_25_32').TRAPS_25_32 },
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
