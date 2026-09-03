/** Dedicated Full B1 Session 14 lexical extension; legacy support is excluded. */
import { EPISODE_01_SESSION_13_SOURCE } from './episode_01_session_13_v1';
import { LESSON1_SESSION_14_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [
    ['e01-s13', 'e01-s14'], ['small', 'dirty'], ['Small', 'Dirty'], ['big', 'open'], ['Big', 'Open'], ['clean', 'closed'], ['Clean', 'Closed'],
    ['It is small', 'It is dirty'], ['It is big', 'It is open'], ['It is clean', 'It is closed'],
  ];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') { let result = item; for (const [from, to] of pairs) result = result.replaceAll(from, to); return result; }
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};
const authored = { ...replace(clone(EPISODE_01_SESSION_13_SOURCE)), requiredSessionOrdinal: 14, generationInputFingerprint: 'full-b1-exact-he-she-it-is-e01-s14-v1', modeNativePlanId: LESSON1_SESSION_14_MODE_NATIVE_PLAN_ID_V2 } as any;
export const EPISODE_01_SESSION_14_SOURCE: SessionSource = Object.freeze(authored);
