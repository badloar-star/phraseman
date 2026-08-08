# Dev Hub And Level-Up Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved Threshold level-up modal in the app and expose safe, dev-only previews plus local Plus controls from a new Home-header Dev Hub.

**Architecture:** Keep `GlobalLevelUpHandler` as the only owner of real level-up rewards and spin routing. Add a separately gated Dev Hub route that renders the same modal with synthetic props and local animation values, and isolate local Plus overrides in a store-release-fused helper. Register the route through the existing dev-route map and expose one small Home-header icon only when `ENABLE_DEV_TOOLS` is true.

**Tech Stack:** Expo Router, React Native 0.81, React 19, Animated native driver, AsyncStorage, Jest/ts-jest

---

### Task 1: Lock the final palette and Dev Hub contracts

**Files:**
- Modify: `tests/level_up_threshold_modal_contract.test.ts`
- Create: `tests/dev_hub_contract.test.ts`

- [ ] Add a failing assertion for Sage Porcelain eucalyptus `accentSecondary` and AA contrast.
- [ ] Add failing source contracts for the gated route, Home icon, two non-mutating previews, and store-release-fused Plus controls.
- [ ] Run both tests and confirm they fail for the missing implementation.

### Task 2: Add safe local Plus controls

**Files:**
- Create: `app/dev_plus_controls.ts`

- [ ] Implement `readDevLocalPlusOverride` and `setDevLocalPlusOverride` using only `tester_no_limits` and `tester_no_premium`.
- [ ] Reject writes unless dev tools are enabled and the build is not a store release.
- [ ] Emit existing premium activation/deactivation events after storage succeeds.
- [ ] Run the focused Dev Hub contract.

### Task 3: Build and register the Dev Hub

**Files:**
- Create: `components/dev/DevHubScreen.tsx`
- Create: `app/dev_hub.tsx`
- Modify: `constants/devRoutes.ts`
- Modify: `app/(tabs)/home.tsx`

- [ ] Add the gated `dev_hub` route to `DEV_UTILITY_ROUTE_NAMES`.
- [ ] Add a small accessible flask icon to the Home header under `ENABLE_DEV_TOOLS`.
- [ ] Build categorized Preview and Access sections using current theme tokens.
- [ ] Wire Ordinary and Milestone previews to `LevelUpThresholdModal` with synthetic state only.
- [ ] Wire Grant Plus and Remove Plus buttons to the local override helper and `PremiumContext.reload`.

### Task 4: Apply the approved palette and verify

**Files:**
- Modify: `components/levelUpThresholdTheme.ts`
- Test: `tests/level_up_threshold_modal_contract.test.ts`
- Test: `tests/dev_hub_contract.test.ts`

- [ ] Replace Sage Porcelain bronze with `#4F786D` eucalyptus.
- [ ] Run focused Jest tests, TypeScript, and the canonical workspace guard.
- [ ] Launch the dev app when the existing runtime is available and verify the Home icon, both previews, Plus controls, theme adaptation, reduced motion, and spin-button non-mutation.
