import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
  AUDIO_CUES,
  SOUND_PACKS,
  TIMELINE_MS,
} from '../scripts/daily_journey_audio_catalog.mjs';

const execFileAsync = promisify(execFile);
const audioRoot = new URL('../docs/design/daily-journey-audio/', import.meta.url);

test('defines five speech-free packs and twenty paid cues', () => {
  assert.equal(SOUND_PACKS.length, 5);
  assert.deepEqual(
    AUDIO_CUES.map((cue) => cue.kind),
    ['intro', 'pulse', 'reveal', 'tap'],
  );
  assert.equal(SOUND_PACKS.length * AUDIO_CUES.length, 20);

  for (const pack of SOUND_PACKS) {
    assert.deepEqual(
      Object.keys(pack.prompts).sort(),
      ['intro', 'pulse', 'reveal', 'tap'],
    );
    for (const prompt of Object.values(pack.prompts)) {
      assert.match(
        prompt,
        /No speech, no voice, no words, no vocals, no melody\./,
      );
      assert.ok(prompt.length <= 450);
    }
  }

  assert.equal(TIMELINE_MS.duration, 6200);
  assert.deepEqual(TIMELINE_MS.pulses, [2800, 3230, 3660]);
  assert.equal(TIMELINE_MS.reveal, 4100);
});

test('generator is checkpointed and never leaks its key', async () => {
  const source = await readFile(
    new URL('../scripts/generate_daily_journey_audio.mjs', import.meta.url),
    'utf8',
  );

  assert.match(source, /ELEVENLABS_API_KEY/);
  assert.match(source, /generation-manifest\.json/);
  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /character-cost/i);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*apiKey/);
  assert.doesNotMatch(source, /text-to-speech/i);
});

test('publishes five synchronized masters and taps without secrets', async () => {
  const publicManifestText = await readFile(new URL('manifest.json', audioRoot), 'utf8');
  const publicManifest = JSON.parse(publicManifestText);

  assert.equal(publicManifest.packs.length, 5);
  assert.doesNotMatch(publicManifestText, /apiKey|xi-api-key|sk_/i);

  for (const pack of SOUND_PACKS) {
    const masterUrl = new URL(`${pack.id}-master.mp3`, audioRoot);
    const tapUrl = new URL(`${pack.id}-tap.mp3`, audioRoot);
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      fileURLToPath(masterUrl),
    ]);
    const duration = Number.parseFloat(stdout.trim());
    assert.ok(duration >= 6.15 && duration <= 6.25, `${pack.id}: ${duration}`);
    assert.ok((await readFile(tapUrl)).length > 0, `${pack.id} tap is empty`);
  }
});
