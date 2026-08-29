# Universal session rune reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After three pedagogical errors, every non-Arena learning session clears its own unclaimed session-rune counter, restores three hearts, and continues without the recovery modal for every user; the obsolete heart-recovery gift can neither be granted nor used.

**Architecture:** Keep `useSessionAttempts` as the common heart-state authority. Each registered screen receives the exhausted effect, persists its local rune-buffer forfeiture where one exists, resets its own active activity UI, then restores attempts without an economy debit. Arena remains outside the registry and is not edited.

**Tech Stack:** React Native, TypeScript, Reanimated, Jest/RNTL, AsyncStorage-backed practice-rune buffer.

---

### Task 1: Make the shared attempts contract describe automatic recovery

**Files:**
- Modify: `app/session_attempts/session_attempts_domain.ts`
- Modify: `hooks/useSessionAttempts.ts`
- Test: `tests/session_attempts_domain.test.ts`
- Test: `tests/use_session_attempts.test.tsx`

- [ ] **Step 1: Add a failing reducer/hook test**

```ts
expect(reduceSessionAttempts(exhausted.state, {
  type: 'restore_after_session_rune_forfeit',
}).state.remainingAttempts).toBe(3);
```

- [ ] **Step 2: Add the zero-cost restoration event and hook action**

```ts
type: 'restore_after_session_rune_forfeit'
```

The transition is legal only from `awaiting_recovery` at zero hearts, keeps the current question and receipts, restores three hearts, and makes no economy call.

- [ ] **Step 3: Run focused domain and hook tests**

Run: `npx jest --config jest.rntl.config.cjs --testMatch '**/tests/session_attempts_domain.test.ts' '**/tests/use_session_attempts.test.tsx' --no-cache --runInBand`

Expected: PASS.

### Task 2: Retire the obsolete heart-recovery gift without deleting historical records

**Files:**
- Modify: `app/level_spin_reward_catalog.ts`
- Modify: `app/level_gift_active_inventory.ts`
- Modify: `app/session_attempts/session_attempt_recovery.ts`
- Modify: `tests/session_attempts_economy_gate.ts`

- [ ] **Step 1: Add a failing contract assertion**

```ts
assert.ok(!rewardCatalog.includes("'attempt_restore_all'"));
assert.ok(!giftInventory.includes("key: 'attempt_restore_all'"));
```

- [ ] **Step 2: Exclude future grants and make historical inventory inert**

Remove `attempt_restore_all` from the spin reward catalog and active inventory. Retain historical storage parsing only when needed for backwards-safe reads; do not delete an owned record or issue a compensating debit. Remove UI and recovery-code paths that consume the gift.

- [ ] **Step 3: Run the focused retirement contract**

Run: `npx jest --config jest.rntl.config.cjs --testMatch '**/tests/session_attempts_economy_gate.ts' '**/tests/session_attempt_recovery.test.ts' --no-cache --runInBand`

Expected: PASS with no future grant or usable recovery path.

### Task 3: Wire every non-Arena practice screen to the automatic reset

**Files:**
- Modify: `app/lesson1.tsx`
- Modify: `app/lesson_words.tsx`
- Modify: `app/lesson_irregular_verbs.tsx`
- Modify: `app/mistake_practice_session.tsx`
- Modify: `app/flashcards_swipe.tsx`
- Modify: `app/flashcards_blitz_session.tsx`
- Modify: `app/flashcards_listening_session.tsx`
- Modify: `app/flashcards_speaking_session.tsx`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `app/learning-v2/session/[id].tsx`
- Test: `tests/session_attempts_screen_wiring_gate.ts`

- [ ] **Step 1: Add a failing screen-wiring gate**

```ts
assert.ok(!source.includes('setShowAttemptsModal(true)'), `${relativeFile} may not open recovery modal`);
assert.ok(source.includes('restoreAfterSessionRuneForfeit'), `${relativeFile} must restore hearts after three errors`);
```

- [ ] **Step 2: Replace every exhausted-modal path**

```ts
if (attemptEffect === 'attempts_exhausted') {
  void forfeitSessionRunes().finally(() => {
    attempts.restoreAfterSessionRuneForfeit();
    resetCurrentActivityForRetry();
  });
  return;
}
```

Screens using `usePracticeRunes` call `forfeitPendingRunes`; screens without a pending rune buffer restore directly. The direct Learning V2 player resets `sessionRunes` only; no global balance/progress debit is introduced. Existing local activity cleanup (audio, timer, held voice state, card controls) remains intact.

- [ ] **Step 3: Remove recovery-modal rendering and recovery/end callbacks from these routes**

No screen mounts `SessionAttemptsRecoveryModal`; no exhausted path routes away or asks to spend runes/gifts. Arena files remain untouched.

- [ ] **Step 4: Run the screen contract and affected integration suites**

Run: `npx jest --config jest.rntl.config.cjs --testMatch '**/tests/session_attempts_screen_wiring_gate.ts' '**/tests/lesson_session_attempts_integration.test.tsx' '**/tests/lesson_words_attempts_integration.test.tsx' '**/tests/irregular_verbs_attempts_integration.test.tsx' '**/tests/fc_*_attempts_integration.test.tsx' --no-cache --runInBand`

Expected: PASS, with Arena excluded.

### Task 4: Verify the complete behavior

**Files:**
- Test: `tests/practice_rune_forfeit.test.ts`
- Test: `tests/practice_rune_counter.test.ts`

- [ ] **Step 1: Confirm local-rune persistence is cleared but the global wallet is untouched**

```ts
expect(forfeitPendingPracticeRunes(state).pendingRunes).toBe(0);
expect(forfeitPendingPracticeRunes(state).creditedItemIds).toEqual(state.creditedItemIds);
```

- [ ] **Step 2: Run all focused regression suites and whitespace validation**

Run: `npx jest --config jest.rntl.config.cjs --testMatch '**/tests/session_attempts_domain.test.ts' '**/tests/use_session_attempts.test.tsx' '**/tests/session_attempts_screen_wiring_gate.ts' '**/tests/practice_rune_forfeit.test.ts' '**/tests/practice_rune_counter.test.ts' '**/tests/lesson*_attempts_integration.test.tsx' '**/tests/irregular_verbs_attempts_integration.test.tsx' '**/tests/fc_*_attempts_integration.test.tsx' --no-cache --runInBand`

Run: `git diff --check -- app/session_attempts/session_attempts_domain.ts hooks/useSessionAttempts.ts app tests`

Expected: all selected tests pass; diff check has no whitespace errors.
