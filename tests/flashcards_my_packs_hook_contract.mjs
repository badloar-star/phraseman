import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../app/flashcards_my_packs.tsx', import.meta.url),
  'utf8',
);

assert.match(
  source,
  /React\.useEffect\(\(\) => subscribePackLanguage\(setPackLanguage\), \[\]\);/,
  'the pack-language subscription must use the imported React namespace',
);

assert.doesNotMatch(
  source,
  /(^|[^\w.])useEffect\(\(\) => subscribePackLanguage\(setPackLanguage\), \[\]\);/m,
  'a bare useEffect call crashes at runtime when useEffect is not imported',
);
