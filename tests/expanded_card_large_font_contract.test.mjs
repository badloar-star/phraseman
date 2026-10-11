import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (координатор 05.10; Карточки 2.0 12.10): раскрытая карточка — нижняя шторка по макету cards-v2. При крупном системном шрифте она не режет текст —
// высота карточки по тексту (измеряем onLayout), шрифт не сжимаем (правило владельца: лечим вёрсткой, не adjustsFontSizeToFit).
const source = fs.readFileSync('app/flashcards/ExpandedCardV2.tsx', 'utf8');

test('card height grows with measured text instead of a fixed 196', () => {
  assert.doesNotMatch(source, /card: \{ height: 196/);
  assert.match(source, /const CARD_MIN_H = 196;/);
  assert.match(source, /Math\.max\(CARD_MIN_H, frontH \+ FACE_PAD_V, backH \+ FACE_PAD_V\)/);
  assert.match(source, /onLayout=\{\(e\) => setFrontH\(/);
  assert.match(source, /onLayout=\{\(e\) => setBackH\(/);
});

test('the card is a bottom sheet with 56 round actions that are not fixed-height rows', () => {
  assert.match(source, /<PanelSheet visible onClose=\{onClose\}/);
  assert.match(source, /actCircle: \{ width: 56, height: 56, borderRadius: 28/);
  assert.doesNotMatch(source, /actCard: \{ height:/);
});

test('flip follows the mockup: 560 ms cubic-bezier(.2,.8,.2,1), perspective 1200, radius 20', () => {
  assert.match(source, /const FLIP_MS = 560;/);
  assert.match(source, /Easing\.bezier\(0\.2, 0\.8, 0\.2, 1\)/);
  assert.match(source, /perspective: 1200/);
  assert.match(source, /const CARD_RADIUS = 20;/);
  assert.match(source, /reduceMotion \? 0 : FLIP_MS/);
});

test('"В набор" uses the local pack storage only (no server calls)', () => {
  assert.match(source, /addCardToLocalPack/);
  assert.match(source, /loadAddableLocalPacks/);
  assert.doesNotMatch(source, /httpsCallable|firestore/i);
});

test('no font shrinking', () => {
  assert.doesNotMatch(source, /adjustsFontSizeToFit/);
  assert.doesNotMatch(source, /numberOfLines/);
});
