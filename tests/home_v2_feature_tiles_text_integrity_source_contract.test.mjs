import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/home/v2/HomeV2FeatureTiles.tsx', import.meta.url), 'utf8');

test('active V2 feature tiles retain left-aligned art and never clip their copy', () => {
  assert.match(source, /alignItems: 'flex-start'/);
  assert.match(source, /paddingLeft: 10/);
  assert.match(source, /contentFit="contain"/);
  assert.doesNotMatch(source, /numberOfLines=/);
  assert.match(source, /minHeight: 156/);
});
