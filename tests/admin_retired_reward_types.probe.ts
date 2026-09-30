import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_GRANT_REWARD_TYPES, buildAdminRewardMutation, normalizeAdminGrantRewardInput } from '../functions/src/admin_grant';

const root = path.resolve(__dirname, '..');
const retired = ['xp_boost_2x_24h', 'xp_boost_2x_48h', 'chain_shield_1', 'chain_shield_3'];

assert.deepEqual([...ADMIN_GRANT_REWARD_TYPES], ['shards']);
const shardGrant = buildAdminRewardMutation({}, 'shards', 25, 1_720_000_000_000);
assert.deepEqual(shardGrant.updates, { updatedAt: 1_720_000_000_000 });
assert.equal(shardGrant.shardLog?.amount, 25);
assert.equal(shardGrant.shardsAmount, 25);
for (const type of retired) {
  assert.throws(() => normalizeAdminGrantRewardInput({
    uid: 'stable-user_1', type, amount: 0, reason: 'test', comment: '',
    idempotencyKey: `retired-${type}`, requestId: 'request-1',
  }));
  assert.throws(() => buildAdminRewardMutation({}, type, 0, 1_720_000_000_000));
}
for (const file of ['admin/legacy.html', 'admin/v2/legacy.html']) {
  // зачем: admin/legacy.html удалён при ретайре старых наград — отсутствующий файл не предлагает выдачу, значит проверять нечего
  if (!fs.existsSync(path.join(root, file))) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const grantChoices = source.match(/const REWARD_TYPES = \[([\s\S]*?)\];/)?.[1];
  assert.ok(grantChoices, `${file} has no grant reward choices`);
  for (const type of retired) assert.equal(grantChoices.includes(type), false, `${file} still offers ${type} as an individual grant`);
}
