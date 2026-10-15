// зачем: главная (вариант C, одобрен владельцем 15.10) внутри полного макета сайта + витрина «Все экраны»,
// откуда владелец открывает любую страницу и любое её состояние. Блок «У каждого — своя точка старта»
// убран по слову владельца 15.10.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { heroC, method, product, todayList, reviews, gift, journal, faq, close } from '../_build.mjs';
import { ic } from '../_shell.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Ссылки живого сайта → файлы макета, чтобы всё кликалось внутри макета.
const MAP = [
  ['/english-level-test/', 'english-level-test.html'], ['/download/', 'download.html'], ['/app/', 'app.html'],
  ['/guides/speaking-barrier/', 'guide-speaking-barrier.html'], ['/guides/english-15-minutes-a-day/', 'guide-english-15-minutes-a-day.html'],
  ['/guides/english-phrases-for-travel/', 'guide-travel.html'], ['/guides/', 'guides.html'], ['/gift/', 'gift.html'],
  ['/premium/', 'premium.html'], ['/russia/', 'russia.html'], ['/contact/', 'contact.html'], ['/faq/', 'faq.html'], ['/links/', 'links.html'],
];
const local = (html) => MAP.reduce((s, [from, to]) => s.split(`https://knowlyapps.com${from}`).join(to), html)
  .split('../../../assets/').join('../../../../assets/').split('../../../knowly-www/').join('../../../../knowly-www/');

// В оболочке тема живёт во всплывашке шапки и в студии на главной — обе управляются одним кодом (data-swatches).
const hero = local(heroC).replace('id="swatches"', 'data-swatches');

const HOME_JS = `
(function () {
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      document.querySelectorAll('[data-view]').forEach(function (v) { if (v.dataset.view === b.dataset.tab) v.removeAttribute('data-off'); else v.setAttribute('data-off', ''); });
    });
  });
  // зачем: монета — валюта; начисление показывается мгновенно и встаёт на итог даже в скрытой вкладке
  var coins = 240, busy = false, earn = document.querySelector('[data-earn]');
  if (!earn) { console.warn('[SITE-2.0] нет кнопки начисления монет'); return; }
  earn.addEventListener('click', function () {
    if (busy) return; busy = true;
    var from = coins; coins += 12; var t0 = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 600), v = Math.round(from + (coins - from) * (1 - Math.pow(1 - p, 3)));
      document.querySelectorAll('[data-coins]').forEach(function (el) { el.textContent = v; });
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
    setTimeout(function () { document.querySelectorAll('[data-coins]').forEach(function (el) { el.textContent = coins; }); busy = false; }, 700);
    document.querySelectorAll('[data-coin],[data-coinpill]').forEach(function (el) { el.classList.remove('coin-pop'); void el.offsetWidth; el.classList.add('coin-pop'); });
  });
})();`;

// Витрина: опись страниц пишет _pages.mjs в c/screens.json (берём прошлую сборку; при первой — пусто).
function screensBody() {
  const f = join(ROOT, 'c', 'screens.json');
  let list = [];
  try { if (existsSync(f)) list = JSON.parse(readFileSync(f, 'utf8')); }
  catch (e) { console.warn('[SITE-2.0] screens.json не прочитан:', e && e.message); }
  const ORDER = ['Главная', 'Основные', 'Тест уровня', 'Покупка', 'Журнал', 'Документы', 'Служебные', 'Прочее'];
  const groups = {};
  for (const p of list) { if (p.file === 'screens.html') continue; (groups[p.group] ||= []).push(p); }
  const total = list.filter((p) => p.file !== 'screens.html').length;
  const stateCount = list.reduce((n, p) => n + (p.states ? p.states.length : 0), 0);
  return `
<section class="phead"><div class="wrap">
  <span class="ov">Макет PhraseMan 2.0 · вариант C</span>
  <h1>Все экраны сайта<span class="l2">в одном месте.</span></h1>
  <p class="lead">${total} страниц и ${stateCount} состояний. Тема из шапки сохраняется при переходах.</p>
</div></section>
<section style="padding-bottom:clamp(64px,9vw,120px)"><div class="wrap">
  ${ORDER.filter((g) => groups[g]).map((g) => `
  <div class="gsec"><h2>${g}</h2><div class="gal">
    ${groups[g].map((p, i) => `
    <div class="glass gcard" style="--sx:${(i * 37) % 100}%;--sy:0%">
      <a class="r" href="${p.file}"><span class="tile">${ic('doc', 's18')}</span><span><b>${p.title}</b><br><span class="path">${p.path}</span></span></a>
      ${p.states && p.states.length ? `<div class="sts">${p.states.map(([id, label]) => `<a href="${p.file}#${id}">${label}</a>`).join('')}</div>` : ''}
    </div>`).join('')}
  </div></div>`).join('')}
</div></section>`;
}

export default [
  {
    file: 'index.html',
    title: 'Главная',
    group: 'Главная',
    path: '/',
    body: [hero, method, product(todayList), reviews, gift, journal, faq, close].map(local).join('\n'),
    js: HOME_JS,
  },
  {
    file: 'screens.html',
    title: 'Все экраны',
    group: 'Главная',
    path: 'витрина макета',
    body: screensBody(),
  },
];
