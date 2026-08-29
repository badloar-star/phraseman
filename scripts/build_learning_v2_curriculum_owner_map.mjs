import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OVERVIEW_PATH = path.join(
  ROOT,
  "docs",
  "v2",
  "curriculum",
  "en",
  "COURSE_OVERVIEW_32_LESSONS.ru.md",
);
const OUTPUT_PATH = path.join(
  ROOT,
  ".codex-tmp",
  "learning-v2-curriculum-owner-map",
  "index.html",
);

const curriculumStatus = JSON.parse(
  process.env.LEARNING_V2_CURRICULUM_STATUS_JSON ??
    JSON.stringify({
      exactPacketCount: 0,
      holdPacketCount: 1792,
      chapterBlueprintCount: 0,
      chapterBlueprints: [],
      exactPackets: [],
      lexicalSenseCount: 0,
      blueprintFingerprint: "",
      ownerApproval: "PENDING",
      grammarOperationCount: 0,
      grammarOperationIds: [],
      dagEdgeCount: 0,
      dagFindingCount: 0,
      dagFindingCodes: [],
    }),
);
const formatInteger = (value) =>
  Number(value).toLocaleString("ru-RU").replace(/\s/g, " ");

const overview = fs.readFileSync(OVERVIEW_PATH, "utf8");

const headings = [...overview.matchAll(/^### (\d{2})\. (.+)$/gm)];
if (headings.length !== 32) {
  throw new Error(`Expected 32 lesson headings, received ${headings.length}`);
}

function value(block, labels) {
  for (const label of labels) {
    const match = block.match(new RegExp(`^- \\*\\*${label}:\\*\\* (.+(?:\\n  .+)*)`, "m"));
    if (match) return match[1].replace(/\n\s+/g, " ").trim();
  }
  return "Не заполнено";
}

const lessons = headings.map((heading, index) => {
  const start = heading.index + heading[0].length;
  const end = headings[index + 1]?.index ?? overview.length;
  const block = overview.slice(start, end);
  const ordinal = Number(heading[1]);
  return {
    ordinal,
    title: heading[2].trim(),
    canDo: value(block, ["Can-do"]),
    grammarBoundary: value(block, ["Grammar boundary", "Grammar"]),
    lexicalDomains: value(block, ["Lexical domains", "Lexicon"]),
    prerequisites: value(block, ["Prerequisites", "Entry"]),
    forbidden: value(block, ["Forbidden"]),
  };
});

const sourceStat = fs.statSync(OVERVIEW_PATH);
const buildStamp = new Date().toISOString();
const sourceStamp = sourceStat.mtime.toISOString();
const embedded = JSON.stringify({ lessons, buildStamp, sourceStamp, curriculumStatus }).replaceAll("<", "\\u003c");

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Learning V2 · Curriculum Owner Map</title>
  <style>
    :root {
      --bg: #f4f6f1;
      --surface: #ffffff;
      --surface-2: #eef2eb;
      --ink: #11231d;
      --muted: #53655e;
      --line: #cdd8d0;
      --green: #11785f;
      --green-soft: #dcefe8;
      --amber: #9b6300;
      --amber-soft: #fff0c7;
      --red: #b4384b;
      --red-soft: #fde7eb;
      --blue: #275da8;
      --blue-soft: #e3edfb;
      --focus: #174fe0;
      --shadow: 0 16px 44px rgba(17, 35, 29, .10);
      font-family: "Fira Sans", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: var(--bg); line-height: 1.5; }
    button, input, select { font: inherit; }
    button, select { cursor: pointer; }
    :focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
    .topbar {
      position: sticky; top: 0; z-index: 30; display: flex; align-items: center;
      justify-content: space-between; gap: 20px; padding: 14px clamp(18px, 4vw, 48px);
      background: rgba(255,255,255,.94); border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
    }
    .brand-kicker { color: var(--green); font: 700 12px/1.2 "Fira Code", monospace; letter-spacing: .14em; text-transform: uppercase; }
    .brand-title { margin: 3px 0 0; font-size: 20px; line-height: 1.15; }
    .stamp { color: var(--muted); font: 500 11px/1.35 "Fira Code", monospace; text-align: right; }
    main { width: min(1480px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 64px; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, .6fr); gap: 20px; align-items: end; }
    h1 { margin: 10px 0 8px; max-width: 900px; font-size: clamp(34px, 5vw, 68px); line-height: .98; letter-spacing: -.045em; }
    .lede { max-width: 800px; margin: 0; color: var(--muted); font-size: clamp(16px, 2vw, 20px); }
    .notice { padding: 18px; border: 1px solid #e2bf69; border-radius: 18px; background: var(--amber-soft); color: #5f3b00; }
    .notice strong { display: block; margin-bottom: 5px; }
    .notice details { margin-top: 10px; }
    .notice summary { min-height: 44px; display: flex; align-items: center; font-weight: 700; cursor: pointer; }
    .registry-list { max-height: 220px; overflow: auto; margin: 8px 0 0; padding-left: 20px; font: 600 11px/1.45 "Fira Code", monospace; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 26px 0; }
    .stat { min-height: 92px; padding: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; }
    .stat b { display: block; font: 700 clamp(24px, 3vw, 38px)/1 "Fira Code", monospace; }
    .stat span { display: block; margin-top: 8px; color: var(--muted); font-size: 13px; }
    .toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; gap: 10px; padding: 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); }
    .toolbar input, .toolbar select { min-width: 0; width: 100%; min-height: 46px; padding: 0 13px; color: var(--ink); background: #fff; border: 1px solid var(--line); border-radius: 12px; }
    .layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 18px; margin-top: 18px; align-items: start; }
    .lesson-list { position: sticky; top: 90px; max-height: calc(100vh - 110px); overflow: auto; padding: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; }
    .lesson-button { width: 100%; min-height: 56px; display: grid; grid-template-columns: 38px 1fr; gap: 10px; align-items: center; padding: 8px 10px; text-align: left; color: var(--ink); background: transparent; border: 1px solid transparent; border-radius: 12px; transition: background .18s, border-color .18s; }
    .lesson-button:hover { background: var(--surface-2); }
    .lesson-button[aria-current="true"] { background: var(--green-soft); border-color: #9acbb9; }
    .lesson-number { font: 700 13px/1 "Fira Code", monospace; color: var(--green); }
    .lesson-name { font-weight: 700; line-height: 1.2; }
    .panel { min-width: 0; }
    .lesson-header { padding: clamp(18px, 3vw, 28px); background: var(--surface); border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow); }
    .eyebrow { color: var(--green); font: 700 12px/1.2 "Fira Code", monospace; letter-spacing: .12em; text-transform: uppercase; }
    h2 { margin: 8px 0 10px; font-size: clamp(28px, 4vw, 46px); line-height: 1.05; letter-spacing: -.035em; }
    .lesson-can-do { margin: 0 0 20px; font-size: 18px; }
    .boundary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .boundary { padding: 14px; background: var(--surface-2); border-radius: 13px; }
    .boundary b { display: block; margin-bottom: 6px; color: var(--muted); font: 700 11px/1.2 "Fira Code", monospace; letter-spacing: .08em; text-transform: uppercase; }
    .boundary p { margin: 0; }
    .chapters { display: grid; gap: 12px; margin-top: 14px; }
    .chapter { padding: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; }
    .chapter-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
    .chapter-head h3 { margin: 0; font-size: 17px; }
    .chapter-head span { color: var(--muted); font: 500 11px/1 "Fira Code", monospace; }
    .session-grid { display: grid; grid-template-columns: repeat(8, minmax(86px, 1fr)); gap: 8px; }
    .session { position: relative; min-height: 90px; padding: 10px; text-align: left; color: var(--ink); background: var(--amber-soft); border: 1px solid #e4c575; border-radius: 13px; transition: transform .18s, box-shadow .18s, border-color .18s; }
    .session:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(17,35,29,.10); border-color: var(--amber); }
    .session.authored { background: var(--blue-soft); border-color: #97b4dd; }
    .session.planned { background: var(--green-soft); border-color: #9acbb9; }
    .session.checkpoint { box-shadow: inset 0 -4px 0 #c99021; }
    .session b { display: block; font: 700 14px/1 "Fira Code", monospace; }
    .session small { display: block; margin-top: 7px; color: #654400; font-size: 10px; line-height: 1.25; text-transform: uppercase; }
    .session.authored small { color: #244e83; }
    .session.planned small { color: #0d5f4a; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 14px 2px 0; color: var(--muted); font-size: 12px; }
    .legend i { width: 12px; height: 12px; display: inline-block; margin-right: 5px; border-radius: 3px; vertical-align: -1px; }
    dialog { width: min(760px, calc(100% - 24px)); max-height: calc(100vh - 24px); padding: 0; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 28px 90px rgba(0,0,0,.28); }
    dialog::backdrop { background: rgba(12,25,20,.55); backdrop-filter: blur(4px); }
    .dialog-head { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 20px; background: var(--surface); border-bottom: 1px solid var(--line); }
    .dialog-head h3 { margin: 4px 0 0; font-size: 28px; }
    .icon-button { width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 auto; color: var(--ink); background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; }
    .dialog-body { padding: 20px; }
    .status-pill { display: inline-flex; align-items: center; min-height: 30px; padding: 4px 10px; border-radius: 999px; color: #654400; background: var(--amber-soft); font: 700 11px/1 "Fira Code", monospace; }
    .status-pill.authored { color: #244e83; background: var(--blue-soft); }
    .status-pill.planned { color: #0d5f4a; background: var(--green-soft); }
    .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
    .detail { min-height: 100px; padding: 14px; background: var(--surface-2); border-radius: 13px; }
    .detail b { display: block; margin-bottom: 7px; color: var(--muted); font: 700 11px/1.2 "Fira Code", monospace; text-transform: uppercase; }
    .detail p { margin: 0; }
    .hold-box { margin-top: 16px; padding: 14px; color: #6a2430; background: var(--red-soft); border-left: 4px solid var(--red); border-radius: 0 12px 12px 0; }
    .empty { padding: 40px; text-align: center; color: var(--muted); }
    @media (max-width: 980px) {
      .hero, .layout { grid-template-columns: 1fr; }
      .lesson-list { position: static; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 360px; }
      .session-grid { grid-template-columns: repeat(4, minmax(86px, 1fr)); }
      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      main { width: min(100% - 20px, 1480px); padding-top: 18px; }
      .topbar { align-items: flex-start; padding: 12px; }
      .stamp { display: none; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .toolbar { grid-template-columns: 1fr; }
      .lesson-list { grid-template-columns: 1fr; max-height: 320px; }
      .boundary-grid, .detail-grid { grid-template-columns: 1fr; }
      .session-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .session { min-height: 78px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div>
      <div class="brand-kicker">Learning V2 · Curriculum authority</div>
      <p class="brand-title"><strong>Owner Map 32 × 56</strong></p>
    </div>
    <div class="stamp" id="stamp"></div>
  </header>
  <main>
    <section class="hero">
      <div>
        <div class="eyebrow">English · full topology</div>
        <h1>Весь курс виден.<br />Ничего не придумано за кадром.</h1>
        <p class="lede">Полный curriculum blueprint: 32 урока, 224 конкретные главы и 1 792 кликабельных exact session packets с grammar/review boundary, лексикой, примерами, modes и probes.</p>
      </div>
      <aside class="notice">
        <strong>Честный статус карты</strong>
        ${curriculumStatus.holdPacketCount === 0 ? `READY FOR OWNER REVIEW · все ${formatInteger(curriculumStatus.exactPacketCount)} packets материализованы; это ещё не release approval.` : `HOLD · ${formatInteger(curriculumStatus.holdPacketCount)} exact packets ещё не материализованы.`}
        <details><summary>${curriculumStatus.grammarOperationCount} grammar IDs</summary><ul class="registry-list">${curriculumStatus.grammarOperationIds.map((id) => `<li>${id}</li>`).join("")}</ul></details>
      </aside>
    </section>

    <section class="stats" aria-label="Статистика curriculum"
      data-curriculum-exact-packets="${curriculumStatus.exactPacketCount}"
      data-curriculum-hold-packets="${curriculumStatus.holdPacketCount}"
      data-curriculum-chapter-blueprints="${curriculumStatus.chapterBlueprintCount}"
      data-curriculum-lexical-senses="${curriculumStatus.lexicalSenseCount}"
      data-curriculum-grammar-operations="${curriculumStatus.grammarOperationCount}"
      data-curriculum-dag-edges="${curriculumStatus.dagEdgeCount}"
      data-curriculum-dag-findings="${curriculumStatus.dagFindingCount}">
      <div class="stat"><b>32</b><span>урока</span></div>
      <div class="stat"><b>224</b><span>главы</span></div>
      <div class="stat"><b>${curriculumStatus.chapterBlueprintCount}</b><span>chapter blueprints</span></div>
      <div class="stat"><b>1 792</b><span>session slots</span></div>
      <div class="stat"><b>${curriculumStatus.exactPacketCount}</b><span>exact packets</span></div>
      <div class="stat"><b>${curriculumStatus.grammarOperationCount}</b><span>grammar operations</span></div>
      <div class="stat"><b>${curriculumStatus.lexicalSenseCount}</b><span>lexical senses</span></div>
      <div class="stat"><b>${curriculumStatus.dagEdgeCount}</b><span>DAG edges</span></div>
      <div class="stat"><b>${curriculumStatus.dagFindingCount}</b><span>DAG findings</span></div>
      <div class="stat"><b>3</b><span>authored, ждут conformance</span></div>
    </section>

    <section class="toolbar" aria-label="Фильтры карты">
      <input id="search" type="search" placeholder="Найти урок по названию или can-do" aria-label="Поиск урока" />
      <select id="statusFilter" aria-label="Фильтр session status">
        <option value="all">Все session statuses</option>
        <option value="planned">Planned / owner review</option>
        <option value="authored">Authored / conformance pending</option>
        <option value="checkpoint">Только checkpoints</option>
      </select>
      <select id="lessonSelect" aria-label="Перейти к уроку"></select>
    </section>

    <div class="layout">
      <nav class="lesson-list" id="lessonList" aria-label="32 урока"></nav>
      <section class="panel" id="panel" aria-live="polite"></section>
    </div>
  </main>

  <dialog id="sessionDialog" aria-labelledby="dialogTitle">
    <div class="dialog-head">
      <div>
        <div class="eyebrow" id="dialogEyebrow"></div>
        <h3 id="dialogTitle"></h3>
      </div>
      <button class="icon-button" id="closeDialog" aria-label="Закрыть детали session">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="dialog-body" id="dialogBody"></div>
  </dialog>

  <script>
    const DATA = ${embedded};
    const state = { selectedLesson: 1, search: "", filter: "all" };
    const lessonList = document.querySelector("#lessonList");
    const lessonSelect = document.querySelector("#lessonSelect");
    const panel = document.querySelector("#panel");
    const dialog = document.querySelector("#sessionDialog");

    const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const pad = (value) => String(value).padStart(2, "0");
    const sessionStatus = (lesson, session) => lesson === 1 && session <= 3 ? "authored" : "planned";
    const isCheckpoint = (session) => session % 8 === 0;
    const chapterOf = (session) => Math.ceil(session / 8);

    function sessionVisible(lesson, session) {
      if (state.filter === "all") return true;
      if (state.filter === "checkpoint") return isCheckpoint(session);
      return sessionStatus(lesson, session) === state.filter;
    }

    function renderLessonNavigation() {
      const query = state.search.trim().toLowerCase();
      const visible = DATA.lessons.filter((lesson) => !query || \`\${lesson.title} \${lesson.canDo}\`.toLowerCase().includes(query));
      lessonList.innerHTML = visible.map((lesson) => \`
        <button class="lesson-button" data-lesson="\${lesson.ordinal}" aria-current="\${lesson.ordinal === state.selectedLesson}">
          <span class="lesson-number">\${pad(lesson.ordinal)}</span>
          <span class="lesson-name">\${esc(lesson.title)}</span>
        </button>\`).join("") || \`<div class="empty">Ничего не найдено</div>\`;
      lessonList.querySelectorAll("[data-lesson]").forEach((button) => button.addEventListener("click", () => selectLesson(Number(button.dataset.lesson))));
    }

    function renderPanel() {
      const lesson = DATA.lessons.find((item) => item.ordinal === state.selectedLesson) || DATA.lessons[0];
      const chapterBlueprints = DATA.curriculumStatus.chapterBlueprints.filter((chapter) => chapter.lessonOrdinal === lesson.ordinal);
      const chapters = Array.from({ length: 7 }, (_, chapterIndex) => {
        const chapterBlueprint = chapterBlueprints[chapterIndex];
        const first = chapterIndex * 8 + 1;
        const sessions = Array.from({ length: 8 }, (_, offset) => first + offset).filter((session) => sessionVisible(lesson.ordinal, session));
        if (!sessions.length) return "";
        return \`<section class="chapter">
          <div class="chapter-head"><div><h3>Глава \${chapterIndex + 1} · \${chapterBlueprint?.grammarOperationId ? "NEW GRAMMAR" : "REVIEW / TRANSFER"}</h3><p>\${esc(chapterBlueprint?.primaryCanDoStep || "Chapter blueprint отсутствует")}</p></div><span>SESSIONS \${pad(first)}–\${pad(first + 7)}</span></div>
          <div class="session-grid">\${sessions.map((session) => {
            const status = sessionStatus(lesson.ordinal, session);
            const checkpoint = isCheckpoint(session);
            return \`<button class="session \${status} \${checkpoint ? "checkpoint" : ""}" data-session="\${session}" aria-label="Открыть session \${session}">
              <b>\${pad(session)}</b>
              <small>\${session === 56 ? "lesson final" : checkpoint ? "chapter checkpoint" : status === "authored" ? "authored · audit" : "exact packet · review"}</small>
            </button>\`;
          }).join("")}</div>
        </section>\`;
      }).join("");

      panel.innerHTML = \`<article class="lesson-header">
        <div class="eyebrow">Lesson \${pad(lesson.ordinal)} · boundary draft</div>
        <h2>\${esc(lesson.title)}</h2>
        <p class="lesson-can-do">\${esc(lesson.canDo)}</p>
        <div class="boundary-grid">
          <div class="boundary"><b>Grammar boundary</b><p>\${esc(lesson.grammarBoundary)}</p></div>
          <div class="boundary"><b>Lexical domains</b><p>\${esc(lesson.lexicalDomains)}</p></div>
          <div class="boundary"><b>Prerequisites</b><p>\${esc(lesson.prerequisites)}</p></div>
          <div class="boundary"><b>Forbidden future material</b><p>\${esc(lesson.forbidden)}</p></div>
        </div>
      </article>
      <div class="legend"><span><i style="background:var(--green-soft);border:1px solid #9acbb9"></i>Exact packet / owner review</span><span><i style="background:var(--blue-soft);border:1px solid #97b4dd"></i>Authored / conformance pending</span><span><i style="background:#c99021"></i>Checkpoint position</span></div>
      <div class="chapters">\${chapters || \`<div class="empty">В этом фильтре нет sessions</div>\`}</div>\`;

      panel.querySelectorAll("[data-session]").forEach((button) => button.addEventListener("click", () => openSession(lesson, Number(button.dataset.session))));
    }

    function selectLesson(ordinal) {
      state.selectedLesson = ordinal;
      lessonSelect.value = String(ordinal);
      renderLessonNavigation();
      renderPanel();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openSession(lesson, session) {
      const status = sessionStatus(lesson.ordinal, session);
      const checkpoint = isCheckpoint(session);
      const chapter = DATA.curriculumStatus.chapterBlueprints.find((item) => item.lessonOrdinal === lesson.ordinal && item.chapterOrdinal === chapterOf(session));
      const packet = DATA.curriculumStatus.exactPackets.find((item) => item.lessonOrdinal === lesson.ordinal && item.sessionOrdinal === session);
      document.querySelector("#dialogEyebrow").textContent = \`Lesson \${pad(lesson.ordinal)} · Chapter \${chapterOf(session)}\`;
      document.querySelector("#dialogTitle").textContent = \`Session \${pad(session)}\`;
      document.querySelector("#dialogBody").innerHTML = \`
        <span class="status-pill \${status}">\${status === "authored" ? "AUTHORED · CONFORMANCE PENDING" : "EXACT PACKET · OWNER REVIEW REQUIRED"}</span>
        <div class="detail-grid">
          <div class="detail"><b>Exact role</b><p>\${esc(packet?.role || "Packet отсутствует")}</p></div>
          <div class="detail"><b>Exact can-do</b><p>\${esc(packet?.primaryCanDoStep || chapter?.primaryCanDoStep || "Packet отсутствует")}</p></div>
          <div class="detail"><b>Grammar / review boundary</b><p>\${esc(packet?.grammarOperationId || (packet?.reviewConstructIds?.join(", ") || "Packet отсутствует"))}</p></div>
          <div class="detail"><b>Lexical plan</b><p>NEW: \${esc(packet?.newLexicalSenseIds?.join(", ") || "—")}<br>RETRIEVAL: \${esc(packet?.retrievalLexicalSenseIds?.join(", ") || "—")}</p></div>
          <div class="detail"><b>Examples</b><p>\${(packet?.canonicalEnglishExamples || []).map(esc).join("<br>")}</p></div>
          <div class="detail"><b>Learning delta</b><p>\${esc(packet?.learningDelta?.join(", ") || "Packet отсутствует")}</p></div>
          <div class="detail"><b>Required modes</b><p>\${esc(packet?.requiredModeFamilies?.join(", ") || "Packet отсутствует")}</p></div>
          <div class="detail"><b>Independent evidence</b><p>\${esc(packet?.independentProbeId || "Packet отсутствует")}</p></div>
          <div class="detail"><b>Registry / DAG</b><p>\${DATA.curriculumStatus.grammarOperationCount} operations · \${DATA.curriculumStatus.dagEdgeCount} edges · \${DATA.curriculumStatus.dagFindingCount} findings.</p></div>
        </div>
        <div class="hold-box"><strong>До release:</strong> curriculum packet материализован и проходит структурные gates, но learner-facing текст, дистракторы, feedback, локализации и audio не генерируются до owner review полного fingerprint.</div>\`;
      dialog.showModal();
    }

    lessonSelect.innerHTML = DATA.lessons.map((lesson) => \`<option value="\${lesson.ordinal}">\${pad(lesson.ordinal)} · \${esc(lesson.title)}</option>\`).join("");
    lessonSelect.addEventListener("change", (event) => selectLesson(Number(event.target.value)));
    document.querySelector("#search").addEventListener("input", (event) => { state.search = event.target.value; renderLessonNavigation(); });
    document.querySelector("#statusFilter").addEventListener("change", (event) => { state.filter = event.target.value; renderPanel(); });
    document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    document.querySelector("#stamp").textContent = \`fingerprint \${DATA.curriculumStatus.blueprintFingerprint.slice(0, 12)} · owner \${DATA.curriculumStatus.ownerApproval} · build \${DATA.buildStamp.slice(0, 19)}Z\`;
    renderLessonNavigation();
    renderPanel();
  </script>
</body>
</html>`;

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, html, "utf8");
console.log(JSON.stringify({
  ok: true,
  lessons: lessons.length,
  chapters: lessons.length * 7,
  sessionSlots: lessons.length * 56,
  exactPackets: curriculumStatus.exactPacketCount,
  chapterBlueprints: curriculumStatus.chapterBlueprintCount,
  lexicalSenses: curriculumStatus.lexicalSenseCount,
  grammarOperations: curriculumStatus.grammarOperationCount,
  dagEdges: curriculumStatus.dagEdgeCount,
  dagFindings: curriculumStatus.dagFindingCount,
  output: OUTPUT_PATH,
}));
