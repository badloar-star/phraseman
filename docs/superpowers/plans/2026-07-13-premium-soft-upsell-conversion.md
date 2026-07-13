# Premium Soft Upsell Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all six weak soft-upsell cards with one polished Quiet Premium modal and connect each production or manual-test impression to its exact paywall and store outcome through one immutable attribution ID.

**Architecture:** Keep eligibility and cooldown logic local-first, but claim a new opportunistic `softUpsell` overlay slot before creating an attribution chain. A shared validated `SoftUpsellAttribution` object is forwarded through `/premium_modal`, Paywall A/B/C, and the existing purchase hook; BigQuery groups only by `(soft_upsell_mode, soft_upsell_impression_id)`. Runtime and admin preview use one copy catalog and one modal component, while test chains are isolated from production.

**Tech Stack:** Expo Router, React Native, Reanimated, RevenueCat Purchases, Firebase Analytics/PostHog, Firebase Functions TypeScript, BigQuery SQL, Admin v2 vanilla JavaScript, Jest/RNTL contract tests.

---

## Task 1: Build one bounded commercial-copy source

**Files:**
- Create: `app/soft_upsell_copy.ts`
- Create: `tests/soft_upsell_copy.test.ts`
- Modify: `components/admin_panel/soft_upsell_preview_catalog.ts`
- Modify: `tests/soft_upsell_admin_preview_catalog.test.ts`

- [ ] Write failing tests for all six approved Russian scenarios, the common proof/title/body/CTA shape, and exact AI copy that never promises a daily free dialogue.
- [ ] Add measured-copy tests: weekly review requires two closed-enum categories, at least five scored attempts each, and a 15-point success-rate delta; repeated training requires at least five scored attempts and a 15-point error-rate lead. Test ties, missing data, unknown categories, raw strings, and labels over 32 characters falling back.
- [ ] Run `npx jest --runTestsByPath tests/soft_upsell_copy.test.ts tests/soft_upsell_admin_preview_catalog.test.ts --no-cache --runInBand` and confirm RED because the catalog and selectors do not exist.
- [ ] Implement a finite catalog and selectors with no free-text interpolation:

```ts
export type SoftUpsellCopy = Readonly<{
  proof: string;
  title: string;
  body: string;
  ctaLabel: string;
}>;

export type SoftUpsellCategory =
  | 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading';

export function selectSoftUpsellCopy(input: {
  opportunity: SoftUpsellOpportunity;
  locale: SupportedLocale;
  measured?: SoftUpsellMeasuredSignal | null;
}): SoftUpsellCopy;
```

- [ ] Make `SOFT_UPSELL_ADMIN_PREVIEWS` reference `selectSoftUpsellCopy` instead of duplicating title/body/CTA strings. Preserve admin labels, icons, descriptions, and all six scenarios.
- [ ] Run the two focused tests again and confirm GREEN.
- [ ] Commit: `git add app/soft_upsell_copy.ts components/admin_panel/soft_upsell_preview_catalog.ts tests/soft_upsell_copy.test.ts tests/soft_upsell_admin_preview_catalog.test.ts && git commit -m "feat: centralize soft upsell conversion copy"`.

## Task 2: Define the exact attribution and idempotency contract

**Files:**
- Create: `app/soft_upsell_attribution.ts`
- Create: `tests/soft_upsell_attribution.test.ts`
- Modify: `app/soft_upsell_core.ts`

- [ ] Write failing table tests for valid production/test objects, every invalid or partial route-param combination, mismatched trigger/context pairs, IDs longer than 80 characters, and stale account-generation tokens.
- [ ] Test deterministic semantic IDs for eligible, impression, CTA, dismiss, shown, close, continue-free, plan selection, and monotonic purchase-attempt outcomes. Assert every ID is stable and at most 80 characters.
- [ ] Run `npx jest --runTestsByPath tests/soft_upsell_attribution.test.ts --no-cache --runInBand` and confirm RED.
- [ ] Implement an immutable, atomically validated object and bounded route serialization:

```ts
export type SoftUpsellMode = 'production' | 'test';
export type SoftUpsellAttribution = Readonly<{
  impressionId: string;
  trigger: SoftUpsellTrigger;
  context: SoftUpsellContext;
  mode: SoftUpsellMode;
}>;

export type ClaimedSoftUpsellChain = Readonly<{
  attribution: SoftUpsellAttribution;
  accountToken: AccountGenerationToken; // local-only; never serialized
}>;

export function createSoftUpsellAttribution(...): SoftUpsellAttribution;
export function parseSoftUpsellAttribution(params: UnknownRouteParams): SoftUpsellAttribution | null;
export function softUpsellRouteParams(value: SoftUpsellAttribution): Record<string, string>;
export function softUpsellEventId(value: SoftUpsellAttribution, semanticSuffix: string): string;
```

- [ ] Keep the governed trigger/context mapping in one exported source so eligibility, route validation, and analytics cannot drift.
- [ ] Run the focused test again and confirm GREEN.
- [ ] Commit: `git add app/soft_upsell_attribution.ts app/soft_upsell_core.ts tests/soft_upsell_attribution.test.ts && git commit -m "feat: add exact soft upsell attribution contract"`.

## Task 3: Add a non-queued overlay try-claim

**Files:**
- Modify: `components/overlay_arbiter_core.ts`
- Modify: `components/OverlayArbiter.tsx`
- Modify: `tests/overlay_arbiter.test.ts`
- Modify: `tests/soft_upsell_overlay_contract.test.ts`

- [ ] Add failing tests that place `softUpsell` immediately before `perfectWeekReward` and verify occupied startup, same-tick competing claims, release on unmount, CTA handoff, and no delayed display after an occupied/raced claim.
- [ ] Run `npx jest --runTestsByPath tests/overlay_arbiter.test.ts tests/soft_upsell_overlay_contract.test.ts --no-cache --runInBand` and confirm RED.
- [ ] Add a provider-owned token lease that resolves after the current JS turn, sees same-tick higher-priority waiters, and either owns the slot or returns `null` without joining the waiter queue:

```ts
type OverlayLease = Readonly<{ token: string; release: () => void }>;
export function useOverlayTryClaim(key: 'softUpsell'): () => Promise<OverlayLease | null>;
```

- [ ] Ensure release is idempotent and token-checked so stale cleanup cannot free a newer lease; cleanup releases ownership, handoff gaps reject claims, disabled-provider behavior remains compatible, and existing queued overlays are unchanged.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Commit: `git add components/overlay_arbiter_core.ts components/OverlayArbiter.tsx tests/overlay_arbiter.test.ts tests/soft_upsell_overlay_contract.test.ts && git commit -m "feat: add opportunistic soft upsell overlay claim"`.

## Task 4: Replace the inline card with the Quiet Premium modal

**Files:**
- Modify: `components/SoftContextualUpsellCard.tsx`
- Modify: `tests/soft_contextual_upsell_card_contract.test.ts`
- Create: `tests/soft_contextual_upsell_card_rntl.test.tsx`

- [ ] Replace the old inline-card assertions with failing contracts for one shared modal hierarchy, no top close, full-width 52px gold CTA with dark foreground, 44px `Не сейчас`, backdrop/system-back dismissal, bottom sheet on phone, centered max-width 560px on tablet, and safe-area padding.
- [ ] Add RNTL tests for all six copies, large font scale, small phone/tablet layouts, idempotent CTA/dismiss, and Reduce Motion.
- [ ] Assert the shimmer is one-shot and uses opacity/transform only; reject `setInterval`, `Animated.loop`, and `withRepeat(..., -1)`.
- [ ] Run `npx jest --runTestsByPath tests/soft_contextual_upsell_card_contract.test.ts --no-cache --runInBand` plus `npx jest --config jest.rntl.config.cjs --runTestsByPath tests/soft_contextual_upsell_card_rntl.test.tsx --no-cache --runInBand`; confirm RED against the inline card.
- [ ] Implement the dark charcoal/black gradient, restrained gold glow/border, Ionicon, proof pill, entrance transition, and one diagonal sweep after visibility. Use Reanimated UI-thread opacity/transform and disable the sweep under Reduce Motion.
- [ ] Keep analytics/navigation outside the visual component; expose only `visible`, `copy`, `onImpression`, `onPrimary`, `onDismiss`, and guarded action state.
- [ ] Run both focused commands and confirm GREEN.
- [ ] Commit: `git add components/SoftContextualUpsellCard.tsx tests/soft_contextual_upsell_card_contract.test.ts tests/soft_contextual_upsell_card_rntl.test.tsx && git commit -m "feat: redesign soft upsells as quiet premium modal"`.

## Task 5: Bind eligibility, modal ownership, analytics, and real navigation

**Files:**
- Modify: `hooks/use_soft_upsell_opportunity.ts`
- Modify: `app/soft_upsell_state.ts`
- Modify: `app/lesson_complete_soft_upsell.ts`
- Modify: `app/lesson_complete.tsx`
- Modify: `tests/use_soft_upsell_opportunity.test.ts`
- Modify: `tests/soft_upsell_state.test.ts`
- Modify: `tests/lesson_complete_soft_upsell_behavior.test.ts`
- Modify: `tests/lesson_complete_soft_upsell_contract.test.ts`

- [ ] Write failing tests proving the impression ID is created only after a successful try-claim, before eligible and first render; pre-claim suppression has no impression ID; CTA never waits for analytics; dismiss and CTA are mutually exclusive and idempotent.
- [ ] Test the mandatory handoff order: lock action → release `softUpsell` → close modal/handoff gap → `router.push('/premium_modal', params)`. On navigation rejection, discard the released lease and show a retryable modal only after a fresh successful tokenized try-claim; never reuse the old lease and do not emit `paywall_shown`.
- [ ] Test account-generation change invalidates the local claimed chain and first lesson plus lesson eight retain identity, premium, cooldown, and milestone guards. Assert the account token is never included in route params or analytics payloads.
- [ ] Run the four focused test files and confirm RED.
- [ ] Refactor `useSoftUpsellOpportunity` to return the claimed attribution and explicit `onVisible`, `onDismiss`, and `onCta` results. Persist production cooldown/milestone only after the production modal is visible; test mode never mutates production state.
- [ ] Change all six destinations to `/premium_modal` route params with `source=soft_upsell`; preserve `context=first_lesson_success` for the first lesson.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Re-run `tests/dialogs_limit_session.test.ts tests/ai_dialog_level_lock.test.ts` to confirm the free AI allowance remains exactly two lifetime.
- [ ] Commit: `git add hooks/use_soft_upsell_opportunity.ts app/soft_upsell_state.ts app/lesson_complete_soft_upsell.ts app/lesson_complete.tsx tests/use_soft_upsell_opportunity.test.ts tests/soft_upsell_state.test.ts tests/lesson_complete_soft_upsell_behavior.test.ts tests/lesson_complete_soft_upsell_contract.test.ts && git commit -m "feat: open real paywall from claimed soft upsells"`.

## Task 5B: Wire the four remaining production trigger adapters

**Files:**
- Create: `app/soft_upsell_trigger_adapters.ts`
- Modify: `app/WeeklyReviewCard.tsx`
- Modify: `app/ai_dialog_session.tsx`
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/trainer_session_report.tsx`
- Create: `tests/soft_upsell_trigger_adapters.test.ts`
- Modify: `tests/weekly_review_client_contract.test.ts`
- Modify: `tests/dialogs_limit_session.test.ts`
- Modify: `tests/trainer_weekly_review_order_contract.test.ts`

- [ ] Write failing pure-adapter tests that emit exactly one candidate after: a completed weekly review; the second lifetime completed AI dialogue; streak transitions to 7, 14, or 30; and a repeated successful trainer session. Reject load-only renders, failures, replayed completion callbacks, other counts, stale account generations, and premium users.
- [ ] Test measured weekly/trainer signals against the closed category/sample/delta contract from Task 1. When the existing source cannot prove the thresholds, assert safe fallback copy rather than an inferred weak area.
- [ ] Run the four focused test files and confirm RED because production currently exposes only lesson 1 and lesson 8 adapters.
- [ ] Implement pure candidate builders in `soft_upsell_trigger_adapters.ts`, then call them only from the existing authoritative completion points in the four listed screens. Feed candidates through the same claimed-modal lifecycle; do not create a second modal or analytics implementation.
- [ ] Keep all four remote flags default-off. Enabling one flag activates only its tested trigger and does not change the underlying free limit or reward behavior.
- [ ] Run the focused tests and confirm GREEN, including the assertion that AI dialogues remain exactly two lifetime and never one per day.
- [ ] Commit: `git add app/soft_upsell_trigger_adapters.ts app/WeeklyReviewCard.tsx app/ai_dialog_session.tsx 'app/(tabs)/home.tsx' app/trainer_session_report.tsx tests/soft_upsell_trigger_adapters.test.ts tests/weekly_review_client_contract.test.ts tests/dialogs_limit_session.test.ts tests/trainer_weekly_review_order_contract.test.ts && git commit -m "feat: connect remaining soft upsell triggers"`.

## Task 6: Make every admin preview a real isolated test chain

**Files:**
- Modify: `components/admin_panel/sections/SoftUpsellPreviewSection.tsx`
- Modify: `tests/soft_upsell_admin_preview_section.test.ts`
- Modify: `tests/soft_upsell_admin_preview_integration.test.ts`

- [ ] Rewrite the QA-toast-only expectations: each switch opens the actual shared modal and its CTA routes to `/premium_modal` with a fresh `soft_upsell_mode=test` attribution.
- [ ] Test the visible warning `Тестовая цепочка — не попадёт в Production funnel`, analytics-consent-disabled explanation, real navigation, test dismissals, and absence of production cooldown/milestone writes.
- [ ] Run both tests and confirm RED.
- [ ] Remove the redundant outer preview modal, render the shared Quiet Premium component, and keep QA toast only as secondary feedback after successful test routing.
- [ ] Run both tests and confirm GREEN.
- [ ] Commit: `git add components/admin_panel/sections/SoftUpsellPreviewSection.tsx tests/soft_upsell_admin_preview_section.test.ts tests/soft_upsell_admin_preview_integration.test.ts && git commit -m "feat: route admin soft upsell previews through test funnel"`.

## Task 7: Forward attribution through dispatcher and Paywall A/B/C

**Files:**
- Modify: `app/premium_modal.tsx`
- Modify: `app/paywall_a.tsx`
- Modify: `app/paywall_b.tsx`
- Modify: `app/paywall_c.tsx`
- Modify: `app/paywall_purchase.ts`
- Modify: `tests/paywall_funnel_behavior.test.ts`
- Create: `tests/soft_upsell_paywall_attribution.test.ts`

- [ ] Write failing tests for the same validated attribution reaching dispatcher, A/B/C, `paywall_shown`, plan selection, CTA, close, and continue-free. Test that independent paywalls have no soft fields and malformed partial params are dropped atomically.
- [ ] Test one stable paywall impression ID coexisting with the soft impression ID; account switch invalidates soft attribution without changing non-soft behavior.
- [ ] Run the two focused test files and confirm RED.
- [ ] Parse once at `/premium_modal`, reserialize the validated object to the selected paywall route, and pass it as an optional `attribution` argument to `usePaywallPurchase`.
- [ ] Add a small helper that appends governed soft fields plus event ID to applicable paywall events, and destroys the chain on close/continue-free/restore/completion/account change.
- [ ] Ensure `paywall_shown` fires only after the selected paywall is actually mounted, not when soft navigation merely starts.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Commit: `git add app/premium_modal.tsx app/paywall_a.tsx app/paywall_b.tsx app/paywall_c.tsx app/paywall_purchase.ts tests/paywall_funnel_behavior.test.ts tests/soft_upsell_paywall_attribution.test.ts && git commit -m "feat: forward soft upsell attribution through paywalls"`.

## Task 8: Record truthful trial, paid, pending, failure, and restore outcomes

**Files:**
- Modify: `app/paywall_purchase.ts`
- Modify: `app/paywall_analytics_impression.ts`
- Modify: `app/paywall_trial_info.ts`
- Modify: `app/paywall_trial_offer.ts`
- Modify: `components/paywall/PaywallLegalDisclosure.tsx`
- Modify: `tests/paywall_purchase_behavior.test.ts`
- Modify: `tests/paywall_purchase_activation_contract.test.ts`
- Modify: `tests/paywall_trial_info.test.ts`
- Modify: `tests/paywall_trial_offer.test.ts`
- Create: `tests/soft_upsell_purchase_outcomes.test.ts`

- [ ] Add failing pure-helper tests for annual offer eligible but not applied, annual entitlement with `periodType=TRIAL`, monthly, lifetime, Ask-to-Buy/deferred/pending, failure, cancellation, and restore.
- [ ] Assert only confirmed matching annual trial emits `trial_started`; every confirmed entitlement emits `purchase_completed` with `activation_type=trial|paid`; pending emits only `purchase_pending`; restore emits no soft conversion.
- [ ] Test monotonic attempt numbers and stable per-attempt event IDs under duplicate native callbacks.
- [ ] Add purchase-level account-switch tests: capture `AccountGenerationToken` before the native store attempt; recheck it after identity sync and after RevenueCat returns; pass `isCurrent` into `persistStorePremiumLocally`; suppress stale local persistence and soft attribution without misclassifying the real store transaction.
- [ ] Test first-lesson success: activate an existing pending personal plan, otherwise route to `/personal_plan_setup` in post-purchase mode without a second paywall.
- [ ] Add UI-contract tests proving only the annual plan may display the seven-day trial. Monthly and lifetime must suppress trial copy even if store metadata is wrong; remove the three-day dev/exit fallback; schedule the reminder only after a confirmed applied annual trial.
- [ ] Run all five focused test files and confirm RED.
- [ ] Extract pure outcome classification from RevenueCat `CustomerInfo`; do not infer applied trial from pre-purchase package eligibility. Preserve ordinary entitlement activation and existing non-soft analytics.
- [ ] Implement `purchase_pending` classification, terminally clear direct attribution on pending, purchase-level account-token checks, annual-only seven-day UI, removal of the three-day fallback, and the first-lesson post-purchase continuation.
- [ ] Run the focused tests and confirm GREEN.
- [ ] Commit: `git add app/paywall_purchase.ts app/paywall_analytics_impression.ts app/paywall_trial_info.ts app/paywall_trial_offer.ts components/paywall/PaywallLegalDisclosure.tsx tests/paywall_purchase_behavior.test.ts tests/paywall_purchase_activation_contract.test.ts tests/paywall_trial_info.test.ts tests/paywall_trial_offer.test.ts tests/soft_upsell_purchase_outcomes.test.ts && git commit -m "fix: make soft upsell purchase outcomes truthful"`.

## Task 9: Govern every commercial analytics event and field

**Files:**
- Create: `app/product_analytics_governance.json`
- Create: `app/product_analytics_event_catalog.ts`
- Modify: `app/analytics.ts`
- Modify: `tests/soft_upsell_analytics.test.ts`
- Create: `tests/product_analytics_event_catalog.test.ts`

- [ ] Write failing tests for all applicable event/field combinations, the five soft events, `purchase_pending`, `activation_type`, exact trigger/context pair validation, `soft_upsell_mode`, bounded IDs, and forbidden arbitrary/user fields.
- [ ] Assert claimed events carry stable `event_id`; suppression has its own event ID but no soft impression ID; analytics errors never block CTA, dismiss, or purchase.
- [ ] Run both tests and confirm RED.
- [ ] Add a versioned JSON registry and typed catalog consumed by the analytics sanitizer. Allow soft fields only on the intended soft/paywall/purchase events; preserve all existing event payloads for non-soft entry points.
- [ ] Treat the new JSON as the canonical machine-readable governance source, not documentation-only: contract tests must prove the TypeScript catalog and sanitizer agree with it. This resolves the current repository gap where no equivalent field-set catalog exists.
- [ ] Keep Firebase/PostHog consent behavior and disabled local queue unchanged.
- [ ] Run both tests and confirm GREEN.
- [ ] Commit: `git add app/product_analytics_governance.json app/product_analytics_event_catalog.ts app/analytics.ts tests/soft_upsell_analytics.test.ts tests/product_analytics_event_catalog.test.ts && git commit -m "feat: govern soft upsell funnel analytics"`.

## Task 10: Extend BigQuery with exact direct-chain aggregation

**Files:**
- Modify: `functions/src/admin_product_analytics.ts`
- Modify: `functions/src/admin_product_analytics.test.ts`
- Modify: `tests/admin_product_analytics_contract.test.ts`

- [ ] Add failing tests for the expanded allowlist/extraction, six soft contexts, `event_id` dedupe, exact `(soft_upsell_mode, soft_upsell_impression_id)` grouping, conflicting metadata rejection, and no user/session/time-window attribution.
- [ ] Add fixtures for production/test isolation, duplicate events, CTA without paywall, outcome without start, pending, annual trial, paid activation, and independent purchase with no soft ID.
- [ ] Run `Push-Location functions; npx jest --runTestsByPath src/admin_product_analytics.test.ts --no-cache --runInBand; Pop-Location` and `npx jest --runTestsByPath tests/admin_product_analytics_contract.test.ts --no-cache --runInBand`; confirm RED.
- [ ] Extend `raw_base`, validate/dedupe chain events, aggregate distinct impression IDs per trigger, compute required rates/medians/quality indicators, and return additive `softUpsells.production`, `softUpsells.test`, and `softUpsells.quality` fields.
- [ ] Preserve authentication, permissions, filters, cache keys, dataset checks, and every existing response field.
- [ ] Run the two focused tests and `Push-Location functions; npm run build; Pop-Location`; confirm GREEN.
- [ ] Commit: `git add functions/src/admin_product_analytics.ts functions/src/admin_product_analytics.test.ts tests/admin_product_analytics_contract.test.ts && git commit -m "feat: aggregate exact soft upsell conversion chains"`.

## Task 11: Render separate Production and Test funnels in Admin v2

**Files:**
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/pages/product-analytics.js`
- Modify: `admin/v2/scripts/pages/conversion-diagnostics.js`
- Modify: `admin/v2/scripts/components/analytics-language.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `tests/admin_product_analytics_contract.test.ts`
- Modify: `tests/admin2_detailed_analytics_integration.test.ts`

- [ ] Add failing static/render tests for a dedicated Soft upsell funnel section, obvious Production/Test segmented control, all six trigger rows, all approved metrics, empty/loading/error states, and quality warnings.
- [ ] Assert production is the default and mode switching never combines payloads. Assert labels distinguish entitlement activations, confirmed trial starts, paid non-trial activations, and pending payments.
- [ ] Run `npx jest --runTestsByPath tests/admin_product_analytics_contract.test.ts tests/admin2_detailed_analytics_integration.test.ts --no-cache --runInBand` and confirm RED.
- [ ] Add the categorized, tooltip-rich section inside the existing analytics page following `docs/design/ADMIN_UI_BIBLE.md`; reuse the 7/28/90-day and platform filters.
- [ ] Show rates based on distinct soft impression IDs and disclose that RevenueCat is billing truth while this is consented in-app attribution.
- [ ] Run both focused tests and confirm GREEN.
- [ ] Serve `admin/` locally and manually inspect Production/Test states at desktop and narrow widths; record screenshots under ignored `.codex-tmp/soft-upsell-v2/`.
- [ ] Commit: `git add admin/v2/scripts/admin-core.js admin/v2/scripts/pages/product-analytics.js admin/v2/scripts/pages/conversion-diagnostics.js admin/v2/scripts/components/analytics-language.js admin/v2/scripts/admin-firebase.js tests/admin_product_analytics_contract.test.ts tests/admin2_detailed_analytics_integration.test.ts && git commit -m "feat: show soft upsell funnels in admin analytics"`.

## Task 12: Integration, visual QA, and release evidence

**Files:**
- Modify as required by failures only; do not broaden scope.
- Update: `docs/superpowers/specs/2026-07-13-soft-upsell-premium-conversion-design.md` status to `Implemented` only after all gates pass.

- [ ] Run the complete focused app gate:

```powershell
npx jest --runTestsByPath `
  tests/soft_upsell_copy.test.ts `
  tests/soft_upsell_attribution.test.ts `
  tests/soft_upsell_core.test.ts `
  tests/soft_upsell_state.test.ts `
  tests/use_soft_upsell_opportunity.test.ts `
  tests/overlay_arbiter.test.ts `
  tests/soft_upsell_overlay_contract.test.ts `
  tests/soft_contextual_upsell_card_contract.test.ts `
  tests/soft_upsell_admin_preview_catalog.test.ts `
  tests/soft_upsell_admin_preview_section.test.ts `
  tests/soft_upsell_admin_preview_integration.test.ts `
  tests/lesson_complete_soft_upsell_behavior.test.ts `
  tests/lesson_complete_soft_upsell_contract.test.ts `
  tests/soft_upsell_trigger_adapters.test.ts `
  tests/soft_upsell_analytics.test.ts `
  tests/product_analytics_event_catalog.test.ts `
  tests/paywall_funnel_behavior.test.ts `
  tests/paywall_purchase_behavior.test.ts `
  tests/paywall_purchase_activation_contract.test.ts `
  tests/paywall_trial_info.test.ts `
  tests/paywall_trial_offer.test.ts `
  tests/soft_upsell_paywall_attribution.test.ts `
  tests/soft_upsell_purchase_outcomes.test.ts `
  tests/admin_product_analytics_contract.test.ts `
  tests/admin2_detailed_analytics_integration.test.ts `
  tests/dialogs_limit_session.test.ts `
  tests/ai_dialog_level_lock.test.ts `
  tests/perf_freeze_contract.test.ts `
  tests/owner_direction_runtime_contract.test.ts `
  --no-cache --runInBand
```

- [ ] Run the RNTL modal test with `npx jest --config jest.rntl.config.cjs --runTestsByPath tests/soft_contextual_upsell_card_rntl.test.tsx --no-cache --runInBand`.
- [ ] Run Functions gates with `Push-Location functions; npx jest --runTestsByPath src/admin_product_analytics.test.ts --no-cache --runInBand; npm run build; Pop-Location`.
- [ ] Run `npx tsc --noEmit --pretty false` only after focused tests pass; classify pre-existing unrelated failures separately and do not edit unrelated files.
- [ ] Run `git diff --check`, `npm run scan:secrets`, and a targeted search proving no `1 free dialogue/day` policy was introduced.
- [ ] On a dev build, manually preview all six test scenarios, confirm one-shot shimmer/Reduce Motion, dismiss paths, A/B/C routing, annual trial/monthly/lifetime labels, and first-lesson post-purchase plan continuation. Confirm Test events appear only under Test and Production data remains unchanged.
- [ ] Request mandatory advisor review with objective, final diff, affected payment/analytics paths, focused test output, Functions build output, screenshots, and unresolved uncertainty. Apply changes and resubmit until `DECISION: APPROVED`.
- [ ] Mark the spec implemented, commit final evidence/fixes with `git commit -m "test: verify premium soft upsell conversion funnel"`, then merge the branch into the active integration branch only after all required checks and advisor approval.

## Acceptance checklist

- [ ] Every one of the six scenarios uses the same Quiet Premium hierarchy and approved context-led copy.
- [ ] Every primary CTA opens the real `/premium_modal`; no QA-only CTA remains.
- [ ] `Не сейчас` is consistently secondary and all dismiss paths count once.
- [ ] The sweep runs once, stops, and respects Reduce Motion.
- [ ] One validated `soft_upsell_impression_id` survives only its direct paywall/store instance.
- [ ] Production and Test funnels cannot contaminate each other.
- [ ] Annual applied trial, paid activation, pending, failure, cancellation, close, continue-free, and restore are truthfully distinct.
- [ ] AI dialogues remain exactly two lifetime.
- [ ] No existing non-soft paywall, purchase, entitlement, consent, identity, or overlay behavior is removed.
- [ ] Focused tests, Functions build, manual visual QA, and advisor review are complete before merge.
