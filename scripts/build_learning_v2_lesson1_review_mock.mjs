import { basename, dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  REVIEW_LOCALES,
  evaluateLesson1Chapter,
  parseChapterRange,
} from './learning_v2_lesson1_chapter_gate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function outputNames(from, to) {
  if (from === 1 && to === 56) {
    return {
      html: 'lesson1-all-56-review.html',
      data: 'lesson1-all-56-review-data.js',
    };
  }
  const label = `${String(from).padStart(2, '0')}-${String(to).padStart(2, '0')}`;
  return {
    html: `lesson1-chapter-${label}-review.html`,
    data: `lesson1-chapter-${label}-review-data.js`,
  };
}

function projectLocalized(value) {
  return Object.fromEntries(REVIEW_LOCALES.map((locale) => [locale, value[locale]]));
}

function projectSource(source) {
  return {
    ordinal: source.requiredSessionOrdinal,
    fingerprint: source.generationInputFingerprint,
    title: projectLocalized(source.title),
    summary: projectLocalized(source.summary),
    learningGoal: projectLocalized(source.learningGoal),
    introPages: source.introPages.map((page) => ({
      kind: page.kind,
      title: projectLocalized(page.title),
      body: projectLocalized(page.body),
      bodyRuns: Object.fromEntries(REVIEW_LOCALES.map((locale) => [locale, page.bodyRuns[locale]])),
      question: {
        prompt: projectLocalized(page.question.prompt),
        choices: page.question.choices.map(projectLocalized),
        correctChoiceIndex: page.question.correctChoiceIndex,
        explanation: projectLocalized(page.question.explanation),
      },
    })),
    phrases: source.phrases.map((phrase) => ({
      id: phrase.id,
      english: phrase.english,
      features: phrase.features,
      localizedDetails: Object.fromEntries(
        REVIEW_LOCALES.map((locale) => [locale, phrase.localizedDetails[locale]]),
      ),
    })),
  };
}

function buildData(result) {
  return {
    version: 1,
    status: result.manualReviewOrdinals.length > 0 ? 'MANUAL_HOLD' : 'MANUAL_PASS',
    range: { from: result.from, to: result.to },
    localeOrder: REVIEW_LOCALES,
    sessionCount: result.counts.sessions,
    localeCount: result.counts.locales,
    introPageCount: result.counts.introPages,
    phraseCount: result.counts.phrases,
    localizedPhrasePresentationCount: result.counts.localizedPhrasePresentations,
    wordDrillCount: result.counts.wordDrills,
    sessions: result.sources.map(projectSource),
  };
}

function htmlDocument(dataFileName) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lesson 1 · Full material review</title>
  <style>
    :root{--bg:#100e0b;--panel:#1a1712;--panel2:#221d16;--line:#3a3023;--text:#f7f0e5;--muted:#a99c88;--accent:#efb84f;--accent2:#74d7c5;--wrong:#ef7f77;--shadow:0 18px 60px #0008;--radius:18px}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 Inter,ui-sans-serif,system-ui,sans-serif} button,input,select,textarea{font:inherit} button,select{color:inherit}
    header{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}
    .head{max-width:1500px;margin:auto;padding:18px 24px 12px}.title-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.title-row h1{font:700 28px/1.1 Georgia,serif;margin:0}.status{padding:6px 10px;border:1px solid var(--accent);border-radius:999px;color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.08em}
    .controls{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;margin-top:14px}.search,select{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:11px 13px}.search{color:var(--text);outline:none}.search:focus{border-color:var(--accent)}
    .tabs{display:flex;gap:7px;overflow:auto;padding:12px 0 2px;scrollbar-width:thin}.tab{border:1px solid var(--line);background:var(--panel);padding:8px 12px;border-radius:10px;white-space:nowrap;cursor:pointer}.tab[aria-selected="true"]{border-color:var(--accent);color:#111;background:var(--accent);font-weight:800}
    main{max-width:1500px;margin:auto;padding:28px 24px 80px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:22px}.hero h2{font:700 40px/1.05 Georgia,serif;margin:0 0 8px}.hero p{margin:0;color:var(--muted);max-width:820px}.counts{color:var(--accent);white-space:nowrap}
    .intro-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}.intro{padding:22px;min-height:420px}.eyebrow{color:var(--accent);font-size:12px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.intro h3{font:700 23px/1.2 Georgia,serif;margin:14px 0 10px}.body-copy{color:#d8cbbb;white-space:pre-wrap}.targetCorrect{color:var(--accent);font-weight:850}.targetWrong{color:var(--wrong);font-weight:760;text-decoration:line-through;text-decoration-thickness:1px}.explanation{color:inherit}
    .quiz{margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}.quiz strong{display:block;margin-bottom:10px}.choice{display:block;width:100%;text-align:left;border:1px solid var(--line);border-radius:10px;background:var(--panel2);padding:9px 11px;margin:7px 0;cursor:pointer}.choice:hover{border-color:var(--accent)}.choice.correct{border-color:var(--accent2);color:var(--accent2)}.choice.wrong{border-color:var(--wrong);color:var(--wrong)}.answer{min-height:24px;color:var(--accent2);margin-top:8px;font-size:14px}
    .phrase-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:26px 0 12px}.phrase-tools h3{margin:0;font:700 25px Georgia,serif}.phrase-list{display:grid;gap:10px}.phrase{overflow:hidden}.phrase summary{cursor:pointer;list-style:none;padding:15px 18px;display:flex;align-items:center;gap:14px}.phrase summary::-webkit-details-marker{display:none}.num{color:var(--muted);font-variant-numeric:tabular-nums}.english{color:var(--accent);font-weight:850;font-size:18px}.meaning{margin-left:auto;color:var(--muted);text-align:right}.phrase-content{padding:0 18px 19px;border-top:1px solid var(--line)}.phrase-content>p{color:#d8cbbb}.features{font-size:12px;color:var(--accent2)}
    .words{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}.word{background:var(--panel2);border-radius:12px;padding:13px}.word h4{margin:0 0 5px;color:var(--accent);font-size:18px}.word>p{margin:0 0 10px;color:var(--muted)}.wrong-list{margin:0;padding-left:20px}.wrong-list li{margin:7px 0}.wrong-token{color:var(--wrong);font-weight:700}
    .feedback{margin-top:28px;padding:18px}.feedback h3{margin:0 0 8px}.feedback textarea{width:100%;min-height:110px;resize:vertical;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:12px;padding:12px}.saved{color:var(--accent2);font-size:13px;min-height:20px}
    .empty{padding:40px;text-align:center;color:var(--muted)}
    @media(max-width:1000px){.intro-grid{grid-template-columns:1fr}.intro{min-height:0}.controls{grid-template-columns:1fr 1fr}.search{grid-column:1/-1}.hero{align-items:start;flex-direction:column}.meaning{display:none}}
    @media(max-width:560px){.head,main{padding-left:14px;padding-right:14px}.controls{grid-template-columns:1fr}.search{grid-column:auto}.hero h2{font-size:32px}.intro{padding:17px}}
  </style>
</head>
<body>
  <header><div class="head"><div class="title-row"><h1>Lesson 1 · Full material review</h1><span class="status" id="status"></span></div><div class="controls"><input class="search" data-search placeholder="Найти фразу, слово или объяснение…"><select id="locale" aria-label="Язык объяснения"></select><select id="theme" aria-label="Тема интерфейса"><option value="gold">Gold</option><option value="ocean">Ocean</option><option value="forest">Forest</option><option value="berry">Berry</option><option value="violet">Violet</option><option value="coral">Coral</option><option value="ice">Ice</option><option value="lime">Lime</option><option value="mono">Mono</option></select></div><nav class="tabs" data-session-tabs aria-label="Материалы"></nav><nav class="tabs" data-locale-tabs aria-label="Локали"></nav></div></header>
  <main><section class="hero"><div><h2 id="sessionTitle"></h2><p id="sessionSummary"></p></div><div class="counts" id="counts"></div></section><section class="intro-grid" data-intro-pages></section><div class="phrase-tools"><h3>15 фраз и полный разбор</h3><span id="shown"></span></div><section class="phrase-list" data-phrase-list></section><section class="feedback card"><h3>Локальная заметка проверяющего</h3><textarea id="feedback" placeholder="Что исправить или что подтверждено…"></textarea><div class="saved" id="saved"></div></section></main>
  <script src="./${dataFileName}"></script>
  <script>
    (()=>{const d=window.__LEARNING_V2_REVIEW_DATA__;const $=s=>document.querySelector(s);let si=0,locale='ru',query='';const palettes={gold:['#efb84f','#74d7c5'],ocean:['#55c6ed','#8ce5ce'],forest:['#9bd36a','#e1b766'],berry:['#f07fb2','#88d8cf'],violet:['#ad8cff','#f1ba6b'],coral:['#ff8f72','#85ddcf'],ice:['#9edfff','#d5b9ff'],lime:['#b9e75d','#58d8bf'],mono:['#f2f2f2','#b8b8b8']};
    const text=(el,value)=>{el.textContent=value??''};const loc=v=>v[locale];const key=()=>['l2-review',d.range.from+'-'+d.range.to,d.sessions[si].ordinal,locale].join(':');
    function tabs(){const s=$('[data-session-tabs]');s.replaceChildren(...d.sessions.map((x,i)=>{const b=document.createElement('button');b.className='tab';b.textContent=String(x.ordinal).padStart(2,'0')+' '+x.title[locale];b.setAttribute('aria-selected',String(i===si));b.onclick=()=>{si=i;render()};return b}));const l=$('[data-locale-tabs]');l.replaceChildren(...d.localeOrder.map(code=>{const b=document.createElement('button');b.className='tab';b.textContent=code;b.setAttribute('aria-selected',String(code===locale));b.onclick=()=>{$('#locale').value=code;locale=code;render()};return b}))}
    function intro(page,index){const a=document.createElement('article');a.className='intro card';const eye=document.createElement('div');eye.className='eyebrow';text(eye,page.kind);const h=document.createElement('h3');text(h,loc(page.title));const body=document.createElement('div');body.className='body-copy';(page.bodyRuns[locale]||[{text:loc(page.body),semantic:'explanation'}]).forEach(run=>{const span=document.createElement('span');span.className=run.semantic;text(span,run.text);body.append(span)});const quiz=document.createElement('div');quiz.className='quiz';const prompt=document.createElement('strong');text(prompt,loc(page.question.prompt));const answer=document.createElement('div');answer.className='answer';page.question.choices.forEach((choice,ci)=>{const b=document.createElement('button');b.className='choice';text(b,loc(choice));b.onclick=()=>{quiz.querySelectorAll('.choice').forEach((node,j)=>node.classList.toggle(j===page.question.correctChoiceIndex?'correct':'wrong',j===ci));text(answer,loc(page.question.explanation))};quiz.append(b)});quiz.prepend(prompt);quiz.append(answer);a.append(eye,h,body,quiz);return a}
    function phrase(p,index){const hay=(p.english+' '+loc(p.localizedDetails).meaning+' '+loc(p.localizedDetails).explanation+' '+JSON.stringify(loc(p.localizedDetails))).toLocaleLowerCase();if(query&&!hay.includes(query))return null;const details=document.createElement('details');details.className='phrase card';const summary=document.createElement('summary');const n=document.createElement('span');n.className='num';text(n,String(index+1).padStart(2,'0'));const en=document.createElement('span');en.className='english';text(en,p.english);const meaning=document.createElement('span');meaning.className='meaning';text(meaning,loc(p.localizedDetails).meaning);summary.append(n,en,meaning);const content=document.createElement('div');content.className='phrase-content';const exp=document.createElement('p');text(exp,loc(p.localizedDetails).explanation);const features=document.createElement('div');features.className='features';text(features,p.features.join(' · '));const words=document.createElement('div');words.className='words';loc(p.localizedDetails).words.forEach(w=>{const box=document.createElement('section');box.className='word';const h=document.createElement('h4');text(h,w.correct);const prompt=document.createElement('p');text(prompt,w.prompt);const ul=document.createElement('ul');ul.className='wrong-list';w.distractors.forEach(x=>{const li=document.createElement('li');const token=document.createElement('span');token.className='wrong-token';text(token,x.value+' — ');li.append(token,document.createTextNode(x.reason));ul.append(li)});box.append(h,prompt,ul);words.append(box)});content.append(exp,features,words);details.append(summary,content);return details}
    function render(){const s=d.sessions[si];text($('#status'),d.status.replace('_',' '));text($('#sessionTitle'),String(s.ordinal).padStart(2,'0')+' · '+loc(s.title));text($('#sessionSummary'),loc(s.summary)+' '+loc(s.learningGoal));text($('#counts'),'3 интро · 15 фраз · 8 локалей');tabs();$('[data-intro-pages]').replaceChildren(...s.introPages.map(intro));const list=s.phrases.map(phrase).filter(Boolean);$('[data-phrase-list]').replaceChildren(...list);if(!list.length){const e=document.createElement('div');e.className='empty';text(e,'Ничего не найдено');$('[data-phrase-list]').append(e)}text($('#shown'),list.length+' / 15');$('#feedback').value=localStorage.getItem(key())||'';text($('#saved'),'')}
    d.localeOrder.forEach(code=>{const o=document.createElement('option');o.value=code;o.textContent=code;$('#locale').append(o)});$('#locale').onchange=e=>{locale=e.target.value;render()};$('[data-search]').oninput=e=>{query=e.target.value.trim().toLocaleLowerCase();render()};$('#theme').onchange=e=>{const p=palettes[e.target.value];document.documentElement.style.setProperty('--accent',p[0]);document.documentElement.style.setProperty('--accent2',p[1])};let timer;$('#feedback').oninput=e=>{clearTimeout(timer);localStorage.setItem(key(),e.target.value);timer=setTimeout(()=>text($('#saved'),'Сохранено только в этом браузере'),150)};render()})();
  </script>
</body></html>`;
}

export async function buildLesson1ReviewMock(args = process.argv.slice(2)) {
  const { from, to } = parseChapterRange(args);
  const defaults = outputNames(from, to);
  const defaultDir = resolve(ROOT, '.superpowers/brainstorm/871-1787210859/content');
  const htmlPath = resolve(ROOT, valueAfter(args, '--output') ?? resolve(defaultDir, defaults.html));
  const dataPath = resolve(ROOT, valueAfter(args, '--data-output') ?? resolve(defaultDir, defaults.data));
  const result = await evaluateLesson1Chapter(from, to);
  if (result.blockers.length > 0) {
    throw new Error(`chapter_auto_gate_blocked:${result.blockers.length}`);
  }
  const data = buildData(result);
  mkdirSync(dirname(htmlPath), { recursive: true });
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `window.__LEARNING_V2_REVIEW_DATA__=${JSON.stringify(data)};\n`, 'utf8');
  writeFileSync(htmlPath, htmlDocument(basename(dataPath)), 'utf8');
  return { htmlPath, dataPath, data };
}

async function main() {
  const built = await buildLesson1ReviewMock();
  process.stdout.write(`BUILT ${built.htmlPath}\nDATA ${built.dataPath}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
