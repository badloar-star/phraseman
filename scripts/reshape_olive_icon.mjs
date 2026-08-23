// Приводит иконку темы «Олива» к общей форме набора — squircle с прозрачным
// фоном вместо чёрного квадрата на весь холст.
//
// зачем: восемь из девяти иконок тем — squircle-плашки на прозрачном фоне.
// «Олива» единственная была прямоугольником во весь холст с ЧЁРНЫМ фоном (и
// потому единственная весила 4.5 КБ вместо 20+). На плитке она читалась как
// чужая: у соседей мягкая скруглённая плашка, у неё — чёрный квадрат в упор.
// Решение владельца (2026-08-23): вырезать в squircle как у всех.
//
// Форма снята с эталонов набора (indigo/midnight/ember): это суперэллипс
// |x/a|^n + |y/b|^n = 1. Замер профиля их углов даёт n ≈ 4.2 — промеренная
// ширина строк на dy=0,2,5,10,20 совпадает с этой степенью в пределах пикселя.
//
// Запуск: node scripts/reshape_olive_icon.mjs [--apply] [--dir <path>]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirFlag = process.argv.indexOf('--dir');
const ICON_DIR = dirFlag !== -1 && process.argv[dirFlag + 1]
  ? path.resolve(process.argv[dirFlag + 1])
  : path.join(ROOT, 'assets', 'theme-icons');

const TARGET = 'olive.webp';

// Степень суперэллипса, снятая с эталонных иконок набора.
const SQUIRCLE_N = 4.2;

// Габарит плашки в пикселях холста 144x144. Медиана набора после
// выравнивания значков ≈ 102, берём её — «Олива» встанет в общий ряд.
const PLATE_SPAN = 102;

// Ширина мягкого края маски в пикселях: без неё край будет ступенчатым.
const EDGE_SOFTNESS = 1.4;

const main = async () => {
  const apply = process.argv.includes('--apply');
  const file = path.join(ICON_DIR, TARGET);
  const source = fs.readFileSync(file);

  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  // Габарит непрозрачного содержимого — чтобы вписать его в новую плашку.
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] >= 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  console.log(`содержимое: ${contentW}x${contentH} в (${minX},${minY})`);
  console.log(`целевая плашка: ${PLATE_SPAN}x${PLATE_SPAN} squircle n=${SQUIRCLE_N}`);

  if (!apply) {
    console.log('\n(отчёт; --apply чтобы записать)');
    return;
  }

  // Масштабируем содержимое под новую плашку и центрируем на холсте.
  const scale = PLATE_SPAN / Math.max(contentW, contentH);
  const newW = Math.round(contentW * scale);
  const newH = Math.round(contentH * scale);

  const cropped = await sharp(source)
    .extract({ left: minX, top: minY, width: contentW, height: contentH })
    .resize(newW, newH, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const left = Math.round((W - newW) / 2);
  const top = Math.round((H - newH) / 2);
  const canvas = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png().toBuffer();
  const placed = await sharp(canvas).composite([{ input: cropped, left, top }]).png().toBuffer();

  // Маска-суперэллипс вокруг центра холста.
  const a = PLATE_SPAN / 2;
  const mask = Buffer.alloc(W * H);
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const nx = Math.abs((x - cx) / a);
      const ny = Math.abs((y - cy) / a);
      // Радиус в метрике суперэллипса: 1.0 — ровно граница плашки.
      const r = (nx ** SQUIRCLE_N + ny ** SQUIRCLE_N) ** (1 / SQUIRCLE_N);
      // Мягкий край шириной EDGE_SOFTNESS пикселей, переведённой в эту метрику.
      const t = (1 - r) * a / EDGE_SOFTNESS + 0.5;
      mask[y * W + x] = Math.max(0, Math.min(255, Math.round(t * 255)));
    }
  }

  const { data: rgba } = await sharp(placed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(rgba);
  for (let i = 0; i < W * H; i += 1) {
    // Перемножаем существующую альфу с маской: содержимое за пределами
    // squircle обрезается, внутри остаётся как было.
    out[i * 4 + 3] = Math.round((out[i * 4 + 3] * mask[i]) / 255);
  }

  const encoded = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toBuffer();

  fs.writeFileSync(file, encoded);
  console.log(`записано: ${file} (${encoded.length} байт)`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
