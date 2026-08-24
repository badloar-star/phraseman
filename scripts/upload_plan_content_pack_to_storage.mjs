// ════════════════════════════════════════════════════════════════════════════
// upload_plan_content_pack_to_storage.mjs — Фаза 1 «Бандл-диеты», шаг 2:
// выгрузка пака (manifest.json + index.json + plans/<plan>/day-NNN.json),
// собранного scripts/export_plan_content_packs.mjs, в Firebase Storage.
//
// зачем: рантайм (app/plan_content_remote_registration.ts) качает пак по
// публичным URL Firebase Storage; storage.rules уже дают публичное чтение для
// /course-packs/** — поэтому кладём под course-packs/plan_content/en/ru/<версия>
// и НИКАКОГО деплоя правил не нужно. Префикс версионный и неизменяемый
// (immutable cache-control): смена контента = новая версия + новый префикс,
// клиенты со старой регистрацией продолжают читать свою версию без гонок.
//
// Firebase-экономия: 0 чтений Firestore; Storage+CDN c
// Cache-Control: immutable, max-age=1год — каждый объект скачивается клиентом
// один раз на версию, дальше живёт в дисковом кэше приложения.
//
// Auth: тот же проверенный путь, что у upload_plan_audio_to_storage.mjs —
// scripts/_mint_fb_token.mjs (firebase login + PHRASEMAN_FIREBASE_TOOLS_CLIENT_SECRET).
//
// Запуск:
//   node scripts/upload_plan_content_pack_to_storage.mjs --pack-dir <dir> [--dry]
//     [--force] [--concurrency=6]
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const STORAGE_PREFIX_ROOT = 'course-packs/plan_content';

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const concArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Number(concArg ? concArg.split('=')[1] : 6) || 6);

function readArg(flag) {
  const withEq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (withEq) return withEq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// ── пак с диска ─────────────────────────────────────────────────────────────
const packDirArg = readArg('--pack-dir');
if (!packDirArg) fail('pass --pack-dir <dir written by export_plan_content_packs.mjs>');
const packDir = path.resolve(ROOT, packDirArg);
const manifestPath = path.join(packDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail(`no manifest.json in ${packDir}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.surface !== 'plan_content' || manifest.studyTarget !== 'en' || manifest.sourceLocale !== 'ru') {
  fail('manifest identity is not en/ru/plan_content — wrong pack dir?');
}
if (!/^[A-Za-z0-9._-]+$/.test(String(manifest.contentVersion))) fail('manifest contentVersion unusable in a path');

const index = JSON.parse(fs.readFileSync(path.join(packDir, 'index.json'), 'utf8'));
const relativeFiles = ['manifest.json', 'index.json', ...index.entries.map((e) => e.path)];
for (const relative of relativeFiles) {
  if (!fs.existsSync(path.join(packDir, relative))) fail(`pack file missing on disk: ${relative}`);
}

const storagePrefix = `${STORAGE_PREFIX_ROOT}/en/ru/${manifest.contentVersion}`;
const totalBytes = relativeFiles.reduce((sum, f) => sum + fs.statSync(path.join(packDir, f)).size, 0);

console.log(`Pack:    ${path.relative(ROOT, packDir)}`);
console.log(`Target:  gs://${BUCKET}/${storagePrefix}/`);
console.log(`Objects: ${relativeFiles.length} · ${(totalBytes / 1048576).toFixed(2)} MB`);

if (DRY) {
  console.log('DRY run — ничего не выгружено.');
  process.exit(0);
}

// ── auth (как в upload_plan_audio_to_storage.mjs) ───────────────────────────
let accessToken = null;
let tokenMintedAt = 0;
function getToken() {
  const now = Date.now();
  if (accessToken && now - tokenMintedAt < 45 * 60 * 1000) return accessToken;
  const r = spawnSync('node', [path.join(__dirname, '_mint_fb_token.mjs')], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout?.trim()) {
    throw new Error(`token mint failed: ${r.stderr || r.stdout}`);
  }
  accessToken = r.stdout.trim();
  tokenMintedAt = now;
  return accessToken;
}

async function objectExists(objectPath) {
  const r = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?fields=size`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  if (r.status === 404) return false;
  if (!r.ok) return false;
  return true;
}

async function uploadObject(objectPath, absolutePath) {
  const data = fs.readFileSync(absolutePath);
  const upUrl =
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectPath)}`;
  const up = await fetch(upUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: data,
  });
  if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 200)}`);
  const patch = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: 'application/json',
        // Версионный префикс = объект неизменяемый: клиент и CDN кэшируют год.
        cacheControl: 'public, max-age=31536000, immutable',
      }),
    },
  );
  if (!patch.ok) throw new Error(`patch ${patch.status}: ${(await patch.text()).slice(0, 200)}`);
}

// ── выгрузка с пулом ────────────────────────────────────────────────────────
try {
  getToken();
  const probe = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!probe.ok) throw new Error(`bucket probe ${probe.status}: ${(await probe.text()).slice(0, 200)}`);
} catch (e) {
  console.error('\nНе удалось авторизоваться в Firebase Storage.');
  console.error('Нужно: firebase login (badloar@gmail.com) + PHRASEMAN_FIREBASE_TOOLS_CLIENT_SECRET в окружении.');
  console.error(`Ошибка: ${e.message}`);
  process.exit(1);
}

let done = 0, uploaded = 0, skipped = 0, failed = 0;
let cursor = 0;
async function worker() {
  while (cursor < relativeFiles.length) {
    const relative = relativeFiles[cursor++];
    const objectPath = `${storagePrefix}/${relative.replace(/\\/g, '/')}`;
    try {
      if (!FORCE && (await objectExists(objectPath))) {
        skipped++;
      } else {
        await uploadObject(objectPath, path.join(packDir, relative));
        uploaded++;
      }
    } catch (e) {
      console.error(`FAIL ${relative}: ${e.message}`);
      failed++;
    } finally {
      done++;
      if (done % 25 === 0 || done === relativeFiles.length) {
        process.stdout.write(`\r  ${done}/${relativeFiles.length} (up:${uploaded} skip:${skipped} fail:${failed})   `);
      }
    }
  }
}
console.log(`Uploading (concurrency ${CONCURRENCY})...`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
process.stdout.write('\n');
if (failed > 0) fail(`${failed} objects failed — перезапусти скрипт (докачка resumable по objectExists)`);

// ── проверка ПУБЛИЧНЫМИ URL (ровно так будет качать приложение) ─────────────
function publicUrl(objectPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

async function verifyPublic(relative) {
  const local = fs.readFileSync(path.join(packDir, relative));
  const res = await fetch(publicUrl(`${storagePrefix}/${relative}`));
  if (!res.ok) throw new Error(`public GET ${relative} -> ${res.status}`);
  const remote = Buffer.from(await res.arrayBuffer());
  const localHash = createHash('sha256').update(local).digest('hex');
  const remoteHash = createHash('sha256').update(remote).digest('hex');
  if (localHash !== remoteHash) throw new Error(`byte mismatch for ${relative}`);
}

const sampleRow = index.entries[Math.floor(index.entries.length / 2)].path;
try {
  await verifyPublic('manifest.json');
  await verifyPublic('index.json');
  await verifyPublic(sampleRow);
} catch (e) {
  fail(`public verification failed: ${e.message}`);
}

console.log('Public verification: PASS (manifest.json, index.json, ' + sampleRow + ')');
console.log(`Done. uploaded=${uploaded} skipped=${skipped}`);
console.log('');
console.log('Next: PLAN_CONTENT_PREFIX в app/plan_content_remote_registration.ts ->');
console.log(`  '${storagePrefix}'`);
