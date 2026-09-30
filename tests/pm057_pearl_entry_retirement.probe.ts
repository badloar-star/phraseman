import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('app/(tabs)/home.tsx', 'utf8');
const shop = readFileSync('app/shards_shop.tsx', 'utf8');
assert.ok(!home.includes('testID="home-quickstart-shards"'), 'Home must not render a pearl balance/entry');
assert.ok(!home.includes("nav.push('/shards_shop')"), 'Home must not navigate to the retired pearl shop');
assert.ok(shop.includes('flashcards_my_packs'), 'old shop deep links must remain harmless');

console.log('PM-057 pearl entry retirement: PASS');
