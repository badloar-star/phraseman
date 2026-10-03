# Task packet: Account V2 tails — account-deletion tests after f5a01076d, review debts 8N S1/S3

Governance-ID: TG-622DD6E4BD75
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-03)
Related epic/enabler: Account Authority 2.0 (§AV2-18), PM account deletion

## Outcome

1. post_delete_fresh_identity_integration (3 of 15 red) and account_delete_flow_contract (1 of 22 red, deploy:safe) are green again. For each red check: a legitimate shift of expectation (code changed on purpose in f5a01076d — repeated emitLocalWipeReady) → update the test with `// зачем:`; a real regression → fix the code, not the test.
2. Review debts 8N: S1 — erase the fingerprint `flashcard_pages_write_fingerprint_v1` when phone data is wiped; S3 — card order after a merge. Only in files that are clean (no other session's edits).

## Scope

In scope: tests/post_delete_fresh_identity_integration.test.ts, tests/account_delete_flow_contract.test.ts (+ package.json deploy:safe only if the check is about the script list); the wipe path and flashcard-pages merge code, if clean.
Out of scope: app/auth_provider.ts, app/cloud_sync.ts, modules/account-authority*/account-session-v2 (zone of Account V2), server functions.

## Architecture

No architecture change. Wipe: one more storage key joins the existing "erase phone data" list (single source of truth in the wipe registry). Merge order: deterministic ordering rule in the existing merge function, no format change.

## Security and privacy

Wiping a fingerprint on "delete data" reduces residual local data (privacy-positive). No new data collected; nothing leaves the device.

## Technical debt

- Pay now: stale expectations in two suites, S1.
- Contain/Accept: S3 if its file is dirty — report the owner and exit condition.

## Verification

The two suites green or the regression fixed; wipe registry test proves the new key is erased; typecheck clean; tests mentioning touched files no redder than HEAD.

## Rollback

Revert the commits — test expectations and one key in the wipe list; no entitlement or data-format impact.
