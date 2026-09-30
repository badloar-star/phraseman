import { readFileSync } from 'node:fs';

const catalog = readFileSync('app/shop_catalog.ts', 'utf8');
const shop = readFileSync('app/shop.tsx', 'utf8');
for (const source of [catalog, shop]) {
  if (/streak-shield|category:\s*['"]boost['"]|id:\s*['"]boost['"]|tone:\s*['"]shield['"]/.test(source)) {
    throw new Error('retired streak boost remains in shop');
  }
}
if (!catalog.includes("ShopCategoryId = 'all' | 'spin' | 'look' | 'cards' | 'pearls'")) {
  throw new Error('shop category contract is not updated');
}
console.log('SHOP RETIRED BOOST: PASS');
