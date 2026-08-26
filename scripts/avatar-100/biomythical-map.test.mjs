import assert from 'node:assert/strict';
import test from 'node:test';

import { BIOMYTHICAL_AVATARS } from './biomythical-map.mjs';

test('defines the complete owner-approved 70–1000 biomythical reset map', () => {
  assert.deepEqual(
    BIOMYTHICAL_AVATARS.map(({ id }) => id),
    Array.from({ length: 53 }, (_, index) => index + 73),
  );

  const expectedTierCounts = new Map([
    [70, 10],
    [100, 10],
    [150, 10],
    [300, 10],
    [500, 10],
    [1000, 3],
  ]);
  for (const [price, count] of expectedTierCounts) {
    assert.equal(
      BIOMYTHICAL_AVATARS.filter((entry) => entry.price === price).length,
      count,
      `price ${price}`,
    );
  }

  assert.equal(new Set(BIOMYTHICAL_AVATARS.map(({ name }) => name)).size, 53);
  for (const entry of BIOMYTHICAL_AVATARS) {
    for (const field of ['name', 'labelRu', 'baseAnimal', 'anatomy', 'signature', 'darkPose', 'lightPose', 'avoid']) {
      assert.ok(entry[field]?.trim(), `ID ${entry.id} missing ${field}`);
    }
    const forbidden = `${entry.name} ${entry.baseAnimal} ${entry.signature}`.toLowerCase();
    assert.doesNotMatch(forbidden, /\b(human|humanoid|robot|machine|vehicle)\b/);
  }

  const formerFlamingo = BIOMYTHICAL_AVATARS.find(({ id }) => id === 91);
  assert.doesNotMatch(`${formerFlamingo.name} ${formerFlamingo.baseAnimal}`.toLowerCase(), /flamingo|фламинго/);
  const formerSaiga = BIOMYTHICAL_AVATARS.find(({ id }) => id === 121);
  assert.doesNotMatch(`${formerSaiga.name} ${formerSaiga.baseAnimal}`.toLowerCase(), /saiga|сайг/);
});
