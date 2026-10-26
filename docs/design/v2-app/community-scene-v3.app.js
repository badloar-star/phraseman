/* community-scene-v3.app.js — живой макет «Наборы / Набор месяца» на движке эталона Пика.
   зачем (владелец 26.10 через координатора: «ВСЁ КРАСИВО, ВСЁ АНИМИРОВАННО, ВСЁ ПРЕМИАЛЬНО И ВСЁ УДОБНО»; кнопки кликабельны,
   переходы между экранами): шесть телефонов, в каждом — стопка экранов с въездом как в приложении; лайк, «Добавить себе», «Топ / Новые»,
   проверка ИИ, шторка и окна срабатывают сразу (Optimistic UI), сеть не ждут. Цвета 23 тем и сцена — те же функции, что в peak-scene-v2.
   Тайминги — из приложения (см. community-scene-v3.css). prefers-reduced-motion: CSS гасит анимации, JS не ждёт паузы. */
(() => {
const { block, col } = K;
const THEMES = window.__THEMES || {};
const THEME_IDS = Object.keys(THEMES);
let THEME_ID = 'graphite';
let AP = 'light';
let TH = 'ink';
const LOG = '[CS3]';
/* коды значков — из эталона; добавлены те, что есть в том же шрифте приложения (Ionicons glyphmap), а Пику не нужны */
const CODE = Object.assign({}, window.__ICODE || {}, { heart: 'f36a', 'heart-outline': 'f377', add: 'f103', close: 'f24a', 'ellipsis-horizontal': 'f2ce', sparkles: 'f58c', 'medal-outline': 'f446', 'checkmark-circle': 'f21e' });
const io = (n, st = '') => { const c = CODE[n]; if (!c) throw new Error(`${LOG} нет значка ${n}`); return `<i class="io" aria-hidden="true"${st ? ` style="${st}"` : ''}>&#x${c};</i>`; };
const glyph = (n) => `&#x${CODE[n]};`;
const ci = (r, s) => `<img src="${K.coin(r)}" alt="" style="width:${s}px;height:${s}px;border-radius:50%;display:block;flex:none">`;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, RM() ? 0 : ms));
const after = (ms, f) => setTimeout(f, RM() ? 0 : ms);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const T = (h, extra = '') => h.replace('class="ph"', `class="ph th-${TH}${extra ? ' ' + extra : ''}"`);

/* ═════ цвета каждой темы — дословно из эталона peak-scene-v2.html ═════ */
const hx = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const ha = (h) => { const s = String(h).replace('#', ''); return s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1; };
const mixc = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a})`;
const lumc = (c) => { const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratioc = (a, b) => { const x = lumc(a); const y = lumc(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const toLin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const oklchOf = (c) => {
  const [r, g, b] = c.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
};
const fromOklch = (L, C, H) => {
  const a = C * Math.cos(H * Math.PI / 180); const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
    .map((v) => Math.max(0, Math.min(255, toSrgb(Math.max(0, Math.min(1, v))))));
};
const sceneTok = (id, ap) => {
  const t = THEMES[id][ap]; const g = t.accentGradient || [t.accent, t.accent];
  if (ap === 'dark') {
    const top = mixc(hx(g[0]), hx(t.bgTop), 0.3); const bot = mixc(hx(g[g.length - 1]), hx(t.bg), 0.3);
    const gl = (t.bgGlow && t.bgGlow[0]) || t.accentGlow;
    return { t, top, bot, glow: rgba(hx(gl), ha(gl)), eveTop: top, eveBot: bot, seam: ratioc(bot, hx(t.opaqueCard)) };
  }
  if (id === 'ink') {
    const top = fromOklch(0.47, 0.14, 282); const bot = fromOklch(0.28, 0.10, 276);
    return { t, top, bot, glow: 'oklch(.66 .13 300 / .9)', eveTop: fromOklch(0.30, 0.09, 285), eveBot: fromOklch(0.14, 0.05, 280), seam: ratioc(bot, hx('#FCFCFF')) };
  }
  const [, C, H] = oklchOf(hx(t.accent));
  const top = fromOklch(0.47, Math.min(C, 0.16), H); const bot = fromOklch(0.28, Math.min(C, 0.11), (H + 354) % 360);
  return { t, top, bot, glow: rgba(fromOklch(0.66, Math.min(C, 0.14), (H + 18) % 360), 0.9), eveTop: fromOklch(0.30, Math.min(C, 0.09), H), eveBot: fromOklch(0.14, Math.min(C, 0.05), H), seam: ratioc(bot, hx(t.opaqueCard)) };
};
const tokCss = (id, ap) => {
  const k = sceneTok(id, ap); const t = k.t;
  return [`--bg:linear-gradient(180deg,${t.bgTop} 0%,${t.bg} 55%,${t.bgBottom} 100%)`, `--top:${t.bgTop}`, `--bot:${t.bgBottom}`, `--tx:${t.text}`, `--sec:${t.secondary}`,
    `--card:${t.opaqueCard}`, `--ctl:${t.opaqueControl}`, `--acc:${t.accentText}`, `--solid:${t.cta}`, `--on-solid:${t.ctaInk}`, `--sb:${t.text}`,
    `--st-top:${rgba(k.top)}`, `--st-bot:${rgba(k.bot)}`, `--st-glow:${k.glow}`, `--st-eve-top:${rgba(k.eveTop)}`, `--st-eve-bot:${rgba(k.eveBot)}`].join(';');
};
const tok = (html, id, ap) => (id === 'ink' && ap === 'light' ? html
  : html.replace(/class="ph th-(ink|marine)([^"]*)"/, (m, th, rest) => `class="ph th-${th}${rest} hs-tok${ap === 'dark' ? ' dk' : ''}" style="${tokCss(id, ap)}"`));

/* герой сцены — веер карточек из assets (community_*_fan) в тоне акцента темы */
const FANS = { coral: 'community_02_coral_sunset_fan', violet: 'community_03_violet_nebula_fan', glacier: 'community_07_glacier_blue_fan', obsidian: 'community_11_obsidian_star_fan',
  steel: 'community_16_steel_blueprint_fan', coffee: 'community_19_coffee_leather_fan', pearl: 'community_26_ocean_pearl_fan', cloud: 'community_28_cloud_silver_fan' };
const fanFor = (id, ap) => {
  const t = THEMES[id] && THEMES[id][ap]; if (!t) return FANS.steel;
  const [, C, H] = oklchOf(hx(t.accent));
  if (C < 0.03) return ap === 'dark' ? FANS.obsidian : FANS.cloud;
  if (H < 30 || H >= 330) return FANS.coral;
  if (H < 100) return FANS.coffee;
  if (H < 228) return FANS.pearl;
  if (H < 244) return FANS.glacier;
  if (H < 270) return FANS.steel;
  return FANS.violet;
};
const hero = (w, right, top, st = '') => `<img class="cs-hero" src="assets/${fanFor(THEME_ID, AP)}.webp" alt="" style="width:${w}px;right:${right}px;top:${top}px;${st}">`;

/* ── данные примера (имена и ранги монет — как в эталоне Пика; «ты» — Денис, монета 5) ── */
const W = {
  'Phrasal verbs': [['give up', 'сдаться'], ['run out', 'закончиться'], ['look after', 'присматривать'], ['put off', 'отложить'], ['turn down', 'отказать'], ['get along', 'ладить']],
  'B2 глаголы': [['Lay', 'класть'], ['Claim', 'утверждать'], ['Convince', 'убеждать'], ['Assume', 'предполагать'], ['Maintain', 'поддерживать'], ['Reveal', 'раскрывать']],
  'Forest berry': [['Rowan', 'рябина'], ['Barberry', 'барбарис'], ['Blackberry', 'ежевика'], ['Cranberry', 'клюква'], ['Blueberry', 'черника'], ['Gooseberry', 'крыжовник']],
  'Антоніми дієслів': [['borrow', 'позичати'], ['lend', 'позичити'], ['bring', 'приносити'], ['take', 'брати'], ['open', 'відкривати'], ['close', 'закривати']],
  'Family': [['Family members', 'члены семьи'], ['Mommy', 'мама'], ['Daddy', 'папа'], ['Sister', 'сестра'], ['Brother', 'брат'], ['Grandma', 'бабушка']],
  'Сленг из сериалов': [['no cap', 'без шуток'], ['low-key', 'слегка'], ['vibe', 'настроение'], ['salty', 'обиженный'], ['ghost', 'пропасть'], ['flex', 'хвастаться']],
  'Созвоны и письма': [['deadline', 'срок'], ['follow up', 'напомнить'], ['agenda', 'повестка'], ['reschedule', 'перенести'], ['touch base', 'связаться'], ['wrap up', 'закруглиться']],
  '25 прилагательных': [['Significant', 'значительный'], ['Crucial', 'решающий'], ['Inevitable', 'неизбежный'], ['Detrimental', 'вредный'], ['Beneficial', 'полезный'], ['Remarkable', 'примечательный']],
  'В кафе по-испански': [['Un café con leche', 'кофе с молоком'], ['Me gustaría un té', 'я бы хотел чай'], ['La cuenta, por favor', 'счёт, пожалуйста'], ['Para llevar', 'с собой'], ['Un cortado', 'кофе с каплей молока'], ['Sin azúcar', 'без сахара']],
};
const P = (t, a, r, likes, n, extra = {}) => ({ t, a, r, likes, n, lang: 'English', lvl: 'B1', ...extra });
const LEAD = [P('Phrasal verbs', 'Ol Zar', 6, 214, 16, { lvl: 'A2' }), P('B2 глаголы', 'Ирина', 3, 167, 49, { lvl: 'B2' }), P('Forest berry', 'Лидия', 9, 121, 15, { lvl: 'A1' })];
const MINE = P('Созвоны и письма', 'Денис', 5, 38, 40, { mine: true, place: 7 });
const TOP = [...LEAD, P('Антоніми дієслів', 'Natalia', 4, 97, 30, { lvl: 'A2' })];
const NEW = [MINE, P('Family', 'Лидия', 9, 9, 20, { lvl: 'A1' }), P('Сленг из сериалов', 'Tim', 2, 74, 18, { lvl: 'B2' }), TOP[3]];
const JERICCO = P('25 прилагательных', 'Jericco13', 0, 12, 25);
/* набор, который публикуется на экране «Проверка»: после «Опубликовать» встаёт первым в «Новых» — так публикация видна сразу */
const NEWPACK = P('В кафе по-испански', 'Денис', 5, 0, 12, { mine: true, lang: 'Español', lvl: 'A1' });
const PACKS = Object.fromEntries([...TOP, ...NEW, JERICCO, NEWPACK].map((p) => [p.t, p]));
const CHECK = { fix: [['Me gustaría un te', 'я бы хотел чай', 'Опечатка — té', 't', 'Me gustaría un té'], ['Para llevar', 'для нести', 'Точнее — с собой', 's', 'с собой']],
  ok: [['Un café con leche', 'кофе с молоком'], ['La cuenta, por favor', 'счёт, пожалуйста'], ['Un cortado', 'кофе с каплей молока']] };

/* ── общие детали экрана: статус-бар и таббар как в эталоне (значками), шапка «Сообщества», телефон ── */
const sb = (time = '18:10') => `<div class="sb"><span>${time}</span><span class="sys">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><path d="M8.5 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 008.5.5 10.8 10.8 0 001 3.4l1.2 1.3a9 9 0 016.3-2.5zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3a7.2 7.2 0 00-9.8 0l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.5c.5 0 1 .2 1.3.5L8.5 11.3 7.2 9.8c.3-.3.8-.5 1.3-.5z"/></svg>
    <span class="bat"></span></span></div>`;
const TABS = [['home-outline', 'Главная'], ['book-outline', 'Обучение'], ['play-circle-outline', 'Видео'], ['people-outline', 'Сообщество'], ['settings-outline', 'Настройки']];
const tabbar = () => `<div class="qfade"></div><div class="tbar"><div class="cap" style="left:calc(9px + 3 * (100% - 18px) / 5)"></div>${TABS.map(([i, l], k) => `<div class="ti${k === 3 ? ' on' : ''}" aria-label="${l}">${io(k === 3 ? 'people' : i)}<span>${l}</span></div>`).join('')}</div>`;
const seg = () => `<div class="pk-top" data-e style="--d:0ms"><div class="pk-seg"><span class="t">Пик</span><span class="t">Друзья</span><span class="on t">Наборы</span></div><span class="qchip glass t" style="margin-left:auto;padding:0 10px 0 12px">EN${io('chevron-down', 'font-size:13px;opacity:.85')}</span></div>`;
const dock = (label, icon, act, cls = 'solid') => `<div class="pk2-dock" data-e style="--d:460ms"><div class="qbtn ${cls} t" data-act="${act}"><span class="cs-sw">${io(icon)}${label}</span></div></div>`;
const screen = (inner, fixed) => `<div class="cs-screen"><div class="scr"><div class="in">${inner}</div></div>${fixed}</div>`;
const like = (p, o = {}) => `<span class="cs-like${o.cls ? ' ' + o.cls : ''}${o.locked ? ' locked' : ''}${p.mine ? ' mine' : ''}" data-act="like">${io('heart-outline')}<span class="cs-num">${p.likes}</span></span>`;

/* ═════ 1 · каталог: сцена с «Набором месяца» (пьедестал V2), панель «Топ / Новые» с плитками, док «Создать набор» ═════ */
const blk = (x, y, w, h, inner, cls = '', d = 0) => `<div class="pk2-blk${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;--d:${d}ms">${inner}</div>`;
const coinAt = (r, x, y, s, d) => `<div class="pk2-coin" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;--d:${d}ms"><img src="${K.coin(r)}" alt=""></div>`;
const face = (place, p) => `<span class="pl">${place}</span><span class="nm cs-nm">${p.t}</span><span class="cn">${io('heart')}${p.likes}</span>`;
const pedestal = () => blk(22, 430, 124, 100, `<span style="height:12px"></span>${face(2, LEAD[1])}`, ' t', 240) + blk(153, 406, 124, 124, `<span style="height:22px"></span>${face(1, LEAD[0])}`, ' first t', 320)
  + blk(284, 450, 124, 80, `<span style="height:12px"></span>${face(3, LEAD[2])}`, ' t', 400) + coinAt(LEAD[1].r, 65, 410, 38, 330) + coinAt(LEAD[0].r, 191, 380, 48, 420) + coinAt(LEAD[2].r, 327, 430, 38, 490);
const catCopy = () => `<div class="pk2-copy cs-copy" data-e style="--d:120ms"><div class="a-kick">Набор месяца</div><div class="a-title">Ещё 5 дней</div><div class="pk-rew"><span class="np t" data-act="open:rules">Условия участия${io('chevron-forward')}</span></div></div>`;
const meBlock = () => `<div class="pk2-me" style="left:20px;top:300px;--d:200ms" data-e><div class="k">Твой набор</div><div class="v">${ci(MINE.r, 30)}${MINE.place} место</div><div class="s">${io('heart')}${MINE.likes}</div></div>`;
const catStage = () => `<div class="a-stage"><div class="a-glow" style="right:10px;top:140px;width:260px;height:260px"></div>${hero(224, -18, 92)}<div class="a-scrim"></div><div class="a-top">${seg()}</div>${catCopy()}${meBlock()}${pedestal()}</div>`;
const tile = (p, i, sort) => `<div class="cs-tile t${p === NEWPACK ? ' cs-new' : ''}" style="--d:${420 + i * 60}ms" data-act="go:pack:${p.t}"><div class="cs-tr"><span class="qchip glass">${io('copy-outline')}${p.n}</span>${sort === 'top' ? `<span class="cs-rank">${i + 1}</span>` : ''}</div><div class="cs-tt">${p.t}</div><div class="cs-tb">${ci(p.r, 22)}<span>${p.a}</span>${like(p)}</div></div>`;
const tiles = (sort, st = {}) => (sort === 'top' ? TOP : [...(st.published ? [NEWPACK] : []), ...NEW]).map((p, i) => tile(p, i, sort)).join('');
const segTop = (sort) => `<div class="cs-seg"><div class="cs-puck"></div>${[['top', 'Топ'], ['new', 'Новые']].map(([k, s]) => `<div class="qchip t${k === sort ? ' on' : ''}" data-act="seg:${k}">${s}</div>`).join('')}</div>`;
const catPanel = (st) => `<div class="a-panel" data-e style="--d:300ms"><div class="hm-h">Наборы${segTop(st.sort)}</div><div class="cs-tiles">${tiles(st.sort, st)}</div></div>`;
const catalogScreen = (st) => screen(`<div class="cs-cat cs-enter">${catStage()}${catPanel(st)}<div style="height:230px"></div></div>`, dock('Создать набор', 'add', 'go:check') + tabbar());

/* ═════ 2 · экран набора: «Добавить себе» и лайк — свой блок в сцене, карточки — панелью ниже ═════ */
const packScreen = (p) => screen(`<div class="cs-pack cs-enter"><div class="a-stage"><div class="a-glow" style="right:20px;top:90px;width:240px;height:240px"></div>${hero(206, -10, 94)}<div class="a-scrim"></div>
  <div class="a-top"><div class="pk-top" data-e><span class="qround glass t" data-act="back">${io('chevron-back')}</span><span style="flex:1"></span><span class="qround glass t">${io('ellipsis-horizontal')}</span></div></div>
  <div class="a-body" data-e style="--d:100ms"><div class="a-kick">${p.lang} · ${p.lvl}</div><div class="a-title">${p.t}</div><div class="a-prog">${ci(p.r, 22)}${p.a}</div>
  <div class="a-cta"><div class="qbtn white t${p.mine ? ' added' : ''}" data-act="add"><span class="cs-sw">${p.mine ? `${io('checkmark')}Твой набор` : `${io('add')}Добавить себе`}</span></div>${like(p, { cls: 'qbtn glass t', locked: !p.mine })}</div></div></div>
  <div class="a-panel" data-e style="--d:220ms"><div class="hm-h">Карточки<span>${p.n}</span></div>${(W[p.t] || W['25 прилагательных']).map(([w, t]) => `<div class="hm-row t"><span class="ic">${io('volume-high')}</span><div class="tx"><div class="t">${w}</div><div class="s">${t}</div></div></div>`).join('')}</div><div style="height:150px"></div></div>`, tabbar());

/* ═════ 3 · создание, шаг «Проверка»: карточки проверяются по очереди, правка — на месте, одна кнопка «Опубликовать и участвовать» ═════ */
const okRow = ([w, t]) => `<div class="hm-row pending" data-row="ok"><span class="ck">${io('checkmark')}</span><div class="tx"><div class="t">${w}</div><div class="s">${t}</div></div></div>`;
const fixRow = ([w, t, why, field, fixed]) => `<div class="cs-fix pending" data-row="fix" data-field="${field}" data-fixed="${fixed}"><span class="cs-ckp"></span><div class="tx"><div class="t">${w}</div><div class="s">${t}</div><div class="w">${io('sparkles')}${why}</div></div><span class="qchip on t" data-act="fix">Исправить</span></div>`;
const checkScreen = () => screen(`<div class="cs-check cs-enter"><div class="a-stage"><div class="a-glow" style="right:10px;top:60px;width:220px;height:220px"></div>${hero(186, -8, 84)}<div class="a-scrim"></div>
  <div class="a-top"><div class="pk-top" data-e><span class="qround glass t" data-act="back">${io('chevron-back')}</span><span style="flex:1"></span><span class="qchip glass">3 из 3</span></div></div>
  <div class="a-body" data-e style="--d:100ms"><div class="a-title">Проверка</div><div class="a-count" data-count-line>${io('sparkles')}Смотрим карточки…</div></div></div>
  <div class="a-panel" data-e style="--d:220ms"><div class="hm-h">Карточки<span data-checkhead>12</span></div>${fixRow(CHECK.fix[0])}${CHECK.ok.slice(0, 2).map(okRow).join('')}${fixRow(CHECK.fix[1])}${okRow(CHECK.ok[2])}</div><div style="height:230px"></div></div>`,
  dock('Опубликовать и участвовать', 'trending-up', 'publish', 'pk2-off') + tabbar());

/* ═════ 4 · шторка «Условия участия» · 5 · победитель · 6 · итоги ═════ */
const rulesSheet = () => `<div class="qdim" data-act="close"></div><div class="qsheet"><div class="qgrab"></div><div class="qt" style="text-align:center">Условия участия</div><div style="margin-top:10px">${[['heart', 'Голос — это лайк. Один на набор'], ['albums-outline', 'Участвуют все новые наборы месяца'], ['trophy', '1 место — Plus на 3 месяца'], ['medal-outline', '2 и 3 место — по 500 монет']].map(([i, t]) => `<div class="hm-row"><span class="ic">${io(i)}</span><div class="tx"><div class="t">${t}</div></div></div>`).join('')}</div><div class="qbtn solid t" style="margin-top:16px" data-act="close">Понятно</div></div>`;
const confetti = () => `<div class="cs-conf">${Array.from({ length: 18 }, (_, i) => `<i style="left:${4 + (i * 23) % 92}%;--d:${(i * 37) % 420};--dx:${((i * 29) % 60) - 30}px;--r:${120 + (i * 53) % 260}deg;background:${['var(--acc)', 'var(--good)', 'color-mix(in srgb, var(--acc) 45%, var(--tx))'][i % 3]}"></i>`).join('')}</div>`;
const winnerModal = () => `<div class="qdim"></div><div class="cs-modal">${confetti()}<div class="cs-medal">${io('trophy')}</div><div class="qk cs-late" style="justify-content:center;margin-top:18px;--d:260ms">Набор месяца · октябрь</div><div class="qt cs-late" style="font-size:26px;line-height:31px;text-align:center;--d:320ms">Твой набор — №1!</div><div class="qm cs-late" style="text-align:center;margin-top:6px;--d:380ms">«${MINE.t}» · ${io('heart')} <span data-count="214">0</span></div><div class="cs-prize cs-late" style="--d:520ms">${io('diamond')}Plus на 3 месяца</div><div class="qbtn solid t cs-late" style="margin-top:16px;--d:600ms" data-act="claim"><span class="cs-sw">Забрать приз</span></div></div>`;
const resultsModal = () => `<div class="qdim"></div><div class="cs-modal" style="top:120px"><div class="qk" style="justify-content:center">Набор месяца · октябрь</div><div class="qt" style="font-size:26px;line-height:31px;text-align:center">Итоги</div><div class="pk-pod" style="margin-top:16px">${LEAD.map((p, i) => `<div class="p${i === 0 ? ' first' : ''}" style="--d:${[260, 160, 360][i]}ms">${ci(p.r, 40)}<div class="nm">${p.t}</div><div class="c">${io('heart')}${p.likes}</div></div>`).join('')}</div><div class="pk-me cs-late" style="--d:460ms">${ci(MINE.r, 40)}<div class="tx"><div class="t">${MINE.t}</div><div class="s">${io('heart')}${MINE.likes}</div></div><span class="c">${MINE.place} место</span></div><div class="qbtn solid t cs-late" style="margin-top:16px;--d:540ms" data-act="close">Смотреть наборы</div></div>`;

/* ═════ телефон: стопка экранов, переходы, действия ═════ */
const topScreen = (ph) => ph.querySelector('.cs-stack').lastElementChild;
const mountScreen = (ph, html, how) => {
  const stack = ph.querySelector('.cs-stack'); const cur = stack.lastElementChild; const next = el(html);
  stack.appendChild(next);
  if (how === 'push' && cur) { cur.classList.add('cs-out'); next.classList.add('cs-in'); next.querySelector('.cs-enter')?.classList.remove('cs-enter'); after(380, () => { cur.classList.replace('cs-out', 'cs-hidden'); next.classList.remove('cs-in'); }); }
  const segEl = next.querySelector('.cs-seg'); if (segEl) { movePuck(segEl); if (document.fonts) document.fonts.ready.then(() => movePuck(segEl)); }
  if (next.querySelector('.cs-check')) runCheck(ph, next);
  return next;
};
const pop = (ph) => {
  const stack = ph.querySelector('.cs-stack'); const cur = stack.lastElementChild; const prev = cur && cur.previousElementSibling; if (!prev) return;
  prev.classList.remove('cs-hidden'); prev.classList.add('cs-back-in'); cur.classList.add('cs-back-out');
  after(360, () => { cur.remove(); prev.classList.remove('cs-back-in'); });
};
const openOverlay = (ph, html) => { const scr = topScreen(ph); const old = scr.querySelector('.cs-ov'); if (old) old.remove(); const ov = el(`<div class="cs-ov">${html}</div>`); scr.appendChild(ov); requestAnimationFrame(() => requestAnimationFrame(() => { ov.classList.add('on'); ov.querySelectorAll('[data-count]').forEach((n) => after(380, () => countUp(n))); })); return ov; };
const closeOverlay = (ph) => { const ov = topScreen(ph).querySelector('.cs-ov'); if (!ov || ov.classList.contains('off')) return; ov.classList.remove('on'); ov.classList.add('off'); after(340, () => ov.remove()); };
const movePuck = (segEl) => { const on = segEl.querySelector('.qchip.on'); const puck = segEl.querySelector('.cs-puck'); if (!on || !puck) return; puck.style.width = `${on.offsetWidth}px`; puck.style.transform = `translateX(${on.offsetLeft}px)`; };
const once = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); node.addEventListener('animationend', () => node.classList.remove(cls), { once: true }); };
const countUp = (node) => { const to = Number(node.dataset.count); if (RM()) { node.textContent = to; return; } const t0 = performance.now(); const dur = 900; const tick = (now) => { const p = Math.min(1, (now - t0) / dur); node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
const swapText = (node, html) => { node.classList.add('cs-blur'); after(160, () => { node.innerHTML = html; node.classList.remove('cs-blur'); }); };

/* лайк: сразу, с отскоком и прыжком счётчика; свой набор и набор до добавления — «нельзя» показываем покачиванием */
const toggleLike = (node) => {
  if (node.classList.contains('locked') || node.classList.contains('mine')) { once(node, 'cs-shake'); console.log(LOG, 'like:blocked', node.classList.contains('mine') ? 'own_pack' : 'not_added'); return; }
  const on = node.classList.toggle('on'); node.querySelector('.io').innerHTML = glyph(on ? 'heart' : 'heart-outline');
  const num = node.querySelector('.cs-num'); num.textContent = Number(num.textContent) + (on ? 1 : -1); once(num, on ? 'up' : 'dn'); once(node, 'cs-pop');
};
const addToMine = (btn) => {
  if (btn.classList.contains('added')) return;
  btn.classList.add('added'); swapText(btn.querySelector('.cs-sw'), `${io('checkmark')}В твоих наборах`);
  const lk = btn.parentElement.querySelector('.cs-like'); if (lk) { lk.classList.remove('locked'); once(lk, 'cs-pop'); }
};
/* проверка ИИ: по одной карточке, 320 мс на карточку; строка под заголовком и кнопка публикации меняются по факту */
const runCheck = async (ph, scr) => {
  const rows = [...scr.querySelectorAll('[data-row]')]; const head = scr.querySelector('[data-checkhead]');
  await wait(420);
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i]; if (!r.isConnected) return; r.classList.remove('pending');
    if (r.dataset.row === 'ok') { r.classList.add('ok'); r.querySelector('.ck').classList.add('on'); } else r.classList.add('issue');
    head.textContent = `${i + 1} из 12`;
    await wait(320);
  }
  head.textContent = '12';
  updateCheck(scr);
};
const updateCheck = (scr) => {
  const left = scr.querySelectorAll('.cs-fix.issue').length; const line = scr.querySelector('[data-count-line]'); const btn = scr.querySelector('[data-act="publish"]');
  swapText(line, `${io('sparkles')}${left === 2 ? 'Поправь 2 карточки — и в конкурс' : left === 1 ? 'Ещё одна карточка — и в конкурс' : 'Всё готово — публикуй'}`);
  if (left === 0) { btn.classList.replace('pk2-off', 'solid'); once(btn, 'cs-ready'); btn.dataset.ready = '1'; } else { btn.classList.replace('solid', 'pk2-off'); delete btn.dataset.ready; }
};
const fixCard = (scr, chip) => {
  const row = chip.closest('.cs-fix'); const target = row.querySelector(row.dataset.field === 't' ? '.t' : '.s');
  swapText(target, row.dataset.fixed); const w = row.querySelector('.w'); swapText(w, `${io('checkmark')}Исправлено`); w.classList.add('done');
  chip.replaceWith(el(`<span class="ck on">${io('checkmark')}</span>`)); row.classList.remove('issue'); row.classList.add('fixed');
  updateCheck(scr);
};
/* строка-тост сверху — как ActionToast layout 'top_line' в приложении (плитка 41 со значком + текст, въезд сверху, уход вверх) */
const toast = (scr, text) => { const t = el(`<div class="cs-toast"><span class="tile">${io('trophy')}</span>${text}</div>`); scr.appendChild(t); after(2200, () => { t.classList.add('off'); after(300, () => t.remove()); }); };

const act = (ph, node) => {
  const [name, ...rest] = node.dataset.act.split(':'); const arg = rest.join(':'); const scr = topScreen(ph);
  console.log(LOG, 'act', name, arg || '');
  if (name === 'like') return toggleLike(node);
  if (name === 'add') return addToMine(node);
  if (name === 'seg') { const segEl = node.parentElement; segEl.querySelectorAll('.qchip').forEach((c) => c.classList.toggle('on', c === node)); movePuck(segEl); ph._st = { ...ph._st, sort: arg }; const grid = scr.querySelector('.cs-tiles'); grid.classList.add('cs-fade'); after(150, () => { grid.innerHTML = tiles(arg, ph._st).replace(/--d:(\d+)ms/g, (m, v) => `--d:${v - 420}ms`); grid.classList.remove('cs-fade'); }); return; }
  if (name === 'go') { const where = arg.split(':')[0]; const key = arg.split(':').slice(1).join(':'); if (where === 'pack') mountScreen(ph, packScreen(PACKS[key] || JERICCO), 'push'); if (where === 'check') mountScreen(ph, checkScreen(), 'push'); return; }
  if (name === 'back') return pop(ph);
  if (name === 'open') { if (arg === 'rules') openOverlay(ph, rulesSheet()); return; }
  if (name === 'close') return closeOverlay(ph);
  if (name === 'fix') return fixCard(scr, node);
  if (name === 'publish') { if (!node.dataset.ready) { once(node, 'cs-shake'); return; } ph._st = { ...ph._st, sort: 'new', published: true }; const next = mountScreen(ph, catalogScreen(ph._st), 'push'); after(420, () => toast(next, 'Набор в конкурсе!')); return; }
  if (name === 'claim') { swapText(node.querySelector('.cs-sw'), `${io('checkmark')}Plus включён`); after(900, () => closeOverlay(ph)); return; }
  return undefined;
};

/* ═════ страница ═════ */
const PHONES = [
  ['catalog', 'Каталог «Наборы» — тапай плитки, ♥, «Условия участия», «Создать набор»', (ph) => mountScreen(ph, catalogScreen(ph._st))],
  ['pack', 'Набор — «Добавить себе», ♥, карточки', (ph) => mountScreen(ph, packScreen(JERICCO))],
  ['check', 'Создание набора — проверка ИИ, «Исправить», публикация', (ph) => mountScreen(ph, checkScreen())],
  ['rules', 'Условия участия', (ph) => { mountScreen(ph, catalogScreen(ph._st)); after(600, () => openOverlay(ph, rulesSheet())); }],
  ['winner', 'Победитель месяца', (ph) => { mountScreen(ph, catalogScreen(ph._st)); after(600, () => openOverlay(ph, winnerModal())); }],
  ['results', 'Итоги месяца', (ph) => { mountScreen(ph, catalogScreen(ph._st)); after(600, () => openOverlay(ph, resultsModal())); }],
];
const shell = (id) => tok(T(`<div class="ph" data-ph="${id}">${sb()}<div class="cs-stack"></div><div class="hi"></div></div>`, 'onart'), THEME_ID, AP);
const mountAll = () => {
  document.querySelectorAll('[data-ph]').forEach((ph) => { ph._st = { sort: 'top' }; ph.querySelector('.cs-stack').innerHTML = ''; const def = PHONES.find((p) => p[0] === ph.dataset.ph); def[2](ph); });
};
const controls = () => {
  document.getElementById('apList').innerHTML = [['light', 'Светлое'], ['dark', 'Тёмное']].map(([k, n]) => `<span class="chp${AP === k ? ' on' : ''}" data-ap="${k}">${n}</span>`).join('');
  document.getElementById('thmList').innerHTML = THEME_IDS.map((id) => `<span class="chp${THEME_ID === id ? ' on' : ''}" data-th="${id}">${THEMES[id].name}</span>`).join('') + '<span class="chp cs-replay" data-replay>Повторить</span>';
};
const render = () => {
  TH = AP === 'light' ? 'ink' : 'marine';
  const name = THEMES[THEME_ID] ? THEMES[THEME_ID].name : THEME_ID;
  document.getElementById('root').innerHTML = block('cs', `Наборы и «Набор месяца» — «${name}», ${AP === 'dark' ? 'тёмное' : 'светлое'}`, '', PHONES.map(([id, label]) => col(label, shell(id))));
  controls(); mountAll();
};
document.body.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]'); const ph = a && a.closest('[data-ph]');
  if (a && ph) { act(ph, a); return; }
  if (e.target.closest('[data-replay]')) { mountAll(); return; }
  const c = e.target.closest('.chp[data-ap], .chp[data-th]');
  if (!c) return;
  if (c.dataset.ap) AP = c.dataset.ap;
  if (c.dataset.th) THEME_ID = c.dataset.th;
  render();
});
{
  const q = new URLSearchParams(location.search);
  if (q.get('ap') === 'light' || q.get('ap') === 'dark') AP = q.get('ap');
  if (THEMES[q.get('th')]) THEME_ID = q.get('th');
}
render();
K.init();
window.__cs3 = { fanFor, THEME_IDS, mountAll };
})();
