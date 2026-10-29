import {parseFeedback,mergeFeedback,feedbackTopicId} from './youtube_feedback';
const row={id:'a',configId:'de',channelId:'channel',videoId:'video',commentId:'comment',text:'Говорите медленнее'};
const signal={kind:'request',category:'format',title:'Замедлить речь'};
const payload=(signals:unknown[]= [signal])=>({comments:[{id:'a',skipReply:false,signals}]});
test('requires exact coverage and refuses foreign or duplicated IDs',()=>{
 expect(()=>parseFeedback(payload(),['a','b'])).toThrow();
 expect(()=>parseFeedback(payload(),['b'])).toThrow();
 expect(()=>parseFeedback({comments:[...payload().comments,...payload().comments]},['a'])).toThrow();
});
test('counts a comment once per topic, merges channels and preserves sources',()=>{
 const parsed=parseFeedback(payload([signal,signal]),['a']);
 expect(parsed[0].signals).toHaveLength(1);
 const first=mergeFeedback([],parsed,[row],1);
 const other={...row,id:'b',configId:'fr'};
 const second=mergeFeedback(first,parseFeedback({comments:[{id:'b',skipReply:false,signals:[signal]}]},['b']),[other],2);
 expect(second[0].count).toBe(2);expect(second[0].channels).toEqual({de:1,fr:1});expect(second[0].examples).toHaveLength(2);
});
test('canonical identity is stable and separates complaint from request',()=>{
 expect(feedbackTopicId(signal)).toBe(feedbackTopicId({...signal,title:' ЗАМЕДЛИТЬ РЕЧЬ '}));
 expect(feedbackTopicId(signal)).not.toBe(feedbackTopicId({...signal,kind:'complaint'}));
});
test('voice criticism can be captured while suppressing reply; praise has no signal',()=>{
 expect(parseFeedback({comments:[{id:'a',skipReply:true,skipReason:'ai_or_voice',skipEvidence:'озвучка',signals:[{kind:'complaint',category:'audio',title:'Неестественная озвучка'}]}]},['a'])[0].skipReply).toBe(true);
 expect(parseFeedback(payload([]),['a'])[0].signals).toEqual([]);
});
test('rejects an unexplained AI decision to suppress a reply',()=>{
 expect(()=>parseFeedback({comments:[{id:'a',skipReply:true,signals:[]}]},['a'])).toThrow();
});
test.each([{...signal,kind:'unknown'},{...signal,category:'other_fake'},{...signal,title:''}])('rejects invalid model signal %p',bad=>expect(()=>parseFeedback(payload([bad]),['a'])).toThrow());
