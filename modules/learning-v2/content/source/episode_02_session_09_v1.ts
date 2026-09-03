import { EPISODE_02_SESSION_07_SOURCE } from './episode_02_session_07_v1';
import { EPISODE_02_SESSION_05_SOURCE } from './episode_02_session_05_v1';
import { EPISODE_02_SESSION_06_SOURCE } from './episode_02_session_06_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v))as T;
const rewrite=<T,>(v:T):T=>{const p:readonly(readonly[string,string])[]=[['e02-s07','e02-s09'],['necessary','possible'],['Necessary','Possible'],['angry','tall'],['Angry','Tall'],['scared','short'],['Scared','Short']];const visit=(x:unknown):unknown=>typeof x==='string'?p.reduce((s,[a,b])=>s.replaceAll(a,b),x):Array.isArray(x)?x.map(visit):x&&typeof x==='object'?Object.fromEntries(Object.entries(x as Record<string,unknown>).map(([k,y])=>[k,visit(y)])):x;return visit(v)as T};
const source=rewrite(clone(EPISODE_02_SESSION_07_SOURCE))as SessionSource&{requiredSessionOrdinal:number;generationInputFingerprint:string;canDoOutcomeId:string;introPages:any[];retrievalVocabulary?:readonly any[]};
source.requiredSessionOrdinal=9;source.generationInputFingerprint='full-b1-exact-question-possible-e02-s09-v1';source.canDoOutcomeId='obj-en-present-be-yes-no-question';
source.retrievalVocabulary=[...(source.retrievalVocabulary??[]),EPISODE_02_SESSION_05_SOURCE.newVocabulary?.[0],EPISODE_02_SESSION_06_SOURCE.newVocabulary?.[0]].filter(Boolean);
source.introPages=source.introPages.map((page:any,index:number)=>{
  const choices=index===0?['Is it possible?','It is possible.','Is possible it?']:index===1?['Is it real?','It is real.','Is real it?']:['Is it fake?','It is fake.','Is fake it?'];
  const locales=Object.keys(page.question.choices[0]);
  const causal:any={ru:`${choices[0]} — правильно: глагол стоит перед подлежащим в вопросе.`,uk:`${choices[0]} — правильно: дієслово стоїть перед підметом у питанні.`,es:`${choices[0]} es correcta porque el verbo va antes del sujeto en la pregunta.`,en:`${choices[0]} is correct because the verb comes before the subject in this question.`,"pt-BR":`${choices[0]} está correta porque o verbo vem antes do sujeito na pergunta.`,vi:`${choices[0]} đúng vì động từ đứng trước chủ ngữ trong câu hỏi.`,id:`${choices[0]} benar karena kata kerja berada sebelum subjek dalam pertanyaan.`,tr:`${choices[0]} doğrudur çünkü soruda fiil özneden önce gelir.`,pl:`${choices[0]} jest poprawne, ponieważ w pytaniu czasownik stoi przed podmiotem.`};
  return {...page,body:Object.fromEntries(locales.map(locale=>[locale,`${page.body[locale]} ${choices[0]}`])),question:{...page.question,correctChoiceIndex:0,choices:choices.map(value=>Object.fromEntries(locales.map(locale=>[locale,value]))),explanation:causal}};
});
source.introPages[1].body.ru='Are you ready?';
source.introPages[1].body.uk='Are you ready?';
source.introPages[2].body.ru='Is she here?';
source.introPages[2].body.uk='Is she here?';
for (const index of [1, 2]) {
  const page: any = source.introPages[index];
  const choices = index === 1 ? ['Is it real?', 'It is real.', 'Is real it?'] : ['Is it fake?', 'It is fake.', 'Is fake it?'];
  const locales = Object.keys(page.question.choices[0]);
  page.body.ru = `${choices[0]} Это вопрос с is перед it.`;
  page.body.uk = `${choices[0]} Це питання з is перед it.`;
  page.question.choices = choices.map((value) => Object.fromEntries(locales.map((locale) => [locale, value])));
  page.question.explanation.ru = `${choices[0]} — правильно, потому что is стоит перед it.`;
  page.question.explanation.uk = `${choices[0]} — правильно, тому що is стоїть перед it.`;
  const localized: any = {
    es: [`${choices[0]} Es una pregunta con is antes de it.`, `${choices[0]} es correcta porque is va antes de it.`],
    'pt-BR': [`${choices[0]} É uma pergunta com is antes de it.`, `${choices[0]} está correta porque is vem antes de it.`],
    vi: [`${choices[0]} Đây là câu hỏi có is đứng trước it.`, `${choices[0]} đúng vì is đứng trước it.`],
    id: [`${choices[0]} Ini pertanyaan dengan is sebelum it.`, `${choices[0]} benar karena is berada sebelum it.`],
    tr: [`${choices[0]} Bu, is sözcüğünün it önünde olduğu bir sorudur.`, `${choices[0]} doğrudur çünkü is, it sözcüğünden önce gelir.`],
    pl: [`${choices[0]} To pytanie z is przed it.`, `${choices[0]} jest poprawne, ponieważ is stoi przed it.`],
  };
  for (const [locale, [body, explanation]] of Object.entries(localized)) {
    page.body[locale] = body;
    page.question.explanation[locale] = explanation;
  }
}
export const EPISODE_02_SESSION_09_SOURCE:SessionSource=Object.freeze(source);
