import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EMPTY_OVERLAY_WANTS, FORCE_EVICTABLE_KEYS, NATIVE_MODAL_KEYS, OVERLAY_PRIORITY } from '../components/overlay_arbiter_core';

const source = readFileSync(path.resolve(__dirname, '..', 'components', 'overlay_arbiter_core.ts'), 'utf8');
for (const retired of ['mysteryMondayChest', 'perfectWeekReward', 'boonActivated']) {
  assert.ok(!source.includes(retired), `${retired} remains in overlay source`);
  assert.ok(!OVERLAY_PRIORITY.includes(retired as never), `${retired} remains in priority`);
  assert.ok(!FORCE_EVICTABLE_KEYS.has(retired as never), `${retired} remains force-evictable`);
  assert.ok(!NATIVE_MODAL_KEYS.has(retired as never), `${retired} remains native`);
  assert.ok(!(retired in EMPTY_OVERLAY_WANTS), `${retired} remains in empty wants`);
}
console.log('retired boon overlay keys removed');
