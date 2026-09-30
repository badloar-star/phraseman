import { readFileSync } from 'node:fs';

const source = readFileSync('app/coin_rank_table_v1.ts', 'utf8');
if (!source.includes('COIN_RANK_MIN = 0') || !source.includes('COIN_RANK_MAX = 19')) {
  throw new Error('coin rank range is not the approved 0..19 contract');
}
const titles = source.match(/const LEVEL_TITLES_RU:[\s\S]*?= \[([\s\S]*?)\];/)?.[1] ?? '';
const titleCount = (titles.match(/'[^']+'/g) ?? []).length;
if (titleCount !== 20) throw new Error(`expected 20 rank titles, got ${titleCount}`);
const assets = (source.match(/require\('\.\.\/assets\/images\/coins\/coin_rank_\d{2}\.webp'\)/g) ?? []).length;
if (assets !== 20) throw new Error(`expected 20 coin assets, got ${assets}`);
if (!source.includes('for (let rank = COIN_RANK_MIN; rank <= COIN_RANK_MAX; rank += 1)')) {
  throw new Error('rank table is not generated from the canonical range');
}

console.log('COIN RANK COUNT: PASS');
