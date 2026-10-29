/* scene-home-h.app.js — «Сцена Главной: высота, край, герой, ВСЕ темы» (владелец 29.10 через координатора; цифры — от «Тем»).
   Телефоны: Главная «сейчас» (кадр как есть) / «вариант», рядом «Уроки» той же высоты, линейка по краю сцены «Уроков».
   Переключатели: Высота — «Край под «Сегодня»» (по умолчанию: карточка «Сегодня» лежит поверх сцены, край 1182 px под её заголовком)
   / «412 dp, карточка поверх на 44 dp» (прочтение «Тем») / «412 dp — край над карточкой» / «392 dp — как «Уроки»» · Оформление ·
   Тема — все 29 тем таблицы «Тем» (23 обычных + 6 за награды со своим фоном Главной) · Герой 160/200/280 dp (обычные темы) · Линейка.
   Вариант: сцена — отдельный блок: край резкий, скругление 28 dp, тень 0/9 dp размытие 18 dp α .70/.32.
   Небо варианта — 1:1 с таблицей docs/work/handover/scene-all-themes-2026-10-29.json (window.__SKY): тёмное — один ровный тон skyTone на
   всю сцену, белый диагональный перелив 7 % слева сверху до 0 в (W, 0.7H), звёзды 70 + 102 (мерцает каждая 8-я); без любого потемнения
   вниз (владелец, крик 29.10); солнце таблицы не рисуем — владелец одобрил ровный тон. Светлое «А» — градиент top → skyTone до половины,
   дальше ровно, без звёзд. Темы за награды: на Главной свой фон как на бою (реальный кадр, без перекраски и без общих звёзд), «Уроки» —
   общим небом темы.
   Кадры «сейчас»: графит тёмное — HEAD 8f5b0acba от Сверки (край неба 984, кнопка свисает на 14 px, карточка с 1058, герой 368 px в
   721/294); остальные темы и оформления — реальные кадры 28.10 из описи (край 1082/1081, карточка наезжает с 1058, герой из описи);
   «Уроки» — HEAD (графит тёмное) или кадр 28.10 (графит светлое, Сумерки, Океан), у остальных тем — графитовый ради высоты (подписано).
   Герой варианта — картинка hero512 выбранного размера справа 20 dp, верх как на кадре (2.0.3), впечатан В НЕБО под текст и кнопку, без
   прозрачности; зона старого героя и его ореола на кадре закрашивается небом (иначе просвечивает призрак). Служебного текста внутри
   телефонов нет. Журнал — [SH]. */
(() => {
  const LOG = '[SH]'; const RF = window.RF; const SP = window.__sp; const DT = window.__dt; const SA = window.SceneApproved; const SR = window.SceneRecolor;
  const REAL = window.__REAL || {}; const SKY = window.__SKY || {}; const NAMES = window.__THEME_NAMES || {};
  if (!SP || !DT || !SA || !RF || !SR) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, dt: !!DT, sa: !!SA, rf: !!RF, sr: !!SR })); return; }
  const THEMES = SP.THEMES; const W = 1080; const H = 2400; const DPX = 2.625;
  const THEME_IDS = Object.keys(SKY); if (!THEME_IDS.length) { console.log(LOG, 'нет таблицы неба window.__SKY'); return; }
  const isPremium = (id) => !!(SKY[id] && SKY[id].dark && SKY[id].dark.premiumHome);
  const q = new URLSearchParams(location.search);
  let AP = q.get('ap') === 'light' ? 'light' : 'dark'; let VIEW = q.get('view') === 'now' ? 'now' : 'variant'; let RULER = q.get('ruler') !== '0';
  const themeParam = q.get('theme') === 'titanium' ? 'grad_full_titanium' : q.get('theme'); let THEME = THEME_IDS.includes(themeParam) ? themeParam : 'graphite';
  let HGT = ['under', 'temy', '412', '392'].includes(q.get('h')) ? q.get('h') : 'under'; let HERO = ['160', '200', '280'].includes(q.get('hero')) ? q.get('hero') : '200';
  const EDGE = { under: 1182, temy: 1082, 412: 1082, 392: 1029 }; const edgeOf = () => EDGE[HGT];
  const TEMY = { cardTop: 966 }; // прочтение «Тем»: карточка поднята до 368 dp (наезд 44 dp), кнопка упирается в её верх (UI кадра выше на 32 px)
  const V = { radiusDp: 28, gapDp: 12, tab: 2140, shadow: { dark: { blur: 47, dy: 24, a: 0.70 }, light: { blur: 47, dy: 24, a: 0.32 } } }; // цифры «Тем» 29.10
  const SHEEN = { a: 0.07, end: 0.7 }; const KEEP_AVATAR = [{ cx: 953.5, cy: 226, r: 85 }, { cx: 1018, cy: 279, r: 31 }];
  /* кадры: HEAD графита (тёмное) — явно; остальное — опись реальных кадров 28.10 (window.__REAL). Зона старого героя+ореола (clear): HEAD —
     герой 721…1089 × 294…662 и диск под ним; кадр 28.10 — герой 867…1088 × 295…516, ниже 610 — заголовок урока, его не трогаем */
  const HEAD_HOME = { file: 'assets/real/head_home_graphite_dark.png', head: true, formula: true, sceneH: 984, cardTop: 1058, pillY1: 1000, hero: { x: 721, y: 294, size: 368, art: 'home_scene_continue' }, cards: [{ x0: 32, x1: 1048, r: 74 }], status: 100, tab: 2140, bgRow: 1040, uiCut: [640, 672], clearZone: [{ x0: 600, y0: 250, x1: 1079, y1: 720 }], src: 'HEAD 8f5b0acba' };
  const HEAD_LESSONS = { file: 'assets/real/head_lessons_graphite_dark.png', head: true, theme: 'graphite', sceneH: 1029, tilesTop: 1062, radiusDp: 32, status: 100, tab: 2140, bgRow: 1045, src: 'HEAD 8f5b0acba' };
  const regOf = (screen, theme, ap) => Object.values(REAL).find((m) => m && m.ok !== false && m.screen === screen && m.theme === theme && m.ap === ap && (m.state || 'day') === 'day') || null;
  const STANDIN = { olive: 'sage' }; // у «Саванны» нет кадров 28.10 — подставной кадр «Мяты» (UI кадра её, небо из таблицы olive), подписано над телефоном
  const homeFrame = (theme, ap) => {
    if (theme === 'graphite' && ap === 'dark') return HEAD_HOME;
    let m = regOf('home', theme, ap); let standin = null; if (!m && STANDIN[theme]) { m = regOf('home', STANDIN[theme], ap); standin = STANDIN[theme]; } if (!m) return null; const c0 = m.cards && m.cards[0];
    return { file: `assets/real/${m.file}`, reg: m, formula: !isPremium(theme), sceneH: m.sceneH || 1082, cardTop: (c0 && c0.y0) || 1058, pillY1: m.sceneH || 1082, hero: m.hero ? { x: m.hero.x, y: m.hero.y, size: m.hero.size, art: m.hero.art || 'home_scene_continue' } : null, cards: [c0 ? { x0: c0.x0, x1: c0.x1, r: c0.r || 74 } : { x0: 32, x1: 1046, r: 74 }], status: m.status || 100, tab: m.tab || 2140, bgSample: [[16, 1100], [1070, 1100]], uiCut: [830, 862], band0: 830, oldRadiusDp: 32, clearZone: [{ x0: 760, y0: 250, x1: 1079, y1: 610 }], src: 'кадр 28.10', standin };
  };
  const lessonsFrame = (theme, ap) => {
    if (theme === 'graphite' && ap === 'dark') return HEAD_LESSONS;
    const pick = (t) => { const m = regOf('season', t, ap); return m ? { file: `assets/real/${m.file}`, reg: m, theme: t, sceneH: m.sceneH || 1029, tilesTop: 1061, radiusDp: 32, status: m.status || 100, tab: m.tab || 2140, bgRow: 1045, src: 'кадр 28.10' } : null; };
    return pick(theme) || (ap === 'dark' ? HEAD_LESSONS : pick('graphite')) || HEAD_LESSONS;
  };
  const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;
  const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('не открылась ' + src)); im.src = src; });
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d', { willReadFrequently: true }) }; };
  /* небо варианта по таблице «Тем»: тёмное — ровный skyTone + перелив + звёзды; светлое «А» — top → skyTone до половины, дальше ровно */
  const skyRaster = (theme, screen, ap, Hs) => {
    const t = (SKY[theme] || SKY.graphite)[ap] || SKY.graphite[ap]; const { c, g } = canvasOf(W, Hs);
    if (ap === 'dark') {
      const d = SA.approved(THEMES.graphite.dark, 'dark', screen, W, Hs, {}); const r = SA.rng(7); const lower = []; for (let i = 0; i < 102; i += 1) { const x = r(); const y = 0.4 + r() * 0.58; const rad = 0.9 + r() * 0.9; const a = 0.3 + r() * 0.35; lower.push({ x, y, r: rad, a }); }
      const stars = d.stars.list.concat(lower); const tone = t.skyTone || '#516582';
      g.fillStyle = tone; g.fillRect(0, 0, W, Hs); const sh = g.createLinearGradient(0, 0, W, Hs * SHEEN.end); sh.addColorStop(0, `rgba(255,255,255,${SHEEN.a})`); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, Hs); // guard-ok: перелив неба макета
      stars.forEach((st) => { g.fillStyle = rgba([255, 255, 255], st.a); g.beginPath(); g.arc(st.x * W, st.y * Hs, st.r, 0, Math.PI * 2); g.fill(); });
      console.log(LOG, 'небо тёмное', JSON.stringify({ theme, screen, Hs, tone, sheen: SHEEN, darkening: 'нет', stars: stars.length })); // guard-ok
      return { c, g, stars };
    }
    const top = t.top || t.skyTone || '#326290'; const mid = t.skyTone || top; const gr = g.createLinearGradient(0, 0, 0, Hs); gr.addColorStop(0, top); gr.addColorStop(0.5, mid); gr.addColorStop(1, mid); g.fillStyle = gr; g.fillRect(0, 0, W, Hs);
    console.log(LOG, 'небо светлое А', JSON.stringify({ theme, screen, Hs, top, skyTone: mid, flatFromHalf: true, stars: 0 })); // guard-ok
    return { c, g, stars: [] };
  };
  /* модель «как сейчас» для перекраски — чем кадр нарисован: HEAD — формула приложения (SA, все слои); кадры 28.10 — формула описи (DT) */
  const oldModel = (m, screen, ap, Hs) => {
    const { g } = canvasOf(W, Hs);
    if (m.head) { if (ap === 'dark') { const d = SA.approved(THEMES.graphite.dark, 'dark', screen, W, Hs, {}); SA.drawSky(g, d, W, Hs); return g.getImageData(0, 0, W, Hs).data; } const paint = SR.painter(SA.approved(THEMES.graphite.light, 'light', screen, W, Hs, {}).spec, W, Hs); const d = new Uint8ClampedArray(W * Hs * 4); for (let y = 0; y < Hs; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; const c = paint(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return d; }
    const paint = SR.painter(DT.oldSpecFor(m.reg), W, Hs); const d = new Uint8ClampedArray(W * Hs * 4); for (let y = 0; y < Hs; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; const c = paint(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return d;
  };
  const heroMask = async (h, ap) => { if (!h) return null; const im = await loadImg(`assets/v2art/hero512/${ap}/${h.art}.webp`); const { g } = canvasOf(h.size, h.size); g.drawImage(im, 0, 0, h.size, h.size); const d = g.getImageData(0, 0, h.size, h.size).data; const a = new Float32Array(h.size * h.size); for (let i = 0; i < a.length; i += 1) a[i] = (d[i * 4 + 3] / 255) * 0.96; return { alpha: a, x: h.x, y: h.y, w: h.size, h: h.size, im }; };
  const extendRows = (g, y0, y1, k) => { const src = g.getImageData(0, y0 - k, W, k).data; const out = g.createImageData(W, y1 - y0); const d = out.data; for (let yy = 0; yy < y1 - y0; yy += 1) for (let x = 0; x < W; x += 1) { const i = (yy * W + x) * 4; const a = ((k - 1) * W + x) * 4; const b = x * 4; const t = (yy + 1) / k; for (let ch = 0; ch < 3; ch += 1) d[i + ch] = Math.max(0, Math.min(255, src[a + ch] + (src[a + ch] - src[b + ch]) * t)); d[i + 3] = 255; } g.putImageData(out, 0, y0); };
  const fillOldCorners = (og, y0, y1, Ro) => { const z = og.getImageData(0, y0, W, y1 - y0); const zd = z.data; for (let yy = 0; yy < y1 - y0; yy += 1) { const inset = Ro - Math.sqrt(Math.max(0, Ro * Ro - yy * yy)); const xl = Math.ceil(inset) + 2; for (let x = 0; x < xl; x += 1) { const i = (yy * W + x) * 4; const s = (yy * W + xl) * 4; zd[i] = zd[s]; zd[i + 1] = zd[s + 1]; zd[i + 2] = zd[s + 2]; } for (let x = W - xl; x < W; x += 1) { const i = (yy * W + x) * 4; const s = (yy * W + (W - xl - 1)) * 4; zd[i] = zd[s]; zd[i + 1] = zd[s + 1]; zd[i + 2] = zd[s + 2]; } } og.putImageData(z, 0, y0); };
  const CACHE = {}; const homeKey = () => `home|${THEME}|${AP}|${HGT}|${isPremium(THEME) ? '-' : HERO}`; const lessonsKey = () => `lessons|${THEME}|${AP}|${HGT}`;
  /* вариант Главной: обычная тема — герой впечатан в новое небо, перекраска сцены кадра (UI на местах), вырез строк неба при сдвиге UI,
     рост вниз; тема за награды — кадр без перекраски: вырез (392) или достройка градиента (412/под карточкой); дальше общее */
  const buildHome = async (m, ap) => {
    const key = homeKey(); if (CACHE[key]) return CACHE[key];
    const t0 = performance.now(); const edge = edgeOf(); const gap = Math.round(V.gapDp * DPX); const over = HGT === 'under' || HGT === 'temy'; const cardY = HGT === 'temy' ? TEMY.cardTop : over ? m.cardTop : edge + gap; const shift = cardY - m.cardTop; const R = Math.round(V.radiusDp * DPX);
    const visible = Math.min(m.sceneH, m.cardTop); const cut = HGT === 'temy' ? 32 : Math.max(0, visible - edge); const cut0 = m.uiCut[0]; // вырез неба над кнопкой/заголовком: UI кадра выше на cut
    const frame = await loadImg(m.file); const { c, g } = canvasOf(W, H); g.drawImage(frame, 0, 0, W, H);
    const { c: out, g: og } = canvasOf(W, H); let sky = null; let st = null; let heroDrawn = null;
    if (m.formula) {
      sky = skyRaster(THEME, 'home', ap, edge); const hero = await heroMask(m.hero, ap);
      if (hero && hero.im) { const dp = Number(HERO); const size = Math.round(dp * DPX); const hx0 = W - size - Math.round(20 * DPX); const hy = m.hero.y; sky.g.save(); sky.g.globalAlpha = 1; sky.g.drawImage(hero.im, hx0, hy, size, size); sky.g.restore(); heroDrawn = { dp, size, x: hx0, y: hy }; } // герой в небо, под текст; без прозрачности
      const skyData = sky.g.getImageData(0, 0, W, edge).data; const scene = g.getImageData(0, 0, W, m.sceneH); st = {};
      let mapped = skyData; if (cut) { mapped = new Uint8ClampedArray(W * m.sceneH * 4); for (let y = 0; y < m.sceneH; y += 1) { const sy = Math.min(edge - 1, y < cut0 + cut ? y : y - cut); mapped.set(skyData.subarray(sy * W * 4, (sy + 1) * W * 4), y * W * 4); } } // guard-ok: Uint8ClampedArray.set растра, не запись данных
      SR.recolor({ data: scene.data, W, H: m.sceneH, sceneH: m.sceneH, oldSpec: { image: { data: oldModel(m, 'home', ap, m.sceneH), width: W } }, newSpec: { image: { data: mapped, width: W } }, radius: 0, hero, heroHide: true, keep: KEEP_AVATAR, clear: m.clearZone, stats: st });
      const { c: sc, g: sg } = canvasOf(W, m.sceneH); sg.putImageData(scene, 0, 0); const top = m.sceneH - cut;
      og.drawImage(sc, 0, 0, W, cut0, 0, 0, W, cut0); if (cut) og.drawImage(sc, 0, cut0 + cut, W, m.sceneH - cut0 - cut, 0, cut0, W, m.sceneH - cut0 - cut); else og.drawImage(sc, 0, cut0, W, m.sceneH - cut0, 0, cut0, W, m.sceneH - cut0);
      if (m.sceneH > m.cardTop) { const a0 = m.cardTop - cut; const a1 = Math.min(top, edge); if (a1 > a0) og.putImageData(new ImageData(skyData.slice(a0 * W * 4, a1 * W * 4), W, a1 - a0), 0, a0); } // кадр 28.10: под верхом старой карточки — чистое небо
      if (edge > top) { const ext = new ImageData(skyData.slice(top * W * 4, edge * W * 4), W, edge - top); const pr = m.pillY1 - m.sceneH; if (pr > 0) { const fr = g.getImageData(0, m.sceneH, W, pr).data; const ed = ext.data; for (let yy = 0; yy < pr; yy += 1) for (let x = 0; x < W; x += 1) { const i = (yy * W + x) * 4; const lum = 0.2126 * fr[i] + 0.7152 * fr[i + 1] + 0.0722 * fr[i + 2]; const a = Math.max(0, Math.min(1, (lum - 48) / 207)); if (a > 0) { ed[i] += (255 - ed[i]) * a; ed[i + 1] += (255 - ed[i + 1]) * a; ed[i + 2] += (255 - ed[i + 2]) * a; } } } og.putImageData(ext, 0, top); } // рост вниз; свисающий низ кнопки HEAD — белым
    } else if (edge <= m.cardTop && !cut) {
      og.drawImage(c, 0, 0, W, edge, 0, 0, W, edge);
    } else if (edge <= m.cardTop) { // 392: видимая сцена кончается под карточкой → вырез cut строк чистого неба над кнопкой
      og.drawImage(c, 0, 0, W, cut0, 0, 0, W, cut0); og.drawImage(c, 0, cut0 + cut, W, m.cardTop - cut0 - cut, 0, cut0, W, edge - cut0);
    } else { // 412 / под карточкой / прочтение «Тем»: UI выше на cut (0 или 32), старые углы 32 dp залиты сценой, строки под карточкой достроены градиентом
      og.drawImage(c, 0, 0, W, cut0, 0, 0, W, cut0); og.drawImage(c, 0, cut0 + cut, W, m.cardTop - cut0 - cut, 0, cut0, W, m.cardTop - cut0 - cut); const Ro = Math.round((m.oldRadiusDp || 32) * DPX); fillOldCorners(og, m.sceneH - Ro - cut, m.cardTop - cut, Ro); extendRows(og, m.cardTop - cut, edge, 24);
    }
    const fromFrame = m.cardTop - m.sceneH >= gap; const bgL = m.bgSample ? m.bgSample.map(([x, y]) => g.getImageData(x, y, 1, 1).data) : null;
    const bgAt = (x, y) => (over || m.head ? Array.from(g.getImageData(16, Math.min(H - 1, m.bgRow && !over ? m.bgRow : y), 1, 1).data).slice(0, 3) : [0, 1, 2].map((i) => bgL[0][i] + (bgL[1][i] - bgL[0][i]) * (x / W))); // левое поле той же строки для обоих углов
    if (over) { /* зазора нет */ } else if (fromFrame) og.drawImage(c, 0, m.cardTop - gap, W, gap, 0, edge, W, gap); else { const gr = og.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, rgba(Array.from(bgL[0]).slice(0, 3))); gr.addColorStop(1, rgba(Array.from(bgL[1]).slice(0, 3))); og.fillStyle = gr; og.fillRect(0, edge, W, gap); }
    const cr = m.cards[0];
    if (over) { // карточка поверх сцены: до края — внутри её скруглённого контура, ниже края — кадр (поднятый на |shift| при temy; полоса до таббара — тело карточки и поля)
      og.save(); og.beginPath(); og.roundRect(cr.x0, cardY, cr.x1 - cr.x0, edge - cardY + cr.r, [cr.r, cr.r, 0, 0]); og.clip(); og.drawImage(c, 0, m.cardTop, W, edge - cardY, 0, cardY, W, edge - cardY); og.restore();
      if (shift < 0) { og.drawImage(c, 0, edge - shift, W, V.tab - edge + shift, 0, edge, W, V.tab - edge + shift); const yb = V.tab + shift - 1; const cc = g.getImageData(1000, yb - shift, 1, 1).data; const bb = g.getImageData(16, yb - shift, 1, 1).data; og.fillStyle = rgba([bb[0], bb[1], bb[2]]); og.fillRect(0, V.tab + shift, W, -shift); og.fillStyle = rgba([cc[0], cc[1], cc[2]]); og.fillRect(cr.x0, V.tab + shift, cr.x1 - cr.x0, -shift); og.drawImage(c, 0, V.tab, W, H - V.tab, 0, V.tab, W, H - V.tab); }
      else og.drawImage(c, 0, edge, W, H - edge, 0, edge, W, H - edge);
      { const rows = Math.min(300, V.tab - edge); const z = og.getImageData(0, edge, W, rows); const d = z.data; for (let yy = 0; yy < rows; yy += 1) for (let x = cr.x1; x < W; x += 1) { const i = (yy * W + x) * 4; const q = (yy * W + (W - 1 - x)) * 4; d[i] = d[q]; d[i + 1] = d[q + 1]; d[i + 2] = d[q + 2]; } og.putImageData(z, 0, edge); } // поля ниже края зеркальны (правое поле кадра HEAD светлее)
    } else { og.drawImage(c, 0, m.cardTop, W, V.tab - m.cardTop, 0, cardY, W, V.tab - m.cardTop); og.drawImage(c, 0, V.tab, W, H - V.tab, 0, V.tab, W, H - V.tab); }
    if (!over && m.sceneH > m.cardTop) { // кадр 28.10: карточка наезжала на сцену — снаружи её контура торчала сцена → фон страницы
      const rows = (m.sceneH - m.cardTop) + cr.r + 4; const z = og.getImageData(0, cardY, W, rows); const d = z.data;
      for (let yy = 0; yy < rows; yy += 1) for (let x = 0; x < W; x += 1) { const inX = x >= cr.x0 && x <= cr.x1; let inside = inX && yy >= cr.r; if (inX && !inside) { const cx = x < cr.x0 + cr.r ? cr.x0 + cr.r : x > cr.x1 - cr.r ? cr.x1 - cr.r : x; inside = Math.hypot(x - cx, yy - cr.r) <= cr.r; } if (!inside) { const col = bgAt(x, cardY + yy); const i = (yy * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
      og.putImageData(z, 0, cardY);
    }
    { const zone = og.getImageData(0, edge - R, W, R); const zd = zone.data; for (let yy = 0; yy < R; yy += 1) { const y = edge - R + yy; for (let x = 0; x < W; x += 1) { if (x >= R && x < W - R) continue; const cx = x < W / 2 ? R : W - R; if (Math.hypot(x - cx, y - (edge - R)) <= R) continue; const i = (yy * W + x) * 4; const col = bgAt(x, y); zd[i] = col[0]; zd[i + 1] = col[1]; zd[i + 2] = col[2]; } } og.putImageData(zone, 0, edge - R); } // углы 28 dp: снаружи — фон
    const sh = V.shadow[ap]; const { c: shc, g: shg } = canvasOf(W, H); shg.shadowColor = `rgba(0,0,0,${sh.a})`; shg.shadowBlur = sh.blur; shg.shadowOffsetY = sh.dy; shg.fillStyle = '#000'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill();
    shg.globalCompositeOperation = 'destination-out'; shg.shadowColor = 'transparent'; shg.beginPath(); shg.roundRect(0, -300, W, edge + 300, [0, 0, R, R]); shg.fill();
    og.save(); og.beginPath(); if (over) { og.rect(0, edge, cr.x0, 260); og.rect(cr.x1, edge, W - cr.x1, 260); } else { og.rect(0, edge, W, gap); og.rect(0, cardY, cr.x0, 260); og.rect(cr.x1, cardY, W - cr.x1, 260); } og.clip(); og.drawImage(shc, 0, 0); og.restore(); // guard-ok: тень блока на фоне страницы
    const url = await new Promise((res, rej) => out.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
    const result = { url, edge, over, stars: sky ? sky.stars : [], cardY, cut, st, hero: heroDrawn };
    console.log(LOG, 'Главная собрана', JSON.stringify({ theme: THEME, ap, h: HGT, over, cut, cardY, hero: m.formula ? HERO : 'кадр', heroDrawn, file: m.file, src: m.src, sceneH: m.sceneH, edge, radius: R, shadow: sh, ms: Math.round(performance.now() - t0), classes: st })); // guard-ok
    CACHE[key] = result; return result;
  };
  /* вариант «Уроков» той же высоты: небо темы (ровный тон / «А»), перекраска кадра, рост вниз, скругление 32 dp как на кадре, плитки ниже */
  const buildLessons = async (m, ap) => {
    const key = lessonsKey(); if (CACHE[key]) return CACHE[key];
    const t0 = performance.now(); const edge = edgeOf(); const gapL = m.tilesTop - m.sceneH; const R = Math.round(m.radiusDp * DPX);
    const frame = await loadImg(m.file); const { c, g } = canvasOf(W, H); g.drawImage(frame, 0, 0, W, H); const { c: out, g: og } = canvasOf(W, H);
    const sky = skyRaster(THEME, 'season', ap, edge); const skyData = sky.g.getImageData(0, 0, W, edge).data; const scene = g.getImageData(0, 0, W, m.sceneH); const st = {};
    SR.recolor({ data: scene.data, W, H: m.sceneH, sceneH: m.sceneH, oldSpec: { image: { data: oldModel(m, 'season', ap, m.sceneH), width: W } }, newSpec: { image: { data: skyData, width: W } }, radius: R, fillCorners: true, stats: st });
    og.putImageData(scene, 0, 0); if (edge > m.sceneH) og.putImageData(new ImageData(skyData.slice(m.sceneH * W * 4, edge * W * 4), W, edge - m.sceneH), 0, m.sceneH);
    og.drawImage(c, 0, m.sceneH, W, gapL, 0, edge, W, gapL); og.drawImage(c, 0, m.tilesTop, W, V.tab - m.tilesTop, 0, edge + gapL, W, V.tab - m.tilesTop); og.drawImage(c, 0, V.tab, W, H - V.tab, 0, V.tab, W, H - V.tab);
    const bgAt = () => Array.from(g.getImageData(16, m.bgRow, 1, 1).data).slice(0, 3);
    { const zone = og.getImageData(0, edge - R, W, R); const zd = zone.data; for (let yy = 0; yy < R; yy += 1) { const y = edge - R + yy; for (let x = 0; x < W; x += 1) { if (x >= R && x < W - R) continue; const cx = x < W / 2 ? R : W - R; if (Math.hypot(x - cx, y - (edge - R)) <= R) continue; const i = (yy * W + x) * 4; const col = bgAt(); zd[i] = col[0]; zd[i + 1] = col[1]; zd[i + 2] = col[2]; } } og.putImageData(zone, 0, edge - R); }
    const url = await new Promise((res, rej) => out.toBlob((b) => (b ? res(URL.createObjectURL(b)) : rej(new Error('toBlob пуст'))), 'image/png'));
    const result = { url, edge, stars: sky.stars, tilesY: edge + gapL, st };
    console.log(LOG, 'Уроки собраны', JSON.stringify({ theme: THEME, frameTheme: m.theme, ap, h: HGT, file: m.file, src: m.src, sceneH: m.sceneH, edge, tilesY: edge + gapL, radius: R, ms: Math.round(performance.now() - t0), classes: st })); // guard-ok
    CACHE[key] = result; return result;
  };
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  const starsHtml = (stars, edge) => stars.filter((s, i) => i % 8 === 0).map((s, i) => `<i class="sh-star" style="left:${(s.x * W * RF.K + 5).toFixed(1)}px;top:${RF.px(s.y * edge)}px;width:${Math.max(2, Math.round(s.r * 1.6))}px;height:${Math.max(2, Math.round(s.r * 1.6))}px;animation-delay:${(-((i * 0.53) % 4)).toFixed(2)}s;animation-duration:${(2.6 + (i % 8) * 0.2).toFixed(2)}s"></i>`).join('');
  const pmHtml = () => '<div class="sh-pm"><i class="sh-pm-a"></i><i class="sh-pm-b"></i></div>'; // движение Титана поверх кадра
  const themeName = (id) => (NAMES[id] || (THEMES[id] && THEMES[id].name) || id) + (isPremium(id) ? ' ★' : '');
  const render = async () => {
    const root = document.getElementById('sh'); if (!root) return; window.__shDone = false;
    const premium = isPremium(THEME); const m = homeFrame(THEME, AP); const lm = lessonsFrame(THEME, AP);
    const ctl = (id, items, cur, key) => { const el = document.getElementById(id); if (el) el.innerHTML = items.map(([k, n]) => `<span class="chp${cur === k ? ' on' : ''}" data-${key}="${k}">${n}</span>`).join(''); };
    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
    ctl('shView', [['now', 'Сейчас'], ['variant', 'Вариант']], VIEW, 'sh-view'); ctl('shHeight', [['under', 'Край под «Сегодня»'], ['temy', '412 dp, карточка поверх на 44 dp'], ['412', '412 dp — край над карточкой'], ['392', '392 dp — как «Уроки»']], HGT, 'sh-h'); ctl('shAp', [['dark', 'Тёмная'], ['light', 'Светлая «А»']], AP, 'sh-ap');
    const sel = document.getElementById('shThemeSel'); if (sel) { if (!sel.options.length) sel.innerHTML = THEME_IDS.map((id) => `<option value="${id}">${themeName(id)}</option>`).join(''); sel.value = THEME; }
    show('shBottomWrap', false); show('shHeroWrap', !premium); ctl('shHero', [['160', '160 dp (эталон)'], ['200', '200 dp'], ['280', '280 dp']], HERO, 'sh-hero'); ctl('shRuler', [['1', 'Линейка'], ['0', 'Без линейки']], RULER ? '1' : '0', 'sh-ruler');
    if (!m) { root.innerHTML = '<p class="sf-empty">Кадры ещё не сняты</p>'; window.__shDone = true; console.log(LOG, 'нет кадра', JSON.stringify({ theme: THEME, ap: AP })); return; }
    const nowLabel = 'Главная · сейчас' + (m.head ? '' : m.standin ? ` (кадр 28.10 темы «${NAMES[m.standin] || m.standin}»)` : ' (кадр 28.10)'); const lesNote = (lm.theme !== THEME ? ' (графит, для высоты' : ' (') + (lm.head ? '' : (lm.theme !== THEME ? ', ' : '') + 'кадр 28.10') + ')'; const lesSuffix = lesNote === ' ()' ? '' : lesNote;
    let homeCol; let lesCol; let rulerY = lm.sceneH; let last = null;
    if (VIEW === 'now') { homeCol = col(nowLabel, RF.phone({ src: m.file, exists: true, cls: 'sp-rf', status: m.status, tab: m.tab, overlays: THEME === 'grad_full_titanium' ? pmHtml() : '' })); lesCol = col('Уроки · сейчас' + lesSuffix, RF.phone({ src: lm.file, exists: true, cls: 'sp-rf', status: lm.status, tab: lm.tab })); }
    else {
      let v; let lv; try { v = await buildHome(m, AP); lv = await buildLessons(lm, AP); } catch (e) { console.log(LOG, 'вариант не собрался:', e.message, e.stack); root.innerHTML = '<p class="sf-empty">Сборка не удалась</p>'; window.__shDone = true; return; }
      const starsH = AP === 'dark' && v.stars.length ? `<div class="sh-stars">${starsHtml(v.stars, v.edge)}</div>` : ''; const starsL = AP === 'dark' && lv.stars.length ? `<div class="sh-stars">${starsHtml(lv.stars, lv.edge)}</div>` : '';
      homeCol = col('Главная · вариант' + (m.standin ? ` (на кадре «${NAMES[m.standin] || m.standin}»)` : ''), RF.phone({ src: v.url, exists: true, cls: 'sp-rf sp-rf-will', status: m.status, tab: m.tab, overlays: starsH + (THEME === 'grad_full_titanium' ? pmHtml() : '') }));
      lesCol = col('Уроки · вариант' + lesSuffix, RF.phone({ src: lv.url, exists: true, cls: 'sp-rf sp-rf-will', status: lm.status, tab: lm.tab, overlays: starsL })); rulerY = lv.edge; last = { home: v, lessons: lv };
    }
    root.innerHTML = `<div class="sp-real-row sh-row"><div class="phones sh-phones">${homeCol}${lesCol}${RULER ? '<div class="sh-ruler" style="top:0"></div>' : ''}</div></div>`;
    if (RULER) { const ph = root.querySelector('.col:nth-child(2) .ph'); const body = ph && ph.querySelector('.rf-body'); const line = root.querySelector('.sh-ruler'); if (body && line) { const rowRect = root.querySelector('.sh-phones').getBoundingClientRect(); const b = body.getBoundingClientRect(); line.style.top = `${Math.round(b.top - rowRect.top + RF.px(rulerY))}px`; } }
    const u = new URL(location.href); u.searchParams.set('ap', AP); u.searchParams.set('view', VIEW); u.searchParams.set('theme', THEME); u.searchParams.set('h', HGT); u.searchParams.set('hero', HERO); u.searchParams.set('ruler', RULER ? '1' : '0'); u.searchParams.delete('bottom'); history.replaceState(null, '', u);
    window.__sh.last = last; window.__shDone = true; console.log(LOG, 'render', JSON.stringify({ theme: THEME, ap: AP, view: VIEW, h: HGT, hero: HERO, ruler: RULER, home: m.file, lessons: lm.file })); // guard-ok
  };
  document.body.addEventListener('click', (e) => {
    const pick = (attr, prop) => { const el = e.target.closest(`.chp[data-${attr}]`); return el ? el.dataset[prop] : null; };
    const v = pick('sh-view', 'shView'); if (v) { VIEW = v; render(); return; }
    const h = pick('sh-h', 'shH'); if (h) { HGT = h; render(); return; }
    const a = pick('sh-ap', 'shAp'); if (a) { AP = a; render(); return; }
    const hr = pick('sh-hero', 'shHero'); if (hr) { HERO = hr; render(); return; }
    const r = pick('sh-ruler', 'shRuler'); if (r) { RULER = r === '1'; render(); }
  });
  document.body.addEventListener('change', (e) => { if (e.target && e.target.id === 'shThemeSel') { THEME = e.target.value; render(); } });
  window.__sh = { render, V, EDGE, THEME_IDS, homeFrame, lessonsFrame, cache: CACHE, homeKey, lessonsKey, last: null, setView: (v) => { VIEW = v; return render(); }, setAp: (a) => { AP = a; return render(); }, setTheme: (t) => { THEME = t; return render(); }, setHero: (h) => { HERO = h; return render(); }, setHeight: (h) => { HGT = h; return render(); } };
  render();
})();
