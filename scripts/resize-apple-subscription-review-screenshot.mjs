#!/usr/bin/env node
/**
 * Файлы под форму In-App Purchase / подписки в App Store Connect.
 *
 * 1) Промо-изображение (поле «Image» в справке Apple):
 *    ровно 1024×1024 px, JPG или PNG, RGB, без прозрачности, 72 dpi.
 *    https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information
 *
 * 2) Снимок для проверки (поле «App Review Screenshot»):
 *    любой размер из Screenshot specifications для iPhone, который поддерживает приложение.
 *    Генерируем три официальных портрета 6.9":
 *    1320×2868, 1290×2796, 1260×2736
 *    https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
 *
 * Использование (из корня проекта):
 *   node scripts/resize-apple-subscription-review-screenshot.mjs "C:\path\paywall.jpg"
 *   → ровно ДВА файла: 1024×1024 (поле Image) и 1284×2778 (App Review Screenshot).
 *
 * Опции:
 *   --size=WxH         — вместо 1284×2778 один другой review-размер (см. список в SIZE_MAP)
 *   --six-nine         — три варианта 6.9" (1320×2868, 1290×2796, 1260×2736), если Connect просит
 *   --all              — все портретные iPhone из списка Apple
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const IPHONE_PORTRAIT_SIZES = [
  ['1320x2868', 1320, 2868],
  ['1290x2796', 1290, 2796],
  ['1260x2736', 1260, 2736],
  ['1284x2778', 1284, 2778],
  ['1242x2688', 1242, 2688],
  ['1242x2208', 1242, 2208],
  ['1179x2556', 1179, 2556],
  ['1206x2622', 1206, 2622],
  ['1170x2532', 1170, 2532],
  ['1125x2436', 1125, 2436],
  ['1080x2340', 1080, 2340],
  ['750x1334', 750, 1334],
  ['640x1136', 640, 1136],
  ['640x1096', 640, 1096],
  ['640x960', 640, 960],
  ['640x920', 640, 920],
];

const SIZE_MAP = Object.fromEntries(
  IPHONE_PORTRAIT_SIZES.map(([k, w, h]) => [k, { width: w, height: h }]),
);

/** Три размера 6.9" — только по флагу --six-nine */
const REVIEW_69 = [
  ['1320x2868', 1320, 2868],
  ['1290x2796', 1290, 2796],
  ['1260x2736', 1260, 2736],
];

/** По умолчанию Connect для этого приложения принял 6.5" портрет */
const DEFAULT_REVIEW_KEY = '1284x2778';

const args = process.argv.slice(2).filter((a) => a !== '--');
let sizeKey = DEFAULT_REVIEW_KEY;
let emitAll = false;
let sixNine = false;
let singleReviewOnly = false;
const fileArgs = [];
for (const a of args) {
  if (a === '--all') emitAll = true;
  else if (a === '--six-nine') sixNine = true;
  else if (a.startsWith('--size=')) {
    sizeKey = a.slice('--size='.length);
    singleReviewOnly = true;
  } else fileArgs.push(a);
}

const input = fileArgs[0];
if (!input || !fs.existsSync(input)) {
  console.error('Использование:\n  node scripts/resize-apple-subscription-review-screenshot.mjs <файл.jpg|png> [--size=WxH] [--all]');
  process.exit(1);
}

const base = path.basename(input, path.extname(input));
const outDir = path.dirname(path.resolve(input));

async function openInputRotated() {
  const meta = await sharp(input).metadata();
  let img = sharp(input).rotate();
  if (meta.hasAlpha) {
    img = img.flatten({ background: { r: 11, g: 20, b: 27 } });
  }
  return img;
}

/** Apple Image: 1024×1024, JPG, RGB, flattened, 72 dpi */
async function writePromo1024() {
  const output = path.join(outDir, `${base}-iap-IMAGE-exactly-1024x1024.jpg`);
  const img = await openInputRotated();
  await img
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .withMetadata({ density: 72 })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(output);
  const m = await sharp(output).metadata();
  if (m.width !== 1024 || m.height !== 1024) {
    throw new Error('Promo size mismatch');
  }
  return output;
}

async function writeReview(key, w, h) {
  const output = path.join(outDir, `${base}-APP-REVIEW-SCREENSHOT-${key}.jpg`);
  const img = await openInputRotated();
  await img
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .withMetadata({ density: 72 })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(output);
  const m = await sharp(output).metadata();
  console.log(`App Review Screenshot (${key}): ${m.width}×${m.height} → ${output}`);
  return output;
}

if (emitAll) {
  const promo = await writePromo1024();
  console.log(`\nImage (1024×1024):\n  ${promo}\n`);
  for (const [key, w, h] of IPHONE_PORTRAIT_SIZES) {
    await writeReview(key, w, h);
  }
} else if (sixNine) {
  const promo = await writePromo1024();
  console.log(`\nImage (1024×1024):\n  ${promo}\n`);
  console.log('App Review (три 6.9"):');
  for (const [key, w, h] of REVIEW_69) {
    await writeReview(key, w, h);
  }
} else if (singleReviewOnly) {
  const dims = SIZE_MAP[sizeKey];
  if (!dims) {
    console.error('Неизвестный --size:', Object.keys(SIZE_MAP).join(', '));
    process.exit(1);
  }
  const promo = await writePromo1024();
  console.log(`\nImage (1024×1024):\n  ${promo}\n`);
  await writeReview(sizeKey, dims.width, dims.height);
} else {
  const promo = await writePromo1024();
  const dims = SIZE_MAP[DEFAULT_REVIEW_KEY];
  console.log(`\n1) Поле «Image» (1024×1024):\n  ${promo}`);
  await writeReview(DEFAULT_REVIEW_KEY, dims.width, dims.height);
  console.log(`\n2) Поле «App Review Screenshot» (${DEFAULT_REVIEW_KEY}):\n  (см. путь выше)\n`);
  console.log('Дополнительно: --six-nine (три 6.9"), --all (все размеры), --size=1242x2688 и т.д.');
}
