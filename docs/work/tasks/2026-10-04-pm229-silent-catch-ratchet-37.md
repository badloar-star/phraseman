# Task packet: PM-229 silent-catch ratchet 41 to 37

Governance-ID: TG-C0268EF1B3B4
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: PM-229 no silent error swallowing

## Outcome

Four silent handlers now write their reason (mistake answer journal queue x2, speaking refund chain, stats cache mistakes count). The ratchet baseline is fixed at 37 and two stale entries (auth_provider 26 to 25, statsCache removed) are corrected.

## Scope

In scope: those four call sites and the probe baseline.
Out of scope: auth_provider, account_switch_quarantine and app_snapshot_bootstrap (other sessions have uncommitted edits there), intentional queue-chain breaks in debug-logger, keyed_exclusive_transaction and account_detach_latch.

## Architecture

None; handlers keep their fallback value and only add a log line.

## Security and privacy

Logged text is the error message only; no user data.

## Technical debt

- Remaining 37: 25 in auth_provider (largest), 5 snapshot bootstrap, 3 account switch quarantine, 4 intentional chain breaks.

## Verification

PM-229 probe passes at 37; touched suites green; type check clean on touched files.

## Rollback

Revert the commit.
