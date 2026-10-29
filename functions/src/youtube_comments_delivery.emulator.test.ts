import * as admin from 'firebase-admin';
jest.mock('firebase-functions/v2/https',()=>({onRequest:(_:any,fn:any)=>fn,onCall:(_:any,fn:any)=>fn,HttpsError:class extends Error {constructor(public code:string,message:string){super(message);}}}));
jest.mock('firebase-functions/params',()=>({defineSecret:()=>({value:()=> 'mock-only'})}));
jest.mock('./callable_options',()=>({ENFORCE_APP_CHECK:false}));
jest.mock('./admin/permissions',()=>({hasVerifiedCallablePermission:()=>true}));
jest.mock('./openai_jobs_config',()=>({resolveJobConfig:async()=>({model:'mock'}),assertJobEnabled:()=>{}}));
jest.mock('./spend_cap',()=>({reserveDailySpend:jest.fn()}));
jest.mock('./ai_operation_billing',()=>({recordAiOperationUsage:jest.fn()}));
import {adminYoutubeComments,YOUTUBE_REPLY_OWNER_UID as uid} from './youtube_comments';
import {approveReply} from './youtube_comment_policy';
import {beginYoutubeAuthorization,finishYoutubeAuthorization,getYoutubeAccess} from './youtube_oauth';
import {collectFeedback} from './youtube_feedback_store';
const originalFetch=global.fetch;
const invoke=(id:string)=>(adminYoutubeComments as any)({auth:{uid},data:{op:'send',id,token:'mock-token'}});
describe('real Firestore transactions serialize YouTube senders',()=>{
 let db:FirebaseFirestore.Firestore,posts:number,published:any[];
 beforeAll(()=>{
  if(!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? ''))throw Error('Local emulator required');
  admin.initializeApp({projectId:'demo-youtube-admin'}); db=admin.firestore();
 });
 afterAll(async()=>{global.fetch=originalFetch;await admin.app().delete();});
 beforeEach(async()=>{
  posts=0; published=[];
  await db.doc('admin_youtube_connections/state').set({channels:{config:{youtubeChannelId:'channel'}}});
  await db.doc('admin_youtube_comment_settings/queue').set({owner:uid,paused:false});
  for(const id of ['race-a','race-b'])await db.doc(`admin_youtube_comments/${id}`).set({configId:'config',channelId:'channel',parentId:'parent',syncedAt:Date.now(),reply:approveReply({id,channelId:'channel',parentId:'parent',text:'Approved '+id,revision:1,status:'draft',createdAt:1},uid,1)});
  global.fetch=jest.fn(async(url:any,init:any)=>{
   const parsed=new URL(url);
   if(init.method==='POST'){posts++;const id='posted-'+posts;published.push({id,snippet:{authorChannelId:{value:'channel'},textOriginal:JSON.parse(init.body).snippet.textOriginal}});await new Promise(resolve=>setTimeout(resolve,50));return {ok:true,json:async()=>({id})} as Response;}
   return {ok:true,json:async()=>parsed.pathname.endsWith('/channels')?{items:[{id:'channel'}]}:parsed.searchParams.has('parentId')?{items:published}:{items:[{id:'parent',snippet:{channelId:'channel'}}]}} as Response;
  });
 });
 it.each(['race-a','race-b'])('two simultaneous tabs emit only one POST when second targets %s',async second=>{
  const results=await Promise.allSettled([invoke('race-a'),invoke(second)]);
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect(posts).toBe(1);
  expect((await db.doc('admin_youtube_comment_settings/queue').get()).data()?.inFlightId).toBeUndefined();
 },30000);
 it('rejects two separately approved identical answers even in the same thread',async()=>{
  for(const id of ['race-a','race-b'])await db.doc(`admin_youtube_comments/${id}`).update({reply:approveReply({id,channelId:'channel',parentId:'parent',text:'Спасибо!',revision:2,status:'draft',createdAt:1},uid,1)});
  await invoke('race-a');
  await db.doc('admin_youtube_comment_settings/queue').update({notBefore:0}); // Simulate elapsed interval, emulator only.
  await expect(invoke('race-b')).rejects.toThrow('duplicate_reply_rewrite');
  expect(posts).toBe(1);
  const second=(await db.doc('admin_youtube_comments/race-b').get()).data();
  expect(second?.sentId).toBeUndefined();
 },30000);
 it('two concurrent approvals cannot reserve identical text for different rows',async()=>{
  const text='Уникальный ответ гонки '+Date.now();
  for(const id of ['race-a','race-b'])await db.doc(`admin_youtube_comments/${id}`).update({'reply.text':text});
  const results=await Promise.allSettled(['race-a','race-b'].map(id=>(adminYoutubeComments as any)({auth:{uid},data:{op:'approve',id,revision:1}})));
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
  expect(posts).toBe(0);
 },30000);
 it('consumes an OAuth state once and coalesces server refresh across two callers',async()=>{
  let exchanges=0;
  global.fetch=jest.fn(async(url:any)=>{if(String(url).includes('/token')){exchanges++;await new Promise(r=>setTimeout(r,100));return {ok:true,json:async()=>({access_token:'access',refresh_token:'refresh',expires_in:3600})} as Response;}return {ok:true,json:async()=>({items:[{id:'channel'}]})} as Response;});
  const start=await beginYoutubeAuthorization(db,uid,'config'),state=new URL(start.url).searchParams.get('state');
  const finished=await Promise.allSettled([finishYoutubeAuthorization(db,state,'code'),finishYoutubeAuthorization(db,state,'code')]);
  expect(finished.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(exchanges).toBe(1);
  await db.doc('admin_youtube_comment_settings/oauth_config').update({expiresAt:1});
  const renewed=await Promise.allSettled([getYoutubeAccess(db,uid,'config'),getYoutubeAccess(db,uid,'config')]);
  expect(renewed.some(r=>r.status==='fulfilled')).toBe(true);expect(exchanges).toBe(2);
 },30000);
 it('serializes feedback scans and preserves counts when a cached row is recreated',async()=>{
  const id='feedback-race',row=db.doc('admin_youtube_comments/'+id);
  await row.set({configId:'config',channelId:'channel',text:'Медленнее, пожалуйста',videoId:'video',commentId:'comment'});
  let calls=0;
  const classify=async()=>{calls++;await new Promise(r=>setTimeout(r,100));return {comments:[{id,skipReply:false,signals:[{kind:'request',category:'format',title:'Замедлить речь'}]}]};};
  const results=await Promise.allSettled([collectFeedback(db,[id],classify),collectFeedback(db,[id],classify)]);
  expect(results.some(r=>r.status==='fulfilled')).toBe(true);expect(calls).toBe(1);
  await row.delete();await row.set({configId:'config',channelId:'channel',text:'Медленнее, пожалуйста'});
  await collectFeedback(db,[id],classify);
  const state=(await db.doc('admin_youtube_comment_settings/feedback').get()).data();
  expect(state?.analyzed).toBe(1);expect(state?.topics[0].count).toBe(1);expect(calls).toBe(1);
  expect((await row.get()).data()?.feedbackVersion).toBe(1);
 },30000);
 it('keeps owner correction when an in-flight classifier finishes later',async()=>{
  const id='feedback-correction',row=db.doc('admin_youtube_comments/'+id);
  await row.set({configId:'config',channelId:'channel',text:'озвучка',skipReply:true});
  let entered!:()=>void,release!:()=>void;
  const ready=new Promise<void>(r=>{entered=r;}),resume=new Promise<void>(r=>{release=r;});
  const scanning=collectFeedback(db,[id],async()=>{entered();await resume;return {comments:[{id,skipReply:true,skipReason:'ai_or_voice',skipEvidence:'озвучка',signals:[{kind:'complaint',category:'audio',title:'Озвучка'}]}]};});
  await ready;
  await (adminYoutubeComments as any)({auth:{uid},data:{op:'feedbackAllowReply',id}});
  release();await scanning;
  expect((await row.get()).data()?.skipReply).toBe(false);
  expect((await db.doc('admin_youtube_comment_settings/feedback_item_'+id).get()).data()?.replySkipOverride).toBe(true);
 },30000);
});
