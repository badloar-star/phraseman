# Evidence Analytics Phase 4 — Server Revenue and Subscription-Chain LTV

## Objective

Extend the existing RevenueCat webhook truth with versioned financial fields and expose aggregate revenue, renewal, refund, and mature subscription-chain LTV metrics without changing entitlement behavior or returning account/transaction identifiers.

## Source boundaries

- RevenueCat production webhooks are the purchase-lifecycle and estimated financial source.
- Client `purchase_completed` remains behavioral conversion only.
- RevenueCat gross USD is distinct from estimated proceeds.
- Final store proceeds remain unavailable until a reconciled store or scheduled export exists.
- ARPU remains unavailable until a compatible full-population denominator exists.
- Historic webhook documents without financial fields remain unavailable; current product prices are never backfilled.

## Implementation sequence

1. Add red unit tests for integer-micros normalization, missing coverage, signed refunds, and estimated proceeds.
2. Add red aggregate tests for trial-to-paid, mature M1/M2/M3, annual exclusion, refunds, LTV30/60/90, truncation, and response privacy.
3. Extend the webhook payload type and stored event document with optional normalized financial fields only.
4. Add the server financial cohort aggregator and wire it into the existing `money.read` callable.
5. Render gross, estimated, unavailable, mature, partial, and truncated states in the existing Admin v2 subscription panel.
6. Run focused webhook/purchase/subscription/Admin regressions, Functions build, diff checks, and mandatory Advisor review.

## Acceptance criteria

- No missing money field becomes zero.
- Currency values use integer micros and rate fields use integer ppm.
- Refund signs are preserved exactly as sent.
- Renewal and LTV denominators exclude immature chains.
- Monthly renewal metrics consume only rows explicitly labelled `monthly` by the server webhook.
- No UID, candidate ID, event ID, or transaction ID leaves the aggregate callable.
- Any source cap marks financial results `truncated_not_decision_grade`.
- Entitlement, deduplication, transfer, refund, and shard behavior remain unchanged.

## Находки и предложения

- Subscription-chain LTV is not customer LTV; transfers and aliases require a separate governed identity-resolution design before that claim is valid.
- Store reconciliation and an aligned monetizable-population denominator should be separate future imports rather than estimates hidden inside this phase.
