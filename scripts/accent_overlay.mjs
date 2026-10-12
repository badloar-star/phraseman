#!/usr/bin/env node
// зачем (координатор 12.10): слой .accent красится tintColor и обязан ПИКСЕЛЬНО совпадать с деталью основы. Глазами это видно только наложением:
// скрипт кладёт основу на фон темы и поверх — слой .accent, окрашенный заданным цветом. Результат — склейка «основа | основа + тинт».
//   node scripts/accent_overlay.mjs <папка с <имя>.webp и <имя>.accent.webp> <имя>[,<имя>] <папка вывода> [--tint #RRGGBB] [--bg #RRGGBB]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [dir, namesArg, outDir] = process.argv.slice(2);
const opt = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
if (!dir || !namesArg || !outDir) { console.error('Использование: node scripts/accent_overlay.mjs <папка> <имя[,имя]> <папка вывода> [--tint #hex] [--bg #hex]'); process.exit(2); }
const tint = opt('--tint', '#FF4D8D');
const bg = opt('--bg', '#2A2A33');
const SIZE = 512;
fs.mkdirSync(outDir, { recursive: true });

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Основа на фоне темы. */
async function baseOnBg(file) {
  const base = await sharp(file).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const [r, g, b] = hex(bg);
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r, g, b, alpha: 1 } } }).composite([{ input: base }]).png().toBuffer();
}

/** Слой .accent как заливка tint с альфой слоя (так делает tintColor). */
async function tintedAccent(file) {
  const { data, info } = await sharp(file).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = hex(tint);
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i += 1) { out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = data[i * 4 + 3]; }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

for (const name of namesArg.split(',')) {
  const baseFile = path.join(dir, `${name}.webp`);
  const accentFile = path.join(dir, `${name}.accent.webp`);
  if (!fs.existsSync(baseFile) || !fs.existsSync(accentFile)) { console.warn(`[ACCENT-OVERLAY] пропуск ${name}: нет пары файлов в ${dir}`); continue; }
  const plain = await baseOnBg(baseFile);
  const overlay = await tintedAccent(accentFile);
  const merged = await sharp(plain).composite([{ input: overlay }]).png().toBuffer();
  const sheet = await sharp({ create: { width: SIZE * 2, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite([{ input: plain, left: 0, top: 0 }, { input: merged, left: SIZE, top: 0 }]).png().toBuffer();
  const target = path.join(outDir, `${name}.overlay.png`);
  fs.writeFileSync(target, sheet);
  console.log(`[ACCENT-OVERLAY] ${target}`);
}
