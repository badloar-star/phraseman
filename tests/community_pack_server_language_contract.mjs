import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('functions/src/community_packs.ts', 'utf8');

assert.match(source, /packLanguage\?: 'en' \| 'fr' \| 'de' \| 'es'/);
assert.match(source, /targetText\?: string/);
assert.match(source, /translationText\?: string/);
assert.match(source, /raw\.packLanguage/);
assert.match(source, /targetText/);
assert.match(source, /translationText/);
assert.match(source, /packLanguage: payload\.packLanguage/);
