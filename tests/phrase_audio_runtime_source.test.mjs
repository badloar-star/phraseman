import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url);

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
  const findings = Object.values(report.findings).flat();
  const phrase = findings.find((item) => item.id === 'lesson31_phrase_1');

  assert.ok(phrase, 'lesson31_phrase_1 must be actionable before its audio is regenerated');
  assert.equal(phrase.shown, 'They made the new driver pay a big fine.');
  assert.equal(report.findings.FIELD_DRIFT.some((item) => item.id === 'lesson31_phrase_1'), false);
});

test('audio audit preserves the complete lesson phrase corpus', () => {
  const report = audit();
  assert.equal(report.phrasesScanned, 1600);
});

test('changed-audio manifest is exactly the 58 current missing-audio findings with URL-backed same-id slots', () => {
  const report = audit();
  const targets = JSON.parse(fs.readFileSync(new URL('./fixtures/phrase_audio_changed_58.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.findings.SHOWN_NO_AUDIO.map(({ id, shown }) => ({ id, text: shown })), targets);
  assert.deepEqual(report.findings.AUDIO_SAYS_OLD.map(({ id }) => id), [
    'lesson19_phrase_7', 'lesson19_phrase_31', 'lesson30_phrase_43',
  ]);
  assert.deepEqual(report.findings.FIELD_DRIFT.map(({ id }) => id), ['lesson8_phrase_35']);

  const voiced = JSON.parse(fs.readFileSync(new URL('../.codex-tmp/tts-voicing/audio_url_map.json', import.meta.url), 'utf8'));
  for (const { id } of targets) {
    assert.equal(typeof voiced[id]?.url, 'string', `${id} must resolve to its own existing URL-backed slot`);
  }
});

test('regen dry-run plans shown-without-audio phrases in their existing id slots', () => {
  const manifest = new URL('./fixtures/phrase_audio_changed_58.json', import.meta.url);
  const targets = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  assert.equal(targets.length, 58);
  assert.equal(new Set(targets.map(({ id }) => id)).size, 58);

  const result = spawnSync('node', ['scripts/regen_phrase_audio_storage.mjs', '--target-ids-file', manifest.pathname.slice(1)], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /REGEN PLAN .* 58 clip\(s\)/);
  assert.match(result.stdout, /lesson31_phrase_1 \[lesson\]/);
  assert.match(result.stdout, /new text:\s+"They made the new driver pay a big fine\."/);
  assert.match(result.stdout, /lesson12_phrase_8 \[lesson\]/);
  assert.doesNotMatch(result.stdout, /lesson19_phrase_7 \[lesson\]/);
  assert.doesNotMatch(result.stdout, /lesson30_phrase_43 \[lesson\]/);
});

test('targeted regen fails closed when expected runtime text is wrong', () => {
  const bad = new URL('../.codex-tmp/bad-audio-target.json', import.meta.url);
  fs.mkdirSync(new URL('../.codex-tmp/', import.meta.url), { recursive: true });
  fs.writeFileSync(bad, JSON.stringify([{ id: 'lesson31_phrase_1', text: 'Wrong text.' }]));
  const result = spawnSync('node', ['scripts/regen_phrase_audio_storage.mjs', '--target-ids-file', bad.pathname.slice(1)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /text mismatch/i);
});

test('old-object cleanup refuses without an external release receipt', () => {
  const result = spawnSync('node', ['scripts/regen_phrase_audio_storage.mjs', '--cleanup-old'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cleanup refused/i);
});
