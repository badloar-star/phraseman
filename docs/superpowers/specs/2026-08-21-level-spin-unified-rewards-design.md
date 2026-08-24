# Level Spin Unified Rewards Design

Date: 2026-08-21
Status: implemented locally; focused verification passed; not deployed

## Objective

Replace the current equal-choice local Spin catalog with a versioned weighted
catalog that grants useful XP, pearls, one unified star currency, existing
non-cosmetic abilities, and exceptionally rare temporary Plus access.

The catalog must be phone-authoritative, durable before reveal, idempotent on
retry, and compatible with already-issued historical Spin receipts.

## Owner Decisions

- Stars are one currency. Learning V2, tournaments, the season track, and Spin
  must not expose or maintain competing user-visible star balances.
- Avatar and aura rewards are removed from all new Spin rolls.
- Existing avatar/aura definitions and already-issued receipts remain
  claimable. This change does not delete avatar or aura functionality elsewhere.
- The catalog uses relative integer weights. Weights are not percentages and
  do not need to add up to 100.
- Every ordinary reward has the same weight. Rare rewards have lower weights;
  Plus rewards are exceptionally rare.
- XP rewards below 250 are excluded.
- Pearl rewards below 5 are excluded.
- Star rewards below 10 are excluded.

## Canonical Weighted Catalog

### Ordinary rewards — weight 10,000 each

- XP: 250, 500, 1,000, 3,000, 5,000.
- Pearls: 5, 10, 20.
- Unified stars: 10, 20, 50.
- Full energy.
- Two bonus energy slots until midnight.
- One hint for the current learning day.
- Three hints for the current learning day.
- One day of chain protection.
- Double the next 150 XP.
- Double the next 300 XP.
- Double XP for 24 hours.

### Rare rewards — weight 1,000 each

- XP: 10,000, 25,000.
- Pearls: 50, 100.
- Unified stars: 100, 250.
- Three bonus energy slots until midnight.
- Double the next 600 XP.
- Double XP for 48 hours.

### Ultra-rare rewards — weight 100 each

- 50,000 XP.
- Pearls: 250, 500.
- Unified stars: 500, 1,000.

### Exceptional Plus rewards

- Three days of Plus — weight 10.
- Seven days of Plus — weight 1.

The picker sums the current catalog's positive weights, maps a deterministic
Spin seed into that total, and selects the interval containing the result. It
must not convert weights to rounded percentages. Catalog order and version are
part of the deterministic receipt contract.

## Canonical Star Currency

The canonical star balance is the existing shared `users/{stableUid}.stars`
state with immutable receipts in `users/{stableUid}/star_operations`, owned by
`functions/src/stars_ledger.ts`. Spin must not create a separate AsyncStorage
balance, a Learning-only replacement wallet, or `spin_stars`.

Spin is a device-owned source: the selected gift is committed before reveal
and is never rerolled by the server. A star gift therefore creates a durable,
account-scoped outbox entry identified by the immutable Spin `requestId`.
Synchronization accepts only a closed `giftId -> amount` catalog and commits
the server operation `level_spin:<requestId>` exactly once.

Spin star gifts use the ledger class `grant`: they increase the one spendable
star balance and `grantedTotal`, but do not increase `earnedTotal`,
`weekEarned`, or `seasonEarned`. A random gift must not masquerade as Arena or
learning performance and must not buy competitive/season progression.

## Reward Application

The result is selected and persisted to the device-owned Spin receipt before
the reveal animation. Closing the animation, restarting the app, losing the
network, or retrying a claim must recover the same gift.

Each reward uses the Spin request and lane as its stable semantic identity:

- XP uses an idempotent XP event whose payload identifies the Spin receipt and
  exact amount.
- Pearls use a client-authoritative composite credit operation containing the
  exact pearl grant and the claim marker.
- Stars use a durable account-scoped outbox and the canonical star operation
  `level_spin:<requestId>` with the exact closed-catalog amount.
- Plus uses a local durable entitlement operation that extends the later of
  now or the existing temporary Plus expiry by exactly three or seven days.
- Energy, hints, shields, banks, and timed multipliers use their existing
  occurrence-scoped exactly-once effect receipts.

The claim marker and its economic or entitlement effect must commit as one
durable operation whenever storage supports a composite write. A prepared
intent is recovered with the same operation identity after a partial failure.
The server receives the immutable operation in the background and must not
replace, lower, revoke, or recalculate the local result.

## Plus Semantics

Spin Plus is a granted temporary Plus entitlement, not a RevenueCat purchase
and not permanent VIP. It has explicit `level_spin` provenance. Multiple Spin
grants stack from `max(now, existingTemporaryExpiry)`. Replaying one receipt
does not extend the expiry twice.

Paid access remains authoritative for its own purchase/refund lifecycle. A
temporary Spin grant supplements paid access but never rewrites RevenueCat
purchase history or changes subscription renewal state.

## Backward Compatibility

- Historical avatar and aura receipts remain resolvable and claimable.
- Historical gift identifiers are not deleted or repurposed.
- New rolls cannot select avatar or aura identifiers.
- The old server-issued level-spin protocol remains readable for outstanding
  receipts. New phone-authoritative rolls use the new catalog version.
- Unknown catalog versions fail closed before reveal; they do not silently
  substitute a different reward.

## Presentation

- The Spin reveal and Gifts inventory display the exact localized amount and
  reward kind from the persisted receipt.
- The product UI does not show percentages or imply that weights total 100.
- If rarity is shown, it uses only the labels ordinary, rare, ultra-rare, and
  exceptional.
- Plus cards state that access is temporary and name the exact duration.
- Pearl, XP, and Plus totals refresh from their committed local state. The star
  counter refreshes from the unified server acknowledgement; synchronization
  never blocks reveal or destroys the durable gift intent.
- Existing Gifts inventory layout changes in the dirty worktree are preserved.

## Failure Handling

- No valid Spin credit: do not roll or reveal a reward.
- Unsupported or zero/negative catalog weight: fail the catalog guard before
  shipping; runtime rejects the catalog version.
- Account generation changes during claim: stop before applying the effect and
  leave the prepared receipt recoverable for the correct account.
- Local storage failure before commit: do not reveal or mark claimed.
- Failure after commit but before response: retry returns the committed result
  without a second XP, pearl, star, Plus, or ability effect.
- Network/server failure: retain the local result and retry synchronization in
  the background without a user-visible loss.

## Verification Contract

The implementation must be test-first and add focused RED/GREEN coverage for:

- the exact catalog membership, weights, version, and absence of new avatar or
  aura rolls;
- every ordinary reward having weight 10,000;
- every listed rare reward having weight 1,000;
- every listed ultra-rare reward having weight 100;
- three-day and seven-day Plus weights being 10 and 1;
- deterministic weighted selection and fixed-seed boundary cases;
- durable recovery returning the same selected gift;
- exactly-once XP for all configured amounts, including 50,000;
- exactly-once pearl credits with no standalone balance writer;
- exactly-once unified-star credits through the durable outbox;
- Spin grants excluded from earned/week/season projections without a second balance;
- stacked temporary Plus expiry and replay safety;
- historical avatar/aura receipts remaining claimable while new rolls exclude
  them;
- immediate local counter events for XP, pearls, stars, and Plus;
- source guards rejecting direct `users/{uid}.shards` writes, standalone
  debits, duplicate star balances, or server-authoritative ordinary rewards.

Run only focused Spin, level-gift, economy, star-wallet, season, Plus, Jarvis
contract, and Firestore Rules tests. Do not run a broad repository test suite
for this bounded change.

## Data Contracts and Documentation

Any new operation reason, origin, grant kind, collection, field, or wallet
metadata must update in the same change:

- the canonical TypeScript contracts and validators;
- Firestore Rules when a cloud path or accepted document shape changes;
- the Jarvis data-contract guard and relevant fetcher when Jarvis reads it;
- the Economy Constitution guards;
- Learning V2 normative star/access documentation and `docs/v2/HANDOVER.md`.

No production Firestore write, deploy, release, or migration execution is part
of implementation verification without a separate explicit owner instruction.

## Non-Goals

- No new avatars or auras for Spin.
- No deletion of avatar/aura ownership, customization, shop, or historical
  reward support.
- No paid Spin purchase flow.
- No server-first claim dependency.
- No Remote Config control of ordinary local reward outcomes.
- No percentage-based catalog configuration.
- No image generation or bundled reward-art expansion in this change.
