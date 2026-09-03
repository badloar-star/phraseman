import { EPISODE_01_SESSION_50_SOURCE } from './episode_01_session_50_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const rewriteForSession51 = <T,>(value: T): T => {
  const replacements: readonly (readonly [string, string])[] = [
    ['e01-s50', 'e01-s51'],
    ['expensive', 'heavy'],
    ['Expensive', 'Heavy'],
    ['costly', 'massive'],
    ['Costly', 'Massive'],
    ['pricey', 'weighty'],
    ['Pricey', 'Weighty'],
  ];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};

export const EPISODE_01_SESSION_51_SOURCE: SessionSource = Object.freeze(
  Object.assign(rewriteForSession51(clone(EPISODE_01_SESSION_50_SOURCE)) as any, {
    requiredSessionOrdinal: 51,
    generationInputFingerprint: 'full-b1-exact-diagnostic-heavy-e01-s51-v1',
  }),
);
