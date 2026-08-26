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
const BACKGROUND_MODES = new Set(['saturated-matte', 'legacy-neutral']);
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

function colorSaturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function sampleSaturatedBorderMatte(data, width, height) {
  const samples = [];
  const add = (x, y) => {
    const offset = (y * width + x) * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const alpha = data[offset + 3];
    if (alpha > 10 && colorSaturation(r, g, b) >= 0.5) samples.push({ r, g, b });
  };
  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    if (height > 1) add(x, height - 1);
  }
  for (let y = 1; y + 1 < height; y += 1) {
    add(0, y);
    if (width > 1) add(width - 1, y);
  }
  if (samples.length === 0) return null;
  return {
    r: median(samples.map(({ r }) => r)),
    g: median(samples.map(({ g }) => g)),
    b: median(samples.map(({ b }) => b)),
  };
}

function matchesSaturatedMatte(r, g, b, matte) {
  if (!matte || colorSaturation(r, g, b) < 0.08) return false;
  const distance = Math.max(
    Math.abs(r - matte.r),
    Math.abs(g - matte.g),
    Math.abs(b - matte.b),
  );
  if (distance > 170) return false;
  const mean = (r + g + b) / 3;
  const matteMean = (matte.r + matte.g + matte.b) / 3;
  const vector = [r - mean, g - mean, b - mean];
  const matteVector = [matte.r - matteMean, matte.g - matteMean, matte.b - matteMean];
  const dot = vector.reduce((sum, value, index) => sum + value * matteVector[index], 0);
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  const matteNorm = Math.sqrt(matteVector.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 && matteNorm > 0 && dot / (norm * matteNorm) >= 0.92;
}

function despillLowSaturationTint(buffer, offset, matte) {
  if (!matte) return;
  const matteChannels = [matte.r, matte.g, matte.b];
  const ordered = matteChannels
    .map((value, index) => ({ value, index }))
    .sort((left, right) => right.value - left.value);
  if (ordered[0].value - ordered[1].value < 32) return;
  const dominant = ordered[0].index;
  const channels = [buffer[offset], buffer[offset + 1], buffer[offset + 2]];
  if (buffer[offset + 3] >= 245 && colorSaturation(...channels) > 0.4) return;
  const otherPeak = Math.max(...channels.filter((_, index) => index !== dominant));
  if (channels[dominant] <= otherPeak + 3) return;
  buffer[offset + dominant] = otherPeak;
}

export function cleanMatteArtifacts(buffer, matte, { alphaFloor = 0 } = {}) {
  for (let offset = 0; offset < buffer.length; offset += 4) {
    if (buffer[offset + 3] <= alphaFloor) {
      buffer[offset] = 0;
      buffer[offset + 1] = 0;
      buffer[offset + 2] = 0;
      buffer[offset + 3] = 0;
      continue;
    }
    if (buffer[offset + 3] <= 10) continue;
    if (matchesSaturatedMatte(buffer[offset], buffer[offset + 1], buffer[offset + 2], matte)) {
      buffer[offset] = 0;
      buffer[offset + 1] = 0;
      buffer[offset + 2] = 0;
      buffer[offset + 3] = 0;
      continue;
    }
    despillLowSaturationTint(buffer, offset, matte);
  }
  return buffer;
}

function isGeneratedBackground(r, g, b, alpha, mode, matte) {
  if (alpha <= 10) return true;
  if (mode === 'saturated-matte') return matchesSaturatedMatte(r, g, b, matte);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightNeutralGrid = min >= 225 && max - min <= 14;
  return lightNeutralGrid || isMagentaChroma(r, g, b);
}

export function removeBorderBackground(data, width, height, { mode = 'saturated-matte' } = {}) {
  if (!BACKGROUND_MODES.has(mode)) throw new Error(`Unsupported background mode: ${mode}`);
  const matte = mode === 'saturated-matte' ? sampleSaturatedBorderMatte(data, width, height) : null;
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
    if (!isGeneratedBackground(
      data[offset], data[offset + 1], data[offset + 2], data[offset + 3], mode, matte,
    )) continue;
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
    if (background[index]) {
      output[offset] = 0;
      output[offset + 1] = 0;
      output[offset + 2] = 0;
      output[offset + 3] = 0;
    }
  }
  if (mode === 'saturated-matte') cleanMatteArtifacts(output, matte);
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

export async function normalizeMaster({ inputPath, outputPath, backgroundMode = 'saturated-matte' }) {
  if (!fs.existsSync(inputPath)) throw new Error(`Master file does not exist: ${inputPath}`);
  const decoded = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const matte = backgroundMode === 'saturated-matte'
    ? sampleSaturatedBorderMatte(decoded.data, decoded.info.width, decoded.info.height)
    : null;
  const cleaned = removeBorderBackground(decoded.data, decoded.info.width, decoded.info.height, {
    mode: backgroundMode,
  });
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
  if (backgroundMode === 'saturated-matte') cleanMatteArtifacts(normalized, matte, { alphaFloor: 64 });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(normalized, { raw: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4 } })
    .png()
    .toFile(outputPath);
}

function parseArgs(args) {
  if (args.length % 2 !== 0) {
    throw new Error('Usage: node scripts/avatar-100/normalize-master.mjs --input <image> --output <png> [--background-mode saturated-matte|legacy-neutral]');
  }
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    if (!['--input', '--output', '--background-mode'].includes(args[index])) {
      throw new Error(`Unsupported argument: ${args[index]}`);
    }
    values.set(args[index], args[index + 1]);
  }
  const input = values.get('--input');
  const output = values.get('--output');
  const backgroundMode = values.get('--background-mode') ?? 'saturated-matte';
  if (!input || !output || !BACKGROUND_MODES.has(backgroundMode)) {
    throw new Error('Usage: node scripts/avatar-100/normalize-master.mjs --input <image> --output <png> [--background-mode saturated-matte|legacy-neutral]');
  }
  return {
    inputPath: path.resolve(input),
    outputPath: path.resolve(output),
    backgroundMode,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await normalizeMaster(options);
  process.stdout.write(`avatar-100 normalized master -> ${options.outputPath}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
