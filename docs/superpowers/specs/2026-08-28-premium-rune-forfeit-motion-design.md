# Premium rune-forfeit motion design

## Goal

Make the loss of the unclaimed session-rune buffer after a Premium learner's
third mistake unmistakable without showing a modal or affecting the global
rune wallet.

## Approved motion

When the session-rune value decreases to zero because of the Premium
forfeiture flow, the counter animates for 900 ms from its prior value to zero.
At the same time, its rune asset lifts slightly and scales to 1.45x before
settling back at normal size. The existing positive-reward bump and sound stay
exclusive to increases. The counter’s layout dimensions do not change.

For Reduce Motion, the value switches immediately to zero and the asset remains
still. The accessible label continues to state the actual current earned-rune
amount.

## Scope and verification

Change only `components/PracticeRuneCounter.tsx` and add a focused component
contract test. Every session reusing this component receives the visual
treatment; no state, wallet, entitlement, or modal behavior changes.
