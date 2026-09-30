import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Saved visibility uses the authoritative flashcards feature-access decision', () => {
  const collection = read('app/flashcards_collection.tsx');

  assert.ok(collection.includes("import { useFeatureAccess } from '../components/PremiumContext';"));
  assert.ok(collection.includes("const isPremium = useFeatureAccess('flashcards');"));
  assert.ok(!collection.includes('hasPremiumAccess: isPremium'));
  assert.ok(collection.includes('useDerivedCollectionCards({'));
  assert.match(collection, /searchQuery, isPremium,\s*\n\s*\}\);/);
});

test('Saved access repair preserves the stable first-20 limiter and existing upsell route', () => {
  const collection = read('app/flashcards_collection.tsx');
  const derived = read('app/flashcards/useCollectionData.ts');
  const limiter = read('app/flashcards/free_limit.ts');

  assert.ok(derived.includes('computeUnlockedSavedIds(savedCards)'));
  assert.ok(derived.includes('splitByFreeLimit(searchedCards, unlockedSavedIds, isPremium)'));
  assert.ok(limiter.includes('export const FREE_SAVED_CARD_LIMIT = 20;'));
  assert.ok(collection.includes("pathname: '/premium_modal'"));
  assert.ok(collection.includes("context: 'flashcard_limit'"));
  assert.ok(collection.includes("source: 'flashcards_collection'"));
});
