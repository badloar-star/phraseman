import { EPISODE_02_SESSION_09_SOURCE } from './episode_02_session_09_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v))as T;
const rewrite=<T,>(v:T):T=>{const p:readonly(readonly[string,string])[]=[['e02-s09','e02-s10'],['possible','impossible'],['Possible','Impossible']];const visit=(x:unknown):unknown=>typeof x==='string'?p.reduce((s,[a,b])=>s.replaceAll(a,b),x):Array.isArray(x)?x.map(visit):x&&typeof x==='object'?Object.fromEntries(Object.entries(x as Record<string,unknown>).map(([k,y])=>[k,visit(y)])):x;return visit(v)as T};
const source=rewrite(clone(EPISODE_02_SESSION_09_SOURCE))as SessionSource&{requiredSessionOrdinal:number;generationInputFingerprint:string};source.requiredSessionOrdinal=10;source.generationInputFingerprint='full-b1-exact-guided-impossible-e02-s10-v1';
export const EPISODE_02_SESSION_10_SOURCE:SessionSource=Object.freeze(source);
