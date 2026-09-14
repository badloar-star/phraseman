# Revenue VNext — Paywall Truth Foundation

Date: 2026-09-12  
Program: `2026-09-12-revenue-model-vnext-program.md`  
Risk class: money/access, fail closed  
Scope owner: Revenue VNext paywall foundation tranche

## Outcome

This tranche makes four existing acquisition boundaries truthful without changing
the frozen A–G or onboarding paywall design:

1. New users cannot be sold the retired Personal Plan from active lesson/setup
   entry points. Existing verified grandfathered access and old purchase recovery
   remain compatible.
2. The premium modal receives a typed, bounded entry contract containing
   `context`, `source`, `creativeRevision`, `impressionId`, and the live
   `entitlementState`.
3. The premium modal waits while entitlement is unresolved and dismisses for an
   already-Plus user, so neither state can flash an acquisition paywall.
4. Store `payment_pending` is measured as its own lifecycle outcome rather than
   as `purchase_failed`.

## Non-goals

- No visual, layout, color, animation, or component-tree changes to A–G or the
  onboarding paywall.
- No new Free quotas, price changes, commercial promise changes, pearl products,
  frequency caps, or experiment allocation.
- No removal of grandfathered Personal Plan entitlement or historical purchase
  compatibility.
- No Max AI Tutor work.
- No emulator, Metro, store sandbox, deployment, release, or Remote Config write.

## Work breakdown and acceptance criteria

### Task 1 — Retire active Personal Plan acquisition

- [x] Lessons, Personal Plan setup, and sunset guard route denied/non-eligible
  users to the existing main-course sunset fallback.
- [x] The explanation explicitly says Personal Plan is no longer sold and all 32
  core lessons remain free.
- [x] Those routes do not open a Plus/generic paywall with
  `context=personal_plan`.
- [x] Existing verified/grandfathered activation paths remain intact.

Guard: `tests/revenue_vnext_personal_plan_retirement_contract.test.ts`.

### Task 2 — Typed paywall-entry boundary

- [x] Entry dimensions are bounded types rather than arbitrary strings.
- [x] Every accepted entry has a creative revision, stable impression ID, and
  live entitlement state.
- [x] Unknown contexts/sources throw in development and tests; production fails
  closed by dismissing acquisition.
- [x] Legacy aliases/defaults are explicit and quarantined, not silent parsing.

Guard: `tests/paywall_entry_contract.test.ts`.

### Task 3 — Entitlement-safe premium modal

- [x] Unresolved entitlement renders no acquisition creative.
- [x] Plus renders no acquisition creative and dismisses once navigation is ready.
- [x] Free resolved users keep the existing A–G selection and visuals unchanged.
- [x] `manage=1` keeps the existing subscription-management flow.

Guard: `tests/premium_modal_entitlement_behavior.test.ts` plus existing navigation
and admin-grant contracts.

### Task 4 — Payment-pending analytics

- [x] The pending purchase branch emits `purchase_pending`, not
  `purchase_failed`.
- [x] Event catalog, governance, warehouse allowlist, terminal-outcome timing,
  impression coverage, and conversion query recognize the new event.
- [x] Pending UI/purchase behavior is unchanged.

Guards: `tests/paywall_purchase_pending_contract.test.ts`,
`tests/product_analytics_event_catalog.test.ts`, and
`tests/analytics_funnel_coverage.test.ts`.

## Technical-debt policy

The compatibility bridge deliberately accepts only known legacy aliases and
missing dimensions from old links. It must not become the permanent entry API.
RVTD-018 tracks its removal: migrate all active callsites to construct the full
typed contract, observe two stable releases with no legacy fallback usage, then
delete the aliases/defaults while retaining fail-closed unknown handling.

RVTD-013 remains open because this tranche introduces the canonical boundary but
does not yet migrate every helper/callsite or centralize frequency policy. Quotas,
copy variants, contextual paywall inventory, and experiment allocation belong to
the next tranche and must not be represented as delivered here.

## Verification evidence

- RED was observed separately for retired Personal Plan routes (4 failures),
  unresolved/Plus paywall rendering (2 failures), pending misclassification
  (1 failure), and missing pending warehouse aggregation (1 failure).
- Focused GREEN gate: 6 suites, 40 tests passed.
- Focused pending/catalog follow-up after warehouse wiring: 2 suites, 8 tests
  passed.
- Existing regression gate: 8 of 10 suites and 74 of 77 tests passed. The three
  failures are pre-existing/out-of-scope contract drift: two stale Personal Plan
  activation source assertions and the existing Arena/Learning V2 analytics
  governance baseline. They were not waived or modified.
- `node scripts/analytics-contract-audit.mjs --json` remains non-zero only for the
  existing Arena/Learning V2 catalog/governance gaps; `purchase_pending` is not in
  the audit errors.

No release is authorized by this document. Fresh money/access review is required
before any release decision.
