document.head.insertAdjacentHTML('beforeend', '<style>.srch{display:flex;align-items:center;gap:10px;height:46px;border-radius:23px;background:rgba(255,255,255,.07);border:1px solid var(--line);padding:0 16px;color:var(--muted);font-size:16px;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}</style>');
/* Карточки — масштаб как в галерее: хаб (5 красивых вариантов), телефон с галереей и подключение событий.
   зачем (владелец 04.10): «красивые дизайны хаба», «карточки с градиентом, стеклом, прозрачностью», «щипком менять масштаб, ползунок, всё анимировано».
   Опирается на константы и функции из inline-скрипта страницы (THEMES, WORDS, apply, setScale, comm, commRow, lvl, cnt, head2, arrow и т. д.). */

// ---------- Хаб: 5 красивых вариантов ----------
// ---------- «Из видео»: строка в утверждённом формате (превью 16:9, без имени канала, число фраз, кнопка «Добавить») ----------
document.head.insertAdjacentHTML('beforeend', `<style>
  .vrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 12px; margin-top: 10px; min-height: 87px; }
  .vth { position: relative; width: 112px; height: 63px; border-radius: 12px; flex: none; overflow: hidden; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--g1) 55%, #0c0c10), color-mix(in srgb, var(--g2) 40%, #0a0a0d)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
  .vth .pl { width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; }
  .vth .du { position: absolute; right: 5px; bottom: 5px; font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 5px; background: rgba(0,0,0,.6); }
  .vadd { height: 34px; padding: 0 14px; border-radius: 17px; background: var(--acc); color: var(--on); font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; flex: none; }
</style>`);
const videoRow = (ti, n, du, added) => `<div class="gl vrow t sm" style="--t:var(--g1)"><div class="vth"><span class="pl">${icon('play', 's16')}</span><span class="du">${du}</span></div><div class="grow" style="min-width:0"><div style="font-size:15px;line-height:19px;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${ti}</div><div style="font-size:14px;color:var(--sec);margin-top:4px">${n} фраз</div></div>${added ? `<span class="cntp">${icon('check', 's16')}</span>` : '<span class="vadd">Добавить</span>'}</div>`;
const VIDEOS = [['Самый лёгкий способ понять немецкий', 296, '24:18'], ['Немецкие фразы, которые помогут заговорить', 100, '18:42']];
const videoSec = (k = 2) => `<div class="sec" style="margin-top:24px"><div class="ti">Из видео</div><div class="ac">Все ${icon('fwd', 's16')}</div></div>${VIDEOS.slice(0, k).map((v) => videoRow(...v)).join('')}`;

const fan = `<div style="position:absolute;right:14px;top:20px;width:128px;height:150px">
  <div class="mc solid float" style="--t:var(--g1);--rr:-10deg;position:absolute;right:0;top:-4px;width:100px;height:54px;transform:rotate(-10deg);font-size:15px"><span>Gate</span></div>
  <div class="mc solid float" style="--t:var(--g1);--rr:4deg;position:absolute;right:14px;top:34px;width:104px;height:54px;transform:rotate(4deg);font-size:16px;animation-delay:.4s"><span>Visa</span></div>
  <div class="mc solid float" style="--t:var(--g1);--rr:-5deg;position:absolute;right:0;top:72px;width:100px;height:54px;transform:rotate(-5deg);font-size:15px;animation-delay:.8s"><span>Land</span></div></div>`;

const hubA = () => phone(`${head2()}<div class="rise">
  <div class="gl pad" style="margin-top:24px;min-height:196px">${fan}<div class="ov2">Тренировка</div><div style="font-size:64px;line-height:68px;font-weight:800;letter-spacing:-1.4px;margin-top:10px">133</div><div style="font-size:16px;color:var(--sec);margin-top:2px">карточки · 3 набора</div><div class="ac-cta t" style="margin-top:20px">Тренироваться${arrow}</div></div>
  <div class="flex" style="gap:12px;margin-top:14px;align-items:stretch">${[['bookmark', 'Сохранённые', 64, 0], ['layers', 'Мои наборы', 4, 1]].map(([ic, t, n, i]) => `<div class="gl pad t grow" style="padding:16px"><div class="gtile" style="--t:var(--g1)">${icon(ic, 's24')}</div><div style="font-size:18px;font-weight:700;margin-top:14px">${t}</div><div style="font-size:15px;color:var(--sec);margin-top:2px">${n}</div></div>`).join('')}</div>
  <div class="sec" style="margin-top:26px"><div class="ti">Лучшее у сообщества</div><div class="ac">Все ${icon('fwd', 's16')}</div></div>
  <div>${comm.slice(0, 1).map((p) => commRow(...p)).join('')}</div>${videoSec(1)}</div>`);

const deckBig = (t, a, n, l, i) => `<div class="deckc gl t" style="--t:var(--g1);background:linear-gradient(160deg,color-mix(in srgb,var(--t) 44%,rgba(18,18,24,.7)),rgba(10,10,14,.7))">
  <div class="gtile" style="width:72px;height:72px;border-radius:22px;font-size:34px">${t[0]}</div><div style="margin-top:auto"><div class="flex" style="gap:8px">${lvl(l)}${cnt(n)}</div><div style="font-size:26px;line-height:31px;font-weight:800;letter-spacing:-.4px;margin-top:12px">${t}</div><div style="font-size:16px;color:var(--sec);margin-top:4px">${a}</div></div></div>`;

const hubB = () => phone(`${head2()}<div class="rise">
  <div class="sec" style="margin-top:24px"><div class="ti">Лучшее у сообщества</div><div class="ac">Все ${icon('fwd', 's16')}</div></div>
  <div class="hs">${comm.map((p) => deckBig(...p)).join('')}</div>
  <div class="gl t" style="border-radius:30px;display:flex;align-items:center;gap:14px;padding:12px 12px 12px 22px"><div class="grow"><div style="font-size:19px;font-weight:700">Тренировка</div><div style="font-size:15px;color:var(--sec);margin-top:2px">133 карточки · 3 набора</div></div><span class="ac-round t">${icon('play', 's24')}</span></div>
  <div style="margin-top:12px">${[['bookmark', 'Сохранённые', 64], ['layers', 'Мои наборы', 4]].map(([ic, t, n]) => `<div class="gl sm t" style="padding:14px 18px;display:flex;align-items:center;gap:14px;margin-top:10px">${icon(ic, 's20')}<span style="font-weight:700;font-size:17px">${t}</span><span class="cntp" style="margin-left:auto">${n}</span>${ch2}</div>`).join('')}</div>${videoSec(1)}</div>`);

const mini = (w, i) => `<div class="mc t" style="--t:var(--g1);height:96px;font-size:15px"><span>${w}</span></div>`;
const hubC = () => phone(`${head2()}<div class="rise">
  <div class="sec" style="margin-top:24px"><div class="ti">Ваши карточки<span class="n">64</span></div><div class="ac">Все ${icon('fwd', 's16')}</div></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${['Boarding pass', 'Layover', 'Check in', 'Carry-on', 'Gate', 'Delay'].map((w, i) => mini(w, i)).join('')}</div>
  <div class="sec" style="margin-top:28px"><div class="ti">Наборы</div></div>
  <div>${commRow('Travel', 'Только вы', 24, '', 0)}${commRow('B2 глаголы', 'Ирина', 49, 'B2', 1)}</div>${videoSec(1)}</div>`,
  { fixed: `<div style="position:absolute;left:0;right:0;bottom:0;z-index:20;padding:20px 20px 34px;background:linear-gradient(rgba(12,12,13,0),rgba(12,12,13,.92) 40%)"><div class="ac-cta t">Тренироваться · 133${arrow}</div></div>` });

const hubD = () => phone(`${head2()}<div class="rise">
  <div style="position:relative;height:270px;margin-top:30px">
    <div class="mc solid" style="--t:var(--g1);position:absolute;left:38px;right:38px;top:0;height:120px;opacity:.7;border-radius:28px"></div>
    <div class="mc solid" style="--t:var(--g1);position:absolute;left:19px;right:19px;top:20px;height:140px;opacity:.9;border-radius:28px"></div>
    <div class="mc solid t float" style="--t:var(--g1);--rr:0deg;position:absolute;left:0;right:0;top:46px;height:210px;border-radius:30px;flex-direction:column"><span style="font-size:36px;font-weight:700">Boarding pass</span><span style="font-size:16px;font-style:italic;color:rgba(255,255,255,.65);margin-top:8px;font-weight:400">/ˈbɔːdɪŋ pɑːs/</span></div></div>
  <div class="ac-cta t" style="margin-top:10px">Тренироваться · 133${arrow}</div>
  <div class="flex" style="justify-content:space-between;margin-top:26px">${[['bookmark', 'Сохранённые', 64], ['layers', 'Мои наборы', 4], ['people', 'Сообщество', '1 240'], ['play', 'Из видео', 3]].map(([ic, t, n]) => `<div class="t" style="text-align:center"><div class="gl" style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto">${icon(ic, 's24')}</div><div style="font-size:14px;font-weight:600;margin-top:10px">${t}</div><div style="font-size:13px;color:var(--sec)">${n}</div></div>`).join('')}</div></div>`);

const hubE = () => phone(`${head2()}<div class="rise">
  <div class="gl pad" style="margin-top:22px;display:flex;align-items:center;gap:14px"><div class="grow"><div class="ov2">Тренировка</div><div style="font-size:20px;font-weight:700;margin-top:6px">133 карточки · 3 набора</div></div><div class="ac-cta sm t">Начать</div></div>
  <div class="gl seg2" id="seg" style="margin-top:16px"><span class="on" data-tab="0">Сохранённые</span><span data-tab="1">Наборы</span><span data-tab="2">Сообщество</span><span data-tab="3">Из видео</span></div>
  <div style="margin-top:12px" id="tabs">
    <div class="tabp on">${[['Boarding pass', 'Посадочный талон'], ['Layover', 'Пересадка'], ['Check in', 'Регистрация'], ['Carry-on', 'Ручная кладь']].map(([e, r], i) => `<div class="gl gpk t sm" style="--t:var(--g1)"><div class="gtile">${e[0]}</div><div class="grow"><div style="font-size:17px;font-weight:700">${e}</div><div style="font-size:15px;color:var(--sec);margin-top:2px">${r}</div></div>${icon('vol', 's18')}</div>`).join('')}</div>
    <div class="tabp">${commRow('Travel', 'Только вы', 24, '', 0)}${commRow('Phrasal verbs', 'В сообществе', 18, '', 1)}${commRow('B2 глаголы', 'Ирина', 49, 'B2', 2)}</div>
    <div class="tabp">${comm.map((p) => commRow(...p)).join('')}</div>
    <div class="tabp"><div style="font-size:15px;color:var(--sec);margin:4px 4px 0">3 набора · 596 фраз</div>${VIDEOS.map((v) => videoRow(...v)).join('')}${videoRow('200 фраз на немецком всего из 100 немецких слов', 200, '31:05', true)}</div></div></div>`);

// ---------- телефон с галереей ----------
const galleryPhone = () => phone(`${topRow(`${lim2}<span class="rb t">${icon('plus', 's20')}</span>`)}${title('Travel', '20 карточек')}
  <div class="srch" style="margin-top:20px">${icon('search', 's18')}Слово или перевод</div><div id="g"></div>`);

document.getElementById('root').innerHTML =
  block('gal', 'Карточки — масштаб как в галерее', 'Ползунок вверху страницы. Щипок двумя пальцами или Ctrl + колесо над экраном делают то же самое. Нажатие — переворот на перевод.', [col('Сохранённые: карточки меняют размер и форму', galleryPhone())]) +
  block('hub', 'Хаб «Карточки» — выберите 1 из 5', 'Тот же состав: тренировка, «Сохранённые», «Мои наборы», сообщество, лимит 2/3. Всё анимировано; цвета меняются темой вверху.',
    [col('Вариант 1 · «Аврора»: колода и веер карточек', hubA()), col('Вариант 2 · «Витрина колод»: большие наборы лентой', hubB()), col('Вариант 3 · «Мини-галерея» карточек', hubC()),
     col('Вариант 4 · «Стопка»: верхняя карточка крупно', hubD()), col('Вариант 5 · «Вкладки-стекло»', hubE())]);

// ---------- подключение ----------
const g = document.getElementById('g');
g.innerHTML = WORDS.map((w, i) => cardHtml(i, w)).join('');
K.init();
document.getElementById('chips').innerHTML = THEMES.map((T, i) => `<span class="chip${i === theme ? ' on' : ''}" data-i="${i}"><i class="sw" style="background:linear-gradient(135deg,${T[1]},${T[2]})"></i>${T[0]}</span>`).join('');
document.getElementById('chips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; theme = +c.dataset.i; applyTheme(); });
document.getElementById('k').addEventListener('input', (e) => setScale(+e.target.value / 100));

g.addEventListener('pointerdown', (e) => { const c = e.target.closest('.gc'); if (c) c.classList.add('press'); });
['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => g.addEventListener(n, () => g.querySelectorAll('.gc.press').forEach((c) => c.classList.remove('press')), true));
g.addEventListener('click', (e) => { const c = e.target.closest('.gc'); if (c) c.classList.toggle('flipped'); });

// щипок двумя пальцами и Ctrl + колесо
const scr = g.closest('.scr');
scr.style.touchAction = 'pan-y';
const ptrs = new Map();
let pinch = null;
scr.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, e); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), s0: s }; } });
scr.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, e);
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); setScale(pinch.s0 - (d / pinch.d0 - 1) * 0.8); }
});
['pointerup', 'pointercancel'].forEach((n) => scr.addEventListener(n, (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; }));
scr.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); setScale(s + e.deltaY * 0.004); }, { passive: false });

document.getElementById('b-intro').addEventListener('click', intro);
document.getElementById('b-flip').addEventListener('click', () => { const cs = [...g.querySelectorAll('.gc')]; const on = !cs.every((c) => c.classList.contains('flipped')); cs.forEach((c, i) => setTimeout(() => c.classList.toggle('flipped', on), i * 30)); });
let auto = 0;
document.getElementById('b-auto').addEventListener('click', () => {
  cancelAnimationFrame(auto);
  const t0 = performance.now();
  const step = (now) => { const p = (now - t0) / 9000; if (p >= 1) { setScale(0, false); return; } setScale(0.5 - 0.5 * Math.cos(p * Math.PI * 2), true); auto = requestAnimationFrame(step); };
  auto = requestAnimationFrame(step);
});
document.getElementById('seg').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]'); if (!t) return;
  const seg = t.parentElement; seg.querySelectorAll('span').forEach((x) => x.classList.toggle('on', x === t));
  seg.nextElementSibling.querySelectorAll('.tabp').forEach((p, i) => p.classList.toggle('on', i === +t.dataset.tab));
});
applyTheme();
apply(false);
intro();
