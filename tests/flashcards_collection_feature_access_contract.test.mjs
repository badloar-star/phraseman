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

test('Saved access repair preserves the stable first-N limiter and existing upsell route', () => {
  const collection = read('app/flashcards_collection.tsx');
  const derived = read('app/flashcards/useCollectionData.ts');
  const limiter = read('app/flashcards/free_limit.ts');
  const listView = read('app/flashcards/CollectionListView.tsx');

  assert.ok(derived.includes('computeUnlockedSavedIds(savedCards)'));
  assert.ok(derived.includes('splitByFreeLimit(searchedCards, unlockedSavedIds, isPremium)'));
  // зачем (§139, 04.10): лимит 50 со снимка 30.09 (efe19ae9d; рекомендация D16, статус OPEN). Сторож ждал
  // устаревшие 20. Теперь держит саму константу И то, что экран обещает то же число — иначе они разойдутся.
  const limit = Number(limiter.match(/export const FREE_SAVED_CARD_LIMIT = (\d+);/)?.[1]);
  assert.equal(limit, 50);
  assert.ok(listView.includes(`ru: 'Бесплатно доступны первые ${limit} сохранённых карточек'`));
  assert.ok(listView.includes(`en: 'The first ${limit} saved cards are free'`));
  assert.ok(collection.includes("pathname: '/premium_modal'"));
  assert.ok(collection.includes("context: 'flashcard_limit'"));
  assert.ok(collection.includes("source: 'flashcards_collection'"));
});
