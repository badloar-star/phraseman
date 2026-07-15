import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url);

const normalizeAudioKey = (text) => String(text).trim().toLowerCase().replace(/\s+/g, ' ');

function runtimeAudioMap() {
  const source = fs.readFileSync(new URL('../app/phrase_audio_url_map.generated.ts', import.meta.url), 'utf8');
  const entries = new Map();
  for (const match of source.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*"(https[^"]+)"/gm)) {
    entries.set(normalizeAudioKey(JSON.parse(`"${match[1]}"`)), match[2]);
  }
  return entries;
}

function audit() {
  const result = spawnSync('node', ['scripts/audit_phrase_audio_sync.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.ok(result.stdout, result.stderr);
  return JSON.parse(result.stdout);
}

test('audio audit uses the final runtime sentence for lesson 31', () => {
  const report = audit();
  const actionable = ['SHOWN_NO_AUDIO', 'AUDIO_SAYS_OLD', 'FIELD_DRIFT']
    .flatMap((kind) => report.findings[kind]);

  assert.equal(actionable.some((item) => item.id === 'lesson31_phrase_1'), false);
  const runtimeMap = runtimeAudioMap();
  const url = runtimeMap.get(normalizeAudioKey('They made the new driver pay a big fine.'));
  assert.match(url ?? '', /lesson31_phrase_1-[a-f0-9]{12}\.mp3/);
});

test('audio audit preserves the complete lesson phrase corpus', () => {
  const report = audit();
  assert.equal(report.phrasesScanned, 1600);
});

test('changed-audio manifest is exactly 58 resolved same-id runtime slots', () => {
  const report = audit();
  const targets = JSON.parse(fs.readFileSync(new URL('./fixtures/phrase_audio_changed_58.json', import.meta.url), 'utf8'));
  assert.equal(targets.length, 58);
  assert.equal(new Set(targets.map(({ id }) => id)).size, 58);

  const actionableIds = new Set(['SHOWN_NO_AUDIO', 'AUDIO_SAYS_OLD', 'FIELD_DRIFT']
    .flatMap((kind) => report.findings[kind].map(({ id }) => id)));
  for (const { id } of targets) assert.equal(actionableIds.has(id), false, `${id} must be resolved`);

  assert.deepEqual(report.findings.SHOWN_NO_AUDIO.map(({ id }) => id), []);
  assert.deepEqual(report.findings.AUDIO_SAYS_OLD.map(({ id }) => id), []);
  assert.deepEqual(report.findings.FIELD_DRIFT.map(({ id }) => id), []);
  assert.equal(report.totalActionable, 0);

  const runtimeMap = runtimeAudioMap();
  for (const { id, text } of targets) {
    const url = runtimeMap.get(normalizeAudioKey(text));
    assert.match(url ?? '', new RegExp(`${id}-[a-f0-9]{12}\\.mp3`), `${id} must use its content-versioned object`);
  }
});

test('regen refuses to reprocess the resolved 58-slot batch', () => {
  const manifest = new URL('./fixtures/phrase_audio_changed_58.json', import.meta.url);
  const targets = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  assert.equal(targets.length, 58);
  assert.equal(new Set(targets.map(({ id }) => id)).size, 58);

  const result = spawnSync('node', ['scripts/regen_phrase_audio_storage.mjs', '--target-ids-file', manifest.pathname.slice(1)], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Target is not actionable: lesson12_phrase_8/);
});

test('targeted regen fails closed when expected runtime text is wrong', () => {
  const bad = new URL('../.codex-tmp/bad-audio-target.json', import.meta.url);
  fs.mkdirSync(new URL('../.codex-tmp/', import.meta.url), { recursive: true });
  fs.writeFileSync(bad, JSON.stringify([{ id: 'lesson31_phrase_1', text: 'Wrong text.' }]));
  const result = spawnSync('node', ['scripts/regen_phrase_audio_storage.mjs', '--target-ids-file', bad.pathname.slice(1)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not actionable|text mismatch/i);
});

test('old-object cleanup refuses without an external release receipt', () => {
  const result = spawnSync('node', ['scripts/regen_phrase_audio_storage.mjs', '--cleanup-old'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cleanup refused/i);
});
