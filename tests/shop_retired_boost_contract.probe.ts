import { readFileSync } from 'node:fs';

const catalog = readFileSync('app/shop_catalog.ts', 'utf8');
const shop = readFileSync('app/shop.tsx', 'utf8');
for (const source of [catalog, shop]) {
  if (/streak-shield|category:\s*['"]boost['"]|id:\s*['"]boost['"]|tone:\s*['"]shield['"]/.test(source)) {
    throw new Error('retired streak boost remains in shop');
  }
}
// зачем (D70/D78, 01.10): жемчуг удалён — категории «жемчуг» и валюты «жемчуг» в магазине нет.
if (!catalog.includes("ShopCategoryId = 'all' | 'spin' | 'look' | 'cards';") || /'pearls'/.test(catalog) || /pearls/.test(shop)) {
  throw new Error('shop category contract is not updated');
}
console.log('SHOP RETIRED BOOST: PASS');
