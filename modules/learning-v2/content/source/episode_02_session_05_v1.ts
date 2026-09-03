import { EPISODE_02_SESSION_04_SOURCE } from './episode_02_session_04_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewrite = <T,>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [
    ['e02-s04', 'e02-s05'], ['visible', 'real'], ['Visible', 'Real'],
    ['hidden', 'cold'], ['Hidden', 'Cold'], ['clear', 'hot'], ['Clear', 'Hot'],
  ];
  const visit = (item: unknown): unknown => typeof item === 'string'
    ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item)
    : Array.isArray(item) ? item.map(visit)
    : item && typeof item === 'object'
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]))
      : item;
  return visit(value) as T;
};

const source = rewrite(clone(EPISODE_02_SESSION_04_SOURCE)) as SessionSource & { newVocabulary: readonly any[]; retrievalVocabulary?: readonly any[]; requiredSessionOrdinal: number; generationInputFingerprint: string };
source.requiredSessionOrdinal = 5;
source.generationInputFingerprint = 'full-b1-exact-diagnostic-real-e02-s05-v1';
source.retrievalVocabulary = source.newVocabulary.slice(1);
source.newVocabulary = source.newVocabulary.slice(0, 1);

export const EPISODE_02_SESSION_05_SOURCE: SessionSource = Object.freeze(source);
