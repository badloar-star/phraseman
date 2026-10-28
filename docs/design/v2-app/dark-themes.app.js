/* dark-themes.app.js — страница «Тёмные темы 2.0»: переключатель ВСЕХ тем × тёмное/светлое над одними и теми же НАСТОЯЩИМИ экранами
   (кадры Сверки); разделы «Цвета сцены» (А · Б · Б+ три уровня яркости верха · В · Г), «Освещение сцены», «Стили сцен», «Вечерняя Главная»,
   «Карточки» (в работе), пометка о кольцах аватара. Нет кадра темы — плитка «кадр снимается», чужим кадром не подменяем.
   зачем (координатор 28.10, слово владельца: «я просил макеты переработки тёмных тем, новые стили полностью, освещения»; по версии 2:
   «аналоговая интересно, но в тёмной верхняя часть сцены тусклая»; «сделай макет со всеми темами и цветами»): каждый телефон — реальный
   кадр, у которого по пикселям перекрашен только фон сцены (scene-recolor.js); новый фон — формула цвета/света или картинка стиля
   (scene-styles.js). Белый на зоне текста ≥ 4,6 держится затемнением ПОД текстом (низ сцены), а не всем небом. Журнал — [DT]. */
(() => {
  const LOG = '[DT]'; const RF = window.RF; const SP = window.__sp; const SS = window.SceneStyles; const SR = window.SceneRecolor; const REAL = window.__REAL || {};
  if (!SP || !SS || !RF || !SR || !window.SceneReal) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, styles: !!SS, rf: !!RF, recolor: !!SR, real: !!window.SceneReal })); return; }
  const THEMES = SP.THEMES; const C = SP.color; const W = 1080; const DPX = 2.625; const norm = (h) => ((h % 360) + 360) % 360;
  const EVENING_GLOW = { color: [214, 92, 70], a: 0.62 }; const EMBER = { color: C.fromOklch(0.66, 0.19, 28), a: 0.55 }; // home_scene_tokens.ts
  const frames = Object.values(REAL).filter((m) => m && m.ok !== false && m.recolor !== false && THEMES[m.theme]);
  const byTheme = {}; frames.forEach((m) => { (byTheme[m.theme] = byTheme[m.theme] || []).push(m); });
  const THEME_LIST = Object.keys(THEMES); // все активные темы: 23 обычные + 6 премиум; без кадра — плитка «кадр снимается»
  const q = new URLSearchParams(location.search);
  let AP = q.get('ap') === 'light' ? 'light' : 'dark';
  let THEME = THEMES[q.get('th')] ? q.get('th') : 'graphite'; // тема владельца — «Затмение» (координатор 28.10)
  let JOBS = {}; const STYLE_CACHE = new Map();
  const hasFrame = (id, ap) => (byTheme[id] || []).some((m) => m.ap === ap);
  const frameOf = (screen, state = 'day') => (byTheme[THEME] || []).find((m) => m.screen === screen && m.ap === AP && (m.state || 'day') === state) || null;
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  const APN = (ap) => (ap === 'dark' ? 'тёмное' : 'светлое');

  /* ── палитра стиля из токенов темы (стратегия А — тон темы; Г даёт второй свет по сплиту) ── */
  const paletteOf = (id, ap) => {
    const t = THEMES[id][ap]; const pa = SP.scenePal(id, ap, 'A'); const pd = SP.scenePal(id, ap, 'D'); const nd = SP.nowDialogs(id, ap);
    const [, Cc] = C.oklchOf(C.hx(t.accent)); const glow = (i) => { const g = t.bgGlow && t.bgGlow[i]; return g ? { c: C.hx(g), a: C.ha(g) } : { c: pa.lightC, a: 0.5 }; };
    return { S: pa.S, C: Cc, top: pa.top, bot: pa.bot, lightC: pa.lightC, light2C: pd.light2C, Lh: pa.Lh, Lh2: pd.Lh2, dlgTop: nd.top, dlgBot: nd.bot, glowR: glow(0).c, glowRA: glow(0).a, glowL: glow(1).c, glowLA: glow(1).a };
  };
  /* ── модели «сейчас» (ровно то, что рисует приложение; те же формулы, что в scene-frames.cjs) ── */
  const homeOld = (id, state, ap) => {
    const k = SP.sceneTok(id, ap); const t = THEMES[id][ap]; let top = k.top; let bot = k.bot;
    const spec = { top, bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: k.glowC, a: k.glowA, fade: 1 }], scrim: k.scrim ? { a: 0.40, h: 300 * DPX } : null };
    if (state === 'evening') {
      if (ap === 'light') { const [, Cc, Hh] = C.oklchOf(C.hx(t.accent)); top = id === 'ink' ? C.fromOklch(0.30, 0.09, 285) : C.fromOklch(0.30, Math.min(Cc, 0.09), Hh); bot = id === 'ink' ? C.fromOklch(0.14, 0.05, 280) : C.fromOklch(0.14, Math.min(Cc, 0.05), Hh); spec.top = top; spec.bot = bot; }
      spec.lights = [{ cx: 0.82, cy: 0, rx: 0.7, ry: 0.5, color: EVENING_GLOW.color, a: EVENING_GLOW.a, fade: 1 }, { cx: 90 * DPX / W, cy: null, rx: 130 * DPX / W, ry: null, color: EMBER.color, a: EMBER.a, fade: 1, ember: true }];
    }
    return spec;
  };
  const dialogsOld = (id, hero, ap, sceneH) => {
    const t = THEMES[id][ap]; const nd = SP.nowDialogs(id, ap); const gl = (i) => { const g = t.bgGlow && t.bgGlow[i]; return g ? { color: C.hx(g), a: C.ha(g) } : { color: [0, 0, 0], a: 0 }; };
    const lights = [{ cx: 0.84, cy: 0.14, rx: 0.7, ry: 0.46, color: gl(0).color, a: gl(0).a, fade: 1 }, { cx: 0.08, cy: 0, rx: 0.6, ry: 0.42, color: gl(1).color, a: gl(1).a, fade: 1 }];
    if (ap === 'light') lights.push({ cx: 0.5, cy: 1, rx: 0.8, ry: 0.5, color: gl(2).color, a: gl(2).a, fade: 1 });
    const halo = hero ? { cx: 0.57 * W + 84 * DPX, cy: hero.y + 84 * DPX, r: 84 * DPX, a: C.ha(t.accentGlow), color: C.hx(t.accentGlow), stops: [[0, 1], [0.62, 0.2], [1, 0]] } : null;
    return { top: nd.top, bot: nd.bot, start: [0.42, 0], end: [0.58, 1], lights, scrim: ap === 'light' ? { a: 0.34, h: sceneH * 0.6 } : null, halo };
  };
  const peakOld = (id, ap, sceneH, shadeA) => { const k = SP.sceneTok(id, ap); const ry = Math.min(1, 0.5 * (80 + 392) / (sceneH / DPX)); return { top: k.top, bot: k.bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry, color: k.glowC, a: k.glowA, fade: 1 }], scrim: k.scrim ? { a: 0.40, h: 300 * DPX } : null, shade: shadeA > 0 ? { a: shadeA, y0: 80 * DPX, tail: 140 * DPX } : null }; };
  const seasonOld = (id, ap) => { const n = SP.nowSeason(id, ap); return { top: n.top, bot: n.bot, start: [0.33, 0], end: [0.67, 1], lights: [], linearLights: [{ x0: 1, y0: 0, x1: 0.35, y1: 0.6, color: n.glow, a: 1 }], scrim: { a: 0.36, h: 320 * DPX } }; };
  const withSceneH = (spec, sceneH) => Object.assign({}, spec, { lights: spec.lights.map((l) => (l.ember ? Object.assign({}, l, { cy: (sceneH - 70 * DPX) / sceneH, ry: 130 * DPX / sceneH }) : l)) });
  const oldSpecFor = (m) => withSceneH(m.screen === 'dialogs' ? dialogsOld(m.theme, m.hero, m.ap, m.sceneH) : m.screen === 'peak' ? peakOld(m.theme, m.ap, m.sceneH, m.shadeA || 0) : m.screen === 'season' ? seasonOld(m.theme, m.ap) : homeOld(m.theme, m.state || 'day', m.ap), m.sceneH);
  /* страж контраста для формульных фонов: белый ≥ 4,6 на зоне текста — затемнение ПОД текстом (низ сцены), а не всему небу;
     под самими значками статус-бара (часы слева, значки справа) ≥ 2,8 — как у нынешней сцены приложения (свет слева даёт ~2,5), иначе
     яркий верх, которого просил владелец, гасился бы стражем; убавляем верхний свет, затем чуть темним верх */
  const ensureContrast = (spec, sceneH, tag) => {
    const s = Object.assign({}, spec, { lights: spec.lights.map((l) => Object.assign({}, l)), scrim: spec.scrim ? Object.assign({}, spec.scrim) : null });
    const minAt = (ys, xs) => { const paint = SR.painter(s, W, sceneH); let mn = 99; for (const fy of ys) for (const fx of xs) { const v = C.whiteOn(paint(Math.round(fx * W), Math.round(fy * sceneH))); if (v < mn) mn = v; } return mn; };
    const TX = [0.06, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94]; const TY = [0.52, 0.6, 0.68, 0.76, 0.84, 0.92];
    let a = s.scrim ? s.scrim.a : 0; let steps = 0;
    while (minAt(TY, TX) < 4.6 && a < 0.8 && steps < 16) { a += 0.05; s.scrim = { a: +a.toFixed(2), h: Math.round(sceneH * 0.52) }; steps += 1; }
    let topSteps = 0;
    while (minAt([0.01, 0.04, 0.07], [0.04, 0.12, 0.84, 0.95]) < 2.8 && topSteps < 12) { s.lights.forEach((l) => { if (l.cy <= 0.1) l.a = Math.max(0.25, l.a - 0.08); }); s.top = C.mixc([0, 0, 0], s.top, 0.05); topSteps += 1; }
    if (steps || topSteps) console.log(LOG, tag, 'страж: затемнение под текстом', a.toFixed(2), 'шагов верха', topSteps); // guard-ok: одна строка на вариант
    return s;
  };
  /* ── цветовые стратегии на кадре: А/Б/В/Г из scenePal + Б+ (три уровня яркости верха) ── */
  const stratSpec = (id, ap, key, old, sceneH) => { const p = SP.scenePal(id, ap, key); return ensureContrast({ top: p.top, bot: p.bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: p.lightC, a: p.a1, fade: 0.7 }, { cx: 0.86, cy: 1.02, rx: 0.8, ry: 0.42, color: p.light2C, a: p.a2, fade: 0.7 }], scrim: old.scrim }, sceneH, key); };
  // Б+: аналоговая основа Б, верх заметно светлее и насыщеннее, явный источник света сверху (сияние), низ уходит в тёмный шов с карточкой
  const B_PLUS = [{ key: 'B1', name: 'Б+ мягко', L: 0.50, Cc: 0.14, sun: 0.55, sunL: 0.84 }, { key: 'B2', name: 'Б+ ярко', L: 0.56, Cc: 0.16, sun: 0.7, sunL: 0.88 }, { key: 'B3', name: 'Б+ сияние', L: 0.60, Cc: 0.17, sun: 0.86, sunL: 0.92 }];
  const bPlusSpec = (id, ap, lvl, old, sceneH) => {
    const p = SP.scenePal(id, ap, 'B'); const top = C.okRgb(lvl.L + (ap === 'light' ? 0.02 : 0), lvl.Cc, p.S); const bot = C.okRgb(0.26, 0.10, norm(p.S - 8));
    const spec = { top, bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.42, cy: 0.08, rx: 0.52, ry: 0.46, color: C.okRgb(lvl.sunL, 0.10, p.Lh), a: lvl.sun, fade: 0.85 }, { cx: 0.9, cy: 1.0, rx: 0.6, ry: 0.4, color: p.light2C, a: 0.3, fade: 0.8 }], scrim: old.scrim || { a: 0.2, h: Math.round(sceneH * 0.52) } };
    return ensureContrast(spec, sceneH, lvl.key);
  };
  const styleSpec = (id, m, key) => {
    const ck = `${id}|${m.ap}|${m.screen}|${m.sceneH}|${key}`; if (!STYLE_CACHE.has(ck)) STYLE_CACHE.set(ck, SS.render(key, W, m.sceneH, paletteOf(id, m.ap)));
    return { image: STYLE_CACHE.get(ck).image };
  };
  const LIGHT_KEYS = { home: ['dialogs', 'sky', 'split', 'dawn'], dialogs: ['sky', 'split', 'dawn'], peak: ['dialogs', 'sky', 'split', 'dawn'], season: ['dialogs', 'sky', 'split', 'dawn'] };
  const SCREENS = ['home', 'dialogs', 'peak', 'season'];
  // в светлом оформлении: «как в Диалогах» высветляет сцену под белым текстом Главной — не показываем; светлые Диалоги — светлая сцена с ТЁМНЫМ
  // текстом, тёмные стили и света делают текст нечитаемым — показываем только «сейчас» с пометкой (варианты для светлого — отдельной задачей)
  const keysFor = (screen) => (AP === 'light' ? LIGHT_KEYS[screen].filter((k) => k !== 'dialogs') : LIGHT_KEYS[screen]);
  const lightDialogs = (m) => m.screen === 'dialogs' && m.ap === 'light';
  const onlyNow = (m, title) => `<div class="sp-real-row"><h3>${title}<small>${m.file}${m.note ? ' · ' + m.note : ''}</small></h3><p class="sp-note sp-warn">Светлые Диалоги — светлая сцена с тёмным текстом: тёмные света и стили сделали бы текст нечитаемым, поэтому только «сейчас»; варианты для светлого оформления — отдельной задачей по слову владельца.</p><div class="phones">${col('Сейчас · кадр приложения', RF.phone({ src: `assets/real/${m.file}`, exists: true, cls: 'sp-rf', status: m.status || 100, tab: m.tab || 2140 }))}</div></div>`;
  const ART_KEYS = ['sumi', 'marker', 'aurora', 'facet', 'paper'];
  const SCREEN_NAME = { home: 'Главная', dialogs: 'Диалоги', peak: 'Пик', season: 'Сезон' };

  /* ── ряд телефонов: «сейчас» + варианты; задание для SceneReal ── */
  const row = (key, m, variants, title) => {
    const job = { file: m.file, src: `assets/real/${m.file}`, sceneH: m.sceneH || 1082, status: m.status || 100, tab: m.tab || 2140, hero: m.hero || null, ap: m.ap, radius: 32 * DPX, old: oldSpecFor(m), keepMax: m.screen === 'peak' ? 0.5 : 0.12, strats: variants.map((v) => ({ key: v.key, spec: v.spec })) }; // башня Пика — цветная деталь на четверть сцены, порог стража выше
    JOBS[key] = job;
    const now = RF.phone({ src: job.src, exists: true, cls: 'sp-rf', status: job.status, tab: job.tab });
    const will = (v) => RF.phone({ src: job.src, exists: true, cls: 'sp-rf sp-rf-will', status: job.status, tab: job.tab, fixed: '<span class="sp-rf-badge">считаю…</span>' }).replace('data-ph="sp-rf sp-rf-will"', `data-ph="sp-rf-will" data-strat="${v.key}"`);
    return `<div class="sp-real-row" data-frame="${key}"><h3>${title}<small>${m.file}${!m.hero && (m.screen === 'home' || m.screen === 'dialogs') ? ' · герой не найден: под ним классификатор' : ''}${m.note ? ' · ' + m.note : ''}</small></h3><div class="phones">${col('Сейчас · кадр приложения', now)}${variants.map((v) => col(`${v.name}<br><small>${v.why}</small>`, will(v))).join('')}</div></div>`;
  };
  const missing = (title, file) => `<div class="sp-real-row"><h3>${title}<small>${file}</small></h3><div class="phones">${col('кадр снимается', RF.phone({ src: file, exists: false, cls: 'sp-rf' }).replace('кадр не снят', 'кадр снимается'))}</div></div>`;
  const stylesOf = (m, keys) => keys.map((k) => ({ key: k, name: SS.STYLES[k].name, why: SS.STYLES[k].why, spec: styleSpec(THEME, m, k) }));
  const sectionColors = () => {
    const m = frameOf('home'); const file = `scene_home_${THEME}_${AP}.png`;
    let body;
    if (!m) body = missing(`Главная · ${APN(AP)}`, file);
    else {
      const old = oldSpecFor(m); const sl = (k) => SP.schemeLine(SP.scenePal(THEME, AP, k));
      const variants = [{ key: 'A', name: 'А · тон темы, ярче и глубже', why: sl('A'), spec: stratSpec(THEME, AP, 'A', old, m.sceneH) }, { key: 'B', name: 'Б · аналоговая', why: sl('B'), spec: stratSpec(THEME, AP, 'B', old, m.sceneH) }]
        .concat(B_PLUS.map((lvl) => ({ key: lvl.key, name: lvl.name, why: `основа Б, верх L ${lvl.L.toFixed(2)} / C ${lvl.Cc.toFixed(2)}, сияние сверху ${lvl.sun}, низ в тёмный шов`, spec: bPlusSpec(THEME, AP, lvl, old, m.sceneH) })))
        .concat([{ key: 'C', name: 'В · акцент-свет', why: sl('C'), spec: stratSpec(THEME, AP, 'C', old, m.sceneH) }, { key: 'D', name: 'Г · два света по сплиту', why: sl('D'), spec: stratSpec(THEME, AP, 'D', old, m.sceneH) }]);
      body = row(`${m.file}#colors`, m, variants, `Главная · ${APN(AP)} · цвета`);
    }
    return `<section class="block" id="dt-colors"><h2>Цвета сцены — все темы × тёмное/светлое × стратегия</h2><p class="sp-note">А — тон темы ярче и глубже; Б — аналоговая (сосед по кругу); Б+ — та же аналоговая основа, но верх сцены заметно светлее и насыщеннее с явным источником света: три уровня (мягко · ярко · сияние), низ уходит в тёмный шов с карточкой; В — акцент-свет; Г — два света по сплиту. Белый на тексте ≥ 4,5 держится затемнением под самим текстом, не всем небом. Зажми телефон — «сейчас».</p>${body}</section>`;
  };
  const sectionLight = () => {
    const rows = SCREENS.map((s) => { const m = frameOf(s); if (!m) return missing(`${SCREEN_NAME[s]} · освещение`, `scene_${s}_${THEME}_${AP}.png`); if (lightDialogs(m)) return onlyNow(m, `${SCREEN_NAME[s]} · освещение`); return row(`${m.file}#light`, m, stylesOf(m, keysFor(s)), `${SCREEN_NAME[s]} · освещение`); }).join('');
    return `<section class="block" id="dt-light"><h2>Освещение сцены — те же цвета темы, другой свет</h2><p class="sp-note">Источники света, отсветы и глубина неба считаются из цветов выбранной темы. Слева — кадр приложения как есть; правее — тот же кадр, где по пикселям перекрашен только фон сцены: герой, надписи, стекло, карточка и таббар — как сняты.</p>${rows}</section>`;
  };
  const sectionArt = () => {
    const rows = SCREENS.map((s) => { const m = frameOf(s); if (!m || lightDialogs(m)) return ''; return row(`${m.file}#art`, m, stylesOf(m, ART_KEYS), `${SCREEN_NAME[s]} · стили`); }).join('');
    return `<section class="block" id="dt-art"><h2>Стили сцен — другие манеры рисования в цветах темы</h2><p class="sp-note">Суми-э (тушь на тёмной бумаге), маркер (пастельные штрихи), аврора, витраж (грани), бумажный коллаж. Каждый стиль берёт оттенок и свет темы, поэтому переносится на все темы; белый на зоне текста ≥ 4,5:1 — страж затемняет низ, если нужно.</p>${rows || '<p class="sp-note sp-warn">Кадры этой темы в этом оформлении ещё снимаются.</p>'}</section>`;
  };
  const sectionEvening = () => {
    const m = frameOf('home', 'evening'); if (!m) return `<section class="block" id="dt-evening"><h2>Вечерняя Главная — красная шапка после 20:00</h2><p class="sp-note sp-warn">Вечерний кадр для этой темы ещё снимается (scene_home_evening_${THEME}_${AP}.png).</p></section>`;
    const day = withSceneH(homeOld(THEME, 'day', AP), m.sceneH); const ev = withSceneH(homeOld(THEME, 'evening', AP), m.sceneH);
    const variants = [
      { key: 'ev_spark', name: 'Как днём + красный огонёк', why: 'дневная сцена темы, от вечера остаётся только маленький тёплый огонёк слева снизу', spec: Object.assign({}, day, { lights: day.lights.concat([Object.assign({}, ev.lights[1], { rx: 80 * DPX / W, ry: 80 * DPX / m.sceneH, a: 0.42 })]) }) },
      { key: 'ev_soft', name: 'Мягче', why: 'тот же вечер, но свет справа и угли вдвое слабее — красная шапка не спорит с текстом', spec: Object.assign({}, ev, { lights: [Object.assign({}, ev.lights[0], { a: 0.32 }), Object.assign({}, ev.lights[1], { a: 0.28, rx: 110 * DPX / W, ry: 110 * DPX / m.sceneH })] }) },
      { key: 'dawn', name: 'Новый · закатный горизонт', why: 'вечер как тёплый свет от горизонта снизу, спокойный верх', spec: styleSpec(THEME, m, 'dawn') },
    ];
    return `<section class="block" id="dt-evening"><h2>Вечерняя Главная — красная шапка после 20:00</h2><p class="sp-note">Слева — вечер как сейчас (серия под угрозой: тёплый свет справа, угли слева). Три варианта по списку владельца: как днём с красным огоньком · мягче · новый.</p>${row(`${m.file}#evening`, m, variants, 'Главная · вечер')}</section>`;
  };
  /* карточки: полоса под сценой до таббара; прямоугольники — из описи кадра (detectCards); варианты — scene-cards.js */
  const sectionCards = () => {
    const m = frameOf('home'); const SC = window.SceneCards; const rings = '<p class="sp-note">Кольца аватара: по слову владельца остаётся только красное кольцо историй, фиолетовое кольцо Plus уходит — правит Дизайн в коде; на кадрах пока старые кольца.</p>';
    if (!m || !SC) return `<section class="block" id="dt-cards"><h2>Карточки и плашки — тон, тень, свет, без рамок</h2>${m ? '' : missing('Главная · карточки', `scene_home_${THEME}_${AP}.png`)}${rings}</section>`;
    if (!m.cards || !m.cards.length) return `<section class="block" id="dt-cards"><h2>Карточки и плашки — тон, тень, свет, без рамок</h2><p class="sp-note sp-warn">На кадре ${m.file} карточки не найдены описью — пересобрать scene-frames.cjs.</p>${rings}</section>`;
    const t = THEMES[THEME][AP]; const variants = Object.entries(SC.VARIANTS).map(([k, d]) => ({ key: 'card_' + k, name: d.name, why: d.why, spec: { v: d.v } }));
    const html = row(`${m.file}#cards`, m, variants, 'Главная · карточки');
    JOBS[`${m.file}#cards`].cards = { y0: Math.max(0, m.sceneH - 70), y1: m.tab || 2140, rects: m.cards, fill: m.cardFill, accent: C.hx(t.accent) };
    return `<section class="block" id="dt-cards"><h2>Карточки и плашки — тон, тень, свет, без рамок</h2><p class="sp-note">На кадре найдено ${m.cards.length} карточек (панель «Сегодня», плитки, «Фраза дня»). Меняется только заливка карточек и фон вокруг них: надписи и значки как сняты. Тон — в оттенке темы, тень — мягкая под карточкой, свет — кромка сверху; рамок нет.</p>${html}${rings}</section>`;
  };

  const controls = () => {
    const el = document.getElementById('dtThemes'); if (el) el.innerHTML = THEME_LIST.map((id) => `<span class="chp${THEME === id ? ' on' : ''}${hasFrame(id, AP) ? '' : ' off'}" data-dt-th="${id}" title="${hasFrame(id, AP) ? '' : 'кадр снимается'}">${THEMES[id].name}</span>`).join('');
    const ap = document.getElementById('dtAp'); if (ap) ap.innerHTML = [['dark', 'Тёмное'], ['light', 'Светлое']].map(([k, n]) => `<span class="chp${AP === k ? ' on' : ''}" data-dt-ap="${k}">${n}</span>`).join('');
    const n = document.getElementById('dtCount'); if (n) n.textContent = `${THEME_LIST.filter((id) => hasFrame(id, AP)).length} из ${THEME_LIST.length} тем сняты (${APN(AP)}) · ${frames.length} кадров`;
  };
  const release = (root) => root.querySelectorAll('.ph[data-will]').forEach((ph) => { try { URL.revokeObjectURL(ph.dataset.will); } catch (e) { console.log(LOG, 'revoke', e.message); } });
  const render = () => {
    const root = document.getElementById('dt'); if (!root) return; release(root); JOBS = {};
    const t0 = performance.now();
    root.innerHTML = sectionColors() + sectionLight() + sectionArt() + sectionEvening() + sectionCards();
    controls();
    const u = new URL(location.href); u.searchParams.set('th', THEME); u.searchParams.set('ap', AP); history.replaceState(null, '', u);
    console.log(LOG, 'render', JSON.stringify({ theme: THEME, ap: AP, frames: (byTheme[THEME] || []).filter((m) => m.ap === AP).map((m) => m.file), jobs: Object.keys(JOBS).length, ms: Math.round(performance.now() - t0) })); // guard-ok: одна строка на перерисовку
    window.SceneReal.buildAll(root, JOBS);
  };
  document.body.addEventListener('click', (e) => {
    const c = e.target.closest('.chp[data-dt-th]'); if (c) { THEME = c.dataset.dtTh; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const a = e.target.closest('.chp[data-dt-ap]'); if (a) { AP = a.dataset.dtAp; render(); }
  });
  render();
  window.__dt = { THEME_LIST, byTheme, paletteOf, homeOld, dialogsOld, bPlusSpec, ensureContrast, render, setTheme: (id, ap) => { THEME = id; if (ap) AP = ap; render(); }, jobs: () => JOBS };
})();
