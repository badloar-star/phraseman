# Saved Cards Content Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let learners separate saved words from saved phrases and narrow saved phrases by lesson or Phrase of the day, without changing card presentation.

**Architecture:** Add pure content-kind classification and filtering beside the existing collection selectors. The collection container owns the new picker state and applies it before the existing source filter and search. The existing collection header renders a saved-only segmented control while retaining its current list/deck and card components.

**Tech Stack:** React Native, TypeScript, Jest, Expo Router.

---

### Task 1: Establish content-kind selector behavior

**Files:**
- Modify: `tests/flashcards_collection_locale.test.ts`
- Modify: `app/flashcards/selectors.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { filterSavedCardsByContentKind, savedCardContentKind } from '../app/flashcards/selectors';

it('separates persisted word and phrase sources without reordering cards', () => {
  expect(savedCardContentKind(savedCards[0])).toBe('word');
  expect(savedCardContentKind(savedCards[1])).toBe('phrase');
  expect(filterSavedCardsByContentKind(savedCards, 'word').map(({ id }) => id)).toEqual(['saved_word']);
  expect(filterSavedCardsByContentKind(savedCards, 'phrase').map(({ id }) => id)).toEqual(['saved_lesson']);
  expect(filterSavedCardsByContentKind(savedCards, 'all')).toBe(savedCards);
});
```

- [ ] **Step 2: Run the focused test and verify the missing-export failure**

Run: `npm test -- tests/flashcards_collection_locale.test.ts --runInBand`

Expected: failure because `savedCardContentKind` and `filterSavedCardsByContentKind` do not exist.

- [ ] **Step 3: Add the minimal selector implementation**

```ts
export type SavedCardContentKind = 'all' | 'word' | 'phrase';

export function savedCardContentKind(card: CardItem): Exclude<SavedCardContentKind, 'all'> {
  if (card.source === 'word' || card.source === 'verb') return 'word';
  if (card.source === 'lesson' || card.source === 'dialog' || card.source === 'daily_phrase' || card.source === 'video_phrase') return 'phrase';
  return /\s/u.test(card.en.trim()) ? 'phrase' : 'word';
}

export function filterSavedCardsByContentKind(cards: CardItem[], kind: SavedCardContentKind): CardItem[] {
  if (kind === 'all') return cards;
  return cards.filter((card) => savedCardContentKind(card) === kind);
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- tests/flashcards_collection_locale.test.ts --runInBand`

Expected: PASS.

### Task 2: Add the saved-only picker without touching card geometry

**Files:**
- Modify: `app/flashcards/useCollectionData.ts`
- Modify: `app/flashcards_collection.tsx`
- Modify: `app/flashcards/CollectionHeader.tsx`
- Test: `tests/saved_collection_content_picker_ui.test.mjs`

- [ ] **Step 1: Write a source-contract test**

```js
assert.match(header, /savedContentFilter/);
assert.match(header, /Все|All/);
assert.match(header, /Слова|Words/);
assert.match(header, /Фразы|Phrases/);
assert.match(collection, /filterSavedCardsByContentKind/);
assert.match(collection, /savedContentFilter === 'phrase'/);
assert.match(listItemChrome, /borderRadius: 20/);
```

- [ ] **Step 2: Run it and verify the first four assertions fail**

Run: `node tests/saved_collection_content_picker_ui.test.mjs`

Expected: assertion failure because the picker does not exist yet.

- [ ] **Step 3: Thread the selected content kind through the collection**

Apply `filterSavedCardsByContentKind` in `useDerivedCollectionCards`, add picker state in `flashcards_collection.tsx`, and pass counts plus the selected kind to `CollectionHeader`. Render the 44-point minimum-height segmented control below search only for `activeCat === 'saved'`. Render the existing source filter for saved content only when `savedContentFilter === 'phrase'`.

- [ ] **Step 4: Run focused contracts**

Run: `node tests/saved_collection_content_picker_ui.test.mjs && npm test -- tests/flashcards_collection_locale.test.ts tests/fc_collection_search.test.ts --runInBand`

Expected: exit code 0.

### Task 3: Verify user-visible invariants

**Files:**
- Inspect: `app/flashcards/FlashcardListItemChrome.ts`
- Inspect: `app/flashcards/CollectionListView.tsx`
- Inspect: `app/flashcards/CollectionDeckView.tsx`

- [ ] **Step 1: Inspect the diff**

Run: `git diff -- app/flashcards/selectors.ts app/flashcards/useCollectionData.ts app/flashcards_collection.tsx app/flashcards/CollectionHeader.tsx tests/flashcards_collection_locale.test.ts tests/saved_collection_content_picker_ui.test.mjs`

Expected: no edits to `FlashcardListItemChrome.ts`, `CollectionListView.tsx`, or `CollectionDeckView.tsx`.

- [ ] **Step 2: Run the narrow verification suite**

Run: `npm test -- tests/flashcards_collection_locale.test.ts tests/fc_collection_search.test.ts --runInBand && node tests/saved_collection_content_picker_ui.test.mjs`

Expected: exit code 0.
