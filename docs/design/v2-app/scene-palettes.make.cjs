// make.cjs — собирает docs/design/v2-app/scene-palettes.html: движок (CSS тем, сцены, стекла, таббара, пьедестала, окна башни)
// копируется ДОСЛОВНО из утверждённого эталона peak-scene-v2.html по диапазонам строк; снимок 23 тем и коды значков — его же строки.
// зачем (координатор 28.10, слово владельца: «сцены тусклые и неправильно нарисованы — полное перекрашивание; для тёмных тем другие цвета
// по теории цвета», «строго стиль Дизайна 2.0: движок peak-scene-v2 / home-new-states и kit.css/kit.js»): страница не рисует свою систему
// стилей — палитра сцены считается в scene-palettes.app.js и кладётся на те же экраны, что уже утверждены. Своё — в scene-palettes.css/.app.js.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'peak-scene-v2.html');
const OUT = path.join(__dirname, 'scene-palettes.html');
const L = fs.readFileSync(SRC, 'utf8').split('\n');
// [от, до] включительно (1-based) и начало первой строки — чтобы диапазон не уехал при правке эталона
const RANGES = [
  [14, 15, '@font-face'], [17, 33, '/* ── темы ── */'], [35, 69, '/* ── общие детали ── */'], [71, 76, '/* аватар'],
  [78, 88, '/* плавающий таббар'], [90, 93, '/* шторка и затемнение */'], [337, 339, '.thm {'], [345, 345, '@media (prefers-reduced-motion'],
  [352, 391, '/* ── общее ── */'], [398, 428, '/* ═════ A · Сцена'], [540, 562, '/* ───────── Пик в языке «Сцены»'],
  [564, 591, '/* панель «Комната недели» */'], [601, 605, '.pk-h2 {'], [722, 727, '/* ───────── «Сцена» по токенам темы'], [738, 748, '.pk2 .a-stage {'],
  [749, 777, '/* блоки пьедестала'], [791, 800, '/* «Играть» — закреплена'],
];
const engineCss = RANGES.map(([a, b, head]) => {
  if (!L[a - 1].startsWith(head)) throw new Error(`[SP-MAKE] строка ${a} эталона не «${head}»: ${L[a - 1].slice(0, 60)}`);
  return L.slice(a - 1, b).join('\n');
}).join('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[SP-MAKE] в эталоне нет строк __THEMES / __ICODE');
for (const f of ['scene-palettes.css', 'scene-palettes.app.js', 'spire-tower-render.js', 'kit.css', 'kit.js', 'real-frame.css', 'real-frame.js', 'scene-recolor.js', 'scene-real.js']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[SP-MAKE] рядом нет ${f}`);
}
// реальные кадры Сверки — опись assets/real/scene-frames.json (node scene-frames.cjs: годность, граница сцены, место героя); нет описи — пусто
const realJson = path.join(__dirname, 'assets', 'real', 'scene-frames.json');
const realFrames = fs.existsSync(realJson) ? JSON.parse(fs.readFileSync(realJson, 'utf8')) : {};
Object.values(realFrames).forEach((r) => { delete r.mtime; });
const realLine = `<script>window.__REAL = ${JSON.stringify(realFrames)};</script>`;

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сцены по темам: перекраска</title>
<link rel="stylesheet" href="kit.css">
<link rel="stylesheet" href="real-frame.css">
<style>
/* ───────── PhraseMan 2.0 · «Сцена» во всех темах: новая палитра по теории цвета (координатор 28.10, слово владельца) ─────────
   зачем: «сцены сейчас тусклые и неправильно нарисованы — полное перекрашивание; для тёмных тем другие цвета и оттенки, чтобы было
   красивое сочетание: тема синяя, а сцена другого цвета по теории цвета». Движок — утверждённый эталон peak-scene-v2.html (сцена, стекло,
   таббар 2.0, 23 темы, пьедестал V2, окно башни) — скопирован дословно сборщиком scene-palettes.make.cjs (пересборка: node scene-palettes.make.cjs).
   Своё — scene-palettes.css и scene-palettes.app.js. Код приложения не менялся. */
${engineCss}
</style>
<link rel="stylesheet" href="scene-palettes.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Сцены по темам: перекраска</h1>
  <p class="page-lead">Только настоящие экраны текущей сборки: слева кадр приложения как есть, правее — тот же кадр с перекрашенным фоном сцены по четырём стратегиям цвета (А — тон темы ярче и глубже, Б — соседние оттенки, В — акцент-свет, Г — два света по сплиту). Герой, надписи и карточки на кадре не тронуты. Нарисованные разделы (23 темы × 5 экранов, герои крупнее, премиум) — по ссылке с ?all=1.</p>
  <div id="spControls">
  <div class="thm sp-bar"><span class="sp-lbl">Оформление</span><span id="apList"></span><span class="sp-lbl" style="margin-left:14px">Сцена</span><span id="modeList"></span><span class="chp sp-replay" data-replay>Повторить</span></div>
  <div class="thm sp-bar" style="margin-top:0"><span class="sp-lbl">Цвет сцены</span><span id="stratList"></span></div>
  <div class="thm" id="thmList" style="flex-wrap:wrap;row-gap:8px"></div>
  </div>
  <div id="root"></div>
</div>
<script src="kit.js"></script>
<script src="spire-tower-render.js"></script>
<script src="real-frame.js"></script>
<script src="scene-recolor.js"></script>
<script src="scene-real.js"></script>
${themesLine}
${icodeLine}
${realLine}
<script src="scene-palettes.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[SP-MAKE] записан', OUT, html.length, 'байт; движок', engineCss.split('\n').length, 'строк из эталона; реальных кадров', Object.keys(realFrames).length, 'годных', Object.values(realFrames).filter((r) => r.ok).length);
