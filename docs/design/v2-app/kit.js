/* PhraseMan 2.0 — помощники макетов (с нуля 24.09). Только детали эталонных экранов. */
(() => {
  // Значки — тонкий контур 1.8, как Ionicons outline в приложении.
  const P = {
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    fwd: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M5 15l7-7 7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    heart: '<path d="M12 20s-7-4.4-9-8.6C1.6 8.3 3.6 5 7 5c2 0 3.2 1.1 5 3 1.8-1.9 3-3 5-3 3.4 0 5.4 3.3 4 6.4C19 15.6 12 20 12 20z"/>',
    heartF: '<path d="M12 20.5s-7.5-4.6-9.6-9C1 8.2 3.2 4.6 6.9 4.6c2.1 0 3.4 1.1 5.1 3 1.7-1.9 3-3 5.1-3 3.7 0 5.9 3.6 4.5 6.9-2.1 4.4-9.6 9-9.6 9z" fill="currentColor" stroke="none"/>',
    people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2c2.6-.3 4.6 1.3 5 4.3"/>',
    peopleF: '<circle cx="8.5" cy="8" r="3.4" fill="currentColor" stroke="none"/><path d="M2.5 19.5c.4-3.6 2.9-5.6 6-5.6s5.6 2 6 5.6z" fill="currentColor" stroke="none"/><circle cx="16.8" cy="9" r="2.8" fill="currentColor" stroke="none"/><path d="M15.2 14c3.4-.4 5.9 1.6 6.3 5.5h-5" fill="currentColor" stroke="none"/>',
    chat: '<path d="M20 11.5c0 4.1-3.6 7.5-8 7.5-1.2 0-2.3-.2-3.3-.6L4 20l1.3-3.7C4.5 15 4 13.3 4 11.5 4 7.4 7.6 4 12 4s8 3.4 8 7.5z"/>',
    chatDots: '<path d="M20 11.5c0 4.1-3.6 7.5-8 7.5-1.2 0-2.3-.2-3.3-.6L4 20l1.3-3.7C4.5 15 4 13.3 4 11.5 4 7.4 7.6 4 12 4s8 3.4 8 7.5z"/><path d="M8.5 11.6h.01M12 11.6h.01M15.5 11.6h.01" stroke-width="2.6"/>',
    bookmark: '<path d="M7 4h10v16l-5-3.6L7 20z"/>',
    layers: '<path d="M12 4l8.5 4.3L12 12.6 3.5 8.3z"/><path d="M3.5 12.2L12 16.5l8.5-4.3"/><path d="M3.5 16L12 20.3 20.5 16"/>',
    vol: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9.2a4 4 0 010 5.6M18 7a7 7 0 010 10"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    boltF: '<path d="M13.5 2.5L4.5 13.8h6.4L9.8 21.5l9-11.3h-6.4z" fill="currentColor" stroke="none"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    edit: '<path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5"/><path d="M17.5 3.5l3 3L12 15l-4 1 1-4z"/>',
    cupF: '<path d="M4 7h12v5.5a5 5 0 01-5 5H9a5 5 0 01-5-5z" fill="currentColor" stroke="none"/><path d="M16 9h1.5a2.5 2.5 0 010 5H16" stroke-width="2"/><path d="M3.5 20h14" stroke-width="2.2"/>',
    planeF: '<path d="M21 12.7v-1.4l-8-4.6V3.8a1.3 1.3 0 00-2.6 0v2.9l-8 4.6v1.4l8-2.2v4.9L8 17v1.2l3.7-1 3.7 1V17l-2.4-1.6v-4.9z" fill="currentColor" stroke="none"/>',
    docF: '<path d="M6 3h8.5L19 7.5V19a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" fill="currentColor" stroke="none"/><path d="M8 11h7M8 14.5h7M8 18h4.5" stroke="#1A1A1C" stroke-width="1.6"/>',
    lockF: '<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" stroke="none"/><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke-width="2.2"/>',
    unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 017.7-1.5"/>',
    basket: '<path d="M3.5 9.5h17l-2 9.5h-13z"/><path d="M8 9.5l3-5M16 9.5l-3-5"/><path d="M9.5 14.5c1.4 1 3.6 1 5 0"/>',
    shirt: '<path d="M8.5 4l-5 3 2 3.5 2-1V20h9V9.5l2 1 2-3.5-5-3c-.5 1.3-1.8 2-3.5 2s-3-.7-3.5-2z"/>',
    dotsH: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="3"/>',
    dotsV: '<path d="M12 6h.01M12 12h.01M12 18h.01" stroke-width="3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    flag: '<path d="M6 21V4"/><path d="M6 4.5c4-2 7.5 2 12 0v9c-4.5 2-8-2-12 0"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.2A9.8 9.8 0 0112 6c4.5 0 8 4 9 6-.4.8-1.3 2.1-2.6 3.3M6.6 6.9C4.5 8.3 3.2 10.4 3 12c1 2 4.5 6 9 6 1.3 0 2.5-.3 3.6-.8"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/>',
    trend: '<path d="M3.5 16.5l6-6 4 4 7-7.5"/><path d="M15 7h5.5v5.5"/>',
    thumb: '<path d="M7.5 10.5V20H4.5v-9.5z"/><path d="M7.5 10.5l3.5-6.5c1.4 0 2.4 1.2 2.1 2.6l-.6 3.4h5.3a2 2 0 012 2.3l-1.1 6a2 2 0 01-2 1.7H7.5"/>',
    flame: '<path d="M12 21c-3.6 0-6.5-2.6-6.5-6.3 0-3.3 2.3-5 3.3-7.7.6 1.6 1.6 2.6 2.7 3.1C11.4 7 12.8 4.6 15 3c-.2 3 3.5 5.4 3.5 11.2C18.5 18 15.6 21 12 21z"/>',
    wifiOff: '<path d="M7 18.5h9.5a4 4 0 00.9-7.9 5.5 5.5 0 00-10.4-1.2A4.6 4.6 0 007 18.5z"/><path d="M3.5 3.5l17 17"/>',
    user: '<circle cx="12" cy="9" r="4" fill="currentColor" stroke="none"/><path d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6z" fill="currentColor" stroke="none"/>',
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
  const coin = (rank = 5) => `assets/coin_rank_${String(Math.max(0, Math.min(19, rank))).padStart(2, '0')}.webp`;
  const coinImg = (rank = 5, size = 20) => `<img class="coin" src="${coin(rank)}" width="${size}" height="${size}" style="width:${size}px;height:${size}px" alt="">`;
  const sb = (time = '9:41') => `<div class="sb"><span>${time}</span><span class="sys">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><path d="M8.5 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 008.5.5 10.8 10.8 0 001 3.4l1.2 1.3a9 9 0 016.3-2.5zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3a7.2 7.2 0 00-9.8 0l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.5c.5 0 1 .2 1.3.5L8.5 11.3 7.2 9.8c.3-.3.8-.5 1.3-.5z"/></svg>
    <span class="bat"></span></span></div>`;
  // Телефон: тело прокручивается; overlay — шторки/окна поверх; fixed — элементы низа.
  const phone = (body, o = {}) => `<div class="ph">${sb(o.time)}<div class="scr"><div class="in"${o.inStyle ? ` style="${o.inStyle}"` : ''}>${body}</div></div>${o.fixed || ''}${o.overlay || ''}<div class="hi"></div></div>`;
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  const block = (id, title, lead, cols) => `<section class="block" id="${id}"><h2>${title}</h2>${lead ? `<p>${lead}</p>` : ''}<div class="phones">${cols.join('')}</div></section>`;
  const sheet = (id, inner, open = false) => `<div class="dim${open ? ' on' : ''}" data-dim="${id}"></div><div class="sheet${open ? ' on' : ''}" data-sheet="${id}"><div class="grab"></div>${inner}</div>`;
  // зачем (Дизайн 7b252fa06, координатор 12.10): капсула энергии в шапках = 60×28, цифра 16 (проба владельца 24.09 старше образца 35/17/17) — один размер для всех вариантов; значок 16
  const energy = (n, o = {}) => `<span class="pill encap${o.ol ? ' ol' : ''}" data-energy="${n}">${icon('boltF', 's16')}<span class="num">${n}</span></span>`;
  const coins = (n, o = {}) => `<span class="pill${o.ol ? ' ol' : ''}${o.s ? ' s' : ''}" data-coins="${n}">${coinImg(o.rank ?? 5, o.s ? 18 : 20)}<span class="num">${n.toLocaleString('ru-RU')}</span></span>`;

  // ---------- поведение ----------
  function press(root) {
    root.addEventListener('pointerdown', (e) => { const t = e.target.closest('.t'); if (t) t.classList.add('down'); });
    const up = () => root.querySelectorAll('.t.down').forEach((t) => t.classList.remove('down'));
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('pointerleave', up, true);
  }
  // Резинка на краях прокрутки (колесо и перетаскивание)
  function rubber(scr) {
    const inner = scr.firstElementChild; let off = 0, raf = 0, tm = 0;
    const settle = () => { off *= 0.8; if (Math.abs(off) < 0.4) off = 0; inner.style.transform = off ? `translateY(${off}px)` : ''; if (off) raf = requestAnimationFrame(settle); };
    scr.addEventListener('wheel', (e) => {
      const atTop = scr.scrollTop <= 0 && e.deltaY < 0; const atBot = scr.scrollTop + scr.clientHeight >= scr.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atBot) return;
      off = Math.max(-70, Math.min(70, off - e.deltaY * 0.25)); inner.style.transform = `translateY(${off}px)`;
      cancelAnimationFrame(raf); clearTimeout(tm); tm = setTimeout(() => { raf = requestAnimationFrame(settle); }, 90);
    }, { passive: true });
  }
  function sheets(root) {
    root.addEventListener('click', (e) => {
      const op = e.target.closest('[data-open]'); const ph = e.target.closest('.ph');
      if (op && ph) { const id = op.dataset.open; ph.querySelector(`[data-sheet="${id}"]`)?.classList.add('on'); ph.querySelector(`[data-dim="${id}"]`)?.classList.add('on'); }
      const cl = e.target.closest('[data-close],[data-dim]');
      if (cl && ph) { ph.querySelectorAll('.sheet.on,.dim.on').forEach((n) => n.classList.remove('on')); }
    });
  }
  function init() { press(document.body); sheets(document.body); document.querySelectorAll('.scr').forEach(rubber); }


  // зачем (12.10, стиль «Тень»): обводки контейнеров в макетах снимает nobord.js — подключаем из kit.js, чтобы все страницы с kit.js получили его сами
  if (!window.__nobord) { const sc = document.createElement('script'); sc.src = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/kit\.js.*$/, '') : '') + 'nobord.js'; document.head.appendChild(sc); }
  window.K = { icon, coin, coinImg, phone, col, block, sheet, energy, coins, init };
})();
