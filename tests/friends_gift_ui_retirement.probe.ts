import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const friends = fs.readFileSync(path.join(root, 'app/(tabs)/friends.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(root, 'components/friends_together/FriendTogetherSheet.tsx'), 'utf8');

for (const retired of [
  'FRIEND_GIFT_CATALOG', 'giftTarget', 'incomingGiftModal', 'handleSendGift',
  'friend-gift-send-cta', 'friend-gift-reply-shield', 'enqueueFriendGiftSend',
  'subscribeIncomingGifts',
]) {
  assert.equal(friends.includes(retired), false, `Friends screen still exposes ${retired}`);
}
assert.doesNotMatch(sheet, /onGift|friend-together-sheet-gift/);
assert.match(friends, /friend_request|handleAcceptRequest/);
assert.equal(fs.existsSync(path.join(root, 'app/friend_gift_outbox.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'app/friend_gift_inbox.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'app/friend_gifts.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'app/friend_gift_inventory.ts')), false);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'app/phone_state_runtime.ts'), 'utf8'), /resumePendingFriendGiftSends/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'app/hall_of_fame_utils.ts'), 'utf8'), /consumeFriendChainShield|chain_shield/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'app/streak_stats.tsx'), 'utf8'), /chainShieldDays/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'app/statsCache.ts'), 'utf8'), /chainShieldDays|chain_shield/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'app/daily_journey_freeze_ledger.ts'), 'utf8'), /readEffectiveStreakProtection|chain_shield/);
const cloudSync = fs.readFileSync(path.join(root, 'app/cloud_sync.ts'), 'utf8');
assert.doesNotMatch(cloudSync, /const cloudShield = cloudData\['chain_shield'\]/);
assert.doesNotMatch(cloudSync, /const canonicalShield = canonicalGiftPerkStorageValue\(/);
assert.doesNotMatch(cloudSync, /cloudData\.chain_shield = canonicalShield/);
