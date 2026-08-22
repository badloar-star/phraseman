// зачем: владельцу нужно, чтобы ЛЮБОЙ ИИ-генератор давал детали аватара,
// которые точно встают в кастомизатор. Этот сторож — машинная приёмка:
// размер/фон/поля/совмещение с эталоном проверяются до пикселя, кривой ассет
// в каталог физически не попадает (та же философия, что GLB-аудитор 3D-трека).
import path from 'node:path';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const pipelineRoot = path.resolve(import.meta.dirname, '..');
const passport = JSON.parse(await readFile(path.join(pipelineRoot, 'frame_passport.v1.json'), 'utf8'));

const args = process.argv.slice(2);
const getOption = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };
const file = args[0];
const slot = getOption('--slot');
const basePath = getOption('--base');
const acceptId = args.includes('--accept') ? getOption('--id') : null;
if (!file || !slot || (args.includes('--accept') && !acceptId)) {
  process.stdout.write(
    'Использование: node check_render.mjs <картинка.png> --slot <base|hair|headwear|outfit|accessory|eyes|skin|emotion>\n' +
    '  [--base <эталон base_m.png|base_f.png>] [--accept --id <slot_название_база>]\n');
  process.exit(1);
}
if (!passport.slots[slot]) { process.stdout.write(`FAIL unknown_slot: слота «${slot}» нет в паспорте\n`); process.exit(1); }
if (slot !== 'base' && !basePath) { process.stdout.write('FAIL base_required: для всех слотов кроме base обязателен --base <эталон>\n'); process.exit(1); }

// Анализ на сетке 256×320 (то же 4:5) — быстро и без нагрузки на машину.
const AW = 256, AH = 320;
// Пороги приёмки. Реальные edit-генераторы дают в «неизменных» местах шум ~2–8;
// устойчивое пятно с дельтой >10 на ≥4% запретной зоны — настоящая порча.
// Калибровать можно ТОЛЬКО по первым реальным ассетам решением владельца.
const LOCKED_MEAN = 6, LOCKED_HOT_DELTA = 10, LOCKED_HOT_FRAC = 0.04;
const hex = passport.background.replace('#', '');
const bg = { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
const distance = (data, at, r, g, b) => Math.hypot(data[at] - r, data[at + 1] - g, data[at + 2] - b) / 4.4167;

async function loadImage(sourcePath) {
  const image = sharp(sourcePath);
  const meta = await image.metadata();
  const { data } = await image.flatten({ background: bg }).resize(AW, AH, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { meta, data };
}
function silhouetteBox(data) {
  let x0 = AW, y0 = AH, x1 = -1, y1 = -1, count = 0;
  for (let y = 0; y < AH; y += 1) for (let x = 0; x < AW; x += 1) {
    if (distance(data, (y * AW + x) * 3, bg.r, bg.g, bg.b) > 12) {
      count += 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1, count };
}
function lockedMask(shapes) {
  const mask = new Uint8Array(AW * AH);
  for (const shape of shapes) {
    if (shape.rect) { const [fx, fy, fw, fh] = shape.rect;
      for (let y = Math.floor(fy * AH); y < Math.min(AH, Math.ceil((fy + fh) * AH)); y += 1)
        for (let x = Math.floor(fx * AW); x < Math.min(AW, Math.ceil((fx + fw) * AW)); x += 1) mask[y * AW + x] = 1;
    }
    if (shape.ellipse) { const [cx, cy, rx, ry] = shape.ellipse;
      for (let y = 0; y < AH; y += 1) for (let x = 0; x < AW; x += 1) {
        const nx = (x / AW - cx) / rx, ny = (y / AH - cy) / ry;
        if (nx * nx + ny * ny <= 1) mask[y * AW + x] = 1;
      }
    }
  }
  return mask;
}

const errors = [];
const notes = [];
const candidate = await loadImage(file);
const ratio = candidate.meta.width / candidate.meta.height;
if (Math.abs(ratio - passport.canvas.width / passport.canvas.height) > 0.015)
  errors.push(`wrong_canvas_ratio: ${candidate.meta.width}x${candidate.meta.height} вместо 4:5 — попроси генератор дать ровно 1024x1280`);
else if (candidate.meta.width < 768) errors.push(`too_small: ширина ${candidate.meta.width}px, нужно ≥1024`);
else if (candidate.meta.width !== passport.canvas.width || candidate.meta.height !== passport.canvas.height)
  notes.push(`размер ${candidate.meta.width}x${candidate.meta.height} (не канонические 1024x1280) — пропорции верные, допустимо`);

if (!errors.length) {
  const block = Math.round(AW * 0.08);
  for (const [cornerX, cornerY, label] of [[0, 0, 'верх-лево'], [AW - block, 0, 'верх-право'], [0, AH - block, 'низ-лево'], [AW - block, AH - block, 'низ-право']]) {
    let sum = 0;
    for (let y = cornerY; y < cornerY + block; y += 1) for (let x = cornerX; x < cornerX + block; x += 1)
      sum += distance(candidate.data, (y * AW + x) * 3, bg.r, bg.g, bg.b);
    if (sum / (block * block) > 8) errors.push(`background_mismatch: угол «${label}» не фон #F7EFE4 — фон обязан быть ровным`);
  }
  const box = silhouetteBox(candidate.data);
  if (!box.count) errors.push('empty_image: персонаж не найден');
  else {
    if (box.y0 < passport.safeMargins.top * AH) errors.push('breaks_top_margin: персонаж упирается в верхний край (нужно 4% поля)');
    if (box.x0 < passport.safeMargins.sides * AW) errors.push('breaks_left_margin: вылезает за левое поле 5%');
    if (box.x1 > AW - passport.safeMargins.sides * AW) errors.push('breaks_right_margin: вылезает за правое поле 5%');
    const centerX = (box.x0 + box.x1) / 2 / AW;
    if (Math.abs(centerX - 0.5) > 0.06) errors.push(`character_off_center: центр силуэта на ${(centerX * 100).toFixed(0)}% ширины вместо 50%`);
    if ((box.y1 - box.y0) / AH < 0.5) errors.push('character_too_small: силуэт меньше половины высоты кадра');

    if (basePath) {
      const base = await loadImage(basePath);
      const baseBox = silhouetteBox(base.data);
      if (Math.abs(centerX - (baseBox.x0 + baseBox.x1) / 2 / AW) > 0.03 || Math.abs(box.y0 / AH - baseBox.y0 / AH) > 0.03)
        errors.push('pose_shifted: персонаж сместился относительно эталона — поза/кадрирование обязаны совпадать');
      const heightRatio = (box.y1 - box.y0) / Math.max(1, baseBox.y1 - baseBox.y0);
      if (heightRatio < 0.93 || heightRatio > 1.07) errors.push(`scale_drifted: масштаб ${heightRatio.toFixed(2)} от эталона (допуск 0.93–1.07)`);
      const mask = lockedMask(passport.slots[slot].locked);
      let lockedSum = 0, lockedCount = 0, lockedHot = 0, changedTotal = 0;
      for (let at = 0; at < AW * AH; at += 1) {
        const delta = distance(candidate.data, at * 3, base.data[at * 3], base.data[at * 3 + 1], base.data[at * 3 + 2]);
        if (delta > 10) changedTotal += 1; // зачем: смена только цвета (напр. волос) даёт малую дельту — порог «изменение есть» мягче среднего по зоне
        if (mask[at]) { lockedCount += 1; lockedSum += delta; if (delta > LOCKED_HOT_DELTA) lockedHot += 1; }
      }
      if (lockedCount && (lockedSum / lockedCount > LOCKED_MEAN || lockedHot / lockedCount > LOCKED_HOT_FRAC))
        errors.push(`locked_zone_changed: изменилась запретная зона (лицо/одежда/волосы вне слота «${slot}») — среднее ${(lockedSum / Math.max(1, lockedCount)).toFixed(1)}`);
      if (changedTotal / (AW * AH) < 0.004) errors.push('no_visible_change: картинка не отличается от эталона — деталь не добавилась');
    }
  }
}

if (errors.length) {
  process.stdout.write('FAIL\n' + errors.map(line => '  • ' + line).join('\n') + '\n');
  process.stdout.write('Фразы-исправления — в конце соответствующего файла prompts/*.md\n');
  process.exit(1);
}
process.stdout.write('PASS' + (notes.length ? ' (' + notes.join('; ') + ')' : '') + '\n');

if (acceptId) {
  const bytes = await readFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const destinationDirectory = path.join(pipelineRoot, 'catalog', slot);
  await mkdir(destinationDirectory, { recursive: true });
  const destination = path.join(destinationDirectory, `${acceptId}.png`);
  await copyFile(file, destination);
  const manifestPath = path.join(pipelineRoot, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const items = manifest.items.filter(item => !(item.id === acceptId && item.slot === slot));
  items.push({ id: acceptId, slot, file: `catalog/${slot}/${acceptId}.png`, sha256, base: basePath ? path.basename(basePath) : null, acceptedAt: new Date().toISOString() });
  await writeFile(manifestPath, JSON.stringify({ ...manifest, items }, null, 2) + '\n');
  process.stdout.write(`Принят в каталог: catalog/${slot}/${acceptId}.png (sha256 ${sha256.slice(0, 12)}…)\n`);
}
