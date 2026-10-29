// ═══════════════════════════════════════════════════════════════════════════
// ann_v2_gate_compare.cjs — сравнение «приложение против кадра макета» для 36 объявлений (гейт владельца 28.10).
//
// зачем (критерий гейта, координатор 28.10): кадры в конечном состоянии (settle), область кадра истории (между шапкой 120 и низом 60 /
// 150 с кнопкой), уменьшение до 1/4, средняя разница по каналам в % от 255. Порог подбирается ОДИН раз на первых 6 кадрах и
// записывается в OWNER_LOCKS.md; дальше его меняет только владелец. Любое превышение — красный гейт, лечится кадром, не порогом.
//   node scripts/mockups/ann_v2_gate_compare.cjs [--ref=C:/Temp/claude/ann_gate/ref] [--emu=C:/Temp/claude/ann_gate/emu]
//        [--out=docs/work/announcements_gate/results.json] [--threshold=N] [--calibrate] [--sheet=C:/Temp/claude/ann_gate/worst.png]
// Выход: results.json (sha256 макета, порог, кадр за кадром diffPct и ok, итоги) — его читает сторож tests/owner_locks_announcements_*.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const LOG = '[ANN-GATE]';
const ROOT = path.resolve(__dirname, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? 'true'] : [a, 'true']; }));
const REF = args.ref || 'C:/Temp/claude/ann_gate/ref';
const EMU = args.emu || 'C:/Temp/claude/ann_gate/emu';
const OUT = path.resolve(ROOT, args.out || 'docs/work/announcements_gate/results.json');
const SHEET = args.sheet || 'C:/Temp/claude/ann_gate/worst.png';
/** Порог, % средней разницы (замок владельца; до калибровки — null = только отчёт). */
const THRESHOLD = args.threshold !== undefined ? Number(args.threshold) : null;
const CALIBRATE = args.calibrate === 'true';
const DOWN = 4;
/** Критерий (а): допуск геометрии по testID, dp (координатор 28.10: ±2 dp при 390 × 844). */
const GEO_TOL_DP = Number(args['geo-tol'] || 2);

/**
 * Геометрия кадра: рамки макета (ST.rects, dp телефона) против узлов эмулятора (uiautomator, px экрана → dp по ширине экрана / 390).
 * Совпадение по id: |dy| и |dh| ≤ допуска и (|dx| ≤ допуска ИЛИ |dcx| ≤ допуска) — кадр либо прижат влево, либо центрирован, а ширина
 * текста (dw) зависит от шрифта и только печатается. Нет узла в эмуляторе при наличии рамки в макете — расхождение «missing».
 */
function geometryCheck(refRects, emuNodes, emuWidthPx) {
  if (!Array.isArray(refRects) || !refRects.length) return { checked: 0, mismatches: [], skipped: 'no_ref_rects' };
  if (!Array.isArray(emuNodes)) return { checked: 0, mismatches: [], skipped: 'no_emu_nodes' };
  const k = 390 / (emuWidthPx || 1170);
  const mismatches = []; let checked = 0;
  for (const r of refRects) {
    const n = emuNodes.find((e) => e.id === r.id);
    if (!n) { mismatches.push({ id: r.id, why: 'missing' }); continue; }
    checked += 1;
    const e = { x: n.x * k, y: n.y * k, w: n.w * k, h: n.h * k };
    const dx = e.x - r.x, dy = e.y - r.y, dw = e.w - r.w, dh = e.h - r.h, dcx = (e.x + e.w / 2) - (r.x + r.w / 2);
    const ok = Math.abs(dy) <= GEO_TOL_DP && Math.abs(dh) <= GEO_TOL_DP && (Math.abs(dx) <= GEO_TOL_DP || Math.abs(dcx) <= GEO_TOL_DP);
    if (!ok) mismatches.push({ id: r.id, dx: +dx.toFixed(1), dcx: +dcx.toFixed(1), dy: +dy.toFixed(1), dw: +dw.toFixed(1), dh: +dh.toFixed(1) });
  }
  return { checked, mismatches };
}

/** Область кадра истории в кадре телефона: от 120 до 844 − 60 (или − 150 с кнопкой); эмулятор — в масштабе своей ширины к 390. */
function slideCrop(width, height, cta) {
  const s = width / 390;
  const top = Math.round(120 * s);
  const bottom = Math.round((844 - (cta ? 150 : 60)) * s);
  return { left: 0, top, width, height: Math.min(height, bottom) - top };
}

async function rawSmall(file, cta) {
  const img = sharp(file);
  const meta = await img.metadata();
  const c = slideCrop(meta.width, meta.height, cta);
  const w = Math.round(390 / DOWN), h = Math.round((c.height / (meta.width / 390)) / DOWN);
  const buf = await img.extract(c).resize({ width: w, height: h, fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return buf;
}

function diffPct(a, b) {
  const n = Math.min(a.data.length, b.data.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += Math.abs(a.data[i] - b.data[i]);
  return (sum / n / 255) * 100;
}

(async () => {
  const refManifest = JSON.parse(fs.readFileSync(path.join(REF, 'manifest.json'), 'utf8'));
  const emuManifest = fs.existsSync(path.join(EMU, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(EMU, 'manifest.json'), 'utf8')) : null;
  const results = []; const missing = [];
  for (const f of refManifest.frames) {
    const name = f.file.replace(/\.png$/, '');
    const refFile = path.join(REF, f.file); const emuFile = path.join(EMU, f.file);
    if (!fs.existsSync(emuFile)) { missing.push(name); continue; }
    try {
      const [a, b] = await Promise.all([rawSmall(refFile, f.cta), rawSmall(emuFile, f.cta)]);
      if (a.info.width !== b.info.width || a.info.height !== b.info.height) { results.push({ name, diffPct: null, ok: false, why: `size ${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}` }); continue; }
      const d = diffPct(a, b);
      const emuFrame = emuManifest ? (emuManifest.frames || []).find((x) => x.file === f.file) : null;
      const emuMeta = await sharp(emuFile).metadata();
      const geo = geometryCheck(f.rects, emuFrame ? emuFrame.nodes : null, emuMeta.width);
      const geoOk = geo.mismatches.length === 0;
      results.push({ name, design: f.design, long: f.long, theme: f.theme, ap: f.ap, diffPct: Math.round(d * 100) / 100, ok: THRESHOLD === null ? null : (d <= THRESHOLD && geoOk), geo });
    } catch (e) {
      results.push({ name, diffPct: null, ok: false, why: String(e).slice(0, 120) });
    }
  }
  const measured = results.filter((r) => r.diffPct !== null).map((r) => r.diffPct).sort((x, y) => x - y);
  const stats = measured.length ? { min: measured[0], median: measured[Math.floor(measured.length / 2)], p90: measured[Math.floor(measured.length * 0.9)], max: measured[measured.length - 1] } : null;
  const mismatches = results.filter((r) => r.ok === false).length;
  const geoChecked = results.reduce((s, r) => s + (r.geo ? r.geo.checked : 0), 0);
  const geoMismatches = results.reduce((s, r) => s + (r.geo ? r.geo.mismatches.length : 0), 0);
  const geoSkipped = results.filter((r) => r.geo && r.geo.skipped).length;
  const summary = {
    madeAt: new Date().toISOString(), mockup: refManifest.mockup, mockupSha256: refManifest.mockupSha256, refMadeAt: refManifest.madeAt, device: emuManifest ? { device: emuManifest.device, resized: emuManifest.resized } : null,
    threshold: THRESHOLD, frames: refManifest.frames.length, compared: results.length, missing: missing.length, mismatches, stats,
    geometry: { tolDp: GEO_TOL_DP, checked: geoChecked, mismatches: geoMismatches, skippedFrames: geoSkipped },
    results, missingNames: missing,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 1));
  console.log(LOG, JSON.stringify({ frames: summary.frames, compared: summary.compared, missing: summary.missing, mismatches, threshold: THRESHOLD, stats, geometry: summary.geometry }));
  const geoWorst = results.filter((r) => r.geo && r.geo.mismatches.length).slice(0, 8);
  if (geoWorst.length) console.log(LOG, 'геометрия, расхождения:', geoWorst.map((r) => `${r.name}: ${r.geo.mismatches.map((m) => m.why ? `${m.id} ${m.why}` : `${m.id} dx ${m.dx} dcx ${m.dcx} dy ${m.dy} dh ${m.dh} (dw ${m.dw})`).join('; ')}`).join(' · '));
  if (CALIBRATE) {
    const byDesign = {};
    for (const r of results) if (r.diffPct !== null) { byDesign[r.design] = byDesign[r.design] || []; byDesign[r.design].push(r.diffPct); }
    for (const [d, v] of Object.entries(byDesign)) console.log(LOG, 'калибровка', d, 'min', Math.min(...v).toFixed(2), 'max', Math.max(...v).toFixed(2));
  }
  // лист худших пар «макет | приложение» — для координатора и владельца
  const worst = results.filter((r) => r.diffPct !== null).sort((x, y) => y.diffPct - x.diffPct).slice(0, 12);
  if (worst.length) {
    const W = 390, H = 844, G = 12;
    const tiles = [];
    for (let i = 0; i < worst.length; i += 1) {
      const r = worst[i];
      const ref = await sharp(path.join(REF, `${r.name}.png`)).resize({ width: W, height: H, fit: 'fill' }).png().toBuffer();
      const emu = await sharp(path.join(EMU, `${r.name}.png`)).resize({ width: W, height: H, fit: 'fill' }).png().toBuffer();
      tiles.push({ input: ref, left: (i % 3) * (2 * W + 3 * G), top: Math.floor(i / 3) * (H + G) }, { input: emu, left: (i % 3) * (2 * W + 3 * G) + W + G, top: Math.floor(i / 3) * (H + G) });
    }
    const rows = Math.ceil(worst.length / 3);
    await sharp({ create: { width: 3 * (2 * W + 3 * G), height: rows * (H + G), channels: 3, background: '#111' } }).composite(tiles).png().toFile(SHEET);
    console.log(LOG, 'худшие пары:', worst.map((r) => `${r.name} ${r.diffPct}%`).join(' · '), '→', SHEET);
  }
  if (THRESHOLD !== null && (mismatches > 0 || missing.length > 0 || geoMismatches > 0)) process.exit(1);
})().catch((e) => { console.error(LOG, 'FATAL', e); process.exit(1); });
