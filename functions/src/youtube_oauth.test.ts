const records=new Map<string,any>();
const ref=(path:string):any=>({path,get:async()=>({data:()=>structuredClone(records.get(path))}),set:async(v:any)=>records.set(path,structuredClone(v)),update:async(v:any)=>records.set(path,{...records.get(path),...v})});
const db:any={doc:ref,collection:(name:string)=>({doc:(id:string)=>ref(name+'/'+id)}),runTransaction:async(fn:any)=>fn({get:(r:any)=>r.get(),set:(r:any,v:any)=>r.set(v),update:(r:any,v:any)=>r.update(v)})};
jest.mock('firebase-admin',()=>({firestore:Object.assign(()=>db,{Timestamp:{fromMillis:(v:number)=>v}})}));
jest.mock('firebase-functions/v2/https',()=>({onRequest:(_:any,fn:any)=>fn,HttpsError:class extends Error{constructor(public code:string,message:string){super(message);}}}));
jest.mock('firebase-functions/params',()=>({defineSecret:()=>({value:()=> 'server-secret-mock'})}));
import {beginYoutubeAuthorization,finishYoutubeAuthorization,getYoutubeAccess,youtubeAuthorizationStatus} from './youtube_oauth';
const uid='mmk1YSI3bjRLNoce8n4sMBiFeIK2',tokenPath='admin_youtube_comment_settings/oauth_c';
const original=global.fetch;
let calls:string[];
beforeEach(()=>{records.clear();calls=[];records.set('admin_youtube_connections/state',{channels:{c:{youtubeChannelId:'UC-channel'}}});global.fetch=jest.fn(async(url:any)=>{calls.push(String(url));return{ok:true,json:async()=>String(url).includes('/token')?{access_token:'access',refresh_token:'refresh',expires_in:3600,scope:'https://www.googleapis.com/auth/youtube.force-ssl'}:{items:[{id:'UC-channel'}]}} as Response;});});
afterAll(()=>{global.fetch=original;});
async function connect(){const result=await beginYoutubeAuthorization(db,uid,'c');const state=new URL(result.url).searchParams.get('state')!;await finishYoutubeAuthorization(db,state,'code');return state;}
describe('durable per-channel YouTube grant',()=>{
 it('requires owner and saved channel before creating a grant request',async()=>{
  await expect(beginYoutubeAuthorization(db,'support','c')).rejects.toThrow('owner_approval_required');
  await expect(beginYoutubeAuthorization(db,uid,'unknown')).rejects.toThrow('channel_not_connected');expect(calls).toHaveLength(0);
 });
 it('uses random expiring one-use state and PKCE, stores server grant only after exact channel validation',async()=>{
  const result=await beginYoutubeAuthorization(db,uid,'c'),url=new URL(result.url),state=url.searchParams.get('state')!;
  expect(url.searchParams.get('access_type')).toBe('offline');expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  const entry=[...records.values()].find(v=>v.verifier);expect(entry.expiresAt).toBeGreaterThan(Date.now());expect(entry.expireAt).toBeGreaterThan(entry.expiresAt);
  await finishYoutubeAuthorization(db,state,'code');expect(records.get(tokenPath).refreshToken).toBe('refresh');
  await expect(finishYoutubeAuthorization(db,state,'code')).rejects.toThrow('oauth_state_expired');expect(calls).toHaveLength(2);
  expect(await youtubeAuthorizationStatus(db,'c','UC-channel')).toBe('connected');
 });
 it('rejects forged and expired state before token exchange',async()=>{
  await expect(finishYoutubeAuthorization(db,'A'.repeat(43),'code')).rejects.toThrow('oauth_state_expired');
  const result=await beginYoutubeAuthorization(db,uid,'c');for(const value of records.values())if(value.verifier)value.expiresAt=1;
  await expect(finishYoutubeAuthorization(db,new URL(result.url).searchParams.get('state'),'code')).rejects.toThrow('oauth_state_expired');expect(calls).toHaveLength(0);
 });
 it('does not replace a saved grant with a different Google channel',async()=>{
  await connect();const before=structuredClone(records.get(tokenPath));
  global.fetch=jest.fn(async(url:any)=>({ok:true,json:async()=>String(url).includes('/token')?{access_token:'wrong',refresh_token:'wrong'}:{items:[{id:'OTHER'}]}}) as Response);
  const result=await beginYoutubeAuthorization(db,uid,'c');
  await expect(finishYoutubeAuthorization(db,new URL(result.url).searchParams.get('state'),'code')).rejects.toThrow('wrong_youtube_channel');expect(records.get(tokenPath)).toEqual(before);
 });
 it('reuses unexpired server access after a browser restart without Google calls',async()=>{
  await connect();calls=[];expect(await getYoutubeAccess(db,uid,'c')).toEqual({accessToken:'access',expiresAt:records.get(tokenPath).expiresAt});expect(calls).toHaveLength(0);
  await expect(getYoutubeAccess(db,'support','c')).rejects.toThrow('owner_approval_required');
 });
 it('refreshes expired access server-side and preserves refresh token when Google omits it',async()=>{
  await connect();records.get(tokenPath).expiresAt=1;
  global.fetch=jest.fn(async()=>({ok:true,json:async()=>({access_token:'renewed',expires_in:3600})}) as Response);
  expect((await getYoutubeAccess(db,uid,'c')).accessToken).toBe('renewed');expect(records.get(tokenPath).refreshToken).toBe('refresh');expect(records.get(tokenPath).refreshUntil).toBe(0);
 });
 it('marks revoked access as needing consent and does not retry blindly',async()=>{
  await connect();records.get(tokenPath).expiresAt=1;global.fetch=jest.fn(async()=>({ok:false,json:async()=>({error:'invalid_grant'})}) as Response);
  await expect(getYoutubeAccess(db,uid,'c')).rejects.toThrow('youtube_consent_required');expect(records.get(tokenPath).status).toBe('needs_consent');
  await expect(getYoutubeAccess(db,uid,'c')).rejects.toThrow('youtube_consent_required');expect(global.fetch).toHaveBeenCalledTimes(1);
 });
 it('rejects rebound channel credentials and concurrent refresh lease',async()=>{
  await connect();records.get(tokenPath).expiresAt=1;records.get(tokenPath).refreshUntil=Date.now()+30000;
  await expect(getYoutubeAccess(db,uid,'c')).rejects.toThrow('youtube_refresh_running');
  records.get('admin_youtube_connections/state').channels.c.youtubeChannelId='rebound';
  await expect(getYoutubeAccess(db,uid,'c')).rejects.toThrow('youtube_consent_required');expect(await youtubeAuthorizationStatus(db,'c','rebound')).toBe('needs_consent');
 });
});
