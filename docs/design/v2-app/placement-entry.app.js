/* placement-entry.app.js — «Проверить уровень» на реальных кадрах: кнопка на обложке курса, плашка «Откроется после…» по тапу на закрытой карте.
   зачем (жалоба владельца №8; спецификация Входа 28.10; замки владельца 22.10/26.10: тряска замка остаётся, окна нет): экран подключается
   только после одобрения макета на настоящих снимках. Тексты — app/learning_v2_placement_entry_copy.ts (ru). Вид кнопки — ровно стеклянная
   «Не хочу с начала» обложки (SeasonCourseView.tsx styles.glass), плашка — по образцу тост-плашки списка уроков (lessons.tsx:5904).
   Кадры: обложка Сезона assets/real/scene_season_{тема}_{light|dark}.png (Сверка; на ней же карусель с закрытой картой «10») и
   assets/real/placement_entry/ (cover…, session…, lesson…/list… — «Все уроки»). Координаты — в px кадра (1080 × 2400). */
(() => {
const LOG = '[PE]';
const TEST = new URLSearchParams(location.search).get('test') === '1'; // подменные кадры _test_* — только для проверки механики (?test=1)
const RF = window.RF;
const CHECK_LEVEL = 'Проверить уровень';
const opensAfter = (kind, n) => (kind === 'lesson' ? `Откроется после урока ${n}` : `Откроется после занятия ${n}`);
const ICON = { lock: 'f3c7', 'school-outline': 'f55d' };
const io = (n) => `<i class="io" aria-hidden="true">&#x${ICON[n]};</i>`;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const after = (ms, f) => setTimeout(f, RM() ? 0 : ms);
const once = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); node.addEventListener('animationend', () => node.classList.remove(cls), { once: true }); };
const apOf = (f) => (/light/i.test(f) ? 'light' : 'dark');
const themeOf = (f) => { const m = /scene_season_([a-z_]+)_(light|dark)\.png$/i.exec(f); return m ? m[1] : 'graphite'; };
/* кадры: обложка Сезона из assets/real — и обложка (не-новичок: строка прогресса уже есть), и карусель с закрытой картой; «Все уроки» — из placement_entry/ */
const SEASON = (window.__SEASON || []).map((f) => ({ src: `assets/real/${f}`, file: f, ap: apOf(f), theme: themeOf(f) }));
const PE = (window.__FRAMES || []).filter((f) => TEST || !f.startsWith('_test_')).map((f) => ({ src: `assets/real/placement_entry/${f}`, file: f, ap: apOf(f), kind: /lesson|list|all/i.test(f) ? 'lesson' : /newbie|cover/i.test(f) ? 'cover-newbie' : 'session' }));
/* ── координаты в px кадра — замер по кадру scene_season_graphite_dark.png (сборка 28.10) ── */
const L = {
  status: 100, tab: 2140,
  cover: { progTop: 930, strip: 915 }, // строка прогресса «Фотовыставка» ~890; кнопка вставляется под ней, фон вставки — растянутая чистая полоска обложки
  session: { x: [775, 1013], y: [1450, 2030], prev: 9 }, // закрытая карта «10» в карусели (за картой 9)
  lesson: { card: [760, 960], prev: 2 }, // закрытый урок в «Все уроки» — уточнить по кадру Сверки
};
const tone = (ap) => (ap === 'light' ? '--pe-ctl:#D9DFE5;--pe-tx:#16191C' : '--pe-ctl:#262C32;--pe-tx:#F7FAFE');
const glassBtn = (extra = '') => `<span class="pe-glass t" style="${extra}" data-act="check">${io('school-outline')}${CHECK_LEVEL}</span>`;
const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
const phone = (fr, o = {}) => RF.phone(Object.assign({ src: fr.src, exists: true, cls: 'pe-now', status: L.status, tab: L.tab }, o)).replace('кадр не снят', 'кадр снимается');
/* вставка ломтём на чистой полоске кадра: под кнопкой — растянутые 4 px обложки над местом вставки, а не кусок кадра с содержимым */
const insOn = (fr, y, h, html, strip) => { const sliceH = Math.max(1, RF.px(4)); return { y, html: `<div class="pe-ins" style="position:relative;height:${RF.px(h)}px;overflow:hidden"><div style="transform:scaleY(${(RF.px(h) / sliceH).toFixed(2)});transform-origin:top">${RF.slice(fr.src, strip, strip + 4)}</div><div class="pe-ins-over">${html}</div></div>` }; };
/* обложка не-новичка: строка прогресса уже на кадре — под ней та же стеклянная кнопка «Проверить уровень» */
const willCover = (fr) => phone(fr, { cls: 'pe-will', inserts: [insOn(fr, L.cover.progTop, 150, glassBtn(), L.cover.strip)] });
/* закрытая карта: своя «дрожащая» копия только этой карты поверх кадра (не вся полоса), плашка внизу над таб-баром; тап — по карте */
const willLocked = (fr, kind, withButton) => {
  const S = L.session; const [x0, x1] = S.x; const [y0, y1] = S.y;
  const plate = `<div class="pe-plate" style="${tone(fr.ap)}" data-plate><div class="tx">${opensAfter('session', S.prev)}</div>${withButton ? `<span class="btn t" data-act="check">${io('school-outline')}${CHECK_LEVEL}</span>` : ''}</div>`;
  const shaker = `<div class="pe-card-shake" data-act="lock" style="left:${RF.px(x0)}px;top:${RF.px(y0)}px;width:${RF.px(x1 - x0)}px;height:${RF.px(y1 - y0)}px;background-image:url(${fr.src});background-size:${RF.W}px ${RF.H}px;background-position:-${RF.px(x0)}px -${RF.px(y0)}px"></div>`;
  return phone(fr, { cls: 'pe-will', overlays: shaker, fixed: plate });
};
const SECTIONS = {
  cover: { title: 'Обложка курса — кнопка «Проверить уровень» под строкой прогресса', note: 'Вид — та же стеклянная кнопка, что «Не хочу с начала» у новичка. На кадре — не новичок (строка прогресса «Фотовыставка» уже есть), кнопка встаёт под ней; у новичка на этом месте «Не хочу с начала» — её подпись («Проверить уровень» или оставить) — вопрос владельцу, нужен кадр новичка. Показывается, пока тест не использован и урок < 10.' },
  session: { title: 'Закрытая карта занятия в карусели — тап', note: 'Замок трясётся как сейчас, окна нет. Внизу над таб-баром — плашка «Откроется после занятия 9» с кнопкой «Проверить уровень» (уходит через 4 с или по любому тапу). Если тест использован или урок ≥ 10 — плашка только с текстом (2,2 с, как сейчас). Тапай по карте «10».' },
  lesson: { title: '«Все уроки» — тап по закрытому уроку', note: 'То же, текст «Откроется после урока 2». Ждёт кадра Сверки (placement_entry/lesson_list_…).' },
};
const render = () => {
  const root = document.getElementById('root');
  if (!SEASON.length && !PE.length) { root.innerHTML = '<section class="block"><h2>Кадров ещё нет</h2><p>Сверка кладёт PNG в assets/real (scene_season_*) и assets/real/placement_entry/ — пересобрать: node placement-entry.make.cjs</p></section>'; return; }
  const seasons = SEASON.filter((f) => f.ap === 'dark').concat(SEASON.filter((f) => f.ap === 'light'));
  const coverRows = seasons.map((fr) => `<div class="phones" style="margin-bottom:28px">${col(`сейчас · ${fr.theme} ${fr.ap === 'dark' ? 'тёмное' : 'светлое'}`, phone(fr))}${col('как будет · не новичок: кнопка под строкой прогресса', willCover(fr))}</div>`).join('');
  const sessionRows = seasons.map((fr) => `<div class="phones" style="margin-bottom:28px">${col('сейчас', phone(fr))}${col('как будет · с кнопкой (4 с / тап)', willLocked(fr, 'session', true))}${col('как будет · тест использован (только текст)', willLocked(fr, 'session', false))}</div>`).join('');
  const lessons = PE.filter((f) => f.kind === 'lesson');
  const lessonRows = lessons.length ? lessons.map((fr) => `<div class="phones" style="margin-bottom:28px">${col('сейчас', phone(fr))}${col('как будет', willLocked(fr, 'lesson', true))}</div>`).join('') : `<div class="phones">${col('кадр снимается', RF.phone({ src: 'placement_entry/lesson_list_graphite_dark.png', exists: false, cls: 'pe-now' }).replace('кадр не снят', 'кадр снимается'))}</div>`;
  root.innerHTML = `<section class="block" id="pe-cover"><h2>${SECTIONS.cover.title}</h2><p class="pe-note">${SECTIONS.cover.note}</p>${coverRows}</section><section class="block" id="pe-session"><h2>${SECTIONS.session.title}</h2><p class="pe-note">${SECTIONS.session.note}</p>${sessionRows}</section><section class="block" id="pe-lesson"><h2>${SECTIONS.lesson.title}</h2><p class="pe-note">${SECTIONS.lesson.note}</p>${lessonRows}</section>`;
  console.log(LOG, 'render', JSON.stringify({ season: SEASON.length, placement: PE.length, lessons: lessons.length })); // guard-ok: одна строка на перерисовку
};
const timers = new WeakMap();
const hidePlate = (plate) => { plate.classList.remove('on'); clearTimeout(timers.get(plate)); };
document.body.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  // любой другой тап по телефону прячет открытую плашку (вариант Входа: уход по тапу)
  document.querySelectorAll('.pe-plate.on').forEach((p) => { if (!a || (a.dataset.act !== 'lock' && !p.contains(a)) || (a.dataset.act === 'lock' && !a.closest('.ph').contains(p))) hidePlate(p); });
  if (!a) return;
  const ph = a.closest('.ph'); const act = a.dataset.act;
  console.log(LOG, 'act', act); // guard-ok: одна строка на тап
  if (act === 'lock') {
    once(a, 'shake'); const plate = ph.querySelector('[data-plate]');
    if (plate) { plate.classList.add('on'); clearTimeout(timers.get(plate)); timers.set(plate, after(plate.querySelector('.btn') ? 4000 : 2200, () => plate.classList.remove('on'))); }
    return;
  }
  if (act === 'check') { console.log(LOG, 'open placement test'); return; }
});
render();
window.__pe = { SEASON, PE, L, render };
})();
