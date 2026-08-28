# Premium: reset of unclaimed session runes after three mistakes

## Goal

Make the three-heart limit meaningful for Premium learners in the vocabulary
and irregular-verbs practice sessions without taking any currency that has
already reached the learner's wallet.

## Approved learner flow

1. A learner answers incorrectly three times during one active practice
   session. The third miss is processed normally and the currently displayed
   question stays on screen.
2. For a learner with Premium access, the unclaimed session-rune counter
   animates down to zero. These are only the runes in the local
   `usePracticeRunes` buffer; the durable rune balance is never read, debited,
   or changed.
3. The three hearts animate back to full and the active session continues on
   that same question. The learner may answer it again immediately.
4. The buffer can accumulate again. On the normal completion screen, only its
   post-reset remainder is settled to the durable rune ledger.
5. For a non-Premium learner, preserve the current exhausted-hearts recovery
   modal and all existing recovery options unchanged.

## Boundaries and anti-farming rule

The reset clears `pendingRunes` but retains the list of already rewarded
question IDs. Thus, an answer that had already paid out before a reset cannot
be paid a second time in that pass. New correct answers after the reset can
still earn runes. No settled rune, previous session rune, or global wallet
value can be removed.

The learner-visible change applies only to `app/lesson_words.tsx` and
`app/lesson_irregular_verbs.tsx`. Its shared hook/domain support must remain
generic, and it must not alter other practice activities or the generic
non-Premium recovery flow.

## Technical design

- Add a pure `forfeitPendingPracticeRunes` transition in
  `app/practice_rune_earnings.ts`. It returns the same earnings record with
  `pendingRunes: 0`, keeping its activity, session key, award rate, and
  credited IDs intact.
- Expose an idempotent `forfeitPendingRunes()` action from `usePracticeRunes`.
  It updates the in-memory counter and persists the changed local buffer. It
  performs no network call and is a no-op in the DEV fake-runes mode except for
  setting the displayed counter to zero.
- Add a pure no-charge restore event to the session-attempts domain. It may
  transition only from `awaiting_recovery` at zero hearts back to `active`
  with all three hearts and must be idempotent per exhaustion. It does not
  create a rune debit or use a recovery gift; entitlement is deliberately not
  a domain concern.
- `useSessionAttempts` exposes that domain action. The two named session
  screens are the entitlement boundary: they invoke it only after the current
  session buffer has been forfeited and only when verified Premium access is
  available.
- Reuse `SessionAttemptsHud` for the existing staggered heart-refill animation.
  The rune counter receives an explicit downward count animation using the
  screen's existing rune-counter presentation, respecting reduced-motion
  settings. No blocking modal is shown to Premium users.

## Failure handling

If the local persistence of the forfeited buffer fails, the in-memory value
remains zero for the active session; remount recovery must fail closed rather
than restore forfeited pending runes. A Premium-access lookup that is not
resolved must follow the existing non-Premium recovery flow, never grant the
free reset optimistically.

## Verification

- Unit tests for the pure rune-forfeit transition: zeroes pending runes,
  retains credited IDs, and cannot alter settled/global balance.
- Reducer tests for Premium reset eligibility, state restoration, and
  idempotency.
- Hook tests for persistence and the DEV fake-runes behavior.
- Focused UI/wiring tests for vocabulary and irregular verbs: Premium follows
  the reset path and keeps the same question; non-Premium still opens the
  existing recovery modal.
- Run the narrow affected test files and report their status before completion.
