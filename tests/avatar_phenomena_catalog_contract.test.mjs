import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogPath = new URL('../constants/avatar_phenomena_assets.ts', import.meta.url);

test('phenomena catalog locks 18 ids, six price tiers, and 36 immutable hosted assets', async () => {
  const source = await readFile(catalogPath, 'utf8');
  const entries = [...source.matchAll(/'custom-phen-(\d{2})':\s*\{([^\n]+)\}/g)];

  assert.equal(entries.length, 18);
  assert.deepEqual(entries.map((match) => Number(match[1])), Array.from({ length: 18 }, (_, index) => index + 1));

  const prices = entries.map((match) => Number(/,\s*(\d+)\)\s*$/.exec(match[2])?.[1]));
  assert.deepEqual(
    Object.fromEntries([70, 100, 150, 300, 500, 1000].map((price) => [price, prices.filter((value) => value === price).length])),
    { 70: 3, 100: 3, 150: 3, 300: 3, 500: 3, 1000: 3 },
  );

  assert.match(source, /AVATAR_PHENOMENA_ART_VERSION\s*=\s*'phenomena-v1'/);
  assert.match(source, /AVATAR_PHENOMENA_ASSET_FOLDER\s*=\s*'avatar-phenomena-v1'/);
  assert.match(source, /\$\{id\}-\$\{ink\}\.webp/);
});
