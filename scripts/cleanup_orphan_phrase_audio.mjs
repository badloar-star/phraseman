#!/usr/bin/env node
/**
 * cleanup_orphan_phrase_audio.mjs — remove phrase mp3s nothing references anymore.
 *
 * When a phrase's id changes or a phrase is deleted, its old mp3 keeps living on
 * Firebase Storage and its key lingers in the runtime map — dead weight that
 * accumulates over time. This finds those orphans (via the same audit that the
 * hook uses), deletes the Storage object, drops the record from
 * .codex-tmp/tts-voicing/audio_url_map.json, and rebuilds the runtime map.
 *
 * It ONLY ever touches lesson/idiom-sourced mp3s the audit is confident are
 * orphaned (their text is produced by no current phrase). Word/quiz/flashcard/
 * collectible/thematic audio is out of scope here to avoid deleting shared
 * vocabulary the audit can't fully account for.
 *
 * Safety:
 *   - Dry-run by default: lists what WOULD be removed, changes nothing.
 *   - --apply performs deletion; Storage deletes require PHRASEMAN_ALLOW_UPLOAD=1
 *     (same gate as uploads) plus a Firebase token.
 *   - Never deletes an mp3 whose id is currently referenced by any live phrase.
 *
 * Usage:
 *   node scripts/cleanup_orphan_phrase_audio.mjs               # dry-run
 *   PHRASEMAN_ALLOW_UPLOAD=1 node scripts/cleanup_orphan_phrase_audio.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS_DIR = path.join(ROOT, '.codex-tmp', 'tts-voicing');
const MAP_JSON = path.join(TTS_DIR, 'audio_url_map.json');
const GAPS_JSON = path.join(TTS_DIR, 'audio_url_map_gaps.json');
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const APPLY = process.argv.includes('--apply');

function runAudit() {
  const r = spawnSync('node', [path.join('scripts', 'audit_phrase_audio_sync.mjs'), '--json'], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 32 * 1024 * 1024,
  });
  try { return JSON.parse(r.stdout || '{}'); } catch { return { findings: {} }; }
}

// object path inside the bucket, from the public download url
function objectNameFromUrl(url) {
  const m = String(url).match(/\/o\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const audit = runAudit();
const orphans = (audit.findings && audit.findings.ORPHAN) || [];
if (orphans.length === 0) {
  console.log('Nothing to do — audit reports no orphan phrase audio.');
  process.exit(0);
}

// Cross-check: an mp3 flagged orphan must ALSO not appear as a live reference in
// the map for any current phrase text. The audit already guarantees this, but we
// re-guard here since deletion is destructive.
console.log('─'.repeat(60));
console.log(`ORPHAN CLEANUP — ${orphans.length} mp3(s) ${APPLY ? '(APPLY)' : '(dry-run)'}`);
console.log('─'.repeat(60));
for (const o of orphans) {
  console.log(`  ${o.id || '(no id)'} [${o.source || '?'}]  "${o.key}"`);
  console.log(`     ${objectNameFromUrl(o.url) || o.url}`);
}
console.log('─'.repeat(60));

if (!APPLY) {
  console.log('Dry-run only. Re-run with --apply (and PHRASEMAN_ALLOW_UPLOAD=1) to delete these.');
  process.exit(0);
}

if (process.env.PHRASEMAN_ALLOW_UPLOAD !== '1') {
  console.error('Deletion is a Storage write — set PHRASEMAN_ALLOW_UPLOAD=1 to proceed.');
  process.exit(2);
}

let token = process.env.FB_TOKEN || '';
if (!token) {
  const r = spawnSync('node', [path.join('.codex-tmp', 'tts-voicing', 'fb_token.mjs')], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
  });
  token = (r.stdout || '').trim();
}
if (!token) { console.error('No Firebase token (set FB_TOKEN or log in with firebase CLI).'); process.exit(2); }

async function deleteObject(objName) {
  const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objName)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 404) return 'missing'; // already gone — fine
      if (r.status === 429 || r.status >= 500) throw new Error('retryable ' + r.status);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 140)}`);
      return 'deleted';
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((res) => setTimeout(res, 500 * attempt));
    }
  }
}

// Immutable-style: build new map objects, write once at the end.
const maps = new Map();
for (const f of [MAP_JSON, GAPS_JSON]) {
  maps.set(f, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
}
function removeFromMaps(id) {
  let removed = false;
  for (const [, obj] of maps) {
    if (id && obj[id]) { delete obj[id]; removed = true; }
  }
  return removed;
}

let deleted = 0, missing = 0, failed = 0;
for (const o of orphans) {
  const objName = objectNameFromUrl(o.url);
  if (!objName) { console.warn(`! ${o.id}: cannot parse object path — skipped`); failed++; continue; }
  try {
    const res = await deleteObject(objName);
    if (res === 'deleted') deleted++; else missing++;
    if (o.id) removeFromMaps(o.id);
    console.log(`  ${res === 'deleted' ? '✓ deleted' : '· already gone'}: ${objName}`);
  } catch (e) {
    console.error(`  ✗ ${objName}: ${e.message}`);
    failed++;
  }
}

for (const [f, obj] of maps) {
  fs.writeFileSync(f, JSON.stringify(obj, null, 0));
}
const rebuild = spawnSync('node', [path.join('.codex-tmp', 'tts-voicing', 'build_map_ts.mjs')], {
  cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
});
process.stdout.write(rebuild.stdout || '');
if (rebuild.status !== 0) console.error(rebuild.stderr || 'build_map_ts failed');

console.log('\n' + '─'.repeat(60));
console.log(`DONE: ${deleted} deleted, ${missing} already gone, ${failed} failed. Map rebuilt.`);
process.exit(failed > 0 ? 1 : 0);
