#!/usr/bin/env node
/**
 * prepare_achievement_images_for_storage.mjs
 *
 * зачем: иконки достижений (6.63 MB, треть всего веса ассетов) переезжают в
 * Firebase Storage — так же, как коллекционные карточки и аудио планов. Этот
 * скрипт готовит СЖАТЫЕ копии в tmp/achievements_upload/, которые потом зальёт
 * upload_achievement_images_to_storage.mjs.
 *
 * ВАЖНО: часть иконок остаётся в бандле (см. constants/achievementCoreArt.ts) —
 * это «первые» достижения, которые новичок получает в первые дни. Они обязаны
 * показываться мгновенно и офлайн, поэтому в облако НЕ выносятся и здесь
 * пропускаются.
 *
 * Иконка рендерится максимум в ~90pt (тост/экран), т.е. 270px на 3x. Берём 320px
 * с запасом — это заметно меньше текущих исходников.
 *
 * Run:
 *   node scripts/prepare_achievement_images_for_storage.mjs          # подготовить
 *   node scripts/prepare_achievement_images_for_storage.mjs --dry    # только отчёт
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'assets/images/achievements');
const OUT_DIR = path.join(ROOT, 'tmp/achievements_upload');
const DRY = process.argv.includes('--dry');

const MAX_SIDE = 320;
const QUALITY = 78;

// Единый источник правды о том, что остаётся в бандле.
const coreSrc = fs.readFileSync(path.join(ROOT, 'constants/achievementCoreArt.ts'), 'utf8');
const CORE_IDS = new Set([...coreSrc.matchAll(/^\s*'([a-z0-9_]+)',/gm)].map((m) => m[1]));
if (!CORE_IDS.size) {
  console.error('Не удалось прочитать CORE-список из constants/achievementCoreArt.ts');
  process.exit(1);
}

const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.webp'));
if (!DRY) fs.mkdirSync(OUT_DIR, { recursive: true });

let before = 0, after = 0, skipped = 0, done = 0;
for (const file of files) {
  const id = file.replace(/\.webp$/, '');
  if (CORE_IDS.has(id)) { skipped++; continue; }

  const abs = path.join(SRC_DIR, file);
  const input = fs.readFileSync(abs);
  const orig = input.length;
  before += orig;

  const meta = await sharp(input).metadata();
  let pipeline = sharp(input);
  if (Math.max(meta.width || 0, meta.height || 0) > MAX_SIDE) {
    pipeline = pipeline.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
  }
  const buf = await pipeline.webp({ quality: QUALITY, alphaQuality: 90, effort: 6 }).toBuffer();
  const out = buf.length < orig ? buf : input;
  after += out.length;
  if (!DRY) fs.writeFileSync(path.join(OUT_DIR, file), out);
  done++;
}

const MB = (v) => (v / 1048576).toFixed(2);
console.log(`kept in bundle (core): ${skipped}`);
console.log(`prepared for upload:   ${done}`);
console.log(`upload payload: ${MB(before)} MB -> ${MB(after)} MB`);
console.log(DRY ? '\nDRY RUN — файлы не записаны.' : `\nwritten to ${path.relative(ROOT, OUT_DIR)}`);
