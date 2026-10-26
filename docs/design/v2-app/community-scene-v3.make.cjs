// make.cjs — собирает docs/design/v2-app/community-scene-v3.html: движок (CSS тем, сцены, стекла, таббара, пьедестала, шторки)
// копируется ДОСЛОВНО из утверждённого эталона peak-scene-v2.html по диапазонам строк; снимок 23 тем и коды значков — его же строки.
// зачем (владелец 26.10 через координатора: «строго соблюдённый стиль всех разделов», «Сцена как на Главной», «движок тем и сцены
// бери оттуда, не изобретай свой»): так макет «Наборов» гарантированно продолжает Главную и Пик, а не рисует свою систему стилей.
// Своё — в двух файлах рядом: community-scene-v3.css (классы cs-* и движение) и community-scene-v3.app.js (экраны, переходы, действия);
// владелец 26.10: «ВСЁ АНИМИРОВАННО, кнопки кликабельны и показывают переходы» — поэтому макет живой, а не статичная разметка.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'peak-scene-v2.html');
const OUT = path.join(__dirname, 'community-scene-v3.html');
const L = fs.readFileSync(SRC, 'utf8').split('\n');
// [от, до] включительно (1-based) и начало первой строки — чтобы диапазон не уехал при правке эталона
const RANGES = [
  [14, 15, '@font-face'], [17, 33, '/* ── темы ── */'], [35, 69, '/* ── общие детали ── */'], [71, 76, '/* аватар'],
  [78, 88, '/* плавающий таббар'], [90, 93, '/* шторка и затемнение */'], [337, 339, '.thm {'], [345, 345, '@media (prefers-reduced-motion'],
  [352, 391, '/* ── общее ── */'], [398, 428, '/* ═════ A · Сцена'], [540, 562, '/* ───────── Пик в языке «Сцены»'],
  [564, 591, '/* панель «Комната недели» */'], [722, 727, '/* ───────── «Сцена» по токенам темы'], [739, 745, '.pk2-copy {'], [749, 777, '/* блоки пьедестала'],
  [791, 799, '/* «Играть» — закреплена'],
];
const engineCss = RANGES.map(([a, b, head]) => {
  if (!L[a - 1].startsWith(head)) throw new Error(`[CS3-MAKE] строка ${a} эталона не «${head}»: ${L[a - 1].slice(0, 60)}`);
  return L.slice(a - 1, b).join('\n');
}).join('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[CS3-MAKE] в эталоне нет строк __THEMES / __ICODE');
for (const f of ['community-scene-v3.css', 'community-scene-v3.app.js']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[CS3-MAKE] рядом нет ${f}`);
}

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сообщество → Наборы: Сцена и «Набор месяца»</title>
<link rel="stylesheet" href="kit.css">
<style>
/* ───────── PhraseMan 2.0 · Сообщество → Наборы · «Набор месяца» (владелец 26.10 через координатора) ─────────
   зачем: «невероятно качественно, в строго соблюдённом стиле всех разделов», «премиально, дорого, по-игровому, Сцена как на Главной»,
   «минимум экранов, минимум кнопок», «всё слушает активные темы», «ВСЁ АНИМИРОВАННО». Движок — утверждённый эталон peak-scene-v2.html
   (сцена, стекло, таббар 2.0, переключатель 23 тем и светлого/тёмного вида, пьедестал V2) — скопирован дословно сборщиком
   community-scene-v3.make.cjs (лежит рядом; пересборка: node community-scene-v3.make.cjs). Своё — community-scene-v3.css и community-scene-v3.app.js.
   Шесть живых телефонов: каталог с «Набором месяца», набор, создание с проверкой ИИ, условия участия, победитель, итоги. Код приложения не менялся. */
${engineCss}
</style>
<link rel="stylesheet" href="community-scene-v3.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Сообщество → Наборы: Сцена и «Набор месяца»</h1>
  <p class="page-lead">Раздел «Наборы» продолжает Главную и Пик: та же Сцена, стекло и таббар 2.0, цвета — каждой темы приложения. Макет живой — тапай: плитки, ♥, «Добавить себе», проверка ИИ, шторка и окна срабатывают как в приложении; «Повторить» заново проигрывает появление.</p>
  <div class="thm"><span style="font-size:13px;color:#8E8E96;font-weight:700;margin-right:6px">Оформление</span><span id="apList"></span></div>
  <div class="thm" id="thmList" style="flex-wrap:wrap;row-gap:8px"></div>
  <div id="root"></div>
</div>
<script src="kit.js"></script>
${themesLine}
${icodeLine}
<script src="community-scene-v3.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[CS3-MAKE] записан', OUT, html.length, 'байт; движок', engineCss.split('\n').length, 'строк из эталона');
