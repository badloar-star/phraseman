import assert from 'node:assert/strict';
import test from 'node:test';

import { buildVariantPrompt } from './build-prompts.mjs';

const base = {
  id: 103,
  subject: 'great white shark',
};

test('builds independent dark and light prompts with safe matte and silhouette constraints', () => {
  const dark = buildVariantPrompt({ ...base, price: 300, variant: 'black' });
  const light = buildVariantPrompt({ ...base, price: 300, variant: 'white' });

  for (const prompt of [dark, light]) {
    assert.match(prompt, /flat saturated chroma matte/);
    assert.match(prompt, /full silhouette with empty margin on all four sides/);
    assert.match(prompt, /independent generation/);
    assert.match(prompt, /no human, humanoid, robot, machine, vehicle, text, pedestal, or detached ornament/);
    assert.match(prompt, /recognizable real apex predator/);
  }
  assert.notEqual(dark, light);
});

test('encodes the approved 500 and 1000 predator ladder without rainbow treatment', () => {
  const mythic = buildVariantPrompt({ id: 114, subject: 'obsidian direwolf', price: 500, variant: 'black' });
  const primordial = buildVariantPrompt({ id: 123, subject: 'eclipse world-serpent', price: 1000, variant: 'white' });

  assert.match(mythic, /aggressive mythical apex predator/);
  assert.match(primordial, /primordial non-humanoid super-being/);
  assert.match(primordial, /no rainbow or generic full-spectrum treatment/);
});

test('rejects the retired 3000-pearl prompt tier', () => {
  assert.throws(
    () => buildVariantPrompt({ id: 127, subject: 'retired absolute concept', price: 3000, variant: 'black' }),
    /requires id, subject, supported price/,
  );
});

test('keeps the 50-pearl starter tier intentionally simpler than premium tiers', () => {
  const starter = buildVariantPrompt({ id: 64, subject: 'ornamental rabbit', price: 50, variant: 'white' });

  assert.match(starter, /no jewelry, armor, gems, chains, pendants, or ceremonial ornament/);
  assert.match(starter, /one subtle natural marking at most/);
});
