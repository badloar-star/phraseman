import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('app/flashcards/CollectionListView.tsx', 'utf8');
const collection = fs.readFileSync('app/flashcards_collection.tsx', 'utf8');

assert.match(source, /selectionMode/);
assert.match(source, /testID=\{`fc-selection-card-\$\{item\.id\}`\}/);
assert.match(source, /onToggleSelection/);
assert.match(source, /minHeight: 82/);
assert.match(source, /Создать набор/);
assert.match(source, /Удалить выбранные/);
assert.match(source, /remainingCardsToMinimum/);
assert.match(collection, /filterCardsByPackLanguage/);
assert.match(collection, /savedCardsForPackLanguage/);
