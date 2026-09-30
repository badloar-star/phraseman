import { existsSync, readFileSync } from 'node:fs';

const removedClientArtifacts = [
  'app/friend_gift_outbox.ts',
  'app/friend_gift_inbox.ts',
  'app/friend_gifts.ts',
  'app/friend_gift_inventory.ts',
  'app/level_gift_active_inventory.ts',
  'components/GlobalFriendGiftHost.tsx',
];
for (const file of removedClientArtifacts) if (existsSync(file)) throw new Error(`retired gift artifact remains: ${file}`);

const layout = readFileSync('app/_layout.tsx', 'utf8');
if (/GlobalFriendGiftHost|friend_gift_outbox|friend_gift_inbox/.test(layout)) throw new Error('retired gift host still wired');
const index = readFileSync('functions/src/index.ts', 'utf8');
if (/export\s*\{[^}]*\b(friendSendGift|friendThankGift|friendConsumeChainShield|levelGift)/s.test(index)) {
  throw new Error('retired gift callable still publicly exported');
}
const community = readFileSync('functions/src/community_packs.ts', 'utf8');
// зачем: legacy level-gift callable удалены полностью (не заглушены) — проверяем отсутствие
if (/const levelGiftReserve|const levelGiftActivatePackGift|const levelSpinActivatePackGift/.test(community)) {
  throw new Error('legacy level gift callable still present in community_packs');
}

console.log('PM-048 GIFT SECTION RETIREMENT: PASS');
