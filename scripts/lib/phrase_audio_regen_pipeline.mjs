import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function versionedObjectName(prefix, source, id, sha) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `${prefix}/${source}/${safe}-${sha.slice(0, 12)}.mp3`;
}

export function parseAuditProcess(result) {
  if (!result.stdout) throw new Error(`Audio audit produced no JSON (exit ${result.status})`);
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch (e) { throw new Error(`Audio audit JSON malformed: ${e.message}`); }
  if (result.status !== 0 && result.status !== 1) throw new Error(`Audio audit failed with exit ${result.status}: ${result.stderr || ''}`);
  if (!parsed.findings || !parsed.counts) throw new Error('Audio audit JSON missing findings/counts');
  return parsed;
}

export function buildCleanupManifest(plan, oldById, journal) {
  return {
    version: 1,
    note: 'Deletion before runtime-map deployment is unsafe: clients may still request old immutable URLs.',
    rows: plan.map((p) => ({ id: p.mp3Id, source: p.source, oldUrl: oldById[p.mp3Id], newUrl: journal.rows[p.mp3Id].newUrl })),
  };
}

function batchIdentity(plan) {
  return plan.map((p) => ({ id: p.mp3Id, text: p.newText, source: p.source, mapFile: p.mapFile }));
}
function batchFingerprint(plan) {
  return createHash('sha256').update(JSON.stringify(batchIdentity(plan))).digest('hex');
}

export function validateReleaseReceipt(receipt, currentSha, now = Date.now()) {
  if (!receipt || typeof receipt !== 'object' || !receipt.releaseId || !receipt.minSupportedVersion) throw new Error('Release receipt schema invalid');
  if (!/^[a-f0-9]{64}$/.test(receipt.deployedRuntimeMapSha256 || '') || receipt.deployedRuntimeMapSha256 !== currentSha) throw new Error('Release receipt runtime-map SHA mismatch');
  const deployedAt = Date.parse(receipt.deployedAt); const retentionUntil = Date.parse(receipt.retentionUntil);
  if (!Number.isFinite(deployedAt) || !Number.isFinite(retentionUntil) || retentionUntil < deployedAt) throw new Error('Release receipt timestamps invalid');
  if (now < retentionUntil) throw new Error('Release receipt retention period has not expired');
  if (receipt.oldAudioCompatibilityExpired !== true) throw new Error('Release receipt must explicitly confirm oldAudioCompatibilityExpired');
}

export function validateCleanupRow(row, currentNewUrl, bucket = 'phraseman-ea0b3.firebasestorage.app') {
  if (!row || !row.id || !row.source || !row.oldUrl || !row.newUrl || row.oldUrl === row.newUrl) throw new Error('Cleanup row invalid');
  const u = new URL(row.oldUrl);
  let object = '';
  if (u.hostname === 'firebasestorage.googleapis.com') {
    const m = u.pathname.match(new RegExp(`^/v0/b/${bucket.replace(/\./g, '\\.')}/o/(.+)$`)); object = m ? decodeURIComponent(m[1]) : '';
  } else if (u.hostname === 'storage.googleapis.com') {
    const prefix = `/${bucket}/`; object = u.pathname.startsWith(prefix) ? decodeURIComponent(u.pathname.slice(prefix.length)) : '';
  }
  const expectedPrefix = `phrase-audio/${row.source}/`;
  if (!object.startsWith(expectedPrefix)) throw new Error('Cleanup old URL bucket/prefix/source mismatch');
  const base = object.slice(expectedPrefix.length);
  if (base !== `${row.id}.mp3` && !new RegExp(`^${row.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[a-f0-9]{12}\\.mp3$`).test(base)) throw new Error('Cleanup old object id mismatch');
  if (currentNewUrl !== row.newUrl) throw new Error('Cleanup new URL is not exact current runtime URL');
}

export function readJsonStrict(file) {
  if (!fs.existsSync(file)) throw new Error(`Required JSON missing: ${file}`);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object') throw new Error(`Invalid JSON root: ${file}`);
  return value;
}

export function atomicWriteJson(file, value, { backup = false } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (backup && fs.existsSync(file)) fs.copyFileSync(file, `${file}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2)); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}

export async function runTwoPhase({ plan, journalFile, manifestFiles, generate, upload, rebuild }) {
  const fingerprint = batchFingerprint(plan);
  const journal = fs.existsSync(journalFile) ? readJsonStrict(journalFile) : { version: 2, batchFingerprint: fingerprint, batch: batchIdentity(plan), rows: {} };
  if (journal.version !== 2 || journal.batchFingerprint !== fingerprint || JSON.stringify(journal.batch) !== JSON.stringify(batchIdentity(plan))) throw new Error('Journal batch fingerprint mismatch');
  const expectedIds = new Set(plan.map((p) => p.mp3Id));
  if (Object.keys(journal.rows).some((id) => !expectedIds.has(id))) throw new Error('Journal contains rows from a different batch');
  for (const item of plan) {
    const exact = { text: item.newText, source: item.source, mapFile: item.mapFile, batchFingerprint: fingerprint };
    const row = journal.rows[item.mp3Id];
    if (row && (row.text !== exact.text || row.source !== exact.source || row.mapFile !== exact.mapFile || row.batchFingerprint !== fingerprint)) throw new Error(`Journal row mismatch: ${item.mp3Id}`);
    journal.rows[item.mp3Id] ||= { status: 'pending', ...exact };
  }
  atomicWriteJson(journalFile, journal);
  let generationFailed = false;
  for (const item of plan) {
    const row = journal.rows[item.mp3Id];
    if (['generated', 'uploaded', 'manifested', 'map_rebuilt'].includes(row.status) && row.localFile) continue;
    try { Object.assign(row, await generate(item), { status: 'generated', error: undefined }); }
    catch (e) { Object.assign(row, { status: 'pending', error: e.message }); generationFailed = true; }
    atomicWriteJson(journalFile, journal);
  }
  if (generationFailed) throw new Error('Phase A failed; zero uploads attempted');
  for (const item of plan) {
    const row = journal.rows[item.mp3Id];
    if (['manifested', 'map_rebuilt'].includes(row.status)) continue;
    if (row.status === 'generated') {
      Object.assign(row, await upload(item, row), { status: 'uploaded' });
      atomicWriteJson(journalFile, journal);
    }
    const mapFile = manifestFiles[item.mapFile];
    if (!mapFile) throw new Error(`No loaded manifest for ${item.mapFile}`);
    mapFile.data[item.mp3Id] = { ...mapFile.data[item.mp3Id], url: row.newUrl, source: item.source, text: item.newText };
    atomicWriteJson(mapFile.path, mapFile.data, { backup: true });
    row.status = 'manifested';
    atomicWriteJson(journalFile, journal);
  }
  await rebuild();
  for (const item of plan) journal.rows[item.mp3Id].status = 'map_rebuilt';
  atomicWriteJson(journalFile, journal);
  return journal;
}
