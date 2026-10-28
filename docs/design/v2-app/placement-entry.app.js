/* placement-entry.app.js — «Проверить уровень» на реальных кадрах: кнопка на обложке курса, плашка «Откроется после…» по тапу на закрытой карте.
   зачем (жалоба владельца №8; спецификация Входа 28.10; замки владельца 22.10/26.10: тряска замка остаётся, окна нет): экран подключается
   только после одобрения макета на настоящих снимках. Тексты — app/learning_v2_placement_entry_copy.ts (ru). Вид кнопки — ровно стеклянная
   «Не хочу с начала» обложки (SeasonCourseView.tsx:404 styles.glass), плашка — по образцу тост-плашки списка уроков (lessons.tsx:5904).
   Кадры — window.__FRAMES из assets/real/placement_entry/ (сборщик); экран — по имени файла: cover… — обложка курса, session… / carousel… / locked… —
   обложка с закрытой картой, lesson… / list… / all… — «Все уроки». Координаты элементов — LAYOUT в px кадра (1080 × 2400), «откуда» подписано. */
(() => {
const LOG = '[PE]';
const DIR = 'assets/real/placement_entry/';
const TEST = new URLSearchParams(location.search).get('test') === '1'; // подменные кадры _test_* — только для проверки механики (?test=1)
const FRAMES = (window.__FRAMES || []).filter((f) => TEST || !f.startsWith('_test_'));
const RF = window.RF;
const CHECK_LEVEL = 'Проверить уровень';
const NOT_FROM_START = 'Не хочу с начала';
const opensAfter = (kind, n) => (kind === 'lesson' ? `Откроется после урока ${n}` : `Откроется после занятия ${n}`);
const ICON = { lock: 'f3c7', 'school-outline': 'f55d' };
const io = (n) => `<i class="io" aria-hidden="true">&#x${ICON[n]};</i>`;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const after = (ms, f) => setTimeout(f, RM() ? 0 : ms);
const once = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); node.addEventListener('animationend', () => node.classList.remove(cls), { once: true }); };

/* ── координаты в px кадра: откуда — замер по кадрам Сверки (до их прихода — по коду обложки Сезона: кнопка новичка под рядом «Начать · Слова · Теория») ── */
const LAYOUT = {
  cover: { status: 100, tab: 2170, glassTop: 1120, glassH: 132, progTop: 1120 }, // glassTop/H — стеклянная кнопка новичка «Не хочу с начала»; у не-новичка на её месте строка прогресса
  session: { status: 100, tab: 2170, card: [640, 1180], kind: 'session', prev: 3 }, // закрытая карта занятия в карусели (верх/низ)
  lesson: { status: 100, tab: 2170, card: [760, 960], kind: 'lesson', prev: 2 }, // закрытый урок в «Все уроки»
};
const kindOf = (f) => (/lesson|list|all/i.test(f) ? 'lesson' : /session|carousel|locked/i.test(f) ? 'session' : 'cover');
const apOf = (f) => (/light/i.test(f) ? 'light' : 'dark');
/* тон плашки — opaqueControl/text оформления кадра (графит); с реальными кадрами других тем — добавить пары */
const tone = (ap) => (ap === 'light' ? '--pe-ctl:#D9DFE5;--pe-tx:#16191C' : '--pe-ctl:#262C32;--pe-tx:#F7FAFE');

const glassBtn = (top, label) => `<span class="pe-glass t" style="top:${RF.px(top)}px;right:20px" data-act="check">${io('school-outline')}${label}</span>`;
const now = (f, L) => RF.phone({ src: DIR + f, exists: true, cls: 'pe-now', status: L.status, tab: L.tab });
/* обложка: 1) новичок — та же стеклянная кнопка, подпись «Проверить уровень» (вопрос владельцу: оставить «Не хочу с начала» или так);
   2) не-новичок — на месте кнопки строка прогресса (как в коде), под ней та же кнопка «Проверить уровень» (вставка ломтя) */
const willCoverLabel = (f) => { const L = LAYOUT.cover; return RF.phone({ src: DIR + f, exists: true, cls: 'pe-will', status: L.status, tab: L.tab, overlays: glassBtn(L.glassTop, CHECK_LEVEL) }); };
const willCoverProgress = (f) => {
  const L = LAYOUT.cover;
  // кнопку новичка вырезаем из кадра (ломти до и после неё), на её место — строка прогресса (13/17, полоска 72×4) и под ней кнопка «Проверить уровень» тем же видом
  const ins = `<div class="pe-ins-block" style="height:${RF.px(L.glassH) + 62}px;position:relative"><div class="pe-prog" style="top:4px">` +
    `<span class="bar"><i style="width:30%"></i></span>задание 6 из 20</div><span class="pe-glass t" style="top:${RF.px(L.glassH) + 4}px;right:20px" data-act="check">${io('school-outline')}${CHECK_LEVEL}</span></div>`;
  return RF.phone({ src: DIR + f, exists: true, cls: 'pe-will', status: L.status, tab: L.tab, cut: [L.glassTop, L.glassTop + L.glassH], inserts: [{ y: L.glassTop, html: ins }] });
};
/* закрытая карта — свой ломоть (его трясём); плашка внизу над таб-баром; тап — по невидимой зоне поверх карты */
const willLocked = (f, kind, withButton) => {
  const L = LAYOUT[kind]; const [top, bot] = L.card;
  const plate = `<div class="pe-plate" style="${tone(apOf(f))}" data-plate><div class="tx">${opensAfter(L.kind, L.prev)}</div>${withButton ? `<span class="btn t" data-act="check">${io('school-outline')}${CHECK_LEVEL}</span>` : ''}</div>`;
  let html = RF.phone({ src: DIR + f, exists: true, cls: 'pe-will', status: L.status, tab: L.tab, inserts: [{ y: top, html: '' }, { y: bot, html: '' }], overlays: `<div class="pe-tap" style="top:${RF.px(top)}px;height:${RF.px(bot - top)}px" data-act="lock"></div>`, fixed: plate });
  let n = 0; html = html.replace(/class="rf-slice"/g, (m) => (++n === 2 ? 'class="rf-slice pe-card"' : m));
  return html;
};
const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
const SECTIONS = {
  cover: { title: 'Обложка курса — кнопка «Проверить уровень»', note: 'Вид — та же стеклянная кнопка, что «Не хочу с начала». Новичок: кнопка на месте, подпись — вопрос владельцу (оставить «Не хочу с начала» или «Проверить уровень»). Не новичок: на этом месте строка прогресса, кнопка под ней. Показывается, пока тест не использован и урок < 10.',
    phones: (f) => [col('сейчас · новичок', now(f, LAYOUT.cover)), col('как будет · новичок, подпись «Проверить уровень»', willCoverLabel(f)), col('как будет · не новичок: прогресс + кнопка', willCoverProgress(f))] },
  session: { title: 'Закрытая карта занятия — тап', note: 'Замок трясётся как сейчас, окна нет. Внизу над таб-баром — плашка «Откроется после занятия 3» с кнопкой «Проверить уровень» (уходит через 4 с или по любому тапу). Если тест использован или урок ≥ 10 — плашка только с текстом (2,2 с, как сейчас). Тапай по карте.',
    phones: (f) => [col('сейчас', now(f, LAYOUT.session)), col('как будет · с кнопкой (4 с / тап)', willLocked(f, 'session', true)), col('как будет · тест использован (только текст)', willLocked(f, 'session', false))] },
  lesson: { title: '«Все уроки» — тап по закрытому уроку', note: 'То же, текст «Откроется после урока 2».',
    phones: (f) => [col('сейчас', now(f, LAYOUT.lesson)), col('как будет', willLocked(f, 'lesson', true))] },
};
const render = () => {
  const root = document.getElementById('root');
  if (!FRAMES.length) { root.innerHTML = '<section class="block"><h2>Кадров ещё нет</h2><p>Сверка кладёт PNG в assets/real/placement_entry/ — пересобрать: node placement-entry.make.cjs</p></section>'; return; }
  const groups = {};
  FRAMES.forEach((f) => { (groups[kindOf(f)] = groups[kindOf(f)] || []).push(f); });
  root.innerHTML = ['cover', 'session', 'lesson'].filter((k) => groups[k]).map((k) => { const S = SECTIONS[k]; return `<section class="block" id="pe-${k}"><h2>${S.title}</h2><p class="pe-note">${S.note}</p>${groups[k].map((f) => `<div class="phones" style="margin-bottom:28px">${S.phones(f).join('')}</div>`).join('')}</section>`; }).join('');
  console.log(LOG, 'render', JSON.stringify({ frames: FRAMES.length, groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])) })); // guard-ok: одна строка на перерисовку
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
    const card = ph.querySelector('.pe-card'); const plate = ph.querySelector('[data-plate]');
    if (card) once(card, 'shake');
    if (plate) { plate.classList.add('on'); clearTimeout(timers.get(plate)); timers.set(plate, after(plate.querySelector('.btn') ? 4000 : 2200, () => plate.classList.remove('on'))); }
    return;
  }
  if (act === 'check') { console.log(LOG, 'open placement test'); return; }
});
render();
window.__pe = { FRAMES, LAYOUT, render };
})();
