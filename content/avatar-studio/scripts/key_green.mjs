// зачем: владелец получает от генератора ГОТОВЫЕ детали на зелёном (только
// деталь, без модели). Скрипт снимает зелёный хромакеем, проверяет что это
// именно деталь (не вся модель) и что она лежит в зоне своего слота, и
// регистрирует слой в каталоге. On-model черновик опционален (--onmodel) —
// с ним проверка позиции строже.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const pipelineRoot = path.resolve(import.meta.dirname, '..');
const passport = JSON.parse(await readFile(path.join(pipelineRoot, 'frame_passport.v1.json'), 'utf8'));
const CANON_W = passport.canvas.width, CANON_H = passport.canvas.height;

const args = process.argv.slice(2);
const getOption = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };
const file = args[0];
const slot = getOption('--slot') || 'hair';
const basePath = getOption('--base');
const onModelPath = getOption('--onmodel');
const acceptId = args.includes('--accept') ? getOption('--id') : null;
const acceptLabel = getOption('--label');
if (!file || !basePath || (args.includes('--accept') && !acceptId)) {
  process.stdout.write(
    'Использование: node key_green.mjs <деталь-на-зелёном.png> --slot <hair|headwear|outfit|accessory> --base <эталон>\n' +
    '  [--onmodel <черновик-на-персонаже.png>] [--accept --id <id> --label <подпись>]\n');
  process.exit(1);
}

async function loadRaw(sourcePath) {
  const { data } = await sharp(sourcePath).removeAlpha()
    .resize(CANON_W, CANON_H, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  return data;
}
const green = await loadRaw(file);
const base = await loadRaw(basePath);

// Хромакей: зелёный → прозрачность, деспилл на полукраях.
const rgba = Buffer.alloc(CANON_W * CANON_H * 4);
let solid = 0, sumX = 0, sumY = 0;
for (let at = 0; at < CANON_W * CANON_H; at += 1) {
  const r = green[at * 3], g = green[at * 3 + 1], b = green[at * 3 + 2];
  const greenness = g - Math.max(r, b);
  let alpha;
  if (greenness > 90) alpha = 0;
  else if (greenness < 20) alpha = 255;
  else alpha = Math.round(255 * (1 - (greenness - 20) / 70));
  rgba[at * 4] = r;
  rgba[at * 4 + 1] = alpha === 255 ? g : Math.min(g, Math.max(r, b));
  rgba[at * 4 + 2] = b;
  rgba[at * 4 + 3] = alpha;
  if (alpha > 200) { solid += 1; sumX += at % CANON_W; sumY += Math.floor(at / CANON_W); }
}
if (solid < CANON_W * CANON_H * 0.005) { process.stdout.write('FAIL empty_layer: после снятия зелёного ничего не осталось\n'); process.exit(1); }

// Главная ошибка генератора: на зелёном ВСЯ модель, а не деталь. Детектор —
// слой непрозрачно накрывает ядро лица эталона.
const [fcx, fcy, frx, fry] = passport.faceCore;
let facePixels = 0, faceCovered = 0;
for (let y = Math.ceil((fcy - fry) * CANON_H); y <= (fcy + fry) * CANON_H; y += 1)
  for (let x = Math.ceil((fcx - frx) * CANON_W); x <= (fcx + frx) * CANON_W; x += 1) {
    const nx = (x / CANON_W - fcx) / frx, ny = (y / CANON_H - fcy) / fry;
    if (nx * nx + ny * ny > 1) continue;
    facePixels += 1;
    if (rgba[(y * CANON_W + x) * 4 + 3] > 200) faceCovered += 1;
  }
if (slot !== 'skin' && slot !== 'eyes' && slot !== 'emotion' && faceCovered / Math.max(1, facePixels) > 0.6) {
  process.stdout.write('FAIL layer_contains_character: на зелёном вся модель, а не деталь — нужен ТОЛЬКО сам ассет (лицо не должно входить в слой)\n');
  process.exit(1);
}

// Зона слота: центр масс слоя обязан лежать в осмысленной части кадра.
const centerY = sumY / solid / CANON_H;
if ((slot === 'hair' || slot === 'headwear') && centerY > 0.55) {
  process.stdout.write(`FAIL layer_misplaced: причёска/убор лежит слишком низко (центр на ${(centerY * 100).toFixed(0)}% высоты)\n`); process.exit(1);
}
if (slot === 'outfit' && centerY < 0.4) {
  process.stdout.write(`FAIL layer_misplaced: одежда лежит слишком высоко (центр на ${(centerY * 100).toFixed(0)}% высоты)\n`); process.exit(1);
}

// Со строгим черновиком (--onmodel): слой обязан совпадать с реальной разницей.
if (onModelPath) {
  const onModel = await loadRaw(onModelPath);
  const diffMask = Buffer.alloc(CANON_W * CANON_H);
  for (let at = 0; at < CANON_W * CANON_H; at += 1) {
    const delta = Math.hypot(onModel[at * 3] - base[at * 3], onModel[at * 3 + 1] - base[at * 3 + 1], onModel[at * 3 + 2] - base[at * 3 + 2]) / 4.4167;
    diffMask[at] = delta > 10 ? 255 : 0;
  }
  const { data: wide } = await sharp(diffMask, { raw: { width: CANON_W, height: CANON_H, channels: 1 } })
    .blur(3).raw().toBuffer({ resolveWithObject: true });
  const channels = wide.length / (CANON_W * CANON_H);
  let inside = 0;
  for (let at = 0; at < CANON_W * CANON_H; at += 1)
    if (rgba[at * 4 + 3] > 200 && wide[at * channels] > 24) inside += 1;
  if (inside / solid < 0.85) {
    process.stdout.write(`FAIL layer_misplaced: только ${(100 * inside / solid).toFixed(0)}% слоя совпадает с деталью на черновике\n`); process.exit(1);
  }
}

process.stdout.write(`PASS: деталь чистая (${(100 * solid / (CANON_W * CANON_H)).toFixed(1)}% кадра)\n`);

if (acceptId) {
  const destinationDirectory = path.join(pipelineRoot, 'layers-src', slot);
  await mkdir(destinationDirectory, { recursive: true });
  const destination = path.join(destinationDirectory, `${acceptId}.png`);
  await sharp(rgba, { raw: { width: CANON_W, height: CANON_H, channels: 4 } }).png().toFile(destination);
  const bytes = await readFile(destination);
  const manifestPath = path.join(pipelineRoot, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const items = manifest.items.filter(item => !(item.id === acceptId && item.slot === slot));
  items.push({
    id: acceptId, slot, file: `layers-src/${slot}/${acceptId}.png`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    base: path.basename(basePath), label: acceptLabel || null, layerOnly: true,
    acceptedAt: new Date().toISOString(),
  });
  await writeFile(manifestPath, JSON.stringify({ ...manifest, items }, null, 2) + '\n');
  process.stdout.write(`Принят слой: layers-src/${slot}/${acceptId}.png — запусти publish_catalog.mjs\n`);
}
