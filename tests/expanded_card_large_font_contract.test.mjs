import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (координатор 05.10; Карточки 2.0 12.10): раскрытая карточка — нижняя шторка по макету cards-v2, сама карточка — общий FlipCard. При крупном
// системном шрифте она не режет текст — высота карточки по тексту (измеряем onLayout), шрифт не сжимаем (правило владельца: лечим вёрсткой).
const sheet = fs.readFileSync('app/flashcards/ExpandedCardV2.tsx', 'utf8');
const flipSource = fs.readFileSync('components/cards-grid/FlipCard.tsx', 'utf8');
const source = `${sheet}\n${flipSource}`;

test('card height grows with measured text instead of a fixed 196', () => {
  assert.doesNotMatch(flipSource, /card: \{ height: 196/);
  assert.match(flipSource, /FLIP_CARD_MIN_H = 196;/);
  assert.match(flipSource, /Math\.max\(FLIP_CARD_MIN_H, frontH \+ FACE_PAD_V, backH \+ FACE_PAD_V\)/);
  assert.match(flipSource, /onLayout=\{\(e\) => setFrontH\(/);
  assert.match(flipSource, /onLayout=\{\(e\) => setBackH\(/);
});

test('the card is a bottom sheet with 56 round actions that are not fixed-height rows', () => {
  assert.match(sheet, /<PanelSheet visible onClose=\{onClose\}/);
  assert.match(sheet, /<FlipCard/);
  assert.match(sheet, /actCircle: \{ width: 56, height: 56, borderRadius: 28/);
  assert.doesNotMatch(sheet, /actCard: \{ height:/);
});

test('flip follows the mockup: 560 ms cubic-bezier(.2,.8,.2,1), perspective 1200, radius 20', () => {
  assert.match(flipSource, /FLIP_MS = 560;/);
  assert.match(flipSource, /Easing\.bezier\(0\.2, 0\.8, 0\.2, 1\)/);
  assert.match(flipSource, /perspective: 1200/);
  assert.match(flipSource, /FLIP_CARD_RADIUS = 20;/);
  assert.match(flipSource, /reduceMotion \? 0 : FLIP_MS/);
});

test('"В набор" uses the local pack storage only (no server calls)', () => {
  assert.match(sheet, /addCardToLocalPack/);
  assert.match(sheet, /loadPackPickerState/);
  assert.doesNotMatch(sheet, /httpsCallable|firestore/i);
});

test('no font shrinking', () => {
  assert.doesNotMatch(source, /adjustsFontSizeToFit/);
  assert.doesNotMatch(source, /numberOfLines/);
});
