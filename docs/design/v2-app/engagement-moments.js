/* PhraseMan 2.0 — «Моменты вовлечения»: помощники галереи (v1, 13.10.2026).
   зачем: один набор примитивов для всех файлов engagement-moments-*.html — телефон 390×844 в двух темах,
   значки, монета ранга, мини-башня лиги, конфетти, «печатающийся» чат, счётчики, кольца дня, кнопка «Повторить».
   Ничего из приложения не трогает — только макеты. */
(() => {
  const P = {
    back: '<path d="M15 5l-7 7 7 7"/>', fwd: '<path d="M9 5l7 7-7 7"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>', up: '<path d="M5 15l7-7 7 7"/>', down: '<path d="M5 9l7 7 7-7"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>', boltF: '<path d="M13.5 2.5L4.5 13.8h6.4L9.8 21.5l9-11.3h-6.4z" fill="currentColor" stroke="none"/>',
    flame: '<path d="M12 21c-3.6 0-6.5-2.6-6.5-6.3 0-3.3 2.3-5 3.3-7.7.6 1.6 1.6 2.6 2.7 3.1C11.4 7 12.8 4.6 15 3c-.2 3 3.5 5.4 3.5 11.2C18.5 18 15.6 21 12 21z"/>',
    flameF: '<path d="M12 21.5c-3.9 0-7-2.8-7-6.8 0-3.6 2.5-5.4 3.6-8.3.7 1.7 1.7 2.8 2.9 3.3C11.3 6.6 12.8 4 15.2 2.3c-.2 3.2 3.8 5.8 3.8 12.1 0 4.1-3.1 7.1-7 7.1z" fill="currentColor" stroke="none"/>',
    heartF: '<path d="M12 20.5s-7.5-4.6-9.6-9C1 8.2 3.2 4.6 6.9 4.6c2.1 0 3.4 1.1 5.1 3 1.7-1.9 3-3 5.1-3 3.7 0 5.9 3.6 4.5 6.9-2.1 4.4-9.6 9-9.6 9z" fill="currentColor" stroke="none"/>',
    heart: '<path d="M12 20s-7-4.4-9-8.6C1.6 8.3 3.6 5 7 5c2 0 3.2 1.1 5 3 1.8-1.9 3-3 5-3 3.4 0 5.4 3.3 4 6.4C19 15.6 12 20 12 20z"/>',
    chat: '<path d="M20 11.5c0 4.1-3.6 7.5-8 7.5-1.2 0-2.3-.2-3.3-.6L4 20l1.3-3.7C4.5 15 4 13.3 4 11.5 4 7.4 7.6 4 12 4s8 3.4 8 7.5z"/>',
    people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2c2.6-.3 4.6 1.3 5 4.3"/>',
    layers: '<path d="M12 4l8.5 4.3L12 12.6 3.5 8.3z"/><path d="M3.5 12.2L12 16.5l8.5-4.3"/><path d="M3.5 16L12 20.3 20.5 16"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>', mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3"/>',
    trend: '<path d="M3.5 16.5l6-6 4 4 7-7.5"/><path d="M15 7h5.5v5.5"/>', shield: '<path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6z"/>',
    snow: '<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>', bell: '<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>',
    star: '<path d="M12 3.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7L12 16.7 6.9 19.5 8 13.8 3.8 9.8l5.7-.7z"/>', starF: '<path d="M12 3.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7L12 16.7 6.9 19.5 8 13.8 3.8 9.8l5.7-.7z" fill="currentColor" stroke="none"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>', infinity: '<path d="M7 9c-2 0-3.5 1.4-3.5 3s1.5 3 3.5 3c3 0 5.5-6 10-6 2 0 3.5 1.4 3.5 3s-1.5 3-3.5 3c-4.5 0-7-6-10-6z"/>',
    cup: '<path d="M6 4h12v6a6 6 0 01-12 0z"/><path d="M18 6h2a2 2 0 010 4h-2M6 6H4a2 2 0 000 4h2M12 16v4M8 20h8"/>',
    cupF: '<path d="M4 7h12v5.5a5 5 0 01-5 5H9a5 5 0 01-5-5z" fill="currentColor" stroke="none"/><path d="M16 9h1.5a2.5 2.5 0 010 5H16" stroke-width="2"/><path d="M3.5 20h14" stroke-width="2.2"/>',
    pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>', stetho: '<path d="M6 3v6a4 4 0 008 0V3"/><path d="M10 13v3a4 4 0 008 0v-2"/><circle cx="18" cy="12" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>', hand: '<path d="M8 12V5.5a1.5 1.5 0 013 0V11M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7.5c0 4-2.5 6.5-6 6.5s-5.5-2-6.5-5L3.5 12a1.4 1.4 0 012.5-1.2L8 13"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 18a2.5 2.5 0 012.5-2.5H20"/>', target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    rocket: '<path d="M5 15l-1.5 4.5L8 18"/><path d="M8.5 15.5l-4-4c3-3.5 7-7.5 14-8.5-.9 7-5 11-8.5 14l-1.5-1.5z"/><circle cx="14" cy="10" r="1.6"/>', gift: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13.5h17M12 9c-3-.5-5-2-4.5-4 .6-2 3.5-1 4.5 4 1-5 3.9-6 4.5-4 .5 2-1.5 3.5-4.5 4"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  const coin = (rank = 5, size = 48, cls = '') => `<img class="coinimg ${cls}" src="assets/coin_rank_${String(Math.max(0, Math.min(19, rank))).padStart(2, '0')}.webp" width="${size}" height="${size}" style="width:${size}px;height:${size}px" alt="">`;
  const SB = (t = '9:41') => `<div class="sb"><span>${t}</span><span class="sys"><svg width="17" height="11" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="16" height="11" viewBox="0 0 17 12" fill="#fff"><path d="M8.5 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 008.5.5 10.8 10.8 0 001 3.4l1.2 1.3a9 9 0 016.3-2.5zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3a7.2 7.2 0 00-9.8 0l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.5c.5 0 1 .2 1.3.5L8.5 11.3 7.2 9.8c.3-.3.8-.5 1.3-.5z"/></svg><span class="bat"></span></span></div>`;

  // Телефон. o.theme: 'dark' | 'lite'; o.under — экран-подложка; o.over — слои поверх (dim/modal/sheet/full/toast)
  const phone = (o = {}) => `<div class="em-ph${o.theme === 'lite' ? ' lite' : ''}" data-ph>${SB(o.time)}<div class="scr"><div class="in">${o.under || ''}</div></div>${o.over || ''}<div class="hi"></div></div>`;

  // Лиги Пика — 12 камней (цвета из spire-leagues.html). guard-ok: это макет-галерея, статический список цветов, никаких балансов/серверных данных.
  const LEAGUES = [
    { id: 'granite', ru: 'Гранит', stone: '#55575E', edge: '#A9B6C6', lit: '#F2EEE6' }, { id: 'basalt', ru: 'Базальт', stone: '#384352', edge: '#8FA6C2', lit: '#E2EEF8' },
    { id: 'marble', ru: 'Мрамор', stone: '#D4CEC4', edge: '#FFF4DE', lit: '#FFF2D6' }, { id: 'jade', ru: 'Нефрит', stone: '#23664F', edge: '#9FF0C8', lit: '#FFE6B0' },
    { id: 'quartz', ru: 'Кварц', stone: '#B38494', edge: '#FFE0EC', lit: '#FFEFF4' }, { id: 'agate', ru: 'Агат', stone: '#80502E', edge: '#FFC98A', lit: '#FFE1B0' },
    { id: 'onyx', ru: 'Оникс', stone: '#2C2C33', edge: '#C9D2E2', lit: '#EEF0F6' }, { id: 'amethyst', ru: 'Аметист', stone: '#4A2D72', edge: '#D6B4FF', lit: '#F0E2FF' },
    { id: 'opal', ru: 'Опал', stone: '#C4BED0', edge: '#DDF4FF', lit: '#FFF4EA' }, { id: 'topaz', ru: 'Топаз', stone: '#8E6522', edge: '#FFE7A0', lit: '#FFF0C0' },
    { id: 'obsidian', ru: 'Обсидиан', stone: '#1C1A20', edge: '#E0503A', lit: '#FFC08A' }, { id: 'diamond', ru: 'Алмаз', stone: '#5C7698', edge: '#E6FAFF', lit: '#EAF8FF' },
  ];
  const league = (i) => LEAGUES[Math.max(0, Math.min(11, i))];

  // Башня лиги — НАСТОЯЩИЙ генератор из spire-leagues.html / SpireTowerSvg (engagement-moments-towers.js, этап 4).
  // o.w — ширина; o.lit — мой этаж (окна ниже — пройдены); o.crop 'top'|'mid'|'mini'|'full'; o.reveal — раскрытие снизу вверх.
  // Окна зажжённого этажа — цветом темы (решение владельца 13.10): подменяем fill="<L.lit>" на var(--acc).
  const tower = (li, o = {}) => {
    // этап 4: если подключена оболочка 2.0 — башня только из spire-tower-render.js (перенос SpireTowerSvg 1:1)
    if (window.EMA && window.SpireTowerRender) { const w0 = o.w || 150; const mini = o.crop === 'mini' || w0 <= 70 || (o.floors && o.floors <= 6); return `<div class="twr" style="width:${w0}px;${o.reveal ? `clip-path:inset(100% 0 0 0);animation:emTowerReveal ${o.revealMs || 1400}ms var(--em-ease) both ${o.revealDelay || 0}ms` : ''}">${EMA.towerSvg({ tier: li, myFloor: (o.lit ?? 15) || null, width: mini ? w0 : Math.max(w0, 220), variant: mini ? 'weekTop' : 'tower', h: mini ? undefined : (o.h || Math.round(w0 * 1.5)) })}</div>`; }
    const T = window.EMT; const w = o.w || 150; const Lx = T ? T.LEAGUES[Math.max(0, Math.min(11, li))] : null;
    if (!Lx) return `<div class="twr" style="width:${w}px;height:${Math.round(w * 1.1)}px;border-radius:12px;background:var(--ti)"></div>`;
    const mini = o.crop === 'mini' || w <= 70 || (o.floors && o.floors <= 6);
    const crop = o.crop || (mini ? 'mini' : 'top');
    const lit = o.lit ?? 15; const my = Math.max(1, Math.min(15, lit || 1));
    let svg = T.towerSvg(Lx, { myFloor: my, noMarker: true, clean: true, crop, summit: lit >= 15 });
    svg = svg.split(`fill="${Lx.lit}"`).join('fill="var(--acc)"');
    return `<div class="twr" style="width:${w}px;${o.reveal ? `clip-path:inset(100% 0 0 0);animation:emTowerReveal ${o.revealMs || 1400}ms var(--em-ease) both ${o.revealDelay || 0}ms` : ''}">${svg}</div>`;
  };
  // keyframe раскрытия башни — добавляем один раз
  const st = document.createElement('style'); st.textContent = '@keyframes emTowerReveal{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}'; document.head.appendChild(st);

  // Кольца дня. rings: [{v:0..1, color, label}] — концентрические дуги; o.size
  const rings = (list, o = {}) => {
    const s = o.size || 160; const c = s / 2; const sw = o.stroke || 12; const gap = o.gap || 5;
    return `<svg class="rings" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="display:block;transform:rotate(-90deg)">
      ${list.map((r, i) => { const rad = c - sw / 2 - i * (sw + gap); const len = 2 * Math.PI * rad; const v = Math.max(0, Math.min(1, r.v)); return `<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.color}" stroke-opacity=".18" stroke-width="${sw}"/><circle class="rg" data-len="${len}" cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - v)}" style="transition:stroke-dashoffset ${o.ms || 1100}ms var(--em-ease) ${o.delay ? o.delay + i * 120 : i * 120}ms;${o.from0 ? `stroke-dashoffset:${len}` : ''}" data-to="${len * (1 - v)}"/>`; }).join('')}
    </svg>`;
  };

  // Конфетти на canvas телефона. o.gold — золотые монетки вместо бумаги; o.n — число частиц; o.burst — из точки (x,y в долях)
  const confetti = (ph, o = {}) => {
    const cv = document.createElement('canvas'); cv.className = 'fx'; cv.width = 390; cv.height = 844; ph.appendChild(cv);
    const ctx = cv.getContext('2d'); const n = o.n || 140; const cols = o.colors || ['#5FE3C0', '#7C9BFF', '#F5C451', '#FF7A45', '#FFFFFF', '#D6B4FF'];
    const ps = []; for (let i = 0; i < n; i++) {
      const burst = o.burst; const x = burst ? burst[0] * 390 : Math.random() * 390; const y = burst ? burst[1] * 844 : -20 - Math.random() * 300;
      const a = burst ? (Math.random() * Math.PI * 2) : 0; const sp = burst ? 3 + Math.random() * 9 : 0;
      ps.push({ x, y, vx: burst ? Math.cos(a) * sp : (Math.random() - .5) * 1.4, vy: burst ? Math.sin(a) * sp - 4 : 1.5 + Math.random() * 2.5, r: o.gold ? 4 + Math.random() * 5 : 3 + Math.random() * 4, c: o.gold ? ['#F5C451', '#FFE08A', '#D29A2A', '#FFF3C4'][i % 4] : cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .3, sq: Math.random() > .5 });
    }
    let t0 = performance.now(); let raf;
    const step = (t) => { const dt = Math.min(2, (t - t0) / 16); t0 = t; ctx.clearRect(0, 0, 390, 844); let alive = 0;
      ps.forEach((p) => { p.vy += .12 * dt; p.vx *= .99; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.y < 900) alive++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, Math.min(1, (900 - p.y) / 200));
        if (o.gold) { ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * Math.abs(Math.cos(p.rot * 2)), 0, 0, Math.PI * 2); ctx.fill(); } else if (p.sq) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore(); });
      if (alive && t - start < (o.ms || 5200)) raf = requestAnimationFrame(step); else cv.remove(); };
    const start = performance.now(); raf = requestAnimationFrame(step); return () => { cancelAnimationFrame(raf); cv.remove(); };
  };

  // Счётчик: от → до за ms
  const countUp = (el, from, to, ms = 1200, fmt = (v) => Math.round(v).toLocaleString('ru-RU')) => {
    const t0 = performance.now(); const tick = (t) => { const k = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  };

  // «Печатающийся» чат: steps = [{who:'them'|'me'|'sys', text, tr, typingMs, delay}]
  const chatPlay = (box, steps) => {
    box.innerHTML = ''; let t = 0; const timers = [];
    steps.forEach((s) => {
      t += s.delay ?? 500;
      if (s.who === 'them' && s.typingMs !== 0) {
        timers.push(setTimeout(() => { const d = document.createElement('div'); d.className = 'bub them'; d.dataset.typing = '1'; d.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; box.appendChild(d); box.scrollTop = 1e5; }, t));
        t += s.typingMs ?? 900;
      }
      timers.push(setTimeout(() => { const old = box.querySelector('[data-typing]'); if (old) old.remove(); const d = document.createElement('div'); d.className = `bub ${s.who}`; d.innerHTML = `${s.text}${s.tr ? `<span class="tr">${s.tr}</span>` : ''}`; box.appendChild(d); box.scrollTop = 1e5; }, t));
    });
    return () => timers.forEach(clearTimeout);
  };
  // Посимвольный набор строки в элемент
  const typeText = (el, text, ms = 40, delay = 0) => { el.textContent = ''; let i = 0; const timers = []; timers.push(setTimeout(() => { const iv = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(iv); }, ms); timers.push(iv); }, delay)); return () => timers.forEach((x) => { clearTimeout(x); clearInterval(x); }); };

  // ---------- реестр моментов и отрисовка ----------
  const MOMENTS = []; const inits = new Map();
  // m = { id, num, title, tag:'new'|'old', lead, variants:[{ k:'A', label, time, phone:{...}, init(ph), why, ref, fx, snd }] }
  const moment = (m) => { MOMENTS.push(m); };
  const renderVariant = (m, v, j) => {
    const vid = `${m.id}-${v.k || j}`; if (v.init) inits.set(vid, v.init);
    return `<div class="em-var" data-vid="${vid}"><div class="lbl"><span class="k">${v.k || String.fromCharCode(65 + j)}</span>${v.label}${v.time ? `<span class="tm">${v.time}</span>` : ''}</div>
      <div class="em-ph-wrap" data-wrap>${phone(v.phone)}</div>
      <div class="em-tools"><span class="em-btn pri" data-replay>▶ Повторить</span><span class="em-btn" data-theme>☾ / ☼ тема</span></div>
      <div class="note">${v.why ? `<span class="why">${v.why}</span>` : ''}${v.ref ? `<span class="ref">${v.ref}</span>` : ''}${v.fx ? `<span class="fx">${v.fx}</span>` : ''}${v.snd ? `<span class="snd">${v.snd}</span>` : ''}</div></div>`;
  };
  const render = (root, toc) => {
    root.innerHTML = MOMENTS.map((m) => `<section class="em-moment" id="${m.id}"><div class="hd"><span class="num">${m.num || ''}</span><h2>${m.title}</h2>${m.tag ? `<span class="tag ${m.tag}">${m.tag === 'new' ? 'нет в приложении' : 'есть — улучшаем'}</span>` : ''}${m.tag2 ? `<span class="tag">${m.tag2}</span>` : ''}</div>${m.lead ? `<p class="lead">${m.lead}</p>` : ''}<div class="em-vars">${m.variants.map((v, j) => renderVariant(m, v, j)).join('')}</div></section>`).join('');
    if (toc) toc.insertAdjacentHTML('beforeend', MOMENTS.map((m) => `<a href="#${m.id}">${m.num ? m.num + ' · ' : ''}${m.short || m.title}</a>`).join(''));
    // запуск init для видимых телефонов (IntersectionObserver — анимации стартуют, когда докрутили)
    const run = (wrap) => { const vid = wrap.closest('[data-vid]').dataset.vid; const ph = wrap.querySelector('[data-ph]'); const f = inits.get(vid); if (wrap._stop) { try { wrap._stop(); } catch (e) {} wrap._stop = null; } if (f) wrap._stop = f(ph) || null; };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !e.target._ran) { e.target._ran = true; run(e.target); } }), { threshold: .35 });
    root.querySelectorAll('[data-wrap]').forEach((w) => io.observe(w));
    root.addEventListener('click', (e) => {
      const rp = e.target.closest('[data-replay]'); const th = e.target.closest('[data-theme]'); const vr = e.target.closest('[data-vid]'); if (!vr) return;
      const wrap = vr.querySelector('[data-wrap]'); const ph = wrap.querySelector('[data-ph]');
      if (rp) { const lite = ph.classList.contains('lite'); const iris = ph.classList.contains('iris'); const m = MOMENTS.find((x) => vr.dataset.vid.startsWith(x.id + '-')); const v = m.variants.find((x, j) => `${m.id}-${x.k || j}` === vr.dataset.vid); wrap.innerHTML = phone({ ...v.phone, theme: lite ? 'lite' : v.phone.theme === 'lite' && !lite ? 'dark' : v.phone.theme }); const np = wrap.querySelector('[data-ph]'); np.classList.toggle('lite', lite); np.classList.toggle('iris', iris); run(wrap); } // зачем (координатор 14.10): третья тема «Ирис» — класс iris терялся после «Повторить», телефон откатывался в светлую Аврору
      if (th) { ph.classList.toggle('lite'); }
    });
  };
  window.EM = { icon, coin, phone, tower, league, LEAGUES, rings, confetti, countUp, chatPlay, typeText, moment, render, MOMENTS };
})();
