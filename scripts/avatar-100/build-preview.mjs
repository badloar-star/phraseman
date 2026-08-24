#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const HEX_VIEWBOX = [[50, 3.5], [93, 26], [93, 74], [50, 96.5], [7, 74], [7, 26]];
const CELL = 160;
const SMALL = 20;
const PAD = 14;
const LABEL = 26;

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--input-dir', '--index', '--out-dir', '--json'].includes(key) || !value) {
      throw new Error('Usage: build-preview.mjs --input-dir <dir> --index <id> --out-dir <dir> --json <path>');
    }
    values.set(key, value);
  }
  if (values.size !== 4) throw new Error('All preview arguments are required');
  const assetIndex = Number(values.get('--index'));
  if (!Number.isInteger(assetIndex) || assetIndex < 63 || assetIndex > 162) {
    throw new Error(`Preview index must be 63-162; got ${values.get('--index')}`);
  }
  return {
    inputDir: path.resolve(values.get('--input-dir')),
    assetIndex,
    outputDir: path.resolve(values.get('--out-dir')),
    reportPath: path.resolve(values.get('--json')),
  };
}

export function loadGradients(source) {
  const blockStart = source.indexOf('export const CUSTOM_AVATAR_GRADIENTS');
  const blockEnd = source.indexOf('];', blockStart);
  if (blockStart < 0 || blockEnd < 0) throw new Error('CUSTOM_AVATAR_GRADIENTS block not found');
  const block = source.slice(blockStart, blockEnd + 2);
  const pattern = /\{ id: '([^']+)', name: '[^']+', colors: \['(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'\] \}/g;
  const gradients = [...block.matchAll(pattern)].map((match) => ({
    id: match[1],
    colors: [match[2], match[3], match[4]],
  }));
  if (gradients.length !== 10) throw new Error(`Expected 10 custom avatar gradients; got ${gradients.length}`);
  return gradients;
}

async function badge(input, gradient, size) {
  const points = HEX_VIEWBOX
    .map(([x, y]) => `${(x * size / 100).toFixed(1)},${(y * size / 100).toFixed(1)}`)
    .join(' ');
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="${gradient.colors[0]}"/>
      <stop offset="0.52" stop-color="${gradient.colors[1]}"/>
      <stop offset="1" stop-color="${gradient.colors[2]}"/>
    </linearGradient></defs>
    <polygon points="${points}" fill="url(#g)" stroke="rgba(255,255,255,0.58)" stroke-width="${Math.max(1, size * 0.035)}"/>
  </svg>`);
  const artSize = Math.round(size * 1.1);
  const offset = Math.round((artSize - size) / 2);
  const artwork = await sharp(input)
    .resize(artSize, artSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extract({ left: offset, top: offset, width: size, height: size })
    .png()
    .toBuffer();
  return sharp(background).composite([{ input: artwork, left: 0, top: 0 }]).png().toBuffer();
}

export async function buildPreview(options) {
  const source = fs.readFileSync(path.join(ROOT, 'constants', 'custom_avatars.ts'), 'utf8');
  const gradients = loadGradients(source);
  const variants = ['black', 'white'];
  const files = Object.fromEntries(variants.map((variant) => {
    const png = path.join(options.inputDir, `custom-idea-${options.assetIndex}-${variant}.png`);
    const webp = path.join(options.inputDir, `custom-idea-${options.assetIndex}-${variant}.webp`);
    const selected = fs.existsSync(png) ? png : webp;
    if (!fs.existsSync(selected)) throw new Error(`Missing ${variant} variant for ${options.assetIndex}`);
    return [variant, selected];
  }));

  const width = PAD + gradients.length * (CELL + PAD);
  const rowHeight = CELL + LABEL + SMALL * 3 + PAD;
  const height = PAD + variants.length * rowHeight + PAD;
  const layers = [];
  let labels = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#0B0F16"/>`;

  for (let row = 0; row < variants.length; row += 1) {
    const variant = variants[row];
    const input = fs.readFileSync(files[variant]);
    const y = PAD + row * rowHeight;
    for (let column = 0; column < gradients.length; column += 1) {
      const gradient = gradients[column];
      const x = PAD + column * (CELL + PAD);
      layers.push({ input: await badge(input, gradient, CELL), top: y, left: x });
      const tiny = await badge(input, gradient, SMALL);
      const zoomed = await sharp(tiny).resize(SMALL * 3, SMALL * 3, { kernel: 'nearest' }).png().toBuffer();
      layers.push({
        input: zoomed,
        top: y + CELL + LABEL,
        left: x + Math.round((CELL - SMALL * 3) / 2),
      });
      labels += `<text x="${x + CELL / 2}" y="${y + CELL + 18}" fill="#E5E7EB" font-family="Arial" font-size="12" text-anchor="middle">${gradient.id}</text>`;
    }
    labels += `<text x="${PAD}" y="${y + 16}" fill="#C8FF00" font-family="Arial" font-size="13">${variant}</text>`;
  }
  labels += '</svg>';

  fs.mkdirSync(options.outputDir, { recursive: true });
  const contactSheet = path.join(options.outputDir, `custom-idea-${options.assetIndex}-contact-sheet.png`);
  await sharp(Buffer.from(labels)).composite(layers).png().toFile(contactSheet);
  const report = {
    assetIndex: options.assetIndex,
    gradients,
    variants,
    smallSize: SMALL,
    contactSheet,
  };
  fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
  fs.writeFileSync(options.reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await buildPreview(options);
  process.stdout.write(`avatar-100 preview: ${report.contactSheet}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
