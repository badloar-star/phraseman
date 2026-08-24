import { basename, dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';
import {
  REVIEW_LOCALES,
  evaluateLesson1Chapter,
  parseChapterRange,
} from './learning_v2_lesson1_chapter_gate.mjs';
import { assertLesson1ReviewScope } from './learning_v2_lesson1_authoring_scope.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DIR = resolve(ROOT, '.superpowers/brainstorm/871-1787210859/content');

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function localized(value) {
  return Object.fromEntries(REVIEW_LOCALES.map((locale) => [locale, value[locale]]));
}

function choiceToken(answer) {
  const cleaned = answer
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 160) : 'blank';
}

function targetTerms(values) {
  const terms = new Set();
  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) continue;
    terms.add(value);
    for (const token of value.match(/[A-Za-z]+(?:[’'][A-Za-z]+)*/gu) ?? []) {
      if (token.length >= 2 || token === 'I') terms.add(token);
    }
  }
  return [...terms].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function projectSession(source, plan, shardBuilder, childBuilder) {
  const shard = shardBuilder.buildSessionShardFromSource(source);
  const courseSessionId = `lesson-01:session:${String(source.requiredSessionOrdinal).padStart(2, '0')}`;
  const childrenByLocale = Object.fromEntries(
    REVIEW_LOCALES.map((locale) => [
      locale,
      childBuilder.buildSessionChildBodiesFromShard(shard, locale, courseSessionId),
    ]),
  );
  const learnerByLocale = Object.fromEntries(
    REVIEW_LOCALES.map((locale) => [locale, childrenByLocale[locale].learner]),
  );
  const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
  const practice = learnerByLocale.ru.interactions.map((interaction, index) => {
    const card = practiceCards[index];
    const auxiliary = childrenByLocale.ru.auxiliary.entries.find(
      (entry) => entry.interactionId === interaction.interactionId,
    );
    const meaningByLocale = Object.fromEntries(
      REVIEW_LOCALES.map((locale) => [
        locale,
        card.contentItem.learnerMeanings.find((meaning) => meaning.locale === locale)?.value ?? '',
      ]),
    );
    const responseLanguage = interaction.family === 'listen_choose' ? 'explanation' : 'target';
    const projectedOptions = Object.fromEntries(
      REVIEW_LOCALES.map((locale) => [
        locale,
        learnerByLocale[locale].interactions[index].responseOptions,
      ]),
    );
    return {
      ordinal: index + 1,
      slot: interaction.ordinal,
      interactionId: interaction.interactionId,
      family: interaction.family,
      inputMode: interaction.inputMode,
      purpose: interaction.purpose,
      support: card.support,
      promptNovelty: card.promptNovelty,
      target: card.contentItem.target.text,
      targetTerms: targetTerms([
        card.contentItem.target.text,
        ...(responseLanguage === 'target'
          ? learnerByLocale.ru.interactions[index].responseOptions.map((option) => option.text)
          : []),
      ]),
      responseLanguage,
      meaningByLocale,
      promptByLocale: Object.fromEntries(
        REVIEW_LOCALES.map((locale) => [locale, learnerByLocale[locale].interactions[index].prompt]),
      ),
      responseOptionsByLocale: projectedOptions,
      correctResponseId:
        interaction.inputMode === 'single_choice'
          ? choiceToken(card.contentItem.target.text)
          : null,
      correctText:
        interaction.inputMode === 'ordered_tokens'
          ? card.contentItem.target.text.replace(/[?.!,]/gu, '')
          : card.contentItem.target.text,
      hintByLocale: localized(card.hintByLocale),
      successByLocale: localized(card.successMessageByLocale),
      retryByLocale: localized(card.retryMessageByLocale),
      errorByLocale: localized(card.errorExplanationByLocale),
      responseFeedbackById: auxiliary?.responseFeedbackById ?? {},
    };
  });
  return {
    ordinal: source.requiredSessionOrdinal,
    kind: plan.kind,
    interactionProfile: learnerByLocale.ru.interactionProfile,
    title: localized(source.title),
    summary: localized(source.summary),
    learningGoal: localized(source.learningGoal),
    targetTerms: targetTerms([
      ...source.phrases.map((phrase) => phrase.english),
      ...source.introPages.flatMap((page) => page.question.choices.map((choice) => choice.ru)),
    ]),
    zone: shard.zone,
    support: shard.support,
    map: {
      kind: plan.kind,
      teaches: plan.teaches,
      builtOn: plan.builtOn,
      recalls: plan.recalls ?? [],
      families: [...new Set(practice.map((task) => task.family))],
    },
    intro: source.introPages.map((page) => ({
      kind: page.kind,
      title: localized(page.title),
      body: localized(page.body),
      bodyRuns: Object.fromEntries(
        REVIEW_LOCALES.map((locale) => [
          locale,
          page.bodyRuns?.[locale] ?? [{ text: page.body[locale], semantic: 'explanation' }],
        ]),
      ),
      targetTerms: targetTerms([
        ...page.question.choices.map((choice) => choice.ru),
        ...REVIEW_LOCALES.flatMap((locale) =>
          (page.bodyRuns?.[locale] ?? [])
            .filter((run) => run.semantic !== 'explanation' && run.semantic !== 'nativeGloss')
            .map((run) => run.text),
        ),
      ]),
      prompt: localized(page.question.prompt),
      choices: page.question.choices.map(localized),
      correctChoiceIndex: page.question.correctChoiceIndex,
      explanation: localized(page.question.explanation),
    })),
    practice,
  };
}

function htmlDocument(dataFileName, materialsFileName, from, to, sessionCount) {
  const sessionSummary =
    from === 1 && to === 56
      ? '56 полных интерактивных сессий'
      : `${sessionCount} собранных интерактивных сессий · ${from}–${to}`;
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Learning V2 · Lesson 1 · exact sessions</title>
<style>
:root{--page:#14131f;--panel:#14131f;--surface:#1c1b2e;--surface2:#2a2952;--text:#f1efff;--muted:#9a95c2;--target:#c8c3ff;--wrong:#f26d8a;--ok:#61d7a5;--line:rgba(200,195,255,.16);--glow:rgba(200,195,255,.16);--on:#17162b}
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{background:#09090d;color:#f5f5f5;font:16px/1.55 Inter,Segoe UI,sans-serif}button,select{font:inherit}button,a,select{cursor:pointer}.app{min-height:100vh;background:radial-gradient(circle at 50% -15%,#252143 0,transparent 30%),#09090d}.top{position:sticky;top:0;z-index:20;background:#09090df2;backdrop-filter:blur(16px);border-bottom:1px solid #2d2b38;padding:12px 18px}.topline{display:flex;gap:12px;align-items:center;flex-wrap:wrap;max-width:1320px;margin:auto}.brand{margin-right:auto}.brand strong{display:block;font:750 20px/1.1 Georgia,serif}.brand span{color:#a7a5b7;font-size:12px}.viewlink,.control{min-height:44px;border:1px solid #373544;background:#13131a;color:#d9d6e7;border-radius:12px;padding:9px 13px;text-decoration:none}.viewlink.active{background:#f3f1ff;color:#191724;border-color:#f3f1ff;font-weight:850}.viewlink:hover,.control:hover,.viewlink:focus-visible,.control:focus-visible{border-color:#8a86a2;outline:2px solid transparent}.layout{display:grid;grid-template-columns:260px minmax(400px,760px);gap:22px;max-width:1080px;margin:auto;padding:22px}.side{position:sticky;top:82px;align-self:start;max-height:calc(100vh - 104px);overflow:auto;background:#111118;border:1px solid #2d2b38;border-radius:18px;padding:15px}.side h2{font-size:13px;text-transform:uppercase;letter-spacing:.11em;color:#aaa7b8;margin:0 0 12px}.chapter{margin-bottom:15px}.chapter-title{font:800 11px ui-monospace;color:#777386;margin:8px 5px}.session-button{width:100%;min-height:44px;text-align:left;border:1px solid transparent;background:transparent;color:#aaa7b8;border-radius:11px;padding:8px 10px}.session-button:hover,.session-button:focus-visible{background:#1a1922;color:#fff;outline:2px solid var(--target);outline-offset:1px}.session-button.active{background:var(--surface);border-color:var(--line);color:var(--target);font-weight:800}.phone{background:var(--page);border:1px solid var(--line);border-radius:28px;overflow:hidden;box-shadow:0 24px 70px #0008,0 0 30px var(--glow);color:var(--text);min-height:780px;display:flex;flex-direction:column}.phonebar{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}.square{width:44px;height:44px;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:14px}.session-head{flex:1}.session-head strong{display:block}.session-head span{color:var(--muted);font-size:12px}.counter{font:800 11px ui-monospace;color:var(--target)}.progress{height:4px;background:var(--surface2)}.progress i{display:block;height:100%;background:var(--target);transition:width .22s}.screen{padding:25px;flex:1}.eyebrow{color:var(--target);font:850 11px ui-monospace;letter-spacing:.14em;text-transform:uppercase}.screen h1{font:750 clamp(27px,4vw,34px)/1.13 Georgia,serif;margin:11px 0 17px}.copy{font-size:17px;line-height:1.72}.copy .targetCorrect,.target{color:var(--target);font-weight:900}.copy .targetWrong,.wrong-token{color:var(--wrong);font-weight:850;text-decoration:line-through}.question{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}.question h3{font-size:15px;margin:0 0 11px}.answer,.tile{min-height:48px;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:13px;padding:11px 14px;font-weight:700;transition:border-color .18s,background .18s}.answer{display:block;width:100%;text-align:left;margin:8px 0}.answer:hover,.tile:hover,.answer:focus-visible,.tile:focus-visible{border-color:var(--target);outline:2px solid transparent}.answer.correct{border-color:var(--ok);box-shadow:inset 3px 0 var(--ok)}.answer.wrong{border-color:var(--wrong)}.task-prompt{font-size:20px;line-height:1.5;margin:14px 0 20px}.tiles{display:flex;gap:9px;flex-wrap:wrap}.tile.selected{background:var(--target);color:var(--on);border-color:var(--target)}.answer-well{min-height:66px;border:1px dashed var(--line);border-radius:15px;padding:10px;display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.placeholder{color:var(--muted)}.feedback{min-height:58px;margin-top:16px;border-left:3px solid var(--target);padding:10px 13px;background:var(--surface);border-radius:0 12px 12px 0;color:var(--muted)}.feedback.ok{border-color:var(--ok);color:var(--text)}.feedback.bad{border-color:var(--wrong);color:var(--text)}.phonefooter{padding:15px 18px 20px;display:grid;grid-template-columns:auto 1fr;gap:10px}.hint,.next{min-height:52px;border-radius:15px;font-weight:900}.hint{border:1px solid var(--line);background:var(--surface);color:var(--text);padding:0 16px}.next{border:0;background:var(--target);color:var(--on)}.next:disabled{opacity:.36;cursor:not-allowed}.complete{text-align:center;padding-top:90px}.complete h1{font-size:42px}.complete p{color:var(--muted)}.mobile-nav{display:none}.shake{animation:shake .24s linear}@keyframes shake{25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-3px)}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}@media(max-width:1080px){.layout{grid-template-columns:minmax(360px,760px);justify-content:center}.side{display:none}.mobile-nav{display:flex;gap:8px;padding:0 18px 12px}.mobile-nav select{flex:1}}@media(max-width:760px){.layout{display:block;padding:10px}.phone{min-height:740px;border-radius:22px}.top{padding:10px}.brand{width:100%}.viewlink{flex:1;text-align:center}.screen{padding:21px 17px}.phonefooter{grid-template-columns:1fr}.mobile-nav{padding:0 10px 10px}.copy{font-size:16px}}
.target-language{color:var(--target)!important;font-weight:900;font-family:Inter,Segoe UI,sans-serif;letter-spacing:.005em}.explanation-language{color:inherit;font-weight:inherit}.tile.selected .target-language{color:var(--on)!important}
</style></head><body><div class="app">
<header class="top"><div class="topline"><div class="brand"><strong>Урок 1 · to be</strong><span>${sessionSummary}</span></div><a class="viewlink active" href="#">Прохождение</a><a class="viewlink" href="./${materialsFileName}">Все созданные материалы</a><select id="locale" class="control" aria-label="Язык объяснения"></select><select id="theme" class="control" aria-label="Тема интерфейса"><option value="indigo">Индиго</option><option value="sage">Нефрит</option><option value="olive">Олива</option><option value="midnight">Полночь</option><option value="ember">Янтарь</option><option value="aurora">Сияние</option><option value="volt">Лайм</option><option value="forest">Форест</option><option value="gold">Золото</option></select></div></header>
<div class="mobile-nav"><button id="mobilePrev" class="control" aria-label="Предыдущая сессия">←</button><select id="mobileSession" class="control" aria-label="Сессия"></select><button id="mobileNext" class="control" aria-label="Следующая сессия">→</button></div>
<main class="layout"><nav class="side" aria-label="Сессии"><h2>Порядок урока</h2><div id="sessionList"></div></nav><section class="phone" aria-live="polite"><div class="phonebar"><button id="back" class="square" aria-label="Назад">‹</button><div class="session-head"><strong id="sessionTitle"></strong><span id="sessionSubtitle"></span></div><span class="counter" id="counter"></span></div><div class="progress"><i id="progress"></i></div><div class="screen" id="screen"></div><footer class="phonefooter"><button id="hint" class="hint">Подсказка</button><button id="next" class="next">Продолжить</button></footer></section></main>
</div><script src="./${dataFileName}"></script><script>
(()=>{const d=window.__LEARNING_V2_REAL_SESSION_DATA__,$=s=>document.querySelector(s);let si=0,step=0,locale='ru',attempts=0,done=false,selected=[];const palettes={indigo:['#14131f','#1c1b2e','#2a2952','#f1efff','#9a95c2','#c8c3ff','#f26d8a','#61d7a5','#17162b'],sage:['#dce1d8','#fcfdf9','#e1e5dc','#17201d','#52605a','#315f50','#a8464d','#247451','#fff'],olive:['#080907','#171a12','#25291d','#f3eedb','#a69f8a','#e3cc88','#c77160','#6fcb87','#161208'],midnight:['#03040a','#0d101e','#202641','#fff','#a9aecb','#8fa0ff','#ff6e8a','#5ce0ac','#0d1030'],ember:['#060302','#140c07','#2d1c10','#fff','#c9b4a4','#ffcc55','#ff5c6e','#63d59a','#2a1a02'],aurora:['#030705','#0a120e','#192a20','#fff','#a7c0b5','#3de8a6','#ff6470','#62dfaa','#052a1c'],volt:['#040502','#101305','#252b10','#fff','#bfc6a3','#c6ff34','#ff5c5c','#70df9e','#182002'],forest:['#030604','#101710','#203028','#f0f7f2','#8ab49a','#58cc89','#f05454','#66d59a','#042010'],gold:['#050402','#11100d','#26221b','#f8f1df','#a79d88','#d6b35a','#b65a4a','#62d097','#0a0702']};const norm=v=>String(v).normalize('NFKC').toLocaleLowerCase('en').match(/[\\p{L}\\p{N}]+(?:'[\\p{L}\\p{N}]+)*/gu)?.join(' ')||'';const loc=v=>v?.[locale]??'';const session=()=>d.sessions[si];const task=()=>step>=3?session().practice[step-3]:null;const total=()=>3+session().practice.length;
function reset(){attempts=0;done=false;selected=[];render()}
function list(){const root=$('#sessionList');root.replaceChildren();for(let c=1;c<=7;c++){const box=document.createElement('div');box.className='chapter';const h=document.createElement('div');h.className='chapter-title';h.textContent='ГЛАВА '+c+' · '+((c-1)*8+1)+'–'+c*8;box.append(h);d.sessions.slice((c-1)*8,c*8).forEach((s,i)=>{const b=document.createElement('button');b.className='session-button'+(s.ordinal===session().ordinal?' active':'');b.textContent=String(s.ordinal).padStart(2,'0')+' · '+loc(s.title);b.onclick=()=>{si=(c-1)*8+i;step=0;reset()};box.append(b)});root.append(box)}}
function termBoundary(text,start,term){const word=/[\p{L}\p{N}_]/u,before=start>0?text[start-1]:'',after=text[start+term.length]??'';return !(word.test(term[0]??'')&&word.test(before))&&!(word.test(term[term.length-1]??'')&&word.test(after))}
function appendSemanticText(root,text,terms=[],forceTarget=false){if(forceTarget){const span=document.createElement('span');span.className='target-language';span.textContent=text;root.append(span);return}const ordered=[...new Set(terms)].filter(Boolean).sort((a,b)=>b.length-a.length||a.localeCompare(b));let cursor=0,plain='';const flush=()=>{if(!plain)return;const span=document.createElement('span');span.className='explanation-language';span.textContent=plain;root.append(span);plain=''};while(cursor<text.length){const term=ordered.find(candidate=>text.startsWith(candidate,cursor)&&termBoundary(text,cursor,candidate));if(term){flush();const span=document.createElement('span');span.className='target-language';span.textContent=term;root.append(span);cursor+=term.length}else{plain+=text[cursor];cursor++}}flush()}
function semanticText(root,text,terms=[],forceTarget=false){root.replaceChildren();appendSemanticText(root,String(text??''),terms,forceTarget)}
function introBody(page){const wrap=document.createElement('div');wrap.className='copy';(page.bodyRuns[locale]||[{text:loc(page.body),semantic:'explanation'}]).forEach(run=>{if(run.semantic==='explanation'){appendSemanticText(wrap,run.text,page.targetTerms)}else{const span=document.createElement('span');span.className=run.semantic;span.textContent=run.text;wrap.append(span)}});return wrap}
function introScreen(page){const f=document.createDocumentFragment(),eye=document.createElement('div');eye.className='eyebrow';eye.textContent=page.kind;const h=document.createElement('h1');semanticText(h,loc(page.title),page.targetTerms);const q=document.createElement('div');q.className='question';const qh=document.createElement('h3');semanticText(qh,loc(page.prompt),page.targetTerms);q.append(qh);page.choices.forEach((choice,index)=>{const b=document.createElement('button');b.className='answer'+(done?(index===page.correctChoiceIndex?' correct':''):'');semanticText(b,loc(choice),page.targetTerms,true);b.onclick=()=>{if(done)return;if(index===page.correctChoiceIndex){done=true;feedback(loc(page.explanation),'ok')}else{attempts++;feedback(loc(page.explanation),'bad',true)}renderFooter()};q.append(b)});const fb=document.createElement('div');fb.id='feedback';fb.className='feedback';fb.textContent='Выберите один вариант.';f.append(eye,h,introBody(page),q,fb);return f}
function shuffled(options,t){return [...options].sort((a,b)=>(a.responseId+t.interactionId).localeCompare(b.responseId+t.interactionId)*(t.slot%2?1:-1))}
  function practiceScreen(t){const f=document.createDocumentFragment(),eye=document.createElement('div');eye.className='eyebrow';eye.textContent='ЗАДАНИЕ '+t.ordinal+' / '+session().practice.length;const p=document.createElement('div');p.className='task-prompt';semanticText(p,loc(t.promptByLocale),t.targetTerms);f.append(eye,p);const opts=shuffled(t.responseOptionsByLocale[locale],t);if(t.inputMode==='ordered_tokens'){const well=document.createElement('div');well.className='answer-well';if(!selected.length){const e=document.createElement('span');e.className='placeholder';e.textContent='Нажимайте плитки в нужном порядке';well.append(e)}selected.forEach(id=>{const o=opts.find(x=>x.responseId===id);const b=document.createElement('button');b.className='tile selected';semanticText(b,o?.text||'',t.targetTerms,true);b.onclick=()=>{selected=selected.filter(x=>x!==id);render()};well.append(b)});const tiles=document.createElement('div');tiles.className='tiles';opts.forEach(o=>{const b=document.createElement('button');b.className='tile'+(selected.includes(o.responseId)?' selected':'');semanticText(b,o.text,t.targetTerms,true);b.disabled=selected.includes(o.responseId);b.onclick=()=>{selected.push(o.responseId);render()};tiles.append(b)});f.append(well,tiles)}else if(t.inputMode==='scripted_speech'){const b=document.createElement('button');b.className='answer';b.innerHTML='<span class="target-language">'+escapeHtml(t.target)+'</span><br><small>Нажмите после повторения вслух</small>';b.onclick=()=>{done=true;feedback(loc(t.successByLocale),'ok');renderFooter()};f.append(b)}else{const box=document.createElement('div');box.className='choices';opts.forEach(o=>{const b=document.createElement('button');b.className='answer'+(done&&o.responseId===t.correctResponseId?' correct':'');semanticText(b,o.text,t.targetTerms,t.responseLanguage==='target');b.onclick=()=>{if(done)return;if(o.responseId===t.correctResponseId){done=true;feedback(loc(t.successByLocale),'ok')}else{attempts++;feedback(loc(t.responseFeedbackById?.[o.responseId])||loc(t.retryByLocale),'bad',true)}renderFooter()};box.append(b)});f.append(box)}const fb=document.createElement('div');fb.id='feedback';fb.className='feedback';fb.textContent='Выполните задание.';f.append(fb);return f}
function feedback(text,type,shake=false){const e=$('#feedback');if(!e)return;e.className='feedback '+type;semanticText(e,text,task()?.targetTerms??session().targetTerms);if(shake){e.classList.add('shake');setTimeout(()=>e.classList.remove('shake'),260)}}
  function renderFooter(){const t=task(),hint=$('#hint'),next=$('#next');hint.style.visibility=t&&t.support==='none'?'hidden':'visible';hint.onclick=()=>feedback(t?loc(t.hintByLocale):loc(session().intro[step].explanation),'');next.textContent=step===total()-1?'Завершить':'Продолжить';next.disabled=t?.inputMode==='ordered_tokens'?!selected.length:!done;next.onclick=()=>{if(t?.inputMode==='ordered_tokens'&&!done){const opts=t.responseOptionsByLocale[locale],answer=selected.map(id=>opts.find(o=>o.responseId===id)?.text||'').join(' ');if(norm(answer)===norm(t.correctText)){done=true;feedback(loc(t.successByLocale),'ok')}else{attempts++;const trapId=selected.find(id=>t.responseFeedbackById?.[id]);feedback(loc(t.responseFeedbackById?.[trapId])||loc(t.retryByLocale),'bad',true)}renderFooter();return}if(!done)return;if(step<total()-1){step++;reset()}else{complete()}}}
function render(){const s=session();$('#sessionTitle').textContent=String(s.ordinal).padStart(2,'0')+' · '+loc(s.title);semanticText($('#sessionSubtitle'),loc(s.summary),s.targetTerms);$('#counter').textContent=(step+1)+' / '+total();$('#progress').style.width=((step+1)/total()*100)+'%';const screen=$('#screen');screen.replaceChildren(step<3?introScreen(s.intro[step]):practiceScreen(s.practice[step-3]));renderFooter();list();syncMobile()}
function complete(){const e=$('#screen');e.innerHTML='<div class="complete"><div class="eyebrow">'+total()+' / '+total()+'</div><h1>Готово</h1><p>Все задания выполнены.</p></div>';$('#next').disabled=false;$('#next').textContent=si<d.sessions.length-1?'Дальше':'Вернуться к началу';$('#next').onclick=()=>{if(si<d.sessions.length-1)si++;else si=0;step=0;reset()};$('#hint').style.visibility='hidden'}
function syncMobile(){const select=$('#mobileSession');select.value=String(si);$('#mobilePrev').disabled=si===0;$('#mobileNext').disabled=si===d.sessions.length-1}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function applyTheme(name){const p=palettes[name],r=document.documentElement.style;['--page','--surface','--surface2','--text','--muted','--target','--wrong','--ok','--on'].forEach((k,i)=>r.setProperty(k,p[i]));r.setProperty('--line','color-mix(in srgb,'+p[5]+' 18%,transparent)');r.setProperty('--glow','color-mix(in srgb,'+p[5]+' 16%,transparent)')}
d.localeOrder.forEach(code=>{const o=document.createElement('option');o.value=code;o.textContent=code;$('#locale').append(o)});d.sessions.forEach((s,index)=>{const o=document.createElement('option');o.value=String(index);o.textContent=String(s.ordinal).padStart(2,'0')+' · '+s.title.ru;$('#mobileSession').append(o)});$('#locale').onchange=e=>{locale=e.target.value;reset()};$('#theme').onchange=e=>applyTheme(e.target.value);$('#mobileSession').onchange=e=>{si=Number(e.target.value);step=0;reset()};$('#mobilePrev').onclick=()=>{if(si>0){si--;step=0;reset()}};$('#mobileNext').onclick=()=>{if(si<d.sessions.length-1){si++;step=0;reset()}};$('#back').onclick=()=>{if(step>0){step--;reset()}else if(si>0){si--;step=0;reset()}};applyTheme('indigo');render()})();
</script></body></html>`;
}

export async function buildLesson1RealSessionMock(args = process.argv.slice(2)) {
  const { from, to } = parseChapterRange(args);
  assertLesson1ReviewScope(to);
  const outputPath = resolve(
    ROOT,
    valueAfter(args, '--output') ?? resolve(DEFAULT_DIR, 'lesson1-all-56-real-session-v1.html'),
  );
  const dataPath = resolve(
    ROOT,
    valueAfter(args, '--data-output') ?? resolve(DEFAULT_DIR, 'lesson1-all-56-real-session-data-v1.js'),
  );
  const result = await evaluateLesson1Chapter(from, to);
  if (result.blockers.length > 0) {
    throw new Error(`chapter_auto_gate_blocked:${result.blockers.length}`);
  }
  const shardBuilder = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/session_shard_from_source_v1.ts'),
    import.meta.url,
  );
  const childBuilder = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/session_package_from_shard_v1.ts'),
    import.meta.url,
  );
  const sessionMap = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/episode_01_session_map_v1.ts'),
    import.meta.url,
  ).EPISODE_01_SESSION_MAP_V1;
  const data = {
    version: 1,
    autoStatus: 'PASS',
    manualStatus: result.manualReviewOrdinals.length > 0 ? 'HOLD' : 'PASS',
    localeOrder: REVIEW_LOCALES,
    sessions: result.sources.map((source) =>
      projectSession(
        source,
        sessionMap[source.requiredSessionOrdinal - 1],
        shardBuilder,
        childBuilder,
      ),
    ),
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `window.__LEARNING_V2_REAL_SESSION_DATA__=${JSON.stringify(data)};\n`, 'utf8');
  writeFileSync(
    outputPath,
    htmlDocument(
      basename(dataPath),
      'lesson1-all-56-review.html',
      from,
      to,
      data.sessions.length,
    ),
    'utf8',
  );
  return { outputPath, dataPath, data };
}

async function main() {
  const built = await buildLesson1RealSessionMock();
  process.stdout.write(`BUILT ${built.outputPath}\nDATA ${built.dataPath}\nSESSIONS ${built.data.sessions.length}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
