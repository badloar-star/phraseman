import assert from 'node:assert/strict';
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
