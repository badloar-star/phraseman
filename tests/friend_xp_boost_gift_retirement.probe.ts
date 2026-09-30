import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
assert.equal(fs.existsSync(path.join(root, 'functions/src/friend_gifts.ts')), false);
const friends = fs.readFileSync(path.join(root, 'app/(tabs)/friends.tsx'), 'utf8');

for (const [name, source] of [['friends', friends]] as const) {
  assert.doesNotMatch(source, /xp_boost_2x_24h|gift_xp_multiplier|friend-gift-reply-boost/, `${name} still offers or applies XP boost`);
}
assert.equal(fs.existsSync(path.join(root, 'app/friend_gifts.ts')), false);
assert.doesNotMatch(friends, /friend-gift-reply-shield|friend-gift-send-cta/);
assert.equal(fs.existsSync(path.join(root, 'app/friend_gift_inventory.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'app/level_gift_active_inventory.ts')), false);
