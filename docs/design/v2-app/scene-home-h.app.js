/* scene-home-h.app.js — «Сцена Главной высотой как у «Уроков»» (владелец 29.10: «сначала макеты покажи!», координатор — приоритет выше ачивок).
   На реальных кадрах: «Сейчас» — кадр Главной как есть; «Вариант» — сцена Главной укорочена до высоты сцены вкладки «Уроки» (нижний край на
   том же y = 1029 px кадра), край резкий, скругление 28 dp как сверху, заметная тень под сценой как у отдельного блока, зазор 12 dp до
   карточки «Сегодня», карточка не наезжает; тёмное — мерцают звёзды и НЕТ затемнения низа сцены (без vignette и guard-затемнения);
   светлое «А» — та же форма и тень, без звёзд (без scrim низа). Рядом — кадр «Уроков» для сравнения высоты; переключатели «сейчас /
   вариант», «тёмная / светлая», «линейка». Цвета — только токены темы «Затмение»; служебного текста внутри телефона нет.
   Сборка варианта (движок без правок): перекраска утверждённой формулой (scene-recolor.js) с растром неба высоты 1029, строки неба
   между шапкой и заголовком урока (53 px) вырезаны, низ сцены на 1029, зазор 32 px, карточка и всё ниже на +3 px, таббар на месте;
   углы 28 dp перекрашены; тень только на фоне страницы (зазор и поля); герой 160 dp по центру новой высоты; заголовок урока —
   HTML-слой как в чистом макете. Числа тени/высоты — временные до цифр «Тем» (константы V). Журнал — [SH]. */
(() => {
  const LOG = '[SH]'; const RF = window.RF; const SP = window.__sp; const DT = window.__dt; const SA = window.SceneApproved; const SR = window.SceneRecolor; const REAL = window.__REAL || {};
  if (!SP || !DT || !SA || !RF || !SR) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, dt: !!DT, sa: !!SA, rf: !!RF, sr: !!SR })); return; }
  const THEMES = SP.THEMES; const W = 1080; const H = 2400; const DPX = 2.625; const THEME = 'graphite';
  const q = new URLSearchParams(location.search); let AP = q.get('ap') === 'light' ? 'light' : 'dark'; let VIEW = q.get('view') === 'now' ? 'now' : 'variant'; let RULER = q.get('ruler') !== '0';
  /* числа варианта — до цифр «Тем»: край сцены = край сцены «Уроков» (1029 px = 392 dp), скругление 28 dp, зазор 12 dp, тень 0/10/28 */
  const V = { edge: 1029, radiusDp: 28, gapDp: 12, band0: 340, cardTop: 1058, tab: 2140, shadow: { dark: { blur: 34, dy: 12, a: 0.6 }, light: { blur: 34, dy: 12, a: 0.32 } } };
  const frames = Object.values(REAL).filter((m) => m && m.ok !== false && m.recolor !== false && THEMES[m.theme]);
  const frameOf = (screen, ap) => frames.find((m) => m.theme === THEME && m.screen === screen && m.ap === ap && (m.state || 'day') === 'day') || null;
  const TITLE = { x0: 40, y0: 615, x1: 1040, y1: 765, top: 560, label: 'Урок 1', text: 'Местоимения и глагол To Be' };
  const KEEP_AVATAR = [{ cx: 953.5, cy: 226, r: 85 }, { cx: 1018, cy: 279, r: 31 }];
  const copyWidth = (mv, art) => { const pad = (SA.HERO_HOME.assetPad[art] || { left: 0 }).left; return RF.px(mv.x + pad * mv.size - 40) - 8; };
  const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('не открылась ' + src)); im.src = src; });
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d', { willReadFrequently: true }) }; };
  /* растр неба высоты Hs без затемнения низа: тёмное — те же слои «Глубокого неба» (градиент, солнце, дымка, звёзды), но без vignette и
     guard; светлое — формула «А» без scrim. Возвращает растр и список звёзд (доли W × Hs) для мерцающего слоя */
  const skyRaster = (ap, Hs) => {
    const t = THEMES[THEME][ap]; const premium = !!THEMES[THEME].premium;
    if (ap === 'dark') {
      const d = SA.approved(t, 'dark', 'home', W, Hs, { premium }); const { c, g } = canvasOf(W, Hs); const raw = d.raw; const rawOf = [raw.zen, raw.mid, raw.hor, raw.hor, raw.gnd, raw.bottom];
      const gr = g.createLinearGradient(0, 0, 0, Hs); d.gradient.stops.forEach((s, i) => gr.addColorStop(s.at, rgba(rawOf[i]))); g.fillStyle = gr; g.fillRect(0, 0, W, Hs);
      const l = d.sun; g.save(); g.translate(l.cx * W, l.cy * Hs); g.scale(l.rx * W, l.ry * Hs); const lg = g.createRadialGradient(0, 0, 0, 0, 0, 1); lg.addColorStop(0, rgba(raw.lightC, l.a)); lg.addColorStop(1, rgba(raw.lightC, 0)); g.fillStyle = lg; g.fillRect(-1, -1, 2, 2); g.restore(); // guard-ok: альфа света/тени на холсте макета, не баланс пользователя
      const hz = d.haze; const bg = g.createLinearGradient(0, Hs * hz.y0, 0, Hs * hz.y1); bg.addColorStop(0, rgba(raw.haze, 0)); bg.addColorStop(0.5, rgba(raw.haze, hz.a[1])); bg.addColorStop(1, rgba(raw.haze, 0)); g.fillStyle = bg; g.fillRect(0, Hs * hz.y0, W, Hs * (hz.y1 - hz.y0));
      d.stars.list.forEach((s) => { g.fillStyle = rgba([255, 255, 255], s.a); g.beginPath(); g.arc(s.x * W, s.y * Hs, s.r, 0, Math.PI * 2); g.fill(); });
      console.log(LOG, 'небо тёмное', JSON.stringify({ Hs, layers: ['gradient', 'sun', 'haze', 'stars'], dropped: ['vignette', 'guard'] })); // guard-ok
      return { data: g.getImageData(0, 0, W, Hs).data, stars: d.stars.list };
    }
    const a = SA.approved(t, 'light', 'home', W, Hs, { premium }); const spec = Object.assign({}, a.spec, { scrim: null }); const paint = SR.painter(spec, W, Hs); const d = new Uint8ClampedArray(W * Hs * 4);
    for (let y = 0; y < Hs; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; const c = paint(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    console.log(LOG, 'небо светлое А', JSON.stringify({ Hs, dropped: ['scrim'] })); // guard-ok
    return { data: d, stars: [] };
  };
  const heroMask = async (m, ap) => { const h = m.hero; if (!h) return null; const im = await loadImg(`assets/v2art/hero512/${ap}/${h.art || 'home_scene_continue'}.webp`); const { g } = canvasOf(h.size, h.size); g.drawImage(im, 0, 0, h.size, h.size); const d = g.getImageData(0, 0, h.size, h.size).data; const a = new Float32Array(h.size * h.size); for (let i = 0; i < a.length; i += 1) a[i] = (d[i * 4 + 3] / 255) * (h.opacity == null ? 0.96 : h.opacity); return { alpha: a, x: h.x, y: h.y, w: h.size, h: h.size, im }; };
  const CACHE = {};
  /* сборка варианта: кадр → перекраска сцены растром неба (строки сопоставлены с учётом выреза) → хирургия строк → углы → тень → герой */
  const buildVariant = async (m, ap) => {
    if (CACHE[ap]) return CACHE[ap];
    const t0 = performance.now(); const sceneH = m.sceneH || 1082; const delta = V.cardTop - V.edge; const band1 = V.band0 + delta; /* низ сцены — строки до верха карточки (1058): на кадре карточка накрывает последние 24 px сцены, их не берём */ const edge = V.edge; const gap = Math.round(V.gapDp * DPX); const cardY = edge + gap; const shift = cardY - V.cardTop;
    const frame = await loadImg(`assets/real/${m.file}`); const { c, g } = canvasOf(W, H); g.drawImage(frame, 0, 0, W, H);
    const sky = skyRaster(ap, edge); const mapped = new Uint8ClampedArray(W * sceneH * 4);
    for (let y = 0; y < sceneH; y += 1) { const sy = y < V.band0 ? y : y >= band1 ? Math.min(edge - 1, y - delta) : V.band0; mapped.set(sky.data.subarray(sy * W * 4, (sy + 1) * W * 4), y * W * 4); }
    const scene = g.getImageData(0, 0, W, sceneH); const hero = await heroMask(m, ap);
    const st = SR.recolor({ data: scene.data, W, H: sceneH, sceneH, oldSpec: DT.oldSpecFor(m), newSpec: { image: { data: mapped, width: W } }, radius: 32 * DPX, hero, heroHide: true, clear: [TITLE], keep: KEEP_AVATAR, fillCorners: true });
    const { c: sc, g: sg } = canvasOf(W, sceneH); sg.putImageData(scene, 0, 0);
    const { c: out, g: og } = canvasOf(W, H);
    og.drawImage(sc, 0, 0, W, V.band0, 0, 0, W, V.band0); og.drawImage(sc, 0, band1, W, V.cardTop - band1, 0, V.band0, W, V.cardTop - band1); // сцена без полосы неба и без строк под карточкой: край ровно на edge
    const bgL = [g.getImageData(16, 1100, 1, 1).data, g.getImageData(1070, 1100, 1, 1).data]; const bgAt = (x) => { const k = x / W; return [0, 1, 2].map((i) => bgL[0][i] + (bgL[1][i] - bgL[0][i]) * k); };
    const bgGr = og.createLinearGradient(0, 0, W, 0); bgGr.addColorStop(0, rgba(Array.from(bgL[0]).slice(0, 3))); bgGr.addColorStop(1, rgba(Array.from(bgL[1]).slice(0, 3))); og.fillStyle = bgGr; og.fillRect(0, edge, W, gap); // зазор 12 dp — фон страницы
    og.drawImage(c, 0, V.cardTop, W, V.tab - V.cardTop, 0, cardY, W, V.tab - V.cardTop); og.drawImage(c, 0, V.tab, W, H - V.tab, 0, V.tab, W, H - V.tab); // карточка и ниже на +shift, таббар на месте
    // карточка «Сегодня» сдвинута: снаружи её скруглённого контура (углы и поля в строках, где на кадре была сцена) — фон страницы
    { const cr = (m.cards && m.cards[0]) || { x0: 32, x1: W - 32, r: 74 }; const rows = (sceneH - V.cardTop) + cr.r + 4; const z = og.getImageData(0, cardY, W, rows); const d = z.data;
      for (let yy = 0; yy < rows; yy += 1) for (let x = 0; x < W; x += 1) { const inX = x >= cr.x0 && x <= cr.x1; let inside = inX && yy >= cr.r; if (inX && !inside) { const cx = x < cr.x0 + cr.r ? cr.x0 + cr.r : x > cr.x1 - cr.r ? cr.x1 - cr.r : x; inside = Math.hypot(x - cx, yy - cr.r) <= cr.r; } if (!inside) { const col = bgAt(x); const i = (yy * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
      og.putImageData(z, 0, cardY); }
    // углы 28 dp: внутри скруглённого контура — небо, снаружи — фон страницы (старый вырез кадра был 32 dp)
    const R = Math.round(V.radiusDp * DPX); const Rold = Math.round(32 * DPX); const zone = og.getImageData(0, edge - Rold, W, Rold); const zd = zone.data;
    for (let yy = 0; yy < Rold; yy += 1) { const y = edge - Rold + yy; for (let x = 0; x < W; x += 1) { if (x >= Rold && x < W - Rold) continue; const cx = x < W / 2 ? R : W - R; const cy = edge - R; const outside = (x < R || x >= W - R) && y >= cy && Math.hypot(x - cx, y - cy) > R; const i = (yy * W + x) * 4; const col = outside ? bgAt(x) : [sky.data[(y * W + x) * 4], sky.data[(y * W + x) * 4 + 1], sky.data[(y * W + x) * 4 + 2]]; if (outside || x < Rold || x >= W - Rold) { if (!outside && zd[i + 3] && (x < Rold || x >= W - Rold)) { /* пиксели старого скругления и углы: только фон/небо, без UI */ } zd[i] = col[0]; zd[i + 1] = col[1]; zd[i + 2] = col[2]; } } }
    og.putImageData(zone, 0, edge - Rold);
    // тень под сценой — как у отдельного блока; рисуется только на фоне страницы: зазор и поля по бокам карточки
    const sh = V.shadow[ap]; const { c: shc, g: shg } = canvasOf(W, H); shg.shadowColor = `rgba(0,0,0,${sh.a})`; shg.shadowBlur = sh.blur; shg.shadowOffsetY = sh.dy; shg.fillStyle = '#000'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill();
    shg.globalCompositeOperation = 'destination-out'; shg.shadowColor = 'transparent'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill(); // оставить только саму тень
    og.save(); og.beginPath(); og.rect(0, edge, W, gap); og.rect(0, cardY, 32, 260); og.rect(W - 32, cardY, 32, 260); og.clip(); og.drawImage(shc, 0, 0); og.restore(); // guard-ok: альфа света/тени на холсте макета, не баланс пользователя
    // герой заново — 160 dp по центру новой высоты
    const mv = SA.heroHome(W, edge, DPX); if (hero && hero.im) { og.save(); og.globalAlpha = 0.96; og.drawImage(hero.im, mv.x, mv.y, mv.size, mv.size); og.restore(); }
    const url = await new Promise((res, rej) => out.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
    const result = { url, mv, stars: sky.stars, art: (m.hero && m.hero.art) || 'home_scene_continue', delta, cardY, st };
    console.log(LOG, 'вариант собран', JSON.stringify({ ap, file: m.file, sceneH, edge, delta, band: [V.band0, band1], gap, cardY, shift, radius: R, ms: Math.round(performance.now() - t0), classes: st })); // guard-ok
    CACHE[ap] = result; return result;
  };
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  const starsHtml = (stars, edge) => stars.map((s, i) => `<i class="sh-star" style="left:${(s.x * W * RF.K + 5).toFixed(1)}px;top:${RF.px(s.y * edge)}px;width:${Math.max(2, Math.round(s.r * 1.6))}px;height:${Math.max(2, Math.round(s.r * 1.6))}px;opacity:${s.a.toFixed(2)};animation-delay:${((i * 0.37) % 2.6).toFixed(2)}s;animation-duration:${(2.2 + (i % 5) * 0.35).toFixed(2)}s"></i>`).join('');
  const render = async () => {
    const root = document.getElementById('sh'); if (!root) return; window.__shDone = false;
    const home = frameOf('home', AP); const lessons = frameOf('season', AP);
    if (!home || !lessons) { root.innerHTML = '<p class="sf-empty">Кадры ещё не сняты</p>'; console.log(LOG, 'нет кадров', JSON.stringify({ home: !!home, lessons: !!lessons, ap: AP })); return; }
    const ctl = (id, items, cur, key) => { const el = document.getElementById(id); if (el) el.innerHTML = items.map(([k, n]) => `<span class="chp${cur === k ? ' on' : ''}" data-${key}="${k}">${n}</span>`).join(''); };
    ctl('shView', [['now', 'Сейчас'], ['variant', 'Вариант']], VIEW, 'sh-view'); ctl('shAp', [['dark', 'Тёмная'], ['light', 'Светлая «А»']], AP, 'sh-ap'); ctl('shRuler', [['1', 'Линейка'], ['0', 'Без линейки']], RULER ? '1' : '0', 'sh-ruler');
    const nowPh = RF.phone({ src: `assets/real/${home.file}`, exists: true, cls: 'sp-rf', status: home.status || 100, tab: home.tab || 2140 });
    const lesPh = RF.phone({ src: `assets/real/${lessons.file}`, exists: true, cls: 'sp-rf', status: lessons.status || 100, tab: lessons.tab || 2140 });
    let homeCol;
    if (VIEW === 'now') homeCol = col('Главная · сейчас', nowPh);
    else {
      let v; try { v = await buildVariant(home, AP); } catch (e) { console.log(LOG, 'вариант не собрался:', e.message); root.innerHTML = '<p class="sf-empty">Сборка не удалась</p>'; return; }
      const copy = `<div class="sf-copy" style="top:${RF.px(TITLE.top - v.delta)}px;width:${copyWidth(v.mv, v.art)}px"><small>${TITLE.label}</small><b>${TITLE.text}</b></div>`;
      const stars = AP === 'dark' ? `<div class="sh-stars">${starsHtml(v.stars, V.edge)}</div>` : '';
      homeCol = col('Главная · вариант', RF.phone({ src: v.url, exists: true, cls: 'sp-rf sp-rf-will', status: home.status || 100, tab: home.tab || 2140, overlays: copy + stars }));
    }
    root.innerHTML = `<div class="sp-real-row sh-row"><div class="phones sh-phones">${homeCol}${col('Уроки · сейчас', lesPh)}${RULER ? `<div class="sh-ruler" style="top:0"></div>` : ''}</div></div>`;
    if (RULER) { const ph = root.querySelector('.col:nth-child(2) .ph'); const body = ph && ph.querySelector('.rf-body'); const line = root.querySelector('.sh-ruler'); if (body && line) { const rowRect = root.querySelector('.sh-phones').getBoundingClientRect(); const b = body.getBoundingClientRect(); line.style.top = `${Math.round(b.top - rowRect.top + RF.px(V.edge))}px`; } }
    const u = new URL(location.href); u.searchParams.set('ap', AP); u.searchParams.set('view', VIEW); u.searchParams.set('ruler', RULER ? '1' : '0'); history.replaceState(null, '', u);
    window.__shDone = true; console.log(LOG, 'render', JSON.stringify({ ap: AP, view: VIEW, ruler: RULER })); // guard-ok
  };
  document.body.addEventListener('click', (e) => {
    const v = e.target.closest('.chp[data-sh-view]'); if (v) { VIEW = v.dataset.shView; render(); return; }
    const a = e.target.closest('.chp[data-sh-ap]'); if (a) { AP = a.dataset.shAp; render(); return; }
    const r = e.target.closest('.chp[data-sh-ruler]'); if (r) { RULER = r.dataset.shRuler === '1'; render(); }
  });
  render();
  window.__sh = { render, V, cache: CACHE, setView: (v) => { VIEW = v; return render(); }, setAp: (a) => { AP = a; return render(); } };
})();
