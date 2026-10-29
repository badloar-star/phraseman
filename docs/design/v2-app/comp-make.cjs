// comp-make.cjs — собирает страницы макетов соревновательной ветки на РЕАЛЬНЫХ кадрах: node comp-make.cjs <peak-friends-room |
// week-goal-together | invite-ladder | all>. Каждая страница = kit.css + real-frame + comp-kit (общий набор) + свой css/app.js;
// снимок тем и коды значков — строки __THEMES/__ICODE эталона peak-scene-v2.html; __FRAMES — что лежит в assets/real.
// зачем (владелец 28.10: только настоящие экраны; координатор 29.10: три макета соревновательной ветки, ссылки отдельно).
const fs = require('fs');
const path = require('path');
const PAGES = {
  'peak-friends-room': { title: 'Комната друзей в Пике', h1: 'Комната друзей в Пике — на настоящем экране', lead: 'Основа телефона — кадр текущей сборки (Сверка, «Затмение» тёмное). «Сейчас» — кадр как есть; «как будет» — тот же кадр с панелью друзей на месте панели комнаты. Идея 5 исследования соревновательной ветки (29.10): приватная комната 2–8 друзей, своя таблица недели рядом с общей.' },
  'week-goal-together': { title: 'Цель недели вдвоём', h1: 'Цель недели вдвоём — на настоящих экранах', lead: 'Основа телефонов — кадры текущей сборки (Главная и «Друзья», «Затмение» тёмное). «Сейчас» — кадр как есть; «как будет» — тот же кадр со вставкой карточки цели (всё ниже сдвинулось, как при настоящей вставке). Владелец пересматривает своё «нет» от 21.10 — макет для решения.' },
  'invite-ladder': { title: 'Лесенка приглашений', h1: 'Лесенка приглашений вместо рулетки Plus — на настоящем экране', lead: 'Основа телефона — кадр вкладки «Друзья» текущей сборки («Затмение» тёмное); экран приглашений ждёт кадра Сверки. Понятные ступени вместо скрытой рулетки: за друга, прошедшего первый урок, — 500 монет обоим; за трёх друзей — N дней Plus. N — вариантами 3 / 7 / 14, владелец выберет.' },
};
const which = process.argv[2] || 'all'; const names = which === 'all' ? Object.keys(PAGES) : [which];
const L = fs.readFileSync(path.join(__dirname, 'peak-scene-v2.html'), 'utf8').split('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[CK-MAKE] в эталоне нет строк __THEMES / __ICODE');
const realDir = path.join(__dirname, 'assets', 'real');
const frames = fs.existsSync(realDir) ? fs.readdirSync(realDir).filter((f) => /\.png$/i.test(f)).sort() : [];
for (const name of names) {
  const p = PAGES[name]; if (!p) throw new Error(`[CK-MAKE] нет страницы ${name}`);
  for (const f of ['comp-kit.css', 'comp-kit.js', `${name}.css`, `${name}.app.js`, 'real-frame.css', 'real-frame.js', 'kit.css']) if (!fs.existsSync(path.join(__dirname, f))) throw new Error(`[CK-MAKE] рядом нет ${f}`);
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.title}</title>
<link rel="stylesheet" href="kit.css">
<link rel="stylesheet" href="real-frame.css">
<link rel="stylesheet" href="comp-kit.css">
<link rel="stylesheet" href="${name}.css">
</head>
<body>
<div class="page">
  <h1 class="page-h1">${p.h1}</h1>
  <p class="page-lead">${p.lead}</p>
  <div id="root"></div>
</div>
<script src="real-frame.js"></script>
${themesLine}
${icodeLine}
<script>window.__FRAMES = ${JSON.stringify(frames)};</script>
<script src="comp-kit.js"></script>
<script src="${name}.app.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(__dirname, `${name}.html`), html);
  console.log('[CK-MAKE] записан', `${name}.html`, html.length, 'байт; кадров в assets/real', frames.length);
}
