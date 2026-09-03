import { EPISODE_01_SESSION_52_SOURCE } from './episode_01_session_52_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewriteForSession53 = <T,>(value: T): T => {
  const replacements: readonly (readonly [string, string])[] = [
    ['e01-s52', 'e01-s53'], ['light', 'full'], ['Light', 'Full'],
    ['airy', 'packed'], ['Airy', 'Packed'], ['nimble', 'loaded'], ['Nimble', 'Loaded'],
  ];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};

export const EPISODE_01_SESSION_53_SOURCE: SessionSource = Object.freeze(
  Object.assign(rewriteForSession53(clone(EPISODE_01_SESSION_52_SOURCE)) as any, {
    requiredSessionOrdinal: 53,
    generationInputFingerprint: 'full-b1-exact-repair-full-e01-s53-v1',
  }),
);
