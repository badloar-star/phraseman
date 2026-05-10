/**
 * Expo config validation expects PNG for app icon / adaptive icon / notification icon /
 * splash in many cases. Regenerate PNGs from WebP sources (Lossless PNG from decoded bitmap).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG = path.join(__dirname, '..', 'assets', 'images');

const PAIRS = [
  ['icon.webp', 'icon.png'],
  ['android-icon-monochrome.webp', 'android-icon-monochrome.png'],
  ['android-icon-foreground.webp', 'android-icon-foreground.png'],
  ['splash-icon.webp', 'splash-icon.png'],
  ['favicon.webp', 'favicon.png'],
];

for (const [src, dst] of PAIRS) {
  const from = path.join(IMG, src);
  const to = path.join(IMG, dst);
  if (!(await fs.promises.stat(from).catch(() => null))) {
    console.warn('[ensure-expo-asset-pngs] skip missing:', src);
    continue;
  }
  await sharp(from).png({ compressionLevel: 9 }).toFile(to);
  console.log('[ensure-expo-asset-pngs]', dst, '←', src);
}
