import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  AUDIO_CUES,
  SOUND_PACKS,
  TIMELINE_MS,
} from '../scripts/daily_journey_audio_catalog.mjs';

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
