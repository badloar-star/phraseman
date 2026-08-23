// зачем: цвета волос/одежды владелец получает НЕ генерацией (она плывёт), а
// детерминированным перекрасом принятого ассета: маска = отличие от эталона,
// тон меняется с сохранением светотени. Результат кладётся в inbox и проходит
// обычную приёмку check_render.mjs — никакого обхода сторожа.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const pipelineRoot = path.resolve(import.meta.dirname, '..');
const passport = JSON.parse(await readFile(path.join(pipelineRoot, 'frame_passport.v1.json'), 'utf8'));

const args = process.argv.slice(2);
const getOption = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : null; };
const file = args[0];
const basePath = getOption('--base');
const colorHex = getOption('--color');
const output = getOption('--out');
if (!file || !basePath || !colorHex || !output || !/^#?[0-9a-fA-F]{6}$/.test(colorHex)) {
  process.stdout.write(
    'Использование: node recolor.mjs <принятый-ассет.png> --base <эталон.png> --color #RRGGBB --out <inbox/новый.png>\n' +
    'Перекрашивает ТОЛЬКО пиксели, отличающиеся от эталона (сама деталь), сохраняя светотень.\n');
  process.exit(1);
}

const hex = colorHex.replace('#', '');
const target = { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
const targetLuma = Math.max(24, 0.2126 * target.r + 0.7152 * target.g + 0.0722 * target.b);
const backgroundHex = passport.background.replace('#', '');
const bg = { r: parseInt(backgroundHex.slice(0, 2), 16), g: parseInt(backgroundHex.slice(2, 4), 16), b: parseInt(backgroundHex.slice(4, 6), 16) };

async function loadRaw(sourcePath) {
  const { data, info } = await sharp(sourcePath).flatten({ background: bg }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}
const item = await loadRaw(file);
const base = await loadRaw(basePath);
if (item.info.width !== base.info.width || item.info.height !== base.info.height) {
  process.stdout.write('FAIL size_mismatch: ассет и эталон разного размера\n'); process.exit(1);
}

const out = Buffer.from(item.data);
let recolored = 0;
for (let at = 0; at < item.data.length; at += 3) {
  const delta = Math.hypot(item.data[at] - base.data[at], item.data[at + 1] - base.data[at + 1], item.data[at + 2] - base.data[at + 2]) / 4.4167;
  if (delta <= 8) continue; // пиксель эталона — не трогаем
  const strength = Math.min(1, (delta - 8) / 12); // мягкий край маски, без «дырок» жёстких порогов
  const luma = 0.2126 * item.data[at] + 0.7152 * item.data[at + 1] + 0.0722 * item.data[at + 2];
  const scale = luma / targetLuma;
  const tinted = [target.r * scale, target.g * scale, target.b * scale].map(value => Math.max(0, Math.min(255, Math.round(value))));
  out[at] = Math.round(item.data[at] * (1 - strength) + tinted[0] * strength);
  out[at + 1] = Math.round(item.data[at + 1] * (1 - strength) + tinted[1] * strength);
  out[at + 2] = Math.round(item.data[at + 2] * (1 - strength) + tinted[2] * strength);
  recolored += 1;
}
if (!recolored) { process.stdout.write('FAIL empty_mask: ассет не отличается от эталона — нечего перекрашивать\n'); process.exit(1); }
await sharp(out, { raw: { width: item.info.width, height: item.info.height, channels: 3 } }).png().toFile(output);
process.stdout.write(`OK: перекрашено ${(100 * recolored / (item.data.length / 3)).toFixed(1)}% пикселей → ${output}\n` +
  'Дальше обычная приёмка: check_render.mjs --slot <слот> --base <эталон>\n');
