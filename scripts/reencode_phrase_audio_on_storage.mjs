/**
 * reencode_phrase_audio_on_storage.mjs
 *
 * Re-encodes the phrase-pronunciation clips already on Firebase Storage
 * (gs://<bucket>/phrase-audio/**) from 128 kbps mono to 64 kbps mono in place,
 * cutting bucket size + user download/cache ~50% with no audible loss for speech.
 *
 * IMPORTANT — URL stability: each object is re-uploaded to the SAME object path
 * AND its existing firebaseStorageDownloadTokens is PRESERVED, so every URL in
 * app/phrase_audio_url_map.generated.ts keeps working unchanged. No app code or
 * map regeneration is needed.
 *
 * Flow per object:
 *   1. GET metadata (size, bitrate via download) + existing download token.
 *   2. Skip if already <= target bitrate (resumable / idempotent).
 *   3. Download -> ffmpeg -ac 1 -b:a 64k -> upload over the same name.
 *   4. PATCH metadata to restore the same download token + immutable cache.
 *
 * Auth: OAuth access token minted from the firebase CLI login via
 * scripts/_mint_fb_token.mjs (same path as the plan-audio uploader).
 *
 * Run (dry, sample only, no writes):
 *   node scripts/reencode_phrase_audio_on_storage.mjs --dry
 * Run (real, in place):
 *   node scripts/reencode_phrase_audio_on_storage.mjs
 *   --bitrate=64k        target bitrate (default 64k)
 *   --concurrency=8      parallel workers (default 8)
 *   --limit=100          only process first N (smoke)
 *   --prefix=phrase-audio/word/   restrict to a sub-prefix
 *   --force              re-encode even if already <= target
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const brArg = process.argv.find((a) => a.startsWith('--bitrate='));
const BITRATE = brArg ? brArg.split('=')[1] : '64k';
const TARGET_BPS = parseInt(BITRATE, 10) * 1000; // "64k" -> 64000
const concArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Number(concArg ? concArg.split('=')[1] : 8) || 8);
const limArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limArg ? Number(limArg.split('=')[1]) : 0;
const prefArg = process.argv.find((a) => a.startsWith('--prefix='));
const PREFIX = prefArg ? prefArg.split('=')[1] : 'phrase-audio/';

function hasFfmpeg() {
  return spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;
}

// ── token (re-mint hourly) ───────────────────────────────────────────────────
let accessToken = null;
let tokenMintedAt = 0;
function getToken() {
  const now = Date.now();
  if (accessToken && now - tokenMintedAt < 45 * 60 * 1000) return accessToken;
  const r = spawnSync('node', [path.join(__dirname, '_mint_fb_token.mjs')], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout?.trim()) throw new Error(`token mint failed: ${r.stderr || r.stdout}`);
  accessToken = r.stdout.trim();
  tokenMintedAt = now;
  return accessToken;
}

async function listAll() {
  const out = [];
  let pageToken = null;
  do {
    const u = new URL(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`);
    u.searchParams.set('prefix', PREFIX);
    u.searchParams.set('fields', 'items(name,size,contentType,metadata),nextPageToken');
    u.searchParams.set('maxResults', '1000');
    if (pageToken) u.searchParams.set('pageToken', pageToken);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) throw new Error(`list ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    for (const it of j.items || []) {
      if (it.name.toLowerCase().endsWith('.mp3')) out.push(it);
    }
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}

function reencode(inPath, outPath) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', inPath, '-ac', '1', '-b:a', BITRATE, '-map_metadata', '-1', outPath]);
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (c) => (c === 0 ? resolve(outPath) : reject(new Error(`ffmpeg ${c}: ${err}`))));
  });
}

function downloadUrl(name, token) {
  const base = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media`;
  return token ? `${base}&token=${token}` : base;
}

async function main() {
  if (!hasFfmpeg()) {
    console.error('ffmpeg not found on PATH.');
    process.exit(1);
  }
  // probe creds
  const probe = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!probe.ok) {
    console.error(`Auth/probe failed ${probe.status}. Ensure firebase login is active.`);
    process.exit(1);
  }

  console.log(`Listing ${PREFIX} ...`);
  let items = await listAll();
  console.log(`Found ${items.length} mp3, total ${(items.reduce((s, i) => s + Number(i.size || 0), 0) / 1048576).toFixed(1)} MB.`);
  if (LIMIT) items = items.slice(0, LIMIT);

  const tmpDir = path.join(os.tmpdir(), 'phrase-reencode');
  fs.mkdirSync(tmpDir, { recursive: true });

  if (DRY) {
    // sample-encode 15 to project savings
    const sample = items.slice(0, Math.min(15, items.length));
    let inS = 0, outS = 0;
    for (const it of sample) {
      const tok = it.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
      const inP = path.join(tmpDir, crypto.randomBytes(6).toString('hex') + '.mp3');
      const outP = inP.replace('.mp3', '.out.mp3');
      const r = await fetch(downloadUrl(it.name, tok));
      fs.writeFileSync(inP, Buffer.from(await r.arrayBuffer()));
      await reencode(inP, outP);
      inS += fs.statSync(inP).size;
      outS += fs.statSync(outP).size;
      fs.rmSync(inP, { force: true });
      fs.rmSync(outP, { force: true });
    }
    const ratio = outS / inS || 1;
    const total = items.reduce((s, i) => s + Number(i.size || 0), 0);
    console.log(`Sample ${sample.length}: ${(ratio * 100).toFixed(0)}% of original at ${BITRATE} mono`);
    console.log(`Projected new total: ~${((total * ratio) / 1048576).toFixed(1)} MB (from ${(total / 1048576).toFixed(1)} MB)`);
    console.log('DRY — nothing written.');
    return;
  }

  let done = 0, reenc = 0, skipped = 0, failed = 0;

  async function processItem(it) {
    const name = it.name;
    const tok = it.metadata?.firebaseStorageDownloadTokens?.split(',')[0] || crypto.randomUUID();
    const inP = path.join(tmpDir, crypto.randomBytes(8).toString('hex') + '.mp3');
    const outP = inP.replace('.mp3', '.out.mp3');
    try {
      // download (via tokenized public URL — fast, no auth)
      const r = await fetch(downloadUrl(name, tok));
      if (!r.ok) throw new Error(`download ${r.status}`);
      fs.writeFileSync(inP, Buffer.from(await r.arrayBuffer()));

      // skip if already small enough (probe bitrate via ffprobe)
      if (!FORCE) {
        const pr = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=bit_rate', '-of', 'default=noprint_wrappers=1:nokey=1', inP], { encoding: 'utf8' });
        const bps = parseInt((pr.stdout || '').trim(), 10);
        if (Number.isFinite(bps) && bps <= TARGET_BPS + 2000) {
          skipped++;
          return;
        }
      }

      await reencode(inP, outP);

      // upload over the same object name
      const upUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(name)}`;
      const up = await fetch(upUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'audio/mpeg' },
        body: fs.readFileSync(outP),
      });
      if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 150)}`);

      // restore the SAME download token so existing URLs keep working
      const patch = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { firebaseStorageDownloadTokens: tok },
        }),
      });
      if (!patch.ok) throw new Error(`patch ${patch.status}: ${(await patch.text()).slice(0, 150)}`);
      reenc++;
    } catch (e) {
      console.error(`\nFAIL ${name}: ${e.message}`);
      failed++;
    } finally {
      fs.rmSync(inP, { force: true });
      fs.rmSync(outP, { force: true });
      done++;
      if (done % 50 === 0 || done === items.length) {
        process.stdout.write(`\r  ${done}/${items.length} (reenc:${reenc} skip:${skipped} fail:${failed})   `);
      }
    }
  }

  let idx = 0;
  async function worker() {
    while (idx < items.length) await processItem(items[idx++]);
  }
  console.log(`Re-encoding in place at ${BITRATE} mono (concurrency ${CONCURRENCY})...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');
  console.log(`Done. reencoded=${reenc} skipped=${skipped} failed=${failed}`);
  if (failed) console.log('Re-run to retry failed (idempotent / resumable).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
