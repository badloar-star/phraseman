// friends-connection.make.cjs — собирает docs/design/v2-app/friends-connection.html: «Друзья» на РЕАЛЬНЫХ кадрах (каркас real-frame.js).
// зачем (владелец 28.10: только настоящие экраны; координатор 29.10: старый нарисованный движок не использовать): страница не рисует
// телефоны сама — каждый телефон = кадр Сверки из assets/real, новые блоки вставляются ломтём или кладутся поверх. Снимок тем — та же
// строка __THEMES эталона peak-scene-v2 (токены «Затмения» для цветов карточек и кнопок), коды значков — __ICODE оттуда же.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'friends-connection.html');
const L = fs.readFileSync(path.join(__dirname, 'peak-scene-v2.html'), 'utf8').split('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[FR-MAKE] в эталоне нет строк __THEMES / __ICODE');
for (const f of ['friends-connection.css', 'friends-connection.app.js', 'real-frame.css', 'real-frame.js', 'kit.css']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[FR-MAKE] рядом нет ${f}`);
}
const realDir = path.join(__dirname, 'assets', 'real');
const frames = fs.existsSync(realDir) ? fs.readdirSync(realDir).filter((f) => /\.png$/i.test(f)).sort() : [];
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Друзья: связь по всем разделам</title>
<link rel="stylesheet" href="kit.css">
<link rel="stylesheet" href="real-frame.css">
<link rel="stylesheet" href="friends-connection.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Друзья: связь по всем разделам — на настоящих экранах</h1>
  <p class="page-lead">Основа каждого телефона — кадр текущей сборки (Сверка, «Затмение» тёмное). «Сейчас» — кадр как есть; новое вставлено ломтём (всё ниже сдвинулось, как при настоящей вставке) или положено поверх. Решения владельца: награда за друга — 500 монет обоим после его первого урока; «друзья смотрят» — только подтверждённым друзьям, с выключателем. Тапай по строкам, кнопкам и шторкам — всё живое; под каждым блоком — стоимость Firebase.</p>
  <div id="root"></div>
</div>
<script src="real-frame.js"></script>
${themesLine}
${icodeLine}
<script>window.__FRAMES = ${JSON.stringify(frames)};</script>
<script src="friends-connection.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[FR-MAKE] записан', OUT, html.length, 'байт; кадров в assets/real', frames.length);
