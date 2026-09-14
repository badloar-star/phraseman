# Economy and entitlements domain contract

## Owner

Economy engineering owns ordinary progress operations; Payments owns external purchase/refund confirmation; Security reviews access and balance-boundary changes.

## Source of truth

The normative boundary is the [Economy Constitution](../../economy/ECONOMY_CONSTITUTION.md), enforced by [firestore.rules](../../../firestore.rules) and contract tests.

## Authority

Personal progress and ordinary pearl spending are client-authoritative. Real-money purchases, refunds, transfers, marketplace settlement, admin commands and competitive outcomes are isolated server-confirmed external events.

## Invariants

Every debit is atomically bound to its exact grant; standalone debit and direct `users/{uid}.shards` writes are forbidden. Balance is a projection of immutable operations, and network failure cannot revoke a locally committed ordinary result.

## Idempotency

Each operation has one stable idempotency key. Retry returns the same receipt and cannot charge, grant, refund or settle twice.

## Offline behavior

Ordinary client-authoritative operations may commit locally and synchronize later. Connectivity changes synchronization only; external confirmed events remain pending until authoritative confirmation.

## Security and privacy

Receipts, entitlements and purchase identifiers are access-sensitive. Rules must prevent cross-user reads/writes, server adapters must append immutable events, and logs must avoid payment secrets.

## Recovery

Rebuild projections from immutable operation history and replay by idempotency key. Never repair an incident by overwriting balances or issuing an orphan debit. RTO/RPO remain unapproved.

## Owning tests

[economy_constitution_contract.test.ts](../../../tests/economy_constitution_contract.test.ts), [personal_economy_rules.emulator.test.ts](../../../functions/src/personal_economy_rules.emulator.test.ts), and [external_economy_events.test.ts](../../../functions/src/external_economy_events.test.ts).
