import assert from 'node:assert/strict';
import test from 'node:test';

import { BIOMYTHICAL_AVATARS } from './biomythical-map.mjs';

test('defines the retained owner-approved 70–1000 biomythical reset map', () => {
  assert.deepEqual(
    BIOMYTHICAL_AVATARS.map(({ id }) => id),
    [
      73, 75, 76, 77, 81, 83, 86, 87, 88, 89, 90, 92, 93, 94, 96, 99,
      101, 102, 103, 104, 105, 106, 107, 108, 109, 111, 112, 114, 118, 120,
      123, 124,
    ],
  );

  const expectedTierCounts = new Map([
    [70, 5],
    [100, 7],
    [150, 6],
    [300, 9],
    [500, 3],
    [1000, 2],
  ]);
  for (const [price, count] of expectedTierCounts) {
    assert.equal(
      BIOMYTHICAL_AVATARS.filter((entry) => entry.price === price).length,
      count,
      `price ${price}`,
    );
  }

  assert.equal(new Set(BIOMYTHICAL_AVATARS.map(({ name }) => name)).size, 32);
  for (const entry of BIOMYTHICAL_AVATARS) {
    for (const field of ['name', 'labelRu', 'baseAnimal', 'anatomy', 'signature', 'darkPose', 'lightPose', 'avoid']) {
      assert.ok(entry[field]?.trim(), `ID ${entry.id} missing ${field}`);
    }
    const forbidden = `${entry.name} ${entry.baseAnimal} ${entry.signature}`.toLowerCase();
    assert.doesNotMatch(forbidden, /\b(human|humanoid|robot|machine|vehicle)\b/);
  }
});
