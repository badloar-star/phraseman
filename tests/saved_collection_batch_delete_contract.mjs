import assert from 'node:assert/strict';
import fs from 'node:fs';

const collection = fs.readFileSync('app/flashcards_collection.tsx', 'utf8');
const deletion = fs.readFileSync('app/flashcards/useCollectionData.ts', 'utf8');

assert.match(deletion, /deleteCardsByIds/);
assert.match(collection, /ThemedConfirmModal/);
// перепин 18.10 (Сайт, координатор): фиксированное «Удалить N карточек?» НАМЕРЕННО заменено склонением в d21345f65 (12.10, cards-035,
// «Удалить 3 карточек?») — общий помощник constants/plural.ts на 9 языках.
assert.match(collection, /Удалить \$\{pluralWithCount\('ru', selectedCardIds\.length, \{ one: 'карточку', few: 'карточки', many: 'карточек' \}\)\}\?/);
assert.match(collection, /Исходные уроки и видео не изменятся/);
assert.match(collection, /deleteCardsByIds/);
