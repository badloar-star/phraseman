import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeGlobalBroadcastPublishInput, projectGlobalBroadcastRow } from '../functions/src/admin_global_broadcast';
import { buildGlobalBroadcastRewardMutation, canonicalizeExistingGlobalBroadcastReceipt } from '../functions/src/global_broadcast_claim';

const root = path.resolve(__dirname, '..');
const retired = [
  'xp_boost_2x_24h', 'xp_boost_2x_48h',
  'chain_shield_1', 'chain_shield_3',
  'club_boost_free', 'wager_discount_25',
];

for (const type of retired) {
  assert.throws(() => normalizeGlobalBroadcastPublishInput({
    rewardType: type, rewardAmount: 0,
    titles: { ru: 'Сообщение' }, messages: { ru: 'Текст' }, reason: 'test',
    idempotencyKey: `retired-${type}`, requestId: 'request-1',
  }));
  assert.deepEqual(buildGlobalBroadcastRewardMutation({ rewardType: type }, {}, Date.now()), {
    userPatch: {}, response: { ok: true, rewardType: 'none' },
  });
  assert.equal(canonicalizeExistingGlobalBroadcastReceipt({ ok: true, rewardType: type }, {}).rewardType, 'none');
  assert.equal(projectGlobalBroadcastRow('old-broadcast', { rewardType: type, rewardAmount: 30 }).rewardType, 'none');
}

const client = fs.readFileSync(path.join(root, 'app/global_broadcast_modal.ts'), 'utf8');
assert.doesNotMatch(client, /chain_shield|wager_discount_25|WAGER_DISCOUNT_KEY/);
// The former root admin/legacy.html surface was retired; only the still-published
// v2 compatibility page is part of this source contract.
for (const file of ['admin/v2/legacy.html']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const type of retired) assert.equal(source.includes(type), false, `${file} still exposes ${type}`);
}
