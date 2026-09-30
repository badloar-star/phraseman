# PM-202 server event preflight — 2026-09-27

## Scope

Read-only inventory only. No deploy, production migration, queue drain, or remote deletion was performed.

## Evidence collected

- `tests/server_remote_event_allowlist.probe.ts` — PASS: retired league/season/XP exports are absent from `functions/src/index.ts`; notification, subscription-expiry, and progress-sync exports remain.
- `tests/server_decision_atlas_contract.mjs` — PASS: server decision registry remains explicit and reviewable.
- `functions/src/index.ts` — reviewed scheduled/export surface. Current retained jobs include app-message cleanup, re-engagement push, premium-expiry reminder, support operations, user-notification cleanup, and Spire/Arena content jobs. These are not retired league/season reward jobs.
- `functions/src/index.ts` — legacy league migration controls are not exported; the comment explicitly marks them retired.
- A source scan of non-test `functions/src` found retired XP/league field names only in `progress_events.ts` compatibility quarantine; no active XP grant/export was found. League collection references in `account_delete.ts` and `auth_identity.ts` are cleanup-only paths for account deletion/identity repair, not feature entrypoints.
- Client listener inventory: `PremiumContext` listens only to `access_projection/current` (subscription entitlement), `app_messages` listens to app-message/notification feeds, and `remote_account_deletion_monitor` listens to the deletion marker for cross-device account cleanup. `friends_account_store` remains a social-data listener and is explicitly outside this retirement pass; it requires a separate product decision before changing its UX contract.
- League-bonus scan: no `league_*` reward/boost callable or scheduled export remains; remaining league strings are account-delete/identity cleanup, notification preference compatibility, or historical compensation/receipt quarantine. `global_broadcast_claim` canonicalizes retired `club_boost_free`/`wager_discount_25` receipts to no-op.
- Learning V2 course-unlock authorizer/resolver callables are no longer exported; course access is decided locally by the client policy, while progress/completion sync remains an allowed server boundary.
- Legacy `profileCardUpgrade` callable is no longer exported and the client no longer calls it; profile-card purchase/projection is local-only.

## Not yet proven (remains open)

- Full trigger/queue/token/admin-action inventory across every Functions module.
- Historical deployed functions and production queues; no production access was used.
- Whether any old remote tokens still exist in stored user documents; no migration was run.
- Historical `referralSpin`, `referralClaimSpin`, and `referralDevGrantSpin` implementations remain on disk for receipt compatibility, but they are no longer exported from `functions/src/index.ts`; `app/roulette_spin_client.ts` now returns a local retired/disabled result and makes no callable request. A full production deployment was intentionally not performed.

## Decision boundary

Keep notification delivery, subscription expiry, progress synchronization, and content/video update jobs. Do not remove Arena V2 or Spire jobs: they are separate live products, not the retired league/season-pass system. PM-202 remains open until the remaining trigger/queue/token/admin audit has evidence.
