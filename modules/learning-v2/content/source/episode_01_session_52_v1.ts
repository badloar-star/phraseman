import { EPISODE_01_SESSION_51_SOURCE } from './episode_01_session_51_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const rewriteForSession52 = <T,>(value: T): T => {
  const replacements: readonly (readonly [string, string])[] = [
    ['e01-s51', 'e01-s52'],
    ['heavy', 'light'],
    ['Heavy', 'Light'],
    ['massive', 'airy'],
    ['Massive', 'Airy'],
    ['weighty', 'nimble'],
    ['Weighty', 'Nimble'],
  ];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};

export const EPISODE_01_SESSION_52_SOURCE: SessionSource = Object.freeze(
  Object.assign(rewriteForSession52(clone(EPISODE_01_SESSION_51_SOURCE)) as any, {
    requiredSessionOrdinal: 52,
    generationInputFingerprint: 'full-b1-exact-guided-light-e01-s52-v1',
  }),
);
