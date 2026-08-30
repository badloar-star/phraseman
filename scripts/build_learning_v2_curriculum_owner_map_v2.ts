import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v2";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2";

const blueprint = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2;
const manifest = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2;
const outputDir = resolve(".codex-tmp/learning-v2-curriculum-owner-map");
const outputPath = join(outputDir, "index.html");

const ownerModel = Object.freeze({
  fingerprint: manifest.fingerprint,
  ownerApproval: manifest.ownerApproval,
  lessons: blueprint.scope.lessons.map((lesson) => Object.freeze({
    lessonOrdinal: lesson.lessonOrdinal,
    majorSystemId: lesson.majorSystemId,
    titleRu: lesson.titleRu,
    terminalCanDoRu: lesson.terminalCanDoRu,
    chapters: blueprint.chapters
      .filter((chapter) => chapter.lessonOrdinal === lesson.lessonOrdinal)
      .map((chapter) => Object.freeze({
        chapterOrdinal: chapter.chapterOrdinal,
        titleRu: chapter.titleRu,
        primaryCanDoStepRu: chapter.primaryCanDoStepRu,
        newOperationIds: chapter.newOperationIds,
        reviewOperationIds: chapter.reviewOperationIds,
        packets: blueprint.sessionPackets.filter(
          (packet) =>
            packet.lessonOrdinal === lesson.lessonOrdinal &&
            packet.chapterOrdinal === chapter.chapterOrdinal,
        ).map((packet) => Object.freeze({
          sessionId: packet.sessionId,
          lessonOrdinal: packet.lessonOrdinal,
          chapterOrdinal: packet.chapterOrdinal,
          sessionOrdinal: packet.sessionOrdinal,
          role: packet.role,
          learningDeltaRu: packet.learningDeltaRu,
          grammarOperationIds: packet.grammarOperationIds,
          reviewOperationIds: packet.reviewOperationIds,
          newLexicalSenseIds: packet.newLexicalSenseIds,
          retrievalLexicalSenseIds: packet.retrievalLexicalSenseIds,
          lexicalPlanRu: packet.lexicalPlanRu,
          canonicalExamples: packet.canonicalExamples,
          introPlan: packet.introPlan.map((item) => Object.freeze({
            slot: item.slot,
            purpose: item.purpose,
            testedDimension: item.testedDimension,
          })),
          activityPlan: packet.activityPlan.map((item) => Object.freeze({
            slot: item.slot,
            modeFamily: item.modeFamily,
            support: item.support,
            scored: item.scored,
          })),
          learnerFacingAuthoringStatus: packet.learnerFacingAuthoringStatus,
        })),
      })),
  })),
});

const serializedModel = JSON.stringify(ownerModel).replace(/<\//g, "<\\/");

const html = `<!doctype html>
<html lang="ru" data-curriculum-lessons="32" data-curriculum-chapters="224" data-curriculum-exact-packets="1792" data-owner-approval="${manifest.ownerApproval}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Learning V2 · Full B1 Curriculum Owner Map</title>
  <style>
    :root{--bg:#f5f7f2;--surface:#fff;--soft:#edf2ea;--line:#cad6cb;--ink:#10271f;--muted:#53685f;--brand:#116b55;--brand2:#2f8f72;--warn:#f0b43c;--warnInk:#3d2900;--danger:#b83b4c;--shadow:0 14px 38px rgba(16,39,31,.12)}
    *{box-sizing:border-box}html{background:var(--bg);color:var(--ink);font-family:"Segoe UI",Arial,sans-serif}body{margin:0;min-height:100vh}button{font:inherit;color:inherit}
    .shell{max-width:1440px;margin:0 auto;padding:24px}.top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:start;margin-bottom:24px}.eyebrow{font:700 12px/1.2 Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--brand)}h1{font-size:clamp(32px,5vw,64px);line-height:1.02;margin:10px 0 12px;max-width:900px}.lede{color:var(--muted);font-size:18px;line-height:1.55;max-width:780px;margin:0}.status{background:#fff2c9;border:1px solid #e0bd63;border-radius:18px;padding:16px;min-width:250px}.status strong{display:block;color:var(--warnInk);margin-bottom:6px}.hash{font:600 11px/1.5 Consolas,monospace;overflow-wrap:anywhere;color:#59420c}
    .notice{border-left:5px solid var(--danger);background:#fae8eb;padding:14px 16px;border-radius:0 14px 14px 0;margin:18px 0 24px;font-weight:650}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:24px}.stat{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px}.stat b{font-size:28px;display:block}.stat span{color:var(--muted)}
    .toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;margin:28px 0 14px}.toolbar h2{margin:0;font-size:24px}.crumb{color:var(--muted);font-weight:600}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.card{appearance:none;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:18px;padding:18px;min-height:172px;cursor:pointer;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.card:hover{border-color:var(--brand2);box-shadow:0 8px 24px rgba(17,107,85,.12)}.card:focus-visible,.iconButton:focus-visible,.back:focus-visible{outline:3px solid #f0b43c;outline-offset:3px}.card .n{font:700 12px/1.2 Consolas,monospace;color:var(--brand);letter-spacing:.1em}.card h3{font-size:21px;line-height:1.2;margin:14px 0 8px}.card p{color:var(--muted);line-height:1.45;margin:0}.meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.pill{font:700 11px/1 Consolas,monospace;padding:7px 9px;border-radius:999px;background:var(--soft);color:var(--brand)}.back{min-height:44px;border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:0 16px;cursor:pointer;font-weight:700}.hidden{display:none!important}
    dialog{width:min(980px,calc(100vw - 32px));max-height:calc(100vh - 32px);border:0;border-radius:24px;padding:0;box-shadow:var(--shadow);color:var(--ink)}dialog::backdrop{background:rgba(10,25,20,.62);backdrop-filter:blur(5px)}.modalHead{position:sticky;top:0;z-index:2;background:var(--surface);border-bottom:1px solid var(--line);padding:20px 24px;display:flex;justify-content:space-between;gap:16px}.modalHead h2{margin:5px 0 0;font-size:30px}.iconButton{width:48px;height:48px;border:1px solid var(--line);border-radius:14px;background:var(--soft);cursor:pointer;font-size:28px;line-height:1}.modalBody{padding:22px 24px 30px;background:var(--bg)}.packetGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px}.box h3{font:700 12px/1.2 Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--brand);margin:0 0 10px}.box p,.box li{line-height:1.5}.wide{grid-column:1/-1}.rows{display:grid;gap:8px}.row{display:grid;grid-template-columns:52px minmax(130px,.8fr) minmax(0,2fr);gap:12px;align-items:start;background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:12px}.row b{color:var(--brand)}.code{font:600 12px/1.45 Consolas,monospace;overflow-wrap:anywhere}.pending{color:#795400;font-weight:750}
    @media(max-width:980px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.top{grid-template-columns:1fr}.status{min-width:0}.packetGrid{grid-template-columns:1fr}.wide{grid-column:auto}}
    @media(max-width:580px){.shell{padding:16px}.grid,.stats{grid-template-columns:1fr}.row{grid-template-columns:42px 1fr}.row>:last-child{grid-column:1/-1}.modalHead,.modalBody{padding-left:16px;padding-right:16px}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}.card:hover{box-shadow:none}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top">
      <div><div class="eyebrow">Learning V2 · English curriculum</div><h1>FULL B1 GRAMMAR-FIRST · OWNER REVIEW REQUIRED</h1><p class="lede">Кликабельная карта фиксирует весь порядок грамматики заранее: 32 грамматических урока, 224 главы и 1 792 точных планировочных пакета. Learner-facing тексты пишутся только последовательно после отдельного одобрения fingerprint.</p></div>
      <aside class="status" aria-label="Статус утверждения"><strong>OWNER ${manifest.ownerApproval}</strong><div class="hash">${manifest.fingerprint}</div></aside>
    </header>
    <div class="notice">SUPERSEDED BY OWNER DECISION — FULL B1 GRAMMAR-FIRST REBUILD. Старый blueprint и его approval не действуют.</div>
    <section class="stats" aria-label="Сводка"><div class="stat"><b>32</b><span>урока грамматики</span></div><div class="stat"><b>224</b><span>главы</span></div><div class="stat"><b>1 792</b><span>session packets</span></div><div class="stat"><b>0</b><span>semantic findings</span></div></section>
    <div class="toolbar"><div><h2 id="viewTitle">Все уроки</h2><div class="crumb" id="crumb">Present be affirmative → Probability and deduction</div></div><button class="back hidden" id="backButton" type="button">Назад</button></div>
    <section class="grid" id="cards" aria-live="polite"></section>
  </main>
  <dialog id="sessionDialog" aria-labelledby="dialogTitle"><div class="modalHead"><div><div class="eyebrow" id="dialogEyebrow"></div><h2 id="dialogTitle"></h2></div><button class="iconButton" id="closeDialog" type="button" aria-label="Закрыть">×</button></div><div class="modalBody" id="dialogBody"></div></dialog>
  <script id="curriculum-data" type="application/json">${serializedModel}</script>
  <script>
    const model=JSON.parse(document.getElementById('curriculum-data').textContent);const cards=document.getElementById('cards');const title=document.getElementById('viewTitle');const crumb=document.getElementById('crumb');const back=document.getElementById('backButton');const dialog=document.getElementById('sessionDialog');let selectedLesson=null;let selectedChapter=null;
    const esc=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function card(label,heading,body,meta,onClick){const b=document.createElement('button');b.type='button';b.className='card';b.innerHTML='<div class="n">'+esc(label)+'</div><h3>'+esc(heading)+'</h3><p>'+esc(body)+'</p><div class="meta">'+meta.map(x=>'<span class="pill">'+esc(x)+'</span>').join('')+'</div>';b.addEventListener('click',onClick);return b}
    function renderLessons(){selectedLesson=null;selectedChapter=null;title.textContent='Все 32 грамматических урока';crumb.textContent='Present be affirmative → Probability and deduction';back.classList.add('hidden');cards.replaceChildren(...model.lessons.map(l=>card('LESSON '+String(l.lessonOrdinal).padStart(2,'0'),l.titleRu,l.terminalCanDoRu,[l.majorSystemId,'7 глав','56 сессий'],()=>renderChapters(l))))}
    function renderChapters(lesson){selectedLesson=lesson;selectedChapter=null;title.textContent=lesson.titleRu;crumb.textContent='Урок '+lesson.lessonOrdinal+' · 7 глав · 56 сессий';back.classList.remove('hidden');cards.replaceChildren(...lesson.chapters.map(c=>card('CHAPTER '+String(c.chapterOrdinal).padStart(2,'0'),c.titleRu,c.primaryCanDoStepRu,[c.newOperationIds.length+' new ops',c.reviewOperationIds.length+' review ops','8 сессий'],()=>renderSessions(c))))}
    function renderSessions(chapter){selectedChapter=chapter;title.textContent=chapter.titleRu;crumb.textContent='Урок '+selectedLesson.lessonOrdinal+' · глава '+chapter.chapterOrdinal+' · 8 exact packets';cards.replaceChildren(...chapter.packets.map(p=>card('SESSION '+String(p.sessionOrdinal).padStart(2,'0'),p.role,p.learningDeltaRu,[p.grammarOperationIds.length?'NEW GRAMMAR':'REVIEW',p.newLexicalSenseIds.length+' new senses','3 + 17'],()=>openPacket(p))))}
    function list(items){return items.length?'<ul>'+items.map(x=>'<li class="code">'+esc(x)+'</li>').join('')+'</ul>':'<p>Нет — только ранее объяснённый материал.</p>'}
    function openPacket(p){const focus=[...p.grammarOperationIds,...p.reviewOperationIds];const lexical=[...p.newLexicalSenseIds,...p.retrievalLexicalSenseIds];document.getElementById('dialogEyebrow').textContent='LESSON '+String(p.lessonOrdinal).padStart(2,'0')+' · CHAPTER '+p.chapterOrdinal;document.getElementById('dialogTitle').textContent='Session '+String(p.sessionOrdinal).padStart(2,'0');document.getElementById('dialogBody').innerHTML='<div class="packetGrid"><section class="box"><h3>Grammar operation</h3>'+list(p.grammarOperationIds)+'</section><section class="box"><h3>Deliberate review</h3>'+list(p.reviewOperationIds)+'</section><section class="box"><h3>Lexical plan</h3>'+list([...p.newLexicalSenseIds.map(x=>'NEW '+x),...p.retrievalLexicalSenseIds.map(x=>'RETRIEVE '+x)])+'<p>'+esc(p.lexicalPlanRu)+'</p></section><section class="box"><h3>Canonical examples</h3>'+list(p.canonicalExamples)+'</section><section class="box wide"><h3>Three intro functions</h3><div class="rows">'+p.introPlan.map(i=>'<div class="row"><b>'+i.slot+'</b><span>'+esc(i.purpose)+'</span><span class="code">'+esc(focus.join(', '))+' · '+esc(i.testedDimension)+'</span></div>').join('')+'</div></section><section class="box wide"><h3>Seventeen mode-native activity plans</h3><div class="rows">'+p.activityPlan.map((a,index)=>'<div class="row"><b>'+a.slot+'</b><span>'+esc(a.modeFamily)+'</span><span><span class="code">'+esc(focus.join(', '))+(lexical.length?'<br>LEX '+esc(lexical.join(', ')):'')+'</span><br>'+esc(p.canonicalExamples[index%p.canonicalExamples.length])+'<br><small>'+esc(a.support)+' · '+(a.scored?'scored':'grounded contact')+'</small></span></div>').join('')+'</div></section><section class="box wide"><h3>Authoring boundary</h3><p class="pending">PLANNED_NOT_AUTHORED — тексты интро, дистракторы, feedback и локализации создаются вручную только для первой разрешённой сессии после owner approval.</p></section></div>';dialog.showModal();document.getElementById('closeDialog').focus()}
    back.addEventListener('click',()=>selectedChapter?renderChapters(selectedLesson):renderLessons());document.getElementById('closeDialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',(e)=>{if(e.target===dialog)dialog.close()});renderLessons();
  </script>
</body></html>`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, html, "utf8");
process.stdout.write(`LEARNING V2 CURRICULUM OWNER MAP V2: BUILT ${outputPath}\n`);
