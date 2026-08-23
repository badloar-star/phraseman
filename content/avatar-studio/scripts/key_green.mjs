// зачем: владелец выбрал путь «деталь на зелёном фоне» (шаг 2 после генерации
// на персонаже). Хромакей — точное вырезание без эвристик; сторож сверяет,
// что зелёный слой лежит ТАМ ЖЕ, где деталь на персонаже (иначе «наклейка»).
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const pipelineRoot = path.resolve(import.meta.dirname, '..');

const args = process.argv.slice(2);
const getOption = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };
const file = args[0];
const onModelPath = getOption('--onmodel');
const basePath = getOption('--base');
const acceptId = args.includes('--accept') ? getOption('--id') : null;
if (!file || !onModelPath || !basePath) {
  process.stdout.write(
    'Использование: node key_green.mjs <зелёный-слой.png> --onmodel <деталь-на-персонаже.png> --base <эталон.png> [--accept --id <id>]\n');
  process.exit(1);
}

const passport = JSON.parse(await readFile(path.join(pipelineRoot, 'frame_passport.v1.json'), 'utf8'));
async function loadRaw(sourcePath) {
  // Нормализуем к канону паспорта: генерации приходят чуть разных размеров.
  const { data, info } = await sharp(sourcePath).removeAlpha()
    .resize(passport.canvas.width, passport.canvas.height, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}
const green = await loadRaw(file);
const onModel = await loadRaw(onModelPath);
const base = await loadRaw(basePath);
const { width, height } = green.info;
if (width !== onModel.info.width || height !== onModel.info.height) {
  process.stdout.write('FAIL size_mismatch: зелёный слой и деталь на персонаже разного размера\n'); process.exit(1);
}

// Хромакей: зелёный → прозрачность; полукрай — по доле зелени; деспилл убирает
// зелёную кайму на волосах.
const rgba = Buffer.alloc(width * height * 4);
let solid = 0;
for (let at = 0; at < width * height; at += 1) {
  const r = green.data[at * 3], g = green.data[at * 3 + 1], b = green.data[at * 3 + 2];
  const greenness = g - Math.max(r, b);
  let alpha;
  if (greenness > 90) alpha = 0;
  else if (greenness < 20) alpha = 255;
  else alpha = Math.round(255 * (1 - (greenness - 20) / 70));
  rgba[at * 4] = r;
  rgba[at * 4 + 1] = alpha === 255 ? g : Math.min(g, Math.max(r, b)); // деспилл на краях
  rgba[at * 4 + 2] = b;
  rgba[at * 4 + 3] = alpha;
  if (alpha > 200) solid += 1;
}
if (!solid) { process.stdout.write('FAIL empty_layer: после снятия зелёного ничего не осталось\n'); process.exit(1); }

// Сверка позиции: непрозрачные пиксели слоя обязаны лежать там, где деталь
// реально отличает «на персонаже» от эталона (допуск 3px через размытие).
const diffMask = Buffer.alloc(width * height);
for (let at = 0; at < width * height; at += 1) {
  const delta = Math.hypot(
    onModel.data[at * 3] - base.data[at * 3],
    onModel.data[at * 3 + 1] - base.data[at * 3 + 1],
    onModel.data[at * 3 + 2] - base.data[at * 3 + 2],
  ) / 4.4167;
  diffMask[at] = delta > 10 ? 255 : 0;
}
const { data: diffWide } = await sharp(diffMask, { raw: { width, height, channels: 1 } })
  .blur(3).raw().toBuffer({ resolveWithObject: true });
const diffChannels = diffWide.length / (width * height);
let inside = 0;
for (let at = 0; at < width * height; at += 1)
  if (rgba[at * 4 + 3] > 200 && diffWide[at * diffChannels] > 24) inside += 1;
const insideFraction = inside / solid;
if (insideFraction < 0.85) {
  process.stdout.write(`FAIL layer_misplaced: только ${(insideFraction * 100).toFixed(0)}% слоя совпадает с деталью на персонаже — слой сместился или содержит лишнее\n`);
  process.exit(1);
}
process.stdout.write(`PASS: слой на месте (${(insideFraction * 100).toFixed(0)}% совпадения)\n`);

if (acceptId) {
  const slot = 'hair'; // v1: слои-вырезки пока только для причёсок/уборов
  const destinationDirectory = path.join(pipelineRoot, 'layers-src', slot);
  await mkdir(destinationDirectory, { recursive: true });
  const destination = path.join(destinationDirectory, `${acceptId}.png`);
  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(destination);
  process.stdout.write(`Слой сохранён: layers-src/${slot}/${acceptId}.png — запусти publish_catalog.mjs\n`);
}
