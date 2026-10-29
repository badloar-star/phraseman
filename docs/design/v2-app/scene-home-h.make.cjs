// scene-home-h.make.cjs — собирает docs/design/v2-app/scene-home-h.html: чистый макет «Сцена 2.0 — утверждённый вид» (только утверждённое
// владельцем 29.10). Движок — те же строки эталона peak-scene-v2.html, что у scene-palettes.make.cjs (CSS тем/сцены/стекла/таббара),
// снимок тем __THEMES и коды значков __ICODE оттуда же, опись реальных кадров — assets/real/scene-frames.json. Скрипты старого макета
// (scene-palettes.app.js, dark-themes.app.js) подключены ради формул и сборщиков заданий; их разделы на странице не рисуются
// (нет #dt, контейнеры старых разделов скрыты). Пересборка: node scene-home-h.make.cjs
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'peak-scene-v2.html');
const OUT = path.join(__dirname, 'scene-home-h.html');
const L = fs.readFileSync(SRC, 'utf8').split('\n');
const RANGES = [
  [14, 15, '@font-face'], [17, 33, '/* ── темы ── */'], [35, 69, '/* ── общие детали ── */'], [71, 76, '/* аватар'],
  [78, 88, '/* плавающий таббар'], [90, 93, '/* шторка и затемнение */'], [337, 339, '.thm {'], [345, 345, '@media (prefers-reduced-motion'],
  [352, 391, '/* ── общее ── */'], [398, 428, '/* ═════ A · Сцена'], [540, 562, '/* ───────── Пик в языке «Сцены»'],
  [564, 591, '/* панель «Комната недели» */'], [601, 605, '.pk-h2 {'], [722, 727, '/* ───────── «Сцена» по токенам темы'], [738, 748, '.pk2 .a-stage {'],
  [749, 777, '/* блоки пьедестала'], [791, 800, '/* «Играть» — закреплена'],
];
const engineCss = RANGES.map(([a, b, head]) => { if (!L[a - 1].startsWith(head)) throw new Error(`[SH-MAKE] строка ${a} эталона не «${head}»: ${L[a - 1].slice(0, 60)}`); return L.slice(a - 1, b).join('\n'); }).join('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[SH-MAKE] в эталоне нет строк __THEMES / __ICODE');
for (const f of ['scene-home-h.css', 'scene-home-h.app.js', 'scene-palettes.css', 'scene-palettes.app.js', 'dark-themes.app.js', 'spire-tower-render.js', 'kit.css', 'kit.js', 'real-frame.css', 'real-frame.js', 'scene-recolor.js', 'scene-real.js', 'scene-styles.js', 'scene-cards.js', 'scene-approved.js']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[SH-MAKE] рядом нет ${f}`);
}
const realJson = path.join(__dirname, 'assets', 'real', 'scene-frames.json');
const realFrames = fs.existsSync(realJson) ? JSON.parse(fs.readFileSync(realJson, 'utf8')) : {};
Object.values(realFrames).forEach((r) => { delete r.mtime; });
const realLine = `<script>window.__REAL = ${JSON.stringify(realFrames)};</script>`;
// наличные кадры макета (HEAD от Сверки + реальные Титана): страница показывает «Кадры ещё не сняты» без запроса к отсутствующему файлу
const SH_FRAMES = ['head_home_graphite_dark', 'head_home_graphite_light', 'head_lessons_graphite_dark', 'head_lessons_graphite_light', 'scene_home_grad_full_titanium_dark', 'scene_home_grad_full_titanium_light', 'scene_season_graphite_light'].map((f) => `assets/real/${f}.png`);
const shFiles = SH_FRAMES.filter((f) => fs.existsSync(path.join(__dirname, f)));
const shFilesLine = `<script>window.__SH_FILES = ${JSON.stringify(shFiles)};</script>`;
// таблица неба всех тем от «Тем» (ровный тон, без потемнения) и русские имена тем из приложения
const skyTable = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'work', 'handover', 'scene-all-themes-2026-10-29.json'), 'utf8')).themes;
const sky = {}; Object.entries(skyTable).forEach(([id, t]) => { sky[id] = { dark: { skyTone: t.dark && t.dark.skyTone, premiumHome: t.dark && t.dark.premiumHome ? { sceneTop: t.dark.premiumHome.sceneTop, sceneBottom: t.dark.premiumHome.sceneBottom, edge: t.dark.premiumHome.edge } : undefined }, light: { top: t.light && t.light.top, skyTone: t.light && t.light.skyTone } }; });
const namesTs = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app', 'theme_display_names.ts'), 'utf8'); const names = {}; namesTs.replace(/^\s*([a-z_]+): \{ ru: '([^']+)'/gm, (m, id, ru) => { names[id] = ru; return m; });
const skyLine = `<script>window.__SKY = ${JSON.stringify(sky)}; window.__THEME_NAMES = ${JSON.stringify(names)};</script>`;
console.log('[SH-MAKE] тем в таблице неба', Object.keys(sky).length, 'имён', Object.keys(names).length);
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сцена Главной: высота как у «Уроков»</title>
<link rel="stylesheet" href="kit.css">
<link rel="stylesheet" href="real-frame.css">
<style>
/* движок эталона peak-scene-v2.html (скопирован сборщиком scene-home-h.make.cjs) */
${engineCss}
</style>
<link rel="stylesheet" href="scene-palettes.css">
<link rel="stylesheet" href="scene-home-h.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Сцена Главной — высота как у «Уроков»</h1>
  <div class="thm sp-bar sf-bar"><span id="shView" style="display:inline-flex;gap:8px"></span><span class="sp-lbl">Высота</span><span id="shHeight" style="display:inline-flex;gap:8px"></span><span class="sp-lbl">Оформление</span><span id="shAp" style="display:inline-flex;gap:8px"></span><span class="sp-lbl">Тема</span><select id="shThemeSel" class="sh-sel"></select><span id="shBottomWrap" style="display:inline-flex;align-items:center;gap:8px"><span class="sp-lbl">Низ неба</span><span id="shBottom" style="display:inline-flex;gap:8px"></span></span><span id="shHeroWrap" style="display:inline-flex;align-items:center;gap:8px"><span class="sp-lbl">Герой</span><span id="shHero" style="display:inline-flex;gap:8px"></span></span><span class="sp-lbl">Сравнение</span><span id="shRuler" style="display:inline-flex;gap:8px"></span></div>
  <div id="sh"></div>
  <div id="spControls" style="display:none"><span id="apList"></span><span id="modeList"></span><span id="stratList"></span></div>
  <div id="thmList" style="display:none"></div>
  <div id="root" style="display:none"></div>
</div>
<script src="kit.js"></script>
<script src="spire-tower-render.js"></script>
<script src="real-frame.js"></script>
<script src="scene-recolor.js"></script>
<script src="scene-real.js"></script>
<script src="scene-styles.js"></script>
<script src="scene-cards.js"></script>
<script src="scene-approved.js"></script>
${themesLine}
${icodeLine}
${realLine}
${shFilesLine}
${skyLine}
<script src="scene-palettes.app.js"></script>
<script src="dark-themes.app.js"></script>
<script src="scene-home-h.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[SH-MAKE] записан', OUT, html.length, 'байт; реальных кадров', Object.keys(realFrames).length);
