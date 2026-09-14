import assert from 'node:assert/strict';
import fs from 'node:fs';

const collection = fs.readFileSync('app/flashcards_collection.tsx', 'utf8');
const deletion = fs.readFileSync('app/flashcards/useCollectionData.ts', 'utf8');

assert.match(deletion, /deleteCardsByIds/);
assert.match(collection, /ThemedConfirmModal/);
assert.match(collection, /Удалить \$\{selectedCardIds\.length\} карточек\?/);
assert.match(collection, /Исходные уроки и видео не изменятся/);
assert.match(collection, /deleteCardsByIds/);
