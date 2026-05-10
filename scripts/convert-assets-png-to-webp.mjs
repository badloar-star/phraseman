/**
 * Converts bundled PNGs to WebP (smaller on disk / in the app bundle) and removes the PNGs.
 * Targets: assets/images (Expo app) and admin/avatars (static admin UI).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

console.log('[convert-assets-png-to-webp] scanning…');

const TARGET_DIRS = [
  path.join(ROOT, 'assets', 'images'),
  path.join(ROOT, 'admin', 'avatars'),
];

const WEBP_OPTS = {
  quality: 88,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
};

async function collectPngs(dir, out = []) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await collectPngs(full, out);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.png')) {
      out.push(full);
    }
  }
  return out;
}

let converted = 0;
let bytesBefore = 0;
let bytesAfter = 0;
const errors = [];

for (const dir of TARGET_DIRS) {
  const pngs = await collectPngs(dir);
  pngs.sort();
  for (const pngPath of pngs) {
    const webpPath = pngPath.replace(/\.png$/i, '.webp');
    try {
      const stat = await fs.promises.stat(pngPath);
      bytesBefore += stat.size;
      await sharp(pngPath).webp(WEBP_OPTS).toFile(webpPath);
      const wstat = await fs.promises.stat(webpPath);
      bytesAfter += wstat.size;
      await fs.promises.unlink(pngPath);
      converted++;
    } catch (e) {
      errors.push({ file: path.relative(ROOT, pngPath), message: e.message });
    }
  }
}

console.log(
  JSON.stringify(
    {
      converted,
      bytesBefore,
      bytesAfter,
      saved: bytesBefore - bytesAfter,
      kbSaved: ((bytesBefore - bytesAfter) / 1024).toFixed(1),
      errors,
    },
    null,
    2,
  ),
);

if (errors.length) process.exitCode = 1;
