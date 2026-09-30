import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('app/flashcards/VideoPackRow.tsx', 'utf8');

test('video pack controls inherit the active Liquid Glass palette', () => {
  assert.match(source, /color=\{g\.text\}/);
  assert.match(source, /backgroundColor: g\.sheet/);
  assert.match(source, /backgroundColor: g\.opaqueControl/);
  assert.match(source, /backgroundColor: g\.opaqueCard/);
  assert.doesNotMatch(source, /rgba\(3,6,4,/);
  assert.doesNotMatch(source, /rgba\(16,23,16,/);
  assert.doesNotMatch(source, /#DFF3E6/);
});
