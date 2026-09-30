import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const community = fs.readFileSync(path.join(root, 'functions/src/community_packs.ts'), 'utf8');
const index = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');

assert.doesNotMatch(community, /chain_shield|gift_xp_multiplier|club_gift_free_boost_v1|wager_discount_25|xp_bank_|xp_2x_|premium_xp_bank_|\['xp_(?:50|100|250)'/);
// PM-055/PM-088: legacy callables may remain as explicit fail-closed stubs;
// they must never be exported or issue retired effects.
// зачем: не экспортируемые tombstone-callable удалены целиком (мёртвый код после throw ломал tsc functions) —
// теперь проверяем, что их нет вообще: это строже, чем fail-closed заглушка.
assert.doesNotMatch(community, /const levelGiftReserve|const levelGiftActivatePackGift|const levelSpinActivatePackGift/);
assert.doesNotMatch(index, /\blevelGiftReserve\b|\blevelGiftActivatePackGift\b|\blevelSpinActivatePackGift\b/);
