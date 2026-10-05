import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const selectors = normalizeEol(fs.readFileSync('app/flashcards/selectors.ts', 'utf8'));
const dataHook = normalizeEol(fs.readFileSync('app/flashcards/useCollectionData.ts', 'utf8'));

test('PM-095: collection search is local and deterministic', () => {
  assert.match(selectors, /export function searchCards\s*\(/);
  assert.match(dataHook, /searchCards\(filteredCards, searchQuery\)/);
  assert.match(dataHook, /useMemo\(\s*\(\) => searchCards\(filteredCards, searchQuery\)/s);
  assert.doesNotMatch(dataHook, /fetchCommunityPack(?:Cards|Meta)\([^\n]*searchQuery/);
});

