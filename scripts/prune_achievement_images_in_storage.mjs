#!/usr/bin/env node
/**
 * prune_achievement_images_in_storage.mjs
 *
 * зачем: когда достижение удаляется из app/achievements.ts, его арт остаётся
 * висеть и в Firebase Storage, и в constants/achievementImageUrlMap.generated.ts.
 * Это мёртвый вес: занимает место в бакете и раздувает карту URL, которая
 * целиком лежит в бандле приложения.
 *
 * Скрипт сверяет карту URL с реальным списком достижений и удаляет всё, чего
 * в приложении больше нет: сначала объекты в Storage, затем строки в карте.
 *
 * Run:
 *   node scripts/prune_achievement_images_in_storage.mjs --dry   (только отчёт)
 *   node scripts/prune_achievement_images_in_storage.mjs         (удалить)
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const STORAGE_PREFIX = 'achievement-images';
const MAP_TS = path.join(ROOT, 'constants', 'achievementImageUrlMap.generated.ts');

const DRY = process.argv.includes('--dry');

// Живые id — единственный источник правды.
const achievementsSrc = fs.readFileSync(path.join(ROOT, 'app', 'achievements.ts'), 'utf8');
const LIVE = new Set(
  [...achievementsSrc.matchAll(/id:\s*'([a-z0-9_]+)'\s*,[^\n]*\bcategory:/g)].map((m) => m[1]),
);
if (LIVE.size < 50) {
  console.error(`Подозрительно мало живых достижений (${LIVE.size}) — прерываю, чтобы не снести лишнее.`);
  process.exit(1);
}

const mapSrc = fs.readFileSync(MAP_TS, 'utf8');
const mapped = [...mapSrc.matchAll(/^\s{2}"([a-z0-9_]+)":\s*"([^"]+)"/gm)].map((m) => m[1]);
const orphans = mapped.filter((id) => !LIVE.has(id));

console.log(`живых достижений: ${LIVE.size}`);
console.log(`записей в карте URL: ${mapped.length}`);
console.log(`осиротевших (арт есть, достижения нет): ${orphans.length}`);
if (orphans.length) console.log('  ' + orphans.join(', '));

if (!orphans.length) {
  console.log('\nНечего удалять — карта совпадает со списком достижений.');
  process.exit(0);
}

if (DRY) {
  console.log('\nDRY RUN — ничего не удалено.');
  process.exit(0);
}

const mintToken = () => {
  const r = spawnSync('node', [path.join(__dirname, '_mint_fb_token.mjs')], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout?.trim()) throw new Error(`token mint failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
};

const token = mintToken();
let deleted = 0;
let missing = 0;
let failed = 0;

for (const id of orphans) {
  const objectPath = `${STORAGE_PREFIX}/${id}.webp`;
  const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}`;
  try {
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) { missing++; continue; }
    if (!res.ok) { failed++; console.error(`FAIL ${id}: ${res.status}`); continue; }
    deleted++;
  } catch (e) {
    failed++;
    console.error(`FAIL ${id}: ${e.message}`);
  }
}

console.log(`\nStorage: удалено ${deleted}, отсутствовало ${missing}, ошибок ${failed}`);

// Чистим карту URL: убираем строки осиротевших id.
const orphanSet = new Set(orphans);
const kept = mapSrc
  .split('\n')
  .filter((line) => {
    const m = line.match(/^\s{2}"([a-z0-9_]+)":\s*"https:/);
    return !(m && orphanSet.has(m[1]));
  })
  .join('\n')
  .replace(/\/\/ Entries: \d+\./, `// Entries: ${mapped.length - orphans.length}.`);

fs.writeFileSync(MAP_TS, kept, 'utf8');
console.log(`Карта URL обновлена: ${mapped.length} -> ${mapped.length - orphans.length} записей`);
