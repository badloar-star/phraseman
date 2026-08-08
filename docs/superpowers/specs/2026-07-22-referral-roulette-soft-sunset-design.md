# Referral Roulette Soft Sunset Design

**Date:** 2026-07-22
**Status:** approved for implementation
**Scope:** referral admission, first-lesson qualification, spin-credit accounting, roulette consumption, client visibility, and Admin V2 controls

## Outcome

The referral roulette can be retired without breaking promises already made to users. A soft switch stops new referral codes, new attributions, invite sharing, and referral marketing, while preserving a bounded drain path for invitations and credits that were already valid. A separate emergency stop blocks every qualification, credit award, claim, and spin immediately.

## Policy and time model

`remote_config/app.numbers` contains two independent controls:

- `referral_roulette_enabled`: the soft admission and marketing switch. A missing value remains `true` for compatibility.
- `referral_roulette_emergency_stop`: the emergency operational stop. A missing value remains `false`.

When Admin V2 changes the soft switch from ON to OFF, the same Firestore transaction writes `referral_roulette_soft_off_at_ms` from the server clock. Replaying the same idempotency key returns the original result and does not move the cutoff. Re-enabling clears the active cutoff. A later ON-to-OFF transition receives a new server cutoff.

A pending attribution created before or exactly at the cutoff may qualify only when the first real server-authoritative lesson pass occurs no later than `createdAt + 7 * 24h`. The exact deadline is inclusive. A pass one millisecond later changes the attribution to `expired` and cannot create a credit. While the soft switch is ON, current qualification behavior is preserved. Missing or unreadable policy state fails closed for writes.

The emergency stop is checked both before and inside each mutating transaction. It blocks qualification, credit award, claim, and spin for all credit sources, including idempotent spin replays. Read-only drain state may still be returned so that operators can inspect remaining obligations, but the client hides referral surfaces while the emergency stop is active.

## Durable credit ledger

The source of truth is `users/{stableId}/referral_spin_credit_ledger/{creditId}`. Each document contains:

- `ownerStableId`
- `source`: `referral`, `legacy_aggregate`, or `dev_grant`
- `attributionId` for referral-earned credits
- `earnedAt` and `earnedAtMs`
- `expiresAt` and `expiresAtMs`, exactly 30 days after `earnedAt`
- `status`: `available`, `consumed`, or `expired`
- `consumedAt`, `consumedAtMs`, and `spinRequestId` after consumption
- `expiredAt` and `expiredAtMs` after expiry

Referral credit IDs are deterministic from the attribution ID. A replayed claim therefore cannot create a second credit. Dev grants create their own ledger documents and remain usable only while the soft switch is ON; they never grant production drain rights after soft OFF.

`users/{stableId}.progress.referral_spin_credits` remains a compatibility/cache count. Every award, expiry reconciliation, and consumption updates it in the same transaction as the ledger documents. The server never uses the aggregate alone to choose a credit after ledger migration.

The migration anchor is the policy constant `2026-07-22T00:00:00.000Z`. On the first ledger-aware server transaction, a pre-ledger aggregate balance is converted into deterministic `legacy_aggregate` records whose `earnedAt` is the anchor and whose `expiresAt` is exactly 30 days later. The per-user first-touch time never changes that expiry. A migration marker prevents duplication. If a balance is too large for one safe Firestore transaction, the callable fails explicitly instead of truncating or silently losing credits.

## Claim and spin transactions

`referralClaimSpin` re-reads policy, user, candidate attributions, and deterministic ledger records inside one transaction. Under soft ON it awards eligible qualified attributions. Under soft OFF it awards only attributions that were already qualified before the cutoff or that qualified during their valid seven-day grandfather window. Every awarded record receives `earnedAt` from the server and a 30-day expiry.

`referralSpin` replays an existing spin receipt idempotently when the emergency stop is not active. For a new request it reconciles legacy records and expired records, then consumes the oldest valid ledger credit first. Soft OFF accepts only `referral` and `legacy_aggregate` drain credits; `dev_grant` records do not open or extend the production drain path. The spin receipt and credit consumption are committed with the VIP award and aggregate cache update in one transaction.

Expired credit documents are retained for audit. Expired attributions are also retained with `status='expired'`, their deadline, and the server expiry timestamp.

## Client visibility and localized copy

The read model returned by `referralListMyInvites` includes server-derived policy state, active pending count, claimable-qualified count, actual available ledger-credit count, the latest pending deadline, and the earliest credit expiry. Claimable-qualified obligations keep the drain entry visible but never inflate the roulette spin counter before the claim transaction creates a credit. It performs quiet background refresh and preserves the existing account-scoped bounded cache.

When soft ON, existing referral marketing and entry points remain. When soft OFF:

- new invite, code-entry, about, and promotional controls are hidden;
- the referral entry remains visible only when the server read model reports at least one active grandfathered pending attribution or one valid drain credit;
- the referral screen shows only the drain obligations, pending deadline, credit expiry, and spin action;
- once both counts are zero, all referral traces disappear from Friends, Settings, overlays, and referral routes;
- the emergency stop hides all referral traces even when obligations remain.

Deadline and expiry copy is localized in all supported languages: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, and `pl`. Display formatting uses timestamps supplied by the server. Eligibility never depends on the device clock.

The first frame uses the existing account-scoped in-memory and persisted snapshot. Refreshes are TTL-bound and quiet; no new polling loop, interval, full-screen spinner, or unbounded cache is introduced.

## Admin V2

The Application page shows two distinct controls:

1. **Новые приглашения и промо** — the reversible soft switch. Its explanation states that new invitations stop while valid pending invitations and credits continue until their deadlines.
2. **Аварийная остановка рулетки** — the true kill switch, visually separated as dangerous. Its explanation states that qualification, award, claim, and spin stop immediately for everyone.

Both controls require `application.config.write`, a reason, explicit confirmation, request ID, idempotency key, and an audit record containing before/after state. The health response reports both flags, the active soft cutoff, the final possible pending deadline, the legacy grace expiry, aggregate drain counts, and any source-read error. Controls have visible loading/error/disabled states, text labels, tooltips, keyboard focus, and no decorative nesting.

## Analytics and audit events

Structured server events use these stable statuses:

- `referral_attribution_created`
- `referral_attribution_expired`
- `referral_attribution_qualified`
- `referral_credit_earned`
- `referral_credit_consumed`
- `referral_credit_expired`

Each event includes the account or attribution identifier required for server debugging, the server timestamp, the source, and the relevant deadline or expiry. No client clock is accepted as an input.

## Compatibility and security

- Existing referral documents and old spin receipts remain readable.
- Existing aggregate balances are migrated without a per-user sliding grace period.
- Existing VIP stacking, pity, jackpot caps, auth-to-stable-ID checks, App Check behavior, daily/monthly claim caps, and account-scoping remain intact.
- Firestore clients cannot create or mutate ledger records; all ledger writes use Admin SDK callables.
- No deployment, production flag change, push, release, or rollback is part of this implementation session.

## Verification

Focused tests must prove the inclusive seven-day boundary, one-millisecond-late rejection, grandfather qualification during soft OFF, emergency-stop denial, deterministic legacy expiry, oldest-valid-first consumption, retention of expired records, claim and spin replay safety, dev-credit exclusion during drain, eight-locale copy, and absence of marketing traces when no drain state exists. Function and root TypeScript builds and narrow Admin V2 syntax/contracts are required. Emulator concurrency is run only if the repository has a bounded referral emulator harness; otherwise transaction concurrency remains explicitly unverified.

## Self-review

- All approved requirements map to a concrete policy, record, UI state, admin control, or verification case.
- Missing flags have explicit compatibility defaults; unreadable critical config has fail-closed behavior.
- The soft cutoff, seven-day boundary, credit expiry, and legacy anchor are unambiguous and use server timestamps.
- Aggregate credits cannot override the ledger after migration, and no expired record is deleted.
- The design contains no deferred decisions or implementation placeholders.
