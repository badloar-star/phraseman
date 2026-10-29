/* scene-edge.app.js — «Нижний край сцены»: как сцена Главной уходит в фон экрана. Владелец 29.10 (через координатора): сцена (~46 %
   экрана, скругление 32 dp снизу) под «Продолжить» обрывается ровным краем — «так не должно быть нигде». Макет на реальных кадрах
   Главной (тёмное «Глубокое небо», светлое «А»), тот же движок, что у чистого макета (dark-themes.app.js → scene-approved.js →
   scene-real.js → scene-recolor.js), поверх перекрашенной сцены — пост-обработка нижних N dp (job.post):
   В1 «Градиент» — последние N dp линейно в цвет фона экрана, скругления нет;
   В2 «Растворение» — 1,5 N dp по кривой smoothstep (t²(3−2t)), скругления нет;
   В3 «Под карточку» — сцена продолжается под карточку «Сегодня»: N dp над краем + 0,6 N под ним (только пиксели фона страницы,
   карточка не трогается), smoothstep на всём отрезке.
   Цвет фона — токен темы `bg` (сверен с кадром на поле x 16 под сценой). Числа — в подписях колонок и в «лупе» под телефоном
   (срез кромки с метками в dp). Внутри телефонов служебного текста нет. Журнал — [SE]. */
(() => {
  const LOG = '[SE]'; const RF = window.RF; const SP = window.__sp; const DT = window.__dt; const SA = window.SceneApproved; const SR = window.SceneRecolor; const REAL = window.__REAL || {};
  if (!SP || !DT || !SA || !RF || !SR || !window.SceneReal) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, dt: !!DT, sa: !!SA, rf: !!RF, sr: !!SR, real: !!window.SceneReal })); return; }
  const THEMES = SP.THEMES; const W = 1080; const DPX = 2.625;
  const q = new URLSearchParams(location.search);
  let THEME = THEMES[q.get('th')] ? q.get('th') : 'graphite'; let HEIGHT = [48, 64, 96, 128].includes(Number(q.get('h'))) ? Number(q.get('h')) : 64;
  let JOBS = {};
  const frames = Object.values(REAL).filter((m) => m && m.ok !== false && m.recolor !== false && THEMES[m.theme]);
  const frameOf = (ap) => frames.find((m) => m.theme === THEME && m.screen === 'home' && m.ap === ap && (m.state || 'day') === 'day') || null;
  const hasFrame = (id) => frames.some((m) => m.theme === id && m.screen === 'home' && (m.state || 'day') === 'day');
  const col = (label, html, note) => `<div class="col"><div class="lbl">${label}</div>${html}<canvas class="se-loupe" width="430" height="300"></canvas>${note ? `<div class="se-note">${note}</div>` : ''}</div>`;
  /* те же правки кадра, что в чистом макете: герой 160 dp справа по центру, заголовок урока перерисован, аватар с кольцом как снят */
  const TITLE = { x0: 40, y0: 615, x1: 1040, y1: 765, top: 560, label: 'Урок 1', text: 'Местоимения и глагол To Be' };
  const KEEP_AVATAR = [{ cx: 953.5, cy: 226, r: 85 }, { cx: 1018, cy: 279, r: 31 }];
  const copyWidth = (job) => { const art = (job.hero && job.hero.art) || 'home_scene_continue'; const pad = (SA.HERO_HOME.assetPad[art] || { left: 0 }).left; return RF.px(job.heroMove.x + pad * job.heroMove.size - 40) - 8; };
  const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const mix = (d, i, bg, a) => { d[i] += (bg[0] - d[i]) * a; d[i + 1] += (bg[1] - d[i + 1]) * a; d[i + 2] += (bg[2] - d[i + 2]) * a; };
  const CARD_TOP = 1058; // верх карточки «Сегодня» на кадре (px кадра) — на 9 dp выше края сцены
  /* числа варианта при высоте H dp: В1 — N = H над краем, линейно; В2 — 1,5 H над краем, smoothstep; В3 — сцена цела до верха карточки «Сегодня»,
     переход от верха карточки (−9 dp) до 0,75 H под краем сцены, smoothstep — виден на полях по бокам карточки, карточка «плавает» на сцене */
  const NUM = (h, sceneH = 1082) => ({ v1: { above: h, below: 0, curve: 'линейно a = t' }, v2: { above: Math.round(h * 1.5), below: 0, curve: 'smoothstep a = t²(3 − 2t)' }, v3: { above: Math.round((sceneH - CARD_TOP) / DPX), below: Math.round(h * 0.75), curve: 'smoothstep a = t²(3 − 2t) от верха карточки до конца' } });
  const curveOf = (key) => (key === 'v1' ? (t) => t : smooth);
  /* растр новой сцены: готовая картинка (тёмное небо) или формула (светлое «А»), чтобы вписать переход прямо в фон */
  const raster = (spec, Wd, Hd) => { if (spec.image) return { data: new Uint8ClampedArray(spec.image.data), width: spec.image.width || Wd }; const paint = SR.painter(spec, Wd, Hd); const d = new Uint8ClampedArray(Wd * Hd * 4); for (let y = 0; y < Hd; y += 1) for (let x = 0; x < Wd; x += 1) { const i = (y * Wd + x) * 4; const c = paint(x, y); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return { data: d, width: Wd }; };
  /* переход в фон внутри растра сцены: строки y0…sceneH смешиваются с bg по кривой (доля отрезка считается до y1 — для В3 отрезок уходит под край) */
  const fadeRaster = (img, Wd, sceneH, y0, y1, curve, bg) => { const d = img.data; for (let y = Math.max(0, y0); y < sceneH; y += 1) { const a = curve((y - y0) / (y1 - y0)); for (let x = 0; x < Wd; x += 1) mix(d, (y * Wd + x) * 4, bg, a); } return img; };
  /* пост-обработка только для В3: строки под краем сцены, где кадр = фон страницы (поля по бокам карточки), получают хвост сцены с тем же
     растворением; карточка «Сегодня», её тень и текст — как сняты */
  const post = (data, Wd, rows, job, s) => {
    if (s.key !== 'v3' || !s.base) return; const sceneH = job.sceneH; const n = NUM(HEIGHT, sceneH).v3; const bg = job.edgeBg;
    const y0 = sceneH - Math.round(n.above * DPX); const y1 = sceneH + Math.round(n.below * DPX); const yEnd = Math.min(rows, y1);
    const refI = ((sceneH + Math.min(rows - sceneH - 1, 40)) * Wd + 16) * 4; const ref = [data[refI], data[refI + 1], data[refI + 2]]; let painted = 0; const base = s.base.data;
    for (let y = sceneH; y < yEnd; y += 1) { const a = smooth((y - y0) / (y1 - y0));
      for (let x = 0; x < Wd; x += 1) { const i = (y * Wd + x) * 4; if (Math.max(Math.abs(data[i] - ref[0]), Math.abs(data[i + 1] - ref[1]), Math.abs(data[i + 2] - ref[2])) > 10) continue; const j = ((sceneH - 1) * Wd + x) * 4; data[i] = base[j]; data[i + 1] = base[j + 1]; data[i + 2] = base[j + 2]; mix(data, i, bg, a); painted += 1; } }
    console.log(LOG, 'переход v3 под краем', job.file, JSON.stringify({ heightDp: HEIGHT, belowDp: n.below, bg: job.edgeBgHex, ref, painted })); // guard-ok: одна строка на вариант
  };
  /* варианты: один растр утверждённой сцены на каждый, переход вписан в нижние строки растра (у В3 — от верха карточки) */
  const variants = (m, bg) => { const v = DT.approvedVariant(m); const sceneH = m.sceneH || 1082; const base = raster(v.spec, W, sceneH); const n = NUM(HEIGHT, sceneH);
    return ['v1', 'v2', 'v3'].map((key) => { const img = { data: new Uint8ClampedArray(base.data), width: W }; const y0 = sceneH - Math.round(n[key].above * DPX); const y1 = sceneH + Math.round(n[key].below * DPX); fadeRaster(img, W, sceneH, y0, y1, curveOf(key), bg); console.log(LOG, 'переход', key, m.file, JSON.stringify({ heightDp: HEIGHT, aboveDp: n[key].above, belowDp: n[key].below, y0, y1 })); return { key, spec: { image: img }, base }; }); }; // guard-ok: одна строка на вариант
  const row = (m, title) => {
    const t = THEMES[THEME][m.ap]; const edgeBg = hx(t.bg);
    const job = { file: m.file, src: `assets/real/${m.file}`, sceneH: m.sceneH || 1082, status: m.status || 100, tab: m.tab || 2140, hero: m.hero || null, ap: m.ap, radius: 32 * DPX, old: DT.oldSpecFor(m), keepMax: 0.12, strats: variants(m, edgeBg), fillCorners: true, keep: KEEP_AVATAR, edgeBg, edgeBgHex: t.bg, postBelow: Math.round(NUM(HEIGHT, m.sceneH || 1082).v3.below * DPX) + 4, post };
    job.heroMove = SA.heroHome(W, job.sceneH, DPX); job.clear = [TITLE]; const cw = copyWidth(job);
    const copy = `<div class="sf-copy" style="top:${RF.px(TITLE.top)}px;width:${cw}px"><small>${TITLE.label}</small><b>${TITLE.text}</b></div>`;
    const key = `${m.file}#edge`; JOBS[key] = job;
    const now = RF.phone({ src: job.src, exists: true, cls: 'sp-rf', status: job.status, tab: job.tab });
    const will = (k) => RF.phone({ src: job.src, exists: true, cls: 'sp-rf sp-rf-will', status: job.status, tab: job.tab, overlays: copy }).replace('data-ph="sp-rf sp-rf-will"', `data-ph="sp-rf-will" data-strat="${k}"`);
    const n = NUM(HEIGHT, job.sceneH); const bgLabel = `${t.bg} (bg)`;
    return `<div class="sp-real-row se-row" data-frame="${key}" data-scene-h="${job.sceneH}"><h3>${title}</h3><div class="phones se-phones">${col('Сейчас', now, 'скругление 32 dp, край ровный')}${col('В1 · Градиент', will('v1'), `${n.v1.above} dp в ${bgLabel}, ${n.v1.curve}, скругления нет`)}${col('В2 · Растворение', will('v2'), `${n.v2.above} dp в ${bgLabel}, ${n.v2.curve}, скругления нет`)}${col('В3 · Под карточку', will('v3'), `сцена цела до верха «Сегодня» (−${n.v3.above} dp), переход до +${n.v3.below} dp под краем — виден на полях карточки, ${n.v3.curve}, скругления нет`)}</div></div>`;
  };
  /* лупа: срез кромки (x 0…600, от −110 dp до +70 dp от края сцены) с метками: начало перехода, край сцены, верх карточки, текст «Сегодня» */
  const loupe = async (ph, canvas, job, key) => {
    const src = ph.dataset.will || job.src; const im = new Image(); im.src = src; try { await im.decode(); } catch (e) { console.log(LOG, 'лупа: картинка не открылась', src, e.message); return; }
    const sceneH = job.sceneH; const y0 = sceneH - Math.round(110 * DPX); const y1 = sceneH + Math.round(70 * DPX); const sx = 0; const sw = 600; const scale = 430 / sw; const h = Math.round((y1 - y0) * scale);
    canvas.width = 430; canvas.height = h; const g = canvas.getContext('2d'); g.drawImage(im, sx, y0, sw, y1 - y0, 0, 0, 430, h);
    const marks = []; const n = NUM(HEIGHT, sceneH)[key];
    if (n) { marks.push([sceneH - Math.round(n.above * DPX), key === 'v3' ? `−${n.above} dp · начало перехода (верх карточки)` : `−${n.above} dp · начало перехода`, '#F2C05A']); if (n.below) marks.push([sceneH + Math.round(n.below * DPX), `+${n.below} dp · конец под карточкой`, '#F2C05A']); }
    marks.push([sceneH, '0 · край сцены', '#FFFFFF'], [1058, `−${Math.round((sceneH - 1058) / DPX)} dp · верх карточки «Сегодня»`, '#7FD1FF'], [1109, `+${Math.round((1109 - sceneH) / DPX)} dp · текст «Сегодня»`, '#7FD1FF']);
    g.font = '600 11px Inter, sans-serif'; g.textBaseline = 'middle';
    for (const [y, label, color] of marks) { const yy = (y - y0) * scale; g.strokeStyle = color; g.globalAlpha = 0.9; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(0, yy); g.lineTo(430, yy); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; const w = g.measureText(label).width + 10; g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(430 - w - 6, yy - 8, w, 16); g.fillStyle = color; g.fillText(label, 430 - w - 1, yy); }
  };
  const loupes = async (root) => {
    for (const rowEl of root.querySelectorAll('.se-row')) { const job = JOBS[rowEl.dataset.frame]; if (!job) continue;
      for (const c of rowEl.querySelectorAll('.col')) { const ph = c.querySelector('.ph'); const canvas = c.querySelector('canvas.se-loupe'); if (!ph || !canvas) continue; await loupe(ph, canvas, job, ph.dataset.strat || 'now'); } }
  };
  const controls = () => {
    const th = document.getElementById('seThemes'); if (th) th.innerHTML = (q.get('all') === '1' ? DT.THEME_LIST : ['graphite']).filter((id) => hasFrame(id)).map((id) => `<span class="chp${THEME === id ? ' on' : ''}" data-se-th="${id}">${THEMES[id].name}</span>`).join('');
    const hs = document.getElementById('seHeights'); if (hs) hs.innerHTML = [48, 64, 96, 128].map((h) => `<span class="chp${HEIGHT === h ? ' on' : ''}" data-se-h="${h}">${h} dp</span>`).join('');
  };
  const release = (root) => root.querySelectorAll('.ph[data-will]').forEach((ph) => { try { URL.revokeObjectURL(ph.dataset.will); } catch (e) { console.log(LOG, 'revoke', e.message); } });
  const render = async () => {
    const root = document.getElementById('se'); if (!root) return; release(root); JOBS = {};
    const t0 = performance.now(); const rows = [];
    for (const ap of ['dark', 'light']) { DT.setTheme(THEME, ap); const m = frameOf(ap); if (!m) { console.log(LOG, 'нет кадра', ap, THEME); continue; } rows.push(row(m, ap === 'dark' ? 'Главная · тёмное «Глубокое небо»' : 'Главная · светлое «А»')); }
    root.innerHTML = rows.join('') || '<p class="sf-empty">Кадры этой темы ещё не сняты</p>'; controls();
    const u = new URL(location.href); u.searchParams.set('th', THEME); u.searchParams.set('h', String(HEIGHT)); history.replaceState(null, '', u);
    console.log(LOG, 'render', JSON.stringify({ theme: THEME, heightDp: HEIGHT, rows: rows.length, ms: Math.round(performance.now() - t0) })); // guard-ok: одна строка на перерисовку
    await window.SceneReal.buildAll(root, JOBS); await loupes(root); window.__seDone = true;
  };
  document.body.addEventListener('click', (e) => {
    const c = e.target.closest('.chp[data-se-th]'); if (c) { THEME = c.dataset.seTh; window.__seDone = false; render(); return; }
    const h = e.target.closest('.chp[data-se-h]'); if (h) { HEIGHT = Number(h.dataset.seH); window.__seDone = false; render(); }
  });
  render();
  window.__se = { render, jobs: () => JOBS, num: () => NUM(HEIGHT), setHeight: (h) => { HEIGHT = h; return render(); } };
})();
