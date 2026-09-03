import { EPISODE_02_SESSION_07_SOURCE } from './episode_02_session_07_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const source=JSON.parse(JSON.stringify(EPISODE_02_SESSION_07_SOURCE))as SessionSource&{requiredSessionOrdinal:number;generationInputFingerprint:string;sessionKindOverride:'checkpoint';newVocabulary:readonly any[];retrievalVocabulary?:readonly any[];newVocabularyExceptionReason?:string};
source.requiredSessionOrdinal=8;source.generationInputFingerprint='full-b1-exact-checkpoint-e02-s08-v1';source.sessionKindOverride='checkpoint';source.retrievalVocabulary=[...source.newVocabulary,...(source.retrievalVocabulary??[])];source.newVocabulary=[];source.newVocabularyExceptionReason='checkpoint_retrieval_only';
export const EPISODE_02_SESSION_08_SOURCE:SessionSource=Object.freeze(source);
