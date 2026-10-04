# Task packet: use_practice_runes test updated to D147 (Super Sunday retired)

Governance-ID: TG-D5D7D584981E
Status: In progress
Owner: Claude session «App Check» (82577f25), by coordinator (2026-10-04)
Related epic/enabler: D147 (owner 01.10): Super Sunday doubling removed for new earnings

## Outcome

tests/use_practice_runes.test.ts expects what the product now does: the practice counter never doubles on Sunday; the old doubling contract (6 on Sunday) is replaced by the D147 contract. No product code changes: the check shows no regression.

## Scope

In scope: two tests in tests/use_practice_runes.test.ts.
Out of scope: modules/economy/super_sunday_runes.ts (legacy receipts keep their old amounts by design) and the settlement code.

## Architecture

No architecture change. The hook no longer references Super Sunday; settlement still doubles only receipts earned before SUPER_SUNDAY_RETIRED_AT_MS so old receipts replay to the same sum.

## Security and privacy

None: test-only change.

## Technical debt

- Pay now: a red test that described a retired rule.

## Verification

The test file runs green; the legacy settlement tests stay as they are.

## Rollback

Revert the commit.
