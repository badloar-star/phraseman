import {createHash} from 'node:crypto';

export interface ReplyTopic {id:string;title:string;summary:string;questions:string[];answers:string[];commentIds:string[]}
export function normalizedReply(text:string):string {
  return text.normalize('NFKC').toLocaleLowerCase('und').replace(/[\p{P}\p{S}\p{Z}\s]+/gu,' ').trim();
}
export function uniqueReplyKey(text:string):string {
  const normalized=normalizedReply(text);
  if(!normalized)throw new Error('reply_text_invalid');
  return 'reply_'+createHash('sha256').update(normalized).digest('hex');
}
export function parseReplyTopics(raw:unknown,allowedIds:readonly string[]):ReplyTopic[] {
  const input=raw as {categories?:unknown};
  if(!Array.isArray(input?.categories)||!input.categories.length||input.categories.length>12)throw new Error('analysis_invalid');
  const seen=new Set<string>();
  const topics=input.categories.map((item:any):ReplyTopic=>{
    if(typeof item.title!=='string'||!item.title.trim()||item.title.length>120||typeof item.summary!=='string'||item.summary.length>600)throw new Error('analysis_invalid');
    if(!Array.isArray(item.questions)||!item.questions.length||item.questions.length>4||item.questions.some((q:unknown)=>typeof q!=='string'||!q.trim()||q.length>600))throw new Error('analysis_invalid');
    if(!Array.isArray(item.commentIds)||!item.commentIds.length)throw new Error('analysis_invalid');
    for(const id of item.commentIds){if(typeof id!=='string'||!allowedIds.includes(id)||seen.has(id))throw new Error('analysis_invalid');seen.add(id);}
    return {id:createHash('sha256').update(item.title.trim().toLowerCase()).digest('hex').slice(0,20),title:item.title.trim(),summary:item.summary,questions:item.questions.map((q:string)=>q.trim()),answers:[],commentIds:item.commentIds};
  });
  if(seen.size!==allowedIds.length||new Set(topics.map(t=>t.id)).size!==topics.length)throw new Error('analysis_incomplete');
  return topics;
}
export function topicReady(topic:ReplyTopic|undefined):boolean {
  return Boolean(topic && topic.answers.length===topic.questions.length && topic.answers.every(answer=>typeof answer==='string'&&answer.trim().length>0));
}
export function assertTopicStorageLimit(topics:readonly ReplyTopic[]):void {
  // JSON UTF-8 bytes, not JS characters. Leave >600 KiB for Firestore field
  // metadata; at most 40 topics and 12 evidence IDs each bound array overhead.
  if(topics.length>40||Buffer.byteLength(JSON.stringify(topics),'utf8')>400000)throw new Error('knowledge_size_limit');
}
