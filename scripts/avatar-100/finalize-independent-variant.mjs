#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { normalizeMaster } from './normalize-master.mjs';

const MAX_WEBP_BYTES = 50_000;

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) values.set(args[index], args[index + 1]);
  const inputPath = values.get('--input');
  const assetIndex = Number(values.get('--index'));
  const variant = values.get('--variant');
  const outputDir = values.get('--out-dir');
  if (!inputPath || !Number.isInteger(assetIndex) || assetIndex < 63 || assetIndex > 165
    || !['black', 'white'].includes(variant) || !outputDir) {
    throw new Error('Usage: node scripts/avatar-100/finalize-independent-variant.mjs --input <image> --index <63-165> --variant <black|white> --out-dir <directory>');
  }
  return {
    inputPath: path.resolve(inputPath),
    assetIndex,
    variant,
    outputDir: path.resolve(outputDir),
  };
}

export async function finalizeIndependentVariant({ inputPath, assetIndex, variant, outputDir }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const base = path.join(outputDir, `custom-idea-${assetIndex}-${variant}`);
  const pngPath = `${base}.png`;
  const webpPath = `${base}.webp`;
  await normalizeMaster({
    inputPath,
    outputPath: pngPath,
    backgroundMode: 'saturated-matte',
  });

  let quality = 76;
  for (; quality >= 48; quality -= 4) {
    await sharp(pngPath)
      .webp({ quality, alphaQuality: 100, effort: 6 })
      .toFile(webpPath);
    if (fs.statSync(webpPath).size <= MAX_WEBP_BYTES) break;
  }
  if (fs.statSync(webpPath).size > MAX_WEBP_BYTES) {
    throw new Error(`Could not compress ${path.basename(webpPath)} below ${MAX_WEBP_BYTES} bytes`);
  }
  return { pngPath, webpPath, quality, webpBytes: fs.statSync(webpPath).size };
}

async function main() {
  const result = await finalizeIndependentVariant(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
