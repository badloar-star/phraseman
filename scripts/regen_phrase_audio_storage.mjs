#!/usr/bin/env node
/**
 * regen_phrase_audio_storage.mjs â€” heal textâ†”audio drift in the SHIPPED pipeline.
 *
 * The runtime plays mp3s from Firebase Storage via app/phrase_audio_url_map.generated.ts
 * (normalized text -> url), built from .codex-tmp/tts-voicing/audio_url_map.json
 * (id -> {url, source, text}). When a phrase's wording is edited, the old mp3
 * keeps speaking the old words. This script regenerates ONLY the phrases the
 * audit flags as missing or stale, re-voicing them with the SAME voice/model the
 * corpus was built with. Phase A generates and verifies every target locally;
 * no upload starts unless the whole batch succeeds. Phase B uploads immutable,
 * content-versioned objects, atomically checkpoints the voiced manifest, then
 * rebuilds the runtime map. Old objects are retained until a separate cleanup
 * command receives an external release receipt proving OTA/store rollout and
 * expiry of the compatibility-retention window.
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
 *   node scripts/regen_phrase_audio_storage.mjs --cleanup-old \
 *     --release-receipt <external-release-receipt.json>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { requireOpenAiDevSpendGuard } from './openai-dev-guard.mjs';
import { atomicWriteJson, buildCleanupManifest, parseAuditProcess, readJsonStrict, runTwoPhase, validateCleanupRow, validateReleaseReceipt, versionedObjectName } from './lib/phrase_audio_regen_pipeline.mjs';

const pexec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS_DIR = path.join(ROOT, '.codex-tmp', 'tts-voicing');
const MAP_JSON = path.join(TTS_DIR, 'audio_url_map.json');
const GAPS_JSON = path.join(TTS_DIR, 'audio_url_map_gaps.json');
const REGEN_DIR = path.join(TTS_DIR, 'audio_regen');
const NULL = os.platform() === 'win32' ? 'NUL' : '/dev/null';
const APPLY = process.argv.includes('--apply');
const CLEANUP_OLD = process.argv.includes('--cleanup-old');
const receiptArg = process.argv.indexOf('--release-receipt');
const RELEASE_RECEIPT = receiptArg >= 0 ? process.argv[receiptArg + 1] : '';
const JOURNAL_FILE = path.join(TTS_DIR, 'audio_regen_journal.json');
const CLEANUP_FILE = path.join(TTS_DIR, 'old_object_cleanup.json');
const targetArg = process.argv.indexOf('--target-ids-file');
const TARGET_FILE = targetArg >= 0 ? process.argv[targetArg + 1] : '';
if (targetArg >= 0 && !TARGET_FILE) {
  console.error('--target-ids-file requires a JSON path');
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
function objectName(id, source, sha) {
  return versionedObjectName(PREFIX, source, id, sha);
}

function fileSha(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function objectFromPublicUrl(url) {
  const m = String(url).match(/\/o\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

if (CLEANUP_OLD) {
  const runtimeMap = path.join(ROOT, 'app', 'phrase_audio_url_map.generated.ts');
  if (!RELEASE_RECEIPT) { console.error('Cleanup refused: --release-receipt is required as external OTA/store rollout evidence.'); process.exit(2); }
  try { validateReleaseReceipt(readJsonStrict(path.resolve(ROOT, RELEASE_RECEIPT)), fileSha(runtimeMap)); }
  catch (e) { console.error(`Cleanup refused: ${e.message}`); process.exit(2); }
  if (process.env.PHRASEMAN_ALLOW_UPLOAD !== '1' || !process.env.FB_TOKEN) {
    console.error('Cleanup refused: PHRASEMAN_ALLOW_UPLOAD=1 and FB_TOKEN are required.');
    process.exit(2);
  }
  const cleanup = readJsonStrict(CLEANUP_FILE);
  if (!Array.isArray(cleanup.rows)) { console.error('Cleanup manifest malformed'); process.exit(2); }
  const runtimeSource = fs.readFileSync(runtimeMap, 'utf8');
  const authoritative = { ...readJsonStrict(MAP_JSON), ...readJsonStrict(GAPS_JSON) };
  for (const row of cleanup.rows) {
    const record = authoritative[row.id];
    if (!record || record.source !== row.source || record.url !== row.newUrl) {
      console.error(`Cleanup refused for ${row.id}: source/new URL differs from authoritative id record`); process.exit(2);
    }
    const count = runtimeSource.split(row.newUrl).length - 1;
    try { validateCleanupRow(row, count === 1 ? row.newUrl : ''); }
    catch (e) { console.error(`Cleanup refused for ${row.id}: ${e.message}`); process.exit(2); }
  }
  for (const row of cleanup.rows) {
    if (row.deletedAt) continue;
    const oldObject = objectFromPublicUrl(row.oldUrl);
    if (!oldObject) { console.error(`Cleanup refused: invalid old URL for ${row.id}`); process.exit(2); }
    const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(oldObject)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${process.env.FB_TOKEN}` },
    });
    if (!response.ok && response.status !== 404) { console.error(`Cleanup delete failed for ${row.id}: HTTP ${response.status}`); process.exit(1); }
    row.deletedAt = new Date().toISOString();
    atomicWriteJson(CLEANUP_FILE, cleanup, { backup: true });
  }
  console.log(`Deleted/confirmed ${cleanup.rows.length} old objects after deployment confirmation.`);
  process.exit(0);
}

// â”€â”€ 1) get the drift list from the audit (single source of truth) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function runAudit() {
  const r = spawnSync('node', [path.join('scripts', 'audit_phrase_audio_sync.mjs'), '--json'], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 32 * 1024 * 1024,
  });
  return parseAuditProcess(r);
}

// Resolve each flagged phrase to its {id, source} via the voiced-text map, so we
// upload to the correct existing object and overwrite in place.
function buildIdIndex() {
  const byUrl = new Map();
  const byId = new Map();
  for (const f of [MAP_JSON, GAPS_JSON]) {
    if (!fs.existsSync(f)) continue;
    const obj = readJsonStrict(f);
    for (const id of Object.keys(obj)) {
      const rec = obj[id];
      if (rec && rec.url) {
        const meta = { id, source: rec.source, file: f, url: rec.url, text: rec.text || '' };
        byUrl.set(rec.url, meta);
        byId.set(id, meta);
      }
    }
  }
  return { byUrl, byId };
}

const audit = runAudit();
const actionable = [
  ...((audit.findings && audit.findings.AUDIO_SAYS_OLD) || []),
  ...((audit.findings && audit.findings.SHOWN_NO_AUDIO) || []),
];
const actionableById = new Map(actionable.map((item) => [item.id, item]));
let targets = null;
if (TARGET_FILE) {
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(path.resolve(ROOT, TARGET_FILE), 'utf8')); }
  catch (e) { console.error(`Target manifest could not be read: ${e.message}`); process.exit(2); }
  if (!Array.isArray(parsed) || parsed.some((x) => !x || typeof x.id !== 'string' || typeof x.text !== 'string')) {
    console.error('Target manifest must be an array of {id,text} records'); process.exit(2);
  }
  const ids = parsed.map((x) => x.id);
  if (new Set(ids).size !== ids.length) { console.error('Target manifest contains duplicate ids'); process.exit(2); }
  const targetSet = new Set(ids);
  const targetDrift = ((audit.findings && audit.findings.FIELD_DRIFT) || []).filter((x) => targetSet.has(x.id));
  if (targetDrift.length) { console.error(`Target FIELD_DRIFT: ${targetDrift.map((x) => x.id).join(', ')}`); process.exit(2); }
  for (const target of parsed) {
    const finding = actionableById.get(target.id);
    if (!finding) { console.error(`Target is not actionable: ${target.id}`); process.exit(2); }
    if (finding.shown !== target.text) {
      console.error(`Target text mismatch for ${target.id}: manifest=${JSON.stringify(target.text)} runtime=${JSON.stringify(finding.shown)}`);
      process.exit(2);
    }
  }
  targets = parsed.map((target) => actionableById.get(target.id));
}
const drift = targets || actionable;
if (drift.length === 0) {
  console.log('Nothing to do — audit reports no missing or stale target audio.');
  process.exit(0);
}

const { byUrl, byId } = buildIdIndex();
const plan = [];
for (const d of drift) {
  // Phrase id is the authority for the Storage slot. URL is only a consistency
  // check; it must never redirect a phrase into a different id's object.
  const meta = byId.get(d.id);
  if (!meta || meta.id !== d.id || !meta.url) {
    console.error(`Target slot unresolved or not URL-backed: ${d.id}`);
    process.exit(2);
  }
  if (d.url && d.url !== meta.url) {
    console.error(`Target URL mismatch for ${d.id}`);
    process.exit(2);
  }
  plan.push({ phraseId: d.id, mp3Id: meta.id, source: meta.source, mapFile: meta.file, newText: d.shown, oldText: d.voiced || meta.text });
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
  console.error('Apply refused: PHRASEMAN_ALLOW_UPLOAD=1 is required for the journaled two-phase publication.');
  process.exit(2);
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
  // Content-hashed names make a prior successful-but-uncheckpointed upload
  // safely resumable. Query metadata first; an existing exact object needs no
  // second upload and still resolves to the same immutable URL.
  const metadataUrl = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objName)}?fields=name,size`;
  const existing = await fetch(metadataUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (existing.ok) {
    const metadata = await existing.json();
    if (Number(metadata.size) !== buf.length) throw new Error(`Existing content-versioned object has wrong size: ${objName}`);
    return;
  }
  if (existing.status !== 404) throw new Error(`Storage metadata query failed: HTTP ${existing.status}`);
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

const manifestFiles = {};
for (const file of new Set(plan.map((p) => p.mapFile))) manifestFiles[file] = { path: file, data: readJsonStrict(file) };
const oldById = Object.fromEntries(plan.map((p) => [p.mp3Id, manifestFiles[p.mapFile].data[p.mp3Id].url]));

try {
  await runTwoPhase({
    plan, journalFile: JOURNAL_FILE, manifestFiles,
    generate: async (p) => {
      const dir = path.join(REGEN_DIR, p.source); fs.mkdirSync(dir, { recursive: true });
      const abs = path.join(dir, `${p.mp3Id}.mp3`);
      let lastError = new Error('not generated');
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const buf = await ttsOnce(p.newText); fs.writeFileSync(abs, buf);
          const max = await maxDb(abs);
          if (max != null && max > -30) return { localFile: abs, sha: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
          lastError = new Error(`inaudible max=${max}`);
        } catch (e) { lastError = e; }
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
      throw lastError;
    },
    upload: async (p, row) => {
      const buf = fs.readFileSync(row.localFile);
      if (createHash('sha256').update(buf).digest('hex') !== row.sha) throw new Error(`Local audio SHA changed: ${p.mp3Id}`);
      const objName = objectName(p.mp3Id, p.source, row.sha);
      await uploadOne(objName, buf);
      return { objectName: objName, newUrl: publicUrl(objName), uploadedAt: new Date().toISOString() };
    },
    rebuild: async () => {
      const r = spawnSync('node', [path.join('.codex-tmp', 'tts-voicing', 'build_map_ts.mjs')], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
      if (r.status !== 0) throw new Error(`Runtime map rebuild failed: ${r.stderr || r.stdout || r.status}`);
    },
  });
  const journal = readJsonStrict(JOURNAL_FILE);
  atomicWriteJson(CLEANUP_FILE, buildCleanupManifest(plan, oldById, journal));
  console.log(`DONE: ${plan.length} generated, uploaded, manifested, and runtime map rebuilt.`);
  console.log(`Old objects were NOT deleted. Cleanup manifest: ${CLEANUP_FILE}`);
} catch (e) {
  console.error(e.message); process.exit(1);
}
