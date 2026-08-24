# Flashcards Navigation Contract Implementation Plan

> **For Codex:** Execute this plan inline in the current checkout. Preserve all unrelated staged and unstaged changes.

**Goal:** Make all ordinary training-mode taps open the deck picker, make Cards sibling roots crossfade without lateral motion, eliminate incomplete first frames when opening packs, and enforce deterministic non-cyclic Back behavior.

**Architecture:** Keep the existing Cards routes and screens. Change their entry/navigation contracts: sibling roots use replace + a route-specific fade; pack children receive a staged ready snapshot before navigation; the custom navigation journal treats all three Cards roots as the same section level; visible sheets consume Back before route navigation.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest source-contract tests.

---

## Task 1: Route ordinary training taps through the existing deck picker

**Files:**
- Modify: `app/flashcards/FlashcardsTabBar.tsx`
- Test: `tests/fc_training_picker_entry_contract.test.ts`

1. Keep the dedicated Errors branch unchanged.
2. Replace the direct last-preset lookup and `router.push(buildFcTrainRoute(...))` path for ordinary modes with `setPickerOption(option)`.
3. Preserve setup-button and long-press entry points as aliases to the same picker.
4. Run:

```powershell
npx jest --runTestsByPath tests/fc_training_picker_entry_contract.test.ts --no-cache --runInBand
```

Expected: PASS; Training, Blitz, Listen, and Voice no longer launch the removed implicit queue.

## Task 2: Give Cards sibling roots a same-level transition and Back policy

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/navigation_back.ts`
- Modify: `app/flashcards/FlashcardsTabBar.tsx`
- Test: `tests/navigation_back.test.ts` or a focused new Cards navigation contract test

1. Add `/flashcards_packs` and `/flashcards_my_packs` as `flashcards` section roots.
2. Assign `flashcards`, `flashcards_packs`, and `flashcards_my_packs` a 140 ms fade animation; use no animation when Reduce Motion is enabled. Do not apply this sibling transition to `flashcards_collection`.
3. Expand the Android Back handler so it closes, in order, deck picker / mistakes sheet / open menu before any screen-level Back can run.
4. Add tests proving sibling roots fall back to Home and never become child-history entries.
5. Run the focused navigation tests.

Expected: PASS; sibling tab changes crossfade, pack pages remain child routes, and Back cannot cycle through sibling roots or navigate beneath a sheet.

## Task 3: Stage a complete pack snapshot before opening a pack

**Files:**
- Modify: `app/community_packs/staging.ts`
- Modify: `app/flashcards/useCollectionData.ts`
- Modify: `components/flashcards/FlashcardsCategoryHub.tsx`
- Modify: `app/flashcards_my_packs.tsx`
- Test: focused community-pack staging and pack-opening contract tests

1. Make community staging return an awaitable card result while keeping its bounded memo cache.
2. Resolve locally authored packs from local storage before Firestore fallback.
3. Stage the selected pack metadata together with its cards so `flashcards_collection` can render the correct pack on its first committed frame.
4. Await cold community staging on the source tile; navigate only after usable cards are ready. Disable the tapped tile and show compact busy feedback while waiting. On failure, keep the source screen mounted and show an error toast.
5. Preserve the existing deep-link ownership/preview guard; staged data is render input, not authorization.
6. Run focused tests.

Expected: PASS; opening official, saved, owned, or locally created packs never flashes an incomplete collection screen.

## Task 4: Verify the integrated Cards contract

**Files:**
- Test only; do not change unrelated source to silence failures.

Run:

```powershell
npx jest --runTestsByPath tests/fc_training_picker_entry_contract.test.ts tests/navigation_back.test.ts tests/community_pack_staging.test.ts --no-cache --runInBand
npx tsc --noEmit --pretty false
```

If the repository-wide typecheck contains pre-existing unrelated failures, record them and run a focused TypeScript/Jest gate covering the changed files. Also run `git diff --check` and inspect only the task diff.

Expected: all focused tests pass, no whitespace errors, no unrelated user edits reverted.
