import { EPISODE_01_SESSION_54_SOURCE } from './episode_01_session_54_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewriteForSession55 = <T,>(value: T): T => {
  const replacements: readonly (readonly [string, string])[] = [
    ['e01-s54', 'e01-s55'], ['familiar', 'responsible'], ['Familiar', 'Responsible'],
    ['unfamiliar', 'independent'], ['Unfamiliar', 'Independent'], ['unknown', 'dependent'], ['Unknown', 'Dependent'],
  ];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};

export const EPISODE_01_SESSION_55_SOURCE: SessionSource = Object.freeze(
  Object.assign(rewriteForSession55(clone(EPISODE_01_SESSION_54_SOURCE)) as any, {
    requiredSessionOrdinal: 55,
    modeNativePlanId: 'en-e01-s25-mode-native-full-form-choice-v2',
    generationInputFingerprint: 'full-b1-exact-spoken-responsible-independent-dependent-e01-s55-v1',
  }),
);
