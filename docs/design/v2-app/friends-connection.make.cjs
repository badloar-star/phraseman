// make.cjs — собирает docs/design/v2-app/friends-connection.html: движок (CSS тем, сцены, стекла, таббара, пьедестала, окна башни)
// копируется ДОСЛОВНО из утверждённого эталона peak-scene-v2.html по диапазонам строк; снимок 23 тем и коды значков — его же строки.
// зачем (координатор 28.10, задача 3, слово владельца: «укреплять связь друзей по всем разделам… приглашать друзей, команды,
// больше связи, больше понятности, всё очевидно»): новые блоки строятся поверх существующих экранов в стиле «Сцены», без своей
// системы стилей. Своё — friends-connection.css / friends-connection.app.js.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'peak-scene-v2.html');
const OUT = path.join(__dirname, 'friends-connection.html');
const L = fs.readFileSync(SRC, 'utf8').split('\n');
const RANGES = [
  [14, 15, '@font-face'], [17, 33, '/* ── темы ── */'], [35, 69, '/* ── общие детали ── */'], [71, 76, '/* аватар'],
  [78, 88, '/* плавающий таббар'], [90, 93, '/* шторка и затемнение */'], [337, 339, '.thm {'], [345, 345, '@media (prefers-reduced-motion'],
  [352, 391, '/* ── общее ── */'], [398, 428, '/* ═════ A · Сцена'], [540, 562, '/* ───────── Пик в языке «Сцены»'],
  [564, 591, '/* панель «Комната недели» */'], [601, 605, '.pk-h2 {'], [722, 727, '/* ───────── «Сцена» по токенам темы'], [738, 748, '.pk2 .a-stage {'],
  [749, 777, '/* блоки пьедестала'], [791, 800, '/* «Играть» — закреплена'],
];
const engineCss = RANGES.map(([a, b, head]) => {
  if (!L[a - 1].startsWith(head)) throw new Error(`[FR-MAKE] строка ${a} эталона не «${head}»: ${L[a - 1].slice(0, 60)}`);
  return L.slice(a - 1, b).join('\n');
}).join('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[FR-MAKE] в эталоне нет строк __THEMES / __ICODE');
for (const f of ['friends-connection.css', 'friends-connection.app.js', 'spire-tower-render.js', 'kit.css', 'kit.js']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[FR-MAKE] рядом нет ${f}`);
}
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Друзья: связь по всем разделам</title>
<link rel="stylesheet" href="kit.css">
<style>
/* ───────── PhraseMan 2.0 · Друзья: больше связи по всем разделам (координатор 28.10, задача 3, слово владельца) ─────────
   зачем: «укреплять связь друзей по всем разделам, новые фичи, ориентир на крутость: приглашать друзей, создавать команды,
   больше связи, больше понятности, всё очевидно». Движок — утверждённый эталон peak-scene-v2.html (сцена, стекло, таббар 2.0,
   23 темы, пьедестал, окно башни) — скопирован дословно сборщиком friends-connection.make.cjs (пересборка: node friends-connection.make.cjs).
   Своё — friends-connection.css и friends-connection.app.js. Код приложения не менялся; цвета сцен — формула приложения. */
${engineCss}
</style>
<link rel="stylesheet" href="friends-connection.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Друзья: связь по всем разделам</h1>
  <p class="page-lead">Пять блоков поверх того, что уже есть: «друг сделал» на сценах Уроков, Пика, Видео и Карточек; приглашение с наградой; команда с целью недели и рейтингом; «Друзья смотрят» и «Избранное» в Видео. Под каждым блоком — что читаем из базы и как кэшируем. Кнопки живые.</p>
  <div class="thm fr-bar"><span class="fr-lbl">Оформление</span><span id="apList"></span><span class="chp fr-replay" data-replay>Повторить</span></div>
  <div class="thm" id="thmList" style="flex-wrap:wrap;row-gap:8px"></div>
  <div id="root"></div>
</div>
<script src="kit.js"></script>
<script src="spire-tower-render.js"></script>
${themesLine}
${icodeLine}
<script src="friends-connection.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[FR-MAKE] записан', OUT, html.length, 'байт; движок', engineCss.split('\n').length, 'строк из эталона');
