# Dialogs Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy Dialogs catalogue with a lightweight scenario feed and show a briefing before the learner first starts each scenario.

**Architecture:** Retain the existing access checks and chat-session implementation. Add a target-scoped `AsyncStorage` model for the briefing state, a briefing route, and two focused presentation components; normal presses resolve between briefing and the existing session. The new route repeats the French source gate, while AI consent remains at the existing session route immediately before conversation can start.

**Tech Stack:** Expo Router, React Native, TypeScript, AsyncStorage, React Native Reanimated, Jest, existing Phraseman theme/accessibility primitives.

---

## File structure

- Create `app/ai_dialog_intro_seen.ts` — target-scoped AsyncStorage key plus read/write functions.
- Create `app/ai_dialog_briefing.tsx` — route that resolves a scenario, preserves the French gate, records confirmation, then replaces itself with the existing session.
- Create `components/AiDialogBriefingScreen.tsx` — themed, reduced-motion-aware presentational briefing screen.
- Create `components/DialogScenarioTile.tsx` — compact, borderless, Reanimated tile without a secondary description line.
- Modify `components/DialogsTabContent.tsx` — feed composition, normal/long-press routing, and bounded entrance motion.
- Modify `app/ai_dialog_target_gate.ts` — include the briefing in the French source gate contract.
- Create `tests/ai_dialog_intro_seen.test.ts` — storage isolation and failure coverage.
- Create `tests/ai_dialog_briefing_contract.test.ts` — route, a11y, visual, and motion contracts.
- Modify `tests/gustav_french_dev_surface_parity.test.ts` — expect the additional protected route.

### Task 1: Persist the first-briefing state

**Files:**
- Create: `tests/ai_dialog_intro_seen.test.ts`
- Create: `app/ai_dialog_intro_seen.ts`

- [ ] **Step 1: Write failing tests for deterministic keying, read, write, and graceful storage errors.**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiDialogIntroSeenKey, hasSeenAiDialogIntro, markAiDialogIntroSeen } from '../app/ai_dialog_intro_seen';

it('isolates each scenario and study target', () => {
  expect(aiDialogIntroSeenKey('en', 'coffee')).toBe('ai_dialog_intro_seen:v1:en:coffee');
  expect(aiDialogIntroSeenKey('fr', 'coffee')).not.toBe(aiDialogIntroSeenKey('en', 'coffee'));
  expect(aiDialogIntroSeenKey('en', 'grocery')).not.toBe(aiDialogIntroSeenKey('en', 'coffee'));
});

it('marks only after explicit confirmation', async () => {
  await expect(hasSeenAiDialogIntro('en', 'coffee')).resolves.toBe(false);
  await markAiDialogIntroSeen('en', 'coffee');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('ai_dialog_intro_seen:v1:en:coffee', '1');
  await expect(hasSeenAiDialogIntro('en', 'coffee')).resolves.toBe(true);
});

it('fails open when storage cannot be read', async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(hasSeenAiDialogIntro('en', 'coffee')).resolves.toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npx jest --runTestsByPath tests/ai_dialog_intro_seen.test.ts --runInBand --no-cache`

Expected: FAIL with `Cannot find module '../app/ai_dialog_intro_seen'`.

- [ ] **Step 3: Implement the minimal storage model.**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

const KEY_PREFIX = 'ai_dialog_intro_seen:v1';

export function aiDialogIntroSeenKey(target: RuntimeStudyTarget | undefined, scenarioId: string): string {
  return `${KEY_PREFIX}:${storageStudyTarget(target)}:${scenarioId}`;
}

export async function hasSeenAiDialogIntro(target: RuntimeStudyTarget | undefined, scenarioId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(aiDialogIntroSeenKey(target, scenarioId)).catch(() => null)) === '1';
}

export async function markAiDialogIntroSeen(target: RuntimeStudyTarget | undefined, scenarioId: string): Promise<void> {
  await AsyncStorage.setItem(aiDialogIntroSeenKey(target, scenarioId), '1').catch(() => {});
}
```

- [ ] **Step 4: Run the focused test, then commit only these files.**

Run: `npx jest --runTestsByPath tests/ai_dialog_intro_seen.test.ts --runInBand --no-cache`

Expected: PASS.

```bash
git add app/ai_dialog_intro_seen.ts tests/ai_dialog_intro_seen.test.ts
git commit -m "feat: track seen dialog briefings"
```

### Task 2: Build the briefing surface before navigation wiring

**Files:**
- Create: `components/AiDialogBriefingScreen.tsx`
- Create: `tests/ai_dialog_briefing_contract.test.ts`

- [ ] **Step 1: Write the failing visual and a11y contracts.**

```ts
const source = read('components/AiDialogBriefingScreen.tsx');
expect(source).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion'");
expect(source).toContain('dialogScenarioGoal(scenario, lang)');
expect(source).toContain('dialogScenarioNextStepHint(scenario, lang)');
expect(source).toContain('accessibilityRole="button"');
expect(source).toContain('reduceMotion ? undefined : FadeInDown');
expect(source).not.toMatch(/border(?:Width|Color)\s*:/);
expect(source).not.toContain('withRepeat(');
```

- [ ] **Step 2: Run the contract to verify it fails.**

Run: `npx jest --runTestsByPath tests/ai_dialog_briefing_contract.test.ts --runInBand --no-cache`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement a focused, localized presentation component.**

```tsx
type Props = { scenario: DialogScenario; onBack: () => void; onStart: () => void };

export default function AiDialogBriefingScreen({ scenario, onBack, onStart }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <PressableScale accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} variant="flat" />
        <Reanimated.View entering={reduceMotion ? undefined : FadeInDown.duration(220)}>
          {/* icon + CEFR + title, localized goal and next-step hint */}
        </Reanimated.View>
        <PressableScale accessibilityRole="button" accessibilityLabel={startLabel} onPress={onStart} variant="3d" />
      </SafeAreaView>
    </ScreenGradient>
  );
}
```

Use `dialogScenarioGoal` and `dialogScenarioNextStepHint`, not `scenarioObjectives`: those helpers support all eight UI languages. Do not put a mini-caption under the title, create borders, or add a looping animation.

- [ ] **Step 4: Verify surface and types, then commit.**

Run: `npx jest --runTestsByPath tests/ai_dialog_briefing_contract.test.ts --runInBand --no-cache; npm run typecheck`

Expected: contract PASS and typecheck exits 0.

```bash
git add components/AiDialogBriefingScreen.tsx tests/ai_dialog_briefing_contract.test.ts
git commit -m "feat: add dialog briefing screen"
```

### Task 3: Add the protected briefing route

**Files:**
- Create: `app/ai_dialog_briefing.tsx`
- Modify: `app/ai_dialog_target_gate.ts`
- Modify: `tests/gustav_french_dev_surface_parity.test.ts`
- Modify: `tests/ai_dialog_briefing_contract.test.ts`

- [ ] **Step 1: Extend the failing contracts for source-gate and route handoff.**

```ts
expect(read('app/ai_dialog_target_gate.ts')).toContain("'/ai_dialog_briefing'");
const route = read('app/ai_dialog_briefing.tsx');
expect(route).toContain('aiDialogContentAvailableForTarget(studyTarget)');
expect(route).toContain('markAiDialogIntroSeen(studyTarget, scenario.id)');
expect(route).toContain("pathname: '/ai_dialog_session'");
expect(route).toContain('router.replace');
expect(route).toContain('safeRouterBack');
```

- [ ] **Step 2: Run the contracts to verify the route is absent.**

Run: `npx jest --runTestsByPath tests/ai_dialog_briefing_contract.test.ts tests/gustav_french_dev_surface_parity.test.ts --runInBand --no-cache`

Expected: FAIL because the briefing route and French gate entry do not exist.

- [ ] **Step 3: Implement the route without moving consent or entitlement logic.**

```tsx
const scenario = getScenarioById(String(params.scenarioId ?? ''));
const start = useCallback(() => {
  if (!scenario) return;
  void markAiDialogIntroSeen(studyTarget, scenario.id);
  router.replace({ pathname: '/ai_dialog_session', params: { scenarioId: scenario.id } } as never);
}, [router, scenario, studyTarget]);

if (!aiDialogContentAvailableForTarget(studyTarget)) return <FrenchDialogGateScreen />;
if (!scenario) return <MissingScenarioScreen onBack={() => safeRouterBack(router, '/(tabs)/lessons' as never)} />;
return <AiDialogBriefingScreen scenario={scenario} onBack={() => safeRouterBack(router, '/(tabs)/lessons' as never)} onStart={start} />;
```

Add `'/ai_dialog_briefing'` to `blockedRoutes`. Do not add `AiDialogConsentGate` here: consent still guards `/ai_dialog_session` immediately before the API-capable screen mounts.

- [ ] **Step 4: Obtain a fresh access-gate review, run tests, and commit.**

Run: `npx jest --runTestsByPath tests/ai_dialog_briefing_contract.test.ts tests/gustav_french_dev_surface_parity.test.ts tests/ai_dialog_lifetime_gate_contract.test.ts --runInBand --no-cache`

Expected: PASS.

```bash
git add app/ai_dialog_briefing.tsx app/ai_dialog_target_gate.ts tests/ai_dialog_briefing_contract.test.ts tests/gustav_french_dev_surface_parity.test.ts
git commit -m "feat: route dialogs through first-run briefing"
```

### Task 4: Replace legacy rows with the selected scenario feed

**Files:**
- Create: `components/DialogScenarioTile.tsx`
- Modify: `components/DialogsTabContent.tsx`
- Modify: `tests/ai_dialog_briefing_contract.test.ts`

- [ ] **Step 1: Add failing catalogue contracts for the first-run path and compact tiles.**

```ts
const catalogue = read('components/DialogsTabContent.tsx');
const tile = read('components/DialogScenarioTile.tsx');
expect(catalogue).toContain('hasSeenAiDialogIntro(studyTarget, scenario.id)');
expect(catalogue).toContain("pathname: '/ai_dialog_briefing'");
expect(tile).toContain('onLongPress');
expect(tile).toContain('delayLongPress={550}');
expect(tile).toContain('accessibilityHint');
expect(tile).toContain("from '../components/feedback/PressableScale'");
expect(tile).not.toContain('dialogScenarioGoal(scenario, lang)');
expect(tile).not.toMatch(/border(?:Width|Color)\s*:/);
```

- [ ] **Step 2: Run the contract to verify it fails.**

Run: `npx jest --runTestsByPath tests/ai_dialog_briefing_contract.test.ts --runInBand --no-cache`

Expected: FAIL because the tile and first-run decision are absent.

- [ ] **Step 3: Implement the reusable tile and catalogue decision.**

```tsx
export function DialogScenarioTile({ vm, onPress, onReplayIntro }: Props) {
  return (
    <PressableScale
      accessibilityLabel={tileLabel}
      accessibilityHint={replayHint}
      onPress={onPress}
      onLongPress={onReplayIntro}
      delayLongPress={550}
      variant="flat"
      style={[styles.tile, { backgroundColor: surfaceColor }]}
    >
      {/* icon, title, CEFR chip, and one state icon only */}
    </PressableScale>
  );
}
```

```ts
const openScenarioDestination = useCallback(async (scenario: DialogScenario, forceBriefing = false) => {
  const seen = forceBriefing ? false : await hasSeenAiDialogIntro(studyTarget, scenario.id);
  router.push({ pathname: seen ? '/ai_dialog_session' : '/ai_dialog_briefing', params: { scenarioId: scenario.id } } as never);
}, [router, studyTarget]);
```

Call `openScenarioDestination` only as the final action inside the existing `openCourseScenario` and `openChallengeScenario` callbacks, after their current lock, Plus, analytics, target-language, and account-level branches return. The large “next scene” hero may contain the goal; tiles may not. Use `PressableScale` for UI-thread press feedback, and at most a 40 ms `FadeInDown` stagger for initial visible feed items; omit it under `useReduceMotion()`.

- [ ] **Step 4: Run catalogue regressions, then commit.**

Run: `npx jest --runTestsByPath tests/ai_dialog_briefing_contract.test.ts tests/dialogs_progress.test.ts tests/dialogs_limit_session.test.ts tests/ai_dialog_entitlement_readiness_contract.test.ts --runInBand --no-cache`

Expected: PASS.

```bash
git add components/DialogScenarioTile.tsx components/DialogsTabContent.tsx tests/ai_dialog_briefing_contract.test.ts
git commit -m "feat: refresh dialog scenario catalogue"
```

### Task 5: Verify navigation, quality gates, and a real device

**Files:**
- Modify only files from Tasks 1–4 when a named gate identifies a concrete issue.

- [ ] **Step 1: Run focused functional and quality checks.**

Run: `npx jest --runTestsByPath tests/ai_dialog_intro_seen.test.ts tests/ai_dialog_briefing_contract.test.ts tests/ai_dialog_session_flow_contract.test.ts tests/dialogs_back_tabbar_contract.test.ts tests/dialogs_progress.test.ts tests/dialogs_limit_session.test.ts tests/ai_dialog_entitlement_readiness_contract.test.ts tests/gustav_french_dev_surface_parity.test.ts --runInBand --no-cache; npm run typecheck; npx eslint app/ai_dialog_intro_seen.ts app/ai_dialog_briefing.tsx app/ai_dialog_target_gate.ts components/AiDialogBriefingScreen.tsx components/DialogScenarioTile.tsx components/DialogsTabContent.tsx`

Expected: every command exits 0.

- [ ] **Step 2: Run runtime and layout guards.**

Run: `npx jest --runTestsByPath tests/perf_freeze_contract.test.ts tests/layout_stability_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts --runInBand --no-cache`

Expected: PASS without a new baseline exception.

- [ ] **Step 3: Verify on Android.**

```text
1. First normal tap opens briefing; Back returns to Dialogs.
2. “Начать диалог” opens chat; next normal tap skips briefing.
3. Long press opens briefing without starting chat.
4. Locked and Plus scenarios retain their existing flow.
5. Switching tabs and pressing tiles remains responsive with no persistent animation.
6. Reduce Motion removes entrance movement while content stays visible.
```

- [ ] **Step 4: Inspect the final diff and commit only a concrete repair from a failing gate.**

Run: `git diff --check; git status --short`

Expected: no whitespace errors; no unrelated dirty file is staged.

## Plan self-review

- Tasks 1–4 cover first-run state, long press, briefing, compact tiles, motion, access gate and accessibility.
- The route uses existing localized goal/hint helpers rather than partially translated objective labels.
- No Firebase, server prompt, entitlement, reward or chat-message behaviour changes are included.
- Task 3 requires a fresh access-gate review before the French route-list change is committed.
