/**
 * upload_collectible_images_to_storage.mjs
 *
 * Moves the 330 collectible card webp images OUT of the app binary and onto
 * Firebase Storage, mirroring scripts/upload_plan_audio_to_storage.mjs.
 *
 * What it does:
 *   1. Reads pre-compressed webp from tmp/collectibles_upload/<cardId>.webp
 *      (produced by the q72 + 600px downscale pass; ~12.6 MB total vs 71 MB).
 *   2. Uploads each to gs://<bucket>/collectible-images/<cardId>.webp with a
 *      stable download token so the public URL is deterministic.
 *   3. Writes app/collectibles/collectible_image_url_map.generated.ts mapping
 *      cardId -> Firebase Storage download URL. CollectibleArt looks the id up
 *      here; if missing/offline it falls back to the inline SVG in the catalog.
 *
 * Storage rules: /collectible-images/** must be public read (see storage.rules).
 *
 * Auth: mints an OAuth access token from the firebase-tools refresh token via
 * scripts/_mint_fb_token.mjs (same path as the audio upload script).
 *
 * Run:
 *   node scripts/upload_collectible_images_to_storage.mjs --dry   (no upload)
 *   node scripts/upload_collectible_images_to_storage.mjs          (real upload)
 *   --src=tmp/collectibles_upload   override source dir
 *   --concurrency=8                 parallel uploads (default 8)
 *   --force                         re-upload even if object exists
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const STORAGE_PREFIX = 'collectible-images';
const OUT_MAP_TS = path.join(ROOT, 'app', 'collectibles', 'collectible_image_url_map.generated.ts');

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const srcArg = process.argv.find((a) => a.startsWith('--src='));
const SRC_DIR = path.join(ROOT, srcArg ? srcArg.split('=')[1] : 'tmp/collectibles_upload');
const concArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Number(concArg ? concArg.split('=')[1] : 8) || 8);

function collectImages() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source dir not found: ${SRC_DIR}\nRun the compress pass first.`);
    process.exit(1);
  }
  return fs.readdirSync(SRC_DIR)
    .filter((f) => f.toLowerCase().endsWith('.webp'))
    .map((f) => ({ cardId: path.basename(f, '.webp'), absPath: path.join(SRC_DIR, f) }))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
}

function storageObjectPath(cardId) {
  return `${STORAGE_PREFIX}/${cardId}.webp`;
}

function downloadUrl(objectPath, token) {
  const encoded = encodeURIComponent(objectPath);
  const base = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encoded}?alt=media`;
  return token ? `${base}&token=${token}` : base;
}

async function main() {
  const imgs = collectImages();
  console.log(`Found ${imgs.length} collectible images in ${path.relative(ROOT, SRC_DIR)}.`);
  if (imgs.length === 0) process.exit(1);

  if (DRY) {
    let total = 0;
    for (const i of imgs) total += fs.statSync(i.absPath).size;
    console.log(`Total to upload: ${(total / 1048576).toFixed(2)} MB (avg ${(total / imgs.length / 1024) | 0} KB)`);
    console.log('DRY run — nothing uploaded, no map written.');
    return;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
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

  async function uploadObject(objectPath, srcPath, downloadToken) {
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
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        }),
      },
    );
    if (!patch.ok) throw new Error(`patch ${patch.status}: ${(await patch.text()).slice(0, 200)}`);
  }

  const mapEntries = [];
  let done = 0, uploaded = 0, skipped = 0, failed = 0;

  async function processImage(img) {
    const objectPath = storageObjectPath(img.cardId);
    const token = crypto.randomUUID();
    try {
      if (!FORCE) {
        const existingToken = await objectExists(objectPath);
        if (existingToken) {
          const tk = typeof existingToken === 'string' ? existingToken : token;
          mapEntries.push([img.cardId, downloadUrl(objectPath, tk)]);
          skipped++;
          return;
        }
      }
      await uploadObject(objectPath, img.absPath, token);
      mapEntries.push([img.cardId, downloadUrl(objectPath, token)]);
      uploaded++;
    } catch (e) {
      console.error(`FAIL ${img.cardId}: ${e.message}`);
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
    while (idx < imgs.length) {
      const my = idx++;
      await processImage(imgs[my]);
    }
  }
  console.log(`Uploading to gs://${BUCKET}/${STORAGE_PREFIX}/ (concurrency ${CONCURRENCY})...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');

  if (failed > 0) console.error(`\n${failed} images failed. Map written for the rest; re-run to retry (resumable).`);

  mapEntries.sort((a, b) => a[0].localeCompare(b[0]));
  const body = mapEntries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  const ts = `// AUTO-GENERATED by scripts/upload_collectible_images_to_storage.mjs — DO NOT EDIT BY HAND.
// Maps collectible cardId -> Firebase Storage download URL. Lets the app stream
// + disk-cache card art instead of bundling ${imgs.length} webp (~71 MB) into the
// native binary. Consumed by components/CollectibleArt.tsx; the inline SVG in the
// catalog is the offline fallback when an id is missing here.
// Entries: ${mapEntries.length}.

export const COLLECTIBLE_IMAGE_URL_MAP: Readonly<Record<string, string>> = {
${body}
};

export function getCollectibleImageUrl(cardId: string): string | undefined {
  if (!cardId) return undefined;
  return COLLECTIBLE_IMAGE_URL_MAP[cardId.trim()];
}
`;
  fs.writeFileSync(OUT_MAP_TS, ts, 'utf8');
  console.log(`\nWrote ${OUT_MAP_TS} with ${mapEntries.length} entries.`);
  console.log(`Done. uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
