import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBiomythicalQueue } from './build-biomythical-queue.mjs';
import { BIOMYTHICAL_AVATARS } from './biomythical-map.mjs';

test('builds the complete sequential V3 reset queue without touching the 50-pearl tier', () => {
  const queue = buildBiomythicalQueue({ rootDir: 'C:\\workspace' });

  assert.equal(queue.version, 3);
  assert.equal(queue.total, 64);
  assert.equal(queue.completed, 0);
  assert.equal(queue.items.length, 64);
  assert.ok(queue.items.every(({ status }) => status === 'pending'));
  assert.ok(queue.items.every(({ id }) => id >= 73));
  assert.ok(queue.items.every(({ id }) => id > 72));

  for (const id of BIOMYTHICAL_AVATARS.map((entry) => entry.id)) {
    const items = queue.items.filter((item) => item.id === id);
    assert.deepEqual(items.map(({ variant }) => variant), ['black', 'white'], `ID ${id}`);
    for (const item of items) {
      assert.match(item.prompt, /independent generation/i);
      assert.match(item.prompt, /acid green #00F56A/i);
      assert.match(item.prompt, /full silhouette/i);
      assert.match(item.prompt, /manual anatomy review/i);
      assert.match(item.prompt, /recognizable real-animal body plan/i);
      assert.ok(item.anatomy.length > 20);
      assert.ok(item.pose.length > 20);
    }
  }

});
