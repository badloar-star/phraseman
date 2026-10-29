import {randomUUID} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
import {parseFeedback,mergeFeedback,type FeedbackSource,type FeedbackTopic} from './youtube_feedback';

/** Caller has already verified admin permission. All persistence is server-only. */
export async function collectFeedback(db:FirebaseFirestore.Firestore,ids:string[],classify:(context:string)=>Promise<unknown>):Promise<{analyzed:number}> {
 const settings=db.collection('admin_youtube_comment_settings'),root=db.collection('admin_youtube_comments');
 const lock=settings.doc('feedback_lock'),owner=randomUUID();
 await db.runTransaction(async tx=>{const current=(await tx.get(lock)).data();if(Number(current?.until)>Date.now())throw new HttpsError('aborted','feedback_running');tx.set(lock,{owner,until:Date.now()+100000});});
 try {
  const docs=await db.getAll(...ids.map(id=>root.doc(id)));
  const receipts=await db.getAll(...ids.map(id=>settings.doc('feedback_item_'+id)));
  const done=new Map(receipts.filter(r=>r.exists).map(r=>[r.id.replace('feedback_item_',''),r.data()]));
  const sources:FeedbackSource[]=docs.filter(d=>d.exists&&!d.data()?.ownComment&&!done.has(d.id)).map(d=>{const r=d.data()!;return {id:d.id,configId:r.configId,channelId:r.channelId,videoId:String(r.videoId||''),commentId:String(r.commentId||r.parentId||''),text:String(r.text||'').slice(0,2000)};});
  const previous=(await settings.doc('feedback').get()).data()?.topics as FeedbackTopic[]||[];
  const results=sources.length?parseFeedback(await classify(JSON.stringify({comments:sources,existingTopics:previous.map(({kind,category,title})=>({kind,category,title}))})),sources.map(s=>s.id)):[];
  for(const result of results)if(result.skipReply&&!sources.find(s=>s.id===result.id)!.text.includes(result.skipEvidence))throw new HttpsError('failed-precondition','feedback_invalid');
  await db.runTransaction(async tx=>{
   const held=(await tx.get(lock)).data();if(held?.owner!==owner)throw new HttpsError('aborted','feedback_running');
   const state=(await tx.get(settings.doc('feedback'))).data();
   const claims=await Promise.all(ids.map(id=>tx.get(settings.doc('feedback_item_'+id))));
   const current=await Promise.all(ids.map(id=>tx.get(root.doc(id))));
   const fresh=results.filter(r=>!claims[ids.indexOf(r.id)].exists).map(r=>current[ids.indexOf(r.id)].data()?.replySkipOverride?{...r,skipReply:false,skipReason:null,skipEvidence:''}:r);
   for(const r of fresh){const latest=current[ids.indexOf(r.id)].data(),source=sources.find(s=>s.id===r.id)!;
    if(!latest||latest.ownComment||latest.configId!==source.configId||latest.channelId!==source.channelId||String(latest.text||'').slice(0,2000)!==source.text)throw new HttpsError('aborted','feedback_comment_changed');
   }
   let topics:FeedbackTopic[];try{topics=mergeFeedback(state?.topics||[],fresh,sources,Date.now());}catch{throw new HttpsError('resource-exhausted','feedback_storage_limit');}
   tx.set(settings.doc('feedback'),{topics,analyzed:Number(state?.analyzed||0)+fresh.length,updatedAt:Date.now()});
   for(const r of fresh)tx.set(settings.doc('feedback_item_'+r.id),{version:1,skipReply:r.skipReply,replySkipOverride:!!current[ids.indexOf(r.id)].data()?.replySkipOverride,skipReason:r.skipReason,skipEvidence:r.skipEvidence,signals:r.signals,source:sources.find(s=>s.id===r.id),at:Date.now()});
   for(const d of current){if(!d.exists||d.data()?.ownComment)continue;const r=claims[ids.indexOf(d.id)].data()||fresh.find(r=>r.id===d.id);if(r){const override=!!d.data()?.replySkipOverride||!!('replySkipOverride' in r&&r.replySkipOverride);tx.update(root.doc(d.id),{feedbackVersion:1,skipReply:override?false:!!r.skipReply,replySkipOverride:override});}}
  });
  return {analyzed:sources.length};
 } finally {await db.runTransaction(async tx=>{if((await tx.get(lock)).data()?.owner===owner)tx.set(lock,{owner,until:0});});}
}
