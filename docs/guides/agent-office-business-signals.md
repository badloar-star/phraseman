# Agent Office: business-signal candidates

`functions/src/agent_office/business_signals.ts` is a deterministic, server-internal evaluator. It accepts only normalized evidence supplied by dependency injection; it has no Firebase, RevenueCat, Google Play, App Store, network, scheduler, callable, notification, or message-delivery client.

## Accepted evidence

The evaluator requires three exact, complete, fresh sources:

- `firebase` — current and previous trial-to-paid counts;
- `revenuecat` — current and previous active-subscriber counts, retained as provenance/consistency context;
- `store_console` — current and previous purchase/refund counts.

Every source supplies an opaque `sourceRef`, an observation timestamp, and `state: "ready"`. Evidence older than 15 minutes, more than one minute in the future, duplicated/missing source entries, non-opaque refs, incomplete rows, or impossible counts (for example paid users above trials) cause a fail-closed `insufficient_evidence` result. Missing data is never converted to zero.

## Current deterministic rules

| Signal | Minimum sample | Trigger | Candidate action |
| --- | ---: | --- | --- |
| `paid_conversion_drop` | 20 trials in both windows | Current paid conversion is at least 20% relatively below the previous window | `analysis_prepare` |
| `refund_rate_spike` | 20 purchases in both windows | Current refund rate is at least 10% and increases by at least 5 percentage points | `analysis_prepare` |

The evaluator reports exact previous/current rates, absolute change, fixed confidence (`0.9` for complete and consistent evidence), freshness/provenance, and the threshold rationale. It makes no forecast and does not interpret any absent source as a business result.

## Ledger behaviour and audit binding

`persistBusinessSignalEvaluation` is optional server-internal glue for an already-normalized result. It:

1. Rechecks the global kill switch inside the repository transaction. A missing, malformed, or enabled control creates nothing.
2. Creates only standard W1 `agent_cases` and `agent_recommendations`, both `prepare_only`; no task, approval, audit decision, user message, or financial/configuration mutation is made.
3. Binds every case/recommendation to opaque source refs, timestamps, confidence, threshold rationale, and a canonical recommendation content hash.
4. Uses the signal plus impact and provenance to derive stable IDs. Replaying identical evidence verifies the immutable documents and returns idempotently; a mismatch fails as data loss.

Approving a candidate still follows the existing owner-only W1 ledger flow. Approval does not execute anything because the recommendation action type is `analysis_prepare` and approvals keep `enqueuedTaskId: null`.

## Admin rendering contract

When an Admin page is added, it must render only persisted W1 projections and must not invent values:

- **Title/status:** `AgentCase.summary` and `status`.
- **Confidence:** `AgentCase.confidence.score`, `basis`, and `insufficientEvidence`.
- **Freshness/provenance:** `sourceHealth[].source`, `state`, and `observedAtMs`; source refs remain opaque identifiers, not links to raw data.
- **Evidence:** `AgentRecommendation.evidence[]`, including its opaque `sourceRef` and timestamp.
- **Impact and rationale:** the bounded fields encoded in the case summary and the recommendation risk summary; show them as an analysis prompt, never as a command.
- **Allowed action:** `actionType` and `scope`; for this slice they must read `analysis_prepare` and `prepare_only`.
- **Control:** show disabled/insufficient/no-action states without offering a bypass. Owner approval/decline uses the existing ledger callable and revision/content-hash binding.

The page must not call an external connector, write a price/configuration, send a message, or create a task. Raw source payloads and credentials remain outside the client projection.
