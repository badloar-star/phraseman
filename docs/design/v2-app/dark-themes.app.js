/* dark-themes.app.js — страница «Тёмные темы 2.0»: переключатель тёмных тем над одними и теми же НАСТОЯЩИМИ экранами (кадры Сверки),
   разделы «Освещение сцены», «Стили сцен», «Вечерняя Главная», «Карточки» (в работе) и пометка о кольцах аватара.
   зачем (координатор 28.10 ~20:10, слово владельца: «я просил макеты переработки тёмных тем, новые стили полностью, освещения и т.д.»):
   каждый телефон — реальный кадр, у которого по пикселям перекрашен только фон сцены (scene-recolor.js); новый фон — либо формула света,
   либо картинка стиля (scene-styles.js). Цвета всех вариантов считаются из токенов выбранной темы (scene-palettes.app.js → window.__sp).
   Зажатие перекрашенного телефона показывает «сейчас». Журнал — префикс [DT]. */
(() => {
  const LOG = '[DT]'; const RF = window.RF; const SP = window.__sp; const SS = window.SceneStyles; const REAL = window.__REAL || {};
  if (!SP || !SS || !RF || !window.SceneReal) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, styles: !!SS, rf: !!RF, real: !!window.SceneReal })); return; }
  const THEMES = SP.THEMES; const C = SP.color; const W = 1080; const DPX = 2.625;
  const EVENING_GLOW = { color: [214, 92, 70], a: 0.62 }; const EMBER = { color: C.fromOklch(0.66, 0.19, 28), a: 0.55 }; // home_scene_tokens.ts
  const frames = Object.values(REAL).filter((m) => m && m.ok !== false && m.recolor !== false && m.ap === 'dark' && THEMES[m.theme]);
  const byTheme = {}; frames.forEach((m) => { (byTheme[m.theme] = byTheme[m.theme] || []).push(m); });
  const THEME_LIST = Object.keys(THEMES).filter((id) => byTheme[id]);
  const q = new URLSearchParams(location.search);
  let THEME = THEMES[q.get('th')] && byTheme[q.get('th')] ? q.get('th') : (byTheme.graphite ? 'graphite' : THEME_LIST[0]);
  let JOBS = {}; const STYLE_CACHE = new Map();
  const frameOf = (screen, state = 'day') => (byTheme[THEME] || []).find((m) => m.screen === screen && (m.state || 'day') === state) || null;
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;

  /* ── палитра стиля из токенов темы (стратегия А — тон темы; Г даёт второй свет по сплиту) ── */
  const paletteOf = (id) => {
    const t = THEMES[id].dark; const pa = SP.scenePal(id, 'dark', 'A'); const pd = SP.scenePal(id, 'dark', 'D'); const nd = SP.nowDialogs(id, 'dark');
    const [, Cc] = C.oklchOf(C.hx(t.accent)); const glow = (i) => { const g = t.bgGlow && t.bgGlow[i]; return g ? { c: C.hx(g), a: C.ha(g) } : { c: pa.lightC, a: 0.5 }; };
    return { S: pa.S, C: Cc, top: pa.top, bot: pa.bot, lightC: pa.lightC, light2C: pd.light2C, Lh: pa.Lh, Lh2: pd.Lh2, dlgTop: nd.top, dlgBot: nd.bot, glowR: glow(0).c, glowRA: glow(0).a, glowL: glow(1).c, glowLA: glow(1).a };
  };
  /* ── модели «сейчас» (ровно то, что рисует приложение) ── */
  const homeOld = (id, state) => {
    const k = SP.sceneTok(id, 'dark'); const spec = { top: k.top, bot: k.bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: k.glowC, a: k.glowA, fade: 1 }], scrim: null };
    if (state === 'evening') spec.lights = [{ cx: 0.82, cy: 0, rx: 0.7, ry: 0.5, color: EVENING_GLOW.color, a: EVENING_GLOW.a, fade: 1 }, { cx: 90 * DPX / W, cy: null, rx: 130 * DPX / W, ry: null, color: EMBER.color, a: EMBER.a, fade: 1, ember: true }];
    return spec;
  };
  const dialogsOld = (id, hero) => {
    const t = THEMES[id].dark; const nd = SP.nowDialogs(id, 'dark'); const gl = (i) => { const g = t.bgGlow && t.bgGlow[i]; return g ? { color: C.hx(g), a: C.ha(g) } : { color: [0, 0, 0], a: 0 }; };
    const halo = hero ? { cx: 0.57 * W + 84 * DPX, cy: hero.y + 84 * DPX, r: 84 * DPX, a: C.ha(t.accentGlow), color: C.hx(t.accentGlow), stops: [[0, 1], [0.62, 0.2], [1, 0]] } : null;
    return { top: nd.top, bot: nd.bot, start: [0.42, 0], end: [0.58, 1], lights: [{ cx: 0.84, cy: 0.14, rx: 0.7, ry: 0.46, color: gl(0).color, a: gl(0).a, fade: 1 }, { cx: 0.08, cy: 0, rx: 0.6, ry: 0.42, color: gl(1).color, a: gl(1).a, fade: 1 }], scrim: null, halo };
  };
  // угли вечера — круг от высоты сцены (cy/ry зависят от sceneH конкретного кадра)
  const withSceneH = (spec, sceneH) => Object.assign({}, spec, { lights: spec.lights.map((l) => (l.ember ? Object.assign({}, l, { cy: (sceneH - 70 * DPX) / sceneH, ry: 130 * DPX / sceneH }) : l)) });
  const oldSpecFor = (m) => withSceneH(m.screen === 'dialogs' ? dialogsOld(m.theme, m.hero) : homeOld(m.theme, m.state || 'day'), m.sceneH);
  const styleSpec = (id, m, key) => {
    const ck = `${id}|${m.screen}|${m.sceneH}|${key}`; if (!STYLE_CACHE.has(ck)) STYLE_CACHE.set(ck, SS.render(key, W, m.sceneH, paletteOf(id)));
    return { image: STYLE_CACHE.get(ck).image };
  };
  const LIGHT_KEYS = { home: ['dialogs', 'sky', 'split', 'dawn'], dialogs: ['sky', 'split', 'dawn'] };
  const ART_KEYS = ['sumi', 'marker', 'aurora', 'facet', 'paper'];
  const SCREEN_NAME = { home: 'Главная', dialogs: 'Диалоги', peak: 'Пик', season: 'Сезон' };

  /* ── ряд телефонов: «сейчас» + варианты; задание для SceneReal ── */
  const row = (key, m, variants, title) => {
    const job = { file: m.file, src: `assets/real/${m.file}`, sceneH: m.sceneH || 1082, status: m.status || 100, tab: m.tab || 2140, hero: m.hero || null, ap: m.ap, radius: 32 * DPX, old: oldSpecFor(m), strats: variants.map((v) => ({ key: v.key, spec: v.spec })) };
    JOBS[key] = job;
    const now = RF.phone({ src: job.src, exists: true, cls: 'sp-rf', status: job.status, tab: job.tab });
    const will = (v) => RF.phone({ src: job.src, exists: true, cls: 'sp-rf sp-rf-will', status: job.status, tab: job.tab, fixed: '<span class="sp-rf-badge">считаю…</span>' }).replace('data-ph="sp-rf sp-rf-will"', `data-ph="sp-rf-will" data-strat="${v.key}"`);
    return `<div class="sp-real-row" data-frame="${key}"><h3>${title}<small>${m.file}${m.hero ? '' : ' · герой не найден: под ним классификатор'}</small></h3><div class="phones">${col('Сейчас · кадр приложения', now)}${variants.map((v) => col(`${v.name}<br><small>${v.why}</small>`, will(v))).join('')}</div></div>`;
  };
  const stylesOf = (m, keys) => keys.map((k) => ({ key: k, name: SS.STYLES[k].name, why: SS.STYLES[k].why, spec: styleSpec(THEME, m, k) }));
  const sectionLight = () => {
    const rows = ['home', 'dialogs'].map((s) => { const m = frameOf(s); return m ? row(`${m.file}#light`, m, stylesOf(m, LIGHT_KEYS[s]), `${SCREEN_NAME[s]} · освещение`) : ''; }).join('');
    return `<section class="block" id="dt-light"><h2>Освещение сцены — те же цвета темы, другой свет</h2><p class="sp-note">Источники света, отсветы и глубина неба считаются из цветов выбранной темы. Слева — кадр приложения как есть; правее — тот же кадр, где по пикселям перекрашен только фон сцены: герой, надписи, стекло, карточка и таббар — как сняты. Зажми телефон — увидишь «сейчас» на том же месте.</p>${rows || '<p class="sp-note sp-warn">Для этой темы ещё нет дневных кадров Главной и Диалогов.</p>'}</section>`;
  };
  const sectionArt = () => {
    const rows = ['home', 'dialogs'].map((s) => { const m = frameOf(s); return m ? row(`${m.file}#art`, m, stylesOf(m, ART_KEYS), `${SCREEN_NAME[s]} · стили`) : ''; }).join('');
    return `<section class="block" id="dt-art"><h2>Стили сцен — другие манеры рисования в цветах темы</h2><p class="sp-note">Суми-э (тушь на тёмной бумаге), маркер (пастельные штрихи), аврора, витраж (грани), бумажный коллаж. Каждый стиль берёт оттенок и свет темы, поэтому переносится на все 27 тёмных тем; белый на зоне текста ≥ 4,5:1 — страж затемняет низ, если нужно.</p>${rows}</section>`;
  };
  const sectionEvening = () => {
    const m = frameOf('home', 'evening'); if (!m) return `<section class="block" id="dt-evening"><h2>Вечерняя Главная — красная шапка после 20:00</h2><p class="sp-note sp-warn">Вечернего кадра для этой темы пока нет (scene_home_evening_${THEME}_dark.png) — Сверка снимает.</p></section>`;
    const day = withSceneH(homeOld(THEME, 'day'), m.sceneH); const ev = withSceneH(homeOld(THEME, 'evening'), m.sceneH);
    const variants = [
      { key: 'ev_spark', name: 'Как днём + красный огонёк', why: 'дневная сцена темы, от вечера остаётся только маленький тёплый огонёк слева снизу', spec: Object.assign({}, day, { lights: day.lights.concat([Object.assign({}, ev.lights[1], { rx: 80 * DPX / W, ry: 80 * DPX / m.sceneH, a: 0.42 })]) }) },
      { key: 'ev_soft', name: 'Мягче', why: 'тот же вечер, но свет справа и угли вдвое слабее — красная шапка не спорит с текстом', spec: Object.assign({}, ev, { lights: [Object.assign({}, ev.lights[0], { a: 0.32 }), Object.assign({}, ev.lights[1], { a: 0.28, rx: 110 * DPX / W, ry: 110 * DPX / m.sceneH })] }) },
      { key: 'dawn', name: 'Новый · закатный горизонт', why: 'вечер как свет от горизонта снизу: тепло внизу, спокойный верх', spec: styleSpec(THEME, m, 'dawn') },
    ];
    return `<section class="block" id="dt-evening"><h2>Вечерняя Главная — красная шапка после 20:00</h2><p class="sp-note">Слева — вечер как сейчас (серия под угрозой: тёплый свет справа, угли слева). Три варианта по списку владельца: как днём с красным огоньком · мягче · новый.</p>${row(`${m.file}#evening`, m, variants, 'Главная · вечер')}</section>`;
  };
  const sectionCards = () => `<section class="block" id="dt-cards"><h2>Карточки и плашки — тон, тень, свет, без рамок</h2><p class="sp-note sp-warn">В работе: варианты карточек «Сегодня» и плиток на кадре Главной (тон в оттенке темы, мягкая тень под карточкой, световая кромка сверху) — следующая публикация по этому же адресу.</p><p class="sp-note">Кольца аватара: по слову владельца остаётся только красное кольцо историй, фиолетовое кольцо Plus уходит — правит Дизайн в коде; на кадрах пока старые кольца.</p></section>`;

  const controls = () => {
    const el = document.getElementById('dtThemes'); if (!el) return;
    el.innerHTML = THEME_LIST.map((id) => `<span class="chp${THEME === id ? ' on' : ''}" data-dt-th="${id}">${THEMES[id].name}</span>`).join('');
    const n = document.getElementById('dtCount'); if (n) n.textContent = `${THEME_LIST.length} тем · ${frames.length} кадров`;
  };
  const release = (root) => root.querySelectorAll('.ph[data-will]').forEach((ph) => { try { URL.revokeObjectURL(ph.dataset.will); } catch (e) { console.log(LOG, 'revoke', e.message); } });
  const render = () => {
    const root = document.getElementById('dt'); if (!root) return; release(root); JOBS = {};
    const t0 = performance.now();
    root.innerHTML = sectionLight() + sectionArt() + sectionEvening() + sectionCards();
    controls();
    const u = new URL(location.href); u.searchParams.set('th', THEME); history.replaceState(null, '', u);
    console.log(LOG, 'render', JSON.stringify({ theme: THEME, frames: (byTheme[THEME] || []).map((m) => m.file), jobs: Object.keys(JOBS).length, ms: Math.round(performance.now() - t0) })); // guard-ok: одна строка на перерисовку
    window.SceneReal.buildAll(root, JOBS);
  };
  document.body.addEventListener('click', (e) => { const c = e.target.closest('.chp[data-dt-th]'); if (!c) return; THEME = c.dataset.dtTh; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  render();
  window.__dt = { THEME_LIST, byTheme, paletteOf, homeOld, dialogsOld, render, setTheme: (id) => { THEME = id; render(); }, jobs: () => JOBS };
})();
