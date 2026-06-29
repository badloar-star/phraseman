/**
 * upload_plan_audio_to_storage.mjs
 *
 * Moves the 2730 personal-plan "listen" mp3 OUT of the app binary and onto
 * Firebase Storage, mirroring how phrase pronunciation audio already works
 * (see hooks/phrase_audio_player.ts + app/phrase_audio_url_map.generated.ts).
 *
 * What it does:
 *   1. Walks assets/audio/personal-plans-runtime/<plan>/runtime/.../<file>.mp3
 *   2. Re-encodes each clip to 64 kbps mono (speech) into a temp dir via ffmpeg
 *      (source is 128 kbps mono 24 kHz — ~50% smaller with no audible loss).
 *   3. Uploads each to gs://<bucket>/plan-audio/<plan>/<dXXX>/<phraseK>.mp3
 *      with a stable download token so the public URL is deterministic.
 *   4. Writes app/plan_audio_url_map.generated.ts mapping the OLD local uri key
 *      (the exact string stored in the catalog, e.g.
 *       "assets/audio/personal-plans-runtime/voyazh/runtime/voyazh-d001-listen-audio/voyazh-d001-content-unit-phrase-1.mp3")
 *      -> the Firebase Storage download URL. The resolver looks the uri up here.
 *
 * Storage rules: /plan-audio/** must be public read (see storage.rules update).
 *
 * Auth: uses Application Default Credentials. Either set
 *   GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>, or run
 *   `firebase login` + `gcloud auth application-default login`. This project is
 *   logged into firebase CLI as phraseman-ea0b3, but the Admin SDK needs ADC —
 *   if ADC is missing the script prints exact instructions and exits.
 *
 * Run (dry, no upload, no spend, just re-encode + size report):
 *   node scripts/upload_plan_audio_to_storage.mjs --dry
 * Run (real upload):
 *   node scripts/upload_plan_audio_to_storage.mjs
 *   --only=voyazh,echo     restrict to certain plans
 *   --no-reencode          upload originals (128k) instead of re-encoding to 64k
 *   --bitrate=48k          override target bitrate (default 64k)
 *   --concurrency=6        parallel uploads (default 6)
 *   --force                re-upload even if object already exists
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const AUDIO_ROOT = path.join(ROOT, 'assets', 'audio', 'personal-plans-runtime');
const STORAGE_PREFIX = 'plan-audio';
const OUT_MAP_TS = path.join(ROOT, 'app', 'plan_audio_url_map.generated.ts');

// ── args ────────────────────────────────────────────────────────────────────
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const NO_REENCODE = process.argv.includes('--no-reencode');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean) : null;
// --only-file=a.mp3,b.mp3 — upload ONLY these specific clips (match by localUri substring),
// so a few regenerated files can be re-uploaded without re-pushing the whole pack.
const onlyFileArg = process.argv.find((a) => a.startsWith('--only-file='));
const ONLY_FILE = onlyFileArg
  ? onlyFileArg.slice('--only-file='.length).split(',').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
  : null;
const brArg = process.argv.find((a) => a.startsWith('--bitrate='));
const BITRATE = brArg ? brArg.split('=')[1] : '64k';
const concArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Number(concArg ? concArg.split('=')[1] : 6) || 6);

// ── helpers ───────────────────────────────────────────────────────────────--
function hasFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return r.status === 0;
}

/** Walk the runtime audio tree, return [{ localUri, absPath, plan, day, phrase }]. */
function collectClips() {
  const out = [];
  if (!fs.existsSync(AUDIO_ROOT)) {
    console.error(`Audio root not found: ${AUDIO_ROOT}`);
    process.exit(1);
  }
  const plans = fs.readdirSync(AUDIO_ROOT).filter((p) => {
    const full = path.join(AUDIO_ROOT, p);
    return fs.statSync(full).isDirectory() && (!ONLY || ONLY.includes(p));
  });
  for (const plan of plans) {
    const runtimeDir = path.join(AUDIO_ROOT, plan, 'runtime');
    if (!fs.existsSync(runtimeDir)) continue;
    for (const dayDir of fs.readdirSync(runtimeDir)) {
      const dayFull = path.join(runtimeDir, dayDir);
      if (!fs.statSync(dayFull).isDirectory()) continue;
      for (const file of fs.readdirSync(dayFull)) {
        if (!file.toLowerCase().endsWith('.mp3')) continue;
        const absPath = path.join(dayFull, file);
        // The catalog stores forward-slash, repo-relative uris.
        const localUri = path
          .relative(ROOT, absPath)
          .split(path.sep)
          .join('/');
        if (ONLY_FILE && !ONLY_FILE.some((needle) => localUri.includes(needle))) continue;
        out.push({ localUri, absPath, plan, dayDir, file });
      }
    }
  }
  return out;
}

/** Deterministic Firebase Storage object path for a clip. */
function storageObjectPath(clip) {
  // plan-audio/<plan>/<dayDir>/<file>
  return `${STORAGE_PREFIX}/${clip.plan}/${clip.dayDir}/${clip.file}`;
}

/** Build the tokenized public download URL (matches phrase-audio format). */
function downloadUrl(objectPath, token) {
  const encoded = encodeURIComponent(objectPath);
  const base = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encoded}?alt=media`;
  return token ? `${base}&token=${token}` : base;
}

function reencode(absPath, outPath) {
  return new Promise((resolve, reject) => {
    // -ac 1 mono, -b:a 64k, keep 24kHz sample rate (already 24k), strip metadata.
    const args = [
      '-y', '-loglevel', 'error',
      '-i', absPath,
      '-ac', '1',
      '-b:a', BITRATE,
      '-map_metadata', '-1',
      outPath,
    ];
    const p = spawn('ffmpeg', args);
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('close', (code) => (code === 0 ? resolve(outPath) : reject(new Error(`ffmpeg ${code}: ${err}`))));
  });
}

async function main() {
  const clips = collectClips();
  console.log(`Found ${clips.length} clips${ONLY ? ` (plans: ${ONLY.join(',')})` : ''}.`);
  if (clips.length === 0) process.exit(1);

  const needFfmpeg = !NO_REENCODE;
  if (needFfmpeg && !hasFfmpeg()) {
    console.error('ffmpeg not found on PATH. Install it or pass --no-reencode.');
    process.exit(1);
  }

  // ── DRY: re-encode a sample, report projected size, write nothing ──────────
  if (DRY) {
    let origTotal = 0;
    for (const c of clips) origTotal += fs.statSync(c.absPath).size;
    console.log(`Original total: ${(origTotal / 1048576).toFixed(1)} MB`);
    if (!NO_REENCODE) {
      const tmp = path.join(os.tmpdir(), 'plan-audio-dry');
      fs.mkdirSync(tmp, { recursive: true });
      const sample = clips.slice(0, Math.min(20, clips.length));
      let inS = 0, outS = 0;
      for (const c of sample) {
        const o = path.join(tmp, `${crypto.randomBytes(6).toString('hex')}.mp3`);
        await reencode(c.absPath, o);
        inS += fs.statSync(c.absPath).size;
        outS += fs.statSync(o).size;
        fs.rmSync(o, { force: true });
      }
      const ratio = outS / inS;
      console.log(`Sample re-encode ${sample.length} clips: ${(ratio * 100).toFixed(0)}% of original (${BITRATE} mono)`);
      console.log(`Projected uploaded total: ~${((origTotal * ratio) / 1048576).toFixed(1)} MB`);
    }
    console.log('DRY run — nothing uploaded, no map written.');
    return;
  }

  // ── Auth: OAuth access token (minted from firebase-tools refresh token) ─────
  // We use the GCS JSON upload REST API with a Bearer token rather than the
  // Admin SDK, because this machine has a firebase CLI login but no ADC/
  // service-account. scripts/_mint_fb_token.mjs exchanges the stored refresh
  // token for a short-lived access token (same proven path as the phrase-audio
  // bucket creation script). Tokens expire ~1h, so we re-mint periodically.
  let accessToken = null;
  let tokenMintedAt = 0;
  async function getToken() {
    const now = Date.now();
    if (accessToken && now - tokenMintedAt < 45 * 60 * 1000) return accessToken;
    const { spawnSync: ss } = await import('child_process');
    const r = ss('node', [path.join(__dirname, '_mint_fb_token.mjs')], { encoding: 'utf8' });
    if (r.status !== 0 || !r.stdout?.trim()) {
      throw new Error(`token mint failed: ${r.stderr || r.stdout}`);
    }
    accessToken = r.stdout.trim();
    tokenMintedAt = now;
    return accessToken;
  }
  // probe credentials early
  try {
    const tok = await getToken();
    const probe = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET}`,
      { headers: { Authorization: `Bearer ${tok}` } },
    );
    if (!probe.ok) throw new Error(`bucket probe ${probe.status}: ${(await probe.text()).slice(0, 200)}`);
  } catch (e) {
    console.error('\nCould not authenticate to Firebase Storage.');
    console.error('Ensure `firebase login` is active for badloar@gmail.com (project phraseman-ea0b3).');
    console.error(`\nUnderlying error: ${e.message}`);
    process.exit(1);
  }

  const tmpDir = path.join(os.tmpdir(), 'plan-audio-upload');
  fs.mkdirSync(tmpDir, { recursive: true });

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
    // GCS multipart-less simple upload + set custom metadata via name+predefined.
    // We use the upload endpoint then patch metadata (download token + cache).
    const upUrl =
      `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o` +
      `?uploadType=media&name=${encodeURIComponent(objectPath)}`;
    const up = await fetch(upUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'audio/mpeg' },
      body: data,
    });
    if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 200)}`);
    // Patch object metadata: download token (for the tokenized public URL) + cache.
    const patch = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectPath)}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        }),
      },
    );
    if (!patch.ok) throw new Error(`patch ${patch.status}: ${(await patch.text()).slice(0, 200)}`);
  }

  const mapEntries = []; // [localUri, url]
  let done = 0, uploaded = 0, skipped = 0, failed = 0;

  async function processClip(clip) {
    const objectPath = storageObjectPath(clip);
    const token = crypto.randomUUID();
    let srcPath = clip.absPath;
    let tmpPath = null;
    try {
      if (!FORCE) {
        const existingToken = await objectExists(objectPath);
        if (existingToken) {
          const tk = typeof existingToken === 'string' ? existingToken : token;
          mapEntries.push([clip.localUri, downloadUrl(objectPath, tk)]);
          skipped++;
          return;
        }
      }
      if (!NO_REENCODE) {
        tmpPath = path.join(tmpDir, `${crypto.randomBytes(8).toString('hex')}.mp3`);
        await reencode(clip.absPath, tmpPath);
        srcPath = tmpPath;
      }
      await uploadObject(objectPath, srcPath, token);
      mapEntries.push([clip.localUri, downloadUrl(objectPath, token)]);
      uploaded++;
    } catch (e) {
      console.error(`FAIL ${clip.localUri}: ${e.message}`);
      failed++;
    } finally {
      if (tmpPath) fs.rmSync(tmpPath, { force: true });
      done++;
      if (done % 50 === 0 || done === clips.length) {
        process.stdout.write(`\r  ${done}/${clips.length} (up:${uploaded} skip:${skipped} fail:${failed})   `);
      }
    }
  }

  // simple concurrency pool
  let idx = 0;
  async function worker() {
    while (idx < clips.length) {
      const my = idx++;
      await processClip(clips[my]);
    }
  }
  console.log(`Uploading to gs://${BUCKET}/${STORAGE_PREFIX}/ (concurrency ${CONCURRENCY})...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');

  if (failed > 0) {
    console.error(`\n${failed} clips failed. Map written for the rest; re-run to retry (resumable).`);
  }

  // ── write the generated TS map ─────────────────────────────────────────────
  mapEntries.sort((a, b) => a[0].localeCompare(b[0]));
  const body = mapEntries
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');
  const ts = `// AUTO-GENERATED by scripts/upload_plan_audio_to_storage.mjs — DO NOT EDIT BY HAND.
// Maps the catalog's local audio uri key -> Firebase Storage download URL for
// personal-plan listening clips. Lets the app stream + disk-cache the audio
// instead of bundling ${clips.length} mp3 (~126 MB) into the native binary.
// Mirror of app/phrase_audio_url_map.generated.ts. Consumed by
// app/personal_plan_listening_playback_contract.ts.
// Entries: ${mapEntries.length}.

export const PLAN_AUDIO_URL_MAP: Readonly<Record<string, string>> = {
${body}
};

export function getPlanAudioUrl(localUri: string): string | undefined {
  if (!localUri) return undefined;
  return PLAN_AUDIO_URL_MAP[localUri.trim().replace(/\\\\/g, '/')];
}
`;
  fs.writeFileSync(OUT_MAP_TS, ts, 'utf8');
  console.log(`\nWrote ${OUT_MAP_TS} with ${mapEntries.length} entries.`);
  console.log(`Done. uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
