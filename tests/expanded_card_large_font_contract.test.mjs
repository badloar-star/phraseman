import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (координатор 05.10): раскрытая карточка при крупном системном шрифте не режет текст — высота по тексту, стопка прокручивается;
// шрифт не сжимаем (правило владельца: лечим вёрсткой, не adjustsFontSizeToFit).
const source = fs.readFileSync('app/flashcards/ExpandedCardV2.tsx', 'utf8');

test('card height grows with measured text instead of a fixed 230', () => {
  assert.doesNotMatch(source, /cardWrap: \{ height: 230/);
  assert.match(source, /cardWrap: \{ minHeight: CARD_MIN_H/);
  assert.match(source, /Math\.max\(CARD_MIN_H, frontH \+ FACE_PAD_V, backH \+ FACE_PAD_V\)/);
  assert.match(source, /onLayout=\{\(e\) => setFrontH\(/);
  assert.match(source, /onLayout=\{\(e\) => setBackH\(/);
});

test('the stack scrolls and action tiles are not fixed-height', () => {
  assert.match(source, /<ScrollView[^>]*contentContainerStyle=\{styles\.center\}/);
  assert.match(source, /actCard: \{ minHeight: 86 \}/);
  assert.doesNotMatch(source, /actCard: \{ height:/);
});

test('no font shrinking', () => {
  assert.doesNotMatch(source, /adjustsFontSizeToFit/);
  assert.doesNotMatch(source, /numberOfLines/);
});
