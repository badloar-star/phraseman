#!/usr/bin/env node
// Пережатие webp под реальный размер отображения — Фаза 4 «Бандл-диеты».
//
// зачем: аудит scripts/audit_webp_display_sizes.mjs показал, что часть бандловых
// webp нарисована в 512–1024px, а UI рисует их максимум в 96–128dp (≤384px @3x).
// Здесь — ЯВНЫЙ вайтлист (папка → целевой длинный край в px), собранный вручную
// по коду потребителей и сверенный с контрактными тестами. Ничего вне вайтлиста
// скрипт не трогает.
//
// НЕ в вайтлисте и почему (не ослаблять без решения владельца):
//   - assets/images/level-spin-rewards/  — tests/level_spin_reward_assets.test.ts
//     требует ровно 512×512;
//   - assets/images/season/…/320×320     — tests/season_aura_asset_safe_area.test.ts
//     требует ровно 320×320;
//   - assets/images/home_menu/           — рисуется до 164dp (лига-вотермарк) —
//     текущие 384–512px НЕ избыточны;
//   - assets/images/avatar-auras/        — все 117 файлов 320×320 под сторожем
//     tests/season_aura_asset_safe_area.test.ts, И физически не избыточны:
//     кольцо ауры = size × APPROVED_AURA_RING_SCALE 2.28, при size=112
//     (SeasonGiftModal) это 255dp → 766px @3x, то есть 320px уже с дефицитом;
//   - файлы с грязным git-статусом — их прямо сейчас ведёт параллельная сессия
//     (asset-hygiene-safe.mjs), пропускаем молча в отчёт.
//
// Usage:
//   node scripts/resize_webp_to_display.mjs           # dry-run, только отчёт
//   node scripts/resize_webp_to_display.mjs --write   # применить

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

// зачем: sharp(путь) держит fd открытым в кэше libvips — на Windows это
// блокировало запись поверх того же файла (self-lock, UNKNOWN -4094).
// Работаем только через Buffer и без кэша.
sharp.cache(false);

// Целевой длинный край = максимальный dp отображения × 3 (@3x) + небольшой запас,
// округлённый вверх до «красивого» размера.
const TARGETS = [
  // Личный план: taskImage 48dp (prod) / 104dp (dev-экран) → 312px, берём 320.
  { dir: 'assets/images/personal_plan_tasks_fit/', targetPx: 320 },
  // Огонёк дружбы: FriendsChestCard 92dp → 276px, берём 288.
  { dir: 'assets/images/friends-shared-flame/', targetPx: 288 },
  // Аватары уровней (dalle): плитки 40dp, с запасом на профиль/карточку — 256.
  { dir: 'assets/images/levels/generated-v5-dalle/', targetPx: 256 },
  // Медали уроков: 128dp в lessons.tsx → 384.
  { file: 'assets/images/levels/zoloto.webp', targetPx: 384 },
  { file: 'assets/images/levels/serebro.webp', targetPx: 384 },
  { file: 'assets/images/levels/almaz.webp', targetPx: 384 },
  { file: 'assets/images/levels/rubin.webp', targetPx: 384 },
  { file: 'assets/images/levels/bronza.webp', targetPx: 384 },
  { file: 'assets/images/levels/izumrud.webp', targetPx: 384 },
  // Чипы тем: 22dp в пикере, запас на примерочную — 96.
  { dir: 'assets/theme-icons/', targetPx: 96 },
  // Категории достижений: 46dp → 138px, берём 160.
  { dir: 'assets/images/achievement_categories/', targetPx: 160 },
  // Иконка онбординга: 76dp → 228px, берём 256 (контракт проверяет только
  // существование .webp — путь не меняется).
  { file: 'assets/images/onboarding_icon_cutout.webp', targetPx: 256 },
  // Достижения (решение владельца 2026-08-24: уменьшить, НЕ выносить в CDN —
  // 70 статуэток остаются локальным fallback, чтобы полка никогда не пустовала).
  // Максимум показа — BadgeShield size=132 в модалке карточки; с учётом
  // uiScale<=1.22 это ~161dp → 483px @3x. Берём 512 с запасом.
  { dir: 'assets/images/achievements/', targetPx: 512 },
  // Иконки серий: StreakChainIcon до 72dp (крупнейший вызов), расчётный
  // максимум numLg 28 × FONT_SCALE 1.30 × uiScale 1.22 × 1.45 ≈ 64dp.
  // 72dp → 216px @3x; берём 256 с запасом.
  { dir: 'assets/images/streak_icons/', targetPx: 256 },
];

// Ресайз — это всегда ре-энкод; держим качество высоким, чтобы даунскейл
// не добавил артефактов (экономию даёт площадь, не квантование).
const WEBP_OPTS = { quality: 88, alphaQuality: 95, effort: 5, smartSubsample: true };
const MIN_SAVING_BYTES = 512;

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// зачем: на машине владельца файлы ассетов периодически держит другой процесс
// (антивирус/индексатор/параллельная сессия) — прямой writeFileSync падает с
// UNKNOWN (-4094). Пишем во временный файл и переименовываем с ретраями.
async function writeWithRetries(abs, buf) {
  const tmp = `${abs}.tmp_resize`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, abs);
      return true;
    } catch {
      try { fs.rmSync(tmp, { force: true }); } catch { /* мусор уберём следующей попыткой */ }
      await sleep(1200 * attempt);
    }
  }
  return false;
}

// зачем: porcelain схлопывает ПОЛНОСТЬЮ untracked-каталог в одну строку «?? dir/» —
// точный Set.has(file) такие файлы пропускал (инцидент Фазы 4: два целиком
// незакоммиченных каталога прошли фильтр). Храним записи и матчим по префиксу.
function gitDirtyEntries() {
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--', 'assets'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return out
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => l.slice(3).trim().replace(/^"|"$/g, '').replace(/\\/g, '/'));
  } catch {
    return []; // git недоступен — считаем всё чистым (например, CI-архив без .git)
  }
}

const isDirty = (entries, relPath) =>
  entries.some((e) => (e.endsWith('/') ? relPath.startsWith(e) : relPath === e));

function collectFiles() {
  const files = [];
  for (const t of TARGETS) {
    if (t.file) {
      files.push({ path: t.file, targetPx: t.targetPx });
      continue;
    }
    const abs = path.join(ROOT, t.dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true, recursive: true })) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.webp')) {
        files.push({
          path: rel(path.join(entry.parentPath ?? entry.path, entry.name)),
          targetPx: t.targetPx,
        });
      }
    }
  }
  return files;
}

const dirty = gitDirtyEntries();
const stats = { resized: 0, savedBytes: 0, skippedDirty: [], skippedSmallEnough: 0, skippedNoGain: 0, missing: 0, lockedByOtherProcess: [] };

for (const { path: relPath, targetPx } of collectFiles()) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    stats.missing++;
    continue;
  }
  if (isDirty(dirty, relPath)) {
    stats.skippedDirty.push(relPath);
    continue;
  }
  const srcBuf = fs.readFileSync(abs);
  const before = srcBuf.length;
  const meta = await sharp(srcBuf).metadata();
  const longSide = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (!longSide || longSide <= targetPx) {
    stats.skippedSmallEnough++;
    continue;
  }
  const out = await sharp(srcBuf)
    .resize({ width: targetPx, height: targetPx, fit: 'inside', withoutEnlargement: true })
    .webp(WEBP_OPTS)
    .toBuffer();
  if (before - out.length < MIN_SAVING_BYTES) {
    stats.skippedNoGain++;
    continue;
  }
  if (WRITE && !(await writeWithRetries(abs, out))) {
    stats.lockedByOtherProcess.push(relPath);
    continue;
  }
  stats.resized++;
  stats.savedBytes += before - out.length;
  console.log(
    `${WRITE ? 'resized' : 'would resize'}  ${relPath}  ${longSide}px→${targetPx}px  ${(before / 1024).toFixed(1)}→${(out.length / 1024).toFixed(1)} КБ`,
  );
}

console.log('');
console.log(
  JSON.stringify(
    {
      mode: WRITE ? 'write' : 'dry-run',
      resized: stats.resized,
      mbSaved: (stats.savedBytes / (1024 * 1024)).toFixed(2),
      skippedDirtyOtherSession: stats.skippedDirty,
      skippedSmallEnough: stats.skippedSmallEnough,
      skippedNoGain: stats.skippedNoGain,
      missing: stats.missing,
      lockedByOtherProcess: stats.lockedByOtherProcess,
    },
    null,
    2,
  ),
);
