# Paid Level Spin For 300 Runes

Owner decisions: 2026-08-28

## Goal

Add an immediate paid action to the existing level-spin screen without changing or removing the free-spin flow. A paid tap costs exactly 300 runes and starts the same reward reel. The rune debit and the exact selected reward must be one durable, idempotent client-authoritative operation.

Remove the two gameplay earning ceilings from practice rune settlement:

- no 160-rune aggregate daily ceiling;
- no 180-rune per-session ceiling.

Structural validation remains: identity, exact schema, integer arithmetic, fingerprints, immutable operation ids, bounded storage records, and the shared star-ledger integrity rules are not gameplay ceilings and must not be weakened.

## Approved UI

The ready-state footer contains two full-width buttons with the same 56 px geometry and press motion:

1. Top: gold paid button, dark foreground, label `КРУТИТЬ`, canonical rune asset `assets/images/level-spin-rewards/stars_10.webp`, and price `300`.
2. Bottom: existing neutral spin button, label `КРУТИТЬ`, and canonical spin-ticket asset `assets/images/spin/spin_ticket.webp`.

The paid button is shown above the free button while the reel is ready, including when the free-spin balance is zero. It is disabled when the canonical rune balance is below 300, while the account is transitioning, or while another spin/reward action is in progress. Its accessibility label states the action, price, current availability, and disabled state. No confirmation modal, explanatory modal, or new navigation is added.

During spinning, recovery, and reward/result handling, both purchase actions are disabled. Existing result-modal and `ЕЩЁ СПИН`/`ЗАКРЫТЬ` behavior stays unchanged. The free button still consumes only a free-spin credit. The paid button never consumes a free-spin credit.

## Interaction Flow

### Free spin

The current `claimLocalLevelSpin` path remains behaviorally unchanged. Its only UI change is the addition of the existing spin-ticket asset inside the CTA.

### Paid spin

1. Capture the current account-generation token and acquire the existing account-transition/storage critical section.
2. Recover any already committed pending spin. Recovery always wins over creating a second operation.
3. Read the canonical local rune projection and verify that at least 300 runes are available.
4. Generate one stable request/operation id.
5. Resolve exhausted rewards and deterministically select the exact gift before committing.
6. Build a closed paid-spin exact result containing the owner, account generation, request id, gift id, catalog version, price, balance before/after, timestamps, and fingerprint.
7. Persist, in one local commit boundary:
   - immutable rune debit operation;
   - updated rune projection;
   - exact spin receipt and pending reveal;
   - reward journal row;
   - background-sync outbox entry.
8. Publish the lower rune balance and start the existing reel animation from the committed receipt.
9. Sync the immutable operation in the background. Network success is never required to keep the local reward.

The operation id is reused for retry/recovery. Reusing it with different bytes is a corruption error. A repeated tap or response retry returns the same receipt and cannot charge twice.

## Economy Contract

The paid spin is an ordinary client-authoritative composite operation. The server may persist the exact immutable operation, but must not decide whether the balance was sufficient, recompute the reward, lower the device balance, or revoke the locally committed result.

Forbidden designs:

- debit runes and mint a temporary spin credit in separate writes;
- spend first and select/deliver a reward afterward;
- require a callable/server receipt before showing the result;
- refund by deleting or rewriting the original debit.

If reward materialization is temporarily interrupted, the committed exact receipt remains recoverable and is retried. It is not acknowledged or discarded until delivery is durable. Any future cancellation/refund would require its own immutable reversal composite; it is outside this feature.

## Practice Rune Ceiling Removal

Practice settlement continues to award the amount accumulated by the existing client lesson/session logic. The server removes:

- the `PRACTICE_RUNE_MAX_PER_SESSION` rejection;
- the `PRACTICE_RUNE_MAX_PER_DAY` check;
- reads and writes of `practice_runes_daily` used only for that ceiling;
- obsolete daily-window helpers and cap-specific tests/copy.

The shared ledger's per-record arithmetic bound remains a structural safety rule, not an earning limit. If one future practice settlement exceeds that record size, the client/server settlement contract must split the exact total into deterministic, idempotent chunks rather than reject or truncate the earned amount.

Legacy `practice_runes_daily` fields may remain in existing documents. Firestore Rules continue to prevent clients from writing that server-owned legacy field; removing the protection would unnecessarily expand write authority. Jarvis does not read the field, so no Jarvis reader or data-contract change is required.

## Failure Behavior

- Insufficient runes: no operation, receipt, reward, or animation; the paid button remains disabled.
- Storage failure before the composite commit: no visible debit and no spin.
- Crash after commit: startup/screen recovery restores the same paid receipt and reward.
- Double tap or retry: one operation id, one 300-rune debit, one gift.
- Account switch: the captured generation fails closed before any new write; no receipt or debit can cross owners.
- Background-sync failure: the outbox remains pending; local balance and reward are not rolled back.
- Reward-delivery interruption: the exact receipt stays pending and recoverable; it is never converted into an orphan debit.

## Verification

Focused tests must prove:

- approved button order, assets, contrast, disabled states, localization, and accessibility;
- the free-spin path still consumes one free credit and no runes;
- the paid path consumes 300 runes, consumes no free credit, and yields the exact committed gift;
- insufficient balance produces no write;
- double tap, retry, crash/recovery, and account switch cannot double-charge or lose the reward;
- paid spin works when the free-spin balance is zero;
- practice settlements above 180 are accepted;
- multiple practice settlements may exceed 160 in one day;
- a settlement larger than one structural ledger record is preserved exactly through deterministic chunks;
- cap-only `practice_runes_daily` reads/writes are gone while its Firestore client-write protection remains;
- economy constitution and phone-state semantic-operation guards recognize the new composite and reject standalone rune debits.

Only focused tests and the relevant contract guards are required. Heavy commands must acquire and release the shared semaphore slot.

## Non-goals

- Changing reward probabilities or the reward catalog.
- Adding a confirmation modal.
- Changing the price dynamically or through Remote Config.
- Replacing the free-spin flow.
- Removing structural validation or unrelated Arena limits.
- Deploying functions or publishing a release.
