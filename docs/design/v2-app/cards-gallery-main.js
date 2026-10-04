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

// зачем (владелец 04.10): «хаб обязан быть БЕЗ СКРОЛЛА»; «Из видео — равнозначно кнопкам «Сохранённые» и «Мои наборы», это просто ещё один раздел».
// Поэтому: тренировка + четыре РАВНЫХ раздела (Сохранённые, Мои наборы, Из видео, Сообщество), никаких списков и лент под ними — всё помещается в один экран.
const SECTIONS = [['bookmark', 'Сохранённые', '64'], ['layers', 'Мои наборы', '4'], ['play', 'Из видео', '3 набора'], ['globe', 'Сообщество', '1 240']];
const secIcon = (n, cls = 's26') => (n === 'globe' ? lic('globe', cls) : icon(n, cls));
const fan = `<div style="position:absolute;right:14px;top:20px;width:128px;height:130px">
  <div class="mc float" style="--t:var(--g1);position:absolute;right:0;top:-4px;width:100px;height:46px;transform:rotate(-10deg);font-size:15px"><span>Gate</span></div>
  <div class="mc float" style="--t:var(--g1);position:absolute;right:14px;top:30px;width:104px;height:46px;transform:rotate(4deg);font-size:16px;animation-delay:.4s"><span>Visa</span></div>
  <div class="mc float" style="--t:var(--g1);position:absolute;right:0;top:64px;width:100px;height:46px;transform:rotate(-5deg);font-size:15px;animation-delay:.8s"><span>Land</span></div></div>`;

// 1. «Аврора»: большая панель тренировки и четыре равные плитки 2×2
const hubA = () => phone(`${head2()}<div class="rise">
  <div style="position:relative;height:250px;margin-top:26px">
    <div class="mc solid" style="--t:var(--g1);position:absolute;left:38px;right:38px;top:0;height:110px;opacity:.7;border-radius:28px"></div>
    <div class="mc solid" style="--t:var(--g1);position:absolute;left:19px;right:19px;top:18px;height:130px;opacity:.9;border-radius:28px"></div>
    <div class="mc solid t float" style="--t:var(--g1);position:absolute;left:0;right:0;top:40px;height:200px;border-radius:30px;flex-direction:column"><span style="font-size:36px;font-weight:700">Boarding pass</span><span style="font-size:16px;font-style:italic;color:rgba(255,255,255,.65);margin-top:8px;font-weight:400">/ˈbɔːdɪŋ pɑːs/</span></div></div>
  <div class="ac-cta t" style="margin-top:14px">Тренироваться · 133${arrow}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px">${SECTIONS.map(([ic, t, n]) => `<div class="gl pad t" style="padding:18px 16px;min-height:150px;display:flex;flex-direction:column;justify-content:space-between"><div class="gtile" style="--t:var(--g1)">${secIcon(ic, 's24')}</div><div><div style="font-size:19px;font-weight:700">${t}</div><div style="font-size:15px;color:var(--sec);margin-top:2px">${n}</div></div></div>`).join('')}</div></div>`);

// 2. «Лента»: панель-число сверху, четыре широкие равные строки
const wide = (ic, t, n) => `<div class="gl t" style="display:flex;align-items:center;gap:16px;padding:14px 18px 14px 14px;margin-top:12px;min-height:92px;border-radius:24px"><div class="gtile" style="width:60px;height:60px;border-radius:18px;--t:var(--g1)">${secIcon(ic, 's26')}</div><div class="grow"><div style="font-size:20px;font-weight:700">${t}</div><div style="font-size:15px;color:var(--sec);margin-top:2px">${n}</div></div>${ch2}</div>`;
const hubB = () => phone(`${head2()}<div class="rise">
  <div class="gl t" style="margin-top:24px;display:flex;align-items:center;gap:16px;padding:20px 16px 20px 22px;border-radius:30px"><div class="grow"><div class="ov2">Тренировка</div><div style="font-size:56px;line-height:60px;font-weight:800;letter-spacing:-1.2px;margin-top:8px">133</div><div style="font-size:15px;color:var(--sec);margin-top:2px">карточки · 3 набора</div></div><span class="ac-round t" style="width:84px;height:84px">${icon('play', 's28')}</span></div>
  ${SECTIONS.map(([ic, t, n]) => wide(ic, t, n)).join('')}</div>`);

// 3. «Мини-колоды»: каждый раздел — своя стопка из трёх карточек (один цвет темы), тренировка — закреплённая кнопка
const stack3 = (words) => `<div style="position:relative;height:70px;margin:0 6px">${words.map((w, i) => `<div class="mc" style="--t:var(--g1);position:absolute;left:${i * 10}px;right:${(2 - i) * 10}px;top:${(2 - i) * 9}px;height:46px;font-size:${14 - (2 - i)}px;opacity:${i === 2 ? 1 : 0.6 + i * 0.15};border-radius:14px"><span>${i === 2 ? w : ''}</span></div>`).join('')}</div>`;
const SWORDS = [['', '', 'Boarding pass'], ['', '', 'Layover'], ['', '', 'Хаб'], ['', '', 'Сообщество']];
const hubC = () => phone(`${head2()}<div class="rise">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:26px">${SECTIONS.map(([ic, t, n], i) => `<div class="gl pad t" style="padding:18px 14px 16px;min-height:236px;display:flex;flex-direction:column;justify-content:space-between"><div style="display:flex;justify-content:flex-end;opacity:.9">${secIcon(ic, 's20')}</div>${stack3(['', '', ['Boarding pass', 'Layover', 'Video', 'Community'][i]])}<div><div style="font-size:19px;font-weight:700">${t}</div><div style="font-size:15px;color:var(--sec);margin-top:2px">${n}</div></div></div>`).join('')}</div></div>`,
  { fixed: `<div style="position:absolute;left:0;right:0;bottom:0;z-index:20;padding:20px 20px 34px;background:linear-gradient(rgba(12,12,13,0),rgba(12,12,13,.92) 40%)"><div class="ac-cta t">Тренироваться · 133${arrow}</div></div>` });

// 4. «Стопка»: верхняя карточка крупно, кнопка и четыре равных круглых раздела
const hubD = () => phone(`${head2()}<div class="rise">
  <div style="position:relative;height:250px;margin-top:26px">
    <div class="mc solid" style="--t:var(--g1);position:absolute;left:38px;right:38px;top:0;height:110px;opacity:.7;border-radius:28px"></div>
    <div class="mc solid" style="--t:var(--g1);position:absolute;left:19px;right:19px;top:18px;height:130px;opacity:.9;border-radius:28px"></div>
    <div class="mc solid t float" style="--t:var(--g1);position:absolute;left:0;right:0;top:40px;height:200px;border-radius:30px;flex-direction:column"><span style="font-size:36px;font-weight:700">Boarding pass</span><span style="font-size:16px;font-style:italic;color:rgba(255,255,255,.65);margin-top:8px;font-weight:400">/ˈbɔːdɪŋ pɑːs/</span></div></div>
  <div class="ac-cta t" style="margin-top:14px">Тренироваться · 133${arrow}</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:34px">${SECTIONS.map(([ic, t, n]) => `<div class="t" style="text-align:center"><div class="gl" style="width:66px;height:66px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto">${secIcon(ic, 's24')}</div><div style="font-size:13px;font-weight:600;margin-top:10px;line-height:17px">${t}</div><div style="font-size:13px;color:var(--sec);margin-top:2px">${n.replace(' набора', '')}</div></div>`).join('')}</div></div>`);

// 5. «Диск»: круглая кнопка тренировки с кольцом и четыре равные плитки 2×2
const hubE = () => phone(`${head2()}<div class="rise">
  <div style="position:relative;width:224px;height:224px;margin:26px auto 0">
    <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--acc) 0 62%, rgba(255,255,255,.1) 62% 100%);-webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px));mask:radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))"></div>
    <div class="gl t" style="position:absolute;inset:18px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="ov2">Тренировка</div><div style="font-size:60px;line-height:64px;font-weight:800;letter-spacing:-1.2px;margin-top:6px">133</div><div style="font-size:14px;color:var(--sec)">карточки</div></div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px">${SECTIONS.map(([ic, t, n]) => `<div class="gl t" style="padding:14px 14px;display:flex;align-items:center;gap:12px;min-height:84px;border-radius:22px"><div class="gtile" style="width:46px;height:46px;border-radius:14px;--t:var(--g1)">${secIcon(ic, 's22')}</div><div style="min-width:0"><div style="font-size:16px;font-weight:700;line-height:20px">${t}</div><div style="font-size:14px;color:var(--sec);margin-top:2px">${n}</div></div></div>`).join('')}</div></div>`);

// ---------- телефон с галереей ----------
const galleryPhone = () => phone(`${topRow(`${lim2}<span class="rb t">${icon('plus', 's20')}</span>`)}${title('Travel', '20 карточек')}
  <div class="srch" style="margin-top:20px">${icon('search', 's18')}Слово или перевод</div><div id="g"></div>`);

document.getElementById('root').innerHTML =
  block('gal', 'Карточки — масштаб как в галерее', 'Ползунок вверху страницы. Щипок двумя пальцами или Ctrl + колесо над экраном делают то же самое. Нажатие — переворот на перевод.', [col('Сохранённые: карточки меняют размер и форму', galleryPhone())]) +
  block('hub', 'Хаб «Карточки» — вариант А (выбран)', 'Без прокрутки. Тренировка и четыре РАВНЫХ раздела: Сохранённые, Мои наборы, Из видео, Сообщество (лимит 2/3 в шапке). Всё анимировано; цвета меняются темой вверху.',
    [col('Хаб «Карточки» — вариант А (выбран владельцем): стопка карточек, кнопка и четыре равных раздела', hubA())]);

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
applyTheme();
apply(false);
intro();
