#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import {
  PHENOMENA_GENERATION_CATALOG,
  PHENOMENA_INKS,
  PHENOMENA_WORKSPACE,
  finalPathFor,
  promptPathFor,
  rawPathFor,
} from './catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

function rgbFromHex(value) {
  const match = /^#([0-9A-F]{6})$/i.exec(value);
  if (!match) throw new Error(`avatar_phenomena_invalid_matte: ${value}`);
  const numeric = Number.parseInt(match[1], 16);
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
}

function colorDistance(data, offset, matte) {
  const red = data[offset] - matte[0];
  const green = data[offset + 1] - matte[1];
  const blue = data[offset + 2] - matte[2];
  return Math.sqrt(red * red + green * green + blue * blue);
}

function connectedMatteMask(data, width, height, channels, matte, tolerance = 92) {
  const mask = new Uint8Array(width * height);
  const queued = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    const index = y * width + x;
    if (queued[index]) return;
    queued[index] = 1;
    if (colorDistance(data, index * channels, matte) <= tolerance) queue.push(index);
  };
  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(0, y); enqueue(width - 1, y); }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    mask[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }
  return mask;
}

function alphaBounds(rgba, width, height, threshold = 12) {
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] <= threshold) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error('avatar_phenomena_empty_subject');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

export async function processFinalAsset({ input, output, matteHex, canvasSize = 1024 }) {
  const source = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = source.info;
  const matte = rgbFromHex(matteHex);
  const background = connectedMatteMask(source.data, width, height, channels, matte);
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const sourceOffset = index * channels;
    const targetOffset = index * 4;
    const distance = colorDistance(source.data, sourceOffset, matte);
    const alpha = background[index] ? 0 : Math.max(0, Math.min(255, Math.round((distance - 70) * 5.1)));
    const opacity = alpha / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      const observed = source.data[sourceOffset + channel];
      rgba[targetOffset + channel] = alpha === 0
        ? 0
        : Math.max(0, Math.min(255, Math.round((observed - matte[channel] * (1 - opacity)) / opacity)));
    }
    rgba[targetOffset + 3] = alpha;
  }
  const bounds = alphaBounds(rgba, width, height);
  const visibleTarget = Math.round(canvasSize * 0.94);
  const scale = Math.min(visibleTarget / bounds.width, visibleTarget / bounds.height);
  const targetWidth = Math.max(1, Math.round(bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(bounds.height * scale));
  const trimmed = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract(bounds)
    .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const left = Math.round((canvasSize - targetWidth) / 2);
  const top = Math.max(0, Math.round(canvasSize * 0.965) - targetHeight);
  await mkdir(path.dirname(output), { recursive: true });
  await sharp({ create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left, top }])
    .webp({ quality: 76, alphaQuality: 100, effort: 6 })
    .toFile(output);
  return { output, sha256: await sha256(output), sourceBounds: bounds };
}

export async function appendApprovedManifestEntry(manifestPath, entry) {
  let manifest = { version: 1, artVersion: 'phenomena-v1', entries: [] };
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const key = `${entry.id}:${entry.ink}`;
  const existing = manifest.entries.find((candidate) => `${candidate.id}:${candidate.ink}` === key);
  if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) {
    throw new Error(`approved_manifest_conflict: ${key}`);
  }
  if (!existing) manifest.entries.push(entry);
  manifest.entries.sort((left, right) => `${left.id}:${left.ink}`.localeCompare(`${right.id}:${right.ink}`));
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function runCli() {
  const selectedId = process.argv.includes('--id') ? process.argv[process.argv.indexOf('--id') + 1] : null;
  const selected = selectedId
    ? PHENOMENA_GENERATION_CATALOG.filter((item) => item.id === selectedId)
    : PHENOMENA_GENERATION_CATALOG;
  if (selected.length === 0) throw new Error(`avatar_phenomena_unknown_id: ${selectedId}`);
  let count = 0;
  const manifestPath = path.join(ROOT, PHENOMENA_WORKSPACE, 'approved-manifest.json');
  for (const item of selected) {
    for (const ink of PHENOMENA_INKS) {
      const rawPath = path.join(ROOT, rawPathFor(item.id, ink));
      const finalPath = path.join(ROOT, finalPathFor(item.id, ink));
      const receipt = await processFinalAsset({
        input: rawPath,
        output: finalPath,
        matteHex: item.matteHex,
      });
      const checkpoint = JSON.parse(await readFile(path.join(ROOT, promptPathFor(item.id, ink)), 'utf8'));
      await appendApprovedManifestEntry(manifestPath, {
        id: item.id,
        ink,
        price: item.price,
        artVersion: 'phenomena-v1',
        status: 'approved',
        prompt: checkpoint.prompt,
        rawPath: rawPathFor(item.id, ink).replaceAll('\\', '/'),
        rawSha256: await sha256(rawPath),
        finalPath: finalPathFor(item.id, ink).replaceAll('\\', '/'),
        finalSha256: receipt.sha256,
        sourceBounds: receipt.sourceBounds,
        approval: checkpoint.approval,
      });
      count += 1;
    }
  }
  console.log(`avatar phenomena finals: ${count}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
