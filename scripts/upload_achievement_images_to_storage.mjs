#!/usr/bin/env node
/**
 * upload_achievement_images_to_storage.mjs
 *
 * зачем: иконки достижений занимали 6.63 MB — треть всего веса ассетов бандла.
 * Этот скрипт переносит «неядровые» иконки в Firebase Storage, зеркаля
 * scripts/upload_collectible_images_to_storage.mjs.
 *
 * Что делает:
 *   1. Читает сжатые webp из tmp/achievements_upload/<id>.webp
 *      (готовит scripts/prepare_achievement_images_for_storage.mjs: 320px, q78).
 *   2. Заливает каждую в gs://<bucket>/achievement-images/<id>.webp.
 *   3. Проверяет, что каждый объект читается по публичному URL.
 *
 * Карта URL не пишется: адрес выводится из id формулой
 * (constants/achievement_image_urls.ts). Прежняя AUTO-GENERATED карта
 * перечисляла лишь 35 статуэток из 70 и молча расходилась с бакетом.
 *
 * Иконки «ядра» (constants/achievementCoreArt.ts) остаются в бандле и сюда
 * не попадают — они должны работать офлайн с первого кадра.
 *
 * Storage rules: /achievement-images/** должен быть публичным на чтение
 * (см. storage.rules).
 *
 * Auth: OAuth-токен из firebase-tools через scripts/_mint_fb_token.mjs.
 *
 * Run:
 *   node scripts/upload_achievement_images_to_storage.mjs --dry
 *   node scripts/upload_achievement_images_to_storage.mjs
 *   --concurrency=8   параллельные загрузки (по умолчанию 8)
 *   --force           перезалить, даже если объект уже есть
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
const FORCE = process.argv.includes('--force');
const srcArg = process.argv.find((a) => a.startsWith('--src='));
const SRC_DIR = path.join(ROOT, srcArg ? srcArg.split('=')[1] : 'tmp/achievements_upload');
const concArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Number(concArg ? concArg.split('=')[1] : 8) || 8);

function collectImages() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source dir not found: ${SRC_DIR}\nRun prepare_achievement_images_for_storage.mjs first.`);
    process.exit(1);
  }
  return fs.readdirSync(SRC_DIR)
    .filter((f) => f.toLowerCase().endsWith('.webp'))
    .map((f) => ({ id: path.basename(f, '.webp'), absPath: path.join(SRC_DIR, f) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const storageObjectPath = (id) => `${STORAGE_PREFIX}/${id}.webp`;

/**
 * Публичный URL объекта. Токен не нужен: правило
 * `match /achievement-images/{allPaths=**} { allow get: if true; }` открывает
 * чтение, поэтому адрес выводится из пути — ровно как в рантайме
 * (constants/achievement_image_urls.ts).
 */
function downloadUrl(objectPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

async function main() {
  const imgs = collectImages();
  console.log(`Found ${imgs.length} achievement images in ${path.relative(ROOT, SRC_DIR)}.`);
  if (imgs.length === 0) process.exit(1);

  if (DRY) {
    let total = 0;
    for (const i of imgs) total += fs.statSync(i.absPath).size;
    console.log(`Total to upload: ${(total / 1048576).toFixed(2)} MB (avg ${(total / imgs.length / 1024) | 0} KB)`);
    console.log('DRY run — ничего не залито.');
    return;
  }

  let accessToken = null;
  let tokenMintedAt = 0;
  async function getToken() {
    const now = Date.now();
    if (accessToken && now - tokenMintedAt < 45 * 60 * 1000) return accessToken;
    const r = spawnSync('node', [path.join(__dirname, '_mint_fb_token.mjs')], { encoding: 'utf8' });
    if (r.status !== 0 || !r.stdout?.trim()) throw new Error(`token mint failed: ${r.stderr || r.stdout}`);
    accessToken = r.stdout.trim();
    tokenMintedAt = now;
    return accessToken;
  }

  try {
    const tok = await getToken();
    const probe = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!probe.ok) throw new Error(`bucket probe ${probe.status}: ${(await probe.text()).slice(0, 200)}`);
  } catch (e) {
    console.error('\nCould not authenticate to Firebase Storage.');
    console.error('Ensure `firebase login` is active for badloar@gmail.com (project phraseman-ea0b3).');
    console.error(`\nUnderlying error: ${e.message}`);
    process.exit(1);
  }

  async function objectExists(objectPath) {
    const tok = await getToken();
    const r = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?fields=metadata`,
      { headers: { Authorization: `Bearer ${tok}` } },
    );
    if (r.status === 404) return null;
    if (!r.ok) return null;
    const j = await r.json();
    return j?.metadata?.firebaseStorageDownloadTokens?.split(',')[0] || true;
  }

  async function uploadObject(objectPath, srcPath) {
    const tok = await getToken();
    const data = fs.readFileSync(srcPath);
    const upUrl =
      `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o` +
      `?uploadType=media&name=${encodeURIComponent(objectPath)}`;
    const up = await fetch(upUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'image/webp' },
      body: data,
    });
    if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 200)}`);
    const patch = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'image/webp',
          // зачем: арт достижения неизменен — годовой immutable-кэш убирает
          // повторные обращения к Storage и удешевляет трафик.
          cacheControl: 'public, max-age=31536000, immutable',
        }),
      },
    );
    if (!patch.ok) throw new Error(`patch ${patch.status}: ${(await patch.text()).slice(0, 200)}`);
  }

  let done = 0, uploaded = 0, skipped = 0, failed = 0;

  async function processImage(img) {
    const objectPath = storageObjectPath(img.id);
    try {
      if (!FORCE && (await objectExists(objectPath))) {
        skipped++;
        return;
      }
      await uploadObject(objectPath, img.absPath);
      uploaded++;
    } catch (e) {
      console.error(`FAIL ${img.id}: ${e.message}`);
      failed++;
    } finally {
      done++;
      if (done % 25 === 0 || done === imgs.length) {
        process.stdout.write(`\r  ${done}/${imgs.length} (up:${uploaded} skip:${skipped} fail:${failed})   `);
      }
    }
  }

  let idx = 0;
  async function worker() {
    while (idx < imgs.length) await processImage(imgs[idx++]);
  }
  console.log(`Uploading to gs://${BUCKET}/${STORAGE_PREFIX}/ (concurrency ${CONCURRENCY})...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');

  if (failed > 0) console.error(`\n${failed} images failed. Re-run to retry (resumable).`);

  // зачем: объект бесполезен, если приложение не может прочитать его публично.
  // Прежняя карта перечисляла 35 записей из 70 и молча расходилась с бакетом;
  // теперь расходиться нечему (адрес — формула), но доступность подтверждаем
  // ЗДЕСЬ, до того как из реестра выпилят require.
  console.log(`\nПроверяю публичную доступность...`);
  let reachable = 0, unreachable = 0;
  let vIdx = 0;
  async function verifier() {
    while (vIdx < imgs.length) {
      const img = imgs[vIdx++];
      try {
        const res = await fetch(downloadUrl(storageObjectPath(img.id)));
        if (res.ok) reachable++;
        else { unreachable++; console.error(`HTTP ${res.status}  ${img.id}`); }
      } catch (e) {
        unreachable++;
        console.error(`FAIL ${img.id}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, verifier));
  console.log(`Публично доступны: ${reachable}/${imgs.length}, недоступны: ${unreachable}`);

  console.log(`\nDone. uploaded:${uploaded} skipped:${skipped} failed:${failed}`);
  if (unreachable > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
