import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/release_notes_v2_copy.ts', import.meta.url), 'utf8');

test('release notes never expose the internal coin-rank term as a user reward', () => {
  assert.doesNotMatch(source, /монеты и ранг|монети й ранг|Coins and rank|monedas y rango|moedas e nível|xu và thứ hạng|koin dan peringkat|para ve rütbe|monety i ranga/i);
});
