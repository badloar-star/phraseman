// Deterministic extraction of authored course examples. No user/account data.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function literal(n) {
  if (!n) return undefined;
  if (ts.isStringLiteralLike(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
  if (ts.isObjectLiteralExpression(n)) return Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text, literal(p.initializer)]));
}
function objects(file, predicate) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found = [];
  function visit(n) { if (ts.isObjectLiteralExpression(n)) { const v = literal(n); if (predicate(v)) found.push({value:v,line:source.getLineAndCharacterOfPosition(n.getStart(source)).line+1}); } ts.forEachChild(n, visit); }
  visit(source); return found;
}
const tasks = [];
function add(t) { tasks.push({...t,target:'en',provenance:'authored',history:'demo'}); }
const v2base = 'modules/learning-v2/content/factory_native/generated_release/en/l01/s01/';
const learner = JSON.parse(read(v2base+'learner.json'));
const answers = JSON.parse(read(v2base+'answers.json'));
for (const suffix of ['i04','i08','i09','i10','i11','i12','i14']) {
  const i=learner.interactions.find(v=>v.interactionId.endsWith(':'+suffix)), p=i.modePayload, a=answers.find(v=>v.interactionId===i.interactionId);
  const modes={listen_choose:'listen',speed_match:'pairs',phrase_builder:'build',context_gap_grammar:'gap',listen_build_dictation:'dictation',scripted_repeat_compare:'speech'};
  add({id:suffix,source:'Learning V2',mode:modes[i.family],title:i.prompt,prompt:p.localizedScene?.ru||p.localizedMeaning?.ru||i.prompt,phrase:p.gappedTargetPhrase||'',answer:a.correctText||p.targetPhrase||p.hiddenTargetPhrase||'',options:(p.gapOptions||i.responseOptions).map(o=>({id:o.responseId,text:o.text})),tokens:p.orderedTokens||[],distractors:p.authoredDistractorTokens||[],pairs:p.pairGrid||[],audio:p.referenceAudio?.transcript||null,feedback:p.choiceFeedback||[],payload:p,sourceFile:v2base+'learner.json',sourceId:i.interactionId});
}
const intro=JSON.parse(read(v2base+'intro.json')).pages[0];
add({id:'intro',source:'Learning V2 · интро',mode:'choice',title:'Первое знакомство',prompt:intro.question.promptByLocale.ru,options:intro.question.choicesByLocale.ru.map(o=>({id:o.responseId,text:o.text})),answer:intro.question.choicesByLocale.ru[0].text,explanation:intro.bodyByLocale.ru,sourceFile:v2base+'intro.json',sourceId:intro.question.interactionId});
for (const type of ['fill','error','choice4']) {
  const file='app/exam.tsx', row=objects(file,v=>v.q&&v.opts&&Number.isInteger(v.correct)&&(v.type||'fill')===type)[0], v=row.value;
  add({id:'exam-'+type,source:'Экзамен',mode:type==='fill'?'gap':'choice',title:type==='error'?'Исправить ошибку':type==='choice4'?'Выбрать предложение':'Заполнить пропуск',prompt:type==='fill'?'Выберите пропущенное слово':v.q,phrase:type==='fill'?v.q:'',options:v.opts.map((text,i)=>({id:String(i),text})),answer:v.opts[v.correct],sourceFile:file,sourceLine:row.line});
}
const dfile='app/diagnostic_test.tsx', dr=objects(dfile,v=>v.type==='type'&&v.answer&&v.phrase)[0];
add({id:'typing',source:'Диагностика',mode:'typing',title:'Ввести слово',prompt:'Введите пропущенное слово',phrase:dr.value.phrase,answer:dr.value.answer,meaning:dr.value.hintRU,sourceFile:dfile,sourceLine:dr.line});
const wfile='app/lesson_words.tsx', words=objects(wfile,v=>v.en&&v.ru&&v.pos).map(r=>({...r.value,line:r.line}));
const word=words.find(w=>w.en==='ready'), distractors=[...new Map(words.filter(w=>w.pos==='adjectives'&&w.en!==word.en).map(w=>[w.en,w])).values()].slice(0,3);
for (const source of ['Слова урока','Карточки · блиц','Карточки · свайп']) add({id:source==='Слова урока'?'word':source.includes('блиц')?'blitz':'swipe',source,mode:source.includes('свайп')?'swipe':'choice',title:source.includes('свайп')?'Правильный перевод?':'Выбрать слово',prompt:source.includes('свайп')?word.en:word.ru,shown:word.ru,answer:source.includes('свайп')?'Да':word.en,meaning:word.ru,options:[word,...distractors].map((w,i)=>({id:String(i),text:w.en})),sourceFile:wfile,sourceLine:word.line,adaptation:'Реальные словарные данные; демонстрационный набор карточек и вариантов.'});
const vf='app/irregular_verbs_data.ts', vr=objects(vf,v=>v.base==='go'&&v.past&&v.pp)[0];
for(const form of ['past','pp']) add({id:'verb-'+form,source:'Неправильные глаголы',mode:'verb',title:form==='past'?'Прошедшая форма':'Третья форма',prompt:form==='past'?'Выберите Past Simple':'Выберите Past Participle',phrase:vr.value.base,meaning:vr.value.ru,answer:vr.value[form],forms:[vr.value.base,vr.value.past,vr.value.pp],options:[vr.value.base,vr.value.past,vr.value.pp].map((text,i)=>({id:String(i),text})),sourceFile:vf,sourceLine:vr.line,adaptation:'Формы из словаря; порядок вариантов в макете демонстрационный.'});
fs.writeFileSync(path.join(__dirname,'real-data.js'),'window.REAL_TASKS = '+JSON.stringify(tasks,null,2)+';\n');
console.log('Extracted '+tasks.length+' authored examples.');
