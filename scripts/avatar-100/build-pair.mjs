#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--input', '--index', '--out-dir'].includes(key) || !value) {
      throw new Error(
        'Usage: node scripts/avatar-100/build-pair.mjs --input <png> --index <63-162> --out-dir <directory>',
      );
    }
    values.set(key, value);
  }
  if (values.size !== 3) throw new Error('Input, index, and output directory are required');
  const assetIndex = Number(values.get('--index'));
  if (!Number.isInteger(assetIndex) || assetIndex < 63 || assetIndex > 162) {
    throw new Error(`Avatar index must be an integer from 63 through 162; got ${values.get('--index')}`);
  }
  return {
    inputPath: path.resolve(values.get('--input')),
    assetIndex,
    outputDir: path.resolve(values.get('--out-dir')),
  };
}

export function remapRgba(data, mode) {
  if (mode !== 'black' && mode !== 'white') throw new Error(`Unsupported pair mode: ${mode}`);
  const output = Buffer.from(data);
  for (let offset = 0; offset < output.length; offset += 4) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const alpha = data[offset + 3];
    if (alpha === 0) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = (max - min) / 255;
    if (chroma < 0.16) {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const target = Math.round(mode === 'black' ? 18 + 0.42 * luma : 150 + 0.40 * luma);
      output[offset] = target;
      output[offset + 1] = target;
      output[offset + 2] = target;
      continue;
    }

    const low = mode === 'black' ? 96 : 120;
    const high = mode === 'black' ? 220 : 238;
    const targetPeak = Math.min(high, Math.max(low, max));
    const scale = max === 0 ? 1 : targetPeak / max;
    output[offset] = Math.min(255, Math.round(r * scale));
    output[offset + 1] = Math.min(255, Math.round(g * scale));
    output[offset + 2] = Math.min(255, Math.round(b * scale));
  }
  return output;
}

async function writeVariant(data, raw, assetIndex, mode, outputDir) {
  const baseName = `custom-idea-${assetIndex}-${mode}`;
  const image = sharp(data, { raw });
  await Promise.all([
    image.clone().png().toFile(path.join(outputDir, `${baseName}.png`)),
    image.clone().webp({ quality: 76, alphaQuality: 100, effort: 6 })
      .toFile(path.join(outputDir, `${baseName}.webp`)),
  ]);
}

export async function buildPair({ inputPath, assetIndex, outputDir }) {
  if (!fs.existsSync(inputPath)) throw new Error(`Master file does not exist: ${inputPath}`);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`Expected RGBA input; got ${info.channels} channels`);
  fs.mkdirSync(outputDir, { recursive: true });
  const raw = { width: info.width, height: info.height, channels: 4 };
  await Promise.all([
    writeVariant(remapRgba(data, 'black'), raw, assetIndex, 'black', outputDir),
    writeVariant(remapRgba(data, 'white'), raw, assetIndex, 'white', outputDir),
  ]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await buildPair(options);
  process.stdout.write(`avatar-100 pair: custom-idea-${options.assetIndex} -> ${options.outputDir}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
