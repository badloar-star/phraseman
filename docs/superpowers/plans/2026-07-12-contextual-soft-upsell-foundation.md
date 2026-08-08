# Contextual Soft Upsell Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a disabled-by-default, measurable soft-upsell foundation and connect it safely to the first and eighth completed lesson without entering the overlay queue or changing any free limit.

**Architecture:** A pure policy module decides eligibility and destinations, a versioned account-scoped store serializes claims, and a reusable inline card renders only inside an owning screen. Overlay Arbiter exposes read-only occupancy; soft upsells never receive an `OverlayKey` and never wait globally.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, Firebase Analytics, Jest.

---

## File Map

- Create `app/soft_upsell_core.ts`: finite trigger/context/suppression types, priority and pure eligibility.
- Create `app/soft_upsell_state.ts`: versioned account/study-target storage and serialized session claim.
- Create `hooks/use_soft_upsell_opportunity.ts`: screen-owned eligibility, impression and actions.
- Create `components/SoftContextualUpsellCard.tsx`: accessible inline presentation only.
- Modify `components/OverlayArbiter.tsx`: read-only occupancy hook/API; no queue changes.
- Modify `app/remote_flags.ts`: disabled-by-default trigger flags.
- Modify `app/analytics.ts`: bounded soft-upsell events.
- Modify `app/lesson_complete.tsx`: first/eighth lesson candidate slot after result sequence.
- Add focused tests under `tests/` for every contract.

## Task 1: Pure policy core

**Files:**
- Create: `app/soft_upsell_core.ts`
- Create: `tests/soft_upsell_core.test.ts`

- [ ] **Step 1: Write the failing policy tests**

```ts
import { chooseSoftUpsell, type SoftUpsellCandidate } from '../app/soft_upsell_core';

const candidate = (trigger: SoftUpsellCandidate['trigger'], value: number): SoftUpsellCandidate => ({
  trigger,
  value,
  studyTarget: 'en',
});

const base = {
  candidates: [candidate('first_lesson', 1)],
  hasPremiumAccess: false,
  enabled: { first_lesson: true, free_lessons_complete: true },
  overlayOccupied: false,
  sessionClaimed: false,
  nowMs: 1_000_000_000,
  lastGlobalImpressionMs: null,
  contextDismissedAtMs: {},
  consumedMilestones: [],
};

test('first lesson goes to the personal path, never directly to paywall', () => {
  expect(chooseSoftUpsell(base)).toMatchObject({
    kind: 'eligible',
    opportunity: { context: 'first_lesson_success', destination: 'personal_plan' },
  });
});

test('eighth lesson has priority and goes to the existing paywall', () => {
  expect(chooseSoftUpsell({
    ...base,
    candidates: [candidate('first_lesson', 1), candidate('free_lessons_complete', 8)],
  })).toMatchObject({
    kind: 'eligible',
    opportunity: { context: 'free_lessons_complete', destination: 'paywall' },
  });
});

test.each([
  ['premium', { hasPremiumAccess: true }],
  ['overlay_occupied', { overlayOccupied: true }],
  ['session_cap', { sessionClaimed: true }],
  ['global_cooldown', { lastGlobalImpressionMs: 1_000_000_000 - 60_000 }],
])('suppresses %s', (reason, patch) => {
  expect(chooseSoftUpsell({ ...base, ...patch })).toEqual({ kind: 'suppressed', reason });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx jest --runTestsByPath tests/soft_upsell_core.test.ts --no-cache --runInBand`

Expected: FAIL because `app/soft_upsell_core.ts` does not exist.

- [ ] **Step 3: Implement the finite policy**

```ts
export type SoftUpsellTrigger =
  | 'first_lesson'
  | 'free_lessons_complete'
  | 'weekly_review'
  | 'second_ai_dialogue'
  | 'streak_milestone'
  | 'repeated_training';

export type SoftUpsellContext =
  | 'first_lesson_success'
  | 'free_lessons_complete'
  | 'weekly_review'
  | 'dialog_repeat_success'
  | 'streak_milestone'
  | 'trainer_repeat_success';

export type SoftUpsellCandidate = {
  trigger: SoftUpsellTrigger;
  value: number;
  studyTarget: 'en' | 'fr';
};

export type SoftUpsellSuppressionReason =
  | 'no_candidate'
  | 'premium'
  | 'disabled'
  | 'overlay_occupied'
  | 'session_cap'
  | 'global_cooldown'
  | 'context_cooldown'
  | 'milestone_consumed'
  | 'invalid_trigger_value';

export const SOFT_UPSELL_GLOBAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const SOFT_UPSELL_CONTEXT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Priority: free boundary > second dialogue > review > streak > first lesson > training.
export function chooseSoftUpsell(input: SoftUpsellPolicyInput): SoftUpsellDecision {
  // Return one finite decision. Exact trigger checks: lesson 1, lesson 8,
  // dialogue 2, and streak 7/14/30. Never use >= for one-time milestones.
}
```

Implement mappings:

- `first_lesson` value `1` → `first_lesson_success`, destination `personal_plan`.
- `free_lessons_complete` value `8` → same context, destination `paywall`.
- later triggers exist in types but remain invalid unless their exact values are supplied and enabled.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npx jest --runTestsByPath tests/soft_upsell_core.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit only this task**

```bash
git add app/soft_upsell_core.ts tests/soft_upsell_core.test.ts
git commit -m "feat: add soft upsell policy core"
```

## Task 2: Versioned state and serialized claim

**Files:**
- Create: `app/soft_upsell_state.ts`
- Create: `tests/soft_upsell_state.test.ts`

- [ ] **Step 1: Write failing storage and race tests**

```ts
import {
  claimSoftUpsell,
  markSoftUpsellDismissed,
  markSoftUpsellImpression,
  readSoftUpsellState,
  resetSoftUpsellSessionForTests,
} from '../app/soft_upsell_state';

test('two concurrent claims produce one winner', async () => {
  resetSoftUpsellSessionForTests();
  const results = await Promise.all([
    claimSoftUpsell({ accountScope: 'u1', studyTarget: 'en' }),
    claimSoftUpsell({ accountScope: 'u1', studyTarget: 'en' }),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
});

test('eligibility does not write the global impression timestamp', async () => {
  resetSoftUpsellSessionForTests();
  await claimSoftUpsell({ accountScope: 'u1', studyTarget: 'en' });
  expect((await readSoftUpsellState('u1', 'en')).lastGlobalImpressionMs).toBeNull();
});

test('dismiss and impression are persisted separately', async () => {
  await markSoftUpsellDismissed('u1', 'en', 'first_lesson_success', 10);
  await markSoftUpsellImpression('u1', 'en', 'first_lesson_success', 'first_lesson:1', 20);
  const state = await readSoftUpsellState('u1', 'en');
  expect(state.contextDismissedAtMs.first_lesson_success).toBe(10);
  expect(state.lastGlobalImpressionMs).toBe(20);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx jest --runTestsByPath tests/soft_upsell_state.test.ts --no-cache --runInBand`

Expected: FAIL because the state module does not exist.

- [ ] **Step 3: Implement scoped versioned state**

Use key `soft_upsell_state_v1:<accountScope>:<studyTarget>`. Parse unknown storage defensively into:

```ts
type PersistedSoftUpsellState = {
  schemaVersion: 1;
  lastGlobalImpressionMs: number | null;
  contextDismissedAtMs: Partial<Record<SoftUpsellContext, number>>;
  consumedMilestones: string[];
};
```

Keep an in-memory promise chain for storage writes and a boolean runtime claim. `claimSoftUpsell` claims only the runtime session; `markSoftUpsellImpression` writes cooldown and milestone. Bound `consumedMilestones` to the newest 32 values.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npx jest --runTestsByPath tests/soft_upsell_state.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit only this task**

```bash
git add app/soft_upsell_state.ts tests/soft_upsell_state.test.ts
git commit -m "feat: persist soft upsell eligibility state"
```

## Task 3: Read-only overlay occupancy

**Files:**
- Modify: `components/OverlayArbiter.tsx`
- Create: `tests/soft_upsell_overlay_contract.test.ts`

- [ ] **Step 1: Add failing source contracts**

```ts
import fs from 'node:fs';

test('soft upsell reads occupancy but never joins the overlay queue', () => {
  const provider = fs.readFileSync('components/OverlayArbiter.tsx', 'utf8');
  const core = fs.readFileSync('components/overlay_arbiter_core.ts', 'utf8');
  expect(provider).toContain('useOverlayOccupied');
  expect(core).not.toContain('softUpsell');
  expect(core).not.toContain('soft_upsell');
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx jest --runTestsByPath tests/soft_upsell_overlay_contract.test.ts --no-cache --runInBand`

Expected: FAIL because `useOverlayOccupied` is absent.

- [ ] **Step 3: Expose occupancy without changing queue state**

Add `occupied: active !== null || handoffGap` to the existing arbiter context and export:

```ts
export function useOverlayOccupied(): boolean {
  return useContext(OverlayContext).occupied;
}
```

Do not add a key, wants entry, priority, native-modal entry, timeout, or watchdog branch.

- [ ] **Step 4: Run contracts**

Run: `npx jest --runTestsByPath tests/soft_upsell_overlay_contract.test.ts tests/overlay_arbiter.test.ts --no-cache --runInBand`

Expected: PASS with the existing priority list unchanged.

- [ ] **Step 5: Commit only this task**

```bash
git add components/OverlayArbiter.tsx tests/soft_upsell_overlay_contract.test.ts
git commit -m "feat: expose read only overlay occupancy"
```

## Task 4: Remote kill switches and analytics contract

**Files:**
- Modify: `app/remote_flags.ts`
- Modify: `app/analytics.ts`
- Create: `tests/soft_upsell_remote_flags.test.ts`
- Create: `tests/soft_upsell_analytics.test.ts`

- [ ] **Step 1: Add failing tests for safe defaults and bounded events**

Require six boolean keys, all defaulting to `false`, and event names:

```ts
const SOFT_UPSELL_EVENTS = [
  'soft_upsell_eligible',
  'soft_upsell_impression',
  'soft_upsell_cta',
  'soft_upsell_dismiss',
  'soft_upsell_suppressed',
] as const;
```

Assert that analytics parameters exclude `review_text`, arbitrary `error`, user IDs and free text.

- [ ] **Step 2: Run and confirm RED**

Run: `npx jest --runTestsByPath tests/soft_upsell_remote_flags.test.ts tests/soft_upsell_analytics.test.ts --no-cache --runInBand`

Expected: FAIL because keys/events are absent.

- [ ] **Step 3: Implement six disabled flags and bounded tracking helper**

Keys:

```ts
soft_upsell_first_lesson_enabled
soft_upsell_free_lessons_complete_enabled
soft_upsell_weekly_review_enabled
soft_upsell_second_ai_dialogue_enabled
soft_upsell_streak_enabled
soft_upsell_repeated_training_enabled
```

Add `trackSoftUpsellEvent(name, params)` that accepts only finite context, trigger, destination, suppression reason, study target, overlay flag, schema version and one numeric trigger value.

- [ ] **Step 4: Run focused tests**

Run: `npx jest --runTestsByPath tests/soft_upsell_remote_flags.test.ts tests/soft_upsell_analytics.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit only this task**

```bash
git add app/remote_flags.ts app/analytics.ts tests/soft_upsell_remote_flags.test.ts tests/soft_upsell_analytics.test.ts
git commit -m "feat: configure and measure soft upsells"
```

## Task 5: Shared inline card and lifecycle hook

**Files:**
- Create: `components/SoftContextualUpsellCard.tsx`
- Create: `hooks/use_soft_upsell_opportunity.ts`
- Create: `tests/soft_contextual_upsell_card_contract.test.ts`
- Create: `tests/use_soft_upsell_opportunity.test.ts`

- [ ] **Step 1: Add failing contracts**

Verify the component uses `View`/`Pressable`, not `Modal`, provides accessibility roles/labels, has 44 px minimum actions, and uses dark CTA foreground on the lime accent. Hook tests must prove impression is not written at eligibility and is written only through `onImpression`.

- [ ] **Step 2: Run and confirm RED**

Run: `npx jest --runTestsByPath tests/soft_contextual_upsell_card_contract.test.ts tests/use_soft_upsell_opportunity.test.ts --no-cache --runInBand`

Expected: FAIL because component and hook are absent.

- [ ] **Step 3: Implement the screen-owned hook API**

```ts
type UseSoftUpsellOpportunityInput = {
  candidates: SoftUpsellCandidate[];
  accountScope: string;
  studyTarget: 'en' | 'fr';
  hasPremiumAccess: boolean;
};

type UseSoftUpsellOpportunityResult = {
  opportunity: SoftUpsellOpportunity | null;
  onImpression(): Promise<void>;
  onDismiss(): Promise<void>;
  onCta(): Promise<void>;
};
```

The hook reads `useOverlayOccupied`, evaluates policy once per candidate signature, serializes claim, and does not poll or wait for overlay release.

- [ ] **Step 4: Implement the inline card**

Use project theme tokens and existing icon components. Render finalized title/body/CTA supplied by the owner. `onLayout` or a mount effect calls `onImpression` once. Dismiss remains visible and does not navigate.

- [ ] **Step 5: Run focused tests and lint**

Run: `npx jest --runTestsByPath tests/soft_contextual_upsell_card_contract.test.ts tests/use_soft_upsell_opportunity.test.ts --no-cache --runInBand`

Run: `npx eslint components/SoftContextualUpsellCard.tsx hooks/use_soft_upsell_opportunity.ts`

Expected: PASS with no lint errors.

- [ ] **Step 6: Commit only this task**

```bash
git add components/SoftContextualUpsellCard.tsx hooks/use_soft_upsell_opportunity.ts tests/soft_contextual_upsell_card_contract.test.ts tests/use_soft_upsell_opportunity.test.ts
git commit -m "feat: add contextual soft upsell card"
```

## Task 6: First and eighth lesson integration

**Files:**
- Modify: `app/lesson_complete.tsx`
- Create: `tests/lesson_complete_soft_upsell_contract.test.ts`

- [ ] **Step 1: Add failing lesson contracts**

Verify:

- candidates are derived from canonical first completion and exact lesson ID/count eight;
- card renders only when `seqDone` is true;
- first-lesson CTA navigates to existing personal-plan setup;
- eighth-lesson CTA navigates to `/premium_modal` with `context: 'free_lessons_complete'`;
- no automatic navigation occurs in an effect;
- repeated completion does not create a new milestone.

- [ ] **Step 2: Run and confirm RED**

Run: `npx jest --runTestsByPath tests/lesson_complete_soft_upsell_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the integration is absent.

- [ ] **Step 3: Add the inline slot after the existing results sequence**

Use the canonical lesson ID and first-completion signal already present on the screen. Build at most two candidates; policy chooses one. Render the card in final screen geometry only after `seqDone` and before the normal continuation controls without replacing them.

Navigation:

```ts
if (opportunity.destination === 'personal_plan') {
  router.push('/personal_plan_setup');
} else {
  router.push({
    pathname: '/premium_modal',
    params: { context: 'free_lessons_complete', source: 'lesson_complete_soft_upsell' },
  } as never);
}
```

If the repository's canonical personal-plan route differs, use the existing route already invoked by onboarding/home and update the contract to that exact existing route rather than introducing a duplicate screen.

- [ ] **Step 4: Run focused lesson and navigation tests**

Run: `npx jest --runTestsByPath tests/lesson_complete_soft_upsell_contract.test.ts tests/lesson_menu_premium_paywall_loop_guard.test.ts tests/personal_plan_paywall_loop_guard.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Run protected overlay/performance guards**

Run: `npx jest --runTestsByPath tests/overlay_arbiter.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand`

Expected: PASS without updating allowlists.

- [ ] **Step 6: Commit only this task**

```bash
git add app/lesson_complete.tsx tests/lesson_complete_soft_upsell_contract.test.ts
git commit -m "feat: add lesson completion soft upsells"
```

## Task 7: Foundation verification and rollout gate

**Files:**
- Test only; no production changes unless a focused failure reveals a defect.

- [ ] **Step 1: Confirm locked limits**

Run: `npx jest --runTestsByPath tests/dialogs_limit_session.test.ts tests/ai_dialog_level_lock.test.ts tests/feature_gates_premium_free.test.ts tests/quiz_daily_limit.test.ts tests/flashcard_pack_purchase_refresh_contract.test.ts --no-cache --runInBand`

Expected: PASS; AI dialogue remains two lifetime and unrelated limits remain unchanged.

- [ ] **Step 2: Confirm every new flag defaults off**

Run: `npx jest --runTestsByPath tests/soft_upsell_remote_flags.test.ts tests/lesson_complete_soft_upsell_contract.test.ts --no-cache --runInBand`

Expected: PASS; production behavior is inert until a flag is enabled.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors; only task-owned files are staged or committed by this plan, while pre-existing user changes remain untouched.

- [ ] **Step 4: Submit the actual final diff and test evidence to Advisor**

Expected: `DECISION: APPROVED`. If changes are required, apply them and repeat the focused tests before completion.

## Deferred Follow-up Plans

After the foundation is verified, write separate implementation plans for:

1. Weekly Review real-insight integration.
2. Exact second AI-dialogue completion integration, explicitly preserving `2 lifetime`.
3. Exact streak 7/14/30 milestone integration.
4. Successful exam boundary integration after identifying the canonical exam-success persistence point.
5. Repeated training only after its canonical success event is specified.

