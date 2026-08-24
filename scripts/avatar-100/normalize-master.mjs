#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUTPUT_SIZE = 512;
const MAX_SUBJECT_WIDTH = 296;
const MAX_SUBJECT_HEIGHT = 374;
const HEX_VIEWBOX = [[50, 3.5], [93, 26], [93, 74], [50, 96.5], [7, 74], [7, 26]];
const SAFE_SCALE = 0.92;
const SAFE_HEX = HEX_VIEWBOX.map(([x, y]) => [
  OUTPUT_SIZE / 2 + (x * OUTPUT_SIZE / 100 - OUTPUT_SIZE / 2) * SAFE_SCALE,
  OUTPUT_SIZE / 2 + (y * OUTPUT_SIZE / 100 - OUTPUT_SIZE / 2) * SAFE_SCALE,
]);

function inPoly(poly, px, py) {
  let inside = false;
  for (let index = 0, previous = poly.length - 1; index < poly.length; previous = index, index += 1) {
    const [xi, yi] = poly[index];
    const [xj, yj] = poly[previous];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function fitsSafeHex(data) {
  for (let y = 0; y < OUTPUT_SIZE; y += 1) {
    for (let x = 0; x < OUTPUT_SIZE; x += 1) {
      if (data[(y * OUTPUT_SIZE + x) * 4 + 3] > 10 && !inPoly(SAFE_HEX, x + 0.5, y + 0.5)) return false;
    }
  }
  return true;
}

function isMagentaChroma(r, g, b) {
  return r >= 140 && b >= 140 && g + 50 < Math.min(r, b) && Math.abs(r - b) <= 70;
}

function isGeneratedBackground(r, g, b, alpha) {
  if (alpha <= 10) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightNeutralGrid = min >= 225 && max - min <= 14;
  return lightNeutralGrid || isMagentaChroma(r, g, b);
}

function removeBorderBackground(data, width, height) {
  const pixelCount = width * height;
  const background = new Uint8Array(pixelCount);
  const queued = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (queued[index]) return;
    queued[index] = 1;
    queue[tail] = index;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const offset = index * 4;
    if (!isGeneratedBackground(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) continue;
    background[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  const output = Buffer.from(data);
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    if (background[index] || isMagentaChroma(output[offset], output[offset + 1], output[offset + 2])) {
      output[offset + 3] = 0;
    }
  }
  return output;
}

function visibleBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 10) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error('Master contains no visible subject after background removal');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export async function normalizeMaster({ inputPath, outputPath }) {
  if (!fs.existsSync(inputPath)) throw new Error(`Master file does not exist: ${inputPath}`);
  const decoded = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cleaned = removeBorderBackground(decoded.data, decoded.info.width, decoded.info.height);
  const bounds = visibleBounds(cleaned, decoded.info.width, decoded.info.height);
  const scale = Math.min(MAX_SUBJECT_WIDTH / bounds.width, MAX_SUBJECT_HEIGHT / bounds.height, 1);
  const extracted = sharp(cleaned, {
    raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
  }).extract(bounds);

  let fitScale = scale;
  let normalized;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const width = Math.max(1, Math.round(bounds.width * fitScale));
    const height = Math.max(1, Math.round(bounds.height * fitScale));
    const subject = await extracted.clone()
      .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
    normalized = await sharp({
      create: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: subject, left: Math.round((OUTPUT_SIZE - width) / 2), top: Math.round((OUTPUT_SIZE - height) / 2) }])
      .raw()
      .toBuffer();
    if (fitsSafeHex(normalized)) break;
    normalized = undefined;
    fitScale *= 0.96;
  }
  if (!normalized) throw new Error('Could not fit master artwork inside the inset safe hex');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(normalized, { raw: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4 } })
    .png()
    .toFile(outputPath);
}

function parseArgs(args) {
  if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') {
    throw new Error('Usage: node scripts/avatar-100/normalize-master.mjs --input <image> --output <png>');
  }
  return { inputPath: path.resolve(args[1]), outputPath: path.resolve(args[3]) };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await normalizeMaster(options);
  process.stdout.write(`avatar-100 normalized master -> ${options.outputPath}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
