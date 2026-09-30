import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../app/level_gift_system.ts'), 'utf8');
const functionsClient = fs.readFileSync(path.resolve(__dirname, '../app/community_packs/functionsClient.ts'), 'utf8');

assert.match(source, /const ACTIVE_LEVEL_GIFTS = GIFT_F2P\.filter\(gift => !RETIRED_LEVEL_GIFT_IDS\.has\(gift\.id\)\)/);
assert.match(source, /throw new Error\('level_gift_retired'\)/);
assert.doesNotMatch(source, /chain_shield_1|chain_shield_3/);

const milestones = source.slice(source.indexOf('const LEVEL_GIFT_MILESTONE_IDS:'), source.indexOf('export function getMilestoneLevelGift'));
assert.doesNotMatch(milestones, /chain_shield|choice_3_level/);

assert.doesNotMatch(source, /AsyncStorage\.setItem\(CHAIN_SHIELD_KEY|AsyncStorage\.multiSet\(\[\s*\[WAGER_DISCOUNT_KEY/);
assert.doesNotMatch(source, /const serverOwnedPerk =/);
assert.doesNotMatch(functionsClient, /chainShield\?:|giftXpMultiplier\?:|clubGiftFreeBoostCount\?:/);

for (const id of ['shards_3', 'shards_6', 'shards_10', 'prem_shards_10', 'prem_shards_15', 'prem_shards_20']) {
  assert.match(source, new RegExp(`id: '${id}'`), `${id} must remain a server-owned reward definition`);
}

assert.doesNotMatch(source, /xpBoostAlreadyActive|multiplier\?:\s*\{/);
