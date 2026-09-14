import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('app/flashcards/PackLanguagePicker.tsx', 'utf8');

assert.match(source, /testID="pack-language-picker"/);
assert.match(source, /PACK_LANGUAGES/);
assert.match(source, /PACK_LANGUAGE_META/);
assert.match(source, /accessibilityState=\{\{ selected: item\.code === value \}\}/);
assert.match(source, /useReduceMotion/);
