# Universal Energy Start Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one cross-theme animated energy asset and place its `−1`/`∞` cost marker on every button that directly starts or restarts a training activity.

**Architecture:** Keep charging in `EnergyContext` and the destination activity gates; keep presentation in one shared `EnergyCostBadge`. Inventory entry points from real `spendOne`/`spendAmount(1)` calls, then enforce a source contract that pairs every direct paid start/restart CTA with the badge while excluding free navigation. Learning V2 is a gated final task and must remain untouched while its mandatory preflight reports `HOLD`.

**Tech Stack:** React Native, Expo Image, React Native Animated, TypeScript, Jest source-contract tests, Sharp WebP verification, built-in Codex image generation.

**Workspace constraint:** Execute in the current checkout. `AGENTS.md` forbids creating a branch, worktree, or delegated coding task without a separate explicit owner request.

---

## File map

- Create `assets/images/energy/energy-start-cost.webp`: one transparent universal energy crystal.
- Modify `components/EnergyCostBadge.tsx`: asset, `−1`/`∞`, external geometry, finite motion and accessibility.
- Modify `tests/energy_start_cost_contract.test.ts`: RED/GREEN shared component and paid-entry matrix.
- Modify `components/DialogsTabContent.tsx`: cost on repeat scenario tiles that directly enter a paid dialog.
- Modify `app/flashcards_blitz_session.tsx` and `app/flashcards/SessionResultScreen.tsx`: add a `retryShowsEnergyCost` prop and enable it only for the paid Blitz restart.
- Modify `app/diagnostic_test.tsx`: external cost on start and restart; remove the duplicate emoji cost sentence.
- Modify `app/exam.tsx`, `app/level_exam.tsx` and `components/level-exam/LevelExamIntro.tsx`: external shared cost on start/restart; replace the old inline asset-inside-button presentation.
- Modify `app/personal_plan_navigation.ts`, `app/personal_plan.tsx`, `app/personal_plan_stats_screen.tsx`, `app/personal_plan_theory.tsx`, `app/personal_plan_quiz.tsx` and `app/personal_plan_exercise.tsx`: use one exact destination predicate to decorate direct paid exercise starts and paid next-task transitions.
- Modify `app/lesson_menu.tsx`: keep cost on direct paid starts, remove it from list-only words/verbs navigation, preserve free Theory.
- Conditional after a green preflight: modify `app/learning-v2/session/[id].tsx` and `app/learning-v2/lesson/[id].tsx` without touching learner content sources.

## Task 1: RED contract for the universal badge

**Files:**
- Modify: `tests/energy_start_cost_contract.test.ts`
- Test: `tests/energy_start_cost_contract.test.ts`

- [ ] **Step 1: Add a failing shared-component contract**

Add these assertions:

```ts
it('uses one universal external energy asset with paid and unlimited labels', () => {
  const badge = read('components/EnergyCostBadge.tsx');
  expect(badge).toContain(
    'require("../assets/images/energy/energy-start-cost.webp")',
  );
  expect(badge).toContain('source={ENERGY_START_COST_IMAGE}');
  expect(badge).toContain("isUnlimited ? '∞' : `−${cost}`");
  expect(badge).not.toContain('if (isUnlimited) return null');
  expect(badge).not.toContain('backgroundColor: urgent');
  expect(badge).toContain('top: -18');
  expect(badge).toContain('right: -12');
  expect(badge).toContain('LUM.contentMs');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run with the repository traffic-light slot:

```bash
bash .claude/semaphore/slot.sh acquire "jest energy badge RED"
npx jest --runInBand tests/energy_start_cost_contract.test.ts
bash .claude/semaphore/slot.sh release
```

Expected: FAIL because the component still renders only text, hides for unlimited energy and has no universal static `require()`.

- [ ] **Step 3: Record the decisive RED lines**

Save bulky output outside the conversation if needed. Record the failing assertion names and failure count in the final report.

## Task 2: Implement the shared external animated badge

**Files:**
- Modify: `components/EnergyCostBadge.tsx`
- Test: `tests/energy_start_cost_contract.test.ts`

- [ ] **Step 1: Wire the future asset before generating it**

Use Expo Image and the required static path:

```ts
import { Image } from 'expo-image';
import { LUM, SUITE } from '../constants/motionHybrid';

const ENERGY_START_COST_IMAGE = require(
  '../assets/images/energy/energy-start-cost.webp',
);
```

- [ ] **Step 2: Replace the circular text badge with a transparent asset row**

The render contract is:

```tsx
<Animated.View
  pointerEvents="none"
  accessibilityRole="text"
  accessibilityLabel={
    isUnlimited ? 'Безлимитная энергия' : `Стоимость запуска: ${cost} энергия`
  }
  style={[styles.badge, styles.topRight, animatedStyle, style]}
>
  <Animated.View style={assetAnimatedStyle}>
    <Image
      source={ENERGY_START_COST_IMAGE}
      style={styles.asset}
      contentFit="contain"
      accessible={false}
      importantForAccessibility="no"
    />
  </Animated.View>
  <Text style={[styles.label, { color: t.textPrimary, textShadowColor: t.bgPrimary }]}> 
    {isUnlimited ? '∞' : `−${cost}`}
  </Text>
</Animated.View>
```

The actual implementation must avoid the trailing whitespace shown for code readability and must preserve `testID`, `corner` and `style` props.

- [ ] **Step 3: Use finite Motion Hybrid movement**

Use `LUM.contentMs`, `LUM.bloomMs`, `LUM.rimMs` and `SUITE.pulse`; do not introduce local timing or spring numbers. Animate opacity, translateY, scale and a small interpolated rotation. Run one entrance and one finite light impulse, stop both on cleanup, and set the final frame immediately when Reduce Motion is enabled. Do not add an infinite `Animated.loop`.

- [ ] **Step 4: Apply exact geometry with no circle**

```ts
badge: {
  position: 'absolute',
  flexDirection: 'row',
  alignItems: 'center',
  zIndex: 20,
  elevation: 20,
},
asset: { width: 42, height: 42 },
topRight: { top: -18, right: -12 },
topLeft: { top: -18, left: -12 },
label: {
  fontWeight: '700',
  fontSize: 15,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
},
```

There must be no circular background, `borderRadius: 999`, capsule or border around the asset.

## Task 3: Generate, compress and verify the single asset

**Files:**
- Create: `assets/images/energy/energy-start-cost.webp`
- Temporary raw source: ignored Codex generation directory or `.codex-tmp/energy-start-cost/`

- [ ] **Step 1: Generate exactly one transparent raster asset with the built-in image tool**

Use this final prompt:

```text
A single small mobile-game energy icon, a chunky faceted lightning-bolt crystal,
golden yellow luminous core, warm ivory inner highlight, crisp white inner
outline and thick charcoal graphite outer outline, transparent background,
no circle, no badge, no container, no text, no numbers, no letters, no shadow
plate, centered with generous transparent padding, readable at 42 px, polished
casual premium game UI asset, front three-quarter view, clean silhouette.
```

Generate one image only. Do not use a project OpenAI API key.

- [ ] **Step 2: Inspect the generated source**

Verify visually that it contains one bolt, transparent background, no circle and no text. Reject only for a specific invariant failure; do not generate speculative variants.

- [ ] **Step 3: Copy the selected source into an ignored working directory and compress**

Use the bundled Sharp runtime to trim transparent excess, contain the icon on a square canvas and write WebP quality 72 with alpha preserved. Do not write the raw generated PNG into `assets/images/**`.

- [ ] **Step 4: Verify asset metadata**

Run a narrow Sharp check that prints only width, height, format, alpha and byte size. Expected: WebP, alpha present, one final file, small enough for a 42 px UI slot.

- [ ] **Step 5: Run the badge contract and verify GREEN**

```bash
bash .claude/semaphore/slot.sh acquire "jest energy badge GREEN"
npx jest --runInBand tests/energy_start_cost_contract.test.ts
bash .claude/semaphore/slot.sh release
```

Expected: the new shared-component assertions pass.

## Task 4: RED/GREEN paid-start coverage outside Learning V2

**Files:**
- Modify: `tests/energy_start_cost_contract.test.ts`
- Modify the non-V2 UI files listed in the file map.

- [ ] **Step 1: Add a failing entry-point matrix**

The test must name the button or callback, not merely check one badge somewhere in the file. Use slices around stable callback/testID tokens. Minimum matrix:

```ts
const paidStartContracts = [
  ['components/DialogsTabContent.tsx', 'openScenarioDestination', 'EnergyCostBadge'],
  ['app/flashcards_blitz_session.tsx', 'onRetryWrong={restart}', 'EnergyCostBadge'],
  ['app/diagnostic_test.tsx', 'tryStartDiagnosticQuiz', 'EnergyCostBadge'],
  ['app/diagnostic_test.tsx', 'tryRestartDiagnosticQuiz', 'EnergyCostBadge'],
  ['app/level_exam.tsx', 'Начать зачёт', 'EnergyCostBadge'],
  ['app/level_exam.tsx', 'Попробовать ещё раз', 'EnergyCostBadge'],
  ['components/level-exam/LevelExamIntro.tsx', 'level-exam-start', 'EnergyCostBadge'],
] as const;
```

For personal-plan routes, add and assert the exact helper `personalPlanTaskStartsPaidExercise(task)`. It returns `true` for `plan_phrase_lesson`, `recall`, `plan_phrase_recall`, `plan_exercise`, `mistake_practice` and `flashcards`, because each destination enters an existing paid activity; it returns `false` for `lesson` (opens a menu) and `quiz` (free). For lesson menu, assert `lesson-menu-theory`, list-only words and list-only verbs are not members of `ENERGY_COST_MENU_ITEMS`.

- [ ] **Step 2: Run the focused test and verify RED**

Expected: failures for each audited paid CTA that currently lacks the badge and for the two false menu prices.

- [ ] **Step 3: Add the shared badge to direct paid CTAs**

Wrap or place `EnergyCostBadge` in an immediate `position: relative; overflow: visible` container around each start/restart button. Reuse the component; do not create screen-specific energy images, circles or timing values.

- [ ] **Step 4: Correct misleading menu placement**

Keep `lesson-menu-primary` and `lesson-menu-prepositions` in `ENERGY_COST_MENU_ITEMS`. Remove list-only `lesson-menu-words` and `lesson-menu-irregular-verbs`; their internal training buttons retain the shared badge. Keep Theory free and unbadged.

- [ ] **Step 5: Preserve charging semantics**

Do not add new charge calls where the destination already charges on mount/round start. The badge is presentation. For every modified CTA, trace: tap → destination → existing latch → `spendOne`/`spendAmount(1)`. If no charge exists, add a separate failing behavior test before touching the charge path.

- [ ] **Step 6: Run the focused contract and verify GREEN**

Expected: all non-V2 entry-matrix cases pass, and existing one-charge/start tests remain green.

## Task 5: Accessibility and motion guards

**Files:**
- Modify: `tests/energy_start_cost_contract.test.ts`
- Modify: `components/EnergyCostBadge.tsx`
- Check: `scripts/guard_motion_ratchet.mjs` through `npm run guard:motion-ratchet`; no baseline edit is planned because the motion is finite.

- [ ] **Step 1: Add RED assertions for `−1`, `∞` and Reduce Motion**

Assert the component exposes a readable cost label, never hides unlimited state, uses `useReduceMotion`, cleans up animations and has no infinite loop.

- [ ] **Step 2: Run the fast motion ratchet first**

```bash
npm run guard:motion-ratchet
```

Expected: no new unguarded infinite animation because the badge uses finite motion.

- [ ] **Step 3: Verify narrow tests GREEN**

Run `tests/energy_start_cost_contract.test.ts` and `tests/exam_energy_charge_timing_contract.test.ts` with one semaphore slot.

## Task 6: Learning V2 only after its mandatory gate is ON TRACK

**Files:**
- Conditional modify: `app/learning-v2/session/[id].tsx`
- Conditional modify: `app/learning-v2/lesson/[id].tsx`
- Modify: `tests/energy_start_cost_contract.test.ts`
- Do not modify: `modules/learning-v2/content/source/**`

- [ ] **Step 1: Re-run the authoring preflight**

```bash
npm run learning-v2:lesson1-authoring-preflight
```

Required: `PASS`/`ON TRACK` with a machine-readable locked range and current session. Current observed result on 2026-08-24 is `HOLD: ordinal is not defined`; while that persists, stop this task and preserve all dirty Learning V2 source files.

- [ ] **Step 2: Add RED for one charge per V2 session start**

The test must fail until the runtime session screen calls the central energy path exactly once per unique run. It must cover initial, repeat and `skipTheory`, and must not touch learner-facing content, locales, registry fingerprints or session source.

- [ ] **Step 3: Implement a destination-level idempotent energy gate**

Use `energyReady`, `isUnlimited`, a stable run/session key and a ref latch following the existing lesson/personal-plan pattern. If no energy is available, show the existing no-energy flow and do not begin interactions. Never charge on an answer or retry inside the same run.

- [ ] **Step 4: Put the badge on both V2 start routes**

The primary start/repeat button and `Пропустить теорию` both call `enterSelectedSession`, so both must show `EnergyCostBadge`. The outcome restart keeps its badge.

- [ ] **Step 5: Run the preflight and focused runtime tests again**

Required: preflight remains green, no content fingerprint drift, one energy charge per V2 run and no charge-on-error branch.

## Task 7: Final focused verification

**Files:**
- Inspect all files changed by this plan.

- [ ] **Step 1: Verify the final asset reference is literal and unique**

```bash
rg -n --fixed-strings "energy-start-cost.webp" app components constants hooks modules
```

Expected: the static `require()` in `EnergyCostBadge` and no unused theme variants.

- [ ] **Step 2: Run focused tests under one semaphore slot**

```bash
bash .claude/semaphore/slot.sh acquire "jest energy final"
npx jest --runInBand \
  tests/energy_start_cost_contract.test.ts \
  tests/exam_energy_charge_timing_contract.test.ts
bash .claude/semaphore/slot.sh release
```

Expected: all suites and assertions pass; release the slot even on failure.

- [ ] **Step 3: Inspect the diff and preserve unrelated work**

Run `git diff --check` and a path-scoped `git diff --` over only files changed by this plan. Do not stage, revert or overwrite unrelated dirty files. If `.git/index.lock` still exists, report that commits were not possible and do not delete the lock.

- [ ] **Step 4: Report evidence and remaining blocker honestly**

Report asset path/metadata, exact test counts, every modified paid-entry group and the V2 status. Do not claim complete every-button coverage if the V2 preflight remains `HOLD`.
