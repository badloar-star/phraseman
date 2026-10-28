// scene-frames.cjs — опись реальных кадров Сверки для макета «Тёмные темы 2.0» (scene-palettes.html): экран/тема/оформление/состояние по имени
// файла, годность кадра (размер 1080 × 2400, не чёрный, не красный экран ошибки сборщика, не dev-превью без тела экрана), граница сцены и
// точное место героя: пиксели, отличные от модели фона сцены (та же формула, что в приложении), в полосе героя дают его рамку; масштаб —
// из отношения высот рамки и рамки непрозрачных пикселей картинки героя, положение — из левого верхнего угла; проверка — точностью.
// Пишет assets/real/scene-frames.json; сборщик кладёт его в страницу как window.__REAL. Запуск: node scene-frames.cjs [--force] |
// node scene-frames.cjs --fit <файл.png> (остатки модели по чистым точкам + картинка |кадр − модель| × 4 рядом).
// зачем (владелец 28.10: только настоящие экраны; перекраска фона ПОД героем требует его альфы и точного места): геометрию ищем здесь
// один раз, а не в браузере владельца. Имена кадров: scene_{home|dialogs|peak|season}_{тема}_{light|dark}.png,
// scene_home_evening_{тема}_dark.png (вечерняя Главная) или {тема}_{light|dark}_{экран}.png (папка Сверки).
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', '..', '..', 'node_modules', 'sharp'));
const SR = require(path.join(__dirname, 'scene-recolor.js'));
const DIR = path.join(__dirname, 'assets', 'real');
const OUT = path.join(DIR, 'scene-frames.json');
const LOG = '[SP-FRAMES]';
const W = 1080; const H = 2400; const DP = 2.625;
const FORCE = process.argv.includes('--force');
const FIT = (() => { const i = process.argv.indexOf('--fit'); return i > 0 ? process.argv[i + 1] : null; })();
const parse = (f) => {
  let m = /^scene_home_evening_([a-z_]+)_(dark|light)\.png$/i.exec(f);
  if (m) return { screen: 'home', theme: m[1].toLowerCase(), ap: m[2].toLowerCase(), state: 'evening' };
  m = /^scene_(home|peak|season|dialogs)_([a-z_]+)_(light|dark)\.png$/i.exec(f);
  if (m) return { screen: m[1].toLowerCase(), theme: m[2].toLowerCase(), ap: m[3].toLowerCase() };
  m = /^([a-z_]+?)_(light|dark)_(home|peak|season|dialogs)\.png$/i.exec(f);
  if (m) return { screen: m[3].toLowerCase(), theme: m[1].toLowerCase(), ap: m[2].toLowerCase() };
  return null;
};
const px = (buf, ch, x, y) => { const i = (y * W + x) * ch; return [buf[i], buf[i + 1], buf[i + 2]]; };
const avg = (buf, ch, x0, y0, x1, y1) => { const s = [0, 0, 0]; let n = 0; for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const c = px(buf, ch, x, y); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n += 1; } return s.map((v) => v / n); };
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/* ── снимок тем и формулы «сейчас» — те же, что в эталоне и в scene-palettes.app.js (sceneTok / nowDialogs) ── */
const THEMES = (() => { const line = fs.readFileSync(path.join(__dirname, 'peak-scene-v2.html'), 'utf8').split('\n').find((l) => l.startsWith('<script>window.__THEMES = ')); const window = {}; eval(line.replace(/<\/?script>/g, '')); return window.__THEMES; })();
const hx = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const ha = (h) => { const s = String(h).replace('#', ''); return s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1; };
const mixc = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const toLin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const oklchOf = (c) => { const [r, g, b] = c.map(toLin); const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b); const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b); const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b); const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s; const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s; return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360]; };
const okLin = (L, C, Hh) => { const a = C * Math.cos(Hh * Math.PI / 180); const b = C * Math.sin(Hh * Math.PI / 180); const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3; const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3; const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]; };
const fromOklch = (L, C, Hh) => okLin(L, C, Hh).map((v) => Math.max(0, Math.min(255, toSrgb(Math.max(0, Math.min(1, v))))));
const PREMIUM = [
  { id: 'grad_full_olive', dark: ['#10170d', '#424c28', '#333d20', '#586035'], light: ['#e6ead5', '#f5f5de', '#e7edc9', '#c9d3a5'], accent: '#dbe591', ink: '#34410d', edge: '#bac573', sceneTop: '#778624', sceneBottom: '#151e10' },
  { id: 'grad_full_ref_signal_lime', dark: ['#040709', '#1c2613', '#0d120c', '#212c15'], light: ['#f9ffed', '#fdfff9', '#f8ffe9', '#f4ffde'], accent: '#c2ff46', ink: '#445919', edge: '#c2ff46', sceneTop: '#101406', sceneBottom: '#020406' },
  { id: 'grad_full_ref_storm_violet', dark: ['#040709', '#1e1929', '#0e0c15', '#241e2f'], light: ['#fbf5ff', '#fefcff', '#faf3ff', '#f8ecff'], accent: '#d697ff', ink: '#4b3559', edge: '#d697ff', sceneTop: '#110c14', sceneBottom: '#020406' },
  { id: 'grad_full_titanium', dark: ['#121416', '#3c4248', '#292f34', '#4b5055'], light: ['#e0e3e5', '#f6f7f8', '#dce1e4', '#bfc7ce'], accent: '#ff8c80', ink: '#a92d26', edge: '#c9d1d8', sceneTop: '#34383d', sceneBottom: '#0a0c0f' },
  { id: 'grad_full_horizon', dark: ['#091723', '#2b4659', '#203344', '#395b6c'], light: ['#dde8ef', '#f2f8ff', '#d8e7f2', '#b4cbd8'], accent: '#ffd09a', ink: '#805022', edge: '#8dafc4', sceneTop: '#12385a', sceneBottom: '#060e1a' },
  { id: 'grad_full_ref_gravity_blue', dark: ['#040709', '#142229', '#0a1015', '#19282f'], light: ['#f3fcff', '#fbfeff', '#f0fbff', '#e9f9ff'], accent: '#86dfff', ink: '#2f4e59', edge: '#86dfff', sceneTop: '#0b1214', sceneBottom: '#020406' },
];
const PREMIUM_BY_ID = Object.fromEntries(PREMIUM.map((p) => [p.id, p]));
// токены премиум-темы как premiumTokens приложения: тёмное — accent, светлое — ink; оба оформления (Сверка снимает и светлые)
const premiumTok = (p, ap) => { const dark = ap === 'dark'; const [bg, from, to] = dark ? p.dark : p.light; const accent = dark ? p.accent : p.ink; return { bg, bgTop: bg, bgBottom: bg, opaqueCard: to, opaqueSheet: from, opaqueControl: from, text: dark ? '#fff9f6' : '#181a20', secondary: dark ? '#dacfd0' : '#55505b', accent, accentText: accent, cta: '#ffffff', ctaInk: p.ink, accentGradient: [accent, accent], accentGlow: p.edge + '8C', bgGlow: [p.edge + '40'], isLight: !dark }; };
PREMIUM.forEach((p) => { THEMES[p.id] = { name: p.id, premium: true, dark: premiumTok(p, 'dark'), light: premiumTok(p, 'light') }; });
const lumc = (c) => { const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const whiteOn = (c) => 1.05 / (lumc(c) + 0.05);
const EVENING_GLOW = { color: [214, 92, 70], a: 0.62 }; // home_scene_tokens.ts EVENING_GLOW rgba(214,92,70,.62)
const EMBER = { color: fromOklch(0.66, 0.19, 28), a: 0.55 }; // EMBER = oklch(.66 .19 28) / .55
/** Модель фона сцены «сейчас» для экрана: { top, bot, start, end, lights, scrim, halo } (SR.painter); null — тема не из снимка */
function oldSpec(screen, theme, ap, state, sceneH, hero) {
  const th = THEMES[theme]; if (!th || !th[ap]) return null; const t = th[ap]; const g = t.accentGradient || [t.accent, t.accent]; const dark = ap === 'dark';
  if (screen === 'home') {
    let top; let bot; let light; let scrim = null;
    const pr = PREMIUM_BY_ID[theme];
    if (pr) { top = hx(pr.sceneTop); for (let i = 0; i < 40 && whiteOn(top) < 5; i += 1) top = mixc([0, 0, 0], top, 0.04); bot = hx(pr.sceneBottom); light = { color: hx(pr.edge), a: 0x25 / 255 }; }
    else if (dark) { top = mixc(hx(g[0]), hx(t.bgTop), 0.3); bot = mixc(hx(g[g.length - 1]), hx(t.bg), 0.3); const gl = (t.bgGlow && t.bgGlow[0]) || t.accentGlow; light = { color: hx(gl), a: ha(gl) }; }
    else if (theme === 'ink') { top = fromOklch(0.47, 0.14, 282); bot = fromOklch(0.28, 0.10, 276); light = { color: fromOklch(0.66, 0.13, 300), a: 0.9 }; scrim = { a: 0.40, h: 300 * DP }; }
    else { const [, C, Hh] = oklchOf(hx(t.accent)); top = fromOklch(0.47, Math.min(C, 0.16), Hh); bot = fromOklch(0.28, Math.min(C, 0.11), (Hh + 354) % 360); light = { color: fromOklch(0.66, Math.min(C, 0.14), (Hh + 18) % 360), a: 0.9 }; scrim = { a: 0.40, h: 300 * DP }; }
    if (state === 'evening') { // вечер (серия под угрозой): тёплый свет справа сверху, угли слева снизу; в светлом — свои тёмные цвета основы
      if (!dark) { const [, C, Hh] = oklchOf(hx(t.accent)); top = theme === 'ink' ? fromOklch(0.30, 0.09, 285) : fromOklch(0.30, Math.min(C, 0.09), Hh); bot = theme === 'ink' ? fromOklch(0.14, 0.05, 280) : fromOklch(0.14, Math.min(C, 0.05), Hh); }
      return { top, bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.82, cy: 0, rx: 0.7, ry: 0.5, color: EVENING_GLOW.color, a: EVENING_GLOW.a, fade: 1 }, { cx: 90 * DP / W, cy: (sceneH - 70 * DP) / sceneH, rx: 130 * DP / W, ry: 130 * DP / sceneH, color: EMBER.color, a: EMBER.a, fade: 1 }], scrim };
    }
    return { top, bot, start: [0.22, 0], end: [0.78, 1], lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: light.color, a: light.a, fade: 1 }], scrim };
  }
  if (screen === 'dialogs') { // DialogsSceneBackdrop + ореол героя accentGlow (профиль 1 → .2 → 0) в x 57 %, круг 168 dp
    const top = dark ? mixc(hx(g[0]), hx(t.bgTop), 0.3) : hx(t.bgTop); const bot = dark ? mixc(hx(g[g.length - 1]), hx(t.bg), 0.3) : hx(t.bg);
    const gl = (i) => { const c = t.bgGlow && t.bgGlow[i]; return c ? { color: hx(c), a: ha(c) } : { color: [0, 0, 0], a: 0 }; };
    const lights = [{ cx: 0.84, cy: 0.14, rx: 0.7, ry: 0.46, color: gl(0).color, a: gl(0).a, fade: 1 }, { cx: 0.08, cy: 0, rx: 0.6, ry: 0.42, color: gl(1).color, a: gl(1).a, fade: 1 }];
    if (!dark) lights.push({ cx: 0.5, cy: 1, rx: 0.8, ry: 0.5, color: gl(2).color, a: gl(2).a, fade: 1 });
    const halo = hero ? { cx: 0.57 * W + 84 * DP, cy: hero.y + 84 * DP, r: 84 * DP, a: ha(t.accentGlow), color: hx(t.accentGlow), stops: [[0, 1], [0.62, 0.2], [1, 0]] } : null;
    return { top, bot, start: [0.42, 0], end: [0.58, 1], lights, scrim: dark ? null : { a: 0.34, h: sceneH * 0.6 }, halo };
  }
  return null;
}
/** Герой экрана: картинка, слот и зона поиска (px кадра). Главная — hero512 (слот 160 dp с полем 10, в сборке 28.10 рисуется ~84 dp);
 *  Диалоги — v2art/dialogs_scene_first (слот 160 dp без поля, справа −14, сверху topInset + 44 dp). */
const HERO = {
  home: { asset: (ap, state) => path.join(__dirname, 'assets', 'v2art', 'hero512', ap, (state === 'evening' ? 'home_scene_streak_risk' : 'home_scene_continue') + '.webp'), art: (state) => (state === 'evening' ? 'home_scene_streak_risk' : 'home_scene_continue'), dir: 'hero512', zone: { x0: 700, y0: 310, bottomGap: 300 }, prior: { day: { size: 221, x: 868, y: 295 } } },
  dialogs: { asset: () => path.join(__dirname, 'assets', 'v2art', 'dark', 'dialogs_scene_first.webp'), assetByAp: (ap) => path.join(__dirname, 'assets', 'v2art', ap, 'dialogs_scene_first.webp'), art: () => 'dialogs_scene_first', dir: 'v2art', zone: { x0: 620, y0: 150, bottomGap: 470 }, prior: { day: { size: 418, x: 669, y: 246 } } },
};

async function describe(fp, p) {
  const meta = await sharp(fp).metadata();
  if (meta.width !== W || meta.height !== H) return { ok: false, why: `размер ${meta.width}×${meta.height}, нужен 1080×2400` };
  const st = await sharp(fp).stats();
  const mean = st.channels.slice(0, 3).map((c) => c.mean); const sd = st.channels.slice(0, 3).map((c) => c.stdev);
  if (Math.max(...mean) < 10 && Math.max(...sd) < 20) return { ok: false, why: 'чёрный кадр' };
  if (mean[0] > 150 && mean[1] < 90 && mean[2] < 90) return { ok: false, why: 'красный экран ошибки сборщика' };
  const buf = await sharp(fp).raw().toBuffer(); const ch = buf.length / (W * H);
  // граница сцены: первый резкий скачок цвета в левой колонке ниже 800 px (скруглённый низ сцены над карточкой); не нашли — 1082 (раскладка сборки 28.10)
  // вечером слева снизу угли (радиальный свет) — границу ищем по правой колонке, днём по левой
  const colX = p.state === 'evening' ? 1064 : 16;
  let sceneH = 0; let prev = px(buf, ch, colX, 800);
  for (let y = 801; y < 1500; y += 1) { const c = px(buf, ch, colX, y); if (dist(c, prev) > 24) { sceneH = y; break; } prev = c; }
  sceneH = sceneH || 1082;
  // вечер (серия под угрозой): тёплый свет справа сверху и угли слева снизу вместо света слева — правый верх теплее левого
  const warm = (c) => c[0] - c[2];
  const wr = warm(avg(buf, ch, 980, 4, 1076, 60)); const wl = warm(avg(buf, ch, 4, 4, 100, 60)); const evening = wr > 40 && wr - wl > 35; // вечерний свет красный: правый верх тёплый сам по себе и теплее левого
  // dev-превью сцены (без тела экрана): под сценой Главной нет карточки «Сегодня» цвета opaqueCard темы — такой кадр не настоящий экран
  let preview = false; const t = THEMES[p.theme] && THEMES[p.theme][p.ap];
  if (p.screen === 'home' && t) { const under = px(buf, ch, 540, sceneH + 60); preview = dist(under, hx(t.opaqueCard)) > 14 && dist(under, hx(t.opaqueSheet || t.opaqueCard)) > 14; }
  return { ok: true, status: 100, tab: 2140, sceneH, evening, preview, buf, ch };
}

/* герой: в полосе справа ниже шапки пиксели, отличные от модели фона, — это герой; его рамка против рамки непрозрачных пикселей картинки
   даёт масштаб и место; полоса обрывается на первом разрыве ≥ 16 строк (ниже — надзаголовок и заголовок) */
async function alignHero(d, screen, spec, sceneH, hero, ap, state) {
  const Z = hero.zone; const X0 = Z.x0; const Y0 = Z.y0; const Y1 = Math.max(Y0 + 100, sceneH - Z.bottomGap);
  const paint = SR.painter(spec, W, sceneH); const mask = new Uint8Array(W * H); const rows = new Int32Array(H);
  for (let y = Y0; y < Y1; y += 1) for (let x = X0; x < W; x += 1) { const c = px(d.buf, d.ch, x, y); const m = paint(x, y); if (dist(c, m) > 28) { mask[y * W + x] = 1; rows[y] += 1; } }
  let start = -1; for (let y = Y0; y < Y1; y += 1) if (rows[y] >= 4) { start = y; break; }
  if (start < 0) return { hero: null, why: 'в полосе героя нет пикселей, отличных от модели фона' };
  let end = Y1; for (let y = start + 16; y < Y1; y += 1) { let gap = true; for (let k = 0; k < 16 && y + k < Y1; k += 1) if (rows[y + k] >= 4) { gap = false; break; } if (gap) { end = y; break; } }
  const fb = { minX: 1e9, maxX: -1, minY: start, maxY: end - 1, n: 0 };
  for (let y = start; y < end; y += 1) for (let x = X0; x < W; x += 1) if (mask[y * W + x]) { fb.n += 1; if (x < fb.minX) fb.minX = x; if (x > fb.maxX) fb.maxX = x; }
  for (let y = end - 1; y >= start; y -= 1) { if (rows[y] >= 4) { fb.maxY = y; break; } }
  const art = hero.assetByAp ? hero.assetByAp(ap) : hero.asset(ap, state); if (!fs.existsSync(art)) return { hero: null, why: 'нет картинки героя ' + art };
  const meta = await sharp(art).metadata(); const N = meta.width;
  const a0 = await sharp(art).ensureAlpha().raw().toBuffer(); const ab = { minX: 1e9, maxX: -1, minY: 1e9, maxY: -1 };
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) { if (a0[(y * N + x) * 4 + 3] >= 128) { if (x < ab.minX) ab.minX = x; if (x > ab.maxX) ab.maxX = x; if (y < ab.minY) ab.minY = y; if (y > ab.maxY) ab.maxY = y; } }
  const fh = (ab.maxY - ab.minY + 1) / N; const fx0 = ab.minX / N; const fy0 = ab.minY / N;
  const size0 = Math.round((fb.maxY - fb.minY + 1) / fh); const x00 = Math.round(fb.minX - fx0 * size0); const y00 = Math.round(fb.minY - fy0 * size0);
  let best = { s: -1 };
  for (let size = size0 - 2; size <= size0 + 2; size += 1) {
    const a = await sharp(art).resize(size, size, { fit: 'contain' }).ensureAlpha().raw().toBuffer();
    const pts = []; for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (a[(y * size + x) * 4 + 3] >= 128) pts.push(x, y);
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      let hit = 0; let vis = 0; for (let k = 0; k < pts.length; k += 2) { const X = x00 + dx + pts[k]; const Y = y00 + dy + pts[k + 1]; if (X < 0 || X >= W || Y < 0 || Y >= H) continue; vis += 1; hit += mask[Y * W + X]; }
      const s = vis ? hit / vis : 0; if (s > best.s) best = { s, size, x0: x00 + dx, y0: y00 + dy };
    }
  }
  console.log(LOG, screen, 'герой: рамка на кадре', JSON.stringify(fb), 'рамка картинки', JSON.stringify(ab), '→', best.size, 'px в', best.x0, best.y0, 'точность', best.s.toFixed(4));
  // порог 0,7: у тёмной картинки героя тёмные части почти не отличаются от сцены и не засчитываются, хотя рамка найдена верно;
  // ниже порога принимаем, если место и размер совпали с приором раскладки (та же сборка, то же состояние) и точность ≥ 0,4
  const pri = hero.prior && hero.prior[state || 'day'];
  const nearPrior = pri && Math.abs(best.size - pri.size) <= 8 && Math.abs(best.x0 - pri.x) <= 12 && Math.abs(best.y0 - pri.y) <= 12;
  if (best.s < 0.7 && !(nearPrior && best.s >= 0.4)) return { hero: null, why: `герой не совпал с картинкой (точность ${best.s.toFixed(3)} при ${best.size} px в ${best.x0},${best.y0})` };
  return { hero: { x: best.x0, y: best.y0, size: best.size, score: +best.s.toFixed(4), byPrior: best.s < 0.7, art: hero.art(state), dir: hero.dir, opacity: 0.96 } };
}

async function fitReport(file) {
  const p = parse(file); const d = await describe(path.join(DIR, file), p); if (!d.ok) { console.log(LOG, 'не годен:', d.why); return; }
  const state = p.state || (d.evening ? 'evening' : 'day');
  const rec = { screen: p.screen, state };
  let hero = null; if (HERO[p.screen]) { const r = await alignHero(d, p.screen, oldSpec(p.screen, p.theme, p.ap, state, d.sceneH, null), d.sceneH, HERO[p.screen], p.ap, state); hero = r.hero; if (!hero) console.log(LOG, 'герой:', r.why); }
  const spec = oldSpec(p.screen, p.theme, p.ap, state, d.sceneH, hero); if (!spec) { console.log(LOG, 'нет модели для', p.screen, p.theme); return; }
  const paint = SR.painter(spec, W, d.sceneH);
  const pts = []; for (let y = 8; y < d.sceneH - 90; y += 12) pts.push([16, y]); for (let x = 120; x < 420; x += 20) pts.push([x, 6]);
  const res = [0, 0, 0]; let mx = 0; const bad = [];
  for (const [x, y] of pts) { const c = px(d.buf, d.ch, x, y); const m = paint(x, y); const dd = c.map((v, i) => v - m[i]); dd.forEach((v, i) => { res[i] += Math.abs(v); }); const md = Math.max(...dd.map(Math.abs)); if (md > mx) mx = md; if (md > 10) bad.push(`${x},${y}: ${c.join(',')} vs ${m.map(Math.round).join(',')}`); }
  console.log(LOG, 'fit', file, JSON.stringify(rec), 'точек', pts.length, 'средний остаток', res.map((v) => (v / pts.length).toFixed(2)).join('/'), 'макс', mx.toFixed(0), 'плохих', bad.length, bad.slice(0, 6));
  const out = Buffer.alloc(W * d.sceneH * 3);
  for (let y = 0; y < d.sceneH; y += 1) for (let x = 0; x < W; x += 1) { const c = px(d.buf, d.ch, x, y); const m = paint(x, y); const o = (y * W + x) * 3; for (let i = 0; i < 3; i += 1) out[o + i] = Math.min(255, Math.abs(c[i] - m[i]) * 4); }
  const diff = await sharp(out, { raw: { width: W, height: d.sceneH, channels: 3 } }).resize({ width: 400 }).png().toBuffer();
  const frame = await sharp(path.join(DIR, file)).extract({ left: 0, top: 0, width: W, height: d.sceneH }).resize({ width: 400 }).png().toBuffer();
  const outPng = path.join('C:/Temp/claude/mb/spire3/scenes/real', `fit_${file}`);
  await sharp({ create: { width: 820, height: Math.round(d.sceneH * 400 / W), channels: 3, background: '#222' } }).composite([{ input: frame, left: 0, top: 0 }, { input: diff, left: 420, top: 0 }]).png().toFile(outPng);
  console.log(LOG, 'картинка остатков', outPng);
}

(async () => {
  if (FIT) { await fitReport(FIT); return; }
  if (!fs.existsSync(DIR)) { console.log(LOG, 'нет папки', DIR); process.exit(1); }
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const files = fs.readdirSync(DIR).filter((f) => /\.png$/i.test(f) && parse(f)).sort();
  const out = {};
  for (const file of files) {
    const p = parse(file); const fp = path.join(DIR, file); const mtime = fs.statSync(fp).mtimeMs;
    if (!FORCE && prev[file] && prev[file].mtime === mtime && prev[file].v === 3) { out[file] = prev[file]; continue; }
    const d = await describe(fp, p);
    const rec = Object.assign({ file, mtime, v: 3 }, p, { ok: d.ok, why: d.why || null, status: d.status, tab: d.tab, sceneH: d.sceneH });
    if (d.ok && (p.screen === 'home' || p.screen === 'dialogs')) {
      rec.state = p.state || (p.screen === 'home' && d.evening ? 'evening' : 'day');
      if (!THEMES[p.theme] || !THEMES[p.theme][p.ap]) { rec.recolor = false; rec.why = `тема «${p.theme}» (${p.ap}) не из снимка тем эталона и премиум-списка`; }
      else if (p.screen === 'home' && d.preview) { rec.ok = false; rec.why = 'dev-превью сцены (под сценой нет карточки «Сегодня») — не настоящий экран, переснять вкладку'; }
      else if (p.screen === 'home' && !p.state && d.evening) { rec.state = 'evening'; rec.why = 'вечернее состояние снято без пометки в имени — разбираю как вечер'; }
      if (rec.ok && rec.recolor !== false) {
        let r = await alignHero(d, p.screen, oldSpec(p.screen, p.theme, p.ap, rec.state, d.sceneH, null), d.sceneH, HERO[p.screen], p.ap, rec.state);
        if (!r.hero && rec.state === 'evening') { const r2 = await alignHero(d, p.screen, oldSpec(p.screen, p.theme, p.ap, rec.state, d.sceneH, null), d.sceneH, HERO[p.screen], p.ap, 'day'); if (r2.hero) { r = r2; console.log(LOG, 'вечер: герой — книга (continue), не календарь'); } }
        rec.hero = r.hero; if (!r.hero) rec.heroWhy = r.why;
      }
    }
    out[file] = rec;
    console.log(LOG, file, JSON.stringify(Object.assign({}, rec, { mtime: undefined, file: undefined, v: undefined })));
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  const ok = Object.values(out).filter((r) => r.ok);
  console.log(LOG, 'записано', OUT, 'кадров', files.length, 'годных', ok.length, 'в перекраску', ok.filter((r) => (r.screen === 'home' || r.screen === 'dialogs') && r.recolor !== false).length);
})();
