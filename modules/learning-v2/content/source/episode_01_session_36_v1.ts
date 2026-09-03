/** Full B1 Session 36: guided application with sleepy. */
import { EPISODE_01_SESSION_35_SOURCE } from './episode_01_session_35_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x)) as T;
const swap=<T>(x:T):T=>{const p:readonly(readonly[string,string])[]=[['e01-s35','e01-s36'],['ill','sleepy'],['Ill','Sleepy'],['drowsy','faded'],['Drowsy','Faded'],['weak','drained'],['Weak','Drained']];const v=(y:unknown):unknown=>typeof y==='string'?p.reduce((s,[a,b])=>s.replaceAll(a,b),y):Array.isArray(y)?y.map(v):y&&typeof y==='object'?Object.fromEntries(Object.entries(y as Record<string,unknown>).map(([k,z])=>[k,v(z)])):y;return v(x)as T};
export const EPISODE_01_SESSION_36_SOURCE:SessionSource=Object.freeze(Object.assign(swap(clone(EPISODE_01_SESSION_35_SOURCE))as any,{requiredSessionOrdinal:36,generationInputFingerprint:'full-b1-exact-guided-sleepy-e01-s36-v1'}));
