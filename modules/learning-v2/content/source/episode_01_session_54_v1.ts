import { EPISODE_01_SESSION_53_SOURCE } from './episode_01_session_53_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewriteForSession54 = <T,>(value: T): T => {
  const replacements: readonly (readonly [string, string])[] = [
    ['e01-s53', 'e01-s54'], ['full', 'familiar'], ['Full', 'Familiar'],
    ['packed', 'unfamiliar'], ['Packed', 'Unfamiliar'], ['loaded', 'unknown'], ['Loaded', 'Unknown'],
  ];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};

export const EPISODE_01_SESSION_54_SOURCE: SessionSource = Object.freeze(
  Object.assign(rewriteForSession54(clone(EPISODE_01_SESSION_53_SOURCE)) as any, {
    requiredSessionOrdinal: 54,
    modeNativePlanId: 'en-e01-s25-mode-native-full-form-choice-v2',
    generationInputFingerprint: 'full-b1-exact-listening-familiar-unfamiliar-unknown-e01-s54-v1',
  }),
);
