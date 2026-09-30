import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

assert.equal(existsSync(path.join(root, 'components/ComebackBoonHost.tsx')), false);
assert.equal(existsSync(path.join(root, 'app/boons/comeback.ts')), false);
assert.equal(read('app/_layout.tsx').includes('<ComebackBoonHost'), false);
assert.equal(read('components/overlay_arbiter_core.ts').includes('comebackDay'), false);
assert.equal(read('app/cloud_sync.ts').includes('boon_comeback_granted_v1'), false);
// зачем: D70/D78 — shard_reward_catalog.ts удалён целиком, причине негде жить.
assert.equal(existsSync(path.join(root, 'functions/src/shard_reward_catalog.ts')), false);
for (const file of ['app/_layout.tsx', 'app/(tabs)/home.tsx', 'app/cloud_sync.ts', 'app/statsCache.ts', 'app/streak_stats.tsx']) {
  assert.equal(/comeback_active|comeback_pending|showComebackBanner|setComebackBanner|comebackActive/.test(read(file)), false, `${file} retains comeback runtime`);
}
console.log('comeback bonus retired');
