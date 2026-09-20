import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collection = fs.readFileSync(path.join(root, 'app', 'flashcards_collection.tsx'), 'utf8');
const header = fs.readFileSync(path.join(root, 'app', 'flashcards', 'CollectionHeader.tsx'), 'utf8');
const selectors = fs.readFileSync(path.join(root, 'app', 'flashcards', 'selectors.ts'), 'utf8');
const chrome = fs.readFileSync(path.join(root, 'app', 'flashcards', 'FlashcardListItemChrome.ts'), 'utf8');

assert.match(selectors, /export type SavedCardContentKind = 'all' \| 'word' \| 'phrase';/);
assert.match(selectors, /export function savedCardContentKind/);
assert.match(selectors, /export function filterSavedCardsByContentKind/);
assert.match(collection, /const \[savedContentKind, setSavedContentKind\] = useState<SavedCardContentKind>\('all'\);/);
assert.match(collection, /savedContentKind === 'phrase'/);
assert.match(header, /savedContentKind\?: SavedCardContentKind/);
assert.match(header, /testID="fc-saved-content-picker"/);
assert.match(header, /ru: 'Все'/);
assert.match(header, /ru: 'Слова'/);
assert.match(header, /ru: 'Фразы'/);

// The picker is a header control: list-card dimensions remain an invariant.
assert.match(chrome, /borderRadius: 20/);
assert.match(chrome, /padding: 22/);

console.log('saved collection content picker contract: passed');
