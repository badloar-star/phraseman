/* comp-kit.js — общий набор макетов соревновательной ветки на РЕАЛЬНЫХ кадрах (каркас real-frame.js): телефон на кадре, вставка ломтём
   на чистой полоске кадра, блок поверх кадра с фоном из растянутой чистой полосы того же кадра, панели/строки/кнопки в стиле «Друзей»,
   шторка, тост, переключатель состояний страницы, таблица стоимости Firebase. Страницы: peak-friends-room, week-goal-together,
   invite-ladder — у каждой свой app.js с содержимым и своим обработчиком действий (CK.mount({ sections, onAct })).
   зачем (координатор 29.10, слово владельца): три макета на настоящих кадрах, интерактивные, под каждым стоимость Firebase; общий
   набор — чтобы детали были одинаковыми во всех трёх и не повторять код. Журнал — префикс [CK]. */
window.CK = (() => {
  const LOG = '[CK]'; const RF = window.RF; const THEMES = window.__THEMES || {}; const T = (THEMES.graphite || {}).dark || {};
  const FRAMES = new Set(window.__FRAMES || []); const DIR = 'assets/real/';
  const have = (f) => FRAMES.has(f);
  /* коды значков — glyphmaps/Ionicons.json приложения (@expo/vector-icons), тот же шрифт assets/Ionicons.ttf */
  const CODE = Object.assign({ people: 'f49f', 'people-outline': 'f4a3', 'person-add-outline': 'f4a7', 'person-circle-outline': 'f4aa', 'chevron-forward': 'f23b', 'chevron-back': 'f229', 'chevron-down': 'f232', checkmark: 'f21d', 'checkmark-circle': 'f21e', 'checkmark-done': 'f221', play: 'f4c6', 'share-outline': 'f572', gift: 'f337', 'gift-outline': 'f338', flag: 'f310', 'flag-outline': 'f311', 'link-outline': 'f3b9', 'rocket-outline': 'f548', medal: 'f445', 'medal-outline': 'f446', trophy: 'f601', 'trophy-outline': 'f602', 'paper-plane-outline': 'f48e', 'time-outline': 'f5de', 'today-outline': 'f5e4', 'calendar-outline': 'f1d6', 'alarm-outline': 'f10d', 'hourglass-outline': 'f386', close: 'f24a', flame: 'f313', 'flame-outline': 'f314', 'copy-outline': 'f290', sparkles: 'f58c', star: 'f595', 'star-outline': 'f599', diamond: 'f2a1', 'diamond-outline': 'f2a2', 'lock-closed': 'f3c7', 'lock-open-outline': 'f3cb', 'notifications-outline': 'f47f', podium: 'f4e4', 'podium-outline': 'f4e5', ribbon: 'f544', 'ribbon-outline': 'f545', 'hand-right': 'f35e', 'happy-outline': 'f362', 'footsteps-outline': 'f32f', 'flash-outline': 'f31a', 'information-circle-outline': 'f399', 'trending-up': 'f5fb', 'stats-chart-outline': 'f59c', 'heart-outline': 'f377', 'thumbs-up-outline': 'f5d5', 'arrow-forward': 'f133', refresh: 'f514', 'school-outline': 'f55d', 'layers-outline': 'f3b0' }, window.__ICODE || {});
  const io = (n, st = '') => { const c = CODE[n]; if (!c) throw new Error(`${LOG} нет значка ${n}`); return `<i class="io" aria-hidden="true"${st ? ` style="${st}"` : ''}>&#x${c};</i>`; };
  const coin = (r) => `assets/coin_rank_${String(r).padStart(2, '0')}.webp`;
  const ci = (r, s) => `<img class="ck-coin" src="${coin(r)}" alt="" style="width:${s}px;height:${s}px">`;
  const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const after = (ms, f) => setTimeout(f, RM() ? 0 : ms);
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const once = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); node.addEventListener('animationend', () => node.classList.remove(cls), { once: true }); };
  const VARS = `--card:${T.opaqueCard};--ctl:${T.opaqueControl};--tx:${T.text};--sec:${T.secondary};--acc:${T.accentText};--solid:${T.cta};--on-solid:${T.ctaInk};--bg:${T.bg}`;
  const STATUS = 100; const TAB = 2140;
  /* телефон на кадре (cls — класс телефона для стилей страницы) */
  const phone = (file, o = {}) => RF.phone(Object.assign({ src: DIR + file, exists: have(file), cls: 'ck-ph', status: STATUS, tab: TAB }, o)).replace('<div class="ph rf', `<div style="${VARS}" class="ph rf`).replace('кадр не снят', 'кадр снимается');
  /* вставка ломтём: фон блока — растянутая ЧИСТАЯ полоска кадра (4 px над местом вставки), всё ниже сдвигается как при настоящей вставке */
  const insOn = (file, y, h, html, strip = y - 6) => { const sliceH = Math.max(1, RF.px(4)); return { y, html: `<div class="ck-ins" style="position:relative;height:${RF.px(h)}px;overflow:hidden"><div style="transform:scaleY(${(RF.px(h) / sliceH).toFixed(2)});transform-origin:top">${RF.slice(DIR + file, strip, strip + 4)}</div><div class="ck-ins-over">${html}</div></div>` }; };
  /* блок поверх кадра (сцена не режется): x, w — px телефона; y, h — px кадра; фон — вертикальная чистая полоса кадра x = stripX (16 px),
     растянутая по ширине блока: тон неба на каждой строке тот же, что рядом на кадре; полоса — у ЛЕВОГО края (свет сцены слева, правый край темнее) */
  const overOn = (file, x, y, w, h, html, stripX = 2) => { const sw = Math.max(1, RF.px(16)); const sx = w / sw; return `<div class="ck-over ck-fade" style="left:${x}px;top:${RF.px(y)}px;width:${w}px;height:${RF.px(h)}px"><div class="bg" style="background-image:url(${DIR + file});background-size:${Math.round(RF.W * sx)}px ${RF.H}px;background-position:${-Math.round(RF.px(stripX) * sx)}px ${-RF.px(y)}px"></div><div class="in">${html}</div></div>`; };
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  /* детали */
  const panel = (title, right, inner, cls = '') => `<div class="ck-panel${cls ? ' ' + cls : ''}">${title ? `<div class="hd"><b>${title}</b><span>${right || ''}</span></div>` : ''}${inner}</div>`;
  const row = (ic, title, sub, right, act = '', cls = '') => `<div class="ck-row t${cls ? ' ' + cls : ''}"${act ? ` data-act="${act}"` : ''}>${ic}<span class="tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right ? `<span class="rt${/^\+/.test(right) ? ' up' : ''}">${right}</span>` : ''}</div>`;
  const btn = (label, cls = 'solid', act = '', ic = '') => `<span class="ck-btn ${cls} t"${act ? ` data-act="${act}"` : ''}>${ic ? io(ic) : ''}${label}</span>`;
  const sheet = (title, inner) => `<div class="ck-sheet"><div class="grab"></div><div class="hd"><b>${title}</b><span class="x t" data-act="close">${io('close')}</span></div>${inner}</div>`;
  const bar = (pct, cls = '') => `<div class="ck-bar live${cls ? ' ' + cls : ''}" style="--w:${pct}%"><i></i></div>`;
  const cost = (rows) => `<div class="ck-cost">${rows.map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('')}</div>`;
  const chips = (id, items, on) => `<div class="ck-chips" data-chips="${id}">${items.map(([k, n]) => `<span class="ck-chip${k === on ? ' on' : ''}" data-chip="${k}">${n}</span>`).join('')}</div>`;
  /* шторки и тосты — мгновенный отклик, сеть догоняет (Optimistic UI) */
  let SHEETS = {};
  const openSheet = (ph, key) => { const old = ph.querySelector('.ck-ov'); if (old) old.remove(); const mk = SHEETS[key]; if (!mk) { console.log(LOG, 'нет шторки', key); return; } const ov = el(`<div class="ck-ov"><div class="ck-scrim" data-act="close"></div>${mk(ph)}</div>`); ph.appendChild(ov); requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('on'))); };
  const closeSheet = (ph) => { const ov = ph.querySelector('.ck-ov'); if (!ov || ov.classList.contains('off')) return; ov.classList.remove('on'); ov.classList.add('off'); after(340, () => ov.remove()); };
  const toast = (ph, text, icon = 'checkmark-circle') => { const t = el(`<div class="ck-toast"><span class="tile">${io(icon)}</span>${text}</div>`); ph.appendChild(t); after(2200, () => { t.classList.add('off'); after(300, () => t.remove()); }); };
  /* страница: разделы с состояниями; chips переключают состояние раздела и перерисовывают только его */
  const state = {}; let SECTIONS = []; let onAct = () => false; let onChip = () => false;
  const section = (s) => { const st = state[s.id] || (state[s.id] = s.states ? s.states[0][0] : null); return `<section class="block" id="${s.id}"><h2>${s.title}</h2><p>${s.lead}</p>${s.costs ? cost(s.costs) : ''}${s.extra ? s.extra() : ''}${s.states ? chips(s.id, s.states, st) : ''}<div class="phones">${s.body(st).join('')}</div></section>`; };
  const renderSection = (id) => { const s = SECTIONS.find((x) => x.id === id); const node = document.getElementById(id); if (!s || !node) return; node.outerHTML = section(s); const n = document.getElementById(id); n.querySelectorAll('.ph[data-open]').forEach((ph) => after(650, () => openSheet(ph, ph.dataset.open))); };
  const act = (ph, node) => {
    const [name, arg] = node.dataset.act.split(':');
    console.log(LOG, 'act', name, arg || ''); // guard-ok: одна строка на тап
    if (onAct(name, arg, node, ph)) return;
    if (name === 'open') { openSheet(ph, arg); return; }
    if (name === 'close') { closeSheet(ph); return; }
    if (name === 'copy') { once(node, 'pop'); toast(ph, 'Код скопирован', 'link-outline'); return; }
    if (name === 'share') { closeSheet(ph); after(380, () => toast(ph, 'Приглашение отправлено', 'paper-plane-outline')); return; }
    if (name === 'toast') { closeSheet(ph); after(ph.querySelector('.ck-ov') ? 380 : 0, () => toast(ph, arg, 'checkmark-circle')); return; }
    console.log(LOG, 'действие без обработчика', name);
  };
  document.body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-chip]'); if (c) { const id = c.closest('[data-chips]').dataset.chips; state[id] = c.dataset.chip; c.parentElement.querySelectorAll('[data-chip]').forEach((x) => x.classList.toggle('on', x === c)); if (!SECTIONS.find((x) => x.id === id)) { onChip(id, c.dataset.chip); return; } renderSection(id); return; }
    const a = e.target.closest('[data-act]'); const ph = a && a.closest('.ph'); if (a && ph) act(ph, a);
  });
  const mount = (o) => {
    SECTIONS = o.sections; SHEETS = o.sheets || {}; onAct = o.onAct || (() => false); onChip = o.onChip || (() => false);
    const root = document.getElementById('root'); root.innerHTML = SECTIONS.map(section).join('');
    document.querySelectorAll('.ph[data-open]').forEach((ph) => after(700, () => openSheet(ph, ph.dataset.open)));
    console.log(LOG, 'mount', JSON.stringify({ sections: SECTIONS.map((s) => s.id), phones: document.querySelectorAll('.ph').length, missing: document.querySelectorAll('.ph.rf-missing').length })); // guard-ok: одна строка на отрисовку
  };
  return { RF, T, DIR, have, io, ci, coin, RM, after, el, once, phone, insOn, overOn, col, panel, row, btn, sheet, bar, cost, chips, openSheet, closeSheet, toast, mount, state, renderSection, setState: (id, v) => { state[id] = v; renderSection(id); } };
})();
