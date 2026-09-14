# Card Training Recall And Pack Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved “Focus card” recall UI and replace textual deck-selection rows with a two-column grid of square pack tiles using each pack’s real card-back artwork.

**Architecture:** Keep training semantics, economy, attempts, daily assignment, and result settlement unchanged. Add one reusable `DeckSelectionTile` presentation component consumed by both selection surfaces; enrich existing `DeckSheetOption` data with optional static artwork and a stable revision. Refactor only the render layer of `flashcards_recall_session.tsx` to the approved focus-card hierarchy while reusing the existing verdict, life, rune-flight, reveal, loading, empty, and result logic.

**Tech Stack:** React Native, Expo Router, `expo-image`, Reanimated, existing Phraseman theme/motion primitives, Jest source contracts.

**Workspace constraint:** The current checkout is intentionally shared and already dirty. Do not create a branch or worktree. Do not commit entire modified files because they contain pre-existing owner work; verify and leave the scoped diff for the owner.

---

### Task 1: Lock the square-tile and recall visual contracts

**Files:**
- Create: `tests/fc_deck_selection_tiles_contract.test.ts`
- Modify: `tests/fc_recall_session_contract.test.ts`

- [x] **Step 1: Add a failing square-tile contract**

Create a source contract that requires:

```ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('card training deck selection tiles', () => {
  test('both selection surfaces use the shared square tile', () => {
    const sheet = read('app', 'flashcards', 'DeckPickerSheet.tsx');
    const setup = read('app', 'flashcards_training_setup.tsx');
    const tile = read('app', 'flashcards', 'DeckSelectionTile.tsx');

    expect(sheet).toContain('DeckSelectionTile');
    expect(setup).toContain('DeckSelectionTile');
    expect(tile).toContain('aspectRatio: 1');
    expect(tile).toContain('accessibilityRole="checkbox"');
    expect(tile).toContain("contentFit=\"contain\"");
  });

  test('pack options carry real artwork and cache revision', () => {
    const options = read('app', 'flashcards', 'deck_options.ts');
    expect(options).toContain('coverImage');
    expect(options).toContain('coverRevision');
    expect(options).toContain('packTileImageForPack');
    expect(options).toContain('bundledPackTilePng');
  });
});
```

- [x] **Step 2: Extend the recall contract before implementation**

Require the approved hierarchy without changing behavioral assertions:

```ts
expect(source).toContain('styles.focusCard');
expect(source).toContain('styles.compactInputShell');
expect(source).toContain('fc-recall-hint');
expect(source).toContain('fc-recall-guidance');
expect(source).toContain('automaticallyAdjustKeyboardInsets');
expect(source).not.toContain('styles.promptCard');
```

- [x] **Step 3: Run the tests and confirm the intended failure**

Run:

```powershell
npx jest --runTestsByPath tests/fc_deck_selection_tiles_contract.test.ts tests/fc_recall_session_contract.test.ts --runInBand
```

Expected: FAIL because `DeckSelectionTile.tsx`, `focusCard`, and hint test IDs do not exist yet.

### Task 2: Preserve real community-pack cover metadata

**Files:**
- Modify: `app/community_packs/communityOwnedStorage.ts`
- Modify: `app/community_packs/communityPackActions.ts`
- Modify: `app/community_packs/purchaseCommunityPack.ts`
- Modify: `tests/fc_deck_options.test.ts`

- [x] **Step 1: Add a failing persisted-cover assertion**

Extend the existing community-pack test:

```ts
await addCommunityOwnedPackId(communityPackId, undefined, {
  titleRu: 'Разговорный английский',
  titleUk: 'Розмовна англійська',
  titleEs: 'Inglés conversacional',
  ugcCardBackKey: 'community_06_forest_rune',
});

expect(deck?.coverRevision).toBe('community_06_forest_rune');
expect(deck?.coverImage).toBeDefined();
```

- [x] **Step 2: Extend the backwards-compatible local metadata type**

Use an optional field so old stored objects remain valid:

```ts
export type CommunityOwnedPackTitle = {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  ugcCardBackKey?: string;
};
```

In `parseTitles`, retain a string `ugcCardBackKey` when present; otherwise omit it. This is an additive local-storage migration and must not change the key or invalidate existing titles.

- [x] **Step 3: Persist the cover at every call site that has a full pack**

Add `ugcCardBackKey: pack.ugcCardBackKey` to metadata passed from both purchase/redeem flows. Extend `addCommunityPackToLibrary`’s `Pick` to include `ugcCardBackKey` and pass it through.

- [x] **Step 4: Run the deck-options test**

Run:

```powershell
npx jest --runTestsByPath tests/fc_deck_options.test.ts --runInBand
```

Expected: the new cover assertion still fails until Task 3, while all pre-existing title/count/isolation assertions pass.

### Task 3: Enrich deck options and render a shared square tile

**Files:**
- Create: `app/flashcards/DeckSelectionTile.tsx`
- Modify: `app/flashcards/DeckPickerSheet.tsx`
- Modify: `app/flashcards/deck_options.ts`
- Modify: `app/flashcards_training_setup.tsx`

- [x] **Step 1: Extend `DeckSheetOption` without changing selection identity**

Add:

```ts
coverImage?: ImageSourcePropType;
coverRevision?: string;
sourceKind: 'saved' | 'custom' | 'pack';
```

`deckId`, `count`, and `cardIds` remain the only data used for selection and card-count deduplication.

- [x] **Step 2: Resolve artwork in `loadFcDeckOptions`**

For `saved` and `custom`, set only `sourceKind`. For pack options:

```ts
const pack = catalogById.get(packId);
const storedBackKey = ownedTitles[packId]?.ugcCardBackKey;
const coverImage = pack
  ? packTileImageForPack(pack) ?? bundledPackTilePng(pack.id)
  : cardBackFanImage(storedBackKey) ?? bundledPackTilePng(packId);
const coverRevision = pack
  ? packTileArtRevision(pack)
  : storedBackKey || packId;
```

Build `catalogById` from bundled packs plus cached/published community packs and local-author packs. Every remote/cache read must retain the current `.catch(() => [])` behavior so covers cannot block deck selection.

- [x] **Step 3: Make warm-cache comparison cover-aware**

Update `sameDeckOptions`:

```ts
if (
  x.deckId !== y.deckId ||
  x.count !== y.count ||
  x.title !== y.title ||
  x.coverRevision !== y.coverRevision
) return false;
```

- [x] **Step 4: Create `DeckSelectionTile`**

The component must:

- use a square artwork surface with `aspectRatio: 1`, matching the existing pack catalogs;
- use `expo-image` with `contentFit="contain"` when `coverImage` exists;
- use the existing Ionicon only for `saved`, `custom`, or missing artwork;
- show the adaptive title below the square artwork and card count in a compact lower badge;
- expose the entire title/count via `accessibilityLabel`;
- expose checkbox role/state and disabled state;
- show selection with accent border plus an animated checkmark;
- keep accent-filled checkmark text/icon dark via `t.correctText`;
- use transform/opacity only and skip spring motion in reduced/simple mode.

- [x] **Step 5: Replace both row lists with two-column wrapping grids**

In both `DeckPickerSheet` branches and `flashcards_training_setup.tsx`, render:

```tsx
<View style={styles.deckGrid}>
  {decks.map((deck, index) => (
    <DeckSelectionTile
      key={deck.deckId}
      deck={deck}
      index={index}
      selected={selectedIds.has(deck.deckId)}
      onToggle={toggleDeck}
      simpleMotion={simpleMotion}
      t={t}
      f={f}
    />
  ))}
</View>
```

Use `flexDirection: 'row'`, `flexWrap: 'wrap'`, and a stable half-width tile basis. Do not add horizontal scrolling.

- [x] **Step 6: Run deck tests and contract**

Run:

```powershell
npx jest --runTestsByPath tests/fc_deck_options.test.ts tests/fc_deck_selection_tiles_contract.test.ts tests/fc_deck_selection.test.ts --runInBand
```

Expected: PASS.

### Task 4: Implement recall variant A without changing session semantics

**Files:**
- Modify: `app/flashcards_recall_session.tsx`
- Modify: `tests/fc_recall_session_contract.test.ts`

- [x] **Step 1: Add hint state that resets per card**

Add `const [hintVisible, setHintVisible] = useState(false);` and reset it in `resetRound`, `advance`, and session-attempt restoration. Derive a short grapheme-safe prefix from `activeCard.en`; the hint is presentation-only and must not call `recordVerdict`, reveal the full answer, or award runes.

- [x] **Step 2: Refactor the working area to the approved focus-card hierarchy**

Keep `renderHeader`, attempts, progress, and all session handlers intact. Replace only the question/input layout:

```tsx
<Text style={styles.instruction}>{copy.prompt}</Text>
<Reanimated.View style={[styles.focusCard, { backgroundColor: t.bgCard }]}>
  <Text style={styles.translation}>{activeCard.translation}</Text>
  <View style={styles.focusFooter}>
    <Text>{Math.max(1, remainingQueueCount)} / {totalCards}</Text>
    <Pressable testID="fc-recall-hint" onPress={() => setHintVisible(true)}>
      <Ionicons name="bulb-outline" />
      <Text>{copy.hint}</Text>
    </Pressable>
  </View>
</Reanimated.View>
{hintVisible && !feedback && !answerRevealed ? (
  <Reanimated.View testID="fc-recall-guidance" accessibilityLiveRegion="polite">
    <Text>{copy.hintPrefix}: {hintPrefix}</Text>
  </Reanimated.View>
) : null}
```

Place the compact multiline input directly below it. Keep `maxLength`, keyboard appearance, fuzzy check, reveal/self-grade, feedback, and the bottom primary action unchanged.

- [x] **Step 3: Add all localized hint copy through `triLang`**

Add `hint` and `hintPrefix` for every locale already supported by the file. Do not add a grammar label inferred from the phrase; the product has no reliable grammar metadata on arbitrary cards.

- [x] **Step 4: Preserve reward and life behavior**

Do not change `recordVerdict`, `useSessionAttempts`, `useSessionAttemptAutoReset`, `usePracticeRunes`, `usePracticeRuneFlight`, `LearningV2RuneFlight`, or `SessionResultScreen`. A correct unrevealed answer still awards at most the existing rune amount; a wrong answer still registers one pedagogical wrong verdict and triggers existing heart loss.

- [x] **Step 5: Run recall and shared-session contracts**

Run:

```powershell
npx jest --runTestsByPath tests/fc_recall_session_contract.test.ts tests/learning_v2_session_result_handoff.test.ts tests/use_practice_runes.test.ts --runInBand
```

Expected: PASS.

### Task 5: Focused quality gate

**Files:**
- Verify all files from Tasks 1–4

- [x] **Step 1: Run targeted ESLint**

Run:

```powershell
npx eslint app/flashcards/DeckSelectionTile.tsx app/flashcards/DeckPickerSheet.tsx app/flashcards/deck_options.ts app/flashcards_training_setup.tsx app/flashcards_recall_session.tsx app/community_packs/communityOwnedStorage.ts app/community_packs/communityPackActions.ts app/community_packs/purchaseCommunityPack.ts tests/fc_deck_selection_tiles_contract.test.ts tests/fc_deck_options.test.ts tests/fc_recall_session_contract.test.ts --max-warnings=0
```

Expected: exit 0 with no warnings.

- [x] **Step 2: Run the complete focused Jest set under the shared semaphore**

Acquire and release `.claude/semaphore/slot.sh` around:

```powershell
npx jest --runTestsByPath tests/fc_deck_selection_tiles_contract.test.ts tests/fc_deck_options.test.ts tests/fc_deck_selection.test.ts tests/fc_recall_session_contract.test.ts tests/fc_training_entry.test.ts tests/learning_v2_session_result_handoff.test.ts tests/use_practice_runes.test.ts tests/energy_start_cost_contract.test.ts --runInBand
```

Expected: all suites pass.

- [x] **Step 3: Check the scoped diff**

Run `git diff --check` only on the files listed in this plan. Expected: no whitespace errors. Review that no economy, daily assignment, removed listening mode, or unrelated card flow was modified.

Verification note: the feature-focused set passes 46/46 tests. The expanded
shared set passes 103/109; all six failures are in the unrelated energy contract
already changed in the shared checkout. Live Metro/type verification is also
blocked by pre-existing deletions of `components/EnergyBar.tsx` and
`components/EnergyCostBadge.tsx`; those unrelated owner changes were preserved.
