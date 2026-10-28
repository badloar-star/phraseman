// make.cjs — собирает docs/design/v2-app/placement-entry.html: макет «Проверить уровень» на РЕАЛЬНЫХ кадрах (каркас real-frame.js).
// зачем (координатор 28.10 для сессии Вход; владелец: макеты только на настоящих экранах): кадры Сверки из assets/real/placement_entry/
// попадают в страницу списком — что лежит в папке, то и показывается; новые элементы — слоем поверх кадра.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'placement-entry.html');
const DIR = path.join(__dirname, 'assets', 'real', 'placement_entry');
const frames = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /\.png$/i.test(f)).sort() : [];
for (const f of ['placement-entry.css', 'placement-entry.app.js', 'real-frame.js', 'real-frame.css', 'kit.css']) {
  if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[PE-MAKE] рядом нет ${f}`);
}
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Проверить уровень: вход</title>
<link rel="stylesheet" href="kit.css">
<link rel="stylesheet" href="real-frame.css">
<link rel="stylesheet" href="placement-entry.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">Проверить уровень: вход в тест</h1>
  <p class="page-lead">Настоящие экраны текущей сборки. Слева «сейчас» — кадр как есть, справа «как будет» — тот же кадр с кнопкой «Проверить уровень» на обложке и плашкой «Откроется после…» по тапу на закрытой карте: замок трясётся, окна нет. Тапай по закрытой карте.</p>
  <div id="root"></div>
</div>
<script src="real-frame.js"></script>
<script>window.__FRAMES = ${JSON.stringify(frames)};</script>
<script src="placement-entry.app.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[PE-MAKE] записан', OUT, html.length, 'байт; кадров', frames.length, frames.join(', '));
