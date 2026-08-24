#!/usr/bin/env node
/**
 * upload_avatar_aura_images_to_storage.mjs
 *
 * зачем: 117 слоёв аур аватара (2.50 МБ) ехали в нативный бинарь ради колец,
 * которые видит лишь тот, кто ауру уже получил или купил. Скрипт заливает их в
 * Firebase Storage, а рантайм скачивает и держит в дисковом кэше expo-image
 * (см. app/avatar_aura_remote_art.ts). Фаза 4 «Бандл-диеты», решение владельца
 * 2026-08-24.
 *
 * ВАЖНО — БАЙТ-В-БАЙТ, БЕЗ ПЕРЕЖАТИЯ:
 *   tests/avatar_aura_v2_assets.test.ts сторожит точные sha256 всех 117 слоёв и
 *   геометрию 320×320 (padding ≥ 23 px, радиус ≤ 137.71, центр ≤ 0.71 px) —
 *   кольцо рисуется как size × 2.28 и запаса по пикселям НЕТ. Поэтому здесь нет
 *   ни sharp, ни resize, ни смены качества: в облако уезжает ровно тот файл,
 *   что лежит в репозитории. Проверка sha256 после заливки — обязательный шаг.
 *
 * «Ядро» (constants/avatar_aura_core_art.ts — aura-plus / aura-pro) остаётся в
 * бандле и сюда НЕ попадает: это ауры подписки, их видят сразу после оплаты,
 * когда сети может не быть.
 *
 * Storage rules: /aura-images/** публичен на чтение (см. storage.rules).
 * Правила надо задеплоить ДО первого запуска: firebase deploy --only storage
 *
 * Auth: OAuth-токен из firebase-tools через scripts/_mint_fb_token.mjs
 *       (требует PHRASEMAN_FIREBASE_TOOLS_CLIENT_SECRET в окружении).
 *
 * Run:
 *   node scripts/upload_avatar_aura_images_to_storage.mjs --dry
 *   node scripts/upload_avatar_aura_images_to_storage.mjs
 *   node scripts/upload_avatar_aura_images_to_storage.mjs --verify   # только сверка sha256 по публичным URL
 *   --concurrency=8   параллельные загрузки (по умолчанию 8)
 *   --force           перезалить, даже если объект уже есть
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const STORAGE_PREFIX = 'aura-images';
// Версия арта — та же, что зашита в constants/avatar_aura_image_urls.ts.
// Читаем её оттуда, чтобы путь заливки и путь скачивания не могли разойтись.
const URLS_FILE = path.join(ROOT, 'constants', 'avatar_aura_image_urls.ts');
const ART_VERSION = (() => {
  const m = fs.readFileSync(URLS_FILE, 'utf8').match(/AVATAR_AURA_ART_VERSION = '([^']+)'/);
  if (!m) { console.error('Не нашёл AVATAR_AURA_ART_VERSION в constants/avatar_aura_image_urls.ts'); process.exit(1); }
  return m[1];
})();
const SRC_DIR = path.join(ROOT, 'assets/images/avatar-auras');
const CORE_FILE = path.join(ROOT, 'constants', 'avatar_aura_core_art.ts');
const LAYERS = ['base', 'flow', 'accents'];

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const VERIFY_ONLY = process.argv.includes('--verify');
const concArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Number(concArg ? concArg.split('=')[1] : 8) || 8);

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Ядро читаем из того же файла, что и рантайм — один источник правды. */
function readCoreAuraIds() {
  const src = fs.readFileSync(CORE_FILE, 'utf8');
  const ids = [...src.matchAll(/^\s*'(aura-[a-z0-9-]+)',/gm)].map((m) => m[1]);
  if (!ids.length) {
    console.error(`Не удалось прочитать ядро из ${path.relative(ROOT, CORE_FILE)}`);
    process.exit(1);
  }
  return new Set(ids);
}

/** Все слои всех аур, кроме ядра. Порядок стабильный — детерминированная карта. */
function collectLayers(coreIds) {
  const auraIds = fs.readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('aura-'))
    .map((entry) => entry.name)
    .sort();

  const out = [];
  for (const auraId of auraIds) {
    if (coreIds.has(auraId)) continue;
    for (const layer of LAYERS) {
      const absPath = path.join(SRC_DIR, auraId, `${layer}.webp`);
      if (!fs.existsSync(absPath)) {
        console.error(`Отсутствует слой: ${auraId}/${layer}.webp`);
        process.exit(1);
      }
      out.push({ auraId, layer, absPath, key: `${auraId}/${layer}` });
    }
  }
  return out;
}

const storageObjectPath = (key) => `${STORAGE_PREFIX}/${ART_VERSION}/${key}.webp`;

/**
 * Публичный URL объекта. Токен не нужен: правило
 * `match /aura-images/{allPaths=**} { allow get: if true; }` открывает чтение,
 * поэтому адрес выводится из пути — ровно как в constants/avatar_aura_image_urls.ts.
 */
function downloadUrl(objectPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

/**
 * Сверяет каждый публичный URL с локальным файлом побайтово (по sha256).
 * зачем: кольцо ауры сторожат точные хэши — молчаливое пережатие на любой
 * стороне сломало бы геометрию, и мы должны узнать об этом здесь, а не на
 * устройстве пользователя.
 */
async function verifyAgainstLocal(layers) {
  let ok = 0, bad = 0;
  let idx = 0;
  async function worker() {
    while (idx < layers.length) {
      const item = layers[idx++];
      const url = downloadUrl(storageObjectPath(item.key));
      try {
        const res = await fetch(url);
        if (!res.ok) { bad++; console.error(`HTTP ${res.status}  ${item.key}`); continue; }
        const remote = Buffer.from(await res.arrayBuffer());
        const local = fs.readFileSync(item.absPath);
        if (sha256(remote) !== sha256(local)) {
          bad++;
          console.error(`SHA MISMATCH  ${item.key} (local ${local.length}B vs remote ${remote.length}B)`);
        } else ok++;
      } catch (e) {
        bad++;
        console.error(`FAIL ${item.key}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`
Verify: ok:${ok} mismatched:${bad} of ${layers.length}`);
  if (bad) process.exit(1);
  console.log('Все слои побайтово совпадают с репозиторием.');
}

async function main() {
  const coreIds = readCoreAuraIds();
  const layers = collectLayers(coreIds);
  const totalBytes = layers.reduce((sum, l) => sum + fs.statSync(l.absPath).size, 0);
  console.log(`Ядро в бандле: ${[...coreIds].join(', ')}`);
  console.log(`К выгрузке: ${layers.length} слоёв, ${(totalBytes / 1048576).toFixed(2)} МБ (без пережатия).`);

  if (VERIFY_ONLY) {
    await verifyAgainstLocal(layers);
    return;
  }

  if (DRY) {
    console.log(`DRY run — ничего не залито, карта не записана.`);
    console.log(`Пример объекта: gs://${BUCKET}/${storageObjectPath(layers[0].key)}`);
    return;
  }

  let accessToken = null;
  let tokenMintedAt = 0;
  async function getToken() {
    const now = Date.now();
    if (accessToken && now - tokenMintedAt < 45 * 60 * 1000) return accessToken;
    const r = spawnSync('node', [path.join(ROOT, 'scripts', '_mint_fb_token.mjs')], { encoding: 'utf8' });
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
    console.error('\nНе удалось авторизоваться в Firebase Storage.');
    console.error('Нужен `firebase login` для badloar@gmail.com (проект phraseman-ea0b3)');
    console.error('и PHRASEMAN_FIREBASE_TOOLS_CLIENT_SECRET в окружении.');
    console.error(`\nОшибка: ${e.message}`);
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
          // зачем: слой ауры неизменен (его sha256 сторожит тест) — годовой
          // immutable-кэш убирает повторные обращения к Storage и трафик.
          cacheControl: 'public, max-age=31536000, immutable',
        }),
      },
    );
    if (!patch.ok) throw new Error(`patch ${patch.status}: ${(await patch.text()).slice(0, 200)}`);
  }

  let done = 0, uploaded = 0, skipped = 0, failed = 0;

  async function processLayer(item) {
    const objectPath = storageObjectPath(item.key);
    try {
      if (!FORCE && (await objectExists(objectPath))) {
        skipped++;
        return;
      }
      await uploadObject(objectPath, item.absPath);
      uploaded++;
    } catch (e) {
      console.error(`FAIL ${item.key}: ${e.message}`);
      failed++;
    } finally {
      done++;
      if (done % 20 === 0 || done === layers.length) {
        process.stdout.write(`\r  ${done}/${layers.length} (up:${uploaded} skip:${skipped} fail:${failed})   `);
      }
    }
  }

  let idx = 0;
  async function worker() {
    while (idx < layers.length) await processLayer(layers[idx++]);
  }
  console.log(`Заливка в gs://${BUCKET}/${STORAGE_PREFIX}/ (concurrency ${CONCURRENCY})...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');

  if (failed > 0) {
    console.error(`\n${failed} слоёв не залились. Карта записана для остальных — перезапуск докачает (resumable).`);
  }

  // Обязательная сверка: карта бесполезна, если байты в облаке не те.
  console.log('\nСверяю публичные URL с репозиторием побайтово...');
  await verifyAgainstLocal(layers);

  console.log(`\nГотово. uploaded:${uploaded} skipped:${skipped} failed:${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
