# Evidence Analytics Phase 4 — Server-Confirmed Revenue

## Outcome

Phase 4 adds versioned RevenueCat financial fields and aggregate subscription-chain revenue, trial conversion, renewal, refund, churn, ARPPU, and mature LTV metrics. It does not treat client purchase events as money truth and does not alter Premium entitlement behavior.

## Financial source contract

- Field semantics follow RevenueCat's official [webhook event fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields) and [taxes and commissions](https://www.revenuecat.com/docs/dashboard-and-metrics/taxes-and-commissions) documentation.
- Production RevenueCat webhooks remain the lifecycle source of truth.
- Gross USD and purchase-currency amounts are stored as signed integer micros.
- Tax and commission estimates are stored as integer parts per million.
- Estimated proceeds are calculated only when gross, currency, tax, and commission inputs are all valid.
- Missing values stay missing; historical events are labelled financially unavailable and are never backfilled from current product prices.
- Refund signs are preserved exactly as RevenueCat sends them.
- Final store proceeds remain `unavailable_not_imported`.

## Cohort definitions

- The internal cohort key is RevenueCat `originalTransactionId`, falling back to transaction ID. It never leaves the aggregate response.
- The result is explicitly **subscription-chain LTV**, not customer LTV.
- Trial-to-paid uses mature trial chains and a later confirmed paid transaction.
- M1/M2/M3 use calendar-month offsets and only rows explicitly labelled as monthly by the server webhook.
- Annual and lifetime purchases are excluded from monthly renewal denominators.
- LTV30/60/90 includes signed refunds inside the window and only mature paid chains.
- A renewal observed without an in-window `INITIAL_PURCHASE`/`NON_RENEWING_PURCHASE` is counted as `leftTruncatedChains`: its money remains in period totals, but it cannot start a new renewal or LTV cohort.
- ARPPU is signed gross per paid subscription chain.
- ARPU remains unavailable because RevenueCat's full financial audience cannot be divided by the consented Firebase audience.

## Admin v2

The existing subscription panel now shows:

- confirmed gross USD;
- estimated proceeds with an explicit non-profit warning;
- trial-to-paid and refund rates;
- M1/M2/M3 mature renewal cohorts;
- subscription-chain LTV30/60/90;
- complete, partial, legacy-unavailable, and truncated coverage states;
- a 365-day view needed for mature long-window cohorts.

No new top-level Admin section was added.

## Verification

- TDD red state confirmed missing normalization and cohort modules before implementation.
- Functions focused regression: 5 suites, 35 tests passed, including dedicated left-truncation and unknown-cadence fixtures.
- Root purchase/Admin regression: 6 suites, 41 tests passed.
- Functions TypeScript build passed.
- Admin JavaScript syntax check passed.
- Focused ESLint passed after one local style correction.
- Focused `git diff --check` passed.

## Source limitation

The local workspace has no live production webhook fixture or reconciled RevenueCat/store export. Calculations are verified against deterministic fixtures. The first production financial event should be checked for field coverage and sign semantics before using the dashboard for a pricing decision.

## Находки и предложения

- Scheduled RevenueCat or store exports should later reconcile estimated proceeds to final proceeds without overwriting the webhook source.
- Customer-level LTV requires a separate privacy-reviewed identity resolution design for transfers and aliases.
- A source cap intentionally changes status to `truncated_not_decision_grade`; the monthly export must preserve that status instead of silently publishing partial money.
