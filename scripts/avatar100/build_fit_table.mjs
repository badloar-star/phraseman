#!/usr/bin/env node
// Пересобирает constants/avatar100_fits.ts по реальным файлам Avatar100.
//
// зачем: вырезы генерируются по одному, и силуэт у них гуляет в 2.1 раза —
// без общей подгонки одни существа в гексе крошечные, другие огромные.
// Правило взято из макета-эталона (.codex-tmp/avatar-regeneration-v3/
// final-showcase/index.html, функция fitAvatar): привести силуэт каждого
// выреза к одному размеру, прижать низ к нижней V, отцентрировать по X.
//
// Цели подобраны по сравнению вариантов на реальном рендерере (см.
// tmp/avatar100-showcase-review/COMPARE.png): при силуэте 1.10 портрет упирался
// в края и гекс переставал читаться, при едином 1.62 возвращался разнобой.
// 0.92/0.90 давали крупный портрет, но между низом существа и нижней точкой
// гекса оставалась щель в 6.5% высоты — на телефоне это читалось как «аватар
// висит в воздухе» (владелец, 2026-08-27). Низ прижат к самой нижней точке
// гекса (96.5%), силуэт поднят до 1.00 — существа стали чуть крупнее и садятся
// на нижнюю V без зазора.
//
// Запуск: node scripts/avatar100/build_fit_table.mjs

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const ASSET_DIR = path.join(ROOT, 'admin', 'v2', 'avatars', 'avatar100-v1');
const OUT_FILE = path.join(ROOT, 'constants', 'avatar100_fits.ts');

const SAMPLE = 256;
const ALPHA_THRESHOLD = 12;
const TARGET_SILHOUETTE = 1.00;
const TARGET_BOTTOM = 0.965;
const MAX_SCALE = 2.55;
const MIN_SCALE = 1.0;

/** Габариты непрозрачной части в долях кадра. */
async function measure(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .resize(SAMPLE, SAMPLE, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let left = SAMPLE;
  let top = SAMPLE;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < SAMPLE; y += 1) {
    for (let x = 0; x < SAMPLE; x += 1) {
      if ((data[(y * SAMPLE + x) * info.channels + 3] ?? 0) <= ALPHA_THRESHOLD) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) return null;

  return {
    width: (right - left + 1) / SAMPLE,
    height: (bottom - top + 1) / SAMPLE,
    centerX: (left + right + 1) / (2 * SAMPLE),
    sourceBottom: (bottom + 1) / SAMPLE,
  };
}

function fitFor(bounds) {
  const silhouette = Math.max(bounds.width, bounds.height);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, TARGET_SILHOUETTE / silhouette));
  return {
    scale: Number(scale.toFixed(3)),
    translateX: Number((0.5 - (0.5 + (bounds.centerX - 0.5) * scale)).toFixed(4)),
    translateY: Number((TARGET_BOTTOM - (0.5 + (bounds.sourceBottom - 0.5) * scale)).toFixed(4)),
  };
}

const entries = [];
for (const file of fs.readdirSync(ASSET_DIR).sort()) {
  const match = /^custom-idea-(\d+)-(black|white)\.webp$/.exec(file);
  if (!match) continue;
  const bounds = await measure(path.join(ASSET_DIR, file));
  if (!bounds) continue;
  entries.push({ key: `custom-gen-${match[1]}:${match[2]}`, id: Number(match[1]), fit: fitFor(bounds) });
}

entries.sort((left, right) => left.id - right.id || left.key.localeCompare(right.key));

const body = entries
  .map(({ key, fit }) =>
    `  '${key}': { scale: ${fit.scale}, translateX: ${fit.translateX}, translateY: ${fit.translateY} },`)
  .join('\n');

fs.writeFileSync(OUT_FILE, `// АВТОГЕНЕРАЦИЯ — не править руками.
// Источник: scripts/avatar100/build_fit_table.mjs по файлам admin/v2/avatars/avatar100-v1/.
//
// зачем: макет-эталон приводит КАЖДЫЙ вырез к одному видимому силуэту, иначе
// одни существа выглядят крошечными, а другие огромными (замер по 106 файлам
// дал разброс 2.1x). Формула та же, что в макете: силуэт -> TARGET_SILHOUETTE,
// низ существа -> TARGET_BOTTOM, центр по X. Доли, а не пиксели, — размер гекса
// на разных экранах разный.

export type Avatar100Fit = Readonly<{ scale: number; translateX: number; translateY: number }>;

/** Доля гекса, которую занимает силуэт существа. */
export const AVATAR100_TARGET_SILHOUETTE = ${TARGET_SILHOUETTE};
/** Низ существа прижат сюда — «воздуха» над нижней V не остаётся. */
export const AVATAR100_TARGET_BOTTOM = ${TARGET_BOTTOM};

export const AVATAR100_FITS: Readonly<Record<string, Avatar100Fit>> = Object.freeze({
${body}
});
`);

console.log(`avatar100_fits.ts: ${entries.length} записей`);
