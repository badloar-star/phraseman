#!/usr/bin/env node
// зачем (координатор 15.10): временная иконка плитки «Шпиль» — квадратная вырезка по башне с флагом из УЖЕ имеющегося арта intro_arena (новый арт не рисуем).
// Башня ~80 % кадра, прозрачный фон сохраняется, 1024×1024, ≤ 400 КБ, dark и light. Когда Codex сдаст выбранный стиль, его spire_tile.webp заменят эти файлы.
// Запуск: node scripts/crop_spire_tile.mjs  → затем node scripts/gen_themed_art_assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 1024;
const FILL = 0.8; // доля кадра, занятая башней
const ALPHA_EDGE = 24;
const MAX_BYTES = 400 * 1024;

async function crop(brightness) {
  const src = path.join(root, 'assets', 'images', 'v2art', brightness, 'intro_arena.webp');
  const out = path.join(root, 'assets', 'images', 'v2art', brightness, 'spire_tile.webp');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] > ALPHA_EDGE) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) throw new Error(`[SPIRE-TILE] ${brightness}: в ${src} нет непрозрачных пикселей`);
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const side = Math.ceil(Math.max(bw, bh) / FILL);
  const cx = minX + bw / 2, cy = minY + bh / 2;
  const left = Math.round(cx - side / 2), top = Math.round(cy - side / 2);
  // Квадрат может выходить за кадр исходника — поля добавляем прозрачными.
  const padL = Math.max(0, -left), padT = Math.max(0, -top);
  const padR = Math.max(0, left + side - width), padB = Math.max(0, top + side - height);
  // зачем: sharp выполняет extract РАНЬШЕ extend в одном конвейере — поэтому два шага через буфер
  const extended = await sharp(src).ensureAlpha().extend({ left: padL, top: padT, right: padR, bottom: padB, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const squared = await sharp(extended).extract({ left: left + padL, top: top + padT, width: side, height: side }).resize(SIZE, SIZE, { kernel: 'lanczos3' }).toBuffer();
  let written = null;
  for (const quality of [90, 82, 74, 66, 58, 50]) {
    const buf = await sharp(squared).webp({ quality, alphaQuality: 100, effort: 5 }).toBuffer();
    written = { quality, buf };
    if (buf.length <= MAX_BYTES) break;
  }
  fs.writeFileSync(out, written.buf);
  console.log(`[SPIRE-TILE] ${brightness}: bbox ${bw}x${bh} из ${width}x${height} → квадрат ${side}→${SIZE}, quality ${written.quality}, ${Math.round(written.buf.length / 1024)} КБ → ${path.relative(root, out)}`);
  if (written.buf.length > MAX_BYTES) { console.error(`[SPIRE-TILE] ${brightness}: больше лимита ${MAX_BYTES / 1024} КБ`); process.exitCode = 1; }
}

for (const brightness of ['dark', 'light']) await crop(brightness);
