import {normalizedReply,uniqueReplyKey,parseReplyTopics,topicReady,assertTopicStorageLimit} from './youtube_comment_topics';
describe('unique replies and owner-led knowledge',()=>{
 it('rejects punctuation, case and Unicode compatibility duplicates',()=>{
  expect(uniqueReplyKey('Спасибо!  Очень рады.')).toBe(uniqueReplyKey('СПАСИБО — очень рады!!!'));
  expect(uniqueReplyKey('Ｈｅｌｌｏ')).toBe(uniqueReplyKey('hello'));
  expect(normalizedReply('Текст\nответа')).toBe('текст ответа');
  expect(uniqueReplyKey('Урок доступен в разделе А')).not.toBe(uniqueReplyKey('Урок доступен в разделе Б'));
 });
 it('requires coverage of actual comments exactly once',()=>{
  const category={title:'Начало обучения',summary:'Как начать',questions:['Что посоветовать новичку?'],commentIds:['a']};
  const topics=parseReplyTopics({categories:[category]},['a']);
  expect(topicReady(topics[0])).toBe(false);
  expect(topicReady({...topics[0],answers:['Начать с первого урока.']})).toBe(true);
  expect(()=>parseReplyTopics({categories:[category]},['a','b'])).toThrow('analysis_incomplete');
  expect(()=>parseReplyTopics({categories:[{...category,commentIds:['unknown']}]},['a'])).toThrow('analysis_invalid');
  expect(()=>parseReplyTopics({categories:[category,category]},['a'])).toThrow('analysis_invalid');
 });
 it('bounds actual UTF-8 document bytes before Firestore writes',()=>{
  const topic={id:'t',title:'Тема',summary:'Текст',questions:['Вопрос?'],answers:['Я'.repeat(5000)],commentIds:[]};
  expect(()=>assertTopicStorageLimit([topic])).not.toThrow();
  expect(()=>assertTopicStorageLimit(Array.from({length:40},(_,i)=>({...topic,id:String(i),answers:Array(4).fill('Я'.repeat(5000))})))).toThrow('knowledge_size_limit');
 });
});
