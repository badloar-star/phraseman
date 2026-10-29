import * as admin from 'firebase-admin';
import {createHash,randomBytes} from 'node:crypto';
import {HttpsError,onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';

export const YOUTUBE_OAUTH_CLIENT_SECRET=defineSecret('YOUTUBE_OAUTH_CLIENT_SECRET');
const CLIENT='1047658658799-mp2113hev4fkg9t23h5q5f52rpe2pehm.apps.googleusercontent.com';
const CALLBACK='https://us-central1-phraseman-ea0b3.cloudfunctions.net/youtubeOAuthCallback';
const HOME='https://phraseman-ea0b3.web.app/legacy.html';
const OWNER='mmk1YSI3bjRLNoce8n4sMBiFeIK2';
const SETTINGS='admin_youtube_comment_settings';
const SCOPE='https://www.googleapis.com/auth/youtube.force-ssl';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
function id(value:unknown):string {if(typeof value!=='string'||!/^[-\w]{1,180}$/.test(value))throw new HttpsError('invalid-argument','invalid_channel');return value;}
function owner(uid:string):void {if(uid!==OWNER)throw new HttpsError('permission-denied','owner_approval_required');}
async function channel(db:FirebaseFirestore.Firestore,configId:string):Promise<string> {
  const value=(await db.doc('admin_youtube_connections/state').get()).data()?.channels?.[configId]?.youtubeChannelId;
  if(!value)throw new HttpsError('failed-precondition','channel_not_connected');return id(value);
}
type Tokens={access_token?:string;refresh_token?:string;expires_in?:number;scope?:string;error?:string};
type Grant={accessToken:string;refreshToken:string;expiresAt:number;revision:string;channelId:string;owner:string;status:string;refreshUntil:number};
async function exchange(values:Record<string,string>):Promise<Tokens> {
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,client_id:CLIENT,client_secret:YOUTUBE_OAUTH_CLIENT_SECRET.value()}),signal:AbortSignal.timeout(15000)});
  const data=await response.json() as Tokens;
  if(!response.ok||!data.access_token)throw new HttpsError('failed-precondition',data.error==='invalid_grant'?'youtube_consent_required':'youtube_token_failed');
  return data;
}
export async function beginYoutubeAuthorization(db:FirebaseFirestore.Firestore,uid:string,config:unknown):Promise<{url:string}> {
  owner(uid);const configId=id(config),channelId=await channel(db,configId),state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
  const ref=db.collection(SETTINGS).doc('oauth_state_'+digest(state));
  await ref.set({uid,configId,channelId,verifier,used:false,expiresAt:Date.now()+600000,expireAt:admin.firestore.Timestamp.fromMillis(Date.now()+3600000)});
  return {url:'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:CLIENT,redirect_uri:CALLBACK,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent select_account',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'})};
}
export async function finishYoutubeAuthorization(db:FirebaseFirestore.Firestore,state:unknown,code:unknown):Promise<void> {
  if(typeof state!=='string'||!/^[-\w]{43}$/.test(state)||typeof code!=='string'||!code||code.length>8192)throw new HttpsError('invalid-argument','invalid_oauth_callback');
  const ref=db.collection(SETTINGS).doc('oauth_state_'+digest(state));
  const session=await db.runTransaction(async tx=>{const data=(await tx.get(ref)).data();if(!data||data.used||data.uid!==OWNER||data.expiresAt<Date.now())throw new HttpsError('permission-denied','oauth_state_expired');tx.update(ref,{used:true});return data;});
  const tokens=await exchange({code,grant_type:'authorization_code',redirect_uri:CALLBACK,code_verifier:session.verifier});
  if(tokens.scope&&!tokens.scope.split(' ').includes(SCOPE))throw new HttpsError('permission-denied','youtube_scope_missing');
  const mine=await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true&maxResults=50',{headers:{Authorization:'Bearer '+tokens.access_token},signal:AbortSignal.timeout(15000)});
  if(!mine.ok)throw new HttpsError('failed-precondition','youtube_channel_check_failed');
  const result=await mine.json() as {items?:{id:string}[]};
  if(!result.items?.some(item=>item.id===session.channelId))throw new HttpsError('permission-denied','wrong_youtube_channel');
  const tokenRef=db.collection(SETTINGS).doc('oauth_'+session.configId);
  await db.runTransaction(async tx=>{
    const current=(await tx.get(db.doc('admin_youtube_connections/state'))).data()?.channels?.[session.configId];
    const previous=(await tx.get(tokenRef)).data();
    if(current?.youtubeChannelId!==session.channelId)throw new HttpsError('failed-precondition','channel_changed');
    const refresh=tokens.refresh_token||(previous&&previous.channelId===session.channelId?previous.refreshToken:undefined);
    if(!refresh)throw new HttpsError('failed-precondition','youtube_consent_required');
    tx.set(tokenRef,{channelId:session.channelId,owner:OWNER,refreshToken:refresh,accessToken:tokens.access_token,expiresAt:Date.now()+Math.min(Number(tokens.expires_in)||3600,3600)*1000,revision:randomBytes(16).toString('hex'),status:'connected',connectedAt:Date.now(),refreshUntil:0});
  });
}
export async function youtubeAuthorizationStatus(db:FirebaseFirestore.Firestore,configId:string,channelId:string):Promise<string> {
  const data=(await db.collection(SETTINGS).doc('oauth_'+id(configId)).get()).data();
  return data?.owner===OWNER&&data.channelId===channelId?data.status||'needs_consent':'needs_consent';
}
export async function getYoutubeAccess(db:FirebaseFirestore.Firestore,uid:string,config:unknown):Promise<{accessToken:string;expiresAt:number}> {
  owner(uid);const configId=id(config),channelId=await channel(db,configId),ref=db.collection(SETTINGS).doc('oauth_'+configId),lease=randomBytes(16).toString('hex');
  const stored=await db.runTransaction(async tx=>{
    const data=(await tx.get(ref)).data();
    if(!data||data.owner!==uid||data.channelId!==channelId||data.status!=='connected'||!data.refreshToken)throw new HttpsError('failed-precondition','youtube_consent_required');
    if(data.accessToken&&data.expiresAt>Date.now()+60000)return {...(data as Grant),cached:true};
    if(data.refreshUntil>Date.now())throw new HttpsError('unavailable','youtube_refresh_running');
    tx.update(ref,{refreshUntil:Date.now()+30000,refreshLease:lease});return {...(data as Grant),cached:false};
  });
  if(stored.cached)return {accessToken:stored.accessToken,expiresAt:stored.expiresAt};
  try {
    const tokens=await exchange({grant_type:'refresh_token',refresh_token:stored.refreshToken});
    const expiresAt=Date.now()+Math.min(Number(tokens.expires_in)||3600,3600)*1000;
    await db.runTransaction(async tx=>{
      const current=(await tx.get(ref)).data(),connection=(await tx.get(db.doc('admin_youtube_connections/state'))).data()?.channels?.[configId];
      if(current?.revision!==stored.revision||current?.refreshLease!==lease||connection?.youtubeChannelId!==channelId)throw new HttpsError('aborted','channel_changed');
      tx.update(ref,{accessToken:tokens.access_token,expiresAt,refreshToken:tokens.refresh_token||stored.refreshToken,refreshUntil:0,refreshLease:''});
    });return {accessToken:tokens.access_token!,expiresAt};
  }catch(error){
    await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.revision===stored.revision&&current?.refreshLease===lease)tx.update(ref,{refreshUntil:0,refreshLease:'',...(error instanceof HttpsError&&error.message==='youtube_consent_required'?{status:'needs_consent',accessToken:'',expiresAt:0}:{})});});throw error;
  }
}
export const youtubeOAuthCallback=onRequest({region:'us-central1',secrets:[YOUTUBE_OAUTH_CLIENT_SECRET],timeoutSeconds:60},async(req,res)=>{
  res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');
  if(req.method!=='GET'){res.status(405).send('Method not allowed');return;}
  let status='connected';
  try{await finishYoutubeAuthorization(admin.firestore(),req.query.state,req.query.code);}catch(error){status=error instanceof HttpsError&&error.message==='wrong_youtube_channel'?'wrong_channel':'authorization_failed';}
  res.redirect(303,HOME+'?youtubeAuth='+status+'#youtube-comments');
});
