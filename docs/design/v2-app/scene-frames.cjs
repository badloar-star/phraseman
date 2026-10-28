// scene-frames.cjs — опись реальных кадров Сверки для макета «Сцены по темам»: экран/тема/оформление по имени файла, годность кадра
// (размер 1080 × 2400, не чёрный, не красный экран ошибки Metro), состояние Главной (дневное / вечернее «серия под угрозой» — у него другая
// модель сцены, в перекраску не берём), граница сцены и точное место героя на Главной: пиксели, отличные от модели фона сцены (та же
// формула, что в приложении и в scene-palettes.app.js), в полосе героя дают его рамку; масштаб — из отношения высот рамки и рамки
// непрозрачных пикселей картинки hero512, положение — из левого верхнего угла; проверка — точностью. Пишет assets/real/scene-frames.json;
// сборщик scene-palettes.make.cjs кладёт его в страницу как window.__REAL. Запуск: node scene-frames.cjs [--force]
// (кадр с прежней описью и той же датой не пересчитывается).
// зачем (владелец 28.10: только настоящие экраны; перекраска фона ПОД героем требует его альфы и точного места): геометрию ищем здесь
// один раз, а не в браузере владельца. Имена кадров: scene_{home|peak|season|dialogs}_{тема}_{light|dark}.png (макет) или
// {тема}_{light|dark}_{экран}.png (папка Сверки) — принимаются оба.
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', '..', '..', 'node_modules', 'sharp'));
const SR = require(path.join(__dirname, 'scene-recolor.js'));
const DIR = path.join(__dirname, 'assets', 'real');
const OUT = path.join(DIR, 'scene-frames.json');
const HERO_DIR = path.join(__dirname, 'assets', 'v2art', 'hero512');
const LOG = '[SP-FRAMES]';
const W = 1080; const H = 2400; const DP = 2.625;
const FORCE = process.argv.includes('--force');
const parse = (f) => {
  let m = /^scene_(home|peak|season|dialogs)_([a-z_]+)_(light|dark)\.png$/i.exec(f);
  if (m) return { screen: m[1].toLowerCase(), theme: m[2].toLowerCase(), ap: m[3].toLowerCase() };
  m = /^([a-z_]+?)_(light|dark)_(home|peak|season|dialogs)\.png$/i.exec(f);
  if (m) return { screen: m[3].toLowerCase(), theme: m[1].toLowerCase(), ap: m[2].toLowerCase() };
  return null;
};
const px = (buf, ch, x, y) => { const i = (y * W + x) * ch; return [buf[i], buf[i + 1], buf[i + 2]]; };
const avg = (buf, ch, x0, y0, x1, y1) => { const s = [0, 0, 0]; let n = 0; for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const c = px(buf, ch, x, y); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n += 1; } return s.map((v) => v / n); };

/* ── снимок тем и формула «сейчас» сцены Главной — те же, что в эталоне и в scene-palettes.app.js (sceneTok) ── */
const THEMES = (() => { const line = fs.readFileSync(path.join(__dirname, 'peak-scene-v2.html'), 'utf8').split('\n').find((l) => l.startsWith('<script>window.__THEMES = ')); const window = {}; eval(line.replace(/<\/?script>/g, '')); return window.__THEMES; })();
const hx = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const ha = (h) => { const s = String(h).replace('#', ''); return s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1; };
const mixc = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const toLin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const oklchOf = (c) => { const [r, g, b] = c.map(toLin); const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b); const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b); const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b); const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s; const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s; return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360]; };
const okLin = (L, C, Hh) => { const a = C * Math.cos(Hh * Math.PI / 180); const b = C * Math.sin(Hh * Math.PI / 180); const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3; const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3; const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3; return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]; };
const fromOklch = (L, C, Hh) => okLin(L, C, Hh).map((v) => Math.max(0, Math.min(255, toSrgb(Math.max(0, Math.min(1, v))))));
/** модель фона Главной «сейчас» (без вечера и премиума): { top, bot, lights, scrim } для SR.painter; null — тема не из снимка */
function homeOldSpec(theme, ap) {
  const th = THEMES[theme]; if (!th || !th[ap]) return null; const t = th[ap]; const g = t.accentGradient || [t.accent, t.accent];
  if (ap === 'dark') { const top = mixc(hx(g[0]), hx(t.bgTop), 0.3); const bot = mixc(hx(g[g.length - 1]), hx(t.bg), 0.3); const gl = (t.bgGlow && t.bgGlow[0]) || t.accentGlow; return { top, bot, lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: hx(gl), a: ha(gl), fade: 1 }], scrim: null }; }
  const scrim = { a: 0.40, h: 300 * DP };
  if (theme === 'ink') return { top: fromOklch(0.47, 0.14, 282), bot: fromOklch(0.28, 0.10, 276), lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: fromOklch(0.66, 0.13, 300), a: 0.9, fade: 1 }], scrim };
  const [, C, Hh] = oklchOf(hx(t.accent));
  return { top: fromOklch(0.47, Math.min(C, 0.16), Hh), bot: fromOklch(0.28, Math.min(C, 0.11), (Hh + 354) % 360), lights: [{ cx: 0.18, cy: 0, rx: 0.7, ry: 0.5, color: fromOklch(0.66, Math.min(C, 0.14), (Hh + 18) % 360), a: 0.9, fade: 1 }], scrim };
}

async function describe(fp) {
  const meta = await sharp(fp).metadata();
  if (meta.width !== W || meta.height !== H) return { ok: false, why: `размер ${meta.width}×${meta.height}, нужен 1080×2400` };
  const st = await sharp(fp).stats();
  const mean = st.channels.slice(0, 3).map((c) => c.mean); const sd = st.channels.slice(0, 3).map((c) => c.stdev);
  if (Math.max(...mean) < 10 && Math.max(...sd) < 20) return { ok: false, why: 'чёрный кадр' };
  if (mean[0] > 150 && mean[1] < 90 && mean[2] < 90) return { ok: false, why: 'красный экран ошибки Metro' };
  const buf = await sharp(fp).raw().toBuffer(); const ch = buf.length / (W * H);
  // граница сцены: первый резкий скачок цвета в левой колонке ниже 800 px (скруглённый низ сцены над карточкой); не нашли — 1082 (раскладка сборки 28.10)
  let sceneH = 0; let prev = px(buf, ch, 16, 800);
  for (let y = 801; y < 1500; y += 1) { const c = px(buf, ch, 16, y); if (Math.abs(c[0] - prev[0]) + Math.abs(c[1] - prev[1]) + Math.abs(c[2] - prev[2]) > 24) { sceneH = y; break; } prev = c; }
  // вечер (серия под угрозой): тёплый свет справа сверху и угли слева снизу вместо света слева — правый верх теплее левого
  const warm = (c) => c[0] - c[2];
  const evening = warm(avg(buf, ch, 980, 4, 1076, 60)) - warm(avg(buf, ch, 4, 4, 100, 60)) > 35;
  return { ok: true, status: 100, tab: 2140, sceneH: sceneH || 1082, sceneHFound: sceneH > 0, evening, buf, ch };
}

/* герой Главной: в полосе справа (x ≥ 700) ниже шапки пиксели, отличные от модели фона, — это герой; его рамка против рамки непрозрачных
   пикселей картинки даёт масштаб и место; полоса обрывается на первом разрыве ≥ 20 строк (ниже — надзаголовок и заголовок) */
async function alignHero(d, art, spec, sceneH) {
  const X0 = 700; const Y0 = 310; const Y1 = Math.max(Y0 + 100, sceneH - 300);
  const paint = SR.painter(spec, W, sceneH); const mask = new Uint8Array(W * H); const rows = new Int32Array(H);
  for (let y = Y0; y < Y1; y += 1) for (let x = X0; x < W; x += 1) { const c = px(d.buf, d.ch, x, y); const m = paint(x, y); if (Math.max(Math.abs(c[0] - m[0]), Math.abs(c[1] - m[1]), Math.abs(c[2] - m[2])) > 28) { mask[y * W + x] = 1; rows[y] += 1; } }
  let start = -1; for (let y = Y0; y < Y1; y += 1) if (rows[y] >= 4) { start = y; break; }
  if (start < 0) return { hero: null, why: 'в полосе героя нет пикселей, отличных от модели фона' };
  let end = Y1; for (let y = start + 20; y < Y1; y += 1) { let gap = true; for (let k = 0; k < 20 && y + k < Y1; k += 1) if (rows[y + k] >= 4) { gap = false; break; } if (gap) { end = y; break; } }
  const fb = { minX: 1e9, maxX: -1, minY: start, maxY: end - 1, n: 0 };
  for (let y = start; y < end; y += 1) for (let x = X0; x < W; x += 1) if (mask[y * W + x]) { fb.n += 1; if (x < fb.minX) fb.minX = x; if (x > fb.maxX) fb.maxX = x; }
  for (let y = end - 1; y >= start; y -= 1) { if (rows[y] >= 4) { fb.maxY = y; break; } }
  const meta = await sharp(art).metadata(); const N = meta.width;
  const a0 = await sharp(art).ensureAlpha().raw().toBuffer(); const ab = { minX: 1e9, maxX: -1, minY: 1e9, maxY: -1 };
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) { if (a0[(y * N + x) * 4 + 3] >= 128) { if (x < ab.minX) ab.minX = x; if (x > ab.maxX) ab.maxX = x; if (y < ab.minY) ab.minY = y; if (y > ab.maxY) ab.maxY = y; } }
  const fh = (ab.maxY - ab.minY + 1) / N; const fx0 = ab.minX / N; const fy0 = ab.minY / N;
  const size0 = Math.round((fb.maxY - fb.minY + 1) / fh); const x00 = Math.round(fb.minX - fx0 * size0); const y00 = Math.round(fb.minY - fy0 * size0);
  // точность: доля непрозрачных точек картинки, попавших на «отличные от фона» пиксели кадра; уточнение ±2 px и ±2 по размеру
  let best = { s: -1 };
  for (let size = size0 - 2; size <= size0 + 2; size += 1) {
    const a = await sharp(art).resize(size, size, { fit: 'contain' }).ensureAlpha().raw().toBuffer();
    const pts = []; for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (a[(y * size + x) * 4 + 3] >= 128) pts.push(x, y);
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      let hit = 0; let vis = 0; for (let k = 0; k < pts.length; k += 2) { const X = x00 + dx + pts[k]; const Y = y00 + dy + pts[k + 1]; if (X < 0 || X >= W || Y < 0 || Y >= H) continue; vis += 1; hit += mask[Y * W + X]; }
      const s = vis ? hit / vis : 0; if (s > best.s) best = { s, size, x0: x00 + dx, y0: y00 + dy };
    }
  }
  console.log(LOG, 'герой: рамка на кадре', JSON.stringify(fb), 'рамка картинки', JSON.stringify(ab), '→', best.size, 'px в', best.x0, best.y0, 'точность', best.s.toFixed(4));
  // порог 0,7: у тёмной картинки героя тёмные части почти не отличаются от сцены и не засчитываются, хотя рамка найдена верно
  if (best.s < 0.7) return { hero: null, why: `герой не совпал с картинкой (точность ${best.s.toFixed(3)} при ${best.size} px в ${best.x0},${best.y0})` };
  return { hero: { x: best.x0, y: best.y0, size: best.size, score: +best.s.toFixed(4), art: 'home_scene_continue', opacity: 0.96 } };
}

(async () => {
  if (!fs.existsSync(DIR)) { console.log(LOG, 'нет папки', DIR); process.exit(1); }
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const files = fs.readdirSync(DIR).filter((f) => /\.png$/i.test(f) && parse(f)).sort();
  const out = {};
  for (const file of files) {
    const p = parse(file); const fp = path.join(DIR, file); const mtime = fs.statSync(fp).mtimeMs;
    if (!FORCE && prev[file] && prev[file].mtime === mtime) { out[file] = prev[file]; console.log(LOG, 'без изменений', file); continue; }
    const d = await describe(fp);
    const rec = Object.assign({ file, mtime }, p, { ok: d.ok, why: d.why || null, status: d.status, tab: d.tab, sceneH: d.sceneH, sceneHFound: d.sceneHFound });
    if (d.ok && p.screen === 'home') {
      rec.state = d.evening ? 'evening' : 'day';
      if (d.evening) { rec.recolor = false; rec.why = 'вечернее состояние Главной (серия под угрозой: тёплый свет справа, угли слева) — другая модель сцены; для сравнения нужен дневной кадр'; }
      else if (!THEMES[p.theme]) { rec.recolor = false; rec.why = `тема «${p.theme}» не из снимка 23 тем эталона`; }
      else {
        const art = path.join(HERO_DIR, p.ap, 'home_scene_continue.webp');
        if (!fs.existsSync(art)) { rec.hero = null; rec.heroWhy = 'нет картинки героя ' + art; }
        else { const r = await alignHero(d, art, homeOldSpec(p.theme, p.ap), d.sceneH); rec.hero = r.hero; if (!r.hero) rec.heroWhy = r.why; }
      }
    }
    out[file] = rec;
    console.log(LOG, file, JSON.stringify(Object.assign({}, rec, { mtime: undefined, file: undefined })));
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(LOG, 'записано', OUT, 'кадров', files.length, 'годных', Object.values(out).filter((r) => r.ok).length, 'в перекраску', Object.values(out).filter((r) => r.ok && r.screen === 'home' && r.recolor !== false).length);
})();
