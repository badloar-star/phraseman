import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBiomythicalQueue } from './build-biomythical-queue.mjs';

test('builds the complete sequential V3 reset queue without touching the 50-pearl tier', () => {
  const queue = buildBiomythicalQueue({ rootDir: 'C:\\workspace' });

  assert.equal(queue.version, 3);
  assert.equal(queue.total, 107);
  assert.equal(queue.completed, 0);
  assert.equal(queue.items.length, 107);
  assert.ok(queue.items.every(({ status }) => status === 'pending'));
  assert.ok(queue.items.every(({ id }) => id >= 73));
  assert.ok(queue.items.every(({ id }) => id > 72));

  for (let id = 73; id <= 125; id += 1) {
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

  const absolute = queue.items.filter(({ id }) => id === 126);
  assert.equal(absolute.length, 1);
  assert.equal(absolute[0].variant, 'black');
  assert.match(absolute[0].prompt, /seated/i);
  assert.match(absolute[0].prompt, /imperial astral snow leopard/i);
  assert.match(absolute[0].prompt, /accepted light variant/i);
});
