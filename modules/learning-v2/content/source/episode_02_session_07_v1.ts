import { EPISODE_02_SESSION_06_SOURCE } from './episode_02_session_06_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v))as T;
const rewrite=<T,>(v:T):T=>{const p:readonly(readonly[string,string])[]=[['e02-s06','e02-s07'],['fake','necessary'],['Fake','Necessary'],['calm','angry'],['Calm','Angry'],['nervous','scared'],['Nervous','Scared']];const visit=(x:unknown):unknown=>typeof x==='string'?p.reduce((s,[a,b])=>s.replaceAll(a,b),x):Array.isArray(x)?x.map(visit):x&&typeof x==='object'?Object.fromEntries(Object.entries(x as Record<string,unknown>).map(([k,y])=>[k,visit(y)])):x;return visit(v)as T};
const source=rewrite(clone(EPISODE_02_SESSION_06_SOURCE))as SessionSource&{requiredSessionOrdinal:number;generationInputFingerprint:string};source.requiredSessionOrdinal=7;source.generationInputFingerprint='full-b1-exact-spoken-necessary-e02-s07-v1';
export const EPISODE_02_SESSION_07_SOURCE:SessionSource=Object.freeze(source);
