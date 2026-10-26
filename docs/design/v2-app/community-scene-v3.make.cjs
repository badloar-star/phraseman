// make.cjs — собирает docs/design/v2-app/community-scene-v3.html: движок (CSS тем, сцены, стекла, таббара, пьедестала, шторки)
// копируется ДОСЛОВНО из утверждённого эталона peak-scene-v2.html по диапазонам строк; снимок 23 тем и коды значков — его же строки.
// зачем (владелец 26.10 через координатора: «строго соблюдённый стиль всех разделов», «Сцена как на Главной», «движок тем и сцены
// бери оттуда, не изобретай свой»): так макет «Наборов» гарантированно продолжает Главную и Пик, а не рисует свою систему стилей.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'peak-scene-v2.html');
const OUT = path.join(__dirname, 'community-scene-v3.html');
const L = fs.readFileSync(SRC, 'utf8').split('\n');
// [от, до] включительно (1-based) и начало первой строки — чтобы диапазон не уехал при правке эталона
const RANGES = [
  [14, 15, '@font-face'], [17, 33, '/* ── темы ── */'], [35, 69, '/* ── общие детали ── */'], [71, 76, '/* аватар'],
  [78, 88, '/* плавающий таббар'], [90, 93, '/* шторка и затемнение */'], [337, 339, '.thm {'], [345, 345, '@media (prefers-reduced-motion'],
  [352, 391, '/* ── общее ── */'], [398, 428, '/* ═════ A · Сцена'], [540, 562, '/* ───────── Пик в языке «Сцены»'],
  [564, 591, '/* панель «Комната недели» */'], [722, 727, '/* ───────── «Сцена» по токенам темы'], [739, 745, '.pk2-copy {'], [749, 777, '/* блоки пьедестала'],
  [791, 799, '/* «Играть» — закреплена'],
];
const engineCss = RANGES.map(([a, b, head]) => {
  if (!L[a - 1].startsWith(head)) throw new Error(`[CS3-MAKE] строка ${a} эталона не «${head}»: ${L[a - 1].slice(0, 60)}`);
  return L.slice(a - 1, b).join('\n');
}).join('\n');
const themesLine = L.find((l) => l.startsWith('<script>window.__THEMES = '));
const icodeLine = L.find((l) => l.startsWith('<script>window.__ICODE = '));
if (!themesLine || !icodeLine) throw new Error('[CS3-MAKE] в эталоне нет строк __THEMES / __ICODE');

const csCss = `
/* ───────── Наборы сообщества · «Набор месяца» (владелец 26.10 через координатора) ─────────
   Выше — движок эталона peak-scene-v2.html без изменений. Ниже только то, чего в Пике нет: обложка-плитка набора в тоне сцены темы,
   переключатель «Топ / Новые» из чипов, строка карточки с правкой ИИ, окно победителя. Классы с префиксом cs-, обводок нет (стиль «Тень»). */
.ph.th-ink { --st-top: oklch(.47 .14 282); --st-bot: oklch(.28 .10 276); --st-glow: oklch(.66 .13 300 / .9); }
.ph.th-marine { --st-top: oklch(.36 .08 214); --st-bot: oklch(.15 .05 222); --st-glow: oklch(.55 .10 200 / .85); }
.cs-cat .a-stage { height: 580px; }
.cs-pack .a-stage { height: 520px; }
.cs-check .a-stage { height: 400px; }
.cs-hero { position: absolute; z-index: 1; display: block; filter: drop-shadow(0 28px 34px rgba(0, 0, 0, .45)); pointer-events: none; }
.cs-copy { width: 210px; }
.cs-copy .a-title { font-size: 36px; line-height: 40px; letter-spacing: -.7px; }
.cs-copy .a-prog { margin-top: 8px; }
.cs-copy .a-prog .io { font-size: 14px; }
.cs-copy .pk-rew { margin-top: 12px; }
.cs-nm { max-width: 100%; padding: 0 8px; overflow: hidden; text-overflow: ellipsis; }
.cs-cat .pk2-me .s .io { color: #fff; }
.cs-seg { margin-left: auto; display: flex; gap: 6px; }
.cs-seg .qchip { height: 32px; padding: 0 13px; font-size: 14px; }
.qchip.on { background: var(--solid); color: var(--on-solid); }
.cs-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0 10px; }
.cs-tile { position: relative; min-height: 158px; border-radius: 22px; overflow: hidden; color: #fff; padding: 12px; display: flex; flex-direction: column; box-shadow: var(--sh);
  background: radial-gradient(90% 70% at 100% 0%, var(--st-glow), transparent 70%), linear-gradient(165deg, var(--st-top) 0%, var(--st-bot) 100%); }
.cs-tr { display: flex; align-items: center; gap: 6px; }
.cs-tr .qchip { height: 28px; padding: 0 9px; font-size: 13px; gap: 4px; }
.cs-tr .qchip .io { font-size: 13px; }
.cs-rank { margin-left: auto; width: 26px; height: 26px; border-radius: 13px; background: #fff; color: #121318; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.cs-tt { font-size: 17px; line-height: 21px; font-weight: 700; margin-top: auto; padding-top: 24px; letter-spacing: -.2px; text-wrap: balance; }
.cs-tb { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, .92); }
.cs-tb b { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
.cs-tb .io { font-size: 13px; }
.a-cta .qbtn.glass.cs-like { flex: none; width: auto; padding: 0 18px; height: 54px; border-radius: 27px; font-size: 17px; }
.cs-fix { display: flex; align-items: center; gap: 12px; margin: 6px -8px; padding: 10px 10px 10px 12px; border-radius: 18px; background: color-mix(in srgb, var(--acc) 13%, transparent); }
.cs-fix .tx { flex: 1; min-width: 0; }
.cs-fix .t { font-size: 16px; line-height: 21px; font-weight: 700; }
.cs-fix .s { font-size: 14px; line-height: 19px; color: var(--sec); }
.cs-fix .w { font-size: 14px; line-height: 19px; font-weight: 700; color: var(--acc); margin-top: 4px; display: flex; align-items: center; gap: 5px; }
.cs-fix .w .io { font-size: 14px; }
.cs-modal { position: absolute; left: 22px; right: 22px; top: 50%; transform: translateY(-50%); z-index: 45; border-radius: 30px; background: var(--card); box-shadow: var(--sh2); padding: 28px 20px 20px; overflow: hidden; }
.cs-conf { position: absolute; left: 0; right: 0; top: 0; height: 150px; pointer-events: none; }
.cs-conf i { position: absolute; width: 8px; height: 13px; border-radius: 3px; opacity: .85; }
.cs-medal { position: relative; width: 96px; height: 96px; border-radius: 48px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 46px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 14%, transparent); box-shadow: 0 0 0 12px color-mix(in srgb, var(--acc) 7%, transparent); }
.cs-prize { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 16px; height: 54px; border-radius: 18px; background: color-mix(in srgb, var(--acc) 13%, transparent); font-size: 17px; font-weight: 700; }
.cs-prize .io { font-size: 20px; color: var(--acc); }
.cs-modal .pk-me .s .io { color: var(--sec); }
.cs-modal .pk-pod .p .c .io { font-size: 12px; }
`;

const script = `
(() => {
const { phone, block, col } = K;
/* коды значков — из эталона; добавлены те, что есть в том же шрифте приложения (Ionicons 7.x glyphmap), а в Пике не нужны */
const CODE = Object.assign({}, window.__ICODE || {}, { heart: 'f36a', 'heart-outline': 'f377', add: 'f103', close: 'f24a', 'ellipsis-horizontal': 'f2ce', sparkles: 'f58c', 'medal-outline': 'f446', 'checkmark-circle': 'f21e' });
const io = (n, st = '') => { const c = CODE[n]; if (!c) throw new Error('[CS3] нет значка ' + n); return \`<i class="io" aria-hidden="true"\${st ? \` style="\${st}"\` : ''}>&#x\${c};</i>\`; };
let TH = 'ink';
const T = (h, extra = '') => h.replace('class="ph"', \`class="ph th-\${TH}\${extra ? ' ' + extra : ''}"\`);
const ci = (r, s) => \`<img src="\${K.coin(r)}" alt="" style="width:\${s}px;height:\${s}px;border-radius:50%;display:block;flex:none">\`;

/* ═════ цвета каждой темы — дословно из эталона peak-scene-v2.html (сцена = 30 % акцента поверх фона в тёмном; светлое — глубина «Сумерек») ═════ */
const THEMES = window.__THEMES || {};
const THEME_IDS = Object.keys(THEMES);
let THEME_ID = 'graphite';
let AP = 'light';
const hx = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const ha = (h) => { const s = String(h).replace('#', ''); return s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1; };
const mixc = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const rgba = (c, a = 1) => \`rgba(\${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},\${a})\`;
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
  return [\`--bg:linear-gradient(180deg,\${t.bgTop} 0%,\${t.bg} 55%,\${t.bgBottom} 100%)\`, \`--top:\${t.bgTop}\`, \`--bot:\${t.bgBottom}\`, \`--tx:\${t.text}\`, \`--sec:\${t.secondary}\`,
    \`--card:\${t.opaqueCard}\`, \`--ctl:\${t.opaqueControl}\`, \`--acc:\${t.accentText}\`, \`--solid:\${t.cta}\`, \`--on-solid:\${t.ctaInk}\`, \`--sb:\${t.text}\`,
    \`--st-top:\${rgba(k.top)}\`, \`--st-bot:\${rgba(k.bot)}\`, \`--st-glow:\${k.glow}\`, \`--st-eve-top:\${rgba(k.eveTop)}\`, \`--st-eve-bot:\${rgba(k.eveBot)}\`].join(';');
};
const tok = (html, id, ap) => (id === 'ink' && ap === 'light' ? html
  : html.replace(/class="ph th-(ink|marine)([^"]*)"/, (m, th, rest) => \`class="ph th-\${th}\${rest} hs-tok\${ap === 'dark' ? ' dk' : ''}" style="\${tokCss(id, ap)}"\`));

/* герой сцены — веер карточек из assets (community_*_fan): в тоне акцента темы, как герои Главной берутся по теме */
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
const hero = (w, right, top, st = '') => \`<img class="cs-hero" src="assets/\${fanFor(THEME_ID, AP)}.webp" alt="" style="width:\${w}px;right:\${right}px;top:\${top}px;\${st}">\`;

/* ── данные примера (имена и ранги монет — как в эталоне Пика) ── */
const LEAD = [{ t: 'Phrasal verbs', a: 'Ol Zar', r: 6, likes: 214, n: 16 }, { t: 'B2 глаголы', a: 'Ирина', r: 3, likes: 167, n: 49 }, { t: 'Forest berry', a: 'Лидия', r: 9, likes: 121, n: 15 }];
const MINE = { t: 'Созвоны и письма', r: 5, likes: 38, place: 7, gap: 84 };
const TILES = [...LEAD, { t: 'Антоніми дієслів', a: 'Natalia', r: 4, likes: 97, n: 30 }];
const WORDS = [['Significant', 'значительный'], ['Crucial', 'решающий'], ['Inevitable', 'неизбежный'], ['Detrimental', 'вредный'], ['Beneficial', 'полезный'], ['Remarkable', 'примечательный']];
const CHECK = { fix: [['Me gustaría un te', 'я бы хотел чай', 'Опечатка — té'], ['Para llevar', 'для нести', 'Точнее — с собой']],
  ok: [['Un café con leche', 'кофе с молоком'], ['La cuenta, por favor', 'счёт, пожалуйста'], ['Un cortado', 'кофе с каплей молока']] };

/* ── общие детали экрана (таббар, шапка «Сообщества», телефон) — как в эталоне ── */
const TABS = [['home-outline', 'Главная'], ['book-outline', 'Обучение'], ['play-circle-outline', 'Видео'], ['people-outline', 'Сообщество'], ['settings-outline', 'Настройки']];
const tabbar = () => \`<div class="qfade"></div><div class="tbar"><div class="cap" style="left:calc(9px + 3 * (100% - 18px) / 5)"></div>\${TABS.map(([i, l], k) => \`<div class="ti\${k === 3 ? ' on' : ''}">\${io(k === 3 ? 'people' : i)}<span>\${l}</span></div>\`).join('')}</div>\`;
const seg = () => \`<div class="pk-top"><div class="pk-seg"><span class="t">Пик</span><span class="t">Друзья</span><span class="on t">Наборы</span></div><span class="qchip glass t" style="margin-left:auto;padding:0 10px 0 12px">EN\${io('chevron-down', 'font-size:13px;opacity:.85')}</span></div>\`;
const ph = (body, o = {}) => tok(T(phone(body, { time: o.time || '18:10', inStyle: 'padding:0', fixed: (o.fixed || '') + tabbar(), overlay: o.overlay || '' }), 'onart'), THEME_ID, AP);
const dock = (label, icon) => \`<div class="pk2-dock"><div class="qbtn solid t">\${io(icon)}\${label}</div></div>\`;

/* ═════ 1 · каталог «Наборы»: сцена с «Набором месяца» — пьедестал V2 (утверждён 22.10), твоё место, панель Топ/Новые с плитками ═════ */
const blk = (x, y, w, h, inner, cls = '') => \`<div class="pk2-blk\${cls}" style="left:\${x}px;top:\${y}px;width:\${w}px;height:\${h}px">\${inner}</div>\`;
const coinAt = (r, x, y, s) => \`<div class="pk2-coin" style="left:\${x}px;top:\${y}px;width:\${s}px;height:\${s}px"><img src="\${K.coin(r)}" alt=""></div>\`;
const face = (place, p) => \`<span class="pl">\${place}</span><span class="nm cs-nm">\${p.t}</span><span class="cn">\${io('heart')}\${p.likes}</span>\`;
const pedestal = () => blk(22, 430, 124, 100, \`<span style="height:12px"></span>\${face(2, LEAD[1])}\`) + blk(153, 406, 124, 124, \`<span style="height:22px"></span>\${face(1, LEAD[0])}\`, ' first')
  + blk(284, 450, 124, 80, \`<span style="height:12px"></span>\${face(3, LEAD[2])}\`) + coinAt(LEAD[1].r, 65, 410, 38) + coinAt(LEAD[0].r, 191, 380, 48) + coinAt(LEAD[2].r, 327, 430, 38);
const catCopy = () => \`<div class="pk2-copy cs-copy"><div class="a-kick">Набор месяца · октябрь</div><div class="a-title">Ещё 5 дней</div><div class="a-prog">\${io('heart')}Голос — это лайк</div><div class="pk-rew"><span class="np t">Условия участия\${io('chevron-forward')}</span></div></div>\`;
const meBlock = () => \`<div class="pk2-me" style="left:20px;top:300px"><div class="k">Твой набор · \${MINE.t}</div><div class="v">\${ci(MINE.r, 30)}\${MINE.place} место</div><div class="s">\${io('heart')}\${MINE.likes} · до тройки ещё \${MINE.gap}</div></div>\`;
const catStage = () => \`<div class="a-stage"><div class="a-glow" style="right:10px;top:140px;width:260px;height:260px"></div>\${hero(224, -18, 92)}<div class="a-scrim"></div><div class="a-top">\${seg()}</div>\${catCopy()}\${meBlock()}\${pedestal()}</div>\`;
const segTop = (on = 0) => \`<div class="cs-seg">\${['Топ', 'Новые'].map((s, i) => \`<div class="qchip t\${i === on ? ' on' : ''}">\${s}</div>\`).join('')}</div>\`;
const tile = (p, i) => \`<div class="cs-tile t"><div class="cs-tr"><span class="qchip glass">\${io('copy-outline')}\${p.n}</span>\${i < 3 ? \`<span class="cs-rank">\${i + 1}</span>\` : ''}</div><div class="cs-tt">\${p.t}</div><div class="cs-tb">\${ci(p.r, 22)}<span>\${p.a}</span><b>\${io('heart')}\${p.likes}</b></div></div>\`;
const catPanel = () => \`<div class="a-panel"><div class="hm-h">Наборы\${segTop(0)}</div><div class="cs-tiles">\${TILES.map(tile).join('')}</div></div>\`;
const catalog = (overlay = '') => ph(\`<div class="cs-cat">\${catStage()}\${catPanel()}<div style="height:230px"></div></div>\`, { fixed: dock('Создать набор', 'add'), overlay });

/* ═════ 2 · экран набора: «Добавить себе» и лайк — свой блок в сцене, карточки — панелью ниже ═════ */
const packStage = () => \`<div class="a-stage"><div class="a-glow" style="right:20px;top:90px;width:240px;height:240px"></div>\${hero(206, -10, 94)}<div class="a-scrim"></div>
  <div class="a-top"><div class="pk-top"><span class="qround glass t">\${io('chevron-back')}</span><span style="flex:1"></span><span class="qround glass t">\${io('ellipsis-horizontal')}</span></div></div>
  <div class="a-body"><div class="a-kick">English · B1 · 25 карточек</div><div class="a-title">25 прилагательных</div><div class="a-prog">\${ci(0, 22)}Jericco13 · 3 добавили</div>
  <div class="a-cta"><div class="qbtn white t">\${io('add')}Добавить себе</div><div class="qbtn glass cs-like t">\${io('heart-outline')}12</div></div></div></div>\`;
const wrow = ([w, t]) => \`<div class="hm-row t"><span class="ic">\${io('volume-high')}</span><div class="tx"><div class="t">\${w}</div><div class="s">\${t}</div></div></div>\`;
const packPanel = () => \`<div class="a-panel"><div class="hm-h">Карточки<span>25</span></div>\${WORDS.map(wrow).join('')}</div>\`;
const pack = () => ph(\`<div class="cs-pack">\${packStage()}\${packPanel()}<div style="height:150px"></div></div>\`);

/* ═════ 3 · создание набора, шаг «Проверка»: что поправить — на карточке, одна кнопка «Опубликовать и участвовать», язык любой ═════ */
const checkStage = () => \`<div class="a-stage"><div class="a-glow" style="right:10px;top:60px;width:220px;height:220px"></div>\${hero(186, -8, 84)}<div class="a-scrim"></div>
  <div class="a-top"><div class="pk-top"><span class="qround glass t">\${io('chevron-back')}</span><span style="flex:1"></span><span class="qchip glass">3 из 3</span></div></div>
  <div class="a-body"><div class="a-kick">Новый набор · Español</div><div class="a-title">Проверка</div><div class="a-count">\${io('sparkles')}Поправь 2 карточки — и в конкурс</div></div></div>\`;
const okRow = ([w, t]) => \`<div class="hm-row"><span class="ck on">\${io('checkmark')}</span><div class="tx"><div class="t">\${w}</div><div class="s">\${t}</div></div></div>\`;
const fixRow = ([w, t, why]) => \`<div class="cs-fix"><div class="tx"><div class="t">\${w}</div><div class="s">\${t}</div><div class="w">\${io('sparkles')}\${why}</div></div><span class="qchip on t">Исправить</span></div>\`;
const checkPanel = () => \`<div class="a-panel"><div class="hm-h">Карточки<span>12</span></div>\${CHECK.fix.map(fixRow).join('')}\${CHECK.ok.map(okRow).join('')}</div>\`;
const check = () => ph(\`<div class="cs-check">\${checkStage()}\${checkPanel()}<div style="height:230px"></div></div>\`, { fixed: dock('Опубликовать и участвовать', 'trending-up') });

/* ═════ 4 · шторка «Условия участия» — кратко, одной кнопкой ═════ */
const rules = () => \`<div class="qdim"></div><div class="qsheet"><div class="qgrab"></div><div class="qt" style="text-align:center">Условия участия</div><div class="qm" style="text-align:center;margin-top:4px">Октябрь · итоги 1 ноября</div><div style="margin-top:10px">\${[['heart', 'Голос — это лайк. Один на набор'], ['albums-outline', 'Участвуют все новые наборы месяца'], ['trophy', '1 место — Plus на 3 месяца'], ['medal-outline', '2 и 3 место — по 500 монет']].map(([i, t]) => \`<div class="hm-row"><span class="ic">\${io(i)}</span><div class="tx"><div class="t">\${t}</div></div></div>\`).join('')}</div><div class="qbtn solid t" style="margin-top:16px">Понятно</div></div>\`;

/* ═════ 5 · победитель месяца и 6 · итоги для всех — окно поверх каталога ═════ */
const confetti = () => \`<div class="cs-conf">\${Array.from({ length: 14 }, (_, i) => \`<i style="left:\${6 + (i * 23) % 88}%;top:\${(i * 31) % 36}%;transform:rotate(\${(i * 47) % 180}deg);background:\${['var(--acc)', 'var(--good)', 'color-mix(in srgb, var(--acc) 45%, var(--tx))'][i % 3]}"></i>\`).join('')}</div>\`;
const winner = () => \`<div class="qdim"></div><div class="cs-modal">\${confetti()}<div class="cs-medal">\${io('trophy')}</div><div class="qk" style="justify-content:center;margin-top:18px">Набор месяца · октябрь</div><div class="qt" style="font-size:26px;line-height:31px;text-align:center">Твой набор — №1!</div><div class="qm" style="text-align:center;margin-top:6px">«\${MINE.t}» · \${io('heart')} 214</div><div class="cs-prize">\${io('diamond')}Plus на 3 месяца</div><div class="qbtn solid t" style="margin-top:16px">Забрать приз</div></div>\`;
const results = () => \`<div class="qdim"></div><div class="cs-modal"><div class="qk" style="justify-content:center">Набор месяца · октябрь</div><div class="qt" style="font-size:26px;line-height:31px;text-align:center">Итоги</div><div class="pk-pod" style="margin-top:16px">\${LEAD.map((p, i) => \`<div class="p\${i === 0 ? ' first' : ''}">\${ci(p.r, 40)}<div class="nm">\${p.t}</div><div class="c">\${io('heart')}\${p.likes}</div></div>\`).join('')}</div><div class="pk-me">\${ci(MINE.r, 40)}<div class="tx"><div class="t">\${MINE.t}</div><div class="s">\${io('heart')}\${MINE.likes}</div></div><span class="c">\${MINE.place} место</span></div><div class="qbtn solid t" style="margin-top:16px">Смотреть наборы</div></div>\`;

const controls = () => {
  document.getElementById('apList').innerHTML = [['light', 'Светлое'], ['dark', 'Тёмное']].map(([k, n]) => \`<span class="chp\${AP === k ? ' on' : ''}" data-ap="\${k}">\${n}</span>\`).join('');
  document.getElementById('thmList').innerHTML = THEME_IDS.map((id) => \`<span class="chp\${THEME_ID === id ? ' on' : ''}" data-th="\${id}">\${THEMES[id].name}</span>\`).join('');
};
const render = () => {
  TH = AP === 'light' ? 'ink' : 'marine';
  const name = THEMES[THEME_ID] ? THEMES[THEME_ID].name : THEME_ID;
  document.getElementById('root').innerHTML = block('cs', \`Наборы и «Набор месяца» — «\${name}», \${AP === 'dark' ? 'тёмное' : 'светлое'}\`, '', [
    col('Каталог «Наборы»', catalog()), col('Набор', pack()), col('Создание набора · проверка ИИ', check()),
    col('Условия участия', catalog(rules())), col('Победитель месяца', catalog(winner())), col('Итоги месяца', catalog(results())),
  ]);
  controls();
};
document.body.addEventListener('click', (e) => {
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
window.__cs3 = { fanFor, THEME_IDS };
})();
`;

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Сообщество → Наборы: Сцена и «Набор месяца»</title>
<link rel="stylesheet" href="kit.css">
<style>
/* ───────── PhraseMan 2.0 · Сообщество → Наборы · «Набор месяца» (владелец 26.10 через координатора) ─────────
   зачем: «невероятно качественно, в строго соблюдённом стиле всех разделов», «премиально, дорого, по-игровому, Сцена как на Главной»,
   «минимум экранов, минимум кнопок», «всё слушает активные темы». Движок — утверждённый эталон peak-scene-v2.html (сцена, стекло, таббар 2.0,
   переключатель 23 тем и светлого/тёмного вида, пьедестал V2) — скопирован дословно сборщиком community-scene-v3.make.cjs (лежит рядом; пересборка: node community-scene-v3.make.cjs).
   Шесть телефонов: каталог с «Набором месяца», набор, создание с проверкой ИИ, условия участия, победитель, итоги. Код приложения не менялся. */
${engineCss}
${csCss}
</style>
</head>
<body>
<div class="page">
  <h1 class="page-h1">Сообщество → Наборы: Сцена и «Набор месяца»</h1>
  <p class="page-lead">Раздел «Наборы» продолжает Главную и Пик: та же Сцена, стекло и таббар 2.0, цвета — каждой темы приложения. Конкурс «Набор месяца»: голос — это лайк, участвуют все новые наборы месяца, призы — Plus и монеты (цифры — на утверждение).</p>
  <div class="thm"><span style="font-size:13px;color:#8E8E96;font-weight:700;margin-right:6px">Оформление</span><span id="apList"></span></div>
  <div class="thm" id="thmList" style="flex-wrap:wrap;row-gap:8px"></div>
  <div id="root"></div>
</div>
<script src="kit.js"></script>
${themesLine}
${icodeLine}
<script>
${script}
</script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('[CS3-MAKE] записан', OUT, html.length, 'байт; движок', engineCss.split('\n').length, 'строк из эталона');
