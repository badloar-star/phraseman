# Task packet: read-through storage snapshot for cold-start reads (§122)

Governance-ID: TG-2F0B03E3C893
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator §122 (2026-10-04)
Related epic/enabler: PM-215 / PM-220, E21 performance

## Outcome

Repeated cold-start reads of the same AsyncStorage keys (premium_*, intro_full_access_*, coin_rank_v1, streak_count, user_frame, stable_auth_link_cache_v1) are answered from memory after the first read. Success: store-release calls median falls from about 545 to the gate ceiling 520 first, then below 450; no stale value is ever served after a write.

## Scope

In scope: new app/storage_snapshot.ts; a write-notification hook (subscribeStorageMutations) in app/async_storage_null_bind_guard.ts; tests; step 2 wires consumers one file at a time, only files without foreign uncommitted edits (intro_full_access.ts, premium_vip_storage.ts, coin_rank_state_v1.ts, premium_revenuecat_state.ts); INBOX note for AccountV2 about the API.
Out of scope: money journals (energy ledger, level_spin_star, rune journal, client shards) — never in the snapshot; cloud_sync.ts, home.tsx, _layout.tsx while they carry foreign edits.

## Architecture

Snapshot holds key to value in memory. Every write through AsyncStorage (JS API and native single-key mutators) is announced by the guard with its keys on start and finish; the snapshot drops the key on both, never caches while a write to the key is in flight, and a read started before a write cannot store its result afterwards (per-key epoch). Own writes go memory first, then storage, with rollback on error. Deny patterns send money keys straight to storage.

## Security and privacy

No new data collected or sent; memory only, same data the app already reads. Account-scoped keys carry the owner id; clear() drops everything.

## Technical debt

- Pay now: dozens of identical sequential reads per start.
- Contain: deny list for money journals plus tests; consumers are connected one by one, each with a measurement.

## Verification

Unit tests for hit, miss, single-flight, invalidation by foreign write, in-flight write, rollback on error, deny list, clear. Type check. After each step: 8 cold starts with [COLD-START-IO] and [SNAPSHOT-RT] summary.

## Rollback

Revert the commit; consumers fall back to direct AsyncStorage reads with no data format change.

Governance-ID: TG-9DFC3A513661
(2026-10-04: журнал ошибок и серия дней читаются через снапшот; rollback = git revert.)
