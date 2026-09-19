# Task packet: Seasonal offer — approved Variant A in app and admin

Governance-ID: MANUAL-2026-09-19-SEASONAL-OFFER-VARIANT-A
Status: In progress
Owner: product owner
Related epic/enabler: none

## Outcome

The approved Variant A appears consistently: a horizontal, animated −N% button in the Home header and a diagonal −N% badge anchored to the yearly plan price on every shared Premium paywall. The operator has one clear seasonal-offer control area in the live admin surface and can disable the in-app promotion without changing store pricing or an already-granted entitlement.

## Scope

In scope: `components/HomeDiscountBadge.tsx`, `components/paywall/PaywallPlanCards.tsx`, the seven existing paywall call sites, focused contracts, and `admin/v2/legacy.html`. The live seasonal control may only use the existing remote-config flag and validated percentage text.

Out of scope: publishing store offers, changing Apple/Google/RevenueCat products, base prices, trial duration, subscription eligibility, entitlement logic, backend schema, and deployment.

## Architecture

Store packages remain the only source of promotional price, standard price, discount percentage, and trial. Remote config is a UI kill switch and header label only. The plan-card badge receives the selected store promotion and never receives a hard-coded price or discount. The existing top promo disclosure is retained so current price, standard price, and post-promotion charge remain explicit.

## Security and privacy

The admin page continues to use its existing authenticated admin remote-config writer. No new backend endpoint, credential, personal data, analytics event, or client-side secret is introduced. Input remains constrained to an integer percentage 1–99 and the existing boolean flag.

## Technical debt

- Pay now: replace the generic header treatment with the approved horizontal Variant A motion while preserving reduce-motion behavior.
- Contain: store operations remain intentionally external to the UI control. Exit condition: a separately approved store/RevenueCat activation packet and explicit publish authorization.
- Accept temporarily: real device verification remains blocked by the current black dev-client screen. Owner: product owner; review after the dev client is restored; impact ceiling: visual sign-off only, not pricing or entitlement correctness.

## Verification

Run focused contracts for store-promo price truth and motion, plus a focused TypeScript check where practical under the repository traffic-light rule. Inspect all seven call sites for the shared selected store promotion. Manually verify the HTML design reference and, if the dev client becomes usable, the Home header and one paywall under both normal and reduce-motion modes.

## Rollback

Set `discount_offer_banner_enabled` to false in the live admin. This removes the Home entry point; a missing or invalid label also hides it. Store offer eligibility, current subscriber pricing, trial, and already-purchased promotional terms remain untouched. Reverting the UI-only source change restores the previous shared presentation without data loss.
