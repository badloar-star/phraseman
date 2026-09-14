# Telemetry and privacy domain contract

## Owner

Data/Product owns event semantics; Privacy approves collection and retention; Platform owns delivery and access enforcement.

## Source of truth

Client consent is implemented in [analytics_consent.ts](../../../app/analytics_consent.ts), event delivery in [analytics.ts](../../../app/analytics.ts), server reporting boundaries in [admin_analytics_core.ts](../../../functions/src/admin_analytics_core.ts), and deletion in [account_delete.ts](../../../functions/src/account_delete.ts).

## Authority

Consent state gates optional analytics collection on the client. Server aggregates are authoritative for admin reporting, but cannot invent missing events or silently convert unknown values to healthy zeros.

## Invariants

Every event has a documented purpose and minimal payload; consent-requiring events are not emitted before consent; identity joins are bounded; internal QA/dev events do not contaminate production metrics; account deletion covers retained personal telemetry.

## Idempotency

Queued delivery uses stable event identity where duplicate delivery would distort a metric or action. Aggregation and retries must not double-count, and unknown/missing inputs remain distinguishable from zero.

## Offline behavior

Permitted events may queue locally within bounded retention and flush after reconnect. Revoked consent prevents new optional collection and clears or suppresses pending data as required by policy.

## Security and privacy

Minimize personal data, prohibit secrets and raw sensitive content in event payloads, restrict admin aggregates, document retention/deletion, and treat child-related data as high sensitivity. A data inventory and approved retention schedule are still required.

## Recovery

Reprocess from immutable/raw evidence only where authorized and deduplicated; surface gaps as unknown. Privacy incidents use containment, access review and deletion/export procedures. RTO/RPO remain unapproved.

## Owning tests

[analytics_consent_subscription.test.ts](../../../tests/analytics_consent_subscription.test.ts), [analytics_contract_audit.test.ts](../../../tests/analytics_contract_audit.test.ts), [admin_analytics_integrity_contract.test.ts](../../../tests/admin_analytics_integrity_contract.test.ts), and [account_delete.test.ts](../../../functions/src/account_delete.test.ts).
