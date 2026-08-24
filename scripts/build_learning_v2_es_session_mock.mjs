import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';

// зачем отдельный испанский билдер, а не флаг в английском (владелец,
// 2026-08-23, правило 8-bis СТАРТ ES.md): английский build_learning_v2_
// lesson1_real_session_mock.mjs жёстко ссылается на episode_01_session_map_v1
// и на evaluateLesson1Chapter/assertLesson1ReviewScope, которые читают
// АНГЛИЙСКИЙ authoring-реестр диапазонами глав. Испанский контур имеет
// собственный реестр (authoringRegistryForTargetLanguage("es")) и сегодня
// только одну написанную сессию, не диапазон — переиспользовать английский
// гейт означало бы либо обойти его для испанского (нарушение), либо
// заставить испанский контур притворяться английским. Механика рендера
// (projectSession, htmlDocument) скопирована почти без изменений — она
// работает с любым SessionSource и languageAgnostic по коду, только сами
// исходные данные ниже про испанский курс.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DIR = resolve(ROOT, '.superpowers/brainstorm/es-mockups/content');

// зачем es -> en в наборе локалей объяснения (владелец, 2026-08-21/23):
// испанский курс изучаемый язык — 'es' сам, поэтому 'es' как локаль
// ОБЪЯСНЕНИЯ здесь не используется; на её месте — 'en'. Остальные семь без
// изменений (СТАРТ ES.md, преамбула).
const ES_REVIEW_LOCALES = Object.freeze(['ru', 'uk', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl']);

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function localized(value) {
  return Object.fromEntries(ES_REVIEW_LOCALES.map((locale) => [locale, value[locale]]));
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
    // зачем диапазон включает испанские диакритики (á é í ó ú ñ ü ¿ ¡), а не
    // только A-Za-z как в английском билдере: без этого подсветка целевого
    // языка молча ломается на первом же слове с ударением (fácil, día).
    for (const token of value.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+(?:[’'][A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)*/gu) ?? []) {
      if (token.length >= 1) terms.add(token);
    }
  }
  return [...terms].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function projectSession(source, shardBuilder, childBuilder) {
  const shard = shardBuilder.buildSessionShardFromSource(source);
  const courseSessionId = `lesson-01-es:session:${String(source.requiredSessionOrdinal).padStart(2, '0')}`;
  const childrenByLocale = Object.fromEntries(
    ES_REVIEW_LOCALES.map((locale) => [
      locale,
      childBuilder.buildSessionChildBodiesFromShard(shard, locale, courseSessionId),
    ]),
  );
  const learnerByLocale = Object.fromEntries(
    ES_REVIEW_LOCALES.map((locale) => [locale, childrenByLocale[locale].learner]),
  );
  const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
  const practice = learnerByLocale.ru.interactions.map((interaction, index) => {
    const card = practiceCards[index];
    const auxiliary = childrenByLocale.ru.auxiliary.entries.find(
      (entry) => entry.interactionId === interaction.interactionId,
    );
    const meaningByLocale = Object.fromEntries(
      ES_REVIEW_LOCALES.map((locale) => [
        locale,
        card.contentItem.learnerMeanings.find((meaning) => meaning.locale === locale)?.value ?? '',
      ]),
    );
    const responseLanguage = interaction.family === 'listen_choose' ? 'explanation' : 'target';
    const projectedOptions = Object.fromEntries(
      ES_REVIEW_LOCALES.map((locale) => [
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
        ES_REVIEW_LOCALES.map((locale) => [locale, learnerByLocale[locale].interactions[index].prompt]),
      ),
      responseOptionsByLocale: projectedOptions,
      correctResponseId:
        interaction.inputMode === 'single_choice'
          ? choiceToken(card.contentItem.target.text)
          : null,
      correctText:
        interaction.inputMode === 'ordered_tokens'
          ? card.contentItem.target.text.replace(/[?.!,¿¡]/gu, '')
          : card.contentItem.target.text,
      hintByLocale: localized(card.hintByLocale),
      successByLocale: localized(card.successMessageByLocale),
      retryByLocale: localized(card.retryMessageByLocale),
      errorByLocale: localized(card.errorExplanationByLocale),
      responseFeedbackById: auxiliary?.responseFeedbackById ?? {},
      // зачем (владелец, HANDOVER_ES.md, 2026-08-24, "ИГРАБЕЛЬНЫЙ МАКЕТ"):
      // блокирующая карточка нового слова — часть реального хода сессии,
      // раздел 8-bis СТАРТ ES прямо требует показать «каждое задание сессии
      // по порядку, в том виде, в каком его увидит ученик» — карточка стоит
      // ПЕРЕД первым заданием со словом, макет без неё был бы неполным.
      newWordEncounter: auxiliary?.newWordEncounter
        ? {
            lexicalItemId: auxiliary.newWordEncounter.lexicalItemId,
            transcription: auxiliary.newWordEncounter.transcription,
            targetText: auxiliary.newWordEncounter.save.targetText,
            motionVariant: auxiliary.newWordEncounter.motionVariant,
            orderWithinSession: auxiliary.newWordEncounter.orderWithinSession,
            playfulMeaningByLocale: localized(auxiliary.newWordEncounter.playfulMeaningByLocale),
            meaningByLocale,
          }
        : null,
    };
  });
  return {
    ordinal: source.requiredSessionOrdinal,
    kind: 'phrases',
    title: localized(source.title),
    summary: localized(source.summary),
    learningGoal: localized(source.learningGoal),
    targetTerms: targetTerms([
      ...source.phrases.map((phrase) => phrase.english),
      ...source.introPages.flatMap((page) => page.question.choices.map((choice) => choice.ru)),
    ]),
    zone: shard.zone,
    support: shard.support,
    intro: source.introPages.map((page) => ({
      kind: page.kind,
      title: localized(page.title),
      body: localized(page.body),
      bodyRuns: Object.fromEntries(
        ES_REVIEW_LOCALES.map((locale) => [
          locale,
          page.bodyRuns?.[locale] ?? [{ text: page.body[locale], semantic: 'explanation' }],
        ]),
      ),
      targetTerms: targetTerms([
        ...page.question.choices.map((choice) => choice.ru),
        ...ES_REVIEW_LOCALES.flatMap((locale) =>
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

function htmlDocument(inlineDataJson) {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Learning V2 · Испанский · Урок 1 · сессия 1</title>
<style>
:root{--page:#14131f;--panel:#14131f;--surface:#1c1b2e;--surface2:#2a2952;--text:#f1efff;--muted:#9a95c2;--target:#c8c3ff;--wrong:#f26d8a;--ok:#61d7a5;--line:rgba(200,195,255,.16);--glow:rgba(200,195,255,.16);--on:#17162b}
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{background:#09090d;color:#f5f5f5;font:16px/1.55 Inter,Segoe UI,sans-serif}button,select{font:inherit}button,a,select{cursor:pointer}.app{min-height:100vh;background:radial-gradient(circle at 50% -15%,#252143 0,transparent 30%),#09090d}.top{position:sticky;top:0;z-index:20;background:#09090df2;backdrop-filter:blur(16px);border-bottom:1px solid #2d2b38;padding:12px 18px}.topline{display:flex;gap:12px;align-items:center;flex-wrap:wrap;max-width:1320px;margin:auto}.brand{margin-right:auto}.brand strong{display:block;font:750 20px/1.1 Georgia,serif}.brand span{color:#a7a5b7;font-size:12px}.control{min-height:44px;border:1px solid #373544;background:#13131a;color:#d9d6e7;border-radius:12px;padding:9px 13px}.control:hover,.control:focus-visible{border-color:#8a86a2;outline:2px solid transparent}.layout{display:flex;justify-content:center;max-width:1080px;margin:auto;padding:22px}.phone{position:relative;background:var(--page);border:1px solid var(--line);border-radius:28px;overflow:hidden;box-shadow:0 24px 70px #0008,0 0 30px var(--glow);color:var(--text);min-height:780px;display:flex;flex-direction:column;width:100%;max-width:460px}.phonebar{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}.square{width:44px;height:44px;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:14px}.session-head{flex:1}.session-head strong{display:block}.session-head span{color:var(--muted);font-size:12px}.counter{font:800 11px ui-monospace;color:var(--target)}.progress{height:4px;background:var(--surface2)}.progress i{display:block;height:100%;background:var(--target);transition:width .22s}.screen{padding:25px;flex:1}.eyebrow{color:var(--target);font:850 11px ui-monospace;letter-spacing:.14em;text-transform:uppercase}.screen h1{font:750 clamp(27px,4vw,34px)/1.13 Georgia,serif;margin:11px 0 17px}.copy{font-size:17px;line-height:1.72}.copy .targetCorrect,.target{color:var(--target);font-weight:900}.copy .targetWrong,.wrong-token{color:var(--wrong);font-weight:850;text-decoration:line-through}.question{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}.question h3{font-size:15px;margin:0 0 11px}.answer,.tile{min-height:48px;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:13px;padding:11px 14px;font-weight:700;transition:border-color .18s,background .18s}.answer{display:block;width:100%;text-align:left;margin:8px 0}.answer:hover,.tile:hover,.answer:focus-visible,.tile:focus-visible{border-color:var(--target);outline:2px solid transparent}.answer.correct{border-color:var(--ok);box-shadow:inset 3px 0 var(--ok)}.answer.wrong{border-color:var(--wrong)}.task-prompt{font-size:20px;line-height:1.5;margin:14px 0 20px}.tiles{display:flex;gap:9px;flex-wrap:wrap}.tile.selected{background:var(--target);color:var(--on);border-color:var(--target)}.answer-well{min-height:66px;border:1px dashed var(--line);border-radius:15px;padding:10px;display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.placeholder{color:var(--muted)}.feedback{min-height:58px;margin-top:16px;border-left:3px solid var(--target);padding:10px 13px;background:var(--surface);border-radius:0 12px 12px 0;color:var(--muted)}.feedback.ok{border-color:var(--ok);color:var(--text)}.feedback.bad{border-color:var(--wrong);color:var(--text)}.phonefooter{padding:15px 18px 20px;display:grid;grid-template-columns:auto 1fr;gap:10px}.hint,.next{min-height:52px;border-radius:15px;font-weight:900}.hint{border:1px solid var(--line);background:var(--surface);color:var(--text);padding:0 16px}.next{border:0;background:var(--target);color:var(--on)}.next:disabled{opacity:.36;cursor:not-allowed}.complete{text-align:center;padding-top:90px}.complete h1{font-size:42px}.complete p{color:var(--muted)}.shake{animation:shake .24s linear}@keyframes shake{25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-3px)}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}@media(max-width:760px){.layout{display:block;padding:10px}.phone{min-height:740px;border-radius:22px;max-width:100%}.top{padding:10px}.brand{width:100%}.screen{padding:21px 17px}.phonefooter{grid-template-columns:1fr}.copy{font-size:16px}}
.target-language{color:var(--target)!important;font-weight:900;font-family:Inter,Segoe UI,sans-serif;letter-spacing:.005em}.explanation-language{color:inherit;font-weight:inherit}.tile.selected .target-language{color:var(--on)!important}
.word-overlay{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:18px}.word-backdrop{position:absolute;inset:0;background:#05050bcc;backdrop-filter:blur(6px)}.word-card{position:relative;width:100%;max-height:92%;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:22px;box-shadow:0 24px 60px #000a}.word-card.motion-b{animation:wordCardB .42s cubic-bezier(.2,.9,.25,1)}.word-card.motion-a{animation:wordCardA .3s ease-out}@keyframes wordCardB{from{opacity:0;transform:translateY(26px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes wordCardA{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.word-card.motion-b,.word-card.motion-a{animation:wordCardFade .16s linear}}@keyframes wordCardFade{from{opacity:0}to{opacity:1}}.word-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}.word-label{min-height:32px;display:flex;align-items:center;border-radius:999px;padding:6px 12px;background:var(--glow);color:var(--target);font:800 12px/1 ui-monospace;letter-spacing:.5px;text-transform:uppercase}.word-counter{flex:1;text-align:right;color:var(--muted);font-size:13px;font-weight:700}.word-iconbtn{min-width:48px;min-height:48px;border-radius:14px;border:1px solid var(--line);background:var(--surface2);color:var(--text);display:flex;align-items:center;justify-content:center;font-size:20px}.word-target-row{display:flex;align-items:center;gap:12px;margin-bottom:4px}.word-target{flex:1;font:900 44px/1.05 Georgia,serif;color:var(--target)}.word-transcription{color:var(--muted);font-size:18px;margin-bottom:16px}.word-meaning-block{border:1px solid var(--line);border-radius:18px;background:var(--surface2);padding:16px;margin-bottom:18px}.word-meaning{font-size:19px;font-weight:600;margin-bottom:8px}.word-playful{font-size:16px;color:var(--muted)}.word-continue{width:100%;min-height:56px;border:0;border-radius:16px;background:var(--target);color:var(--on);font:900 17px/1 Inter,sans-serif}
</style></head><body><div class="app">
<header class="top"><div class="topline"><div class="brand"><strong>Испанский · Урок 1 · Ser</strong><span>Сессия 1 «Es fácil» — играбельный макет</span></div><select id="locale" class="control" aria-label="Язык объяснения"></select><select id="theme" class="control" aria-label="Тема интерфейса"><option value="indigo">Индиго</option><option value="sage">Нефрит</option><option value="olive">Олива</option><option value="midnight">Полночь</option></select></div></header>
<main class="layout"><section class="phone" aria-live="polite"><div class="phonebar"><button id="back" class="square" aria-label="Назад">‹</button><div class="session-head"><strong id="sessionTitle"></strong><span id="sessionSubtitle"></span></div><span class="counter" id="counter"></span></div><div class="progress"><i id="progress"></i></div><div class="screen" id="screen"></div><footer class="phonefooter"><button id="hint" class="hint">Подсказка</button><button id="next" class="next">Продолжить</button></footer><div id="wordOverlay"></div></section></main>
</div><script>
window.__LEARNING_V2_ES_SESSION_DATA__=${inlineDataJson};
(()=>{const d=window.__LEARNING_V2_ES_SESSION_DATA__,$=s=>document.querySelector(s);let step=0,locale='ru',attempts=0,done=false,selected=[],wordQueue=[],wordIndex=0,seenEncounters=new Set();const palettes={indigo:['#14131f','#1c1b2e','#2a2952','#f1efff','#9a95c2','#c8c3ff','#f26d8a','#61d7a5','#17162b'],sage:['#dce1d8','#fcfdf9','#e1e5dc','#17201d','#52605a','#315f50','#a8464d','#247451','#fff'],olive:['#080907','#171a12','#25291d','#f3eedb','#a69f8a','#e3cc88','#c77160','#6fcb87','#161208'],midnight:['#03040a','#0d101e','#202641','#fff','#a9aecb','#8fa0ff','#ff6e8a','#5ce0ac','#0d1030']};const norm=v=>String(v).normalize('NFKC').toLocaleLowerCase('es').match(/[\\p{L}\\p{N}]+(?:'[\\p{L}\\p{N}]+)*/gu)?.join(' ')||'';const loc=v=>v?.[locale]??'';const session=()=>d.session;const task=()=>step>=3?session().practice[step-3]:null;const total=()=>3+session().practice.length;
function reset(){attempts=0;done=false;selected=[];const t=task();wordQueue=t&&t.newWordEncounter&&!seenEncounters.has(t.newWordEncounter.lexicalItemId)?[t.newWordEncounter]:[];wordIndex=0;render()}
function wordOverlayScreen(){const enc=wordQueue[wordIndex];const wrap=document.createElement('div');wrap.className='word-overlay';const backdrop=document.createElement('div');backdrop.className='word-backdrop';const card=document.createElement('div');card.className='word-card '+(enc.motionVariant==='lesson_hero_b'?'motion-b':'motion-a');const header=document.createElement('div');header.className='word-header';const label=document.createElement('div');label.className='word-label';label.textContent='Новое слово';const counter=document.createElement('div');counter.className='word-counter';counter.textContent=(wordIndex+1)+' / '+wordQueue.length;const save=document.createElement('button');save.className='word-iconbtn';save.textContent='☆';save.setAttribute('aria-label','Сохранить слово');header.append(label,counter,save);const row=document.createElement('div');row.className='word-target-row';const target=document.createElement('div');target.className='word-target';target.textContent=enc.targetText;const audio=document.createElement('button');audio.className='word-iconbtn';audio.textContent='🔊';audio.setAttribute('aria-label','Прослушать слово');row.append(target,audio);const trans=document.createElement('div');trans.className='word-transcription';trans.textContent=enc.transcription;const meaningBlock=document.createElement('div');meaningBlock.className='word-meaning-block';const meaning=document.createElement('div');meaning.className='word-meaning';meaning.textContent=loc(enc.meaningByLocale);const playful=document.createElement('div');playful.className='word-playful';playful.textContent=loc(enc.playfulMeaningByLocale);meaningBlock.append(meaning,playful);const cont=document.createElement('button');cont.className='word-continue';cont.textContent='Продолжить';cont.onclick=()=>{seenEncounters.add(enc.lexicalItemId);if(wordIndex+1<wordQueue.length){wordIndex++;render()}else{wordQueue=[];render()}};card.append(header,row,trans,meaningBlock,cont);wrap.append(backdrop,card);return wrap}
function termBoundary(text,start,term){const word=/[\p{L}\p{N}_]/u,before=start>0?text[start-1]:'',after=text[start+term.length]??'';return !(word.test(term[0]??'')&&word.test(before))&&!(word.test(term[term.length-1]??'')&&word.test(after))}
function appendSemanticText(root,text,terms=[],forceTarget=false){if(forceTarget){const span=document.createElement('span');span.className='target-language';span.textContent=text;root.append(span);return}const ordered=[...new Set(terms)].filter(Boolean).sort((a,b)=>b.length-a.length||a.localeCompare(b));let cursor=0,plain='';const flush=()=>{if(!plain)return;const span=document.createElement('span');span.className='explanation-language';span.textContent=plain;root.append(span);plain=''};while(cursor<text.length){const term=ordered.find(candidate=>text.startsWith(candidate,cursor)&&termBoundary(text,cursor,candidate));if(term){flush();const span=document.createElement('span');span.className='target-language';span.textContent=term;root.append(span);cursor+=term.length}else{plain+=text[cursor];cursor++}}flush()}
function semanticText(root,text,terms=[],forceTarget=false){root.replaceChildren();appendSemanticText(root,String(text??''),terms,forceTarget)}
function introBody(page){const wrap=document.createElement('div');wrap.className='copy';(page.bodyRuns[locale]||[{text:loc(page.body),semantic:'explanation'}]).forEach(run=>{if(run.semantic==='explanation'){appendSemanticText(wrap,run.text,page.targetTerms)}else{const span=document.createElement('span');span.className=run.semantic;span.textContent=run.text;wrap.append(span)}});return wrap}
function introScreen(page){const f=document.createDocumentFragment(),eye=document.createElement('div');eye.className='eyebrow';eye.textContent=page.kind;const h=document.createElement('h1');semanticText(h,loc(page.title),page.targetTerms);const q=document.createElement('div');q.className='question';const qh=document.createElement('h3');semanticText(qh,loc(page.prompt),page.targetTerms);q.append(qh);page.choices.forEach((choice,index)=>{const b=document.createElement('button');b.className='answer'+(done?(index===page.correctChoiceIndex?' correct':''):'');semanticText(b,loc(choice),page.targetTerms,true);b.onclick=()=>{if(done)return;if(index===page.correctChoiceIndex){done=true;feedback(loc(page.explanation),'ok')}else{attempts++;feedback(loc(page.explanation),'bad',true)}renderFooter()};q.append(b)});const fb=document.createElement('div');fb.id='feedback';fb.className='feedback';fb.textContent='Выберите один вариант.';f.append(eye,h,introBody(page),q,fb);return f}
function shuffled(options,t){return [...options].sort((a,b)=>(a.responseId+t.interactionId).localeCompare(b.responseId+t.interactionId)*(t.slot%2?1:-1))}
function practiceScreen(t){const f=document.createDocumentFragment(),eye=document.createElement('div');eye.className='eyebrow';eye.textContent='ЗАДАНИЕ '+t.ordinal+' / '+session().practice.length;const p=document.createElement('div');p.className='task-prompt';semanticText(p,loc(t.promptByLocale),t.targetTerms);f.append(eye,p);const opts=shuffled(t.responseOptionsByLocale[locale],t);if(t.inputMode==='ordered_tokens'){const well=document.createElement('div');well.className='answer-well';if(!selected.length){const e=document.createElement('span');e.className='placeholder';e.textContent='Нажимайте плитки в нужном порядке';well.append(e)}selected.forEach(id=>{const o=opts.find(x=>x.responseId===id);const b=document.createElement('button');b.className='tile selected';semanticText(b,o?.text||'',t.targetTerms,true);b.onclick=()=>{selected=selected.filter(x=>x!==id);render()};well.append(b)});const tiles=document.createElement('div');tiles.className='tiles';opts.forEach(o=>{const b=document.createElement('button');b.className='tile'+(selected.includes(o.responseId)?' selected':'');semanticText(b,o.text,t.targetTerms,true);b.disabled=selected.includes(o.responseId);b.onclick=()=>{selected.push(o.responseId);render()};tiles.append(b)});f.append(well,tiles)}else if(t.inputMode==='scripted_speech'){const b=document.createElement('button');b.className='answer';b.innerHTML='<span class="target-language">'+escapeHtml(t.target)+'</span><br><small>Нажмите после повторения вслух</small>';b.onclick=()=>{done=true;feedback(loc(t.successByLocale),'ok');renderFooter()};f.append(b)}else{const box=document.createElement('div');box.className='choices';opts.forEach(o=>{const b=document.createElement('button');b.className='answer'+(done&&o.responseId===t.correctResponseId?' correct':'');semanticText(b,o.text,t.targetTerms,t.responseLanguage==='target');b.onclick=()=>{if(done)return;if(o.responseId===t.correctResponseId){done=true;feedback(loc(t.successByLocale),'ok')}else{attempts++;feedback(loc(t.responseFeedbackById?.[o.responseId])||loc(t.retryByLocale),'bad',true)}renderFooter()};box.append(b)});f.append(box)}const fb=document.createElement('div');fb.id='feedback';fb.className='feedback';fb.textContent='Выполните задание.';f.append(fb);return f}
function feedback(text,type,shake=false){const e=$('#feedback');if(!e)return;e.className='feedback '+type;semanticText(e,text,task()?.targetTerms??session().targetTerms);if(shake){e.classList.add('shake');setTimeout(()=>e.classList.remove('shake'),260)}}
function renderFooter(){const t=task(),hint=$('#hint'),next=$('#next'),blocked=wordQueue.length>0&&wordIndex<wordQueue.length;hint.style.visibility=t&&t.support==='none'?'hidden':'visible';hint.disabled=blocked;hint.onclick=()=>feedback(t?loc(t.hintByLocale):loc(session().intro[step].explanation),'');next.textContent=step===total()-1?'Завершить':'Продолжить';next.disabled=blocked||(t?.inputMode==='ordered_tokens'?!selected.length:!done);next.onclick=()=>{if(blocked)return;if(t?.inputMode==='ordered_tokens'&&!done){const opts=t.responseOptionsByLocale[locale],answer=selected.map(id=>opts.find(o=>o.responseId===id)?.text||'').join(' ');if(norm(answer)===norm(t.correctText)){done=true;feedback(loc(t.successByLocale),'ok')}else{attempts++;const trapId=selected.find(id=>t.responseFeedbackById?.[id]);feedback(loc(t.responseFeedbackById?.[trapId])||loc(t.retryByLocale),'bad',true)}renderFooter();return}if(!done)return;if(step<total()-1){step++;reset()}else{complete()}}}
function render(){const s=session();$('#sessionTitle').textContent=String(s.ordinal).padStart(2,'0')+' · '+loc(s.title);semanticText($('#sessionSubtitle'),loc(s.summary),s.targetTerms);$('#counter').textContent=(step+1)+' / '+total();$('#progress').style.width=((step+1)/total()*100)+'%';const screen=$('#screen');screen.replaceChildren(step<3?introScreen(s.intro[step]):practiceScreen(s.practice[step-3]));renderFooter();const overlay=$('#wordOverlay');overlay.replaceChildren();overlay.style.display=wordQueue.length&&wordIndex<wordQueue.length?'block':'none';if(wordQueue.length&&wordIndex<wordQueue.length)overlay.append(wordOverlayScreen())}
function complete(){const e=$('#screen');e.innerHTML='<div class="complete"><div class="eyebrow">'+total()+' / '+total()+'</div><h1>Готово</h1><p>Сессия '+session().ordinal+' пройдена целиком.</p></div>';$('#next').disabled=false;$('#next').textContent='Начать заново';$('#next').onclick=()=>{step=0;reset()};$('#hint').style.visibility='hidden'}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function applyTheme(name){const p=palettes[name],r=document.documentElement.style;['--page','--surface','--surface2','--text','--muted','--target','--wrong','--ok','--on'].forEach((k,i)=>r.setProperty(k,p[i]));r.setProperty('--line','color-mix(in srgb,'+p[5]+' 18%,transparent)');r.setProperty('--glow','color-mix(in srgb,'+p[5]+' 16%,transparent)')}
d.localeOrder.forEach(code=>{const o=document.createElement('option');o.value=code;o.textContent=code;$('#locale').append(o)});$('#locale').onchange=e=>{locale=e.target.value;reset()};$('#theme').onchange=e=>applyTheme(e.target.value);$('#back').onclick=()=>{if(step>0){step--;reset()}};applyTheme('indigo');render()})();
</script></body></html>`;
}

// зачем --session (владелец, 2026-08-24, "приступай к написанию второй"):
// раньше скрипт был жёстко привязан к сессии 1. Флаг выбирает нужный файл
// источника без правки скрипта на каждую новую сессию; по умолчанию — 1,
// чтобы старое поведение (без флага) не изменилось ни на бит.
export async function buildEsSessionMock(args = process.argv.slice(2)) {
  const sessionOrdinal = Number.parseInt(valueAfter(args, '--session') ?? '1', 10);
  if (!Number.isInteger(sessionOrdinal) || sessionOrdinal < 1 || sessionOrdinal > 56) {
    throw new Error(`es_session_mock_ordinal_invalid: use --session <1..56>, got ${String(valueAfter(args, '--session'))}`);
  }
  const padded = String(sessionOrdinal).padStart(2, '0');
  const outputPath = resolve(
    ROOT,
    valueAfter(args, '--output') ?? resolve(DEFAULT_DIR, `es-lesson1-session${padded}-real-v1.html`),
  );
  const dataPath = resolve(
    ROOT,
    valueAfter(args, '--data-output') ?? resolve(DEFAULT_DIR, `es-lesson1-session${padded}-real-data-v1.js`),
  );
  const shardBuilder = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/session_shard_from_source_v1.ts'),
    import.meta.url,
  );
  const childBuilder = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/session_package_from_shard_v1.ts'),
    import.meta.url,
  );
  const sourceModule = tsxRequire(
    resolve(ROOT, `modules/learning-v2/content/source/es_episode_01_session_${padded}_v1.ts`),
    import.meta.url,
  );
  const source = sourceModule[`ES_EPISODE_01_SESSION_${padded}_SOURCE`];
  if (!source) {
    throw new Error(`es_session_mock_source_export_missing:ES_EPISODE_01_SESSION_${padded}_SOURCE`);
  }
  const data = {
    version: 1,
    localeOrder: ES_REVIEW_LOCALES,
    session: projectSession(source, shardBuilder, childBuilder),
  };
  // зачем replace(</script>): JSON встраивается буквально внутрь <script>,
  // а разбор фраз/подсказок может случайно содержать эту подстроку — без
  // экранирования браузер закрыл бы тег раньше времени и разбил бы скрипт.
  const dataJson = JSON.stringify(data).replace(/<\/script/gu, '<\\/script');
  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(dataPath), { recursive: true });
  // зачем данные встроены В HTML, а не только в соседний .js (владелец,
  // 2026-08-24, "МАКЕТ НЕ РАБОЧИЙ" — открыл двойным кликом, увидел пустой
  // экран): file:// не может подгрузить внешний <script src>, если файл
  // открыт не через сервер — почти всегда так для владельца. Отдельный
  // .js всё ещё пишется рядом для обратной совместимости, но HTML теперь
  // самодостаточен и работает при обычном открытии в браузере.
  writeFileSync(dataPath, `window.__LEARNING_V2_ES_SESSION_DATA__=${dataJson};\n`, 'utf8');
  writeFileSync(outputPath, htmlDocument(dataJson), 'utf8');
  return { outputPath, dataPath, data };
}

async function main() {
  const built = await buildEsSessionMock();
  process.stdout.write(`BUILT ${built.outputPath}\nDATA ${built.dataPath}\nPRACTICE ${built.data.session.practice.length}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
