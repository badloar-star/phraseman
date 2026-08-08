# DEV Center Sheet Implementation Plan

> **For agentic workers:** Execute this plan in the canonical `feature/referral-roulette` checkout only. Do not create a branch, worktree, or subagent. Keep one writer, preserve unrelated dirty changes, and verify every task with the focused command shown below.

**Goal:** Replace the retired Settings DEV entry and provisional full-screen DEV route with one developer-only bottom sheet opened by the existing Home header flask icon. The sheet must preview both real level-up variants without mutating progress and provide account-scoped, device-local Plus grant/revoke controls that never write to Firebase or RevenueCat.

**Architecture:** Home owns only `visible` state and keeps the existing `home-dev-hub-button`. A developer-only gate lazily renders `DevHubSheet`, so store builds expose neither a route nor a second entry point. The sheet renders tools from a typed, ordered registry. Level previews reuse `LevelUpThresholdModal` with a typed `standard | milestone` variant and inert callbacks. Plus simulation is stored under a key derived from the active account generation stable ID and is combined additively with authoritative paid/VIP access in `PremiumContext`.

**Tech Stack:** React Native, Expo Router, TypeScript, React Native `Modal`/`Animated`/`PanResponder`, AsyncStorage, Jest contract tests, ESLint, TypeScript.

---

## Task 1: Lock the modal-only contract with failing tests

**Files:**

- Modify: `tests/dev_hub_contract.test.ts`
- Modify: `tests/mobile_admin_panel_retirement_contract.test.ts` only if its existing assertions need a precise modal-only addition

1. Replace route-oriented assertions with contracts that require:

   - exactly the existing `home-dev-hub-button` and `flask-outline` trigger;
   - local Home visibility state instead of `router.push`;
   - `DevHubSheet` with `visible` and `onClose`;
   - close paths for X, backdrop, Android `onRequestClose`, and downward swipe;
   - an ordered typed registry with preview and subscription categories;
   - no `app/dev_hub.tsx`, no `DEV_HUB_ROUTE`, and no `Stack.Screen` registration;
   - both preview variants pass `spinReward` and never import progress/persistence mutation APIs.

2. Add account-scoping assertions for Plus:

   - storage keys contain the current account stable ID;
   - helper code never references Firebase, RevenueCat, `tester_no_premium`, or `tester_no_limits`;
   - `removed` removes only the DEV grant and cannot suppress genuine paid/VIP access.

3. Run RED:

   ```powershell
   npx jest --runTestsByPath tests/dev_hub_contract.test.ts tests/mobile_admin_panel_retirement_contract.test.ts --no-cache --runInBand
   ```

   Expected: failures point to the provisional route/full-screen screen and global tester flags.

## Task 2: Implement account-scoped local Plus simulation

**Files:**

- Modify: `app/dev_plus_controls.ts`
- Modify: `components/PremiumContext.tsx`
- Test: `tests/dev_hub_contract.test.ts`

1. Change the helper API to require an account stable ID:

   ```ts
   export type DevLocalPlusOverride = 'granted' | 'removed' | 'inherit';

   export function getDevLocalPlusStorageKey(stableId: string): string {
     return `dev_local_plus_override_v1:${encodeURIComponent(stableId)}`;
   }

   export async function readDevLocalPlusOverride(stableId: string): Promise<DevLocalPlusOverride>;
   export async function setDevLocalPlusOverride(
     stableId: string,
     value: Exclude<DevLocalPlusOverride, 'inherit'>,
   ): Promise<void>;
   ```

2. Keep the helper inert outside enabled non-store DEV builds. Store only the new scoped key; do not reuse legacy global tester flags and do not emit fake purchase events.

3. In `PremiumContext.reload`, capture the current account generation, read its DEV override, reject stale async results with `isCurrentAccountGeneration`, and combine it as:

   ```ts
   const hasAuthoritativeAccess = hasPaidAccess || hasVipAccess || hasIntroAccess;
   const hasDevGrant = devOverride === 'granted';
   const hasPremiumAccess = hasAuthoritativeAccess || hasDevGrant;
   ```

   `removed` therefore clears only the local DEV grant. Existing genuine paid/VIP/intro sources stay authoritative.

4. Run the focused test until GREEN:

   ```powershell
   npx jest --runTestsByPath tests/dev_hub_contract.test.ts --no-cache --runInBand
   ```

## Task 3: Build the scalable DEV bottom sheet and reuse the current icon

**Files:**

- Create: `components/dev/devToolRegistry.ts`
- Replace: `components/dev/DevHubScreen.tsx` with `components/dev/DevHubSheet.tsx`
- Create or modify: a small developer-only render gate colocated under `components/dev/`
- Modify: `app/(tabs)/home.tsx`
- Delete: `app/dev_hub.tsx`
- Modify: `constants/devRoutes.ts`
- Modify: `app/_layout.tsx` only if the provisional route is explicitly registered there
- Test: `tests/dev_hub_contract.test.ts`

1. Define a deterministic registry:

   ```ts
   export const DEV_TOOL_SECTIONS = [
     {
       id: 'level-previews',
       order: 10,
       title: 'Повышение уровня',
       tools: [
         { id: 'level-standard', order: 10, action: 'preview-level-standard' },
         { id: 'level-milestone', order: 20, action: 'preview-level-milestone' },
       ],
     },
     {
       id: 'subscription',
       order: 20,
       title: 'Plus',
       tools: [
         { id: 'plus-grant', order: 10, action: 'grant-plus' },
         { id: 'plus-revoke', order: 20, action: 'revoke-plus' },
       ],
     },
   ] as const satisfies readonly DevToolSection[];
   ```

2. Implement `DevHubSheet({ visible, onClose })` as a transparent bottom `Modal` with:

   - backdrop press close;
   - header close button with an accessible label;
   - `onRequestClose={onClose}` for Android Back;
   - a drag handle and `PanResponder` threshold for swipe-down close;
   - safe-area bottom padding, scrollable content, and theme tokens;
   - only `400` and `700` font weights and no decorative container borders;
   - buttons generated by sorted registry data, not duplicated hand-written sections.

3. In Home, add only `const [devHubVisible, setDevHubVisible] = useState(false)`, change the existing flask button action to `setDevHubVisible(true)`, and render the gated sheet once. Do not add another icon or button.

4. Remove the provisional route file/constants/registration so the sheet is the only entry point.

5. Run GREEN:

   ```powershell
   npx jest --runTestsByPath tests/dev_hub_contract.test.ts tests/mobile_admin_panel_retirement_contract.test.ts --no-cache --runInBand
   ```

## Task 4: Reuse the real level-up UI for two non-mutating previews

**Files:**

- Modify: `components/LevelUpThresholdModal.tsx`
- Modify: `components/levelUpThresholdTheme.ts` only for variant tokens that are actually needed
- Modify: `components/dev/DevHubSheet.tsx`
- Modify: `tests/level_up_threshold_modal_contract.test.ts`
- Modify: `tests/level_up_sheet_contract.test.ts` to follow the extracted real component rather than stale parent-file internals

1. Add and test a typed presentation prop:

   ```ts
   export type LevelUpPreviewVariant = 'standard' | 'milestone';

   type Props = {
     variant?: LevelUpPreviewVariant;
     // existing props remain unchanged
   };
   ```

2. Keep the ordinary variant compact and the fifth-level variant more celebratory using timing/scale/glow differences only. Both variants must receive `spinReward={true}` and use the same real modal component.

3. In the DEV host, use fixed preview values and inert callbacks only. The sheet must not import XP, level, queue, gift, spin-credit, Firebase, or server mutation modules. Closing a preview only clears local component state.

4. Respect reduced-motion behavior already used by the app; preview content remains understandable without motion.

5. Fix the existing typed animated-style error without casts that erase the component contract.

6. Run focused tests:

   ```powershell
   npx jest --runTestsByPath tests/level_up_threshold_modal_contract.test.ts tests/level_up_sheet_contract.test.ts tests/level_up_spin_sheet_contract.test.ts tests/dev_hub_contract.test.ts --no-cache --runInBand
   ```

## Task 5: Focused verification and review

**Files:** All touched implementation and test files only.

1. Run focused lint:

   ```powershell
   npx eslint 'app/(tabs)/home.tsx' app/dev_plus_controls.ts components/PremiumContext.tsx components/dev/DevHubSheet.tsx components/dev/devToolRegistry.ts components/LevelUpThresholdModal.tsx components/levelUpThresholdTheme.ts
   ```

2. Run the repository typecheck command if available; otherwise run the narrow TypeScript command covering the touched component graph and report any inherited failures separately.

3. Re-run all focused Jest paths from Tasks 3 and 4 with `--no-cache --runInBand`.

4. Inspect `git diff --check`, the exact touched-file diff, and `git status --short`. Do not stage, revert, or rewrite unrelated dirty files.

5. Perform the required completion review against the approved design:

   - one existing flask icon only;
   - bottom sheet, not route;
   - four close paths;
   - old Settings entry absent;
   - registry-driven ordering;
   - two spin previews with distinct motion and zero progression mutations;
   - Plus override scoped to active account/device and unable to override genuine entitlement.
