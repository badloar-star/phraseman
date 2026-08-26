# Learning V2 Word Pocket, Dictionary, and Session 1 Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Learning V2 session-1 experience with durable unlocked words, bookmark saving, a card pocket, a map dictionary, card-to-pocket motion, replayable audio, semantic target typography, and non-destructive Back/Next navigation.

**Architecture:** Add one local, target-language-scoped unlocked-word registry and project it into two existing UI systems: the Cards deck inside the session and the legacy vocabulary list on the lesson map. Keep the session player as the orchestration owner, but move pure progress, history, footer layout, and replay decisions into small tested modules. Preserve source → shard → runtime content contracts and do not touch English sessions 2–56 or the Spanish authoring contour.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, React Native Reanimated, existing Cards components, existing Learning V2 runtime/package contracts, Jest/React Native Testing Library, focused `tsx` gates.

---

## Scope and safety packet

- Target: English Learning V2, lesson 1, session 1 plus shared runtime seams required by that session.
- Current authoring state required before every learner-facing edit: `CURRENT 1`, `DRAFT`, `FORBIDDEN 2–56`.
- Non-goals: authoring sessions 2–56, Spanish content, TTS generation, deploy, publish, push, commit, broad refactors.
- All heavy Jest/typecheck/build commands require `.claude/semaphore/slot.sh`.
- Existing dirty files from other sessions are preserved.
- No commit steps are included because the owner has not authorized commits.

## File map

### New focused files

- `app/learning_v2_unlocked_lesson_words_v1.ts` — durable idempotent registry and pure validation/filtering.
- `hooks/use_learning_v2_unlocked_lesson_words_v1.ts` — focus-aware React projection of that registry.
- `app/learning_v2_session_review_history_v1.ts` — pure Back/Next state machine that cannot award twice.
- `components/learning-v2/LearningV2WordPocketButton.tsx` — bookmark-stack footer control and badge.
- `components/learning-v2/LearningV2UnlockedWordDeckOverlay.tsx` — adapter into `CollectionDeckView`.
- `components/learning-v2/LearningV2LessonDictionaryOverlay.tsx` — browse-only adapter matching legacy `WordList` rows.
- `components/learning-v2/LearningV2WordEncounterFlight.tsx` — non-blocking visual receipt from encounter card to pocket.
- Focused tests named in each task below.

### Existing files to modify

- `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`
- `app/learning_v2_new_word_encounter_flow_v1.ts`
- `app/learning_v2_direct_session_player_v1.tsx`
- `app/learning-v2/lesson/[id].tsx`
- `app/learning_v2_intro_semantic_bridge.ts`
- `app/learning_v2_session_intro.tsx`
- `modules/learning-v2/content/intro_semantic_runs_v1.ts`
- `modules/learning-v2/content/source/episode_01_session_01_intro_word_first_v1.ts`
- `hooks/use_managed_spoken_audio_player.ts` or the narrower Learning V2 playback adapter selected by RED evidence.
- `docs/v2/СТАРТ В2.md`
- `docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md`
- `docs/v2/HANDOVER.md`

### Existing UI reused without copying

- `app/flashcards/CollectionDeckView.tsx`
- `app/flashcards/PhraseCard.tsx`
- `app/flashcards/FlashcardListItem.tsx`
- `app/flashcards/FlashcardListItemChrome.ts`
- `app/lesson_words.tsx` list-row behavior
- `components/AddToFlashcard.tsx`

---

### Task 1: Make the owner decision permanent and machine-readable

**Files:**
- Modify: `docs/v2/СТАРТ В2.md`
- Modify: `docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md`
- Create: `tests/learning_v2_word_pocket_owner_contract_2026_08_26_gate.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing contract gate**

The gate reads both normative documents and asserts the exact phrases for:

```ts
const required = [
  "Назад | hold-to-talk микрофон | карман слов | Далее",
  "bookmark-outline",
  "только уже разблокированные слова",
  "карточка уменьшается и перемещается в карман",
  "будущие слова не показываются",
];
```

It must also reject the old rule that the voice footer contains only one control.

- [ ] **Step 2: Run the gate and confirm RED**

Run: `npx tsx tests/learning_v2_word_pocket_owner_contract_2026_08_26_gate.ts`  
Expected: FAIL because the new owner decision is not yet present in both normative documents.

- [ ] **Step 3: Add the exact owner contract**

Record the approved behaviors without weakening mode-native requirements:

```md
- Encounter unlock occurs before decorative motion completion.
- The card flies to the footer pocket; reduce-motion updates state instantly.
- Save uses bookmark-outline/bookmark, never a heart.
- The in-session pocket and map dictionary show only actually encountered words.
- Voice footer order is: Назад | hold-to-talk микрофон | карман слов | Далее.
```

Add the focused command to `package.json` as `learning-v2:word-pocket-gate`.

- [ ] **Step 4: Run the gate and confirm GREEN**

Run: `npm run learning-v2:word-pocket-gate`  
Expected: `LEARNING V2 WORD POCKET OWNER CONTRACT ... PASS`.

---

### Task 2: Add an idempotent unlocked-word registry

**Files:**
- Create: `app/learning_v2_unlocked_lesson_words_v1.ts`
- Create: `tests/learning_v2_unlocked_lesson_words_v1.test.ts`

- [ ] **Step 1: Write RED tests for identity, filtering, and persistence shape**

Tests must exercise this public API:

```ts
export type LearningV2UnlockedLessonWordV1 = Readonly<{
  targetLanguage: string;
  lessonOrdinal: number;
  lexicalItemId: string;
  sourceSessionOrdinal: number;
  firstEncounteredAt: string;
  encounter: LearningV2CourseSessionNewWordEncounterV1;
}>;

export function learningV2UnlockedLessonWordsKeyV1(
  targetLanguage: string,
  lessonOrdinal: number,
): string;

export function mergeLearningV2UnlockedLessonWordV1(
  current: readonly LearningV2UnlockedLessonWordV1[],
  next: LearningV2UnlockedLessonWordV1,
): readonly LearningV2UnlockedLessonWordV1[];

export async function loadLearningV2UnlockedLessonWordsV1(scope: {
  targetLanguage: string;
  lessonOrdinal: number;
}): Promise<readonly LearningV2UnlockedLessonWordV1[]>;

export async function markLearningV2LessonWordUnlockedV1(
  item: LearningV2UnlockedLessonWordV1,
): Promise<readonly LearningV2UnlockedLessonWordV1[]>;
```

Assertions: NFC strings only, lesson/session positive integers, target language
separation, same lexical item remains one row and preserves earliest timestamp,
corrupt storage returns an empty validated list without deleting unrelated data.
The learner-safe encounter snapshot is required and validated so Cards and the
map dictionary can be reconstructed after restart without a live package.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npx jest tests/learning_v2_unlocked_lesson_words_v1.test.ts --runInBand` with semaphore.  
Expected: module-not-found failure.

- [ ] **Step 3: Implement minimal storage and pure merge**

Use `AsyncStorage.getItem/setItem`, a versioned key
`learning-v2:unlocked-words:v1:<target>:lesson:<ordinal>`, immutable arrays, and
an in-process listener set for same-screen synchronization.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Expected: all registry tests PASS with no writes outside the scoped key.

---

### Task 3: Project unlocked runtime encounters into Cards data

**Files:**
- Create: `app/learning_v2_unlocked_word_cards_v1.ts`
- Create: `tests/learning_v2_unlocked_word_cards_v1.test.ts`

- [ ] **Step 1: Write the failing projection tests**

Public projection:

```ts
export function projectLearningV2UnlockedWordsToCardsV1(args: {
  unlocked: readonly LearningV2UnlockedLessonWordV1[];
}): readonly CardItem[];
```

Tests prove only unlocked lexicalItemIds are returned, source order is stable,
front is target/transcription, back resolves to exact locale-native translation,
and no playful description leaks onto the back.

- [ ] **Step 2: Run RED, implement the adapter, rerun GREEN**

Run the single test file under the semaphore. Expected final result: PASS.

---

### Task 4: Build the pocket button, exact deck overlay, and bookmark toggle

**Files:**
- Create: `components/learning-v2/LearningV2WordPocketButton.tsx`
- Create: `components/learning-v2/LearningV2UnlockedWordDeckOverlay.tsx`
- Create: `tests/learning_v2_word_pocket_components.test.tsx`

- [ ] **Step 1: Write RED component tests**

Assert:

```tsx
expect(queryByTestId("learning-v2-word-pocket-button")).toBeNull(); // zero words
expect(getByTestId("learning-v2-word-pocket-count").props.children).toBe(3);
expect(getByLabelText("Сохранить here в карточки")).toBeTruthy();
expect(queryByText("♥")).toBeNull();
```

The deck test must verify `CollectionDeckView` receives only unlocked cards and
that closing returns through `onClose` without mutating practice state.

- [ ] **Step 2: Run RED**

Run the focused RN test with semaphore and `--runInBand`.

- [ ] **Step 3: Implement using existing Cards primitives**

`LearningV2WordPocketButton` uses Ionicons `albums-outline` plus badge.
`LearningV2UnlockedWordDeckOverlay` wraps the actual `CollectionDeckView` and
passes the existing speech/save adapters. Save icons remain
`bookmark-outline/bookmark`; no heart glyph is rendered.

- [ ] **Step 4: Run GREEN and focused accessibility assertions**

Expected: 44×44 minimum targets, locale-native labels, PASS.

---

### Task 5: Make encounter unlock and card-to-pocket motion honest

**Files:**
- Modify: `app/learning_v2_new_word_encounter_flow_v1.ts`
- Modify: `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`
- Create: `components/learning-v2/LearningV2WordEncounterFlight.tsx`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Create: `tests/learning_v2_word_encounter_flight_v1.test.tsx`

- [ ] **Step 1: Write RED state-order tests**

The Continue transition must expose effects in this order:

```ts
["persist_unlock", "start_card_to_pocket_motion", "activate_task"]
```

`activate_task` may wait for the short owner-approved visual sequence, but a
motion cancellation or reduced-motion branch must still leave unlock persisted.
Repeated encounter IDs must not increase the badge.

- [ ] **Step 2: Run RED**

Run the pure flow test first; expected mismatch with current effects.

- [ ] **Step 3: Implement the motion receipt**

Use Reanimated transform/opacity only, duration `520 ms`, target layout supplied
by the pocket button, and `useReducedMotion()` for the instant branch. Do not
disable the bookmark, audio, or Continue hit targets during entrance/flip.

- [ ] **Step 4: Integrate interleaved encounter timing**

The player shows an encounter immediately before the first practice child whose
`newWordEncounter.lexicalItemId` matches; it does not drain all cards after the
three intro pages. Continue returns to the same practice index.

- [ ] **Step 5: Run focused flow/overlay/interleaving gates**

Run:

```text
tests/learning_v2_new_word_encounter_flow_v1.test.ts
tests/learning_v2_new_word_encounter_overlay.test.tsx
tests/learning_v2_interleaved_word_card_gate.ts
tests/learning_v2_new_word_before_practice_motion_2026_08_26_gate.ts
```

Expected: all PASS.

---

### Task 6: Add review-safe Back/Next and the four-control voice footer

**Files:**
- Create: `app/learning_v2_session_review_history_v1.ts`
- Create: `tests/learning_v2_session_review_history_v1.test.ts`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `tests/learning_v2_local_hold_to_talk_v1.test.ts`
- Create: `tests/learning_v2_voice_footer_with_pocket_2026_08_26_gate.ts`

- [ ] **Step 1: Write RED pure-history tests**

State:

```ts
type ReviewHistoryV1 = Readonly<{
  furthestReached: number;
  visibleIndex: number;
  answered: Readonly<Record<number, "correct" | "wrong" | "skipped">>;
}>;
```

Tests prove Back never goes below zero, Next cannot exceed furthestReached,
reviewed answers do not emit `award_runes`, `record_attempt`, or `unlock_word`,
and returning forward restores deterministic response order.

- [ ] **Step 2: Run RED, implement pure reducer, rerun GREEN**

- [ ] **Step 3: Integrate the standard footer**

Normal order: `Назад | карман | Далее`. Voice order:

```text
Назад | hold-to-talk микрофон | карман слов | Далее
```

The microphone keeps press-in/start and press-out/finish semantics and the
canonical `VoiceEqualizer`. The pocket remains independently tappable. No
second mic, Skip, Check, Theory, or Hint control is added.

- [ ] **Step 4: Run voice and footer gates**

Expected: microphone lifecycle unchanged, pocket accessible, no duplicate rune
event on reviewed screens.

---

### Task 7: Fix replayable audio at every word surface

**Files:**
- Modify: `hooks/use_managed_spoken_audio_player.ts` or create
  `app/use_learning_v2_replayable_audio_v1.ts` after reproducing the failure
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`
- Create: `tests/learning_v2_replayable_audio_v1.test.ts`

- [ ] **Step 1: Reproduce with a fake player**

Press the same audio control twice after completion and assert two independent
sequences:

```ts
expect(calls).toEqual(["seek:0", "play", "seek:0", "play"]);
```

Also test card autoplay followed by task autoplay uses two different request
IDs and that an interrupted playback leaves the button replayable.

- [ ] **Step 2: Run RED and isolate whether the stale state is source, request, or finish state**

- [ ] **Step 3: Implement the smallest repair**

Every tap claims focus, resets to zero, starts playback, arms a bounded watchdog,
and clears playing state on completion/error/interruption. Production refs stay
preloaded; no runtime TTS generation is introduced.

- [ ] **Step 4: Run focused replay and preview recovery gates**

Expected: repeated press always starts audio, no permanent `Звучит` state.

---

### Task 8: Fix explicit intro target semantics without false red text

**Files:**
- Modify: `modules/learning-v2/content/intro_semantic_runs_v1.ts`
- Modify: `app/learning_v2_intro_semantic_bridge.ts`
- Modify: `app/learning_v2_session_intro.tsx`
- Modify: `modules/learning-v2/content/source/episode_01_session_01_intro_word_first_v1.ts`
- Modify: `tests/learning_v2_intro_colour_bridge.test.ts`
- Modify: `tests/learning_v2_intro_explicit_wrong_semantic_2026_08_26_gate.ts`

- [ ] **Step 1: Write RED assertions for neutral target terms**

Introduce explicit semantic role `targetNeutral` and assert valid competitors
such as `an`, `m`, `hear`, `hair`, letters, and IPA use target typography but
never wrong color or strike. Only explicit `targetWrong` may be red/struck.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement explicit author markup and renderer mapping**

Do not use a Latin-character heuristic. Derive title/prompt/choice target spans
only from explicit semantic runs/target terms of session 1. Target uses theme
accent + weight 900; explanation uses normal body typography.

- [ ] **Step 4: Run intro gates and inspect all three intro pages**

Expected: zero false `targetWrong`, every intended English/IPA fragment styled,
native-language answer options not recolored as English.

---

### Task 9: Add the browse-only lesson dictionary to the map

**Files:**
- Create: `hooks/use_learning_v2_unlocked_lesson_words_v1.ts`
- Create: `components/learning-v2/LearningV2LessonDictionaryOverlay.tsx`
- Modify: `app/learning-v2/lesson/[id].tsx`
- Create: `tests/learning_v2_lesson_dictionary_overlay.test.tsx`
- Create: `tests/learning_v2_lesson_map_dictionary_contract_2026_08_26_gate.ts`

- [ ] **Step 1: Write RED map/dictionary tests**

Assert a right-side floating button, unlocked count, only unlocked rows, repeated
audio callback, bookmark toggle, and absence of `Начать тренировку`, energy cost,
locked/future words, and training tabs.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement by extracting/reusing legacy WordList row primitives**

If `WordList` cannot be reused because it is private, extract only the row into
a shared component used by both `app/lesson_words.tsx` and the Learning V2
overlay. Preserve legacy behavior; do not copy markup into a second component.

- [ ] **Step 4: Run GREEN and map regression checks**

Expected: map nodes keep identical geometry and gestures; dictionary overlays
without navigation reset.

---

### Task 10: Integrate, inspect on phone, and record durable receipts

**Files:**
- Modify: `tests/learning_v2_session1_owner_reported_issues_2026_08_26_gate.ts`
- Modify: `tests/learning_v2_session1_completion_blockers_2026_08_26_gate.ts`
- Modify: `docs/v2/HANDOVER.md`

- [ ] **Step 1: Extend the owner-issue gate**

Require all new focused gates and explicit production paths. The gate must fail
if a heart glyph, future dictionary word, header-moved pocket, batched word cards,
or non-replayable audio path returns.

- [ ] **Step 2: Run the light focused gate bundle**

Run pure `tsx` gates directly. For Jest, typecheck, build, or device preview,
acquire/release the shared semaphore exactly once per command.

- [ ] **Step 3: Run fresh authoring preflight**

Run: `npm run learning-v2:lesson1-authoring-preflight -- --session 1`  
Expected: CURRENT 1, DRAFT or AUTO_PASS depending on all content gates;
FORBIDDEN 2–56.

- [ ] **Step 4: Verify on the existing DEV phone build**

Walk this exact path: intro semantics → first interleaved word card → replay
audio twice → toggle bookmark → Continue flight → open pocket → Back/Next →
voice footer with mic+pocket → return to map → open dictionary → replay and
toggle the same bookmark. Capture screenshots and motion receipt without
starting a second Metro process.

- [ ] **Step 5: Update HANDOVER truthfully**

Record files, commands, PASS/HOLD counts, screenshots, open blockers, exact
registry status, and the new owner decision. Do not mark session 1 `LOCKED`
without the required owner review/status transition.

## Self-review result

- Spec coverage: every section of the approved design maps to Tasks 1–10.
- Placeholder scan: no `TBD`, generic “handle errors”, or unspecified test step
  remains.
- Type consistency: the unlocked-word identity is consistently
  `targetLanguage + lessonOrdinal + lexicalItemId`; saving remains separate.
- Contract conflict resolved: the newest owner decision supersedes the earlier
  mic-only footer wording and is explicitly updated in both normative docs.
- Execution mode: inline execution is required in this shared dirty checkout;
  no branch, worktree, subagent, commit, deploy, or push is created.
