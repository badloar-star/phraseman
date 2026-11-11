// Сборщик макета «Состояния Главной в историях» (владелец 11.11: «история показывает просто букву i и всё» → «Нарисовать макет»).
// зачем: плеер, темы, стили и движение берём 1:1 из одобренного макета историй (stories-plus-offers.html ← stories-templates-v1.html),
// меняем только список кадров, шапку страницы и добавляем таблицу «состояние → кадр». Так макет не расходится с плеером приложения.
// Запуск: node docs/design/v2-app/stories-home-states.make.cjs
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const SRC = path.join(dir, 'stories-plus-offers.html');
const FRAMES = path.join(dir, 'stories-home-states.frames.js');
const OUT = path.join(dir, 'stories-home-states.html');

const must = (cond, what) => { if (!cond) { console.error(`[STORIES-MAKE] не найдено в исходнике: ${what}`); process.exit(1); } };
const between = (text, from, to, replacement, what) => {
  const a = text.indexOf(from); must(a >= 0, `${what} — начало «${from.slice(0, 40)}»`);
  const b = text.indexOf(to, a + from.length); must(b >= 0, `${what} — конец «${to.slice(0, 40)}»`);
  return text.slice(0, a) + replacement + text.slice(b);
};

let html = fs.readFileSync(SRC, 'utf8');
const frames = fs.readFileSync(FRAMES, 'utf8');
const FRAME_COUNT = (frames.match(/\{ id: '/g) || []).length;

// 1. заголовок вкладки
html = between(html, '<title>', '</title>', '<title>Состояния Главной в историях · Шаблоны историй v1', 'title');

// 2. стили новых кадров. Новое — только то, чего нет в одобренном макете: знак в круге и строки (как в «историях вместо окон»),
//    деления энергии, карточка фразы, погасшее пламя, веер карточек, пара монет. Цвета — токены темы; движется только transform и opacity.
const CSS = `
/* ── состояния Главной в историях (владелец 11.11) ── */
.icn { width: 124px; height: 124px; border-radius: 50%; display: grid; place-items: center; color: var(--acc-b); background: color-mix(in srgb, var(--acc-g) 18%, transparent); box-shadow: 0 0 70px -14px var(--acc-glow); }
.ph.lt .icn { color: var(--acc-g); }
.list.rws { margin: 18px 0 0; }
.list.rws:first-child { margin: 0 0 22px; }
.list .r .ck.lk { animation-name: stLock; }
@keyframes stLock { to { background: color-mix(in srgb, var(--tx) 22%, transparent); color: var(--tx); } }
.pips { display: flex; gap: 8px; margin-bottom: 24px; }
.pips i { display: block; width: 46px; height: 14px; border-radius: 7px; background: color-mix(in srgb, var(--tx) 14%, transparent); overflow: hidden; }
.pips i.on { background: var(--acc-g); }
.pips i.fill::after { content: ''; display: block; height: 100%; border-radius: 7px; background: var(--acc-g); transform-origin: left; transform: scaleX(0); animation: stPip 2600ms cubic-bezier(.23, 1, .32, 1) forwards; animation-delay: var(--fd, 500ms); }
@keyframes stPip { to { transform: scaleX(.42); } }
.phr { width: 100%; max-width: 300px; padding: 18px; border-radius: 20px; background: color-mix(in srgb, var(--tx) 9%, transparent); text-align: left; margin-bottom: 22px; }
.phr .en { font-size: 22px; line-height: 29px; font-weight: 700; color: var(--tx); }
.phr .en s { color: var(--bad); text-decoration-thickness: 2px; }
.phr .en b { color: var(--good); font-weight: 800; }
.phr .ru { margin-top: 6px; font-size: 14px; line-height: 19px; color: var(--sec); }
.flame.out .fill, .flame.out .core, .flame.out .fglow { display: none; }
.flame.out .outline { opacity: .75; }
.flame.out .n { background: color-mix(in srgb, var(--tx) 16%, transparent); color: var(--sec); }
.deck { position: relative; width: 170px; height: 132px; }
.deck i { position: absolute; left: 43px; top: 8px; width: 84px; height: 112px; border-radius: 16px; background: var(--card); box-shadow: 0 12px 26px -12px var(--sh-tint); display: grid; place-items: center; font-style: normal; font-size: 40px; line-height: 44px; font-weight: 800; letter-spacing: -1.5px; color: var(--tx); font-variant-numeric: tabular-nums; opacity: 0; animation: stFan 620ms cubic-bezier(.23, 1, .32, 1) both; animation-delay: var(--d); }
.deck i:not(:last-child) { background: color-mix(in srgb, var(--tx) 18%, var(--card)); box-shadow: none; }
.duo { display: flex; align-items: flex-end; gap: 12px; }
.duo .fr { position: relative; }
.duo .bdg { position: absolute; right: -2px; bottom: 2px; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--acc-g); color: var(--acc-ink); box-shadow: 0 0 0 4px var(--bg-mid); }
.duo .me .coin { opacity: .5; }
.st-swap .st-s { display: inline-block; font-size: 11px; line-height: 17px; font-weight: 700; letter-spacing: .3px; padding: 0 8px; border-radius: 9px; white-space: nowrap; }
.st-swap .st-s.n { background: #1F3A2E; color: #8FD3A8; } .st-swap .st-s.h { background: #23303F; color: #9FC3EA; }
.st-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; margin: 16px 0 6px; max-width: 1240px; }
.st-rules div { background: #17181B; border-radius: 16px; padding: 14px 16px; font-size: 14px; line-height: 21px; color: #C9C9CE; }
.st-rules div b { display: block; color: #ECECEE; font-size: 15px; line-height: 21px; font-weight: 700; margin-bottom: 3px; }
@media (prefers-reduced-motion: reduce) {
  .list .r .ck.lk { background: color-mix(in srgb, var(--tx) 22%, transparent) !important; color: var(--tx) !important; }
  .pips i.fill::after { animation: none; transform: scaleX(.42); }
  .deck i { animation: none; opacity: 1; transform: rotate(var(--rot)) translateX(var(--tx2, 0)); }
}
</style>`;
must(html.includes('</style>'), 'конец блока стилей');
html = html.replace('</style>', CSS.trimStart());
must(html.includes('.pips i.fill::after'), 'вставка стилей');

// 3. шапка страницы и секции
const stateRows = [
  ['День засчитан', 'day_done', 'n', 'кадр 1'],
  ['Серия под угрозой', 'streak_risk', 'n', 'кадр 2'],
  ['Нет энергии', 'no_energy', 'n', 'кадр 3'],
  ['Серия прервалась', 'streak_lost', 'n', 'кадр 4'],
  ['Экзамен готов', 'exam_ready', 'n', 'кадр 5'],
  ['Всё пройдено', 'all_done', 'n', 'кадр 6'],
  ['Нет сети', 'offline', 'n', 'кадр 7'],
  ['Накопились ошибки', 'special:mistakes_pile', 'n', 'кадр 8'],
  ['Ошибка повторилась', 'special:mistake_poke', 'n', 'кадр 9'],
  ['Ошибка выучена', 'special:mistake_mastered', 'n', 'кадр 10'],
  ['Пора повторить слова', 'special:words_due', 'n', 'кадр 11'],
  ['Друг уже занимался', 'special:friend_nudge', 'n', 'кадр 12'],
  ['Личный рекорд', 'special:personal_best', 'n', 'кадр 13'],
  ['Про тебя', 'special:fun_stats', 'n', 'кадр 14'],
  ['Новый рубеж', 'special:milestone', 'n', 'кадр 15'],
  ['Праздник', 'special:holiday', 'n', 'кадр 16'],
  ['С возвращением', 'welcome_back', 'h', 'кадр уже есть: «С возвращением» (истории вместо окон)'],
  ['Тебя обогнали на Пике', 'special:peak_overtaken', 'h', 'кадр уже есть: «Пик · тебя обошли» (истории вместо окон)'],
  ['Итоги недели', 'special:weekly_recap', 'h', 'кадр уже есть: «Неделя» (шаблоны v1)'],
  ['Фраза дня', 'special:phrase_of_day_unseen', 'h', 'кадр уже есть: «Фраза дня» (шаблоны v1)'],
];
const tag = { n: 'новый кадр', h: 'кадр уже есть' };
const stateTable = `<tr><th>Состояние Главной</th><th>Запись</th><th>Чем рисуется</th><th>Статус</th></tr>` +
  stateRows.map(([name, ev, st, now]) => `<tr><td>${name}</td><td><code>${ev}</code></td><td>${now}</td><td><span class="st-s ${st}">${tag[st]}</span></td></tr>`).join('');
const count = (k) => stateRows.filter((r) => r[2] === k).length;
must(count('n') === FRAME_COUNT, `число новых кадров в таблице (${count('n')}) = числу кадров (${FRAME_COUNT})`);

const HEAD = `<h1>Состояния Главной в историях · ${FRAME_COUNT} кадров</h1>
  <p class="st-lead">Сейчас любое состояние Главной приходит в «Истории» одной заглушкой: значок «i» и фраза. Здесь у каждого состояния свой кадр. Ниже: живой плеер, каждый кадр отдельно и таблица по всем состояниям.</p>
  <div class="st-rules">
    <div><b>Заголовок тот же, что был на Главной</b>Тексты взяты из сцен Главной как есть, новых формулировок нет. Меняется только то, как кадр выглядит.</div>
    <div><b>Арт показывает само состояние</b>Серия — пламя, энергия — деления, ошибка — сама фраза с исправлением, повтор — стопка карточек. Значок в круге остаётся только там, где показать нечего.</div>
    <div><b>Кнопка ведёт туда же, куда вела сцена</b>${stateRows.length} состояний: ${count('n')} получают новый кадр, для ${count('h')} кадр уже нарисован в других макетах.</div>
  </div>
  `;
html = between(html, '<h1>', '<div class="st-bar" id="bar">', HEAD, 'шапка страницы');
html = between(html, '<h2 id="player-h">', '<div class="st-grid" id="player">', `<h2 id="player-h">Плеер · ${FRAME_COUNT} кадров подряд</h2>
  <p class="st-lead">Так истории идут в приложении: одна очередь, полоса на каждый кадр. В жизни за раз приходит один кадр состояния, здесь все собраны вместе для просмотра.</p>
  `, 'секция плеера');
html = between(html, '<h2 id="gallery-h">', '<div class="st-grid" id="gallery">', `<h2 id="gallery-h">Галерея · по одному кадру на телефон</h2>
  <p class="st-lead">Над телефоном написано, какое состояние показывает кадр. Каждый телефон повторяет свой кадр каждые 10 с. Тап влево и вправо листает соседние кадры.</p>
  `, 'секция галереи');
html = between(html, '<h2 id="map-h">', '</div>\n\n<script>window.__THEMES', `<h2 id="swap-h">Состояние → кадр</h2>
  <p class="st-lead">Все состояния Главной, которые уходят в истории. Синие строки новых кадров не требуют: для них кадр уже одобрен в других макетах, нужно только подключить.</p>
  <div class="st-map-wrap"><table class="st-map st-swap" id="swap">${stateTable}</table></div>

  <h2 id="map-h">Опись новых кадров</h2>
  <p class="st-lead">Данные — что кадр берёт из записи состояния; ничего сверх этого кадр не выдумывает. Числа, имена и фразы в кадрах — пример.</p>
  <div class="st-map-wrap"><table class="st-map" id="map"></table></div>
`, 'секция описи');

// 4. список кадров
html = between(html, '/* ── шаблоны: id · имя · группа · статус · когда · данные · кадр ── */', '/* ── плеер = просмотр сторис ── */', frames.trimEnd() + '\n\n', 'список кадров');

// 5. колонка описи «Когда появляется» → «Когда приходит»
html = html.replace('<th>Когда появляется</th>', '<th>Когда приходит</th>');

must(!html.includes('plus_offer_streak'), 'старые кадры Plus убраны');
fs.writeFileSync(OUT, html);
console.log(`[STORIES-MAKE] готово: ${path.basename(OUT)} · кадров ${FRAME_COUNT} · строк в таблице состояний ${stateRows.length} · ${(html.length / 1024).toFixed(0)} КБ`);
