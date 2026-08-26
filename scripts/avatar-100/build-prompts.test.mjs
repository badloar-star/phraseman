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
  const mythic = buildVariantPrompt({ id: 113, subject: 'obsidian direwolf', price: 500, variant: 'black' });
  const primordial = buildVariantPrompt({ id: 123, subject: 'eclipse world-serpent', price: 1000, variant: 'white' });

  assert.match(mythic, /aggressive mythical apex predator/);
  assert.match(primordial, /primordial non-humanoid super-being/);
  assert.match(primordial, /no rainbow or generic full-spectrum treatment/);
});

test('encodes the showcase-only 3000 Absolute as an imperial astral snow leopard', () => {
  const dark = buildVariantPrompt({ id: 126, subject: 'imperial astral snow leopard', price: 3000, variant: 'black' });
  const light = buildVariantPrompt({ id: 126, subject: 'imperial astral snow leopard', price: 3000, variant: 'white' });

  for (const prompt of [dark, light]) {
    assert.match(prompt, /Absolute/);
    assert.match(prompt, /imperial astral snow leopard/);
    assert.match(prompt, /beautiful, noble, and visibly priceless/);
    assert.match(prompt, /four natural feline limbs/);
    assert.match(prompt, /no rainbow/);
    assert.match(prompt, /no detached halo, orbital ring, scenery, humanoid, or machine/);
    assert.match(prompt, /no crop/);
  }
  assert.match(dark, /black-diamond, champagne gold, and restrained cold-white embedded constellations/);
  assert.match(light, /moonstone, platinum, champagne gold, and restrained cold-white embedded constellations/);
  assert.notEqual(dark, light);
});

test('keeps the 50-pearl starter tier intentionally simpler than premium tiers', () => {
  const starter = buildVariantPrompt({ id: 64, subject: 'ornamental rabbit', price: 50, variant: 'white' });

  assert.match(starter, /no jewelry, armor, gems, chains, pendants, or ceremonial ornament/);
  assert.match(starter, /one subtle natural marking at most/);
});
