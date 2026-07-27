// зачем: вписать иконки бонусов в поле полотна тем же способом, что уже применён
// для volt (коммит 8c37b888d) — тест tests/boon_icon_assets.test.ts требует
// рисунок <=176/256, поле от края >=40/256, смещение центра <=8/256. Скрипт
// детерминированный: обрезка по альфе, масштаб длинной стороны до 168, центровка.
// Рисунок не перерисовывается — lanczos3 сохраняет детализацию.
//
// Windows-нюанс: sharp держит дескриптор открытым на входном файле, поэтому
// вход читаем в буфер (readFileSync), а запись делаем ОТДЕЛЬНЫМ проходом после
// обработки всех файлов — иначе перезапись входа падает с EBUSY/EPERM.
//
// Usage: node scripts/refit_weekly_boon_icons.mjs <theme> [<theme> ...]
//        node scripts/refit_weekly_boon_icons.mjs --dry-run <theme>

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const CANVAS = 256;
const TARGET_LONG_SIDE = 168;
const ALPHA_THRESHOLD = 8;

const ICON_IDS = [
  'streak_saver',
  'mystery_monday',
  'turbo_regen',
  'energy_free_window',
  'double_xp',
  'flashcard_friday',
  'arena_saturday',
  'speaking_saturday',
  'early_bird',
  'perfect_week',
  'comeback',
];

const root = process.cwd();
const iconsRoot = path.join(root, 'assets', 'images', 'weekly_boon_icons', 'png');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const themes = argv.filter((arg) => !arg.startsWith('--'));

if (themes.length === 0) {
  throw new Error('Specify at least one theme folder, e.g. `node scripts/refit_weekly_boon_icons.mjs candyBlue indigo`.');
}

/** Bounding box of visible pixels (alpha > threshold). Null when fully transparent. */
function alphaBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

async function refit(inputBuffer) {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(data, info.width, info.height);
  if (!bounds) throw new Error('Icon has no visible pixels.');

  const cropW = bounds.maxX - bounds.minX + 1;
  const cropH = bounds.maxY - bounds.minY + 1;
  const scale = TARGET_LONG_SIDE / Math.max(cropW, cropH);
  const scaledW = Math.max(1, Math.round(cropW * scale));
  const scaledH = Math.max(1, Math.round(cropH * scale));

  const scaled = await sharp(inputBuffer)
    .ensureAlpha()
    .extract({ left: bounds.minX, top: bounds.minY, width: cropW, height: cropH })
    .resize(scaledW, scaledH, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
    .png()
    .toBuffer();

  // Центрируем: остаток нечётной разницы уходит вниз/вправо, смещение <=0.5px.
  return sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: scaled,
        left: Math.round((CANVAS - scaledW) / 2),
        top: Math.round((CANVAS - scaledH) / 2),
      },
    ])
    .webp({ quality: 92, alphaQuality: 100 })
    .toBuffer();
}

const pending = [];
const skipped = [];

for (const theme of themes) {
  for (const id of ICON_IDS) {
    const abs = path.join(iconsRoot, theme, `${id}.webp`);
    if (!existsSync(abs)) {
      skipped.push(`${theme}/${id}.webp — missing`);
      continue;
    }
    // Вход целиком в память: дескриптор закрывается сразу, файл свободен для записи.
    const input = readFileSync(abs);
    const output = await refit(input);
    pending.push({ abs, output, label: `${theme}/${id}.webp`, before: input.length });
  }
}

if (skipped.length) {
  console.warn(`Skipped ${skipped.length} file(s):\n${skipped.map((line) => `  - ${line}`).join('\n')}`);
}

if (dryRun) {
  console.log(`Dry run: ${pending.length} file(s) would be rewritten.`);
} else {
  // Отдельный проход записи — вся обработка sharp уже завершена, входы не заняты.
  for (const { abs, output, label, before } of pending) {
    writeFileSync(abs, output);
    console.log(`  ${label}: ${before} -> ${output.length} bytes`);
  }
  console.log(`Refit ${pending.length} icon(s) across ${themes.length} theme(s).`);
}
