// Генератор иконок монет из черновиков output/currency-coins/coin-*.png.
// Явная команда обслуживания (не из тестов): node scripts/generate-coin-icons.mjs
// Шаги: стереть служебную метку «AI生成» в левом нижнем углу, trim по альфе,
// центрирование на квадратном холсте, resize 256, webp q70 с альфой.
// Вывод: assets/images/currency/coin_{1,2,3,5,10}.webp
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'output', 'currency-coins');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'currency');
const COINS = [1, 2, 3, 5, 10];
const SIZE = 1024;
// Метка «AI生成» — левый нижний угол (замерено на черновиках: x 0..130, y 900..1024).
const WM = { left: 0, top: 900, width: 140, height: SIZE - 900 };
const OUT_SIZE = 256;
const ALPHA_THRESHOLD = 20;

async function eraseWatermark(inputPath) {
  const { data, info } = await sharp(inputPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let erased = 0;
  for (let y = WM.top; y < Math.min(WM.top + WM.height, info.height); y++) {
    for (let x = WM.left; x < Math.min(WM.left + WM.width, info.width); x++) {
      const a = (y * info.width + x) * 4 + 3;
      if (data[a] > ALPHA_THRESHOLD) erased++;
      data[a] = 0;
    }
  }
  return { buffer: data, info, erased };
}

function alphaBbox(data, info) {
  let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const n of COINS) {
    const src = path.join(SRC_DIR, `coin-${n}.png`);
    const meta = await sharp(src).metadata();
    if (meta.width !== SIZE || meta.height !== SIZE) {
      console.warn(`coin-${n}: неожиданный размер ${meta.width}x${meta.height}, продолжаю`);
    }
    if (!meta.hasAlpha) {
      console.error(`coin-${n}: НЕТ альфа-канала (непрозрачный фон) — ПРОПУСК, нужен ручной разбор`);
      continue;
    }
    const { buffer, info, erased } = await eraseWatermark(src);
    const bbox = alphaBbox(buffer, info);
    if (!bbox) {
      console.error(`coin-${n}: после стирания метки контент не найден — ПРОПУСК`);
      continue;
    }
    const w = bbox.maxX - bbox.minX + 1;
    const h = bbox.maxY - bbox.minY + 1;
    // PNG-промежутка (обход капризов chained raw->extract), затем вписываем
    // монету в квадратный прозрачный холст 256x256 (центрирование по fit:contain).
    const trimmedPng = await sharp(buffer, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left: bbox.minX, top: bbox.minY, width: w, height: h })
      .png()
      .toBuffer();
    const out = path.join(OUT_DIR, `coin_${n}.webp`);
    await sharp(trimmedPng)
      .resize(OUT_SIZE, OUT_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 70, alphaQuality: 90, lossless: false })
      .toFile(out);
    const trimmed = await import('node:fs/promises').then((fs) => fs.readFile(out));
    // Верификация: альфа сохранена, фон не непрозрачно-чёрный.
    const outMeta = await sharp(out).metadata();
    const outStats = await sharp(out).stats();
    const alphaMean = outStats.channels[3] ? outStats.channels[3].mean : 255;
    console.log(
      `coin_${n}.webp: ${w}x${h} -> ${OUT_SIZE}px, метка стёрта (${erased} px), ` +
      `hasAlpha=${outMeta.hasAlpha}, alphaMean=${alphaMean.toFixed(1)}, bytes=${trimmed.length}`,
    );
    if (!outMeta.hasAlpha || alphaMean > 252) {
      console.error(`coin_${n}.webp: ПОДОЗРЕНИЕ на непрозрачный фон — проверить вручную!`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
