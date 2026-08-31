#!/usr/bin/env node
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const ASSET_DIR = path.join(ROOT, 'admin', 'v2', 'avatars', 'avatar-phenomena-v1');
const OUT_FILE = path.join(ROOT, 'constants', 'avatar_phenomena_fits.ts');
const SAMPLE = 256;
const ALPHA_THRESHOLD = 12;
export const PHENOMENA_TARGET_SILHOUETTE = 1;
export const PHENOMENA_TARGET_BOTTOM = 0.965;

export function fitForBounds(bounds) {
  const silhouette = Math.max(bounds.width, bounds.height);
  const scale = PHENOMENA_TARGET_SILHOUETTE / silhouette;
  return {
    scale: Number(scale.toFixed(3)),
    translateX: Number((0.5 - (0.5 + (bounds.centerX - 0.5) * scale)).toFixed(4)),
    translateY: Number((PHENOMENA_TARGET_BOTTOM - (0.5 + (bounds.sourceBottom - 0.5) * scale)).toFixed(4)),
  };
}

async function measure(file) {
  const { data, info } = await sharp(file).ensureAlpha().resize(SAMPLE, SAMPLE, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let left = SAMPLE; let top = SAMPLE; let right = -1; let bottom = -1;
  for (let y = 0; y < SAMPLE; y += 1) for (let x = 0; x < SAMPLE; x += 1) {
    if (data[(y * SAMPLE + x) * info.channels + 3] <= ALPHA_THRESHOLD) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) throw new Error(`avatar_phenomena_empty_asset: ${file}`);
  return {
    width: (right - left + 1) / SAMPLE,
    height: (bottom - top + 1) / SAMPLE,
    centerX: (left + right + 1) / (2 * SAMPLE),
    sourceBottom: (bottom + 1) / SAMPLE,
  };
}

export async function buildFitTable({ assetDir = ASSET_DIR, outFile = OUT_FILE } = {}) {
  const files = (await readdir(assetDir)).filter((file) => /^custom-phen-\d{2}-(black|white)\.webp$/.test(file)).sort();
  const entries = [];
  for (const file of files) {
    const match = /^(custom-phen-\d{2})-(black|white)\.webp$/.exec(file);
    entries.push({ key: `${match[1]}:${match[2]}`, fit: fitForBounds(await measure(path.join(assetDir, file))) });
  }
  const body = entries.map(({ key, fit }) => `  '${key}': { scale: ${fit.scale}, translateX: ${fit.translateX}, translateY: ${fit.translateY} },`).join('\n');
  await writeFile(outFile, `// АВТОГЕНЕРАЦИЯ — scripts/avatar-phenomena/build-fit-table.mjs\nexport type AvatarPhenomenaFit = Readonly<{ scale: number; translateX: number; translateY: number }>;\nexport const AVATAR_PHENOMENA_TARGET_SILHOUETTE = ${PHENOMENA_TARGET_SILHOUETTE};\nexport const AVATAR_PHENOMENA_TARGET_BOTTOM = ${PHENOMENA_TARGET_BOTTOM};\nexport const AVATAR_PHENOMENA_FITS: Readonly<Record<string, AvatarPhenomenaFit>> = Object.freeze({\n${body}\n});\n`);
  return entries;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildFitTable().then((entries) => console.log(`avatar_phenomena_fits.ts: ${entries.length} entries`)).catch((error) => { console.error(error); process.exitCode = 1; });
}
