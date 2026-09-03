/** Full B1 Session 35: diagnostic contraction contrast with ill. */
import { EPISODE_01_SESSION_34_SOURCE } from './episode_01_session_34_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const replace = <T>(value: T): T => { const p: readonly (readonly [string, string])[] = [['e01-s34','e01-s35'],['afraid','ill'],['Afraid','Ill'],['uneasy','drowsy'],['Uneasy','Drowsy'],['settled','weak'],['Settled','Weak']]; const v=(x:unknown):unknown=>typeof x==='string'?p.reduce((s,[a,b])=>s.replaceAll(a,b),x):Array.isArray(x)?x.map(v):x&&typeof x==='object'?Object.fromEntries(Object.entries(x as Record<string,unknown>).map(([k,y])=>[k,v(y)])):x;return v(value) as T;};
export const EPISODE_01_SESSION_35_SOURCE: SessionSource = Object.freeze(Object.assign(replace(clone(EPISODE_01_SESSION_34_SOURCE)) as any,{requiredSessionOrdinal:35,generationInputFingerprint:'full-b1-exact-diagnostic-contraction-e01-s35-v1'}));
