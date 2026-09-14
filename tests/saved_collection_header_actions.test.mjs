import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('app/flashcards/CollectionHeader.tsx', 'utf8');

assert.match(source, /PackLanguagePicker/);
assert.match(source, /testID="fc-saved-actions"/);
assert.match(source, /onEnterSelection/);
assert.match(source, /onDeleteSelected/);
assert.match(source, /Вид/);
assert.match(source, /Отметить/);
assert.match(source, /Удалить выбранные/);
