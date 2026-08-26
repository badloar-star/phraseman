#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const VARIANTS = ['black', 'white'];
const TIERS = [
  { price: 50, start: 63, end: 72 },
  { price: 70, start: 73, end: 82 },
  { price: 100, start: 83, end: 92 },
  { price: 150, start: 93, end: 102 },
  { price: 300, start: 103, end: 112 },
  { price: 500, start: 113, end: 122 },
  { price: 1000, start: 123, end: 125 },
  { price: 3000, start: 126, end: 126 },
];
const CELL_WIDTH = 328;
const CELL_HEIGHT = 224;
const IMAGE_SIZE = 142;
const SHEET_PADDING = 12;
const SHEET_COLUMNS = 5;

function parseArgs(args) {
  if (args.length % 2 !== 0) throw new Error('Audit arguments must be key/value pairs');
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) values.set(args[index], args[index + 1]);
  const inputDir = values.get('--input-dir');
  const outputDir = values.get('--out-dir');
  const reportPath = values.get('--json');
  const start = Number(values.get('--start'));
  const end = Number(values.get('--end'));
  if (!inputDir || !outputDir || !reportPath || !Number.isInteger(start) || !Number.isInteger(end)
    || start < 63 || end > 165 || start > end) {
    throw new Error('Usage: build-alpha-audit.mjs --input-dir <dir> --start <id> --end <id> --out-dir <dir> --json <path>');
  }
  return {
    inputDir: path.resolve(inputDir),
    outputDir: path.resolve(outputDir),
    reportPath: path.resolve(reportPath),
    start,
    end,
  };
}

function priceFor(id) {
  return TIERS.find(({ start, end }) => id >= start && id <= end)?.price ?? null;
}

function visibleMetrics(data, width, height) {
  const pixelCount = width * height;
  const visible = new Uint8Array(pixelCount);
  let opaquePixels = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let edgeContact = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (data[index * 4 + 3] <= 10) continue;
      visible[index] = 1;
      opaquePixels += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) edgeContact = true;
    }
  }
  return {
    visible,
    opaquePixels,
    edgeContact,
    bounds: right < left ? null : { left, top, width: right - left + 1, height: bottom - top + 1 },
  };
}

function componentAreas(mask, width, height, target) {
  const visited = new Uint8Array(mask.length);
  const queue = new Uint32Array(mask.length);
  const areas = [];
  for (let seed = 0; seed < mask.length; seed += 1) {
    if (visited[seed] || mask[seed] !== target) continue;
    let head = 0;
    let tail = 0;
    let area = 0;
    visited[seed] = 1;
    queue[tail++] = seed;
    while (head < tail) {
      const index = queue[head++];
      area += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      const add = (next) => {
        if (!visited[next] && mask[next] === target) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      };
      if (x > 0) add(index - 1);
      if (x + 1 < width) add(index + 1);
      if (y > 0) add(index - width);
      if (y + 1 < height) add(index + width);
    }
    areas.push(area);
  }
  return areas.sort((left, right) => right - left);
}

function internalTransparentAreas(visible, width, height) {
  const exterior = new Uint8Array(visible.length);
  const queue = new Uint32Array(visible.length);
  let head = 0;
  let tail = 0;
  const add = (index) => {
    if (exterior[index] || visible[index]) return;
    exterior[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    add(y * width);
    add(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (y > 0) add(index - width);
    if (y + 1 < height) add(index + width);
  }
  const internal = new Uint8Array(visible.length);
  for (let index = 0; index < internal.length; index += 1) {
    if (!visible[index] && !exterior[index]) internal[index] = 1;
  }
  return componentAreas(internal, width, height, 1).filter((area) => area >= 6);
}

async function analyzeAsset(filePath, id, variant) {
  if (!fs.existsSync(filePath)) return { id, variant, filePath, missing: true };
  const metadata = await sharp(filePath).metadata();
  const decoded = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const metrics = visibleMetrics(decoded.data, decoded.info.width, decoded.info.height);
  const foregroundAreas = componentAreas(metrics.visible, decoded.info.width, decoded.info.height, 1);
  const significantThreshold = Math.max(24, Math.round((foregroundAreas[0] ?? 0) * 0.01));
  const significantComponents = foregroundAreas.filter((area) => area >= significantThreshold).length;
  const internalAreas = internalTransparentAreas(metrics.visible, decoded.info.width, decoded.info.height);
  const reasons = [];
  if (metadata.format !== 'webp') reasons.push(`format:${metadata.format ?? 'unknown'}`);
  if (metadata.width !== 512 || metadata.height !== 512) reasons.push(`size:${metadata.width}x${metadata.height}`);
  if (!metadata.hasAlpha) reasons.push('missing-alpha');
  if (!metrics.bounds) reasons.push('empty-subject');
  if (metrics.edgeContact) reasons.push('alpha-touches-canvas-edge');
  return {
    id,
    variant,
    price: priceFor(id),
    filePath,
    bytes: fs.statSync(filePath).size,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    hasAlpha: metadata.hasAlpha,
    opaquePixels: metrics.opaquePixels,
    bounds: metrics.bounds,
    edgeContact: metrics.edgeContact,
    foregroundComponents: foregroundAreas.length,
    detachedForegroundComponents: Math.max(0, significantComponents - 1),
    internalTransparentComponents: internalAreas.length,
    largestInternalTransparentArea: internalAreas[0] ?? 0,
    reasons,
  };
}

async function diagnosticTile(filePath, variant, id) {
  const intended = variant === 'black' ? '#E9E1D1' : '#111C2E';
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}">
    <rect width="${IMAGE_SIZE / 2}" height="${IMAGE_SIZE}" fill="${intended}"/>
    <rect x="${IMAGE_SIZE / 2}" width="${IMAGE_SIZE / 2}" height="${IMAGE_SIZE}" fill="#E00070"/>
    <line x1="${IMAGE_SIZE / 2}" y1="0" x2="${IMAGE_SIZE / 2}" y2="${IMAGE_SIZE}" stroke="#FFFFFF" stroke-opacity=".35"/>
  </svg>`);
  const art = await sharp(filePath)
    .resize(IMAGE_SIZE - 10, IMAGE_SIZE - 10, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}">
    <rect x="5" y="5" width="62" height="21" rx="8" fill="#050A12" fill-opacity=".88"/>
    <text x="12" y="20" fill="#FFFFFF" font-family="Arial" font-weight="700" font-size="11">${variant.toUpperCase()}</text>
    <text x="${IMAGE_SIZE - 8}" y="20" text-anchor="end" fill="#FFFFFF" font-family="Arial" font-weight="700" font-size="12">#${id}</text>
  </svg>`);
  return sharp(background)
    .composite([{ input: art, gravity: 'center' }, { input: label, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function buildTierSheet({ inputDir, outputDir, ids, price }) {
  const columns = Math.min(SHEET_COLUMNS, ids.length);
  const rows = Math.ceil(ids.length / columns);
  const header = 58;
  const width = SHEET_PADDING * 2 + columns * CELL_WIDTH;
  const height = header + SHEET_PADDING + rows * CELL_HEIGHT + SHEET_PADDING;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#070B12"/>
    <text x="${SHEET_PADDING}" y="29" fill="#F7F8FB" font-family="Arial" font-weight="800" font-size="22">AUDIT ${price} PEARLS</text>
    <text x="${SHEET_PADDING}" y="48" fill="#9AA6B8" font-family="Arial" font-size="12">left: intended background · right: diagnostic magenta</text>`;
  const layers = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const x = SHEET_PADDING + (index % columns) * CELL_WIDTH;
    const y = header + SHEET_PADDING + Math.floor(index / columns) * CELL_HEIGHT;
    svg += `<rect x="${x}" y="${y}" width="${CELL_WIDTH - 8}" height="${CELL_HEIGHT - 8}" rx="18" fill="#121A27" stroke="#2A374A"/>
      <text x="${x + 12}" y="${y + 25}" fill="#DCE3ED" font-family="Arial" font-weight="700" font-size="15">PAIR ${id}</text>`;
    for (const [variantIndex, variant] of VARIANTS.entries()) {
      const filePath = path.join(inputDir, `custom-idea-${id}-${variant}.webp`);
      if (!fs.existsSync(filePath)) continue;
      layers.push({
        input: await diagnosticTile(filePath, variant, id),
        left: x + 11 + variantIndex * (IMAGE_SIZE + 10),
        top: y + 36,
      });
    }
  }
  svg += '</svg>';
  const outputPath = path.join(outputDir, `tier-${price}-alpha-audit.png`);
  await sharp(Buffer.from(svg)).composite(layers).png().toFile(outputPath);
  return outputPath;
}

export async function buildAlphaAudit(options) {
  fs.mkdirSync(options.outputDir, { recursive: true });
  const ids = Array.from({ length: options.end - options.start + 1 }, (_, offset) => options.start + offset);
  const entries = [];
  for (const id of ids) {
    for (const variant of VARIANTS) {
      entries.push(await analyzeAsset(
        path.join(options.inputDir, `custom-idea-${id}-${variant}.webp`), id, variant,
      ));
    }
  }
  const missing = entries.filter(({ missing }) => missing).map(({ id, variant, filePath }) => ({ id, variant, filePath }));
  const rejected = entries
    .filter(({ reasons }) => reasons?.length)
    .map(({ id, variant, reasons }) => ({ id, variant, reasons }));
  const contactSheets = [];
  for (const tier of TIERS) {
    const tierIds = ids.filter((id) => id >= tier.start && id <= tier.end);
    if (tierIds.length) contactSheets.push(await buildTierSheet({
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      ids: tierIds,
      price: tier.price,
    }));
  }
  const report = {
    checked: entries.length,
    missing,
    rejected,
    contactSheets,
    entries,
  };
  fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
  fs.writeFileSync(options.reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const report = await buildAlphaAudit(parseArgs(process.argv.slice(2)));
  process.stdout.write(`avatar alpha audit: checked=${report.checked} missing=${report.missing.length} rejected=${report.rejected.length}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
