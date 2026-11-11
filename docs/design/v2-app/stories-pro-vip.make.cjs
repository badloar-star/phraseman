// Сборщик макета «Plus и Ultra — кадрами историй» (владелец 11.11: «Pro нету! есть Ультра и Плюс! переделай!»).
// зачем: плеер, темы, стили и движение берём 1:1 из одобренного макета историй (stories-plus-offers.html ← stories-templates-v1.html),
// как у макета «Истории вместо окон»; меняем только список кадров и шапку. Так макет не расходится с плеером приложения.
// Запуск: node docs/design/v2-app/stories-pro-vip.make.cjs
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const SRC = path.join(dir, 'stories-plus-offers.html');
const FRAMES = path.join(dir, 'stories-pro-vip.frames.js');
const OUT = path.join(dir, 'stories-pro-vip.html');
const COUNT = 2;

const must = (cond, what) => { if (!cond) { console.error(`[STORIES-MAKE] не найдено в исходнике: ${what}`); process.exit(1); } };
const between = (text, from, to, replacement, what) => {
  const a = text.indexOf(from); must(a >= 0, `${what} — начало «${from.slice(0, 40)}»`);
  const b = text.indexOf(to, a + from.length); must(b >= 0, `${what} — конец «${to.slice(0, 40)}»`);
  return text.slice(0, a) + replacement + text.slice(b);
};

let html = fs.readFileSync(SRC, 'utf8');
const frames = fs.readFileSync(FRAMES, 'utf8');

// 1. заголовок вкладки
html = between(html, '<title>', '</title>', '<title>Plus и Ultra · Шаблоны историй v1', 'title');

// 2. стили новых кадров: знак в круге (как у макета «Истории вместо окон») и картинка медали
const CSS = `
/* ── Plus и Ultra (владелец 11.11). Новое — большой знак уровня: Ultra коралловый ✦, Plus фиолетово-синий ◆ (как в пейволе «Два пути»). ── */
.icn { width: 124px; height: 124px; border-radius: 50%; display: grid; place-items: center; color: var(--acc-b); background: color-mix(in srgb, var(--acc-g) 18%, transparent); box-shadow: 0 0 70px -14px var(--acc-glow); }
.ph.lt .icn { color: var(--acc-g); }
.pmark.inl.pbig { width: 112px; height: 112px; filter: drop-shadow(0 16px 34px rgba(255, 95, 143, .5)); }
.pmark.inl.pbig i { font-size: 50px; }
.pmark.tplus { filter: drop-shadow(0 16px 34px rgba(142, 124, 255, .5)); }
.pmark.tplus i { color: #0F0A33; background: linear-gradient(135deg, #A99BFF, #8E7CFF 52%, #5F90DB); }
.st-swap td:nth-child(3) b { color: #ECECEE; }
.st-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; margin: 16px 0 6px; max-width: 1240px; }
.st-rules div { background: #17181B; border-radius: 16px; padding: 14px 16px; font-size: 14px; line-height: 21px; color: #C9C9CE; }
.st-rules div b { display: block; color: #ECECEE; font-size: 15px; line-height: 21px; font-weight: 700; margin-bottom: 3px; }
</style>`;
must(html.includes('</style>'), 'конец блока стилей');
html = html.replace('</style>', CSS.trimStart()); // CSS сам заканчивается на </style>
must(html.includes('.pmark.inl.pbig {'), 'вставка стилей');

// 3. шапка страницы и секции
const swapRows = [
  ['Праздник после покупки месячной подписки или выдачи командой', 'Главная', 'кадр 1 «Plus активирован» — фиолетово-синий знак ◆'],
  ['Праздник после покупки годовой подписки', 'Главная', 'кадр 2 «Ultra активирован» — коралловый знак ✦'],
  ['Праздник после ввода промокода', 'экран ввода промокода', 'остаётся окном: это ответ на нажатие самого человека'],
];
const swapTable = `<tr><th>Что всплывало</th><th>Когда</th><th>Что стало</th></tr>` +
  swapRows.map(([was, when, now]) => `<tr><td>${was}</td><td>${when}</td><td>${now}</td></tr>`).join('');

const HEAD = `<h1>Plus и Ultra · ${COUNT} кадра историй</h1>
  <p class="st-lead">Праздничное окно после покупки или выдачи подписки открывалось само поверх Главной. Теперь это кадр в «Историях» — свой у каждого уровня.</p>
  <div class="st-rules">
    <div><b>Уровень — как во всём приложении</b>Месячная подписка — Plus, годовая — Ultra. Выдача командой и неизвестный план — Plus: Ultra по догадке не показываем.</div>
    <div><b>Различаются знаком</b>Ultra — коралловый градиент и звезда ✦, Plus — фиолетово-синий и ромб ◆, ровно как в окне покупки «Два пути».</div>
    <div><b>Промокод остаётся окном</b>Праздник после ввода промокода появляется на экране ввода кода в ответ на нажатие самого человека.</div>
  </div>
  `;
html = between(html, '<h1>', '<div class="st-bar" id="bar">', HEAD, 'шапка страницы');
html = between(html, '<h2 id="player-h">', '<div class="st-grid" id="player">', `<h2 id="player-h">Плеер · ${COUNT} кадров подряд</h2>
  <p class="st-lead">Так истории идут в приложении: одна очередь, полоса на каждый кадр. В жизни за раз приходит один кадр, здесь все собраны для просмотра.</p>
  `, 'секция плеера');
html = between(html, '<h2 id="gallery-h">', '<div class="st-grid" id="gallery">', `<h2 id="gallery-h">Галерея · по одному кадру на телефон</h2>
  <p class="st-lead">Над телефоном написано, какое окно заменяет кадр. Каждый телефон повторяет свой кадр каждые 10 с. Тап влево и вправо листает.</p>
  `, 'секция галереи');
html = between(html, '<h2 id="map-h">', '</div>\n\n<script>window.__THEMES', `<h2 id="swap-h">Было окно → стало кадр</h2>
  <p class="st-lead">Праздничное окно открывалось само поверх Главной после оплаты или выдачи.</p>
  <div class="st-map-wrap"><table class="st-map st-swap" id="swap">${swapTable}</table></div>

  <h2 id="map-h">Опись новых кадров</h2>
  <p class="st-lead">Данные — что кадр берёт из события; ничего сверх этого кадр не показывает.</p>
  <div class="st-map-wrap"><table class="st-map" id="map"></table></div>
`, 'секция описи');

// 4. список кадров
html = between(html, '/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ── */', '/* ── плеер = просмотр сторис ── */', frames.trimEnd() + '\n\n', 'список кадров');

// 5. колонка описи
html = html.replace('<th>Когда появляется</th>', '<th>Какое окно заменяет и когда приходит</th>');

must(!html.includes('plus_offer_streak'), 'старые кадры Plus убраны');
must((html.match(/\{ id: '/g) || []).length === COUNT, `${COUNT} кадров в списке`);
fs.writeFileSync(OUT, html);
console.log(`[STORIES-MAKE] готово: ${path.basename(OUT)} · кадров ${COUNT} · ${(html.length / 1024).toFixed(0)} КБ`);
