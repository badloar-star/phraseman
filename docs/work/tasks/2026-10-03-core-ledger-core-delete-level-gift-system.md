# Task packet: ledger core — extract GiftDef, delete level_gift_system (client), dead prepare*Purchase

Governance-ID: TG-CE545553B608
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator §99 (2026-10-03)
Related epic/enabler: PhraseMan 2.0 removal of gifts/spins (D09), PM-229 follow-up leftovers of removed features

## Outcome

The retired client level-gift catalog (app/level_gift_system.ts, 1689 lines, plus its only helper app/theme_gift_pool.ts) is gone. The one thing still alive from it — the GiftDef shape that app/level_spin_local_contract.ts uses to read historical signed spin receipts — lives in a small types-only file. Replay of old spin records is covered by tests. Dead prepare*Purchase helpers in app/level_spin_star_grants.ts (no app caller, only their own tests) are removed. Server untouched.

## Scope

In scope: new app/level_gift_types.ts; app/level_spin_local_contract.ts import; deletion of app/level_gift_system.ts and app/theme_gift_pool.ts; source-reading tests/probes that pointed at the deleted file; dead prepareDialogExtraRepliesRunePurchase, preparePaidLevelSpinRunePurchase, prepareCustomizationRunePurchase and their now-meaningless tests, only after a caller scan proves them dead.
Out of scope: functions/, Account V2 zone (auth_provider.ts, cloud_sync.ts, account_authority*), constants/avatars.ts, shop*.tsx removal (only a reachability check, reported).

## Architecture

Types move, behaviour does not. level_spin_local_contract.ts already builds a neutral local presentation for historical receipts (giftById) and never imported the catalog at runtime, so the dependency was type-only.

## Security and privacy

No data collection change. No ledger write path changes: prepare*Purchase removal deletes client code that has no caller; server-side authority for coin spends is not touched.

## Technical debt

- Pay now: ~1700 lines of dead client catalog, a dead helper, tests that grep a dead file.
- Contain: mass-deletion guard (>2000 lines per commit) — delete in batches.

## Verification

Import graph scan shows no remaining importer of the deleted modules; type check clean for touched files; replay tests (legacy spin receipts readable) green; targeted unit tests for edited tests; git status --short | grep '^D ' after each commit.

## Rollback

git revert the commits; nothing is deployed.
