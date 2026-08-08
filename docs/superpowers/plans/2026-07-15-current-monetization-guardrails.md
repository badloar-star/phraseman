# Current Monetization Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten only the current Phraseman Free envelope, preserve the three-day store trial, and continue an explicitly blocked lesson immediately after a confirmed purchase without adding Firebase traffic or background work.

**Architecture:** Keep the existing in-memory Remote Config layer and existing RevenueCat entitlement check. Change build-time fallbacks and legacy admin mirrors together, remove the default trainer A/B split, and make lesson soft-upsell copy read the same runtime limit. Carry a bounded `resume_lesson_id` only in the active paywall route; after entitlement confirmation, locally refill energy and replace the paywall with that lesson. Do not persist a stale continuation intent and do not touch any Learning V2 or Admin V2 file.

**Tech Stack:** React Native 0.81, Expo Router, TypeScript, Jest, AsyncStorage, RevenueCat.

---

## Scope invariants

- Current/legacy learning only. Never edit `docs/v2/**`, `modules/learning-v2/**`, Learning V2 UI, or `admin/v2/**`.
- No new Firestore reads/writes/listeners, Cloud Functions, analytics events, polling, intervals, or recurring timers.
- Preserve current dirty changes in `app/paywall_purchase.ts`, `components/PremiumContext.tsx`, and their tests.
- Do not deploy, publish Remote Config, or write production Firebase state in this plan.
- Store trial duration remains store-authoritative; fallback stays exactly 3 days.

### Task 1: Free-envelope defaults and energy capacity

**Files:**
- Modify: `tests/monetization_policy.test.ts`
- Modify: `tests/quiz_daily_limit.test.ts`
- Modify: `tests/remote_flags.test.ts`
- Modify: `tests/remote_flags_trainer.test.ts`
- Create: `tests/energy_level_capacity.test.ts`
- Modify: `app/monetization_policy.ts`
- Modify: `app/quiz_daily_limit.ts`
- Modify: `app/remote_flags.ts`
- Modify: `constants/theme.ts`
- Modify: `components/EnergyContext.tsx`

- [ ] Write RED expectations: lessons 1–3 free and 4+ premium, one free quiz/day, one flat trainer session/day with default A/B split disabled, intro gift default false, energy capacity 5 through level 49 and 6 from level 50 onward, recovery still 600000 ms.
- [ ] Run the five focused Jest files and verify failures are caused by the old `8/3/2/true/5→10` defaults.
- [ ] Change only the fallback constants/defaults and level-cap function; retain all runtime overrides and the existing A/B mapping for future explicit experiments.
- [ ] Re-run the focused tests and verify GREEN.

### Task 2: Runtime-aligned soft upsell, paywall truth, and legacy admin mirror

**Files:**
- Modify: `tests/lesson_complete_soft_upsell_behavior.test.ts`
- Modify: `tests/lesson_complete_soft_upsell_contract.test.ts`
- Create: `tests/current_monetization_copy_contract.test.ts`
- Modify: `app/lesson_complete_soft_upsell.ts`
- Modify: `components/paywall/PaywallProofCards.tsx`
- Modify: `components/admin_panel/soft_upsell_preview_catalog.ts`
- Modify: `admin/legacy.html`

- [ ] Write RED tests proving the free-lessons-complete candidate occurs at the runtime limit 3, not a compile-time 8, and all user/admin copy says three free lessons, one quiz/day, one trainer/day, intro gift off by default.
- [ ] Run the focused tests and verify expected failures.
- [ ] Read the free lesson boundary through `getFreeLessonLimit()` from the already hydrated in-memory config; do not add a Firestore read.
- [ ] Update only factual copy/default mirrors. Keep the existing Plus badges and all controls.
- [ ] Run focused Jest plus `node --check` for any extracted/changed JavaScript and verify GREEN.

### Task 3: Exact lesson continuation and immediate local energy refill

**Files:**
- Create: `app/paywall_lesson_continuation.ts`
- Create: `tests/paywall_lesson_continuation.test.ts`
- Modify: `tests/lesson_premium_gate_routing.test.ts`
- Modify: `tests/paywall_purchase_activation_contract.test.ts`
- Modify: `tests/paywall_purchase_behavior.test.ts`
- Modify: `app/lesson_premium_gate.ts`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/lesson_menu.tsx`
- Modify: `app/lesson_complete.tsx`
- Modify: `app/paywall_a.tsx`
- Modify: `app/paywall_b.tsx`
- Modify: `app/paywall_c.tsx`
- Modify: `app/paywall_purchase.ts`
- Modify: `components/EnergyContext.tsx`

- [ ] Write RED tests for strict `resume_lesson_id` parsing (`1..32`, one scalar only), exact `/lesson_menu?id=N` replacement, and inclusion of the intent at every lesson paywall entry point.
- [ ] Write RED contract tests requiring `refillToMax()` after confirmed entitlement and before continuation; cancellation, pending payment, no-entitlement results, and failures must not refill or navigate.
- [ ] Run focused tests and verify the missing helper/behavior fails for the expected reason.
- [ ] Add `refillToMax()` to EnergyContext: update refs/state/peek immediately, persist one `energy_state` AsyncStorage value best-effort, clear the recovery countdown, and cancel the existing energy-full notification. Add no timer or Firebase operation.
- [ ] Pass the ephemeral lesson ID through A/B/C paywalls. On confirmed purchase or restore, persist the selected Premium plan first, refill energy, emit the existing activation event, then replace the paywall with the exact lesson menu. Keep personal-plan activation behavior unchanged.
- [ ] Re-run focused tests and verify GREEN.

### Task 4: Independent review and final verification

**Files:** all files changed above.

- [ ] Run spec-compliance review: every approved requirement mapped to code/test; no V2 path changed; no lifetime-offer redesign; no production config write.
- [ ] Run quality/performance/cost review: inspect diff for new Firebase operations, timers, subscriptions, render loops, repeated AsyncStorage reads, stale intents, double navigation, and entitlement bypass.
- [ ] Fix every Critical/Important finding test-first and re-review.
- [ ] Run focused Jest suites, narrow TypeScript checks where available, `git diff --check`, and a literal diff audit for `docs/v2`, `modules/learning-v2`, and `admin/v2`.
- [ ] Report verified behavior and separately state that live `remote_config/app` values were not published.
