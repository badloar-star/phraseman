import { EPISODE_02_SESSION_05_SOURCE } from './episode_02_session_05_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewrite = <T,>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [
    ['e02-s05', 'e02-s06'], ['real', 'fake'], ['Real', 'Fake'],
    ['cold', 'calm'], ['Cold', 'Calm'], ['hot', 'nervous'], ['Hot', 'Nervous'],
  ];
  const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item;
  return visit(value) as T;
};
const source = rewrite(clone(EPISODE_02_SESSION_05_SOURCE)) as SessionSource & { newVocabulary: readonly any[]; retrievalVocabulary?: readonly any[]; requiredSessionOrdinal: number; generationInputFingerprint: string };
source.requiredSessionOrdinal = 6;
source.generationInputFingerprint = 'full-b1-exact-listening-fake-e02-s06-v1';
export const EPISODE_02_SESSION_06_SOURCE: SessionSource = Object.freeze(source);
