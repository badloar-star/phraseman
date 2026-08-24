# Onboarding Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair onboarding purchase truthfulness, notification consent, embedded navigation, completion/auth races, motion, accessibility, copy, and responsive geometry without removing existing functionality.

**Architecture:** Add small pure/persisted policies for trial presentation and notification choice, then consume them from the existing onboarding, purchase hook, and root handoff. Keep UI changes local to `CleanOnboarding`, reusing existing project shells and motion/accessibility patterns where they fit.

**Tech Stack:** TypeScript, React Native, Expo Router, RevenueCat, AsyncStorage, Jest, React Native Accessibility APIs.

---

### Task 1: Trial presentation and subscription disclosure

**Files:**
- Modify: `app/paywall_trial_info.ts`
- Modify: `app/paywall_purchase.ts`
- Modify: `components/CleanOnboarding.tsx`
- Test: `tests/paywall_trial_info.test.ts`
- Test: `tests/onboarding_trial_truth_contract.test.ts`

- [ ] Add failing tests proving store failure/unknown/ineligible states never return synthetic trial days, while an eligible zero-price intro phase returns its duration.
- [ ] Run the two tests and confirm failure on the current `offeringsFailed ? 3` behavior.
- [ ] Add a typed trial-presentation policy and expose eligibility state from the purchase hook; unknown eligibility renders ordinary terms.
- [ ] Add selected-plan disclosure: trial duration when confirmed, then localized store price/period, automatic renewal, and store cancellation; lifetime stays one-time.
- [ ] Disable unavailable secondary-sheet purchase actions and provide retry/error UI.
- [ ] Run both tests and the existing paywall pricing/trial tests to green.

### Task 2: Persist and respect notification choice

**Files:**
- Create: `app/onboarding_notification_choice.ts`
- Modify: `components/CleanOnboarding.tsx`
- Modify: `app/paywall_purchase.ts`
- Modify: `app/_layout.tsx`
- Test: `tests/onboarding_notification_choice.test.ts`
- Test: `tests/onboarding_notification_skip_interaction_contract.test.ts`

- [ ] Add failing tests for `skip`, `allow`, and blocked persistence plus a shared `shouldPrompt` policy.
- [ ] Run tests and confirm the missing module/behavior fails.
- [ ] Implement storage helpers and use them in all three prompting/scheduling locations.
- [ ] Make trial-reminder copy conditional on real trial state and notification choice.
- [ ] Run notification and paywall purchase tests to green.

### Task 3: Embedded purchase/restore navigation

**Files:**
- Modify: `app/paywall_purchase.ts`
- Test: `tests/paywall_onboarding_embedded_navigation.test.ts`

- [ ] Add a failing test proving both `onboarding` and `onboarding_plan` return before `dismissPaywallModal` after purchase and restore.
- [ ] Run it and confirm `onboarding_plan` fails.
- [ ] Centralize the embedded-onboarding predicate and return after `premium_activated` for both sources.
- [ ] Run the new test plus activation/restore tests to green.

### Task 4: Guaranteed completion handoff

**Files:**
- Modify: `app/_layout.tsx`
- Test: `tests/onboarding_completion_handoff_contract.test.ts`
- Test: `tests/home_onboarding_runtime_contract.test.ts`

- [ ] Add a failing contract showing Home navigation and overlay removal are not gated by premium verification or uncaught storage writes.
- [ ] Run and confirm the current ordering fails.
- [ ] Move durable handoff into a guarded `try/finally`; background or catch nonessential premium/welcome work.
- [ ] Run completion and home-runtime tests to green.

### Task 5: Serialized provider sign-in

**Files:**
- Modify: `components/CleanOnboarding.tsx`
- Test: `tests/onboarding_auth_operation_generation.test.ts`
- Test: `tests/onboarding_auth_busy_state_contract.test.ts`

- [ ] Add failing tests for one active provider operation after the UI deadline and stale-result UI suppression.
- [ ] Run and confirm the current `Promise.race`/`finally` behavior fails.
- [ ] Add operation generation and separate deadline-message state without releasing the identity-operation lock until settlement.
- [ ] Run auth tests to green.

### Task 6: Reduced motion and responsive geometry

**Files:**
- Modify: `components/CleanOnboarding.tsx`
- Modify: `app/_layout.tsx`
- Test: `tests/onboarding_reduced_motion_contract.test.ts`
- Test: `tests/onboarding_responsive_layout.test.ts`
- Test: `tests/motion_hybrid_contract.test.ts`

- [ ] Add failing tests requiring reduced-motion subscription, no module-level window geometry, and Motion Hybrid token use.
- [ ] Run and confirm the current animations/dimensions fail.
- [ ] Add a reduced-motion hook, switch loops/rotations/confetti/large translations to static or fade-only outcomes, and compute geometry from `useWindowDimensions`.
- [ ] Run the focused motion/responsive tests to green.

### Task 7: Accessible modals, text, targets, contrast, and copy

**Files:**
- Modify: `components/CleanOnboarding.tsx`
- Test: `tests/onboarding_accessibility_contract.test.ts`
- Test: `tests/onboarding_copy_contract.test.ts`

- [ ] Add failing assertions for modal semantics/scrolling/focus, live errors, 48 dp targets, dark-on-green foreground, responsive price text, consistent informal voice, and conditional push copy.
- [ ] Run and confirm failures.
- [ ] Reuse the accessible project sheet pattern where compatible; otherwise add modal accessibility/focus behavior locally without changing capabilities.
- [ ] Darken muted/error text, enlarge targets, allow price copy to reflow, announce errors, and normalize copy.
- [ ] Run accessibility/copy tests to green.

### Task 8: Focused verification

**Files:**
- Verify only; do not mutate unrelated dirty files.

- [ ] Run all new tests and the existing onboarding/paywall/motion suites used by the audit.
- [ ] Run TypeScript and report both the global status and any onboarding-related diagnostics separately.
- [ ] Review `git diff --check` and the targeted diff for accidental unrelated changes.
- [ ] Report device/store checks that remain unverified rather than claiming them.
