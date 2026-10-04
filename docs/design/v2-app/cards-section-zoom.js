/* Подключение ползунка масштаба (код движка скопирован дословно из cards-gallery.html, блок LOCKED:cards-engine) */
(() => {
const { icon } = K;
const li = (n) => ({ cards: '<rect x="4" y="7.5" width="12" height="13" rx="2.5"/><path d="M8 4.5h9.5A2.5 2.5 0 0120 7v10"/>' }[n]);
const THEMES = [
  ['Аврора', '#38E0AA', '#7C5CFF', '#7EF0C8', '#04261D'],
  ['Ирис', '#788CFF', '#FF78C8', '#C7C9FF', '#1B1C4A'],
  ['Магма', '#FF5A28', '#FFAA3C', '#FFB27A', '#3A1204'],
  ['Полночь', '#286EFF', '#00D2FF', '#8CC4FF', '#06224D'],
  ['Нефрит', '#14BEA0', '#1E78C8', '#7FE6D2', '#032A24'],
  ['Орхидея', '#D246FF', '#FF3C8C', '#EAA6FF', '#3A0A4A'],
];
let theme = 0;
const WORDS = [
  ['Boarding pass', '/ˈbɔːdɪŋ pɑːs/', 'Посадочный талон'], ['Layover', '/ˈleɪoʊvər/', 'Пересадка'], ['Check in', '/tʃek ɪn/', 'Регистрация'], ['Carry-on', '/ˈkæri ɒn/', 'Ручная кладь'],
  ['Window seat', '/ˈwɪndoʊ siːt/', 'Место у окна'], ['Gate', '/ɡeɪt/', 'Выход на посадку'], ['Delay', '/dɪˈleɪ/', 'Задержка'], ['Customs', '/ˈkʌstəmz/', 'Таможня'],
  ['Passport', '/ˈpɑːspɔːt/', 'Паспорт'], ['Luggage', '/ˈlʌɡɪdʒ/', 'Багаж'], ['Departure', '/dɪˈpɑːtʃə/', 'Вылет'], ['Arrival', '/əˈraɪvl/', 'Прибытие'],
  ['Take off', '/teɪk ɒf/', 'Взлетать'], ['Land', '/lænd/', 'Приземляться'], ['Aisle seat', '/aɪl siːt/', 'Место у прохода'], ['Round trip', '/raʊnd trɪp/', 'Туда и обратно'],
  ['Visa', '/ˈviːzə/', 'Виза'], ['Currency', '/ˈkʌrənsi/', 'Валюта'], ['Souvenir', '/ˌsuːvəˈnɪə/', 'Сувенир'], ['Itinerary', '/aɪˈtɪnərəri/', 'Маршрут'],
];
// ---------- движок галереи: колонки и форма карточки зависят от ползунка ----------
const W = 390, GAP = 12;
const LV = ['l', 'm', 's', 'xs'];
const RATIO = [0.27, 0.8, 1.0, 1.15];
const FS = [22, 18, 14.5, 12.5];
const FI = [14, 12, 0, 0];
const RAD = [24, 22, 18, 14];
const PAD = [16, 12, 10, 8];
let s = 0;
function layoutFor(v) {
  const band = Math.min(3.999, v * 3.999);
  const idx = Math.floor(band);
  const f = band - idx;
  const cols = idx + 1;
  const w = (W - GAP * (cols - 1)) / cols;
  const h = Math.round(w * RATIO[idx] * (1.05 - 0.1 * f));
  return { cols, idx, w, h, f };
}
function tint() { return THEMES[theme][1]; } // зачем (владелец 04.10): все карточки одного цвета — цвета темы; разноцветность только как градиент ВНУТРИ карточки
function cardHtml(i, [en, ipa, ru]) {
  const dots = [0, 1, 2, 3].map((d) => `<i class="${d < 1 + ((i * 7) % 4) ? 'on' : ''}"></i>`).join('');
  return `<div class="gc enter" data-i="${i}" style="--t:${tint(i)}"><div class="fl">
    <div class="face"><div class="en">${en}</div><div class="ipa">${ipa}</div><span class="spk">${icon('vol', 's16')}</span><span class="dots">${dots}</span></div>
    <div class="face back"><div class="ru">${ru}</div><div class="ipa">${en}</div></div></div></div>`;
}
function apply(live) {
  const g = document.getElementById('g');
  if (!g) return;
  const L = layoutFor(s);
  g.classList.toggle('live', !!live);
  g.dataset.lv = LV[L.idx];
  g.style.setProperty('--fs', FS[L.idx] + 'px');
  g.style.setProperty('--fr', (FS[L.idx] + 2) + 'px');
  g.style.setProperty('--fi', FI[L.idx] + 'px');
  g.style.setProperty('--r', RAD[L.idx] + 'px');
  g.style.setProperty('--pd', PAD[L.idx] + 'px');
  const cards = g.querySelectorAll('.gc');
  cards.forEach((c, i) => {
    const row = Math.floor(i / L.cols); const cc = i % L.cols;
    c.style.width = L.w + 'px'; c.style.height = L.h + 'px';
    c.style.transform = `translate3d(${cc * (L.w + GAP)}px, ${row * (L.h + GAP)}px, 0)`;
  });
  g.style.height = Math.ceil(cards.length / L.cols) * (L.h + GAP) + 'px';
  document.getElementById('kv').textContent = `${L.cols} ${L.cols === 1 ? 'колонка' : L.cols < 5 ? 'колонки' : 'колонок'} · ${Math.round(L.w)}×${L.h}`;
  document.getElementById('k').value = Math.round(s * 100);
}
let liveTimer = 0;
function setScale(v, live = true) {
  s = Math.max(0, Math.min(1, v));
  apply(live);
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => apply(false), 160);
}
function intro() {
  const g = document.getElementById('g');
  g.querySelectorAll('.gc').forEach((c, i) => { c.classList.add('enter'); c.classList.remove('flipped'); setTimeout(() => c.classList.remove('enter'), 60 + i * 38); });
}
function applyTheme() {
  const T = THEMES[theme];
  document.querySelectorAll('.ph').forEach((p) => { p.style.setProperty('--g1', T[1]); p.style.setProperty('--g2', T[2]); p.style.setProperty('--acc', T[3]); p.style.setProperty('--on', T[4]); });
  document.querySelectorAll('.gc').forEach((c) => { c.style.setProperty('--t', tint(+c.dataset.i)); });
  document.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', i === theme));
}

// ---------- подключение ----------
const g = document.getElementById('g');
g.innerHTML = WORDS.map((w, i) => cardHtml(i, w)).join('');
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

document.addEventListener('click', (e) => { const c = e.target.closest('.gc.static'); if (c && !c.hasAttribute('data-open') && !c.closest('#g')) c.classList.toggle('flipped'); });

})();
