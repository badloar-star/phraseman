/* scene-palettes.app.js — «Сцена» во всех 23 темах: палитра по теории цвета на всех экранах со сценой + герои Главной крупнее.
   зачем (координатор 28.10, слово владельца): «сцены сейчас тусклые и неправильно нарисованы — полное перекрашивание; для тёмных тем другие
   цвета и оттенки, чтобы было красивое сочетание: тема синяя, а сцена другого цвета по теории цвета»; «палитру применить на всех экранах со
   сценой — Главная, Пик, уроки, другие разделы»; «иконки на сцене Главной должны быть большими и объёмными, а не маленькими в уголке».
   Что здесь: scenePal(id, ap) — одна чистая функция палитры сцены (вход — токены темы уровня «Максимум», выход — верх/низ/два света и
   подпись схемы) — её же переносить в home_scene_tokens.ts после одобрения. «Сейчас» — дословные формулы приложения (homeSceneThemeTokens,
   dialogsSceneColors, seasonThemedArt). Цвета тем и движок сцены — те же, что в peak-scene-v2. prefers-reduced-motion — CSS гасит движение. */
(() => {
const { phone, block, col } = K;
const THEMES = window.__THEMES || {};
const THEME_IDS = Object.keys(THEMES);
let THEME_ID = 'marine';
let AP = 'dark';
let MODE = 'new';
let TH = 'marine';
const LOG = '[SP]';
const R = window.SpireTowerRender;
/* коды значков — из эталона; добавлены те, что есть в том же шрифте приложения (Ionicons glyphmap) */
const CODE = Object.assign({ heart: 'f36a', 'heart-outline': 'f377', 'arrow-up': 'f145', people: 'f49f', 'trending-up': 'f5fb', 'lock-closed': 'f3c7', 'cafe-outline': 'f1ca', 'school-outline': 'f55d', flame: 'f313',
  'flame-outline': 'f314', flash: 'f316', 'notifications-outline': 'f47f', diamond: 'f2a1', 'chatbubbles-outline': 'f218', 'chatbubble-ellipses-outline': 'f213', 'cloud-offline-outline': 'f25b',
  home: 'f382', 'home-outline': 'f383', book: 'f1a5', 'book-outline': 'f1a6', star: 'f595', sparkles: 'f58c', 'checkmark-circle': 'f21e', add: 'f103', 'albums-outline': 'f110', 'copy-outline': 'f290',
  'chevron-forward': 'f23b', 'chevron-down': 'f232', 'chevron-back': 'f229', checkmark: 'f21d', play: 'f4c6', 'play-circle-outline': 'f4ce', 'people-outline': 'f4a3', 'settings-outline': 'f56c', trophy: 'f601', 'volume-high': 'f613' }, window.__ICODE || {});
const io = (n, st = '') => { const c = CODE[n]; if (!c) throw new Error(`${LOG} нет значка ${n}`); return `<i class="io" aria-hidden="true"${st ? ` style="${st}"` : ''}>&#x${c};</i>`; };
const ci = (r, s, cls = '') => `<img${cls ? ` class="${cls}"` : ''} src="${K.coin(r)}" alt="" style="width:${s}px;height:${s}px;border-radius:50%;display:block;flex:none">`;
const ART = (name) => `assets/v2art/${AP === 'light' ? 'light' : 'dark'}/${name}.webp`;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const once = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); node.addEventListener('animationend', () => node.classList.remove(cls), { once: true }); };
const fmtR = (x, d = 2) => x.toFixed(d).replace('.', ',');

/* ═════ цвета: sRGB ↔ OKLCH (Björn Ottosson) — те же функции, что в эталоне и в home_scene_tokens.ts ═════ */
const norm = (h) => ((h % 360) + 360) % 360;
const hx = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const ha = (h) => { const s = String(h).replace('#', ''); return s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1; };
const mixc = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const clamp255 = (v) => Math.max(0, Math.min(255, v));
const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(clamp255(v))).join(',')},${a})`;
const hex = (c) => `#${c.map((v) => Math.round(clamp255(v)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const lumc = (c) => { const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratioc = (a, b) => { const x = lumc(a); const y = lumc(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const whiteOn = (c) => 1.05 / (lumc(c) + 0.05);
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
const okLin = (L, C, H) => {
  const a = C * Math.cos(H * Math.PI / 180); const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
};
/* как fromOklch эталона — обрезка каналов (нужна для «сейчас», чтобы цифры совпали с приложением) */
const fromOklch = (L, C, H) => okLin(L, C, H).map((v) => clamp255(toSrgb(Math.max(0, Math.min(1, v)))));
/* как oklchToHex приложения (season_art.ts): вне gamut — уменьшаем насыщенность при тех же оттенке и светлоте, а не режем каналы */
const inGamut = (c) => c.every((v) => v >= -0.0005 && v <= 1.0005);
const okRgb = (L, C, H) => { let c = C; let lin = okLin(L, c, H); for (let i = 0; i < 60 && !inGamut(lin); i += 1) { c = Math.max(0, c - 0.004); lin = okLin(L, c, H); } return lin.map((v) => clamp255(toSrgb(Math.max(0, Math.min(1, v))))); };

/* ═════ «СЕЙЧАС»: формулы приложения дословно ═════ */
/* Главная / Пик / Наборы — homeSceneThemeTokens (эталон sceneTok): тёмное — 30 % градиента акцента над фоном; светлое — OKLCH L .47→.28 от оттенка акцента; «Сумерки» — числа эталона */
const sceneTok = (id, ap) => {
  const t = THEMES[id][ap]; const g = t.accentGradient || [t.accent, t.accent];
  const pr = PREMIUM_BY_ID[id];
  if (pr) { // premiumSceneTop: верх темнеет на 4 % к чёрному, пока белый < 5; низ — sceneBottom; свет — edge 25
    let top = hx(pr.sceneTop); for (let i = 0; i < 40 && whiteOn(top) < 5; i += 1) top = mixc([0, 0, 0], top, 0.04);
    const bot = hx(pr.sceneBottom);
    return { t, top, bot, glow: `${pr.edge}25`, glowC: hx(pr.edge), glowA: 0x25 / 255, scrim: false, seam: ratioc(bot, hx(t.opaqueCard)) };
  }
  if (ap === 'dark') {
    const top = mixc(hx(g[0]), hx(t.bgTop), 0.3); const bot = mixc(hx(g[g.length - 1]), hx(t.bg), 0.3);
    const gl = (t.bgGlow && t.bgGlow[0]) || t.accentGlow;
    return { t, top, bot, glow: rgba(hx(gl), ha(gl)), glowC: hx(gl), glowA: ha(gl), scrim: false, seam: ratioc(bot, hx(t.opaqueCard)) };
  }
  if (id === 'ink') {
    const top = fromOklch(0.47, 0.14, 282); const bot = fromOklch(0.28, 0.10, 276);
    return { t, top, bot, glow: 'oklch(.66 .13 300 / .9)', glowC: fromOklch(0.66, 0.13, 300), glowA: 0.9, scrim: true, seam: ratioc(bot, hx('#FCFCFF')) };
  }
  const [, C, H] = oklchOf(hx(t.accent));
  const top = fromOklch(0.47, Math.min(C, 0.16), H); const bot = fromOklch(0.28, Math.min(C, 0.11), (H + 354) % 360);
  return { t, top, bot, glow: rgba(fromOklch(0.66, Math.min(C, 0.14), (H + 18) % 360), 0.9), glowC: fromOklch(0.66, Math.min(C, 0.14), (H + 18) % 360), glowA: 0.9, scrim: true, seam: ratioc(bot, hx(t.opaqueCard)) };
};
const nowHomeBg = (k) => `radial-gradient(70% 50% at 18% 0%, ${k.glow}, transparent 70%), linear-gradient(165deg, ${rgba(k.top)} 0%, ${rgba(k.bot)} 100%)`;
/* Диалоги — dialogsSceneColors: тёмное — bgTop/bg + 30 % градиента акцента, света bgGlow[0]/[1]; светлое — bgTop → bg, затемнение низа тоном bgBottom 62 %, свет bgGlow[2] снизу */
const nowDialogs = (id, ap) => {
  const t = THEMES[id][ap]; const g = t.accentGradient || [t.accent, t.accent]; const dark = ap === 'dark';
  const top = dark ? mixc(hx(g[0]), hx(t.bgTop), 0.3) : hx(t.bgTop); const bot = dark ? mixc(hx(g[g.length - 1]), hx(t.bg), 0.3) : hx(t.bg);
  const gl = (i) => { const c = t.bgGlow && t.bgGlow[i]; return c ? rgba(hx(c), ha(c)) : 'transparent'; };
  const scrim = dark ? '' : `linear-gradient(to bottom, transparent 45%, ${rgba(hx(t.bgBottom), 0.62)} 100%), `;
  const bottomGlow = dark ? '' : `radial-gradient(60% 40% at 50% 100%, ${gl(2)}, transparent 70%), `;
  return { top, bot, bg: `${scrim}${bottomGlow}radial-gradient(70% 50% at 82% 0%, ${gl(0)}, transparent 70%), radial-gradient(60% 50% at 10% 0%, ${gl(1)}, transparent 70%), linear-gradient(170deg, ${rgba(top)} 0%, ${rgba(bot)} 100%)` };
};
/* обложка Сезона — seasonThemedArt(hexHue(accent), глава 2, эпизод 0, тема, false, hexChroma(accent)): оттенок темы, насыщенность — доля от эталонной (.11 тёмное / .15 светлое, не ниже .2) */
const nowSeason = (id, ap) => {
  const t = THEMES[id][ap]; const [, C, H] = oklchOf(hx(t.accent)); const light = ap === 'light';
  const tint = Math.min(1, Math.max(0.2, C / (light ? 0.15 : 0.11)));
  const darker = 0.01; const chromaMul = 0.88; // глава 2: CHAPTER_CHROMA_MUL[1] · шаг эпизода 0
  const glow = light ? okRgb(0.70, 0.13 * tint, H) : okRgb(0.56, 0.12 * tint, H);
  const from = light ? okRgb(0.53 - darker, 0.15 * chromaMul * tint, H) : okRgb(0.40 - darker, 0.11 * chromaMul * tint, H);
  const to = light ? okRgb(0.33 - darker, 0.13 * chromaMul * tint, H) : okRgb(0.20 - darker / 2, 0.07 * chromaMul * tint, H);
  return { top: from, bot: to, bg: `linear-gradient(to bottom, transparent 55%, rgba(0,0,0,.34) 100%), radial-gradient(120% 90% at 88% 0%, ${rgba(glow)} 0%, transparent 58%), linear-gradient(160deg, ${rgba(from)} 0%, ${rgba(to)} 100%)` };
};

/* ═════ «НОВЫЙ»: четыре стратегии цвета сцены — владелец переключает сам (владелец 28.10: «цвета не те»; координатор: А/Б/В/Г) ═════
   Все — от оттенка акцента темы H и его насыщенности C (OKLCH):
   А «тон темы, ярче и глубже» — сцена того же оттенка, насыщеннее (C × 1,6, не ниже .07 и не выше .17), верх L .50, низ L .30, свет — светлый тон темы;
   Б «аналоговая» — сцена соседнего оттенка (+32°), свет — другой сосед (−24°);
   В «акцент-свет» — основа в тоне темы, спокойнее (L .46, C × 1,2 ≤ .13), контрастный только свет — комплемент (H + 180°);
   Г «два света по сплиту» — основа в тоне темы (L .48), два света разных оттенков по сплит-комплементу (H + 150° сверху слева, H + 210° снизу справа);
   серый акцент (C < .05, «Затмение») в Г получает тёплый и холодный свет (40° / 215°). Стражи одни: белый ≥ 4,6 на верхе, шов с карточкой ≥ 1,34 в тёмном. */
/* премиум-темы (координатор 28.10: отдельным коротким разделом, по одному кадру Главной; движение их шейдеров не показываем):
   спецификация — constants/premiumThemeVisualSpecs.ts дословно, токены — как premiumThemeTokenOverrides, имена — theme_display_names */
const PREMIUM = [
  { id: 'grad_full_olive', name: 'Керамика', dark: ['#10170d', '#424c28', '#333d20', '#586035'], light: ['#e6ead5', '#f5f5de', '#e7edc9', '#c9d3a5'], accent: '#dbe591', ink: '#34410d', edge: '#bac573', sceneTop: '#778624', sceneBottom: '#151e10' },
  { id: 'grad_full_ref_signal_lime', name: 'Обсидиан', dark: ['#040709', '#1c2613', '#0d120c', '#212c15'], light: ['#f9ffed', '#fdfff9', '#f8ffe9', '#f4ffde'], accent: '#c2ff46', ink: '#445919', edge: '#c2ff46', sceneTop: '#101406', sceneBottom: '#020406' },
  { id: 'grad_full_ref_storm_violet', name: 'Аметист', dark: ['#040709', '#1e1929', '#0e0c15', '#241e2f'], light: ['#fbf5ff', '#fefcff', '#faf3ff', '#f8ecff'], accent: '#d697ff', ink: '#4b3559', edge: '#d697ff', sceneTop: '#110c14', sceneBottom: '#020406' },
  { id: 'grad_full_titanium', name: 'Титан', dark: ['#121416', '#3c4248', '#292f34', '#4b5055'], light: ['#e0e3e5', '#f6f7f8', '#dce1e4', '#bfc7ce'], accent: '#ff8c80', ink: '#a92d26', edge: '#c9d1d8', sceneTop: '#34383d', sceneBottom: '#0a0c0f' },
  { id: 'grad_full_horizon', name: 'Атмосфера', dark: ['#091723', '#2b4659', '#203344', '#395b6c'], light: ['#dde8ef', '#f2f8ff', '#d8e7f2', '#b4cbd8'], accent: '#ffd09a', ink: '#805022', edge: '#8dafc4', sceneTop: '#12385a', sceneBottom: '#060e1a' },
  { id: 'grad_full_ref_gravity_blue', name: 'Сингулярность', dark: ['#040709', '#142229', '#0a1015', '#19282f'], light: ['#f3fcff', '#fbfeff', '#f0fbff', '#e9f9ff'], accent: '#86dfff', ink: '#2f4e59', edge: '#86dfff', sceneTop: '#0b1214', sceneBottom: '#020406' },
];
const PREMIUM_BY_ID = Object.fromEntries(PREMIUM.map((p) => [p.id, p]));
const premiumTokens = (p, ap) => {
  const dark = ap === 'dark'; const [bg, from, to] = dark ? p.dark : p.light; const accent = dark ? p.accent : p.ink; const cta = hex(mixc([255, 255, 255], hx(p.accent), 0.82));
  return { bg, bgTop: bg, bgBottom: bg, opaqueCard: to, opaqueControl: from, text: dark ? '#fff9f6' : '#181a20', secondary: dark ? '#dacfd0' : '#55505b', accent, accentText: accent, cta, ctaInk: p.ink, accentGradient: [accent, accent], accentGlow: `${p.edge}8C`, bgGlow: [`${p.edge}40`], isLight: !dark };
};
PREMIUM.forEach((p) => { THEMES[p.id] = { name: p.name, premium: true, dark: premiumTokens(p, 'dark'), light: premiumTokens(p, 'light') }; });
const STRATS = { A: 'А · тон темы, ярче и глубже', B: 'Б · аналоговая, соседние оттенки', C: 'В · акцент-свет', D: 'Г · тон темы, два света по сплиту' };
let STRAT = 'A';
let ALL = false; // ?all=1 — показать и нарисованные разделы (сетка, герои, премиум); по умолчанию только реальные кадры (владелец 28.10)
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const scenePal = (id, ap, strat = STRAT) => {
  const STRAT = strat; // зачем: раздел реальных кадров показывает четыре стратегии рядом — палитра по явной стратегии, не по переключателю
  const t = THEMES[id][ap]; const [, C, H] = oklchOf(hx(t.accent)); const dark = ap === 'dark'; const neutral = C < 0.05;
  let S = H; let Lh = H; let Lh2 = norm(H + 18); let Ct; let Cb; let a1 = 0.85; let a2 = 0.55; let Lt = 0.50; let why = '';
  if (STRAT === 'A') { Ct = clampN(C * 1.6, 0.07, 0.17); Cb = Ct * 0.7; why = 'тот же оттенок, насыщеннее и глубже; свет — светлый тон темы'; }
  else if (STRAT === 'B') { const warm = H >= 40 && H <= 120; const d = warm ? -1 : 1; // жёлто-тёплые темы (Дюна, Саванна, Шампань) уходят к оранжевому, не к оливковому
    S = norm(H + 32 * d); Ct = neutral ? 0.09 : 0.15; Cb = neutral ? 0.07 : 0.11; Lh = norm(H - 24 * d); Lh2 = norm(H + 60 * d); why = `сцена — соседний оттенок (${d > 0 ? '+' : '−'}32°), свет — другой сосед (${d > 0 ? '−' : '+'}24°)`; }
  else if (STRAT === 'C') { Ct = clampN(C * 1.2, 0.06, 0.13); Cb = 0.09; Lh = norm(H + 180); Lh2 = norm(H + 180); a1 = 0.75; a2 = 0.35; Lt = 0.46; why = 'основа в тоне темы, спокойнее; контрастный только свет — комплемент'; }
  else { Ct = clampN(C * 1.4, 0.07, 0.15); Cb = Ct * 0.7; Lh = neutral ? 40 : norm(H + 150); Lh2 = neutral ? 215 : norm(H + 210); a1 = 0.8; a2 = 0.6; Lt = 0.48; why = neutral ? 'серый акцент: основа графит, тёплый и холодный свет' : 'основа в тоне темы; два света по сплит-комплементу — глубина без смены цвета'; }
  if (!dark) Lt += 0.02;
  let top = okRgb(Lt, Ct, S);
  for (let L = Lt; whiteOn(top) < 4.6 && L > 0.2; L -= 0.01) top = okRgb(L, Ct, S);
  const Lb = dark ? 0.30 : 0.28; let bot = okRgb(Lb, Cb, norm(S - 8)); const card = hx(t.opaqueCard);
  if (dark) for (let L = Lb; ratioc(bot, card) < 1.34 && L < 0.5; L += 0.01) bot = okRgb(L, Cb, norm(S - 8));
  const lightC = okRgb(0.80, STRAT === 'A' ? Math.max(0.06, Ct * 0.9) : 0.15, Lh); const light2C = okRgb(0.62, STRAT === 'A' ? Math.max(0.06, Ct * 0.9) : 0.14, Lh2);
  const light = rgba(lightC, a1); const light2 = rgba(light2C, a2);
  const bg = `radial-gradient(70% 50% at 18% 0%, ${light}, transparent 70%), radial-gradient(80% 42% at 86% 102%, ${light2}, transparent 70%), linear-gradient(165deg, ${hex(top)} 0%, ${hex(bot)} 100%)`;
  return { id, ap, kind: STRAT, why, a1, a2, H: Math.round(H), S: Math.round(S), Lh: Math.round(Lh), Lh2: Math.round(Lh2), top, bot, lightC, light2C, light, light2, bg, lightSoft: rgba(lightC, 0.42), whiteTop: whiteOn(top), whiteBot: whiteOn(bot), seam: ratioc(bot, card) };
};
const schemeLine = (p) => `${STRATS[p.kind]} · тема ${p.H}° → сцена ${p.S}°, свет ${p.Lh}°${p.kind === 'D' ? ' и ' + p.Lh2 + '°' : ''}`;

/* ═════ токены телефона: переменные темы (как tokCss эталона) + «сейчас» сцены + «новый» слой ═════ */
const uiCss = (id, ap) => {
  const k = sceneTok(id, ap); const t = k.t; const p = scenePal(id, ap);
  return [`--bg:linear-gradient(180deg,${t.bgTop} 0%,${t.bg} 55%,${t.bgBottom} 100%)`, `--top:${t.bgTop}`, `--bot:${t.bgBottom}`, `--tx:${t.text}`, `--sec:${t.secondary}`,
    `--card:${t.opaqueCard}`, `--ctl:${t.opaqueControl}`, `--acc:${t.accentText}`, `--solid:${t.cta}`, `--on-solid:${t.ctaInk}`, `--sb:${t.text}`,
    `--st-top:${rgba(k.top)}`, `--st-bot:${rgba(k.bot)}`, `--st-glow:${k.glow}`, `--st-eve-top:${rgba(k.top)}`, `--st-eve-bot:${rgba(k.bot)}`,
    `--sp-new:${p.bg}`, `--sp-light:${p.light}`, `--sp-light-soft:${p.lightSoft}`, `--sp-tile:radial-gradient(90% 70% at 100% 0%, ${rgba(p.lightC, 0.9)}, transparent 70%), linear-gradient(165deg, ${hex(p.top)}, ${hex(p.bot)})`].join(';');
};
const T = (h, extra = '') => h.replace('class="ph"', `class="ph th-${TH}${extra ? ' ' + extra : ''}"`);
/* в отличие от tok эталона — hs-tok ставится всегда (и «Сумеркам» в светлом): значения те же, а слой «новый» нужен каждому телефону */
const modeCls = () => (MODE === 'now' ? 'sp-now' : MODE === 'draw' ? 'sp-new sp-drawn' : 'sp-new');
/* real — ключ экрана для реального кадра Сверки (assets/real/scene_{ключ}_{тема}_{оформление}.png): есть файл — он и есть «сейчас».
   Список имеющихся кадров — window.__REAL (сборщик пишет его из папки assets/real при пересборке), чтобы страница не запрашивала несуществующие файлы */
const REAL = window.__REAL || {}; // опись реальных кадров (scene-frames.cjs → сборщик): файл → { screen, theme, ap, ok, sceneH, hero, status, tab }
const REAL_HAS = (name) => Object.prototype.hasOwnProperty.call(REAL, name) && REAL[name].ok !== false;
/* область сцены на реальном кадре (доля высоты) и дыра маски вокруг героя — чтобы перекраска не тонировала картинку героя
   (владелец 28.10: «сейчас» — реальный кадр, новая палитра — перекраска сцены НА кадре). Пик — башня целиком, герой не вырезается */
const REAL_RECT = { home: { h: 46.4, hole: 'radial-gradient(circle at 78% 20%, transparent 11%, #000 15%)' }, season: { h: 46.4, hole: 'radial-gradient(circle at 78% 20%, transparent 11%, #000 15%)' }, dialogs: { h: 46.4, hole: 'radial-gradient(circle at 78% 20%, transparent 11%, #000 15%)' }, peak: { h: 81, hole: 'none' } };
const realImg = (real, id, ap) => {
  if (!real || !REAL_HAS(`scene_${real}_${id}_${ap}.png`)) return '';
  const r = REAL_RECT[real] || REAL_RECT.home; const p = scenePal(id, ap);
  return `<img class="sp-real" src="assets/real/scene_${real}_${id}_${ap}.png" alt="" onload="var l=this.closest('.col');l=l&&l.querySelector('.lbl');if(l)l.dataset.real='1'"><div class="sp-real-tint" style="height:${r.h}%;background:${p.bg};-webkit-mask:${r.hole};mask:${r.hole}"></div>`;
};
const shell = (id, ap, body, fixed, cls, time = '18:10', real = '') => T(phone(body, { time, inStyle: 'padding:0', fixed }), 'onart')
  .replace(/class="ph th-(ink|marine)([^"]*)"/, (m, th, rest) => `class="ph th-${th}${rest} hs-tok${ap === 'dark' ? ' dk' : ' lt'} ${cls} ${modeCls()}" data-ph="${cls}" style="${uiCss(id, ap)}"`)
  .replace('<div class="hi"></div></div>', `<div class="hi"></div>${realImg(real, id, ap)}</div>`);
/* текущая тема телефона — для слоя Б внутри сцены (строители сцен не получают id/ap) */
let CUR = { id: 'marine', ap: 'dark' };
const cur = (id, ap) => { CUR = { id, ap }; };
/* вариант Б: солнце/луна в оттенке света темы за дальними холмами, даль — верх сцены с дымкой света, близь — темнее низа, туман у горизонта */
const drawLayer = (p) => {
  // три слоя глубины в оттенке самой сцены (смесь с оттенком света давала грязь): дальние горы сквозь дымку, холмы, ближний склон под текстом
  const S = p.S; const farFar = rgba(okRgb(0.44, 0.10, norm(S - 2)), 0.72); const far = hex(okRgb(0.36, 0.11, norm(S - 8))); const near = hex(okRgb(0.26, 0.10, norm(S - 18)));
  const sunC = okRgb(0.86, 0.12, p.Lh); const fogC = okRgb(0.80, 0.09, p.Lh);
  return `<div class="sp-draw"><i class="sun" style="background:radial-gradient(circle, ${rgba(sunC, 0.95)} 0%, ${rgba(sunC, 0.5)} 24%, ${rgba(sunC, 0)} 66%)"></i><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 56 C 14 50 28 50 42 54 S 70 60 84 54 S 94 50 100 52 L100 100 L0 100 Z" fill="${farFar}"/><path d="M0 64 C 12 59 24 58 36 62 S 60 68 72 62 S 90 58 100 61 L100 100 L0 100 Z" fill="${far}"/><path d="M0 74 C 14 70 26 70 40 75 S 66 80 80 74 S 92 70 100 73 L100 100 L0 100 Z" fill="${near}"/></svg><i class="fog" style="background:linear-gradient(to bottom, ${rgba(fogC, 0)} 0%, ${rgba(fogC, 0.34)} 50%, ${rgba(fogC, 0)} 100%)"></i></div>`;
};

/* ═════ общие детали экранов (разметка эталонов home-scene-states / peak-scene-v2 / community-scene-v3; таббар — значками) ═════ */
const TABS = ['home-outline', 'book-outline', 'play-circle-outline', 'people-outline', 'settings-outline'];
const TAB_ON = ['home', 'book', 'play-circle-outline', 'people', 'settings-outline'];
const tabbar = (k) => `<div class="qfade"></div><div class="tbar"><div class="cap" style="left:calc(9px + ${k} * (100% - 18px) / 5)"></div>${TABS.map((i, j) => `<div class="ti${j === k ? ' on' : ''}">${io(j === k ? TAB_ON[j] : i)}<span></span></div>`).join('')}</div>`;
const avatar = (s = 34) => `<span class="pav" style="background:none;padding:0"><span class="gap" style="padding:0;background:none">${K.coinImg(5, s + 9)}</span></span>`;
const HOME = { streak: '5 дней', coins: '2 340', en: '4' };
const stats = (s) => `<span class="hm-pill two glass t">${io('flame')}<span class="vv"><b>${s.streak}</b><small>Серия</small></span></span><span class="hm-pill glass t"><img src="${K.coin(5)}" alt="">${s.coins}<i class="dv"></i><span style="display:inline-flex;align-items:center;gap:3px">${io('flash')}${s.en}</span></span>`;
const head = () => `<div class="hm-top">${stats(HOME)}<span class="hm-sp"></span><span class="qround hm-bell glass t">${io('notifications-outline')}<i class="dot"></i></span>${avatar()}</div>`;
const row = ([ic, t, sub, n, done]) => `<div class="hm-row${done ? ' done' : ''} t"><span class="ck${done ? ' on' : ''}">${io('checkmark')}</span><span class="ic">${io(ic)}</span><div class="tx"><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div><span class="n">${n}</span></div>`;
const layer = () => `<div class="sp-layer"></div>${drawLayer(scenePal(CUR.id, CUR.ap))}`;
const glow = (right, top, size) => `<div class="a-glow" style="right:${right}px;top:${top}px;width:${size}px;height:${size}px"></div>`;
const art = (name) => `<img class="sp-art" src="${ART(name)}" alt="">`;
const body = (kick, title, prog, cta, chips = '') => `<div class="a-kick">${kick}</div><div class="a-title${title.length > 18 ? ' long' : ''}">${title}</div>${prog}<div class="a-cta"><div class="qbtn white t${cta[2] || ''}">${io('play')}${cta[0]}</div></div>${chips ? `<div style="margin-top:12px"><div class="hm-chips">${chips}</div></div>` : ''}`;
const bar = (pct, text) => `<div class="a-prog"><span class="bar"><i style="width:${pct}%"></i></span>${text}</div>`;
const chip = (ic, t) => `<span class="qchip glass t">${io(ic)}${t}</span>`;

/* ── 1 · Главная (эталон home-scene-states A, герой «Продолжить»): шапка стеклом, герой справа 160, текст у низа, панель «Сегодня» ── */
const homeStage = (hero) => `<div class="a-stage">${layer()}${glow(4, 86, 180)}${hero}<div class="a-scrim"></div><div class="a-top">${head()}</div><div class="a-body">${body('Урок 1 · Эпизод 12', 'Комплименты вслух', bar(30, 'задание 6 из 20'), ['Продолжить'], chip('albums-outline', 'Слова') + chip('book-outline', 'Теория'))}</div></div>`;
const homeAfter = () => `<div class="a-panel"><div class="hm-h">Сегодня<span>1 из 3</span></div>${[['book-outline', 'Пройти урок', '', '1/1', 1], ['chatbubbles-outline', 'Потренировать диалог', '', '0/1'], ['copy-outline', 'Повторить карточки', 'Не менее 10 слов', '6/10']].map(row).join('')}</div>`
  + `<div class="a-tiles">${[['lessons', 'Уроки'], ['dialogs', 'Диалоги'], ['cards', 'Карточки']].map(([a, t]) => `<div class="a-tile t"><img class="hm-art" src="${ART(a)}" alt="">${t}</div>`).join('')}</div>`
  + `<div class="a-pod t"><img class="hm-art art" src="${ART('phrase_of_day')}" alt=""><div class="tx"><div class="k">Фраза дня</div><div class="p">We are together.</div></div>${io('chevron-forward', 'font-size:18px;color:var(--sec)')}</div><div style="height:140px"></div>`;
const homePhone = (id, ap, hero = art('home_scene_continue'), layout = '') => (cur(id, ap), shell(id, ap, `<div class="sp-home${layout ? ' ' + layout : ''}">${homeStage(hero)}${homeAfter()}</div>`, tabbar(0), 'sp-home', '18:10', 'home'));

/* ── 2 · Пик (эталон peak-scene-v2, V2 утверждён 22.10): башня — герой сцены, пьедестал 2-1-3, своё место, «Играть» закреплена ── */
const LEAD = [{ name: 'Аня', coins: 612, rank: 12 }, { name: 'Марк', coins: 538, rank: 9 }, { name: 'Тимур', coins: 470, rank: 11 }];
const RIVALS = { 1: [9, 11, 4, 5], 2: [7, 9, 3, 6], 3: [9, 6, 4, 2], 4: [8, 11, 5], 5: [6, 9, 4], 6: [6], 7: [11] };
const fmt = (n) => n.toLocaleString('ru-RU');
const tower = (top, height) => `<div class="pk2-tw" style="top:${top}px;height:${height}px">${R ? R.windowHtml({ coin: K.coin, tier: 0, myFloor: 4, selected: 4, theme: 'dark', width: 240, height, myRank: 5, rivals: RIVALS, scene: { plate: 'transparent', plateShadow: 'none' }, scrollTop: 99999 }) : ''}</div>`;
const blk = (x, y, w, h, inner, cls = '', b = 0) => `<div class="pk2-blk${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;--b:${b}ms">${inner}</div>`;
const coinAt = (r, x, y, s, b) => `<div class="pk2-coin" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;--b:${b}ms">${ci(r, s)}</div>`;
const face = (place, m) => `<span class="pl">${place}</span><span class="nm">${m.name}</span><span class="cn">${fmt(m.coins)}${ci(0, 12)}</span>`;
const pedestal = () => blk(22, 580, 124, 100, `<span style="height:12px"></span>${face(2, LEAD[1])}`, '', 240) + blk(153, 556, 124, 124, `<span style="height:22px"></span>${face(1, LEAD[0])}`, ' first', 320)
  + blk(284, 600, 124, 80, `<span style="height:12px"></span>${face(3, LEAD[2])}`, '', 400) + coinAt(LEAD[1].rank, 65, 560, 38, 240) + coinAt(LEAD[0].rank, 191, 530, 48, 320) + coinAt(LEAD[2].rank, 327, 580, 38, 400);
const peakStage = () => `<div class="a-stage">${layer()}${glow(12, 150, 260)}${tower(150, 450)}<div class="pk2-copy"><div class="a-kick">Гранит<br>до конца недели 2 д 14 ч</div><div class="a-title">Этаж 4</div>${bar(88, 'ступень 7 из 8')}<div class="pk-rew"><span>${ci(0, 20)}+10 за ступень</span><span>${ci(0, 20)}+40 за этаж</span></div></div>${pedestal()}`
  + `<div class="pk2-me" style="left:20px;top:448px"><div class="k">Комната недели · Гранит</div><div class="v">${ci(5, 30)}7 место</div><div class="s">${io('arrow-up')}2 места до повышения</div></div><div class="pk2-link t" style="top:700px">Все участники <small>30</small>${io('chevron-forward')}</div><div class="a-scrim"></div>`
  + `<div class="a-top"><div class="pk-top"><div class="pk-seg"><span class="on t">Пик</span><span class="t">Друзья</span><span class="t">Наборы</span></div><span class="pk-en">${io('flash')}3</span></div></div></div>`;
const peakAfter = () => `<div class="pk-h2">Друзья на этой неделе</div><div class="pk-fr">${[['Аня', 12, 'Агат'], ['Kirill', 10, 'Гранит'], ['Лидия', 1, 'Базальт']].map(([n, r, st]) => `<span class="c t">${ci(r, 32)}${n}<small>${st}</small></span>`).join('')}</div><div class="pk2-after"></div>`;
const peakPhone = (id, ap) => (cur(id, ap), shell(id, ap, `<div class="pk2 sp-pk">${peakStage()}</div>${peakAfter()}`, `<div class="pk2-dock"><div class="qbtn solid t">${io('play')}Играть</div></div>${tabbar(3)}`, 'sp-pk', '18:10', 'peak'));

/* ── 3 · Уроки · обложка Сезона (scenes-compact «Обучение · Сезон», вариант 2 владельца 22.10) ── */
const seasonStage = (id, ap) => { const n = nowSeason(id, ap); return `<div class="a-stage sp-season-now" style="--sp-season-now:${n.bg}">${layer()}${glow(4, 86, 180)}${art('lessons')}<div class="a-scrim"></div><div class="a-top">${head()}</div><div class="a-body">${body('Сезон 1 · Глава 2 из 7', 'Кофе с коллегой', bar(38, '3 из 8 эпизодов'), ['Продолжить'], chip('albums-outline', 'Слова') + chip('book-outline', 'Теория'))}</div></div>`; };
const seasonAfter = () => `<div class="a-panel"><div class="hm-h">Главы сезона<span>7</span></div><div class="sp-cards"><div class="sp-card"><small>Глава 1 · I am (+ not)</small>Первый рабочий день<div class="st">${io('checkmark', 'color:var(--good)')}пройдена</div></div><div class="sp-card cur"><small>Глава 2 · You are (+ not)</small>Кофе с коллегой<div class="st">3 из 8</div></div><div class="sp-card"><small>Глава 3 · He / she is</small>Знакомство с командой<div class="st">${io('lock-closed')}после главы 2</div></div></div></div>`
  + `<div class="a-panel" style="margin-top:12px"><div class="hm-h">Эпизоды главы 2<span>3 из 8</span></div>${[['cafe-outline', 'Эпизод 4 · Заказ на двоих', '', '0/21'], ['cafe-outline', 'Эпизод 5 · Ты сегодня рано', '', '0/20']].map(row).join('')}</div><div style="height:140px"></div>`;
const seasonPhone = (id, ap) => (cur(id, ap), shell(id, ap, `<div class="sp-season">${seasonStage(id, ap)}${seasonAfter()}</div>`, tabbar(1), 'sp-season', '9:41', 'season'));

/* ── 4 · Диалоги (эталон dialogs-scene-states, герой «следующий диалог») ── */
const dlgStage = (id, ap) => { const n = nowDialogs(id, ap); return `<div class="a-stage sp-dlg-now" style="--sp-dlg-now:${n.bg}">${layer()}${glow(4, 86, 180)}${art('dialogs_scene_next')}<div class="a-scrim"></div><div class="a-top sp-dlg-ink"><div class="pk-top"><span class="hm-pill glass t">${io('chatbubbles-outline')}18 из 30</span><span style="flex:1"></span>${avatar()}</div></div><div class="a-body sp-dlg-ink">${body('Общение · с Милой', 'Поздороваться после знакомства', bar(33, '2 из 6 целей'), ['Продолжить', '', ' sp-dlg-cta'])}</div></div>`; };
const dlgAfter = () => `<div class="a-panel"><div class="hm-h">Диалоги<span>76</span></div><div class="sp-wchips"><span class="on">Все</span><span>Дела</span><span>Общение</span><span>Путешествия</span><span>Быт</span></div><div class="sp-cards"><div class="sp-card"><small>Дела · с Мариной</small>Представиться коллеге<div class="st">${io('chatbubbles-outline')}6 целей</div></div><div class="sp-card"><small>Быт</small>Спросить код от двери<div class="st">${io('chatbubbles-outline')}5 целей</div></div></div></div><div style="height:140px"></div>`;
const dlgPhone = (id, ap) => (cur(id, ap), shell(id, ap, `<div class="sp-dlg">${dlgStage(id, ap)}${dlgAfter()}</div>`, tabbar(1), 'sp-dlg', '18:10', 'dialogs'));

/* ── 5 · Наборы (community-scene-v3, утверждён 28.10): веер карточек — по оттенку сцены, «Набор месяца» на пьедестале, плитки ── */
const FANS = { coral: 'community_02_coral_sunset_fan', violet: 'community_03_violet_nebula_fan', glacier: 'community_07_glacier_blue_fan', obsidian: 'community_11_obsidian_star_fan',
  steel: 'community_16_steel_blueprint_fan', coffee: 'community_19_coffee_leather_fan', pearl: 'community_26_ocean_pearl_fan', cloud: 'community_28_cloud_silver_fan' };
const fanByHue = (H, C, dark) => { if (C < 0.03) return dark ? FANS.obsidian : FANS.cloud; if (H < 30 || H >= 330) return FANS.coral; if (H < 100) return FANS.coffee; if (H < 228) return FANS.pearl; if (H < 244) return FANS.glacier; if (H < 270) return FANS.steel; return FANS.violet; };
const fans = (id, ap, w, right, top) => { const t = THEMES[id][ap]; const [, C, H] = oklchOf(hx(t.accent)); const p = scenePal(id, ap); const st = `width:${w}px;right:${right}px;top:${top}px`;
  return `<img class="sp-fan now" src="assets/${fanByHue(H, C, ap === 'dark')}.webp" alt="" style="${st}"><img class="sp-fan new" src="assets/${fanByHue(p.S, 0.12, ap === 'dark')}.webp" alt="" style="${st}">`; };
const PACKS = [['Phrasal verbs', 'Ol Zar', 6, 214, 16], ['B2 глаголы', 'Ирина', 3, 167, 49], ['Forest berry', 'Лидия', 9, 121, 15]];
const pface = (place, p) => `<span class="pl">${place}</span><span class="nm cs-nm">${p[0]}</span><span class="cn">${io('heart')}${p[3]}</span>`;
const packsStage = (id, ap) => `<div class="a-stage">${layer()}${glow(10, 140, 260)}${fans(id, ap, 224, -18, 92)}<div class="a-scrim"></div><div class="a-top"><div class="pk-top"><div class="pk-seg"><span class="t">Пик</span><span class="t">Друзья</span><span class="on t">Наборы</span></div><span class="qchip glass t" style="margin-left:auto;padding:0 10px 0 12px">EN${io('chevron-down', 'font-size:13px;opacity:.85')}</span></div></div>`
  + `<div class="pk2-copy cs-copy"><div class="a-kick">Набор месяца</div><div class="a-title">Ещё 5 дней</div><div class="pk-rew"><span class="np t">Условия участия${io('chevron-forward')}</span></div></div><div class="pk2-me" style="left:20px;top:300px"><div class="k">Твой набор</div><div class="v">${ci(5, 30)}7 место</div><div class="s">${io('heart')}38</div></div>`
  + blk(22, 430, 124, 100, `<span style="height:12px"></span>${pface(2, PACKS[1])}`, '', 240) + blk(153, 406, 124, 124, `<span style="height:22px"></span>${pface(1, PACKS[0])}`, ' first', 320) + blk(284, 450, 124, 80, `<span style="height:12px"></span>${pface(3, PACKS[2])}`, '', 400)
  + coinAt(PACKS[1][2], 65, 410, 38, 240) + coinAt(PACKS[0][2], 191, 380, 48, 320) + coinAt(PACKS[2][2], 327, 430, 38, 400) + '</div>';
const packsAfter = () => `<div class="a-panel"><div class="hm-h">Наборы<span class="qchip" style="background:var(--solid);color:var(--on-solid);height:32px;padding:0 13px;font-size:14px">Топ</span></div><div class="sp-tiles">${PACKS.slice(0, 2).map((p, i) => `<div class="sp-tile t"><div class="tr"><span class="qchip glass">${io('copy-outline')}${p[4]}</span><span class="rk">${i + 1}</span></div><div class="tt">${p[0]}</div><div class="tb">${ci(p[2], 22)}<span>${p[1]}</span><b>${io('heart-outline')}${p[3]}</b></div></div>`).join('')}</div></div><div style="height:230px"></div>`;
const packsPhone = (id, ap) => (cur(id, ap), shell(id, ap, `<div class="sp-cs">${packsStage(id, ap)}${packsAfter()}</div>`, `<div class="pk2-dock"><div class="qbtn solid t">${io('add')}Создать набор</div></div>${tabbar(3)}`, 'sp-cs'));

/* ═════ раздел 1 · выбранная тема: подпись схемы для координатора + пять экранов ═════ */
const strip = (p) => {
  const sw = (c, k) => `<span class="sw" style="background:${c}" title="${k}"></span>`;
  const ok = (v, min) => `<span class="${v >= min ? 'ok' : 'bad'}">${fmtR(v)}</span>`;
  return `<div class="sp-strip" data-e style="--d:0ms">${sw(hex(p.top), 'верх')}${sw(hex(p.bot), 'низ')}${sw(hex(p.lightC), 'свет')}${sw(hex(p.light2C), 'второй свет')}<b>${schemeLine(p)}</b><span class="k">· ${p.why}</span><span class="k">· белый на верхе ${ok(p.whiteTop, 4.5)}, внизу ${ok(p.whiteBot, 4.5)} · шов с карточкой ${ok(p.seam, p.ap === 'dark' ? 1.34 : 1.12)}</span></div>`;
};
const SCREENS = [['Главная', homePhone], ['Пик', peakPhone], ['Уроки · Сезон', seasonPhone], ['Диалоги', dlgPhone], ['Наборы', packsPhone]];
const section1 = () => {
  const p = scenePal(THEME_ID, AP);
  return `<section class="block" id="sp-one"><h2>«${THEMES[THEME_ID].name}», ${AP === 'dark' ? 'тёмное' : 'светлое'} — одна палитра на всех экранах</h2>${strip(p)}<div class="phones">${SCREENS.map(([label, fn], i) => `<div class="col" style="--d:${i * 60}ms">${col(label, fn(THEME_ID, AP)).slice(17)}`).join('')}</div></section>`;
};

/* ═════ раздел 2 · сетка «тема × экран»: мини-сцены всех 23 тем — «сейчас» (Главная, Уроки) и «новый» (пять экранов) ═════ */
const MINI_ART = { home: 'home_scene_continue', peak: 'spire_tile', season: 'lessons', dlg: 'dialogs_scene_next', packs: null };
const mini = (bg, card, title, artName, cls = '', extra = '') => `<div class="sp-mini${cls ? ' ' + cls : ''}" style="--sp-mini:${bg};--sp-card:${card}"${extra}>${artName ? `<img src="${ART(artName)}" alt="">` : ''}<span class="t">${title}</span><span class="seam"></span></div>`;
const gridRow = (id, i) => {
  const t = THEMES[id][AP]; const p = scenePal(id, AP); const card = t.opaqueCard; const d = `data-th="${id}"`;
  const nowH = nowHomeBg(sceneTok(id, AP)); const nowS = nowSeason(id, AP).bg;
  return `<div class="sp-row" style="--d:${Math.min(i, 12) * 40}ms"><div class="sp-name${id === THEME_ID ? ' on' : ''}" ${d}><b>${t.name || THEMES[id].name}</b><small>${schemeLine(p)}</small></div>`
    + mini(nowH, card, 'Главная', MINI_ART.home, 'now', ` ${d}`) + mini(nowS, card, 'Уроки', MINI_ART.season, 'now', ` ${d}`)
    + mini(p.bg, card, 'Главная', MINI_ART.home, 'sep', ` ${d}`) + mini(p.bg, card, 'Пик', MINI_ART.peak, '', ` ${d}`) + mini(p.bg, card, 'Уроки', MINI_ART.season, '', ` ${d}`) + mini(p.bg, card, 'Диалоги', MINI_ART.dlg, '', ` ${d}`) + mini(p.bg, card, 'Наборы', null, '', ` ${d}`) + '</div>';
};
const section2 = () => `<section class="block" id="sp-grid"><h2>Все 23 темы × экран — ${AP === 'dark' ? 'тёмное' : 'светлое'}</h2><p class="sp-note">Слева — тема и схема; «сейчас» — как в приложении (Главная, Уроки), дальше — новая палитра на пяти экранах. Снизу каждой мини-сцены — карточка темы: виден шов. Тап по строке открывает тему выше.</p>`
  + `<div class="sp-grid"><div class="h"></div><div class="h now">Сейчас · Главная</div><div class="h now">Сейчас · Уроки</div><div class="h sep">Новый · Главная</div><div class="h">Пик</div><div class="h">Уроки</div><div class="h">Диалоги</div><div class="h">Наборы</div>${THEME_IDS.map(gridRow).join('')}</div></section>`;

/* ═════ раздел 3 · герои Главной крупнее и объёмнее (владелец: «большими и объёмными, а не маленькими в уголке») ═════ */
const HERO_VARS = [
  ['Сейчас · 160 в углу', null],
  ['Вариант 1 · Крупный 224', { size: 224, right: -22, top: 72, cls: 'a' }],
  ['Вариант 2 · Объёмный 256', { size: 256, right: -30, top: 56, cls: 'b' }],
  ['Вариант 3 · Постер 300', { size: 300, right: -66, top: 36, cls: 'c' }],
  ['Вариант 4 · По центру 240', { size: 240, center: true, top: 100, cls: 'd' }],
];
const heroBig = (v) => `<div class="sp-hero ${v.cls}" data-act="hero" style="width:${v.size}px;height:${v.size}px;${v.center ? `left:calc(50% - ${v.size / 2}px)` : `right:${v.right}px`};top:${v.top}px;--sp-hero-src:url(${ART('home_scene_continue')})"><div class="in"><i class="glow"></i><i class="floor"></i><img src="${ART('home_scene_continue')}" alt=""></div></div>`;
const section3 = () => `<section class="block" id="sp-hero"><h2>Герои на сцене Главной — крупнее и объёмнее</h2><p class="sp-note">Сейчас герой 160 в правом углу. Варианты: 224 с глубокой тенью; 256 с светом сверху, тенью на полу, лёгким наклоном и парением; 300 «постером» с глубиной и сиянием в цвете света темы; 240 по центру сцены над текстом (сцена выше 46 %). Тап по герою — отскок; «Повторить» — появление заново.</p><div class="phones">${HERO_VARS.map(([label, v], i) => `<div class="col" style="--d:${i * 60}ms">${col(label, homePhone(THEME_ID, AP, v ? heroBig(v) : art('home_scene_continue'), v && v.center ? 'center' : '')).slice(17)}`).join('')}</div></section>`;

/* ═════ раздел 4 · премиум-темы: по одному кадру Главной (видны в выборе тем с условием открытия) ═════ */
const section4 = () => `<section class="block" id="sp-premium"><h2>Премиум-темы — Главная, ${AP === 'dark' ? 'тёмное' : 'светлое'}</h2><p class="sp-note">Шесть тем с условием открытия (Plus, ранг, серия 365, Пик, 200 часов видео, курс). «Сейчас» — цвета их спецификации без движения шейдера; «Новый» — та же формула от их акцента, схема под телефоном.</p><div class="phones">${PREMIUM.map((p, i) => `<div class="col" style="--d:${i * 60}ms">${col(`${p.name}<br><span style="font-weight:500;color:#8E8E96">${schemeLine(scenePal(p.id, AP))}</span>`, homePhone(p.id, AP)).slice(17)}`).join('')}</div></section>`;

/* ═════ раздел 0 · Главная на РЕАЛЬНЫХ кадрах Сверки × четыре стратегии (координатор 28.10 вечер; владелец: «только настоящие экраны») ═════
   «Сейчас» — кадр без изменений (каркас real-frame.js); А/Б/В/Г — тот же кадр, у которого по пикселям перекрашен только фон сцены
   (scene-real.js → scene-recolor.js). Модель текущего фона — формула приложения: sceneTok (верх/низ), свет sceneLight 18 %/0 % rx 70 % ry 50 %,
   затемнение низа 300 dp до .40 в светлом; герой — по альфе его картинки hero512 на месте из описи scene-frames.json. Новая палитра — те же
   числа, что и в нарисованных разделах (scenePal), свет 1 там же, свет 2 — снизу справа, затемнение как у текущей сцены. */
const DPX = 2.625; // Pixel 8: 1080 px = 411,4 dp
let JOBS = {};
const HOME_FRAMES = () => Object.values(REAL).filter((m) => m && m.screen === 'home' && m.ok !== false && m.recolor !== false && THEMES[m.theme]).sort((a, b) => (a.theme + a.ap).localeCompare(b.theme + b.ap));
// кадры Главной, которые опись не пустила в перекраску (битые, вечернее состояние, незнакомая тема) — перечисляем с причиной, чтобы было видно, чего ждём
const SKIPPED_FRAMES = () => Object.values(REAL).filter((m) => m && m.screen === 'home' && (m.ok === false || m.recolor === false || !THEMES[m.theme])).map((m) => `${m.file} — ${m.why || (THEMES[m.theme] ? 'не годен' : 'тема не из списка 23')}`);
const oldSpecOf = (id, ap) => { const k = sceneTok(id, ap); return { top: k.top, bot: k.bot, lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: k.glowC, a: k.glowA, fade: 1 }], scrim: k.scrim ? { a: 0.40, h: 300 * DPX } : null }; };
const newSpecOf = (p, old) => ({ top: p.top, bot: p.bot, lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: p.lightC, a: p.a1, fade: 0.7 }, { cx: 0.86, cy: 1.02, rx: 0.8, ry: 0.42, color: p.light2C, a: p.a2, fade: 0.7 }], scrim: old.scrim });
const realRow = (m) => {
  const t = THEMES[m.theme]; const old = oldSpecOf(m.theme, m.ap);
  const strats = Object.keys(STRATS).map((s) => { const p = scenePal(m.theme, m.ap, s); return { key: s, name: STRATS[s], line: schemeLine(p), spec: newSpecOf(p, old) }; });
  const job = { file: m.file, src: `assets/real/${m.file}`, sceneH: m.sceneH || 1082, status: m.status || 100, tab: m.tab || 2140, hero: m.hero || null, ap: m.ap, radius: 32 * DPX, old, strats: strats.map((s) => ({ key: s.key, spec: s.spec })) };
  JOBS[m.file] = job;
  const now = RF.phone({ src: job.src, exists: true, cls: 'sp-rf', status: job.status, tab: job.tab });
  const will = (s) => RF.phone({ src: job.src, exists: true, cls: 'sp-rf sp-rf-will', status: job.status, tab: job.tab, fixed: '<span class="sp-rf-badge">считаю…</span>' }).replace('data-ph="sp-rf sp-rf-will"', `data-ph="sp-rf-will" data-strat="${s.key}"`);
  return `<div class="sp-real-row" data-frame="${m.file}"><h3>${t.name} · ${m.ap === 'dark' ? 'тёмное' : 'светлое'}<small>${m.file}${m.hero ? '' : ' · герой не найден: под ним классификатор'}</small></h3><div class="phones">${col('Сейчас · кадр приложения', now)}${strats.map((s) => col(`${s.name}<br><small>${s.line}</small>`, will(s))).join('')}</div></div>`;
};
const section0 = () => {
  const fr = HOME_FRAMES(); JOBS = {}; const sk = SKIPPED_FRAMES();
  const skipped = sk.length ? `<p class="sp-note sp-warn">Не показаны: ${sk.join('; ')}.</p>` : '';
  if (!fr.length) return `<section class="block" id="sp-real"><h2>Главная на реальных кадрах</h2><p class="sp-note">Дневных кадров Главной от Сверки в assets/real пока нет (scene_home_{тема}_{light|dark}.png). Пересборка: node scene-frames.cjs и node scene-palettes.make.cjs.</p>${skipped}</section>`;
  return `<section class="block" id="sp-real"><h2>Главная на реальных кадрах — четыре стратегии цвета</h2><p class="sp-note">Слева — кадр текущей сборки без изменений. Правее — тот же кадр, где перекрашен только фон сцены: герой, надписи, стекло плашек, карточка и таббар — как сняты. Зажми любой перекрашенный телефон — на его месте покажется «сейчас». Темы — те, что уже сняла Сверка; остальные появятся по мере прихода кадров.</p>${skipped}${fr.map(realRow).join('')}</section>`;
};

/* ═════ страница ═════ */
const controls = () => {
  document.getElementById('apList').innerHTML = [['light', 'Светлое'], ['dark', 'Тёмное']].map(([k, n]) => `<span class="chp${AP === k ? ' on' : ''}" data-ap="${k}">${n}</span>`).join('');
  document.getElementById('modeList').innerHTML = [['now', 'Сейчас'], ['new', 'Перекраска'], ['draw', 'Отрисовка']].map(([k, n]) => `<span class="chp${MODE === k ? ' on' : ''}" data-mode="${k}">${n}</span>`).join('');
  document.getElementById('stratList').innerHTML = Object.entries(STRATS).map(([k, n]) => `<span class="chp${STRAT === k ? ' on' : ''}" data-strat="${k}">${n}</span>`).join('');
  document.getElementById('thmList').innerHTML = THEME_IDS.map((id) => `<span class="chp${THEME_ID === id ? ' on' : ''}" data-th="${id}">${THEMES[id].name}</span>`).join('');
};
const render = (enter = true) => {
  TH = AP === 'light' ? 'ink' : 'marine';
  const root = document.getElementById('root');
  root.className = enter ? 'sp-enter sp-fade' : 'sp-fade'; // смена темы — мягкий кроссфейд 280 мс, без повторного появления
  root.innerHTML = section0() + (ALL ? section1() + section3() + section2() + section4() : '');
  controls();
  const cb = document.getElementById('spControls'); if (cb) cb.style.display = ALL ? '' : 'none';
  if (R && R.applyScroll) R.applyScroll(root);
  if (window.SceneReal) window.SceneReal.buildAll(root, JOBS);
  console.log(LOG, 'render', JSON.stringify({ theme: THEME_ID, ap: AP, mode: MODE, strat: STRAT, all: ALL, real: HOME_FRAMES().length, pal: schemeLine(scenePal(THEME_ID, AP)) })); // guard-ok: одна строка на перерисовку
};
const setMode = (m) => { MODE = m; document.querySelectorAll('.ph[data-ph]').forEach((ph) => { ph.classList.toggle('sp-now', m === 'now'); ph.classList.toggle('sp-new', m !== 'now'); ph.classList.toggle('sp-drawn', m === 'draw'); }); document.querySelectorAll('.chp[data-mode]').forEach((c) => c.classList.toggle('on', c.dataset.mode === m)); };
document.body.addEventListener('click', (e) => {
  const h = e.target.closest('[data-act="hero"]'); if (h) { once(h, 'pop'); return; }
  if (e.target.closest('[data-replay]')) { render(true); return; }
  const m = e.target.closest('.chp[data-mode]'); if (m) { setMode(m.dataset.mode); return; }
  const rowEl = e.target.closest('.sp-grid [data-th]'); if (rowEl) { THEME_ID = rowEl.dataset.th; render(false); window.scrollTo({ top: 0, behavior: RM() ? 'auto' : 'smooth' }); return; }
  const st = e.target.closest('.chp[data-strat]'); if (st) { STRAT = st.dataset.strat; render(false); return; }
  const c = e.target.closest('.chp[data-ap], .chp[data-th]'); if (!c) return;
  if (c.dataset.ap) AP = c.dataset.ap;
  if (c.dataset.th) THEME_ID = c.dataset.th;
  render(false);
});
{
  const q = new URLSearchParams(location.search);
  if (q.get('ap') === 'light' || q.get('ap') === 'dark') AP = q.get('ap');
  if (THEMES[q.get('th')]) THEME_ID = q.get('th');
  if (['now', 'new', 'draw'].includes(q.get('mode'))) MODE = q.get('mode');
  if (STRATS[q.get('s')]) STRAT = q.get('s');
  ALL = q.get('all') === '1';
}
render(true);
K.init();
window.__sp = { THEME_IDS, scenePal, sceneTok, nowDialogs, nowSeason, schemeLine, setMode, REAL, jobs: () => JOBS, real: window.SceneReal, setStrat: (k) => { STRAT = k; render(false); }, render: () => render(true) };
})();
