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
  ['android-icon-foreground.webp', 'android-icon-foreground.png'],
  ['splash-icon.webp', 'splash-icon.png'],
  ['favicon.webp', 'favicon.png'],
];

// зачем (2026-08-24): android-icon-monochrome.png УБРАН из авто-регенерации.
// Раньше он получался пересжатием цветного исходника и был его побайтовой
// копией — Android 13+ ждёт одноцветный силуэт, а получал полноцветный арт и
// рисовал грязную темизированную иконку. Теперь силуэт строит отдельный скрипт
// scripts/build_android_monochrome_icon.mjs (порог яркости + замыкание), и
// перегенерация отсюда молча затёрла бы его обратно.

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
