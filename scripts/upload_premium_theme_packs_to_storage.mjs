#!/usr/bin/env node
/** Upload/verify the six immutable premium home-theme packs. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const PREFIX = 'premium-theme-packs/v2';
const EXPECTED_PACKS = Object.freeze(['olive', 'lime', 'amethyst', 'titanium', 'horizon', 'singularity']);
const EXPECTED_ASSETS = Object.freeze([
  'home_scene_newbie', 'home_scene_continue', 'home_scene_streak_risk', 'home_scene_day_done',
  'home_scene_no_energy', 'home_scene_offline', 'home_scene_exam_ready', 'home_scene_streak_lost',
  'home_scene_welcome_back', 'home_scene_all_done',
  'lessons', 'cards', 'dialogs', 'spire_tile', 'phrase_of_day',
]);

const sourceArg = process.argv.find((arg) => arg.startsWith('--source='));
const SOURCE = sourceArg ? path.resolve(sourceArg.slice('--source='.length)) : '';
const DRY = process.argv.includes('--dry');
const VERIFY_ONLY = process.argv.includes('--verify');
const FORCE = process.argv.includes('--force');
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Math.min(16, Number(concurrencyArg?.split('=')[1] ?? 6) || 6));

function fail(message) { console.error(message); process.exit(1); }
if (!SOURCE) fail('Укажите --source=<папка premium-theme-packs/v2>. Папка остаётся вне app bundle.');
if (!fs.statSync(SOURCE, { throwIfNoEntry: false })?.isDirectory()) fail(`Папка не найдена: ${SOURCE}`);

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const publicUrl = (objectPath) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;

function readAndValidateManifest() {
  const file = path.join(SOURCE, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (manifest?.schemaVersion !== 'phraseman-premium-theme-packs.v2' || manifest?.version !== 2) fail('Неверная версия manifest');
  if (Object.keys(manifest.themes ?? {}).sort().join('|') !== [...EXPECTED_PACKS].sort().join('|')) fail('Manifest должен содержать ровно шесть утверждённых packs');
  const objects = [];
  for (const packId of EXPECTED_PACKS) {
    const assets = manifest.themes[packId]?.assets ?? {};
    const actualNames = Object.keys(assets);
    if (EXPECTED_ASSETS.some((name) => !actualNames.includes(name))) fail(`${packId}: отсутствуют обязательные home assets`);
    if (actualNames.some((name) => !EXPECTED_ASSETS.includes(name) && name !== 'motion_plate')) fail(`${packId}: неизвестный asset`);
    if ((packId === 'amethyst') !== actualNames.includes('motion_plate')) fail(`${packId}: motion_plate разрешён только для amethyst и обязателен там`);
    for (const name of EXPECTED_ASSETS) {
      const row = assets[name];
      if (row.extension !== 'png' || row.width !== 1254 || row.height !== 1254) fail(`${packId}/${name}: ожидается исходный PNG 1254×1254`);
      const local = path.join(SOURCE, packId, `${name}.png`);
      const bytes = fs.readFileSync(local);
      const expectedPath = `${PREFIX}/${packId}/${name}.png`;
      if (row.path !== expectedPath || row.bytes !== bytes.length || row.sha256 !== sha256(bytes)) fail(`${packId}/${name}: manifest не совпадает с файлом`);
      objects.push({ local, objectPath: expectedPath, contentType: 'image/png', sha256: row.sha256, bytes: row.bytes });
    }
    if (packId === 'amethyst') {
      const row = assets.motion_plate;
      const local = path.join(SOURCE, packId, 'motion_plate.webp');
      const bytes = fs.readFileSync(local);
      const expectedPath = `${PREFIX}/${packId}/motion_plate.webp`;
      if (row.extension !== 'webp' || row.path !== expectedPath || row.bytes !== bytes.length || row.sha256 !== sha256(bytes)) fail('amethyst/motion_plate: manifest не совпадает с файлом');
      objects.push({ local, objectPath: expectedPath, contentType: 'image/webp', sha256: row.sha256, bytes: row.bytes });
    }
  }
  const manifestBytes = fs.readFileSync(file);
  objects.push({ local: file, objectPath: `${PREFIX}/manifest.json`, contentType: 'application/json; charset=utf-8', sha256: sha256(manifestBytes), bytes: manifestBytes.length });
  return objects;
}

let accessToken = '';
let tokenAtMs = 0;
function token() {
  if (accessToken && Date.now() - tokenAtMs < 45 * 60_000) return accessToken;
  const result = spawnSync('node', [path.join(ROOT, 'scripts', '_mint_fb_token.mjs')], { encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout?.trim()) fail(`Firebase token: ${result.stderr || result.stdout}`);
  accessToken = result.stdout.trim();
  tokenAtMs = Date.now();
  return accessToken;
}

async function remoteMetadata(objectPath) {
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`metadata ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

async function upload(item) {
  if (!FORCE && await remoteMetadata(item.objectPath)) return 'skip';
  const response = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(item.objectPath)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': item.contentType },
    body: fs.readFileSync(item.local),
  });
  if (!response.ok) throw new Error(`upload ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const patch = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(item.objectPath)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cacheControl: item.objectPath.endsWith('/manifest.json') ? 'public, max-age=300' : 'public, max-age=31536000, immutable', metadata: { sha256: item.sha256 } }),
  });
  if (!patch.ok) throw new Error(`metadata patch ${patch.status}: ${(await patch.text()).slice(0, 200)}`);
  return 'upload';
}

async function verify(item) {
  const response = await fetch(publicUrl(item.objectPath), { cache: 'no-store' });
  if (!response.ok) throw new Error(`verify ${response.status}`);
  const remote = Buffer.from(await response.arrayBuffer());
  if (remote.length !== item.bytes || sha256(remote) !== item.sha256) throw new Error('remote sha256/size mismatch');
}

async function pool(items, worker) {
  let cursor = 0;
  const results = [];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      results.push(await worker(item));
    }
  }));
  return results;
}

const objects = readAndValidateManifest();
const total = objects.reduce((sum, item) => sum + item.bytes, 0);
console.log(`Premium themes: ${objects.length - 1} exact files + manifest, ${(total / 1048576).toFixed(2)} MiB, source вне bundle.`);
if (DRY) {
  console.log(`DRY: ${SOURCE} валиден; пример gs://${BUCKET}/${objects[0].objectPath}`);
} else if (VERIFY_ONLY) {
  await pool(objects, verify);
  console.log(`VERIFY PASS: ${objects.length}/${objects.length}`);
} else {
  const results = await pool(objects, upload);
  console.log(`UPLOAD: ${results.filter((x) => x === 'upload').length}, SKIP: ${results.filter((x) => x === 'skip').length}`);
  await pool(objects, verify);
  console.log(`REMOTE VERIFY PASS: ${objects.length}/${objects.length}`);
}
