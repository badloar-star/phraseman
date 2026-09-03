#!/usr/bin/env node
// Макет для владельца: один HTML, в котором можно ПРОЙТИ любую написанную сессию.
//
// зачем (владелец, 03.09): «чтобы пройти любую сессию нужен полноценный макет,
// как делал Codex, и там чтобы каждая сессия, которая написана, была».
// Читает собранный релиз (release/**/learner.json + intro.json + answers.json) —
// то есть проверяет заодно и сборщик: что попало в макет, то попадёт в телефон.
//
// Запуск: node build_mockup.mjs [--out ../../../.codex-tmp/learning-v2-mockup/index.html]
//
// Логи: префикс [MOCKUP], каждый ранний выход пишет причину.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOG = (...a) => console.log("[MOCKUP]", ...a);
const WARN = (...a) => console.warn("[MOCKUP][WARN]", ...a);

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const OUT = path.resolve(opt("out", path.join(ROOT, "..", "..", ".codex-tmp", "learning-v2-mockup", "index.html")));
const RELEASE = path.join(ROOT, "release");

// ---------- сбор сессий ----------
function collect() {
  if (!fs.existsSync(RELEASE)) { LOG(`ранний выход: нет папки релиза ${RELEASE} — сначала node build_release.mjs`); process.exit(2); }
  const out = [];
  for (const lang of fs.readdirSync(RELEASE)) {
    const langDir = path.join(RELEASE, lang);
    if (!fs.statSync(langDir).isDirectory()) continue;
    for (const lesson of fs.readdirSync(langDir).sort()) {
      const lessonDir = path.join(langDir, lesson);
      if (!fs.statSync(lessonDir).isDirectory()) continue;
      for (const session of fs.readdirSync(lessonDir).sort()) {
        const d = path.join(lessonDir, session);
        const learner = path.join(d, "learner.json");
        const intro = path.join(d, "intro.json");
        if (!fs.existsSync(learner) || !fs.existsSync(intro)) { WARN(`${lang}/${lesson}/${session}: нет learner.json или intro.json — пропущена`); continue; }
        const answers = fs.existsSync(path.join(d, "answers.json")) ? JSON.parse(fs.readFileSync(path.join(d, "answers.json"), "utf8")) : [];
        // заголовок и сцена — из мастера, их нет в релизе
        const srcMd = path.join(ROOT, "sessions", lang, lesson, session, "final.ru.md");
        let title = `${lesson}/${session}`, scene = "";
        if (fs.existsSync(srcMd)) {
          const md = fs.readFileSync(srcMd, "utf8");
          title = /^#\s+(.+)$/m.exec(md)?.[1]?.replace(/^Английский · /, "").trim() ?? title;
          scene = /\*\*Сцена сессии\.\*\*\s*([\s\S]*?)\n\n/.exec(md)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
        } else WARN(`${lang}/${lesson}/${session}: нет final.ru.md — заголовок и сцена будут пустыми`);
        out.push({
          key: `${lang}/${lesson}/${session}`, lang, lesson, session, title, scene,
          intro: JSON.parse(fs.readFileSync(intro, "utf8")),
          learner: JSON.parse(fs.readFileSync(learner, "utf8")),
          answers,
        });
      }
    }
  }
  return out;
}

const sessions = collect();
if (!sessions.length) { LOG("ранний выход: в релизе нет ни одной сессии"); process.exit(2); }
LOG(`сессий в макете: ${sessions.length} — ${sessions.map((s) => s.key).join(", ")}`);

const locales = [...new Set(sessions.flatMap((s) => Object.keys(s.intro.pages?.[0]?.titleByLocale ?? { ru: 1 })))];
LOG(`локали: ${locales.join(", ")}`);

// ---------- HTML ----------
const html = `<!doctype html>
<html lang="ru" data-learning-v2-mockup="v1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#eef2e9">
<title>Learning V2 · Пройти сессию</title>
<style>
:root{
  color-scheme:light;
  --bg:#eef2e9; --surface:#fbfdf7; --surface-2:#e7ede4; --sunken:#dde5da;
  --text:#12231d; --muted:#5d6b65; --accent:#17715a; --target:#0b8264;
  --danger:#c0413f; --gold:#b77813;
  --shadow-sm:0 2px 8px rgba(20,44,34,.06);
  --shadow:0 12px 36px rgba(20,44,34,.10);
  --shadow-lg:0 24px 70px rgba(20,44,34,.16);
  --r-sm:12px; --r:18px; --r-lg:26px;
  --ease:cubic-bezier(.23,1,.32,1);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  --z-sticky:20; --z-overlay:40;
}
*{box-sizing:border-box}
html,body{margin:0}
body{min-height:100vh;background:radial-gradient(circle at 50% -25%,#fff 0,#eef2e9 46%,#dde7dc 100%);color:var(--text);-webkit-font-smoothing:antialiased}
button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
button:disabled{cursor:default}

.topbar{position:sticky;top:0;z-index:var(--z-sticky);display:flex;align-items:center;gap:14px;
  height:60px;padding:0 max(18px,calc((100vw - 900px)/2));
  background:rgba(251,253,247,.82);backdrop-filter:blur(20px);box-shadow:0 1px 0 rgba(18,35,29,.07)}
.brand{font-weight:800;letter-spacing:-.02em;font-size:15px}
.brand span{display:block;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);margin-top:1px}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.pill{background:var(--surface-2);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--muted)}
select.pill{-webkit-appearance:none;appearance:none;padding-right:30px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235d6b65' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;color:var(--text)}

.shell{width:min(100%,900px);margin:0 auto;padding:26px 20px 90px}

/* ---- дом ---- */
.hero{padding:18px 4px 26px}
.hero h1{margin:0 0 8px;font-size:clamp(26px,4.6vw,38px);letter-spacing:-.035em;line-height:1.08;text-wrap:balance}
.hero p{margin:0;color:var(--muted);font-size:15px;max-width:62ch;line-height:1.5}
.lesson-title{margin:26px 4px 12px;font-size:13px;font-weight:700;letter-spacing:.04em;color:var(--muted)}
.cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(268px,1fr))}
.card{position:relative;text-align:left;padding:18px 18px 16px;border-radius:var(--r);
  background:var(--surface);box-shadow:var(--shadow-sm);
  transition:transform .32s var(--ease),box-shadow .32s var(--ease)}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.card:active{transform:translateY(-1px) scale(.995)}
.card h3{margin:0 0 6px;font-size:16px;letter-spacing:-.02em;line-height:1.25}
.card .scene{margin:0;font-size:13px;color:var(--muted);line-height:1.45;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{margin-top:12px;display:flex;gap:8px;align-items:center}
.chip{font-size:11px;font-weight:700;letter-spacing:.02em;padding:4px 9px;border-radius:999px;
  background:var(--surface-2);color:var(--muted)}
.chip.k{background:rgba(11,130,100,.11);color:var(--target)}

/* ---- прохождение ---- */
.progress{display:flex;gap:4px;margin:0 0 22px}
.progress i{height:4px;flex:1;border-radius:2px;background:var(--sunken);transition:background .3s var(--ease)}
.progress i.done{background:var(--target)}
.progress i.now{background:var(--accent)}

.panel{background:var(--surface);border-radius:var(--r-lg);padding:26px;box-shadow:var(--shadow);
  animation:rise .42s var(--ease) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.kind{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.panel h2{margin:0 0 14px;font-size:clamp(20px,3.4vw,26px);letter-spacing:-.03em;line-height:1.18;text-wrap:balance}
.body{font-size:16px;line-height:1.62;color:var(--text);max-width:64ch;text-wrap:pretty}
/* целевой язык внутри объяснения — цветом, а не кавычками (владелец 03.09) */
.tl{color:var(--target);font-weight:600;white-space:nowrap}
.body p{margin:0 0 13px}
.body p:last-child{margin-bottom:0}
.question{margin:24px 0 14px;font-size:16px;font-weight:650;line-height:1.4}
.task-prompt{margin:0 0 18px;font-size:17px;font-weight:650;letter-spacing:-.01em;line-height:1.35}
.scene-line{margin:0 0 16px;font-size:14px;color:var(--muted);line-height:1.5}

.opts{display:grid;gap:9px}
.opt{position:relative;text-align:left;padding:15px 17px;border-radius:var(--r);
  background:var(--surface-2);font-size:16px;font-weight:550;
  transition:transform .2s var(--ease),background .2s var(--ease),box-shadow .2s var(--ease)}
.opt:not(:disabled):hover{background:var(--sunken);transform:translateX(2px)}
.opt:not(:disabled):active{transform:scale(.985)}
.opt.right{background:rgba(11,130,100,.14);color:var(--target);font-weight:700}
.opt.wrong{background:rgba(192,65,63,.11);color:var(--danger)}
.opt.dim{opacity:.5}

.fb{margin-top:12px;padding:14px 16px;border-radius:var(--r);font-size:14.5px;line-height:1.5;
  background:var(--surface-2);color:var(--muted);animation:rise .3s var(--ease) both}
.fb.ok{background:rgba(11,130,100,.10);color:var(--target)}
.fb.no{background:rgba(192,65,63,.09);color:#8f3230}

/* плитки */
.slot{min-height:56px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;
  padding:12px;border-radius:var(--r);background:var(--sunken);margin-bottom:14px}
.slot:empty::after{content:attr(data-hint);color:var(--muted);font-size:14px}
.tiles{display:flex;flex-wrap:wrap;gap:8px}
.tile{padding:11px 15px;border-radius:14px;background:var(--surface-2);font-size:16px;font-weight:600;
  box-shadow:var(--shadow-sm);transition:transform .2s var(--ease),opacity .2s var(--ease)}
.tile:not(:disabled):hover{transform:translateY(-2px)}
.tile:not(:disabled):active{transform:scale(.95)}
.tile.used{opacity:.28;pointer-events:none}
.slot .tile{background:var(--surface);box-shadow:none}

/* пары */
.pairs{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.pair{padding:14px;border-radius:var(--r);background:var(--surface-2);font-size:15px;font-weight:600;text-align:center;
  transition:transform .2s var(--ease),background .2s var(--ease)}
.pair.sel{background:rgba(23,113,90,.16);color:var(--accent)}
.pair.gone{opacity:.25;pointer-events:none}
.pair:not(:disabled):active{transform:scale(.96)}

/* аудио и голос */
.play{display:inline-flex;align-items:center;gap:9px;padding:13px 20px;border-radius:999px;
  background:var(--accent);color:#fff;font-weight:650;font-size:15px;box-shadow:var(--shadow-sm);
  transition:transform .22s var(--ease),box-shadow .22s var(--ease)}
.play:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.play:active{transform:scale(.96)}
.target-phrase{font-size:clamp(22px,4vw,30px);font-weight:700;letter-spacing:-.02em;margin:18px 0;color:var(--target)}
.card-word{font-size:clamp(26px,5vw,36px);font-weight:800;letter-spacing:-.03em;color:var(--target);margin:6px 0 10px}
.card-def{font-size:16px;line-height:1.55;color:var(--text);max-width:52ch}

.actions{display:flex;gap:10px;margin-top:22px;align-items:center}
.btn{padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;
  transition:transform .22s var(--ease),box-shadow .22s var(--ease),opacity .2s}
.btn.primary{background:var(--accent);color:#fff;box-shadow:var(--shadow-sm)}
.btn.primary:not(:disabled):hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.btn.primary:not(:disabled):active{transform:scale(.97)}
.btn.primary:disabled{opacity:.4}
.btn.ghost{background:var(--surface-2);color:var(--muted)}
.btn.ghost:hover{background:var(--sunken)}
.spacer{margin-left:auto}

/* финал */
.done-wrap{text-align:center;padding:40px 20px}
.done-mark{font-size:56px;line-height:1;margin-bottom:16px;animation:pop .6s var(--ease) both}
@keyframes pop{0%{opacity:0;transform:scale(.6)}60%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
.done-wrap h2{margin:0 0 10px;font-size:28px;letter-spacing:-.03em}
.done-wrap p{margin:0 0 24px;color:var(--muted);font-size:16px}
.stats{display:flex;gap:26px;justify-content:center;margin-bottom:28px}
.stat b{display:block;font-size:26px;letter-spacing:-.02em}
.stat span{font-size:12px;color:var(--muted);font-weight:600}

@media (max-width:560px){
  .shell{padding:18px 14px 80px}
  .panel{padding:20px 18px;border-radius:var(--r)}
  .pairs{grid-template-columns:1fr 1fr}
}
@media (prefers-reduced-motion:reduce){
  *{animation-duration:.01ms!important;transition-duration:.01ms!important}
}
</style>
</head>
<body>
<div class="topbar">
  <div class="brand">Learning V2<span>Пройти сессию</span></div>
  <div class="topbar-right">
    <select class="pill" id="locale" aria-label="Язык объяснений"></select>
    <button class="pill" id="home" hidden>К списку</button>
  </div>
</div>
<div class="shell" id="app">
  <noscript><div class="panel"><h2>Не выполняется JavaScript</h2><p class="body">Макет интерактивный: включите JavaScript или откройте файл в обычном браузере (Chrome, Edge).</p></div></noscript>
  <div class="panel" id="boot"><h2>Загрузка…</h2><p class="body" id="boot-msg">Если этот текст остался — скрипт не выполнился. Откройте файл двойным кликом в Chrome или Edge.</p></div>
</div>

<script id="data" type="application/json">${JSON.stringify(sessions).replace(/</g, "\\u003c")}</script>
<script>
// зачем: макет открывали и видели пустой экран без единой ошибки в консоли.
// Любой сбой запуска обязан быть виден НА СТРАНИЦЕ, а не только в консоли.
window.addEventListener("error", (e) => {
  const box = document.getElementById("boot-msg");
  if (box) box.textContent = "Ошибка: " + (e.message || e.error?.message || "неизвестная") + " · " + (e.filename || "") + ":" + (e.lineno || "?");
  console.error("[mockup] ошибка запуска:", e.message, e.error);
});
const DATA = JSON.parse(document.getElementById("data").textContent);
const LOCALES = ${JSON.stringify(locales)};
const LOC_NAME = {ru:"Русский",uk:"Українська",es:"Español","pt-BR":"Português",vi:"Tiếng Việt",id:"Bahasa",tr:"Türkçe",pl:"Polski"};

const S = { locale: localStorage.getItem("mockup.locale") || "ru", session: null, step: 0, answered: false, ok: null, picked: null, assembled: [], pairSel: null, pairsDone: [], right: 0, wrong: 0 };

const app = document.getElementById("app");
const sel = document.getElementById("locale");
const homeBtn = document.getElementById("home");
LOCALES.forEach(l => { const o = document.createElement("option"); o.value = l; o.textContent = LOC_NAME[l] || l; sel.append(o); });
sel.value = S.locale;
sel.onchange = () => { S.locale = sel.value; localStorage.setItem("mockup.locale", S.locale); render(); };
homeBtn.onclick = () => { S.session = null; render(); };

const h = (tag, attrs, kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e[k.toLowerCase()] = v;
    else if (v !== null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of [].concat(kids || [])) if (kid) e.append(kid);
  return e;
};
const loc = (byLocale) => !byLocale ? "" : (byLocale[S.locale] ?? byLocale.ru ?? Object.values(byLocale)[0] ?? "");
const esc = (s) => String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
// зачем: целевой язык размечен в тексте обратными кавычками — красим его
// акцентом, чтобы английское сразу отличалось от объяснения на своём языке
const MARK = String.fromCharCode(1); // служебный символ-заглушка, в текстах не встречается
const tl = (s) => {
  let out = esc(s);
  // 1) явная разметка автора
  const BT = String.fromCharCode(96); // обратная кавычка: в шаблоне генератора её нельзя писать буквально
  // зачем: размеченные куски прячем в плейсхолдеры, чтобы второй проход
  // (латиница без разметки) не покрасил их повторно и не дал вложенные теги
  const kept = [];
  out = out.replace(new RegExp(BT + "([^" + BT + "]+)" + BT, "g"), (m, inner) => {
    kept.push(inner);
    return MARK + (kept.length - 1) + MARK;
  });
  // 2) латиница без разметки внутри кириллического текста (разборы ошибок
  //    пишут «Am выпало», «Not не заменяет») — красим, если рядом кириллица
  //    и фрагмент ещё не покрашен
  if (/[А-Яа-яЁё]/.test(out)) {
    const Q = String.fromCharCode(34), AP = String.fromCharCode(39);
    // дефис только последним символом класса — иначе «—–-"» читается как диапазон
    const BOUND = "\\\\s(«„>—–" + Q + AP + "-";
    const AFTER = "\\\\s.,!?:;)»<—–" + Q + AP + "-";
    const W = "[A-Za-z][A-Za-z" + AP + "]*";
    const LAT = new RegExp("(^|[" + BOUND + "])(" + W + "(?:\\\\s+" + W + "){0,4})(?=[" + AFTER + "]|$)", "g");
    out = out.replace(LAT, (m, pre, word) => /^(span|class|tl|amp|lt|gt)$/i.test(word) ? m : pre + '<span class="tl">' + word + '</span>');
  }
  return out.replace(new RegExp(MARK + "(\\\\d+)" + MARK, "g"), (m, i) => '<span class="tl">' + kept[+i] + '</span>');
};
const speak = (text) => {
  try {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = .85;
    speechSynthesis.speak(u);
  } catch (e) { console.warn("[mockup] речь недоступна:", e.message); }
};
const shuffle = (arr, seed) => {
  let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

function resetStep() { S.answered = false; S.ok = null; S.picked = null; S.assembled = []; S.pairSel = null; S.pairsDone = []; }

// ---------- экраны ----------
function renderHome() {
  homeBtn.hidden = true;
  app.replaceChildren(
    h("div", {class:"hero"}, [
      h("h1", {text:"Пройдите любую написанную сессию"}),
      h("p", {text:"Это то, что увидит ученик. Данные взяты из собранного релиза — что здесь работает, то откроется и в приложении."}),
    ]),
    ...groupByLesson(),
  );
}
function groupByLesson() {
  const out = [];
  const byLesson = {};
  for (const s of DATA) (byLesson[s.lesson] ??= []).push(s);
  for (const [lesson, list] of Object.entries(byLesson)) {
    out.push(h("div", {class:"lesson-title", text:"Урок " + lesson.replace(/^l0?/, "")}));
    out.push(h("div", {class:"cards"}, list.map(s => h("button", {class:"card", onClick:() => { S.session = s; S.step = 0; S.right = 0; S.wrong = 0; resetStep(); render(); }}, [
      h("h3", {text:s.title}),
      h("p", {class:"scene", text:s.scene}),
      h("div", {class:"meta"}, [
        h("span", {class:"chip k", text:"Сессия " + s.session.replace(/^s0?/, "")}),
        h("span", {class:"chip", text:s.learner.interactions.length + " заданий"}),
      ]),
    ]))));
  }
  return out;
}

function renderSession() {
  homeBtn.hidden = false;
  const s = S.session;
  const total = 3 + s.learner.interactions.length;
  if (S.step >= total) return renderDone();

  const bar = h("div", {class:"progress"}, Array.from({length:total}, (_, i) =>
    h("i", {class: i < S.step ? "done" : i === S.step ? "now" : ""})));

  const panel = S.step < 3 ? renderIntro(s.intro.pages[S.step]) : renderTask(s.learner.interactions[S.step - 3]);
  app.replaceChildren(bar, panel);
}

function renderIntro(page) {
  const KIND = {concept:"Понятие", formula:"Формула", trap:"Ловушка", tip:"Подсказка", example:"Пример"};
  const choices = loc(page.question.choicesByLocale) || [];
  const body = loc(page.bodyByLocale).split(/\\n\\n+/).filter(Boolean);
  const panel = h("div", {class:"panel"}, [
    h("div", {class:"kind", text:KIND[page.kind] || page.kind}),
    h("h2", {text:loc(page.titleByLocale)}),
    h("div", {class:"body"}, body.map(p => h("p", {html:tl(p)}))),
    h("div", {class:"question", html:tl(loc(page.question.promptByLocale))}),
    h("div", {class:"opts"}, choices.map((c, i) => h("button", {
      class:"opt" + (S.answered ? (i === 0 ? " right" : (S.picked === i ? " wrong" : " dim")) : ""),
      disabled: S.answered,
      onClick: () => { S.answered = true; S.picked = i; S.ok = i === 0; render(); },
    }, [document.createTextNode(c.text)]))),
  ]);
  if (S.answered) panel.append(h("div", {class:"fb " + (S.ok ? "ok" : "no"), text: S.ok ? "Верно." : "Верный ответ: " + (choices[0]?.text ?? "")}));
  panel.append(nextRow());
  return panel;
}

function nextRow(canNext = S.answered, label = "Дальше") {
  return h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:"Назад"}),
    h("button", {class:"btn primary spacer", disabled:!canNext, onClick:() => { S.step++; resetStep(); render(); }, text:label}),
  ]);
}

function renderTask(it) {
  const p = it.modePayload || {};
  const panel = h("div", {class:"panel"}, [
    h("div", {class:"kind", text:familyName(it.family, p)}),
    h("div", {class:"task-prompt", html:tl(it.prompt)}),
  ]);
  if (p.isWordCard) { renderCard(panel, it, p); return panel; }
  const R = {
    listen_choose: renderChoice, context_gap_grammar: renderChoice, sound_contrast: renderChoice,
    phrase_builder: renderBuilder, listen_build_dictation: renderBuilder,
    speed_match: renderPairs, scripted_repeat_compare: renderSpeak,
  }[it.family];
  if (R) R(panel, it, p);
  else { WARNBOX(panel, "Неизвестная механика: " + it.family); }
  return panel;
}
function WARNBOX(panel, msg) { panel.append(h("div", {class:"fb no", text:msg})); panel.append(nextRow(true)); }
const familyName = (f, p) => p?.isWordCard ? "Новое слово" : ({listen_choose:"Послушайте и выберите", context_gap_grammar:"Вставьте слово", sound_contrast:"Различите звуки", phrase_builder:"Соберите фразу", listen_build_dictation:"Послушайте и соберите", speed_match:"Соедините пары", scripted_repeat_compare:"Скажите вслух"})[f] || f;

function renderCard(panel, it, p) {
  const w = p.wordCard || {};
  panel.append(h("div", {class:"card-word", text:w.word || ""}));
  panel.append(h("button", {class:"play", onClick:() => speak(w.word || "")}, [document.createTextNode("▶  Послушать")]));
  panel.append(h("div", {class:"card-def", style:"margin-top:16px", html:tl(loc(w.definitionByLocale))}));
  S.answered = true;
  panel.append(nextRow(true, "Понятно"));
}

function renderChoice(panel, it, p) {
  const audio = p.referenceAudio?.transcript;
  if (audio) panel.append(h("button", {class:"play", onClick:() => speak(audio)}, [document.createTextNode("▶  Прослушать")]));
  if (p.gappedTargetPhrase) panel.append(h("div", {class:"target-phrase", text:p.gappedTargetPhrase}));
  if (p.localizedScene && loc(p.localizedScene)) panel.append(h("div", {class:"scene-line", html:tl(loc(p.localizedScene))}));
  const opts = it.responseOptions;
  if (!opts.length) return WARNBOX(panel, "У задания нет вариантов ответа — сборщик не нашёл их в тексте.");
  const correctId = correctIdOf(it);
  panel.append(h("div", {class:"opts", style:"margin-top:16px"}, opts.map(o => h("button", {
    class:"opt" + (S.answered ? (o.responseId === correctId ? " right" : (S.picked === o.responseId ? " wrong" : " dim")) : ""),
    disabled:S.answered,
    onClick:() => { S.answered = true; S.picked = o.responseId; S.ok = o.responseId === correctId; S.ok ? S.right++ : S.wrong++; render(); },
  }, [document.createTextNode(o.text)]))));
  if (S.answered) {
    const fb = (p.choiceFeedback || []).find(f => f.responseId === S.picked);
    panel.append(h("div", {class:"fb " + (S.ok ? "ok" : "no"), html: S.ok ? "Верно." : tl(loc(fb?.feedbackByLocale) || "Неверно.")}));
  }
  panel.append(nextRow());
}
function correctIdOf(it) {
  const a = S.session.answers.find(x => x.interactionId === it.interactionId);
  if (a?.correctResponseId) return a.correctResponseId;
  return it.responseOptions[0]?.responseId;
}

function renderBuilder(panel, it, p) {
  const target = p.targetPhrase || p.hiddenTargetPhrase || "";
  const ordered = p.orderedTokens || [];
  if (p.referenceAudio?.transcript) panel.append(h("button", {class:"play", onClick:() => speak(p.referenceAudio.transcript)}, [document.createTextNode("▶  Прослушать")]));
  else if (p.localizedMeaning && loc(p.localizedMeaning)) panel.append(h("div", {class:"scene-line", text:loc(p.localizedMeaning)}));
  if (!ordered.length) return WARNBOX(panel, "У задания нет плиток — сборщик не нашёл целевую фразу.");

  const slot = h("div", {class:"slot", "data-hint":"Нажимайте плитки, чтобы собрать фразу"},
    S.assembled.map((t, i) => h("button", {class:"tile", disabled:S.answered, onClick:() => { S.assembled.splice(i, 1); render(); }, text:t})));
  panel.append(h("div", {style:"margin-top:16px"}, [slot]));

  const all = shuffle(ordered.concat(p.authoredDistractorTokens || []), it.interactionId);
  const used = S.assembled.slice();
  panel.append(h("div", {class:"tiles"}, all.map((t, i) => {
    const idx = used.indexOf(t);
    const isUsed = idx >= 0 && (used[idx] = null, true);
    return h("button", {class:"tile" + (isUsed ? " used" : ""), disabled:S.answered || isUsed,
      onClick:() => { S.assembled.push(t); render(); }, text:t});
  })));

  const ready = S.assembled.length === ordered.length;
  if (S.answered) panel.append(h("div", {class:"fb " + (S.ok ? "ok" : "no"), text: S.ok ? "Верно." : "Правильно: " + target}));
  panel.append(h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:"Назад"}),
    S.answered
      ? h("button", {class:"btn primary spacer", onClick:() => { S.step++; resetStep(); render(); }, text:"Дальше"})
      : h("button", {class:"btn primary spacer", disabled:!ready, onClick:() => {
          const got = S.assembled.join(" ").replace(/[.?!]$/, "").toLowerCase();
          const want = ordered.join(" ").replace(/[.?!]$/, "").toLowerCase();
          S.answered = true; S.ok = got === want; S.ok ? S.right++ : S.wrong++; render();
        }, text:"Проверить"}),
  ]));
}

function renderPairs(panel, it, p) {
  const grid = p.pairGrid || [];
  if (!grid.length) return WARNBOX(panel, "Нет пар для соединения.");
  const left = shuffle(grid.map(g => ({id:g.pairId, text:g.target})), it.interactionId + "L");
  const right = shuffle(grid.map(g => ({id:g.pairId, text:loc(g.meaningByLocale)})), it.interactionId + "R");
  const cell = (item, side) => h("button", {
    class:"pair" + (S.pairsDone.includes(item.id) ? " gone" : (S.pairSel?.id === item.id && S.pairSel.side === side ? " sel" : "")),
    disabled:S.pairsDone.includes(item.id),
    onClick:() => {
      if (!S.pairSel) { S.pairSel = {...item, side}; return render(); }
      if (S.pairSel.side === side) { S.pairSel = {...item, side}; return render(); }
      if (S.pairSel.id === item.id) { S.pairsDone.push(item.id); S.right++; } else { S.wrong++; }
      S.pairSel = null;
      if (S.pairsDone.length === grid.length) S.answered = true;
      render();
    }, text:item.text});
  panel.append(h("div", {class:"pairs", style:"margin-top:16px"}, [
    h("div", {style:"display:grid;gap:9px"}, left.map(i => cell(i, "L"))),
    h("div", {style:"display:grid;gap:9px"}, right.map(i => cell(i, "R"))),
  ]));
  if (S.answered) panel.append(h("div", {class:"fb ok", text:"Все пары соединены."}));
  panel.append(nextRow());
}

function renderSpeak(panel, it, p) {
  const phrase = p.targetPhrase || p.referenceAudio?.transcript || "";
  if (!phrase) return WARNBOX(panel, "Нет фразы для произнесения.");
  panel.append(h("div", {class:"target-phrase", text:phrase}));
  panel.append(h("button", {class:"play", onClick:() => speak(phrase)}, [document.createTextNode("▶  Послушать образец")]));
  panel.append(h("div", {class:"scene-line", style:"margin-top:14px", text:"В приложении здесь запись голоса и сравнение с образцом."}));
  if (!S.answered) { S.answered = true; }
  panel.append(nextRow(true));
}

function renderDone() {
  homeBtn.hidden = false;
  const s = S.session;
  app.replaceChildren(h("div", {class:"panel"}, [
    h("div", {class:"done-wrap"}, [
      h("div", {class:"done-mark", text:"✓"}),
      h("h2", {text:"Сессия пройдена"}),
      h("p", {text:s.title}),
      h("div", {class:"stats"}, [
        h("div", {class:"stat"}, [h("b", {text:String(S.right)}), h("span", {text:"верно"})]),
        h("div", {class:"stat"}, [h("b", {text:String(S.wrong)}), h("span", {text:"ошибок"})]),
        h("div", {class:"stat"}, [h("b", {text:String(s.learner.interactions.length)}), h("span", {text:"заданий"})]),
      ]),
      h("button", {class:"btn primary", onClick:() => { S.session = null; render(); }, text:"К списку сессий"}),
    ]),
  ]));
}

function render() {
  try {
    S.session ? renderSession() : renderHome();
    window.scrollTo({top:0, behavior:"instant"});
  } catch (e) {
    console.error("[mockup] сбой отрисовки:", e);
    app.replaceChildren(h("div", {class:"panel"}, [
      h("h2", {text:"Сбой отрисовки"}),
      h("div", {class:"body", text:String(e && e.message || e)}),
      h("div", {class:"actions"}, [h("button", {class:"btn ghost", onClick:() => { S.session = null; render(); }, text:"К списку"})]),
    ]));
  }
}
render();
</script>
</body>
</html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
LOG(`записан ${OUT} (${(html.length / 1024).toFixed(0)} КБ)`);

// зачем: некоторые просмотрщики (встроенная панель предпросмотра) блокируют
// инлайновые <script> и показывают пустую страницу без единой ошибки. Рядом
// кладём вариант с внешними файлами — он открывается там, где инлайн запрещён.
const dir = path.dirname(OUT);
const script = /<script>\n([\s\S]*?)<\/script>/.exec(html)[1];
const data = /<script id="data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
fs.writeFileSync(path.join(dir, "app.js"), script.replace(
  'JSON.parse(document.getElementById("data").textContent)', "window.__DATA__"), "utf8");
fs.writeFileSync(path.join(dir, "data.js"), `window.__DATA__ = ${data};`, "utf8");
const external = html
  .replace(/<script id="data"[\s\S]*?<\/script>/, '<script src="data.js"></script>')
  .replace(/<script>\n[\s\S]*?<\/script>/, '<script src="app.js"></script>');
fs.writeFileSync(path.join(dir, "external.html"), external, "utf8");
LOG(`записан ${path.join(dir, "external.html")} — вариант с внешними файлами (если инлайн заблокирован)`);
LOG("открой index.html двойным кликом в Chrome или Edge — сервер не нужен");
