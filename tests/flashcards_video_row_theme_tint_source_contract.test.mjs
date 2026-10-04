import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('app/flashcards/VideoPackRow.tsx', 'utf8');

test('video pack controls inherit the active Liquid Glass palette', () => {
  // зачем: плоская строка по макету — тон миниатюры и линия из токенов темы, плашки длительности нейтральные.
  assert.match(source, /backgroundColor: g\.opaqueControl/);
  assert.match(source, /<KitCard g=\{g\}/);
  assert.doesNotMatch(source, /rgba\(3,6,4,/);
  assert.doesNotMatch(source, /rgba\(16,23,16,/);
  assert.doesNotMatch(source, /#DFF3E6/);
});
