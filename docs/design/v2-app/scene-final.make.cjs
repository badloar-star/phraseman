// scene-final.make.cjs — собирает docs/design/v2-app/scene-final.html: чистый макет «Сцена 2.0 — утверждённый вид» (только утверждённое
// владельцем 29.10). Движок — те же строки эталона peak-scene-v2.html, что у scene-palettes.make.cjs (CSS тем/сцены/стекла/таббара),
// снимок тем __THEMES и коды значков __ICODE оттуда же, опись реальных кадров — assets/real/scene-frames.json. Скрипты старого макета
// (scene-palettes.app.js, dark-themes.app.js) подключены ради формул и сборщиков заданий; их разделы на странице не рисуются
// (нет #dt, контейнеры старых разделов скрыты). Пересборка: node scene-final.make.cjs
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'peak-scene-v2.html');
const OUT = path.join(__dirname, 'scene-final.html');
const L = fs.readFileSync(SRC, 'utf8').split('\n');
const RANGES = [
  [14, 15, '@font-face'], [17, 33, '/* ── темы ── */'], [35, 69, '/* ── общие детали ── */'], [71, 76, '/* аватар'],
  [78, 88, '/* плавающий таббар'], [90, 93, '/* шторка и затемнение */'], [337, 339, '.thm {'], [345, 345, '@media (prefers-reduced-motion'],
  [352, 391, '/* ── общее ── */'], [398, 428, '/* ═════ A · Сцена'], [540, 562, '/* ───────── Пик в языке «Сцены»'],
  [564, 591, '/* панель «Комната недели» */'], [601, 605, '.pk-h2 {'], [722, 727, '/* ───────── «Сцена» по токенам темы'], [738, 748, '.pk2 .a-stage {'],
  [749, 777, '/* блоки пьедестала'], [791, 800, '/* «Играть» — закреплена'],
];
const engineCss = RANGES.map(([a, b, head]) => { if (!L[a - 1].startsWith(head)) throw new Error(`[SF-MAKE] строка ${a} эталона не «${head}»: ${L[a - 1].slice(0, 60)}`); return L.slice(a - 1, b).join('\n'); }).join('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[SF-MAKE] в эталоне нет строк __THEMES / __ICODE');
for (const f of ['scene-final.css', 'scene-final.app.js', 'scene-palettes.css', 'scene-palettes.app.js', 'dark-themes.app.js', 'spire-tower-render.js', 'kit.css', 'kit.js', 'real-frame.css', 'real-frame.js', 'scene-recolor.js', 'scene-real.js', 'scene-styles.js', 'scene-cards.js', 'scene-approved.js']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[SF-MAKE] рядом нет ${f}`);
}
const realJson = path.join(__dirname, 'assets', 'real', 'scene-frames.json');
const realFrames = fs.existsSync(realJson) ? JSON.parse(fs.readFileSync(realJson, 'utf8')) : {};
Object.values(realFrames).forEach((r) => { delete r.mtime; });
const realLine = `<script>window.__REAL = ${JSON.stringify(realFrames)};</script>`;
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сцена 2.0: утверждённый вид</title>
<link rel="stylesheet" href="kit.css">
<link rel="stylesheet" href="real-frame.css">
<style>
/* движок эталона peak-scene-v2.html (скопирован сборщиком scene-final.make.cjs) */
${engineCss}
</style>
<link rel="stylesheet" href="scene-palettes.css">
<link rel="stylesheet" href="scene-final.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Сцена 2.0 — утверждённый вид</h1>
  <div class="thm sp-bar sf-bar"><span id="sfAp" style="display:inline-flex;gap:8px;margin-right:16px"></span><span class="sp-lbl">Тема</span><span id="sfThemes" style="display:inline-flex;flex-wrap:wrap;gap:8px"></span></div>
  <div id="sf"></div>
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
<script src="scene-palettes.app.js"></script>
<script src="dark-themes.app.js"></script>
<script src="scene-final.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[SF-MAKE] записан', OUT, html.length, 'байт; реальных кадров', Object.keys(realFrames).length);
