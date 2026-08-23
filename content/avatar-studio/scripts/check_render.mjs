// зачем: владельцу нужно, чтобы ЛЮБОЙ ИИ-генератор давал детали аватара,
// которые точно встают в кастомизатор. Сторож — машинная приёмка (паспорт v2,
// зелёный хромакей): размер/зелёный фон/поля/совмещение лица с эталоном
// проверяются до пикселя, кривой ассет в каталог физически не попадает.
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
const acceptLabel = getOption('--label');
if (!file || !slot || (args.includes('--accept') && !acceptId)) {
  process.stdout.write(
    'Использование: node check_render.mjs <картинка.png> --slot <base|hair|headwear|outfit|accessory|eyes|skin|emotion>\n' +
    '  [--base <эталон base_m.png|base_f.png>] [--accept --id <slot_название_база>] [--label <подпись>]\n');
  process.exit(1);
}
if (!passport.slots[slot]) { process.stdout.write(`FAIL unknown_slot: слота «${slot}» нет в паспорте\n`); process.exit(1); }
if (slot !== 'base' && !basePath) { process.stdout.write('FAIL base_required: для всех слотов кроме base обязателен --base <эталон>\n'); process.exit(1); }

// Анализ на сетке с пропорцией паспорта — быстро и без нагрузки на машину.
const canvasRatio = passport.canvas.width / passport.canvas.height;
const AH = 240, AW = Math.round(AH * canvasRatio);
const MIN_GREENNESS = passport.chroma?.minGreenness ?? 40;
// Пороги приёмки. Реальные edit-генераторы дают в «неизменных» местах шум ~2–8.
// Калибровать можно ТОЛЬКО по реальным ассетам решением владельца.
const LOCKED_MEAN = 6, LOCKED_HOT_DELTA = 10, LOCKED_HOT_FRAC = 0.04;

const distance = (data, at, r, g, b) => Math.hypot(data[at] - r, data[at + 1] - g, data[at + 2] - b) / 4.4167;
const greennessAt = (data, at) => data[at + 1] - Math.max(data[at], data[at + 2]);
const isForeground = (data, at) => greennessAt(data, at) < 25; // не-зелёное = персонаж

async function loadImage(sourcePath) {
  const image = sharp(sourcePath);
  const meta = await image.metadata();
  const { data } = await image.removeAlpha().resize(AW, AH, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  return { meta, data };
}
function silhouetteBox(data) {
  let x0 = AW, y0 = AH, x1 = -1, y1 = -1, count = 0;
  for (let y = 0; y < AH; y += 1) for (let x = 0; x < AW; x += 1) {
    if (isForeground(data, (y * AW + x) * 3)) {
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
if (Math.abs(ratio - canvasRatio) > 0.03)
  errors.push(`wrong_canvas_ratio: ${candidate.meta.width}x${candidate.meta.height} — попроси генератор дать тот же кадр, что у эталона (${passport.canvas.width}x${passport.canvas.height})`);
else if (candidate.meta.width < 900) errors.push(`too_small: ширина ${candidate.meta.width}px, нужно ≥1024`);
else if (candidate.meta.width !== passport.canvas.width || candidate.meta.height !== passport.canvas.height)
  notes.push(`размер ${candidate.meta.width}x${candidate.meta.height} (канон ${passport.canvas.width}x${passport.canvas.height}) — пропорции верные, допустимо`);

if (!errors.length) {
  const block = Math.round(AW * 0.08);
  // Верхние углы обязаны быть зелёным хромакеем (низ может занимать персонаж).
  for (const [cornerX, label] of [[0, 'верх-лево'], [AW - block, 'верх-право']]) {
    let sum = 0;
    for (let y = 0; y < block; y += 1) for (let x = cornerX; x < cornerX + block; x += 1)
      sum += greennessAt(candidate.data, (y * AW + x) * 3);
    if (sum / (block * block) < MIN_GREENNESS) errors.push(`background_mismatch: угол «${label}» не зелёный хромакей — фон обязан быть чистым зелёным`);
  }
  const box = silhouetteBox(candidate.data);
  if (!box.count) errors.push('empty_image: персонаж не найден');
  else {
    if (box.y0 < passport.safeMargins.top * AH) errors.push('breaks_top_margin: персонаж упирается в верхний край (нужно 3% поля)');
    // Боковые поля — только для зоны головы: ниже bustCrop-линии плечи по
    // замыслу уходят за края кадра.
    const sideZone = Math.round((passport.bustCrop?.sideMarginAppliesAboveFrac ?? 1) * AH);
    let upperX0 = AW, upperX1 = -1;
    for (let y = 0; y < sideZone; y += 1) for (let x = 0; x < AW; x += 1)
      if (isForeground(candidate.data, (y * AW + x) * 3)) { if (x < upperX0) upperX0 = x; if (x > upperX1) upperX1 = x; }
    if (upperX1 >= 0) {
      if (upperX0 < passport.safeMargins.sides * AW) errors.push('breaks_left_margin: голова вылезает за левое поле');
      if (upperX1 > AW - passport.safeMargins.sides * AW) errors.push('breaks_right_margin: голова вылезает за правое поле');
    }
    const centerX = (box.x0 + box.x1) / 2 / AW;
    if (Math.abs(centerX - 0.5) > 0.06) errors.push(`character_off_center: центр силуэта на ${(centerX * 100).toFixed(0)}% ширины вместо 50%`);
    if ((box.y1 - box.y0) / AH < 0.6) errors.push('character_too_small: силуэт меньше 60% высоты кадра');

    if (basePath) {
      const base = await loadImage(basePath);
      const baseBox = silhouetteBox(base.data);
      // зачем: у причёсок/уборов силуэт МЕНЯЕТСЯ самой деталью, поэтому позу
      // для них якорим по ядру лица (поиск наилучшего совмещения с эталоном).
      const hairLike = slot === 'hair' || slot === 'headwear';
      if (!hairLike) {
        if (Math.abs(centerX - (baseBox.x0 + baseBox.x1) / 2 / AW) > 0.03 || Math.abs(box.y0 / AH - baseBox.y0 / AH) > 0.03)
          errors.push('pose_shifted: персонаж сместился относительно эталона — поза/кадрирование обязаны совпадать');
        const heightRatio = (box.y1 - box.y0) / Math.max(1, baseBox.y1 - baseBox.y0);
        if (heightRatio < 0.93 || heightRatio > 1.07) errors.push(`scale_drifted: масштаб ${heightRatio.toFixed(2)} от эталона (допуск 0.93–1.07)`);
      }
      let changedTotal = 0;
      for (let at = 0; at < AW * AH; at += 1)
        if (distance(candidate.data, at * 3, base.data[at * 3], base.data[at * 3 + 1], base.data[at * 3 + 2]) > 10) changedTotal += 1;
      if (changedTotal / (AW * AH) < 0.004) errors.push('no_visible_change: картинка не отличается от эталона — деталь не добавилась');

      if (hairLike) {
        const [fcx, fcy, frx, fry] = passport.faceCore;
        const cx = fcx * AW, cy = fcy * AH, rx = frx * AW, ry = fry * AH;
        const points = [];
        for (let y = Math.ceil(cy - ry); y <= cy + ry; y += 1) for (let x = Math.ceil(cx - rx); x <= cx + rx; x += 1) {
          const nx = (x - cx) / rx, ny = (y - cy) / ry;
          if (nx * nx + ny * ny <= 1) points.push((y * AW + x) * 3);
        }
        let best = { mean: Infinity, dx: 0, dy: 0, hot: 0 };
        for (let dy = -6; dy <= 6; dy += 1) for (let dx = -6; dx <= 6; dx += 1) {
          let sum = 0, hot = 0;
          for (const at of points) {
            const shifted = at + (dy * AW + dx) * 3;
            const delta = distance(candidate.data, at, base.data[shifted], base.data[shifted + 1], base.data[shifted + 2]);
            sum += delta; if (delta > 12) hot += 1;
          }
          const mean = sum / points.length;
          if (mean < best.mean) best = { mean, dx, dy, hot: hot / points.length };
        }
        if (Math.abs(best.dx) > 3 || Math.abs(best.dy) > 3)
          errors.push(`pose_shifted: лицо съехало на ${(Math.hypot(best.dx, best.dy) / AW * 100).toFixed(1)}% кадра относительно эталона`);
        else if (best.mean > 8 || best.hot > 0.10)
          errors.push(`locked_zone_changed: лицо не совпадает с эталоном (среднее ${best.mean.toFixed(1)}) — персонаж перерисован`);
      } else {
        const mask = lockedMask(passport.slots[slot].locked);
        let lockedSum = 0, lockedCount = 0, lockedHot = 0;
        for (let at = 0; at < AW * AH; at += 1) {
          if (!mask[at]) continue;
          const delta = distance(candidate.data, at * 3, base.data[at * 3], base.data[at * 3 + 1], base.data[at * 3 + 2]);
          lockedCount += 1; lockedSum += delta; if (delta > LOCKED_HOT_DELTA) lockedHot += 1;
        }
        if (lockedCount && (lockedSum / lockedCount > LOCKED_MEAN || lockedHot / lockedCount > LOCKED_HOT_FRAC))
          errors.push(`locked_zone_changed: изменилась запретная зона (вне слота «${slot}») — среднее ${(lockedSum / Math.max(1, lockedCount)).toFixed(1)}`);
      }
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
  items.push({ id: acceptId, slot, file: `catalog/${slot}/${acceptId}.png`, sha256, base: basePath ? path.basename(basePath) : null, label: acceptLabel || null, acceptedAt: new Date().toISOString() });
  await writeFile(manifestPath, JSON.stringify({ ...manifest, items }, null, 2) + '\n');
  process.stdout.write(`Принят в каталог: catalog/${slot}/${acceptId}.png (sha256 ${sha256.slice(0, 12)}…)\n`);
}
