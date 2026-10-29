/* scene-home-h.app.js — «Сцена Главной: высота, край, герой» (владелец 29.10 через координатора; цифры формы — от «Тем»).
   Телефоны: Главная «сейчас» (кадр HEAD как есть) / «вариант», рядом «Уроки» — тоже «сейчас» / «вариант» той же высоты (у Тем высота
   обеих сцен — одна константа), линейка по краю сцены «Уроков».
   Переключатели: Высота — «412 dp — как раньше» (по умолчанию; край 1082 px — там, где раньше под сценой начиналась карточка «Сегодня»)
   / «392 dp — как «Уроки»» (1029 px) · Оформление · Тема Графит/Титан · Низ неба (графит, тёмное) · Герой 160/200/280 dp (графит) ·
   Линейка. Вариант: сцена — отдельный блок: край резкий, скругление 28 dp, тень 0/9 dp размытие 18 dp α .70/.32, зазор 12 dp до
   карточки «Сегодня» (карточка и всё ниже сдвигаются вниз, таббар на месте).
   Графит (формульная тема, кадр HEAD с краем 984): небо заново растром нужной высоты — без затемнения низа и без vignette, звёзды по всей
   площади (70 формулы + 102 нижних той же плотности; у «Тем» в коде пока 48), мерцает каждая 8-я; герой — картинка hero512 выбранного
   размера справа 20 dp по центру сцены, впечатан В НЕБО под текстом и кнопкой (владелец: «текст не спорит с иконками, может ложиться
   поверх»); UI и заголовок на своих местах, сцена растёт вниз под кнопкой. «Уроки»: тот же рецепт по формуле «Сезона», скругление 32 dp
   как на кадре, плитки ниже на ту же величину. Низ неба (предложение «Тем» для контраста белого текста): без затемнения · горизонт глубже
   в самих остановках градиента · с полосой затемнения как сейчас.
   Титан (премиум: свой фон как на бою, движение PremiumThemeMotion поверх, без общих звёзд): HEAD-кадра в премиум-теме нет — «сейчас» =
   реальный кадр 28.10 (край 1082, карточка наезжает), вариант из него без перекраски: 392 — вырез 29 строк чистого неба над кнопкой;
   412 — строки под карточкой достроены продолжением градиента. Светлое «А» графита — ждём кадры HEAD. Служебного текста внутри телефонов
   нет. Журнал — [SH]. */
(() => {
  const LOG = '[SH]'; const RF = window.RF; const SP = window.__sp; const SA = window.SceneApproved; const SR = window.SceneRecolor;
  if (!SP || !SA || !RF || !SR) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, sa: !!SA, rf: !!RF, sr: !!SR })); return; }
  const THEMES = SP.THEMES; const W = 1080; const H = 2400; const DPX = 2.625;
  const q = new URLSearchParams(location.search);
  let AP = q.get('ap') === 'light' ? 'light' : 'dark'; let VIEW = q.get('view') === 'now' ? 'now' : 'variant'; let RULER = q.get('ruler') !== '0';
  let THEME = q.get('theme') === 'titanium' ? 'titanium' : 'graphite'; let BOTTOM = ['none', 'stops', 'band'].includes(q.get('bottom')) ? q.get('bottom') : 'none';
  /* высота обеих сцен (слово владельца 29.10): 412 dp = 1082 px — как в утверждённом эталоне, край там, где раньше начиналась карточка;
     392 dp = 1029 px — как у «Уроков» сейчас. Герой: 160 — эталон HERO_HOME, 200/280 — «громадный» (владелец), по умолчанию 280 — «на всю сцену» */
  let HGT = q.get('h') === '392' ? '392' : '412'; let HERO = ['160', '200', '280'].includes(q.get('hero')) ? q.get('hero') : '280';
  const EDGE = { 412: 1082, 392: 1029 }; const edgeOf = () => EDGE[HGT];
  const V = { radiusDp: 28, gapDp: 12, tab: 2140, shadow: { dark: { blur: 47, dy: 24, a: 0.70 }, light: { blur: 47, dy: 24, a: 0.32 } } }; // цифры «Тем» 29.10
  /* кадры: графит — HEAD от Сверки (assets/real/head_*; замер: край неба 984, кнопка «Продолжить» 874…998 свисает за край на 14 px,
     карточка «Сегодня» с 1058, герой-книга 368 px в 721/294); Титан — реальные кадры 28.10 (край 1082/1081, карточка наезжает, чистое
     небо над кнопкой 819…868); «Уроки» HEAD — край 1029, скругление 32 dp, плитки с 1062 */
  const KEEP_AVATAR = [{ cx: 953.5, cy: 226, r: 85 }, { cx: 1018, cy: 279, r: 31 }];
  /* «Уроки» по оформлению: тёмное — кадр HEAD; светлое — кадр HEAD, когда снимут (head_lessons_graphite_light), пока — реальный светлый
     кадр 28.10 (край тот же 1029, плитки с 1061, скругление 32 dp) */
  const LESSONS_BY_AP = {
    dark: [{ file: 'assets/real/head_lessons_graphite_dark.png', sceneH: 1029, tilesTop: 1062, radiusDp: 32, status: 100, tab: 2140, bgRow: 1045 }],
    light: [{ file: 'assets/real/head_lessons_graphite_light.png', sceneH: 1029, tilesTop: 1062, radiusDp: 32, status: 100, tab: 2140, bgRow: 1045 }, { file: 'assets/real/scene_season_graphite_light.png', sceneH: 1029, tilesTop: 1061, radiusDp: 32, status: 100, tab: 2140, bgRow: 1045, old: '28.10' }],
  };
  const haveFile = (f) => { const files = window.__SH_FILES; return files ? files.includes(f) : true; };
  const lessonsOf = () => LESSONS_BY_AP[AP].find((m) => haveFile(m.file)) || LESSONS_BY_AP[AP][0]; let LESSONS = lessonsOf();
  const FRAMES = {
    graphite: {
      dark: { file: 'assets/real/head_home_graphite_dark.png', formula: true, sceneH: 984, cardTop: 1058, pillY1: 1000, hero: { x: 721, y: 294, size: 368, art: 'home_scene_continue' }, cards: [{ x0: 32, x1: 1048, r: 74 }], status: 100, tab: 2140, bgRow: 1040 },
      light: { file: 'assets/real/head_home_graphite_light.png', formula: true, sceneH: 984, cardTop: 1058, pillY1: 1000, hero: { x: 721, y: 294, size: 368, art: 'home_scene_continue' }, cards: [{ x0: 32, x1: 1048, r: 74 }], status: 100, tab: 2140, bgRow: 1040 },
    },
    titanium: {
      dark: { file: 'assets/real/scene_home_grad_full_titanium_dark.png', formula: false, sceneH: 1082, cardTop: 1058, band0: 830, oldRadiusDp: 32, cards: [{ x0: 32, x1: 1046, r: 74 }], status: 100, tab: 2140, bgSample: [[16, 1100], [1070, 1100]] },
      light: { file: 'assets/real/scene_home_grad_full_titanium_light.png', formula: false, sceneH: 1081, cardTop: 1058, band0: 830, oldRadiusDp: 32, cards: [{ x0: 26, x1: 1052, r: 74 }], status: 100, tab: 2140, bgSample: [[16, 1100], [1070, 1100]] },
    },
  };
  const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('не открылась ' + src)); im.src = src; });
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d', { willReadFrequently: true }) }; };
  /* небо варианта (формульная тема) для экрана screen ('home' | 'season') высоты Hs. Тёмное — градиент → солнце → дымка → звёзды
     (70 формулы + 102 нижних на 40…98 %, радиус .9…1.8, альфа .3….65); низ: 'none' — без vignette и полосы, 'stops' — остановки ≥ .62
     темнее ×(1−a) (Темы, б), 'band' — как сейчас (vignette + полоса стража). Светлое — «А» без scrim. */
  const skyRaster = (screen, ap, Hs, bottom) => {
    const t = THEMES.graphite[ap];
    if (ap === 'dark') {
      const d = SA.approved(t, 'dark', screen, W, Hs, {}); const raw = d.raw; const rawOf = [raw.zen, raw.mid, raw.hor, raw.hor, raw.gnd, raw.bottom];
      const r = SA.rng(7); const lower = []; for (let i = 0; i < 102; i += 1) { const x = r(); const y = 0.4 + r() * 0.58; const rad = 0.9 + r() * 0.9; const a = 0.3 + r() * 0.35; lower.push({ x, y, r: rad, a }); }
      const stars = d.stars.list.concat(lower);
      const paint = (g, dark) => {
        const gr = g.createLinearGradient(0, 0, 0, Hs); d.gradient.stops.forEach((s, i) => { const k = s.at >= 0.62 ? 1 - dark : 1; gr.addColorStop(s.at, rgba(rawOf[i].map((v) => v * k))); }); g.fillStyle = gr; g.fillRect(0, 0, W, Hs);
        const l = d.sun; g.save(); g.translate(l.cx * W, l.cy * Hs); g.scale(l.rx * W, l.ry * Hs); const lg = g.createRadialGradient(0, 0, 0, 0, 0, 1); lg.addColorStop(0, rgba(raw.lightC, l.a)); lg.addColorStop(1, rgba(raw.lightC, 0)); g.fillStyle = lg; g.fillRect(-1, -1, 2, 2); g.restore(); // guard-ok: альфа света на холсте макета, не баланс пользователя
        const hz = d.haze; const bg = g.createLinearGradient(0, Hs * hz.y0, 0, Hs * hz.y1); bg.addColorStop(0, rgba(raw.haze, 0)); bg.addColorStop(0.5, rgba(raw.haze, hz.a[1])); bg.addColorStop(1, rgba(raw.haze, 0)); g.fillStyle = bg; g.fillRect(0, Hs * hz.y0, W, Hs * (hz.y1 - hz.y0));
        stars.forEach((s) => { g.fillStyle = rgba([255, 255, 255], s.a); g.beginPath(); g.arc(s.x * W, s.y * Hs, s.r, 0, Math.PI * 2); g.fill(); });
      };
      const { g: pg } = canvasOf(W, Hs); paint(pg, 0); const v = d.vignette; pg.save(); pg.translate(W / 2, Hs / 2); pg.scale(W * v.scale, Hs * v.scale); const vg = pg.createRadialGradient(0, 0, v.inner, 0, 0, 1); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${v.a})`); pg.fillStyle = vg; pg.fillRect(-2, -2, 4, 4); pg.restore(); // guard-ok
      const guard = SA.guardSky(pg, W, Hs); const a = Math.min(0.7, guard.aBottom + 0.04); // a полосы — как считает страж приложения (графит ≈ .24)
      const { c, g } = canvasOf(W, Hs); if (bottom === 'band') g.drawImage(pg.canvas, 0, 0); else paint(g, bottom === 'stops' ? a : 0);
      console.log(LOG, 'небо тёмное', JSON.stringify({ screen, Hs, bottom, a: +a.toFixed(3), stars: stars.length })); // guard-ok
      return { c, g, stars, a };
    }
    const spec = Object.assign({}, SA.approved(t, 'light', screen, W, Hs, {}).spec, { scrim: null }); const paint = SR.painter(spec, W, Hs); const { c, g } = canvasOf(W, Hs); const id = g.createImageData(W, Hs); const d = id.data;
    for (let y = 0; y < Hs; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; const col = paint(x, y); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    g.putImageData(id, 0, 0); console.log(LOG, 'небо светлое А', JSON.stringify({ screen, Hs, dropped: ['scrim'] })); // guard-ok
    return { c, g, stars: [], a: 0 };
  };
  /* модель «как сейчас» для перекраски — формула, которую приложение рисует в HEAD на высоте кадра (тёмное: все слои с vignette и полосой;
     светлое: «А» со scrim); по ней движок отличает фон от UI */
  const oldSky = (screen, ap, Hs) => {
    const t = THEMES.graphite[ap]; const { g } = canvasOf(W, Hs);
    if (ap === 'dark') { const d = SA.approved(t, 'dark', screen, W, Hs, {}); SA.drawSky(g, d, W, Hs); return g.getImageData(0, 0, W, Hs).data; }
    const paint = SR.painter(SA.approved(t, 'light', screen, W, Hs, {}).spec, W, Hs); const d = new Uint8ClampedArray(W * Hs * 4);
    for (let y = 0; y < Hs; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; const c = paint(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return d;
  };
  const heroMask = async (h, ap) => { if (!h) return null; const im = await loadImg(`assets/v2art/hero512/${ap}/${h.art}.webp`); const { g } = canvasOf(h.size, h.size); g.drawImage(im, 0, 0, h.size, h.size); const d = g.getImageData(0, 0, h.size, h.size).data; const a = new Float32Array(h.size * h.size); for (let i = 0; i < a.length; i += 1) a[i] = (d[i * 4 + 3] / 255) * 0.96; return { alpha: a, x: h.x, y: h.y, w: h.size, h: h.size, im }; };
  /* продолжение градиента вниз: строки [y0, y1) из наклона последних k строк над ними (премиум-фон — гладкий градиент, шаг в 2 уровня не виден) */
  const extendRows = (g, y0, y1, k) => { const src = g.getImageData(0, y0 - k, W, k).data; const out = g.createImageData(W, y1 - y0); const d = out.data; for (let yy = 0; yy < y1 - y0; yy += 1) for (let x = 0; x < W; x += 1) { const i = (yy * W + x) * 4; const a = ((k - 1) * W + x) * 4; const b = x * 4; const t = (yy + 1) / k; for (let ch = 0; ch < 3; ch += 1) d[i + ch] = Math.max(0, Math.min(255, src[a + ch] + (src[a + ch] - src[b + ch]) * t)); d[i + 3] = 255; } g.putImageData(out, 0, y0); };
  const CACHE = {}; const homeKey = () => `home|${THEME}|${AP}|${HGT}|${THEME === 'graphite' && AP === 'dark' ? BOTTOM : '-'}|${THEME === 'graphite' ? HERO : '-'}`; const lessonsKey = () => `lessons|${AP}|${HGT}|${AP === 'dark' ? BOTTOM : '-'}`;
  /* вариант Главной: формульная тема — герой впечатан в новое небо, перекраска сцены (UI на местах), рост вниз под кнопкой; премиум — вырез
     (392) или достройка строк под карточкой (412); дальше общее: зазор, карточка ниже, углы 28 dp, тень, таббар на месте */
  const buildHome = async (m, ap) => {
    const key = homeKey(); if (CACHE[key]) return CACHE[key];
    const t0 = performance.now(); const edge = edgeOf(); const gap = Math.round(V.gapDp * DPX); const cardY = edge + gap; const shift = cardY - m.cardTop; const R = Math.round(V.radiusDp * DPX);
    const frame = await loadImg(m.file); const { c, g } = canvasOf(W, H); g.drawImage(frame, 0, 0, W, H);
    const { c: out, g: og } = canvasOf(W, H); let sky = null; let st = null; let delta = 0; let heroDrawn = null;
    if (m.formula) {
      sky = skyRaster('home', ap, edge, BOTTOM); const hero = await heroMask(m.hero, ap);
      // герой — в небо, под текст и кнопку (владелец 29.10): картинка hero512 размером HERO dp, справа 20 dp, по центру сцены, прозрачность .96
      if (hero && hero.im) { const dp = Number(HERO); const size = Math.round(dp * DPX); const hx = W - size - Math.round(20 * DPX); const hy = Math.round((edge - size) / 2); sky.g.save(); sky.g.globalAlpha = 0.96; sky.g.drawImage(hero.im, hx, hy, size, size); sky.g.restore(); heroDrawn = { dp, size, x: hx, y: hy }; }
      const skyData = sky.g.getImageData(0, 0, W, edge).data; const scene = g.getImageData(0, 0, W, m.sceneH); st = {};
      SR.recolor({ data: scene.data, W, H: m.sceneH, sceneH: m.sceneH, oldSpec: { image: { data: oldSky('home', ap, m.sceneH), width: W } }, newSpec: { image: { data: skyData, width: W } }, radius: 0, hero, heroHide: true, keep: KEEP_AVATAR, stats: st });
      og.putImageData(scene, 0, 0);
      // сцена растёт вниз: строки sceneH…edge — новое небо (с героем); свисающий низ кнопки «Продолжить» (строки sceneH…pillY1) — белым по его яркости
      const ext = new ImageData(skyData.slice(m.sceneH * W * 4, edge * W * 4), W, edge - m.sceneH); const fr = g.getImageData(0, m.sceneH, W, m.pillY1 - m.sceneH).data; const ed = ext.data;
      for (let yy = 0; yy < m.pillY1 - m.sceneH; yy += 1) for (let x = 0; x < W; x += 1) { const i = (yy * W + x) * 4; const lum = 0.2126 * fr[i] + 0.7152 * fr[i + 1] + 0.0722 * fr[i + 2]; const a = Math.max(0, Math.min(1, (lum - 48) / 207)); if (a > 0) { ed[i] = ed[i] + (255 - ed[i]) * a; ed[i + 1] = ed[i + 1] + (255 - ed[i + 1]) * a; ed[i + 2] = ed[i + 2] + (255 - ed[i + 2]) * a; } }
      og.putImageData(ext, 0, m.sceneH);
    } else if (edge <= m.cardTop) {
      delta = m.cardTop - edge; // 392: видимая сцена кадра кончается под карточкой (1058) → вырезаем столько строк чистого неба над кнопкой
      og.drawImage(c, 0, 0, W, m.band0, 0, 0, W, m.band0); og.drawImage(c, 0, m.band0 + delta, W, m.cardTop - m.band0 - delta, 0, m.band0, W, edge - m.band0);
    } else {
      // 412: сцена кадра та же высота, но строки под карточкой (cardTop…edge) на кадре закрыты ею — достраиваем продолжением градиента;
      // старые углы 32 dp кадра (строки от sceneH−84) сперва заливаем ближайшим пикселем сцены той же строки, чтобы новые 28 dp легли на сцену
      og.drawImage(c, 0, 0, W, m.cardTop, 0, 0, W, m.cardTop); const Ro = Math.round((m.oldRadiusDp || 32) * DPX); const y0 = m.sceneH - Ro; const z = og.getImageData(0, y0, W, m.cardTop - y0); const zd = z.data;
      for (let yy = 0; yy < m.cardTop - y0; yy += 1) { const inset = Ro - Math.sqrt(Math.max(0, Ro * Ro - yy * yy)); const xl = Math.ceil(inset) + 2; for (let x = 0; x < xl; x += 1) { const i = (yy * W + x) * 4; const s = (yy * W + xl) * 4; zd[i] = zd[s]; zd[i + 1] = zd[s + 1]; zd[i + 2] = zd[s + 2]; } for (let x = W - xl; x < W; x += 1) { const i = (yy * W + x) * 4; const s = (yy * W + (W - xl - 1)) * 4; zd[i] = zd[s]; zd[i + 1] = zd[s + 1]; zd[i + 2] = zd[s + 2]; } }
      og.putImageData(z, 0, y0); extendRows(og, m.cardTop, edge, 24);
    }
    // фон страницы под сценой: у кадра HEAD над карточкой есть ≥ зазора строк чистого фона (со свечением темы) — берём их; у старого кадра — градиент по полям
    const fromFrame = m.cardTop - m.sceneH >= gap; const bgL = m.bgSample ? m.bgSample.map(([x, y]) => g.getImageData(x, y, 1, 1).data) : null;
    const bgAt = (x, y) => (fromFrame ? Array.from(g.getImageData(x, m.bgRow || y, 1, 1).data).slice(0, 3) : [0, 1, 2].map((i) => bgL[0][i] + (bgL[1][i] - bgL[0][i]) * (x / W)));
    if (fromFrame) og.drawImage(c, 0, m.cardTop - gap, W, gap, 0, edge, W, gap); else { const gr = og.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, rgba(Array.from(bgL[0]).slice(0, 3))); gr.addColorStop(1, rgba(Array.from(bgL[1]).slice(0, 3))); og.fillStyle = gr; og.fillRect(0, edge, W, gap); }
    og.drawImage(c, 0, m.cardTop, W, V.tab - m.cardTop, 0, cardY, W, V.tab - m.cardTop); og.drawImage(c, 0, V.tab, W, H - V.tab, 0, V.tab, W, H - V.tab); // карточка и ниже на +shift, таббар на месте
    if (m.sceneH > m.cardTop) { // старый кадр: карточка наезжала на сцену — снаружи её скруглённого контура торчала сцена → фон страницы
      const cr = m.cards[0]; const rows = (m.sceneH - m.cardTop) + cr.r + 4; const z = og.getImageData(0, cardY, W, rows); const d = z.data;
      for (let yy = 0; yy < rows; yy += 1) for (let x = 0; x < W; x += 1) { const inX = x >= cr.x0 && x <= cr.x1; let inside = inX && yy >= cr.r; if (inX && !inside) { const cx = x < cr.x0 + cr.r ? cr.x0 + cr.r : x > cr.x1 - cr.r ? cr.x1 - cr.r : x; inside = Math.hypot(x - cx, yy - cr.r) <= cr.r; } if (!inside) { const col = bgAt(x, cardY + yy); const i = (yy * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
      og.putImageData(z, 0, cardY);
    }
    // углы 28 dp по краю: снаружи контура — фон страницы; внутри не трогаем (там сцена, небо и концы кнопки «Продолжить», x 54…1026)
    { const zone = og.getImageData(0, edge - R, W, R); const zd = zone.data;
      for (let yy = 0; yy < R; yy += 1) { const y = edge - R + yy; for (let x = 0; x < W; x += 1) { if (x >= R && x < W - R) continue; const cx = x < W / 2 ? R : W - R; if (Math.hypot(x - cx, y - (edge - R)) <= R) continue; const i = (yy * W + x) * 4; const col = bgAt(x, y); zd[i] = col[0]; zd[i + 1] = col[1]; zd[i + 2] = col[2]; } }
      og.putImageData(zone, 0, edge - R); }
    // тень под сценой (цифры «Тем»): только на фоне страницы — зазор и поля по бокам карточки
    const sh = V.shadow[ap]; const { c: shc, g: shg } = canvasOf(W, H); shg.shadowColor = `rgba(0,0,0,${sh.a})`; shg.shadowBlur = sh.blur; shg.shadowOffsetY = sh.dy; shg.fillStyle = '#000'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill();
    shg.globalCompositeOperation = 'destination-out'; shg.shadowColor = 'transparent'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill(); // оставить только саму тень
    const cr0 = m.cards[0]; og.save(); og.beginPath(); og.rect(0, edge, W, gap); og.rect(0, cardY, cr0.x0, 260); og.rect(cr0.x1, cardY, W - cr0.x1, 260); og.clip(); og.drawImage(shc, 0, 0); og.restore(); // guard-ok: альфа тени на холсте макета, не баланс пользователя
    const url = await new Promise((res, rej) => out.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
    const result = { url, edge, stars: sky ? sky.stars : [], delta, cardY, st, a: sky ? sky.a : null, hero: heroDrawn };
    console.log(LOG, 'Главная собрана', JSON.stringify({ theme: THEME, ap, h: HGT, bottom: BOTTOM, hero: m.formula ? HERO : 'кадр', heroDrawn, file: m.file, sceneH: m.sceneH, edge, delta, band0: m.band0 || null, gap, cardY, shift, radius: R, shadow: sh, fromFrame, ms: Math.round(performance.now() - t0), classes: st })); // guard-ok
    CACHE[key] = result; return result;
  };
  /* вариант «Уроков» той же высоты: небо по формуле «Сезона» (те же звёзды / низ), перекраска сцены кадра, рост вниз, скругление 32 dp как на
     кадре, плитки ниже на ту же величину (зазор кадра 33 px), таббар на месте; тени и героя у «Уроков» нет */
  const buildLessons = async (ap) => {
    const key = lessonsKey(); if (CACHE[key]) return CACHE[key];
    const t0 = performance.now(); const m = LESSONS; const edge = edgeOf(); const gapL = m.tilesTop - m.sceneH; const R = Math.round(m.radiusDp * DPX);
    const frame = await loadImg(m.file); const { c, g } = canvasOf(W, H); g.drawImage(frame, 0, 0, W, H); const { c: out, g: og } = canvasOf(W, H);
    let sky = null; let st = null;
    if (ap === 'dark') { // тёмное: небо по формуле «Сезона» (звёзды / низ как у Главной), перекраска кадра HEAD, рост вниз новым небом
      sky = skyRaster('season', ap, edge, BOTTOM); const skyData = sky.g.getImageData(0, 0, W, edge).data; const scene = g.getImageData(0, 0, W, m.sceneH); st = {};
      SR.recolor({ data: scene.data, W, H: m.sceneH, sceneH: m.sceneH, oldSpec: { image: { data: oldSky('season', ap, m.sceneH), width: W } }, newSpec: { image: { data: skyData, width: W } }, radius: R, fillCorners: true, stats: st });
      og.putImageData(scene, 0, 0); if (edge > m.sceneH) og.putImageData(new ImageData(skyData.slice(m.sceneH * W * 4, edge * W * 4), W, edge - m.sceneH), 0, m.sceneH);
    } else { // светлое: кадр 28.10 нарисован не формулой «А» — не перекрашиваем; рост вниз продолжением его же градиента, старые углы 32 dp залиты сценой
      og.drawImage(c, 0, 0, W, m.sceneH, 0, 0, W, m.sceneH);
      if (edge > m.sceneH) { const y0 = m.sceneH - R; const z = og.getImageData(0, y0, W, R); const zd = z.data; for (let yy = 0; yy < R; yy += 1) { const inset = R - Math.sqrt(Math.max(0, R * R - yy * yy)); const xl = Math.ceil(inset) + 2; for (let x = 0; x < xl; x += 1) { const i = (yy * W + x) * 4; const q = (yy * W + xl) * 4; zd[i] = zd[q]; zd[i + 1] = zd[q + 1]; zd[i + 2] = zd[q + 2]; } for (let x = W - xl; x < W; x += 1) { const i = (yy * W + x) * 4; const q = (yy * W + (W - xl - 1)) * 4; zd[i] = zd[q]; zd[i + 1] = zd[q + 1]; zd[i + 2] = zd[q + 2]; } } og.putImageData(z, 0, y0); extendRows(og, m.sceneH, edge, 24); }
    }
    og.drawImage(c, 0, m.sceneH, W, gapL, 0, edge, W, gapL); og.drawImage(c, 0, m.tilesTop, W, V.tab - m.tilesTop, 0, edge + gapL, W, V.tab - m.tilesTop); og.drawImage(c, 0, V.tab, W, H - V.tab, 0, V.tab, W, H - V.tab);
    const bgAt = (x) => Array.from(g.getImageData(x, m.bgRow, 1, 1).data).slice(0, 3);
    { const zone = og.getImageData(0, edge - R, W, R); const zd = zone.data; for (let yy = 0; yy < R; yy += 1) { const y = edge - R + yy; for (let x = 0; x < W; x += 1) { if (x >= R && x < W - R) continue; const cx = x < W / 2 ? R : W - R; if (Math.hypot(x - cx, y - (edge - R)) <= R) continue; const i = (yy * W + x) * 4; const col = bgAt(x); zd[i] = col[0]; zd[i + 1] = col[1]; zd[i + 2] = col[2]; } } og.putImageData(zone, 0, edge - R); }
    const url = await new Promise((res, rej) => out.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
    const result = { url, edge, stars: sky ? sky.stars : [], tilesY: edge + gapL, st };
    console.log(LOG, 'Уроки собраны', JSON.stringify({ ap, h: HGT, bottom: BOTTOM, file: m.file, way: ap === 'dark' ? 'перекраска формулой' : 'кадр + продолжение градиента', sceneH: m.sceneH, edge, tilesY: edge + gapL, radius: R, ms: Math.round(performance.now() - t0), classes: st })); // guard-ok
    CACHE[key] = result; return result;
  };
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  /* мерцает каждая 8-я звезда (как в коде «Тем»: альфа .12…1, период 2.6…4 с туда-обратно, сдвиг старта); остальные — только на холсте */
  const starsHtml = (stars, edge) => stars.filter((s, i) => i % 8 === 0).map((s, i) => `<i class="sh-star" style="left:${(s.x * W * RF.K + 5).toFixed(1)}px;top:${RF.px(s.y * edge)}px;width:${Math.max(2, Math.round(s.r * 1.6))}px;height:${Math.max(2, Math.round(s.r * 1.6))}px;animation-delay:${(-((i * 0.53) % 4)).toFixed(2)}s;animation-duration:${(2.6 + (i % 8) * 0.2).toFixed(2)}s"></i>`).join('');
  const pmHtml = () => '<div class="sh-pm"><i class="sh-pm-a"></i><i class="sh-pm-b"></i></div>'; // движение Титана поверх кадра (блик уже впечатан — полупрозрачно, только осветляет)
  const render = async () => {
    const root = document.getElementById('sh'); if (!root) return; window.__shDone = false;
    const m = FRAMES[THEME][AP]; const premium = THEME === 'titanium'; LESSONS = lessonsOf();
    const ctl = (id, items, cur, key) => { const el = document.getElementById(id); if (el) el.innerHTML = items.map(([k, n]) => `<span class="chp${cur === k ? ' on' : ''}" data-${key}="${k}">${n}</span>`).join(''); };
    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
    ctl('shView', [['now', 'Сейчас'], ['variant', 'Вариант']], VIEW, 'sh-view'); ctl('shHeight', [['412', '412 dp — как раньше'], ['392', '392 dp — как «Уроки»']], HGT, 'sh-h'); ctl('shAp', [['dark', 'Тёмная'], ['light', 'Светлая «А»']], AP, 'sh-ap'); ctl('shTheme', [['graphite', 'Графит'], ['titanium', 'Титан']], THEME, 'sh-theme');
    show('shBottomWrap', THEME === 'graphite' && AP === 'dark'); ctl('shBottom', [['none', 'Без затемнения'], ['stops', 'Горизонт глубже'], ['band', 'С полосой (сейчас)']], BOTTOM, 'sh-bottom');
    show('shHeroWrap', THEME === 'graphite'); ctl('shHero', [['160', '160 dp (эталон)'], ['200', '200 dp'], ['280', '280 dp']], HERO, 'sh-hero'); ctl('shRuler', [['1', 'Линейка'], ['0', 'Без линейки']], RULER ? '1' : '0', 'sh-ruler');
    const ok = window.__SH_FILES ? haveFile(m.file) && haveFile(LESSONS.file) : await loadImg(m.file).then(() => true, (e) => { console.log(LOG, 'кадра нет:', e.message); return false; }); // список наличных кадров пишет сборщик
    if (!ok) { root.innerHTML = '<p class="sf-empty">Кадры ещё не сняты</p>'; window.__shDone = true; console.log(LOG, 'нет кадра', JSON.stringify({ theme: THEME, ap: AP, file: m.file })); return; }
    const nowLabel = premium ? 'Главная · сейчас (кадр 28.10)' : 'Главная · сейчас'; const lesSuffix = (premium ? ' (графит' : '') + (LESSONS.old ? (premium ? ', кадр 28.10)' : ' (кадр 28.10)') : (premium ? ')' : ''));
    let homeCol; let lesCol; let rulerY = LESSONS.sceneH; let last = null;
    if (VIEW === 'now') { homeCol = col(nowLabel, RF.phone({ src: m.file, exists: true, cls: 'sp-rf', status: m.status, tab: m.tab, overlays: premium ? pmHtml() : '' })); lesCol = col('Уроки · сейчас' + lesSuffix, RF.phone({ src: LESSONS.file, exists: true, cls: 'sp-rf', status: LESSONS.status, tab: LESSONS.tab })); }
    else {
      let v; let lv; try { v = await buildHome(m, AP); lv = await buildLessons(AP); } catch (e) { console.log(LOG, 'вариант не собрался:', e.message, e.stack); root.innerHTML = '<p class="sf-empty">Сборка не удалась</p>'; window.__shDone = true; return; }
      const starsH = AP === 'dark' && v.stars.length ? `<div class="sh-stars">${starsHtml(v.stars, v.edge)}</div>` : ''; const starsL = AP === 'dark' && lv.stars.length ? `<div class="sh-stars">${starsHtml(lv.stars, lv.edge)}</div>` : '';
      homeCol = col('Главная · вариант', RF.phone({ src: v.url, exists: true, cls: 'sp-rf sp-rf-will', status: m.status, tab: m.tab, overlays: starsH + (premium ? pmHtml() : '') }));
      lesCol = col('Уроки · вариант' + lesSuffix, RF.phone({ src: lv.url, exists: true, cls: 'sp-rf sp-rf-will', status: LESSONS.status, tab: LESSONS.tab, overlays: starsL })); rulerY = lv.edge; last = { home: v, lessons: lv };
    }
    root.innerHTML = `<div class="sp-real-row sh-row"><div class="phones sh-phones">${homeCol}${lesCol}${RULER ? '<div class="sh-ruler" style="top:0"></div>' : ''}</div></div>`;
    if (RULER) { const ph = root.querySelector('.col:nth-child(2) .ph'); const body = ph && ph.querySelector('.rf-body'); const line = root.querySelector('.sh-ruler'); if (body && line) { const rowRect = root.querySelector('.sh-phones').getBoundingClientRect(); const b = body.getBoundingClientRect(); line.style.top = `${Math.round(b.top - rowRect.top + RF.px(rulerY))}px`; } }
    const u = new URL(location.href); u.searchParams.set('ap', AP); u.searchParams.set('view', VIEW); u.searchParams.set('theme', THEME); u.searchParams.set('h', HGT); u.searchParams.set('bottom', BOTTOM); u.searchParams.set('hero', HERO); u.searchParams.set('ruler', RULER ? '1' : '0'); history.replaceState(null, '', u);
    window.__sh.last = last; window.__shDone = true; console.log(LOG, 'render', JSON.stringify({ theme: THEME, ap: AP, view: VIEW, h: HGT, bottom: BOTTOM, hero: HERO, ruler: RULER, file: m.file })); // guard-ok
  };
  document.body.addEventListener('click', (e) => {
    const pick = (attr, prop) => { const el = e.target.closest(`.chp[data-${attr}]`); return el ? el.dataset[prop] : null; };
    const v = pick('sh-view', 'shView'); if (v) { VIEW = v; render(); return; }
    const h = pick('sh-h', 'shH'); if (h) { HGT = h; render(); return; }
    const a = pick('sh-ap', 'shAp'); if (a) { AP = a; render(); return; }
    const t = pick('sh-theme', 'shTheme'); if (t) { THEME = t; render(); return; }
    const b = pick('sh-bottom', 'shBottom'); if (b) { BOTTOM = b; render(); return; }
    const hr = pick('sh-hero', 'shHero'); if (hr) { HERO = hr; render(); return; }
    const r = pick('sh-ruler', 'shRuler'); if (r) { RULER = r === '1'; render(); }
  });
  window.__sh = { render, V, EDGE, FRAMES, LESSONS_BY_AP, cache: CACHE, homeKey, lessonsKey, last: null, setView: (v) => { VIEW = v; return render(); }, setAp: (a) => { AP = a; return render(); }, setTheme: (t) => { THEME = t; return render(); }, setBottom: (b) => { BOTTOM = b; return render(); }, setHero: (h) => { HERO = h; return render(); }, setHeight: (h) => { HGT = h; return render(); } };
  render();
})();
