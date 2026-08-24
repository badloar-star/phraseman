#!/usr/bin/env node
/**
 * prune_achievement_images_in_storage.mjs
 *
 * зачем: когда достижение удаляется из app/achievements.ts, его арт остаётся
 * висеть в Firebase Storage мёртвым весом.
 *
 * Скрипт перечисляет объекты в бакете и удаляет те, которым в приложении больше
 * не соответствует ни одно достижение. Карту URL править не нужно: адрес
 * выводится из id формулой (constants/achievement_image_urls.ts), поэтому
 * рассинхронизации «карта против бакета» больше не существует.
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

const mintToken = () => {
  const r = spawnSync('node', [path.join(__dirname, '_mint_fb_token.mjs')], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout?.trim()) throw new Error(`token mint failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
};

const token = mintToken();

/** Что реально лежит в бакете под префиксом — источник правды о «сиротах». */
async function listStoredIds() {
  const ids = [];
  let pageToken = '';
  do {
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`
      + `?prefix=${encodeURIComponent(STORAGE_PREFIX + '/')}&fields=items(name),nextPageToken`
      + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`list ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    for (const item of json.items || []) {
      const m = item.name.match(/^achievement-images\/([a-z0-9_]+)\.webp$/);
      if (m) ids.push(m[1]);
    }
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return ids;
}

const stored = await listStoredIds();
const orphans = stored.filter((id) => !LIVE.has(id));

console.log(`живых достижений: ${LIVE.size}`);
console.log(`объектов в бакете: ${stored.length}`);
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
