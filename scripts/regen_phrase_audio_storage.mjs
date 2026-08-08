#!/usr/bin/env node
/**
 * regen_phrase_audio_storage.mjs â€” heal textâ†”audio drift in the SHIPPED pipeline.
 *
 * The runtime plays mp3s from Firebase Storage via app/phrase_audio_url_map.generated.ts
 * (normalized text -> url), built from .codex-tmp/tts-voicing/audio_url_map.json
 * (id -> {url, source, text}). When a phrase's wording is edited, the old mp3
 * keeps speaking the old words. This script regenerates ONLY the phrases the
 * audit flags as AUDIO_SAYS_OLD, re-voicing them with the SAME voice/model the
 * corpus was built with, uploads under the SAME id (so Storage overwrites in
 * place â€” no orphan is created), rewrites the voiced text in audio_url_map.json,
 * and rebuilds the runtime map. The old key drops out of the map automatically
 * because the map is keyed by text and gets rebuilt from scratch.
 *
 * Safety:
 *   - Dry-run by default: prints the plan, spends nothing, writes nothing.
 *   - --apply performs it; OpenAI spend still requires PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1
 *     and the Storage upload requires PHRASEMAN_ALLOW_UPLOAD=1 + a Firebase token.
 *   - Idempotent: re-running after success finds nothing to do (audit is clean).
 *
 * Usage:
 *   node scripts/regen_phrase_audio_storage.mjs                 # dry-run plan
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 PHRASEMAN_ALLOW_UPLOAD=1 \
 *     node scripts/regen_phrase_audio_storage.mjs --apply       # do it
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { requireOpenAiDevSpendGuard } from './openai-dev-guard.mjs';

const pexec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS_DIR = path.join(ROOT, '.codex-tmp', 'tts-voicing');
const MAP_JSON = path.join(TTS_DIR, 'audio_url_map.json');
const GAPS_JSON = path.join(TTS_DIR, 'audio_url_map_gaps.json');
const REGEN_DIR = path.join(TTS_DIR, 'audio_regen');
const RUNTIME_MAP = path.join(ROOT, 'app', 'phrase_audio_url_map.generated.ts');
const NULL = os.platform() === 'win32' ? 'NUL' : '/dev/null';
const APPLY = process.argv.includes('--apply');
const requestedIds = new Set();
const invalidRequestedIds = [];
for (let i = 0; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--id') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('--')) invalidRequestedIds.push(arg);
    else {
      requestedIds.add(value);
      i++;
    }
  } else if (arg.startsWith('--id=')) {
    const value = arg.slice('--id='.length);
    if (value) requestedIds.add(value);
    else invalidRequestedIds.push(arg);
  }
}
if (invalidRequestedIds.length > 0) {
  console.error(`Invalid empty --id argument(s): ${invalidRequestedIds.join(', ')}`);
  process.exit(2);
}

// Match the corpus exactly (see .codex-tmp/tts-voicing/regen_one.mjs).
const VOICE = 'fable';
const MODEL = 'gpt-4o-mini-tts';
const SPEED = 0.95;
const INSTRUCTIONS =
  'Speak as a warm, friendly English teacher. Clear, natural English. ' +
  'Calm, encouraging pace, slightly slow so a learner can follow every word. Friendly, not robotic.';
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const PREFIX = 'phrase-audio';

function publicUrl(objName) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objName)}?alt=media`;
}
function versionedPublicUrl(objName, text) {
  const version = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `${publicUrl(objName)}&v=${version}`;
}
function objectName(id, source) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `${PREFIX}/${source}/${safe}.mp3`;
}

// â”€â”€ 1) get the drift list from the audit (single source of truth) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function runAudit() {
  const r = spawnSync('node', [path.join('scripts', 'audit_phrase_audio_sync.mjs'), '--json'], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 32 * 1024 * 1024,
  });
  try { return JSON.parse(r.stdout || '{}'); } catch { return { findings: {} }; }
}

// Resolve each flagged phrase to its {id, source} via the voiced-text map, so we
// upload to the correct existing object and overwrite in place.
function buildIdIndex() {
  const byUrl = new Map();
  const knownIds = new Set();
  for (const f of [MAP_JSON, GAPS_JSON]) {
    if (!fs.existsSync(f)) continue;
    let obj; try { obj = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    for (const id of Object.keys(obj)) {
      const rec = obj[id];
      if (rec && rec.url) {
        byUrl.set(rec.url, { id, source: rec.source, file: f });
        knownIds.add(id);
      }
    }
  }
  return { byUrl, knownIds };
}

const audit = runAudit();
const { byUrl, knownIds } = buildIdIndex();
const unknownRequestedIds = [...requestedIds].filter((id) => !knownIds.has(id));
if (unknownRequestedIds.length > 0) {
  console.error(`Unknown --id value(s): ${unknownRequestedIds.join(', ')}`);
  process.exit(2);
}
const allDrift = (audit.findings && audit.findings.AUDIO_SAYS_OLD) || [];
const drift = requestedIds.size > 0
  ? allDrift.filter((item) => requestedIds.has(item.id))
  : allDrift;
const selectedDriftIds = new Set(drift.map((item) => item.id));
const requestedCleanIds = [...requestedIds].filter((id) => !selectedDriftIds.has(id));
if (requestedCleanIds.length > 0) {
  console.log(`Requested ids already clean: ${requestedCleanIds.join(', ')}`);
}
if (drift.length === 0) {
  console.log(requestedIds.size > 0
    ? `Nothing to do â€” no AUDIO_SAYS_OLD drift for requested ids: ${[...requestedIds].join(', ')}`
    : 'Nothing to do â€” audit reports no AUDIO_SAYS_OLD drift.');
  process.exit(0);
}

const plan = [];
for (const d of drift) {
  const meta = byUrl.get(d.url);
  if (!meta) {
    console.warn(`! ${d.id}: could not resolve mp3 id for url ${d.url} â€” skipping`);
    continue;
  }
  plan.push({ phraseId: d.id, mp3Id: meta.id, source: meta.source, mapFile: meta.file, newText: d.shown, oldText: d.voiced });
}

console.log('â”€'.repeat(60));
console.log(`REGEN PLAN â€” ${plan.length} clip(s) to re-voice ${APPLY ? '(APPLY)' : '(dry-run)'}`);
console.log('â”€'.repeat(60));
for (const p of plan) {
  console.log(`  ${p.mp3Id} [${p.source}]`);
  console.log(`     old mp3 says: "${p.oldText}"`);
  console.log(`     new text:     "${p.newText}"`);
}
console.log('â”€'.repeat(60));

if (!APPLY) {
  console.log('Dry-run only. Re-run with --apply (and the spend/upload env flags) to perform it.');
  process.exit(0);
}

// â”€â”€ 2) spend guard + credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const estimatedChars = plan.reduce((s, p) => s + p.newText.length, 0);
requireOpenAiDevSpendGuard({
  action: 'OpenAI TTS regeneration for drifted phrase audio',
  estimatedCostUsd: (estimatedChars / 1000) * 0.030,
  units: plan.length,
});

function loadKey() {
  if (process.env.OPENAI_TTS_API_KEY) return process.env.OPENAI_TTS_API_KEY;
  const envFile = path.join(ROOT, '.env.local');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*OPENAI_TTS_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^['"]|['"]$/g, '');
    }
  }
  throw new Error('OPENAI_TTS_API_KEY not found (env or .env.local)');
}
const KEY = loadKey();

const uploadEnabled = process.env.PHRASEMAN_ALLOW_UPLOAD === '1';
let token = process.env.FB_TOKEN || '';
if (uploadEnabled && !token) {
  const r = spawnSync('node', [path.join('.codex-tmp', 'tts-voicing', 'fb_token.mjs')], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
  });
  token = (r.stdout || '').trim();
}
if (!uploadEnabled) {
  console.log('\nPHRASEMAN_ALLOW_UPLOAD != 1 â€” will generate + verify locally but NOT upload or patch the map.');
} else if (!token) {
  console.error('Upload requested but no Firebase token (set FB_TOKEN or log in with firebase CLI).');
  process.exit(2);
}

// â”€â”€ 3) TTS + loudness verify (reject silent clips), then upload in place â”€â”€â”€â”€â”€â”€â”€
async function maxDb(file) {
  let stderr = '';
  try {
    const r = await pexec('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', NULL]);
    stderr = r.stderr || '';
  } catch (e) { stderr = (e && e.stderr) || ''; }
  const ms = [...stderr.matchAll(/max_volume:\s*(-?[\d.]+) dB/g)].map((m) => parseFloat(m[1]));
  return ms.length ? ms[ms.length - 1] : null;
}
async function ttsOnce(text) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: 'mp3', speed: SPEED }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 140)}`);
  return Buffer.from(await res.arrayBuffer());
}
async function uploadOne(objName, buf) {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(objName)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public,max-age=31536000,immutable' },
        body: buf,
      });
      if (r.status === 429 || r.status >= 500) throw new Error('retryable ' + r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 140)}`);
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((res) => setTimeout(res, 500 * attempt));
    }
  }
}

// Immutable JSON patch: read, produce a new object, write once at the end.
const patchedByFile = new Map(); // file -> {â€¦updated map object}
function loadMapObj(file) {
  if (patchedByFile.has(file)) return patchedByFile.get(file);
  const obj = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  patchedByFile.set(file, obj);
  return obj;
}

function normalizeRuntimeKey(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function patchRuntimeMapForPlan(items) {
  let source = fs.readFileSync(RUNTIME_MAP, 'utf8');
  for (const item of items) {
    const objName = objectName(item.mp3Id, item.source);
    const oldUrls = [publicUrl(objName), versionedPublicUrl(objName, item.oldText)];
    const newUrl = versionedPublicUrl(objName, item.newText);
    const oldLines = oldUrls.map((url) =>
      `  ${JSON.stringify(normalizeRuntimeKey(item.oldText))}: ${JSON.stringify(url)},`);
    const newLine = `  ${JSON.stringify(normalizeRuntimeKey(item.newText))}: ${JSON.stringify(newUrl)},`;
    if (source.includes(newLine)) continue;
    const oldLine = oldLines.find((line) => source.includes(line));
    if (!oldLine) {
      throw new Error(`Runtime audio map is missing the old key for ${item.mp3Id}`);
    }
    source = source.replace(oldLine, newLine);
  }
  fs.writeFileSync(RUNTIME_MAP, source, 'utf8');
  console.log(`Patched ${path.relative(ROOT, RUNTIME_MAP)} for ${items.length} requested id(s)`);
}

let ok = 0, failed = 0;
const uploadedPlan = [];
for (const p of plan) {
  const dir = path.join(REGEN_DIR, p.source);
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, `${p.mp3Id}.mp3`);
  console.log(`\nâ–¶ ${p.mp3Id}: "${p.newText}"`);

  let audible = false, buf = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    buf = await ttsOnce(p.newText);
    fs.writeFileSync(abs, buf);
    const max = await maxDb(abs);
    console.log(`   attempt ${attempt}: max=${max}dB size=${buf.length}B`);
    if (max != null && max > -30) { audible = true; break; }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  if (!audible) { console.error('   âœ— still silent after retries â€” skipped'); failed++; continue; }

  if (!uploadEnabled) { console.log('   (local only â€” no upload)'); ok++; continue; }

  const objName = objectName(p.mp3Id, p.source);
  try {
    await uploadOne(objName, buf);
    console.log(`   âœ“ uploaded ${objName} (overwrote old in place)`);
    // patch the voiced text so future audits see the new wording
    const mapObj = loadMapObj(p.mapFile);
    const prev = mapObj[p.mp3Id] || {};
    mapObj[p.mp3Id] = { ...prev, url: versionedPublicUrl(objName, p.newText), source: p.source, text: p.newText };
    uploadedPlan.push(p);
    ok++;
  } catch (e) {
    console.error(`   âœ— upload failed: ${e.message}`);
    failed++;
  }
}

// â”€â”€ 4) flush patched json + rebuild the runtime map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (uploadEnabled && ok > 0) {
  for (const [file, obj] of patchedByFile) {
    fs.writeFileSync(file, JSON.stringify(obj, null, 0));
    console.log(`\nPatched ${path.relative(ROOT, file)}`);
  }
  if (requestedIds.size > 0) {
    patchRuntimeMapForPlan(uploadedPlan);
  } else {
    const rebuild = spawnSync('node', [path.join('.codex-tmp', 'tts-voicing', 'build_map_ts.mjs')], {
      cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
    });
    process.stdout.write(rebuild.stdout || '');
    if (rebuild.status !== 0) console.error(rebuild.stderr || 'build_map_ts failed');
  }
}

console.log('\n' + 'â”€'.repeat(60));
console.log(`DONE: ${ok} regenerated, ${failed} failed.`);
if (uploadEnabled && ok > 0) {
  console.log('Runtime map rebuilt. Re-run the audit to confirm 0 drift, then commit the generated map.');
}
process.exit(failed > 0 ? 1 : 0);
