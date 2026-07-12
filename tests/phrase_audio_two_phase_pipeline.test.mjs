import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildCleanupManifest, parseAuditProcess, readJsonStrict, runTwoPhase, validateCleanupRow, validateReleaseReceipt, versionedObjectName } from '../scripts/lib/phrase_audio_regen_pipeline.mjs';

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phrase-audio-'));
  const manifest = path.join(dir, 'map.json');
  fs.writeFileSync(manifest, JSON.stringify({ a: { url: 'old-a', text: 'old' }, b: { url: 'old-b', text: 'old' } }));
  const plan = ['a', 'b'].map((id) => ({ mp3Id: id, source: 'lesson', mapFile: manifest, newText: `new-${id}` }));
  return { dir, manifest, plan, journalFile: path.join(dir, 'journal.json') };
}

test('generation failure attempts no uploads', async () => {
  const s = setup(); let uploads = 0;
  await assert.rejects(runTwoPhase({ ...s, manifestFiles: { [s.manifest]: { path: s.manifest, data: JSON.parse(fs.readFileSync(s.manifest)) } },
    generate: async (p) => { if (p.mp3Id === 'b') throw new Error('tts'); return { localFile: 'a.mp3', sha: '123' }; },
    upload: async () => { uploads++; }, rebuild: async () => {} }), /zero uploads/i);
  assert.equal(uploads, 0);
});

test('upload failure checkpoints manifested rows and resumes idempotently', async () => {
  const s = setup(); let fail = true; const calls = [];
  const args = { ...s, manifestFiles: { [s.manifest]: { path: s.manifest, data: JSON.parse(fs.readFileSync(s.manifest)) } },
    generate: async (p) => ({ localFile: `${p.mp3Id}.mp3`, sha: `sha-${p.mp3Id}` }),
    upload: async (p) => { calls.push(p.mp3Id); if (p.mp3Id === 'b' && fail) throw new Error('upload'); return { newUrl: `new-${p.mp3Id}-sha` }; }, rebuild: async () => {} };
  await assert.rejects(runTwoPhase(args), /upload/);
  assert.equal(JSON.parse(fs.readFileSync(s.manifest)).a.url, 'new-a-sha');
  fail = false; args.manifestFiles[s.manifest].data = JSON.parse(fs.readFileSync(s.manifest));
  await runTwoPhase(args);
  assert.deepEqual(calls, ['a', 'b', 'b']);
  assert.equal(JSON.parse(fs.readFileSync(s.journalFile)).rows.b.status, 'map_rebuilt');
  assert.ok(fs.readdirSync(s.dir).some((x) => x.startsWith('map.json.backup-')));
});

test('rebuild failure remains nonzero and resumable', async () => {
  const s = setup();
  await assert.rejects(runTwoPhase({ ...s, manifestFiles: { [s.manifest]: { path: s.manifest, data: JSON.parse(fs.readFileSync(s.manifest)) } },
    generate: async (p) => ({ localFile: `${p.mp3Id}.mp3`, sha: 'sha' }), upload: async (p) => ({ newUrl: `new-${p.mp3Id}` }),
    rebuild: async () => { throw new Error('rebuild failed'); } }), /rebuild failed/);
  assert.equal(JSON.parse(fs.readFileSync(s.journalFile)).rows.a.status, 'manifested');
});

test('new objects are content-versioned for immutable cache busting', () => {
  assert.equal(versionedObjectName('phrase-audio', 'lesson', 'lesson31_phrase_1', 'abcdef1234567890'),
    'phrase-audio/lesson/lesson31_phrase_1-abcdef123456.mp3');
});

test('audit failures and malformed map JSON fail closed', () => {
  assert.throws(() => parseAuditProcess({ status: 2, stdout: '{}', stderr: 'boom' }), /audit failed/i);
  assert.throws(() => parseAuditProcess({ status: 1, stdout: 'not-json', stderr: '' }), /malformed/i);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phrase-audio-json-'));
  const file = path.join(dir, 'bad.json'); fs.writeFileSync(file, '{');
  assert.throws(() => readJsonStrict(file), /JSON/);
});

test('cleanup manifest preserves exact old and new URLs without deleting', () => {
  assert.deepEqual(buildCleanupManifest([{ mp3Id: 'a', source: 'lesson' }], { a: 'old-url' }, { rows: { a: { newUrl: 'new-url' } } }).rows,
    [{ id: 'a', source: 'lesson', oldUrl: 'old-url', newUrl: 'new-url' }]);
});

test('journal refuses stale text, source, map, batch membership, and order', async () => {
  for (const mutate of [
    (p) => { p[0].newText = 'stale'; }, (p) => { p[0].source = 'word'; },
    (p) => { p[0].mapFile += '.other'; }, (p) => { p.pop(); }, (p) => { p.reverse(); },
  ]) {
    const s = setup();
    const manifests = { [s.manifest]: { path: s.manifest, data: JSON.parse(fs.readFileSync(s.manifest)) } };
    await runTwoPhase({ ...s, manifestFiles: manifests, generate: async (p) => ({ localFile: p.mp3Id, sha: 'x' }), upload: async (p) => ({ newUrl: p.mp3Id }), rebuild: async () => {} });
    const changed = structuredClone(s.plan); mutate(changed);
    await assert.rejects(runTwoPhase({ ...s, plan: changed, manifestFiles: manifests, generate: async () => ({}), upload: async () => ({}), rebuild: async () => {} }), /fingerprint|journal/i);
  }
});

test('cleanup validates bucket, prefix, source, id and distinct exact current new URL', () => {
  const good = { id: 'lesson31_phrase_1', source: 'lesson', oldUrl: 'https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/phrase-audio%2Flesson%2Flesson31_phrase_1.mp3?alt=media', newUrl: 'https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/phrase-audio%2Flesson%2Flesson31_phrase_1-abc.mp3?alt=media' };
  assert.doesNotThrow(() => validateCleanupRow(good, good.newUrl));
  for (const oldUrl of ['https://evil.test/x', good.oldUrl.replace('phraseman-ea0b3.firebasestorage.app', 'other.appspot.com'), good.oldUrl.replace('phrase-audio', 'other'), good.oldUrl.replace('%2Flesson%2F', '%2Fword%2F'), good.oldUrl.replace('lesson31_phrase_1.mp3', 'lesson31_phrase_2.mp3')]) {
    assert.throws(() => validateCleanupRow({ ...good, oldUrl }, good.newUrl));
  }
  assert.throws(() => validateCleanupRow({ ...good, newUrl: good.oldUrl }, good.oldUrl));
  assert.throws(() => validateCleanupRow(good, 'different-current-url'));
});

test('release receipt requires external rollout evidence and expired retention', () => {
  const now = Date.parse('2026-07-13T12:00:00Z');
  const good = { releaseId: 'release-1', deployedRuntimeMapSha256: 'a'.repeat(64), deployedAt: '2026-07-01T00:00:00Z', retentionUntil: '2026-07-12T00:00:00Z', minSupportedVersion: '1.5.53', oldAudioCompatibilityExpired: true };
  assert.doesNotThrow(() => validateReleaseReceipt(good, 'a'.repeat(64), now));
  for (const patch of [{ oldAudioCompatibilityExpired: false }, { deployedRuntimeMapSha256: 'b'.repeat(64) }, { retentionUntil: '2026-07-14T00:00:00Z' }, { releaseId: '' }, { minSupportedVersion: '' }]) {
    assert.throws(() => validateReleaseReceipt({ ...good, ...patch }, 'a'.repeat(64), now));
  }
});
