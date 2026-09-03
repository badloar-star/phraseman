/** Dedicated Full B1 Session 15 lexical extension; no legacy support wrapper. */
import { EPISODE_01_SESSION_14_SOURCE } from './episode_01_session_14_v1';
import { LESSON1_SESSION_15_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [['e01-s14','e01-s15'],['dirty','easy'],['Dirty','Easy'],['open','difficult'],['Open','Difficult'],['closed','important'],['Closed','Important'],['It is dirty','It is easy'],['It is open','It is difficult'],['It is closed','It is important']];
  const visit = (item: unknown): unknown => { if (typeof item === 'string') { let text = item; for (const [from, to] of pairs) text = text.replaceAll(from, to); return text; } if (Array.isArray(item)) return item.map(visit); if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])); return item; };
  return visit(value) as T;
};
const authored = { ...replace(clone(EPISODE_01_SESSION_14_SOURCE)), requiredSessionOrdinal: 15, generationInputFingerprint: 'full-b1-exact-he-she-it-is-e01-s15-v1', modeNativePlanId: LESSON1_SESSION_15_MODE_NATIVE_PLAN_ID_V2 } as any;
export const EPISODE_01_SESSION_15_SOURCE: SessionSource = Object.freeze(authored);
