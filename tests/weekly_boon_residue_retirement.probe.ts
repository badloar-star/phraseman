import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
for (const key of ['boon_mystery_monday_claimed_v1', 'boon_perfect_week_claimed_v1', 'boon_granted_streak_saver_v1']) {
  assert.equal(read('app/cloud_sync.ts').includes(key), false, `retired sync key remains: ${key}`);
}
assert.equal(read('app/flashcards/pack_trial_gift.ts').includes("'weekly_boon'"), false, 'client still trusts weekly voucher source');
// зачем: D70/D78 — shard_reward_catalog.ts удалён целиком вместе с причинами начисления жемчуга.
assert.equal(existsSync(path.join(root, 'functions/src/shard_reward_catalog.ts')), false, 'retired shard reward catalog remains');
assert.equal(read('app/events.ts').includes('mystery_chest_claimed'), false, 'retired chest event remains');
assert.equal(read('app/creator_access.ts').includes('Weekly Boon'), false, 'creator gate still documents removed override');
assert.equal(read('scripts/qa/responsive-screen-geometry.mjs').includes('BoonActivatedHybrid'), false, 'responsive QA imports removed component');
for (const removed of ['BoonActivatedModal.tsx', 'BoonChestModal.tsx']) {
  assert.equal(read('scripts/qa/responsive-source-files.json').includes(removed), false, `responsive QA still names ${removed}`);
}
console.log('weekly boon sync and reward residues retired');
