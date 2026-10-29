const records = new Map<string, any>();
const deleted = Symbol('delete');
function patch(path: string, values: any) {
  const data = records.get(path) ?? {};
  for (const [key, value] of Object.entries(values)) {
    const parts = key.split('.'); let target = data;
    while (parts.length > 1) { const part = parts.shift()!; target = target[part] ??= {}; }
    if (value === deleted) delete target[parts[0]]; else target[parts[0]] = structuredClone(value);
  }
  records.set(path, data);
}
const ref = (path: string): any => ({path, get:async()=>({id:path.split('/').pop(),exists:records.has(path),data:()=>structuredClone(records.get(path))}), update:async(v:any)=>patch(path,v),set:async(v:any)=>patch(path,v)});
const db = {batch:()=>({set:(r:any,v:any)=>patch(r.path,v),commit:async()=>{}}),doc:ref,collection:(name:string)=>({doc:(id:string)=>ref(`${name}/${id}`)}),getAll:(...refs:any[])=>Promise.all(refs.map(r=>r.get())),runTransaction:async(fn:any)=>fn({get:(r:any)=>r.get(),update:(r:any,v:any)=>patch(r.path,v),set:(r:any,v:any)=>patch(r.path,v)})};
jest.mock('firebase-admin',()=>({firestore:Object.assign(()=>db,{Timestamp:{fromMillis:(v:number)=>v},FieldValue:{delete:()=>deleted}})}));
jest.mock('firebase-functions/v2/https',()=>({onRequest:(_:any,fn:any)=>fn,onCall:(_:any,fn:any)=>fn,HttpsError:class extends Error {constructor(public code:string,message:string){super(message);}}}));
jest.mock('firebase-functions/params',()=>({defineSecret:()=>({value:()=> 'mock-only'})}));
jest.mock('./callable_options',()=>({ENFORCE_APP_CHECK:false}));
jest.mock('./admin/permissions',()=>({hasVerifiedCallablePermission:(auth:any)=>['mmk1YSI3bjRLNoce8n4sMBiFeIK2','support'].includes(auth?.uid)}));
jest.mock('./openai_jobs_config',()=>({resolveJobConfig:async()=>({model:'mock'}),assertJobEnabled:()=>{}}));
jest.mock('./spend_cap',()=>({reserveDailySpend:jest.fn()}));
jest.mock('./ai_operation_billing',()=>({recordAiOperationUsage:jest.fn()}));
import {adminYoutubeComments} from './youtube_comments';
import {approveReply} from './youtube_comment_policy';
const invoke = (data:any,uid='mmk1YSI3bjRLNoce8n4sMBiFeIK2') => (adminYoutubeComments as any)({data,auth:{uid}});
const rowPath='admin_youtube_comments/a', queuePath='admin_youtube_comment_settings/queue';
const originalFetch=global.fetch;
let requests: {url:string,method:string}[];
beforeEach(()=>{
  records.clear(); requests=[];
  records.set('admin_youtube_connections/state',{channels:{config:{youtubeChannelId:'channel'}}});
  records.set(rowPath,{configId:'config',channelId:'channel',parentId:'parent',syncedAt:Date.now(),reply:approveReply({id:'a',channelId:'channel',parentId:'parent',text:'Approved answer',revision:1,status:'draft',createdAt:1},'mmk1YSI3bjRLNoce8n4sMBiFeIK2',1)});
  records.set(queuePath,{paused:false,owner:'mmk1YSI3bjRLNoce8n4sMBiFeIK2'});
  patch(rowPath,{topicId:'topic'});
  records.set('admin_youtube_comment_settings/analysis',{topics:[{id:'topic',title:'Вопросы',summary:'Тема',questions:['Как отвечать?'],answers:['Кратко, по фактам.'],commentIds:['a']}]});
  global.fetch=jest.fn(async(url:any,init:any)=>{
    const parsed=new URL(url); requests.push({url:String(url),method:init.method});
    const body=parsed.pathname.endsWith('/channels')?{items:[{id:'channel'}]}:init.method==='POST'?{id:'posted'}:parsed.searchParams.has('parentId')?{items:[]}:{items:[{id:'parent',snippet:{channelId:'channel'}}]};
    return {ok:true,json:async()=>body} as Response;
  });
});
afterAll(()=>{global.fetch=originalFetch;});
describe('YouTube callable delivery boundaries (mocked services)',()=>{
  it('does not anchor regeneration on the previous reply wording',async()=>{
    global.fetch=jest.fn(async(_:any,init:any)=>{
      const body=JSON.parse(init.body);
      const context=JSON.parse(body.messages[1].content);
      expect(context).not.toHaveProperty('previousDraft');
      expect(body.messages[0].content).toContain('Жёсткое правило стиля');
      return {ok:true,json:async()=>({choices:[{message:{content:'NEEDS_REVIEW'}}]})} as Response;
    });
    await expect(invoke({op:'generate',id:'a'})).resolves.toEqual({needsReview:true});
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('loads public comments for a saved channel without browser OAuth',async()=>{
    global.fetch=jest.fn(async(url:any,init:any)=>{requests.push({url:String(url),method:init.method});expect(init.headers?.Authorization).toBeUndefined();return {ok:true,json:async()=>({items:[{snippet:{canReply:true,topLevelComment:{id:'public-comment',snippet:{textOriginal:'Public question',authorDisplayName:'Viewer'}}}}]})} as Response;});
    await expect(invoke({op:'sync',channelId:'config'})).resolves.toMatchObject({count:1});
    expect(requests).toHaveLength(1);expect(new URL(requests[0].url).searchParams.get('allThreadsRelatedToChannelId')).toBe('channel');
    expect([...records.values()].some(r=>r.text==='Public question')).toBe(true);
  });
  it('does not read arbitrary unsaved channels',async()=>{
    await expect(invoke({op:'sync',channelId:'other'})).rejects.toThrow('channel_not_connected');expect(requests).toHaveLength(0);
  });
  it('caches repeated public reads across callers and does not trust viewer-relative reply flags',async()=>{
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({items:[{snippet:{canReply:false,topLevelComment:{id:'public-comment',snippet:{textOriginal:'Question'}}}}]})}) as Response);
    await invoke({op:'sync',channelId:'config'});
    await invoke({op:'sync',channelId:'config'},'support');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect([...records.values()].find(r=>r.text==='Question').canReply).toBe(true);
  });
  it('enforces a server channel read budget across different page tokens',async()=>{
    records.set('admin_youtube_comment_settings/read_rate_config',{minute:Math.floor(Date.now()/60000),count:120});
    await expect(invoke({op:'sync',channelId:'config',cursor:'another-page'})).rejects.toThrow('channel_read_limit');
    expect(requests).toHaveLength(0);
  });
  it('bounds the shared hourly quota and invalidates cache after channel rebinding',async()=>{
    await invoke({op:'sync',channelId:'config'});
    records.set('admin_youtube_connections/state',{channels:{config:{youtubeChannelId:'new-channel'}}});
    await invoke({op:'sync',channelId:'config'});
    expect(requests).toHaveLength(2);
    expect(new URL(requests[1].url).searchParams.get('allThreadsRelatedToChannelId')).toBe('new-channel');
    records.set('admin_youtube_comment_settings/read_budget',{hour:Math.floor(Date.now()/3600000),hourly:500});
    await expect(invoke({op:'sync',channelId:'config',cursor:'next-page'})).rejects.toThrow('youtube_read_budget');
    expect(requests).toHaveLength(2);
    expect([...records.entries()].filter(([key])=>key.includes('/read_')&&!key.includes('/read_rate_')&&!key.endsWith('/read_budget')).every(([,value])=>value.expireAt>Date.now())).toBe(true);
  });
  it('rejects unauthorized public sync callers',async()=>{
    await expect(invoke({op:'sync',channelId:'config'},'other')).rejects.toThrow('Admin reply permission');expect(requests).toHaveLength(0);
  });

  it('only owner can supply owner guidance or global knowledge',async()=>{
    await expect(invoke({op:'guidance',topicId:'topic',questions:['Как отвечать?'],answers:['Подменённые правила']},'support')).rejects.toThrow('owner_approval_required');
    await expect(invoke({op:'knowledge',text:'Подменённые правила'},'support')).rejects.toThrow('owner_approval_required');
  });
  it('creates topic questions from scanned comments and persists owner answers',async()=>{
    patch(rowPath,{text:'Как начать обучение?'});
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({categories:[{title:'Начало обучения',summary:'Первые шаги',questions:['Какой урок рекомендуем первым?'],commentIds:['a']}]})}}]})}) as Response);
    await expect(invoke({op:'analyze',ids:['a']})).resolves.toEqual({analyzed:1});
    const topics=records.get('admin_youtube_comment_settings/analysis').topics;
    const topic=topics.find((t:any)=>t.title==='Начало обучения');
    expect(records.get(rowPath).topicId).toBe(topic.id);
    await invoke({op:'guidance',topicId:topic.id,questions:topic.questions,answers:['Вводный урок и 10 минут практики.']});
    expect(records.get('admin_youtube_comment_settings/analysis').topics.find((t:any)=>t.id===topic.id).answers).toEqual(['Вводный урок и 10 минут практики.']);
    await expect(invoke({op:'guidance',topicId:topic.id,questions:['Устаревший вопрос'],answers:['Ответ']})).rejects.toThrow('topic_changed_reload');
  });
  it('uses the approved owner baseline without unanswered category instructions',async()=>{
    records.delete('admin_youtube_comment_settings/analysis');
    global.fetch=jest.fn(async(_:any,init:any)=>{const body=JSON.parse(init.body);expect(body.messages[0].content).toContain('SKIP_REPLY');expect(JSON.parse(body.messages[1].content).ownerGuidance).toBeNull();return {ok:true,json:async()=>({choices:[{message:{content:'NEEDS_REVIEW'}}]})} as Response;});
    await expect(invoke({op:'generate',id:'a'})).resolves.toEqual({needsReview:true});
  });
  it('records feedback once across retries and restores receipts after comment cache expiry',async()=>{
    patch(rowPath,{text:'Говорите медленнее',commentId:'comment',videoId:'video'});
    const payload={comments:[{id:'a',skipReply:false,signals:[{kind:'request',category:'format',title:'Замедлить речь'}]}]};
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(payload)}}]})}) as Response);
    await expect(invoke({op:'feedback',ids:['a']})).resolves.toEqual({analyzed:1});
    await expect(invoke({op:'feedback',ids:['a']})).resolves.toEqual({analyzed:0});
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(records.get('admin_youtube_comment_settings/feedback').topics[0].count).toBe(1);
    records.set(rowPath,{configId:'config',channelId:'channel',text:'Говорите медленнее'});
    await invoke({op:'feedback',ids:['a']});
    expect(records.get(rowPath).feedbackVersion).toBe(1);
    expect(records.get('admin_youtube_comment_settings/feedback').analyzed).toBe(1);
  });
  it('restricts feedback and correction to owner; lets owner correct a model false positive',async()=>{
    await expect(invoke({op:'feedback',ids:['a']},'support')).rejects.toThrow('owner_approval_required');
    await expect(invoke({op:'feedbackAllowReply',id:'a'},'support')).rejects.toThrow('owner_approval_required');
    patch(rowPath,{skipReply:true});
    records.set('admin_youtube_comment_settings/feedback_item_a',{version:1,skipReply:true});
    await invoke({op:'feedbackAllowReply',id:'a'});
    expect(records.get(rowPath).skipReply).toBe(false);
    expect(records.get(rowPath).reply.status).toBe('draft');
    expect(records.get('admin_youtube_comment_settings/feedback_item_a').correctedBy).toBe('mmk1YSI3bjRLNoce8n4sMBiFeIK2');
  });
  it('discards generated output if feedback excludes the comment during generation',async()=>{
    global.fetch=jest.fn(async()=>{patch(rowPath,{skipReply:true});return {ok:true,json:async()=>({choices:[{message:{content:'This must not become a reply'}}]})} as Response;});
    await expect(invoke({op:'generate',id:'a'})).resolves.toEqual({skipped:true});
    expect(records.get(rowPath).reply.text).not.toBe('This must not become a reply');
  });
  it('captures voice complaint but blocks generation, approval and delivery',async()=>{
    patch(rowPath,{skipReply:true});
    await expect(invoke({op:'generate',id:'a'})).resolves.toEqual({skipped:true});
    await expect(invoke({op:'approve',id:'a',revision:1})).rejects.toThrow('reply_skipped_by_owner_rules');
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow('reply_skipped_by_owner_rules');
    expect(requests).toHaveLength(0);
  });
  it('correction before first classification does not lose analytical counts',async()=>{
    patch(rowPath,{text:'озвучка',skipReply:true});
    await invoke({op:'feedbackAllowReply',id:'a'});
    expect(records.has('admin_youtube_comment_settings/feedback_item_a')).toBe(false);
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({comments:[{id:'a',skipReply:true,skipReason:'ai_or_voice',skipEvidence:'озвучка',signals:[{kind:'complaint',category:'audio',title:'Жалоба на озвучку'}]}]})}}]})}) as Response);
    await invoke({op:'feedback',ids:['a']});
    expect(records.get('admin_youtube_comment_settings/feedback').topics[0].count).toBe(1);
    expect(records.get(rowPath).skipReply).toBe(false);
    expect(records.get('admin_youtube_comment_settings/feedback_item_a').skipReply).toBe(false);
  });
  it('does not store a skip marker as reply text and revokes previous approval',async()=>{
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'SKIP_REPLY'}}]})}) as Response);
    await expect(invoke({op:'generate',id:'a'})).resolves.toEqual({skipped:true});
    expect(records.get(rowPath).skipReply).toBe(true);
    expect(records.get(rowPath).reply.status).toBe('draft');
    expect(records.get(rowPath).reply.text).not.toBe('SKIP_REPLY');
  });
  it('does not let a model skip marker undo an explicit owner correction',async()=>{
    patch(rowPath,{skipReply:true});await invoke({op:'feedbackAllowReply',id:'a'});
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'SKIP_REPLY'}}]})}) as Response);
    await expect(invoke({op:'generate',id:'a'})).resolves.toEqual({needsReview:true});
    expect(records.get(rowPath).skipReply).toBe(false);
    expect(records.get(rowPath).needsReview).toBe(true);
  });
  it('rejects incomplete feedback without storing counts and releases the lease',async()=>{
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"comments":[]}'}}]})}) as Response);
    await expect(invoke({op:'feedback',ids:['a']})).rejects.toThrow('feedback_invalid');
    expect(records.has('admin_youtube_comment_settings/feedback')).toBe(false);
    expect(records.get('admin_youtube_comment_settings/feedback_lock').until).toBe(0);
  });
  it('blocks duplicate text across different comments and channels',async()=>{
    await invoke({op:'save',id:'a',revision:1,text:'Спасибо! Очень рады.'});
    records.set('admin_youtube_comments/b',{configId:'other',channelId:'other-channel',parentId:'other-parent',syncedAt:Date.now(),reply:{id:'b',channelId:'other-channel',parentId:'other-parent',text:'',revision:0,status:'draft',createdAt:1}});
    await expect(invoke({op:'save',id:'b',revision:0,text:'СПАСИБО — очень рады!!!'})).rejects.toThrow('duplicate_reply_rewrite');
  });
  it('rejects unauthorized callers before contacting YouTube',async()=>{
    await expect(invoke({op:'send',id:'a',token:'mock'},'other')).rejects.toThrow('Admin reply permission');
    expect(requests).toHaveLength(0);
  });
  it('publishes approved text once and prevents a second POST',async()=>{
    await expect(invoke({op:'send',id:'a',token:'mock'})).resolves.toEqual({status:'sent'});
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow();
    expect(requests.filter(r=>r.method==='POST')).toHaveLength(1);
    expect(records.get(rowPath).reply.status).toBe('sent');
  });
  it.each([{paused:true},{inFlightId:'other'},{notBefore:Date.now()+600000}])('blocks sends with queue state %j',async state=>{
    patch(queuePath,state);
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow();
    expect(requests.some(r=>r.method==='POST')).toBe(false);
  });
  it('editing revokes approval and stale tabs cannot approve',async()=>{
    await invoke({op:'save',id:'a',revision:1,text:'Changed'});
    await expect(invoke({op:'approve',id:'a',revision:1})).rejects.toThrow('draft_changed');
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow('approval_required');
    expect(requests.some(r=>r.method==='POST')).toBe(false);
  });
  it('does not reconcile or unlock an active request',async()=>{
    patch(rowPath,{'reply.status':'sending',deliveryStartedAt:Date.now()}); patch(queuePath,{inFlightId:'a'});
    await expect(invoke({op:'reconcile',id:'a',token:'mock'})).rejects.toThrow('delivery_still_running');
    expect(records.get(queuePath).inFlightId).toBe('a');
  });
  it('uncertain delivery is paused and cannot automatically retry',async()=>{
    const prior=global.fetch;
    global.fetch=jest.fn(async(url:any,init:any)=>{if(init.method==='POST') throw new Error('network lost');return prior(url,init);});
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow('delivery_uncertain');
    expect(records.get(rowPath).reply.status).toBe('uncertain'); expect(records.get(queuePath).paused).toBe(true);
    await invoke({op:'start'});
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow();
  });
  it('refuses approval during AI generation',async()=>{
    patch(rowPath,{generatingUntil:Date.now()+180000});
    await expect(invoke({op:'approve',id:'a',revision:1})).rejects.toThrow('generation_in_progress');
  });
  it('cannot send using a token for a different channel',async()=>{
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({items:[{id:'different-channel'}]})}) as Response);
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow('wrong_youtube_channel');
    expect(records.get(rowPath).reply.status).toBe('approved');
  });
  it('regeneration with insufficient knowledge revokes old approval',async()=>{
    global.fetch=jest.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'NEEDS_REVIEW'}}]})}) as Response);
    await expect(invoke({op:'generate',id:'a'})).resolves.toEqual({needsReview:true});
    expect(records.get(rowPath).reply.status).toBe('draft');
    expect(records.get(rowPath).reply.approval).toBeUndefined();
    expect(records.get(rowPath).needsReview).toBe(true);
    expect(records.get(rowPath).generatingUntil).toBeUndefined();
  });
  it('reconciles a terminated request without resending or blocking other rows',async()=>{
    patch(rowPath,{'reply.status':'sending',deliveryStartedAt:Date.now()-240000}); patch(queuePath,{inFlightId:'a'});
    await expect(invoke({op:'reconcile',id:'a',token:'mock'})).resolves.toEqual({status:'uncertain'});
    expect(records.get(rowPath).reply.status).toBe('uncertain');
    expect(records.get(queuePath).inFlightId).toBeUndefined();
    expect(records.get(queuePath).paused).toBe(true);
    expect(requests.some(r=>r.method==='POST')).toBe(false);
  });
  it('rejects an identical earlier YouTube reply and returns an editable draft',async()=>{
    const earlier={id:'earlier',snippet:{authorChannelId:{value:'channel'},textOriginal:'Approved answer'}};
    const prior=global.fetch;
    global.fetch=jest.fn(async(url:any,init:any)=>{
      if(new URL(url).searchParams.has('parentId'))return {ok:true,json:async()=>({items:[earlier]})} as Response;
      return prior(url,init);
    });
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow('duplicate_reply_rewrite');
    expect(requests.filter(r=>r.method==='POST')).toHaveLength(0);
    expect(records.get(rowPath).reply.status).toBe('draft');
    expect(records.get(rowPath).reply.approval).toBeUndefined();
  });
  it('clears the previous paused attempt baseline before any new lookup',async()=>{
    patch(rowPath,{deliveryBaselineIds:['old-reply']});
    const prior=global.fetch;
    global.fetch=jest.fn(async(url:any,init:any)=>{
      if(new URL(url).searchParams.has('parentId'))throw Error('lookup failed before POST');
      return prior(url,init);
    });
    await expect(invoke({op:'send',id:'a',token:'mock'})).rejects.toThrow('delivery_uncertain');
    expect(records.get(rowPath).deliveryBaselineIds).toBeUndefined();
    global.fetch=jest.fn(async(url:any,init:any)=>{
      if(new URL(url).searchParams.has('parentId'))return {ok:true,json:async()=>({items:[{id:'external-new',snippet:{authorChannelId:{value:'channel'},textOriginal:'Approved answer'}}]})} as Response;
      return prior(url,init);
    });
    await expect(invoke({op:'reconcile',id:'a',token:'mock'})).resolves.toEqual({status:'uncertain'});
    expect(requests.some(r=>r.method==='POST')).toBe(false);
  });
  it('does not downgrade delivery confirmed by another reconciler',async()=>{
    patch(rowPath,{'reply.status':'uncertain',deliveryBaselineIds:[]});
    const prior=global.fetch;
    global.fetch=jest.fn(async(url:any,init:any)=>{
      if(new URL(url).searchParams.has('parentId')){
        patch(rowPath,{'reply.status':'sent',sentId:'confirmed-by-other-request'});
        return {ok:true,json:async()=>({items:[]})} as Response;
      }
      return prior(url,init);
    });
    await expect(invoke({op:'reconcile',id:'a',token:'mock'})).resolves.toEqual({status:'sent'});
    expect(records.get(rowPath).sentId).toBe('confirmed-by-other-request');
  });
});
