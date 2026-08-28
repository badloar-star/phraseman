# Premium Session Rune Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After three wrong answers in vocabulary or irregular-verbs practice, a verified Premium learner forfeits only the unclaimed runes in that pass, receives three new hearts, and retries the same question.

**Architecture:** A pure rune-buffer transition clears only `pendingRunes`, while a pure attempts-domain transition restores hearts without a durable recovery purchase. The screen components are the sole Premium-entitlement boundary; they coordinate the two transitions after the existing wrong-answer feedback delay and retain the active question/form.

**Tech Stack:** TypeScript, React Native, React Native Testing Library, AsyncStorage, Reanimated, Jest.

---

## File structure

- `app/practice_rune_earnings.ts` — immutable reset of a local, unclaimed rune buffer.
- `hooks/usePracticeRunes.ts` — safe hook action that persists that reset and exposes it to session screens.
- `app/session_attempts/session_attempts_domain.ts` — pure, no-charge heart restoration event.
- `hooks/useSessionAttempts.ts` — persistence-aware wrapper around the new domain transition.
- `components/PracticeRuneCounter.tsx` — animates both increases and the Premium forfeiture countdown, respecting reduce motion.
- `app/lesson_words.tsx` and `app/lesson_irregular_verbs.tsx` — verified-Premium orchestration; no new behavior for any other activity.
- Focused tests in `tests/` — pure-state, hook, and source-wiring coverage.

### Task 1: Specify the shared state transitions with failing tests

**Files:**
- Modify: `tests/session_attempts_domain.test.ts`
- Modify: `tests/use_practice_runes.test.ts`
- Modify: `tests/use_session_attempts.test.tsx`

- [ ] **Step 1: Add a failing domain test for no-charge restoration**

  Add after the existing charged-recovery test:

  ```ts
  test('premium reset restores exhausted attempts without a recovery receipt', () => {
    const exhausted = wrong(wrong(wrong(start(), 'answer_01').state, 'answer_02').state, 'answer_03').state;
    const restored = reduceSessionAttempts(exhausted, { type: 'restore_after_premium_forfeit' });

    expect(restored.effect).toBe('attempts_restored');
    expect(restored.state).toMatchObject({
      remainingAttempts: 3,
      phase: 'active',
      recoveryOrdinal: 1,
      recoveryReceiptIds: [],
      questionId: 'word:hello',
    });
    expect(reduceSessionAttempts(restored.state, { type: 'restore_after_premium_forfeit' }))
      .toMatchObject({ effect: 'none' });
  });
  ```

- [ ] **Step 2: Run the domain test to confirm it fails**

  Run:

  ```bash
  bash .claude/semaphore/slot.sh acquire "focused Jest: premium rune reset"
  npx jest tests/session_attempts_domain.test.ts --runInBand
  bash .claude/semaphore/slot.sh release
  ```

  Expected: failure because `restore_after_premium_forfeit` is not a valid event.

- [ ] **Step 3: Add a failing hook test for forfeiting the local buffer**

  In `tests/use_practice_runes.test.ts`, import `practiceRuneEarningsStorageKey` and add:

  ```ts
  test('forfeits only this pass’s pending runes and preserves paid item ids', async () => {
    const hook = await renderHook(() => usePracticeRunes({
      activity: 'vocabulary', sessionKey: 'premium-reset', completionOrdinal: 1,
    }));
    await waitFor(() => expect(hook.result.current.hydrating).toBe(false));
    await act(() => {
      expect(hook.result.current.onCorrectAnswer('word-a')).toBe(3);
      expect(hook.result.current.onCorrectAnswer('word-b')).toBe(3);
    });

    await act(async () => { await hook.result.current.forfeitPendingRunes(); });
    expect(hook.result.current.runes).toBe(0);
    expect(hook.result.current.onCorrectAnswer('word-a')).toBe(0);
    expect(hook.result.current.onCorrectAnswer('word-c')).toBe(3);
  });
  ```

- [ ] **Step 4: Add a failing wrapper test for in-place persistence**

  In `tests/use_session_attempts.test.tsx`, exhaust the hook and assert:

  ```ts
  await act(() => { hook.result.current.restoreAfterPremiumForfeit(); });
  expect(hook.result.current.state).toMatchObject({
    remainingAttempts: 3, phase: 'active', questionId: 'question-1', recoveryOrdinal: 1,
  });
  expect(mockCoordinator.commitSessionAttemptRecovery).not.toHaveBeenCalled();
  expect(mockCoordinator.persistSessionAttemptsState).toHaveBeenCalled();
  ```

- [ ] **Step 5: Run the two hook tests to confirm they fail**

  Run:

  ```bash
  bash .claude/semaphore/slot.sh acquire "focused Jest: premium rune reset"
  npx jest tests/use_practice_runes.test.ts tests/use_session_attempts.test.tsx --runInBand
  bash .claude/semaphore/slot.sh release
  ```

  Expected: failure because both new hook actions are absent.

### Task 2: Implement and verify the pure/hook behavior

**Files:**
- Modify: `app/practice_rune_earnings.ts`
- Modify: `hooks/usePracticeRunes.ts`
- Modify: `app/session_attempts/session_attempts_domain.ts`
- Modify: `hooks/useSessionAttempts.ts`
- Test: `tests/session_attempts_domain.test.ts`
- Test: `tests/use_practice_runes.test.ts`
- Test: `tests/use_session_attempts.test.tsx`

- [ ] **Step 1: Implement the immutable rune-buffer transition**

  Add to `app/practice_rune_earnings.ts`:

  ```ts
  export function forfeitPendingPracticeRunes(earnings: PracticeRuneEarnings): PracticeRuneEarnings {
    if (earnings.pendingRunes === 0) return earnings;
    return Object.freeze({ ...earnings, pendingRunes: 0 });
  }
  ```

  Do not change `creditedItemIds`, `awardPerItem`, or any settlement function.

- [ ] **Step 2: Add `forfeitPendingRunes` to the practice-runes hook**

  Extend `UsePracticeRunesResult`, import the transition, and implement a callback that applies it to `earningsRef.current`, calls `setRunes(0)`, and writes the changed record to its existing AsyncStorage key. In DEV fake-runes mode, call `setRunes(0)` without disk or network I/O. The callback must return `Promise<void>` so the screen can wait for the durable local write before restoring hearts.

- [ ] **Step 3: Add the no-charge attempt restoration event**

  Extend `SessionAttemptsEvent` and `reduceSessionAttempts`:

  ```ts
  | Readonly<{ type: 'restore_after_premium_forfeit' }>;

  if (event.type === 'restore_after_premium_forfeit') {
    if (state.phase !== 'awaiting_recovery' || state.remainingAttempts !== 0) return transition(state);
    return transition(freezeState({
      ...state,
      remainingAttempts: SESSION_ATTEMPTS_MAX,
      phase: 'active',
      recoveryOrdinal: state.recoveryOrdinal + 1,
    }), 'attempts_restored');
  }
  ```

- [ ] **Step 4: Expose the transition from `useSessionAttempts`**

  Add a synchronous action using `reduceSessionAttempts`, `adoptState`, and `persist`:

  ```ts
  const restoreAfterPremiumForfeit = useCallback((): SessionAttemptsEffect => {
    const transition = reduceSessionAttempts(stateRef.current, { type: 'restore_after_premium_forfeit' });
    if (transition.state !== stateRef.current) {
      adoptState(transition.state);
      persist(transition.state);
    }
    return transition.effect;
  }, [adoptState, persist]);
  ```

  Return it from the frozen hook result; do not call `commitSessionAttemptRecovery` or resource-refresh code.

- [ ] **Step 5: Run focused shared-state tests**

  Run:

  ```bash
  bash .claude/semaphore/slot.sh acquire "focused Jest: premium rune reset"
  npx jest tests/session_attempts_domain.test.ts tests/use_practice_runes.test.ts tests/use_session_attempts.test.tsx --runInBand
  bash .claude/semaphore/slot.sh release
  ```

  Expected: PASS.

- [ ] **Step 6: Commit shared behavior**

  ```bash
  git add app/practice_rune_earnings.ts hooks/usePracticeRunes.ts app/session_attempts/session_attempts_domain.ts hooks/useSessionAttempts.ts tests/session_attempts_domain.test.ts tests/use_practice_runes.test.ts tests/use_session_attempts.test.tsx
  git commit -m "feat: reset unclaimed runes for premium attempt recovery"
  ```

### Task 3: Animate a session-rune decrease

**Files:**
- Modify: `components/PracticeRuneCounter.tsx`
- Test: `tests/practice_rune_counter.test.tsx` (create if absent)

- [ ] **Step 1: Write a failing counter test**

  Render with `runes={9}`, rerender with `runes={0}`, and assert that the accessibility label updates to the zero-runes label without changing the supplied test ID.

- [ ] **Step 2: Implement bidirectional number interpolation**

  Replace the raw number `Text` with the project’s `AnimatedCountUpText` behavior (or move the equivalent shared-value logic into this component) so every value change interpolates from the previously rendered value to the new value. Keep the positive-only bump and reward sound; a decrease must not play the reward-completion sound. Reduced motion sets the number immediately.

- [ ] **Step 3: Run the counter test**

  Run:

  ```bash
  bash .claude/semaphore/slot.sh acquire "focused Jest: premium rune reset"
  npx jest tests/practice_rune_counter.test.tsx --runInBand
  bash .claude/semaphore/slot.sh release
  ```

  Expected: PASS.

### Task 4: Gate and wire Premium recovery on both approved screens

**Files:**
- Modify: `app/lesson_words.tsx`
- Modify: `app/lesson_irregular_verbs.tsx`
- Modify: `tests/lesson_words_attempts_integration.test.tsx`
- Modify: `tests/irregular_verbs_attempts_integration.test.tsx`

- [ ] **Step 1: Add failing source-integration assertions**

  In each screen test, assert the source imports `usePremium`, reads both `hasPremiumAccess` and `accessResolved`, calls `forfeitPendingRunes`, then calls `restoreAfterPremiumForfeit`, and keeps the existing comment that the current card/form is retained.

- [ ] **Step 2: Add the verified entitlement boundary in each screen**

  Import `usePremium` from `../components/PremiumContext` and read:

  ```ts
  const { hasPremiumAccess, accessResolved } = usePremium();
  const canUsePremiumAttemptReset = accessResolved && hasPremiumAccess;
  ```

  Add a `retryCurrent*AfterPremiumForfeit` helper beside the existing
  paid-recovery helper. It must clear the visual answer state, invoke
  `attempts.restoreAfterPremiumForfeit()`, and unlock the existing question or
  verb form without changing its queue position. At the existing
  `attemptEffect === 'attempts_exhausted'` branch, replace the unconditional
  modal timer with this branch:

  ```ts
  if (canUsePremiumAttemptReset) {
    attemptsModalTimerRef.current = setTimeout(() => {
      void practiceRunes.forfeitPendingRunes().then(() => {
        retryCurrentVocabularyCardAfterPremiumForfeit();
      }).catch(() => {
        setShowAttemptsModal(true);
      });
    }, SESSION_ATTEMPTS_MOTION.exhaustedModalDelayMs);
    return; // Keep the current vocabulary card / verb form for Premium reset.
  }
  ```

  The verbs callback follows the same pattern with
  `retryCurrentVerbFormAfterPremiumForfeit`, resetting button/letter-bank state
  without advancing `step` or `pos`. Retain the existing modal path unchanged
  for unresolved or non-Premium access.

- [ ] **Step 3: Run focused integration tests**

  Run:

  ```bash
  bash .claude/semaphore/slot.sh acquire "focused Jest: premium rune reset"
  npx jest tests/lesson_words_attempts_integration.test.tsx tests/irregular_verbs_attempts_integration.test.tsx tests/session_attempts_screen_wiring_gate.ts --runInBand
  bash .claude/semaphore/slot.sh release
  ```

  Expected: PASS.

- [ ] **Step 4: Run the full narrow feature gate**

  Run:

  ```bash
  bash .claude/semaphore/slot.sh acquire "focused Jest: premium rune reset"
  npx jest tests/session_attempts_domain.test.ts tests/use_practice_runes.test.ts tests/use_session_attempts.test.tsx tests/practice_rune_counter.test.tsx tests/lesson_words_attempts_integration.test.tsx tests/irregular_verbs_attempts_integration.test.tsx tests/session_attempts_screen_wiring_gate.ts --runInBand
  bash .claude/semaphore/slot.sh release
  ```

  Expected: PASS.

- [ ] **Step 5: Commit screen integration**

  ```bash
  git add components/PracticeRuneCounter.tsx app/lesson_words.tsx app/lesson_irregular_verbs.tsx tests/practice_rune_counter.test.tsx tests/lesson_words_attempts_integration.test.tsx tests/irregular_verbs_attempts_integration.test.tsx
  git commit -m "feat: restore premium lesson attempts after rune reset"
  ```

## Plan self-review

- Spec coverage: Tasks 1–2 protect the temporary-rune and heart state boundaries; Task 3 supplies the required visible decrease; Task 4 limits the behavior to Premium vocabulary and irregular verbs while preserving the same question and non-Premium path.
- Placeholder scan: no deferred implementation items or unspecified validation remain.
- Type consistency: `forfeitPendingRunes`, `restore_after_premium_forfeit`, and `restoreAfterPremiumForfeit` are introduced in that order and used consistently by the screen orchestration.
