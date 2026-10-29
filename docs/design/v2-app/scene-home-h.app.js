/* scene-home-h.app.js — «Сцена Главной высотой как у «Уроков»» (владелец 29.10; координатор: «сейчас» — кадры HEAD 8f5b0acba от Сверки,
   третий переключатель «тема» графит/Титан, звёзды по всей сцене; цифры формы — от «Тем» 29.10). Телефоны: Главная «сейчас» (кадр как
   есть) / «вариант», рядом «Уроки» (кадр HEAD, край сцены 1029 px = 392 dp) и линейка по его краю.
   Вариант: нижний край сцены Главной на 1029 (как у «Уроков»), край резкий, скругление 28 dp, тень 0/9 dp размытие 18 dp α .70/.32,
   зазор 12 dp до карточки «Сегодня» (карточка и всё ниже на +3 px, таббар на месте).
   Графит (формульная тема, кадр HEAD с краем 984): небо заново растром высоты 1029 — без затемнения низа и без vignette, звёзды по всей
   площади (70 формулы в верхних 40 % + 102 нижних той же плотности; у «Тем» в коде пока 48), мерцает каждая 8-я; герой — чип «Герой»:
   как на кадре (140 dp у края) / 160 dp справа 20 по центру (эталон, так в коде «Тем») / 200 dp; UI, герой и заголовок на своих местах — сцена
   растёт вниз под кнопкой. Переключатель «низ неба» (предложение «Тем» для контраста белого текста): без затемнения · горизонт глубже
   в самих остановках градиента · с полосой затемнения как сейчас.
   Титан (премиум: свой фон сцены как на бою — диагональный градиент + свет края, своё движение PremiumThemeMotion, без общих звёзд):
   HEAD-кадра в премиум-теме у Сверки нет — «сейчас» = реальный кадр 28.10 (край 1082, карточка наезжает), вариант из него без
   перекраски: вырезаны 29 строк чистого неба над кнопкой, низ на 1029. Светлое «А»: графит — ждём кадры HEAD, Титан — реальный
   светлый кадр 28.10. Служебного текста внутри телефонов нет. Журнал — [SH]. */
(() => {
  const LOG = '[SH]'; const RF = window.RF; const SP = window.__sp; const SA = window.SceneApproved; const SR = window.SceneRecolor;
  if (!SP || !SA || !RF || !SR) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, sa: !!SA, rf: !!RF, sr: !!SR })); return; }
  const THEMES = SP.THEMES; const W = 1080; const H = 2400; const DPX = 2.625;
  const q = new URLSearchParams(location.search);
  let AP = q.get('ap') === 'light' ? 'light' : 'dark'; let VIEW = q.get('view') === 'now' ? 'now' : 'variant'; let RULER = q.get('ruler') !== '0';
  let THEME = q.get('theme') === 'titanium' ? 'titanium' : 'graphite'; let BOTTOM = ['none', 'stops', 'band'].includes(q.get('bottom')) ? q.get('bottom') : 'none';
  /* герой варианта («Темы» 29.10): в готовом коде — картинка 160 dp, справа 20 dp, по центру сцены (эталон HERO_HOME); на кадре HEAD — 140 dp
     у края (−14 dp). 'now' — как на кадре, '160' — эталон, '200' — «громаднее» (константа HERO в HomeSceneStage.tsx) */
  let HERO = ['now', '160', '200'].includes(q.get('hero')) ? q.get('hero') : '160';
  const THEME_ID = { graphite: 'graphite', titanium: 'grad_full_titanium' };
  /* форма варианта — цифры «Тем» 29.10: край = высота обложки «Уроков» 392 dp (1029 px), скругление 28 dp, зазор 12 dp,
     тень boxShadow 0/9 dp, размытие 18 dp, чёрная, α .70 тёмное / .32 светлое */
  const V = { edge: 1029, radiusDp: 28, gapDp: 12, tab: 2140, shadow: { dark: { blur: 47, dy: 24, a: 0.70 }, light: { blur: 47, dy: 24, a: 0.32 } } };
  /* кадры: графит — HEAD от Сверки (docs/work/mockups/scene-height-2026-10-29 → assets/real/head_*; замер: край сцены 984, кнопка
     «Продолжить» 874…998 свисает за край на 14 px, карточка «Сегодня» с 1058, герой — книга 368 px в 721/294, подгонка по цвету ε 15);
     Титан — реальные кадры 28.10 из описи (край 1082/1081, карточка наезжает на сцену, чистое небо над кнопкой 819…868) */
  const KEEP_AVATAR = [{ cx: 953.5, cy: 226, r: 85 }, { cx: 1018, cy: 279, r: 31 }];
  const LESSONS = { file: 'assets/real/head_lessons_graphite_dark.png', status: 100, tab: 2140, edge: 1029 };
  const FRAMES = {
    graphite: {
      dark: { file: 'assets/real/head_home_graphite_dark.png', formula: true, sceneH: 984, cardTop: 1058, pillY1: 1000, hero: { x: 721, y: 294, size: 368, art: 'home_scene_continue' }, cards: [{ x0: 32, x1: 1048, r: 74 }], status: 100, tab: 2140, bgRow: 1040 },
      light: { file: 'assets/real/head_home_graphite_light.png', formula: true, sceneH: 984, cardTop: 1058, pillY1: 1000, hero: { x: 721, y: 294, size: 368, art: 'home_scene_continue' }, cards: [{ x0: 32, x1: 1048, r: 74 }], status: 100, tab: 2140, bgRow: 1040 },
    },
    titanium: {
      dark: { file: 'assets/real/scene_home_grad_full_titanium_dark.png', formula: false, sceneH: 1082, cardTop: 1058, band0: 830, cards: [{ x0: 32, x1: 1046, r: 74 }], status: 100, tab: 2140, bgSample: [[16, 1100], [1070, 1100]], old: '28.10' },
      light: { file: 'assets/real/scene_home_grad_full_titanium_light.png', formula: false, sceneH: 1081, cardTop: 1058, band0: 830, cards: [{ x0: 26, x1: 1052, r: 74 }], status: 100, tab: 2140, bgSample: [[16, 1100], [1070, 1100]], old: '28.10' },
    },
  };
  const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('не открылась ' + src)); im.src = src; });
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d', { willReadFrequently: true }) }; };
  const toLin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  /* небо варианта (только формульная тема): растр высоты Hs. Тёмное — слои «Глубокого неба» градиент → солнце → дымка → звёзды;
     звёзды: 70 формулы (верхние 40 %) + 102 нижних на 40…98 % высоты той же плотности (радиус .9…1.8, альфа .3….65 как у нижних звёзд в коде «Тем»);
     низ: 'none' — без vignette и без полосы (владелец), 'stops' — остановки ≥ .62 темнее ×(1−a) (Темы, вариант б),
     'band' — как сейчас в приложении (vignette + полоса стража .42→.62→низ). Светлое — формула «А» без scrim низа. */
  const skyRaster = (ap, Hs, bottom) => {
    const t = THEMES.graphite[ap];
    if (ap === 'dark') {
      const d = SA.approved(t, 'dark', 'home', W, Hs, {}); const raw = d.raw; const rawOf = [raw.zen, raw.mid, raw.hor, raw.hor, raw.gnd, raw.bottom];
      const r = SA.rng(7); const lower = []; for (let i = 0; i < 102; i += 1) /* 70 на 40 % высоты → та же плотность на нижних 58 % (в коде «Тем» 48 — ручка) */ { const x = r(); const y = 0.4 + r() * 0.58; const rad = 0.9 + r() * 0.9; const a = 0.3 + r() * 0.35; lower.push({ x, y, r: rad, a }); }
      const stars = d.stars.list.concat(lower);
      const paint = (g, dark) => {
        const gr = g.createLinearGradient(0, 0, 0, Hs); d.gradient.stops.forEach((s, i) => { const k = s.at >= 0.62 ? 1 - dark : 1; gr.addColorStop(s.at, rgba(rawOf[i].map((v) => v * k))); }); g.fillStyle = gr; g.fillRect(0, 0, W, Hs);
        const l = d.sun; g.save(); g.translate(l.cx * W, l.cy * Hs); g.scale(l.rx * W, l.ry * Hs); const lg = g.createRadialGradient(0, 0, 0, 0, 0, 1); lg.addColorStop(0, rgba(raw.lightC, l.a)); lg.addColorStop(1, rgba(raw.lightC, 0)); g.fillStyle = lg; g.fillRect(-1, -1, 2, 2); g.restore(); // guard-ok: альфа света на холсте макета, не баланс пользователя
        const hz = d.haze; const bg = g.createLinearGradient(0, Hs * hz.y0, 0, Hs * hz.y1); bg.addColorStop(0, rgba(raw.haze, 0)); bg.addColorStop(0.5, rgba(raw.haze, hz.a[1])); bg.addColorStop(1, rgba(raw.haze, 0)); g.fillStyle = bg; g.fillRect(0, Hs * hz.y0, W, Hs * (hz.y1 - hz.y0));
        stars.forEach((s) => { g.fillStyle = rgba([255, 255, 255], s.a); g.beginPath(); g.arc(s.x * W, s.y * Hs, s.r, 0, Math.PI * 2); g.fill(); });
      };
      // a полосы — как считает страж приложения на небе с vignette (у графита ≈ .24 по «Темам»)
      const { g: pg } = canvasOf(W, Hs); paint(pg, 0); const v = d.vignette; pg.save(); pg.translate(W / 2, Hs / 2); pg.scale(W * v.scale, Hs * v.scale); const vg = pg.createRadialGradient(0, 0, v.inner, 0, 0, 1); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${v.a})`); pg.fillStyle = vg; pg.fillRect(-2, -2, 4, 4); pg.restore(); // guard-ok
      const guard = SA.guardSky(pg, W, Hs); const a = Math.min(0.7, guard.aBottom + 0.04);
      const { c, g } = canvasOf(W, Hs);
      if (bottom === 'band') { g.drawImage(pg.canvas, 0, 0); } else paint(g, bottom === 'stops' ? a : 0);
      console.log(LOG, 'небо тёмное', JSON.stringify({ Hs, bottom, a: +a.toFixed(3), stars: stars.length, layers: bottom === 'band' ? ['gradient', 'sun', 'haze', 'stars', 'vignette', 'guard'] : ['gradient', 'sun', 'haze', 'stars'] })); // guard-ok
      return { data: g.getImageData(0, 0, W, Hs).data, stars, a };
    }
    const spec = Object.assign({}, SA.approved(t, 'light', 'home', W, Hs, {}).spec, { scrim: null }); const paint = SR.painter(spec, W, Hs); const d = new Uint8ClampedArray(W * Hs * 4);
    for (let y = 0; y < Hs; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; const c = paint(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    console.log(LOG, 'небо светлое А', JSON.stringify({ Hs, dropped: ['scrim'] })); // guard-ok
    return { data: d, stars: [], a: 0 };
  };
  /* модель «как сейчас» для перекраски — та же формула, что рисует приложение в HEAD на высоте кадра (тёмное: все слои с vignette
     и полосой стража; светлое: «А» со scrim) — по ней движок отличает фон от UI */
  const oldSky = (ap, Hs) => {
    const t = THEMES.graphite[ap]; const { g } = canvasOf(W, Hs);
    if (ap === 'dark') { const d = SA.approved(t, 'dark', 'home', W, Hs, {}); SA.drawSky(g, d, W, Hs); return g.getImageData(0, 0, W, Hs).data; }
    const paint = SR.painter(SA.approved(t, 'light', 'home', W, Hs, {}).spec, W, Hs); const d = new Uint8ClampedArray(W * Hs * 4);
    for (let y = 0; y < Hs; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; const c = paint(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return d;
  };
  const heroMask = async (h, ap) => { if (!h) return null; const im = await loadImg(`assets/v2art/hero512/${ap}/${h.art}.webp`); const { g } = canvasOf(h.size, h.size); g.drawImage(im, 0, 0, h.size, h.size); const d = g.getImageData(0, 0, h.size, h.size).data; const a = new Float32Array(h.size * h.size); for (let i = 0; i < a.length; i += 1) a[i] = (d[i * 4 + 3] / 255) * 0.96; return { alpha: a, x: h.x, y: h.y, w: h.size, h: h.size, im }; };
  const CACHE = {}; const cacheKey = () => `${THEME}|${AP}|${THEME === 'graphite' && AP === 'dark' ? BOTTOM : '-'}|${THEME === 'graphite' ? HERO : '-'}`;
  /* сборка варианта из кадра: формульная тема — перекраска сцены новым небом (UI/герой/заголовок на местах) и рост сцены вниз;
     премиум — вырез 29 строк чистого неба над кнопкой; дальше общее: зазор, карточка +3, углы 28 dp, тень, таббар на месте */
  const buildVariant = async (m, ap) => {
    const key = cacheKey(); if (CACHE[key]) return CACHE[key];
    const t0 = performance.now(); const edge = V.edge; const gap = Math.round(V.gapDp * DPX); const cardY = edge + gap; const shift = cardY - m.cardTop; const R = Math.round(V.radiusDp * DPX);
    const frame = await loadImg(m.file); const { c, g } = canvasOf(W, H); g.drawImage(frame, 0, 0, W, H);
    const { c: out, g: og } = canvasOf(W, H); let sky = null; let st = null; let delta = 0; let heroDrawn = null;
    if (m.formula) {
      sky = skyRaster(ap, edge, BOTTOM); const scene = g.getImageData(0, 0, W, m.sceneH); const hero = await heroMask(m.hero, ap); st = {};
      SR.recolor({ data: scene.data, W, H: m.sceneH, sceneH: m.sceneH, oldSpec: { image: { data: oldSky(ap, m.sceneH), width: W } }, newSpec: { image: { data: sky.data, width: W } }, radius: 0, hero, heroHide: HERO !== 'now', keep: KEEP_AVATAR, stats: st }); // герой кадра прячется, если рисуем его заново
      og.putImageData(scene, 0, 0);
      // сцена растёт вниз: строки sceneH…edge — новое небо; свисающий низ кнопки «Продолжить» (строки sceneH…pillY1) — белым по его яркости
      const ext = new ImageData(sky.data.slice(m.sceneH * W * 4, edge * W * 4), W, edge - m.sceneH); const fr = g.getImageData(0, m.sceneH, W, m.pillY1 - m.sceneH).data; const ed = ext.data;
      for (let yy = 0; yy < m.pillY1 - m.sceneH; yy += 1) for (let x = 0; x < W; x += 1) { const i = (yy * W + x) * 4; const lum = 0.2126 * fr[i] + 0.7152 * fr[i + 1] + 0.0722 * fr[i + 2]; const a = Math.max(0, Math.min(1, (lum - 48) / 207)); if (a > 0) { ed[i] = ed[i] + (255 - ed[i]) * a; ed[i + 1] = ed[i + 1] + (255 - ed[i + 1]) * a; ed[i + 2] = ed[i + 2] + (255 - ed[i + 2]) * a; } }
      og.putImageData(ext, 0, m.sceneH);
      // герой заново: картинка hero512 размером HERO dp, справа 20 dp, по центру новой высоты, прозрачность .96 (эталон HERO_HOME; так в коде «Тем»)
      if (HERO !== 'now' && hero && hero.im) { const dp = Number(HERO); const size = Math.round(dp * DPX); const hx = W - size - Math.round(20 * DPX); const hy = Math.round((edge - size) / 2); og.save(); og.globalAlpha = 0.96; og.drawImage(hero.im, hx, hy, size, size); og.restore(); heroDrawn = { dp, size, x: hx, y: hy }; }
    } else {
      delta = m.cardTop - edge; // 29: видимая сцена кадра кончается под карточкой (1058) → вырезаем столько строк чистого неба над кнопкой
      og.drawImage(c, 0, 0, W, m.band0, 0, 0, W, m.band0); og.drawImage(c, 0, m.band0 + delta, W, m.cardTop - m.band0 - delta, 0, m.band0, W, edge - m.band0);
    }
    // фон страницы под сценой: у кадра HEAD над карточкой есть ≥ зазора строк чистого фона (со свечением темы) — берём их; у старого кадра — градиент по полям у карточки
    const fromFrame = m.cardTop - m.sceneH >= gap; const bgL = m.bgSample ? m.bgSample.map(([x, y]) => g.getImageData(x, y, 1, 1).data) : null;
    const bgAt = (x, y) => (fromFrame ? Array.from(g.getImageData(x, m.bgRow || y, 1, 1).data).slice(0, 3) : [0, 1, 2].map((i) => bgL[0][i] + (bgL[1][i] - bgL[0][i]) * (x / W)));
    if (fromFrame) og.drawImage(c, 0, m.cardTop - gap, W, gap, 0, edge, W, gap); else { const gr = og.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, rgba(Array.from(bgL[0]).slice(0, 3))); gr.addColorStop(1, rgba(Array.from(bgL[1]).slice(0, 3))); og.fillStyle = gr; og.fillRect(0, edge, W, gap); }
    og.drawImage(c, 0, m.cardTop, W, V.tab - m.cardTop, 0, cardY, W, V.tab - m.cardTop); og.drawImage(c, 0, V.tab, W, H - V.tab, 0, V.tab, W, H - V.tab); // карточка и ниже на +shift, таббар на месте
    if (m.sceneH > m.cardTop) { // старый кадр: карточка наезжала на сцену — снаружи её скруглённого контура торчала сцена → фон страницы
      const cr = m.cards[0]; const rows = (m.sceneH - m.cardTop) + cr.r + 4; const z = og.getImageData(0, cardY, W, rows); const d = z.data;
      for (let yy = 0; yy < rows; yy += 1) for (let x = 0; x < W; x += 1) { const inX = x >= cr.x0 && x <= cr.x1; let inside = inX && yy >= cr.r; if (inX && !inside) { const cx = x < cr.x0 + cr.r ? cr.x0 + cr.r : x > cr.x1 - cr.r ? cr.x1 - cr.r : x; inside = Math.hypot(x - cx, yy - cr.r) <= cr.r; } if (!inside) { const col = bgAt(x, cardY + yy); const i = (yy * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
      og.putImageData(z, 0, cardY);
    }
    // углы 28 dp по краю: снаружи скруглённого контура — фон страницы; внутри не трогаем (там перекрашенная сцена, новое небо и концы кнопки
    // «Продолжить», которая на кадре HEAD доходит до x 54…1026 — по лупе первая сборка затирала их небом)
    { const zone = og.getImageData(0, edge - R, W, R); const zd = zone.data;
      for (let yy = 0; yy < R; yy += 1) { const y = edge - R + yy; for (let x = 0; x < W; x += 1) { if (x >= R && x < W - R) continue; const cx = x < W / 2 ? R : W - R; const cy = edge - R; if (Math.hypot(x - cx, y - cy) <= R) continue; const i = (yy * W + x) * 4; const col = bgAt(x, y); zd[i] = col[0]; zd[i + 1] = col[1]; zd[i + 2] = col[2]; } }
      og.putImageData(zone, 0, edge - R); }
    // тень под сценой (цифры «Тем»): только на фоне страницы — зазор и поля по бокам карточки
    const sh = V.shadow[ap]; const { c: shc, g: shg } = canvasOf(W, H); shg.shadowColor = `rgba(0,0,0,${sh.a})`; shg.shadowBlur = sh.blur; shg.shadowOffsetY = sh.dy; shg.fillStyle = '#000'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill();
    shg.globalCompositeOperation = 'destination-out'; shg.shadowColor = 'transparent'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill(); // оставить только саму тень
    const cr0 = m.cards[0]; og.save(); og.beginPath(); og.rect(0, edge, W, gap); og.rect(0, cardY, cr0.x0, 260); og.rect(cr0.x1, cardY, W - cr0.x1, 260); og.clip(); og.drawImage(shc, 0, 0); og.restore(); // guard-ok: альфа тени на холсте макета, не баланс пользователя
    const url = await new Promise((res, rej) => out.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
    const result = { url, stars: sky ? sky.stars : [], delta, cardY, st, a: sky ? sky.a : null, hero: heroDrawn };
    console.log(LOG, 'вариант собран', JSON.stringify({ theme: THEME, ap, bottom: BOTTOM, hero: m.formula ? HERO : 'кадр', heroDrawn, file: m.file, sceneH: m.sceneH, edge, delta, band0: m.band0 || null, gap, cardY, shift, radius: R, shadow: sh, fromFrame, ms: Math.round(performance.now() - t0), classes: st })); // guard-ok
    CACHE[key] = result; return result;
  };
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  /* мерцает каждая 8-я звезда (≈15 из 118, как в коде «Тем»: альфа .12…1, период 2.6…4 с туда-обратно, сдвиг старта); остальные — только на холсте */
  const starsHtml = (stars, edge) => stars.filter((s, i) => i % 8 === 0).map((s, i) => `<i class="sh-star" style="left:${(s.x * W * RF.K + 5).toFixed(1)}px;top:${RF.px(s.y * edge)}px;width:${Math.max(2, Math.round(s.r * 1.6))}px;height:${Math.max(2, Math.round(s.r * 1.6))}px;animation-delay:${(-((i * 0.53) % 4)).toFixed(2)}s;animation-duration:${(2.6 + (i % 8) * 0.2).toFixed(2)}s"></i>`).join('');
  /* движение премиум-темы Титан — как PremiumThemeMotion (premium_theme_motion_sources: два пятна, блик и уголёк, 38 с / ×1.3 туда-обратно);
     поверх кадра, где блик уже впечатан, — поэтому полупрозрачно и только осветляет */
  const pmHtml = () => '<div class="sh-pm"><i class="sh-pm-a"></i><i class="sh-pm-b"></i></div>';
  const render = async () => {
    const root = document.getElementById('sh'); if (!root) return; window.__shDone = false;
    const m = FRAMES[THEME][AP]; const premium = THEME === 'titanium';
    const ctl = (id, items, cur, key) => { const el = document.getElementById(id); if (el) el.innerHTML = items.map(([k, n]) => `<span class="chp${cur === k ? ' on' : ''}" data-${key}="${k}">${n}</span>`).join(''); };
    ctl('shView', [['now', 'Сейчас'], ['variant', 'Вариант']], VIEW, 'sh-view'); ctl('shAp', [['dark', 'Тёмная'], ['light', 'Светлая «А»']], AP, 'sh-ap'); ctl('shTheme', [['graphite', 'Графит'], ['titanium', 'Титан']], THEME, 'sh-theme');
    const bottomOn = THEME === 'graphite' && AP === 'dark'; const bw = document.getElementById('shBottomWrap'); if (bw) bw.style.display = bottomOn ? '' : 'none';
    ctl('shBottom', [['none', 'Без затемнения'], ['stops', 'Горизонт глубже'], ['band', 'С полосой (сейчас)']], BOTTOM, 'sh-bottom');
    const hw = document.getElementById('shHeroWrap'); if (hw) hw.style.display = THEME === 'graphite' ? '' : 'none'; ctl('shHero', [['now', 'Как сейчас'], ['160', '160 dp (эталон)'], ['200', '200 dp']], HERO, 'sh-hero'); ctl('shRuler', [['1', 'Линейка'], ['0', 'Без линейки']], RULER ? '1' : '0', 'sh-ruler');
    const files = window.__SH_FILES; const ok = files ? files.includes(m.file) : await loadImg(m.file).then(() => true, (e) => { console.log(LOG, 'кадра нет:', e.message); return false; }); // список наличных кадров пишет сборщик — без запроса к отсутствующему файлу
    if (!ok) { root.innerHTML = '<p class="sf-empty">Кадры ещё не сняты</p>'; window.__shDone = true; console.log(LOG, 'нет кадра', JSON.stringify({ theme: THEME, ap: AP, file: m.file })); return; }
    const lesPh = RF.phone({ src: LESSONS.file, exists: true, cls: 'sp-rf', status: LESSONS.status, tab: LESSONS.tab });
    const nowLabel = premium ? 'Главная · сейчас (кадр 28.10)' : 'Главная · сейчас'; const lesLabel = premium ? 'Уроки · сейчас (графит)' : 'Уроки · сейчас';
    let homeCol;
    if (VIEW === 'now') homeCol = col(nowLabel, RF.phone({ src: m.file, exists: true, cls: 'sp-rf', status: m.status, tab: m.tab, overlays: premium ? pmHtml() : '' }));
    else {
      let v; try { v = await buildVariant(m, AP); } catch (e) { console.log(LOG, 'вариант не собрался:', e.message, e.stack); root.innerHTML = '<p class="sf-empty">Сборка не удалась</p>'; window.__shDone = true; return; }
      const stars = AP === 'dark' && v.stars.length ? `<div class="sh-stars">${starsHtml(v.stars, V.edge)}</div>` : '';
      homeCol = col('Главная · вариант', RF.phone({ src: v.url, exists: true, cls: 'sp-rf sp-rf-will', status: m.status, tab: m.tab, overlays: stars + (premium ? pmHtml() : '') }));
    }
    root.innerHTML = `<div class="sp-real-row sh-row"><div class="phones sh-phones">${homeCol}${col(lesLabel, lesPh)}${RULER ? '<div class="sh-ruler" style="top:0"></div>' : ''}</div></div>`;
    if (RULER) { const ph = root.querySelector('.col:nth-child(2) .ph'); const body = ph && ph.querySelector('.rf-body'); const line = root.querySelector('.sh-ruler'); if (body && line) { const rowRect = root.querySelector('.sh-phones').getBoundingClientRect(); const b = body.getBoundingClientRect(); line.style.top = `${Math.round(b.top - rowRect.top + RF.px(LESSONS.edge))}px`; } }
    const u = new URL(location.href); u.searchParams.set('ap', AP); u.searchParams.set('view', VIEW); u.searchParams.set('theme', THEME); u.searchParams.set('bottom', BOTTOM); u.searchParams.set('hero', HERO); u.searchParams.set('ruler', RULER ? '1' : '0'); history.replaceState(null, '', u);
    window.__shDone = true; console.log(LOG, 'render', JSON.stringify({ theme: THEME, ap: AP, view: VIEW, bottom: BOTTOM, hero: HERO, ruler: RULER, file: m.file })); // guard-ok
  };
  document.body.addEventListener('click', (e) => {
    const v = e.target.closest('.chp[data-sh-view]'); if (v) { VIEW = v.dataset.shView; render(); return; }
    const a = e.target.closest('.chp[data-sh-ap]'); if (a) { AP = a.dataset.shAp; render(); return; }
    const t = e.target.closest('.chp[data-sh-theme]'); if (t) { THEME = t.dataset.shTheme; render(); return; }
    const b = e.target.closest('.chp[data-sh-bottom]'); if (b) { BOTTOM = b.dataset.shBottom; render(); return; }
    const h = e.target.closest('.chp[data-sh-hero]'); if (h) { HERO = h.dataset.shHero; render(); return; }
    const r = e.target.closest('.chp[data-sh-ruler]'); if (r) { RULER = r.dataset.shRuler === '1'; render(); }
  });
  render();
  window.__sh = { render, V, FRAMES, cache: CACHE, cacheKey, setView: (v) => { VIEW = v; return render(); }, setAp: (a) => { AP = a; return render(); }, setTheme: (t) => { THEME = t; return render(); }, setBottom: (b) => { BOTTOM = b; return render(); }, setHero: (h) => { HERO = h; return render(); } };
})();
