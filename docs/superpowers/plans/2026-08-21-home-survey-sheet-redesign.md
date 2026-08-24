# Home Survey Sheet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Home survey card and primary full-screen journey with the approved compact C2 task row and high animated sheet while preserving account, submission, and economy contracts.

**Architecture:** Keep `SurveyTaskCard` presentation-only, extract the current flow into one controller, and render it through `SurveySheetModal` from both Home and the compatibility route. Reuse `HybridSheetShell`, `PressableHybrid`, and shared motion tokens; add no modal, gesture, or animation dependency.

**Tech Stack:** React Native, Expo Router, TypeScript, Reanimated, Gesture Handler, React Native Testing Library, Jest.

---

## Execution constraints

- Use the current checkout. Project rules forbid a branch/worktree unless the owner explicitly requests it.
- Preserve unrelated staged and unstaged changes; stage only task-owned files.
- Treat the shard path as economy-critical. Do not change reward amount, Cloud Functions, event ID, grant shape, or balance behavior.
- Keep `app/survey_screen.tsx`, `survey_handoff`, and `assets/images/survey/survey.webp`.
- Do not weaken existing guards. Run only the focused commands below.

## File map

**Create**

- `app/survey_flow_controller.ts` — answers, steps, submission, account gates, reconciliation, timers.
- `components/survey/SurveyQuestionTransition.tsx` — directional GPU-only step transition.
- `components/survey/useSurveyRewardImpact.ts` — quiet survey-only final impact with no sound/rings/dust.
- `components/survey/SurveySheetModal.tsx` — high hybrid sheet UI.
- `tests/survey_flow_controller.test.tsx` — controller/account-race tests.
- `tests/survey_sheet_modal.test.tsx` — sheet/motion/accessibility tests.
- `tests/home_survey_sheet_contract.test.ts` — Home and route ownership guard.

**Modify**

- `constants/motionHybrid.ts`
- `components/SurveyTaskCard.tsx`
- `components/survey/SurveyRewardPanel.tsx`
- `app/survey_screen.tsx`
- `app/(tabs)/home.tsx`
- `tests/survey_offer_render.test.tsx`
- `tests/survey_offer_delivery_contract.test.ts`
- `tests/survey_screen_submission_contract.test.ts`
- `tests/survey_screen_submission_behavior.test.tsx`
- `tests/motion_hybrid_contract.test.ts`
- `jest.rntl.config.cjs`

## Task 1: Redesign the Home survey row

**Files:**
- Modify: `constants/motionHybrid.ts`
- Modify: `components/SurveyTaskCard.tsx`
- Modify: `tests/survey_offer_render.test.tsx`

- [ ] **Step 1: Write the failing C2-row assertions**

Replace the old active-card expectations with:

```tsx
test('active survey renders the approved C2 task row', async () => {
  const onOpen = jest.fn();
  const view = await render(<SurveyTaskCard challenge={activeChallenge} onOpen={onOpen} />);
  expect(view.getByTestId('survey-offer-title').props.children).toBe(activeChallenge.title);
  expect(view.getByTestId('survey-offer-title').props.numberOfLines).toBe(2);
  expect(view.queryByTestId('survey-offer-description')).toBeNull();
  expect(view.queryByTestId('survey-offer-accent')).toBeNull();
  expect(view.queryByTestId('survey-offer-art')).toBeNull();
  expect(view.getByTestId('survey-offer-reward-label').props.children).toBe('+1');
  expect(view.getByTestId('survey-offer-reward-art').props.accessible).toBe(false);
  fireEvent.press(view.getByTestId('survey-offer-card'));
  expect(onOpen).toHaveBeenCalledWith(activeChallenge);
});
```

Mock `PressableHybrid` as `Pressable`, return Polish from `useLang`, and keep the existing shard-image fixture.

- [ ] **Step 2: Verify RED**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_offer_render.test.tsx
```

Expected: FAIL because old description/accent/art still render and reward IDs do not exist.

- [ ] **Step 3: Add shared survey geometry tokens**

Add to `constants/motionHybrid.ts`:

```ts
export const SURVEY_HYBRID = {
  questionShiftPx: 8,
  progressSegmentMinPx: 4,
  taskIconSize: 46,
  taskRewardIconSize: 18,
  rewardLiftPx: -12,
  rewardStartScale: 1.08,
} as const;
```

No survey duration or spring is added; timing remains in `LUM`, `PRESS`, and `CHK`.

- [ ] **Step 4: Implement the C2 row**

Use `SHARD_REWARDS.survey_completed`, `oskolokImageForPackShards(1, themeMode)`, and this hierarchy:

```tsx
const localizedRewardLabel = triLang(lang, {
  ru: '+1 осколок', uk: '+1 уламок', es: '+1 fragmento', 'pt-BR': '+1 fragmento',
  vi: '+1 mảnh', id: '+1 pecahan', tr: '+1 parça', pl: '+1 odłamek',
});

return active ? (
  <PressableHybrid
    testID="survey-offer-card"
    variant="card"
    onPress={() => onOpen(challenge)}
    accessibilityLabel={`${challenge.title}. ${localizedRewardLabel}`}
    contentStyle={styles.pressContent}
  >
    <View style={[styles.row, { backgroundColor: t.bgCard }]}>
      <View style={[styles.iconWell, { backgroundColor: t.accentBg }]}>
        <Ionicons name="clipboard-outline" size={24} color={t.textOnCard} />
      </View>
      <Text testID="survey-offer-title" numberOfLines={2} style={[styles.title, { color: t.textOnCard }]}>
        {challenge.title}
      </Text>
      <View style={styles.reward}>
        <Image
          testID="survey-offer-reward-art"
          source={oskolokImageForPackShards(SHARD_REWARDS.survey_completed, themeMode)}
          style={styles.rewardArt}
          accessible={false}
          importantForAccessibility="no"
        />
        <Text testID="survey-offer-reward-label" style={{ color: t.textOnCard }}>+1</Text>
      </View>
    </View>
  </PressableHybrid>
) : (
  <View testID="survey-offer-card" accessibilityState={{ disabled: true }} style={styles.disabledContainer}>
    <View style={[styles.row, { backgroundColor: t.bgCard }]}>
      <Ionicons name="clipboard-outline" size={24} color={t.textMuted} />
      <Text testID="survey-offer-title" numberOfLines={2} style={[styles.title, { color: t.textMuted }]}>{challenge.title}</Text>
      <Ionicons testID="survey-offer-claimed" name="checkmark-circle" size={24} color={t.accent} />
    </View>
  </View>
);
```

Remove the render paths and styles for `fill`, `glow`, `accentBar`, description, and `survey.webp`. Do not delete the asset.

- [ ] **Step 5: Verify GREEN and commit**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_offer_render.test.tsx
git add -- constants/motionHybrid.ts components/SurveyTaskCard.tsx tests/survey_offer_render.test.tsx
git commit -m "feat: redesign home survey task row"
```

Expected: render suite PASS; commit contains only the three listed files.

## Task 2: Extract one shared survey flow controller

**Files:**
- Create: `app/survey_flow_controller.ts`
- Create: `tests/survey_flow_controller.test.tsx`
- Modify: `app/survey_screen.tsx`
- Modify: `tests/survey_screen_submission_contract.test.ts`
- Modify: `tests/survey_screen_submission_behavior.test.tsx`
- Modify: `jest.rntl.config.cjs`

- [ ] **Step 1: Write controller-first behavior tests**

Create a small RNTL harness and cover these sequences:

```tsx
test('commits the immutable reward before completion', async () => {
  const view = render(<SurveyFlowHarness launch={launch} />);
  fireEvent.press(view.getByTestId('answer-q1-o1'));
  fireEvent.press(view.getByTestId('submit'));
  await waitFor(() => expect(mockSubmitSurvey).toHaveBeenCalledTimes(1));
  expect(mockCommitConfirmedExternalShardEvent).toHaveBeenCalledWith(expect.objectContaining({
    source: 'shard_survey',
    eventId: launch.survey.surveyId,
    delta: 1,
    reason: 'survey_completed',
    grant: expect.objectContaining({ kind: 'survey_reward', subjectId: launch.survey.surveyId }),
  }));
  expect(mockMarkSurveyOfferDone).toHaveBeenCalledWith(expect.objectContaining({
    stableId: launch.stableId,
    dayKey: launch.dayKey,
  }));
});

test('blocks late completion after account generation changes', async () => {
  const pending = deferred<SubmitSurveyResult>();
  mockSubmitSurvey.mockReturnValueOnce(pending.promise);
  const view = render(<SurveyFlowHarness launch={launch} />);
  fireEvent.press(view.getByTestId('submit'));
  mockIsCurrentAccountGeneration.mockReturnValue(false);
  pending.resolve({ reward: 1 });
  await waitFor(() => expect(view.getByTestId('error-key').props.children).toBe('account_changed'));
  expect(mockCommitConfirmedExternalShardEvent).not.toHaveBeenCalled();
});
```

Define a typed `deferred<T>()` promise fixture in the test file.

- [ ] **Step 2: Verify RED**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_flow_controller.test.tsx
```

Expected: FAIL because the controller and its Jest registration do not exist.

- [ ] **Step 3: Define the controller API**

```ts
export type SurveyLaunch = {
  survey: ActiveSurvey;
  stableId: string;
  dayKey: string;
  lang: Lang;
};

export type SurveyFlowController = {
  stepIndex: number;
  direction: 'forward' | 'backward';
  currentQuestion: SurveyQuestionClient;
  answers: AnswersState;
  currentAnswered: boolean;
  isLastStep: boolean;
  submission: SurveySubmissionState;
  submitting: boolean;
  pickOption: (questionId: string, optionId: string) => void;
  setComment: (questionId: string, comment: string) => void;
  goNext: () => void;
  goBack: () => 'close' | 'moved';
  retrySubmit: () => Promise<void>;
  deactivate: () => void;
};

export function useSurveyFlowController(input: {
  launch: SurveyLaunch;
  onReconciled: () => void;
}): SurveyFlowController;
```

- [ ] **Step 4: Mechanically move the current behavior owner**

Move from `app/survey_screen.tsx` into the hook without changing condition order:

- answer/submission/step state;
- mounted, request, attempt, and auto-return refs;
- answer eligibility and all-answered checks;
- account-generation checks around every async boundary;
- `submitSurvey` → `commitConfirmedExternalShardEvent` → `markSurveyOfferDone` → cache commit;
- error mapping, success event, and 1400 ms auto-return cleanup.

The critical sequence remains:

```ts
dispatchSubmission({ type: 'submit_started', attemptId, expectedReward: SHARD_REWARDS.survey_completed });
const response = await submitSurvey(request);
if (!accountStillCurrent()) return presentAccountChanged(attemptId);
const applied = response.reward > 0 ? await commitConfirmedExternalShardEvent(event) : null;
if (!accountStillCurrent()) return presentAccountChanged(attemptId);
const markerWritten = await markSurveyOfferDone(marker);
if (!accountStillCurrent()) return presentAccountChanged(attemptId);
const cacheCommitted = commitSurveyOfferRequest(scope, beginSurveyOfferRequest(scope), completion);
if (!cacheCommitted) throw new Error('cache_reconcile_failed');
if (!mountedRef.current || attemptIdRef.current !== attemptId) return;
dispatchSubmission({ type: 'submit_succeeded', attemptId, reward: response.reward });
```

`deactivate()` sets the presentation-active ref false and clears the auto-return timer. It does not cancel a server request or roll back a confirmed event.

- [ ] **Step 5: Keep the existing route visual while consuming the hook**

Retain scoped params, `takePrimedSurvey`, unavailable copy, and current JSX. Replace local flow state with `useSurveyFlowController({ launch, onReconciled: closeScreen })`.

Update `tests/survey_screen_submission_contract.test.ts` to read controller source for reducer, account, economy, marker, and timer assertions. Register the new RNTL test once.

- [ ] **Step 6: Verify GREEN and commit**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_flow_controller.test.tsx tests/survey_screen_submission_behavior.test.tsx
npx jest --runInBand --runTestsByPath tests/survey_screen_submission_contract.test.ts tests/survey_offer_delivery_contract.test.ts --no-cache
git add -- app/survey_flow_controller.ts app/survey_screen.tsx tests/survey_flow_controller.test.tsx tests/survey_screen_submission_contract.test.ts tests/survey_screen_submission_behavior.test.tsx jest.rntl.config.cjs
git commit -m "refactor: extract shared survey flow controller"
```

Expected: both test commands PASS; compatibility route and scoped handoff remain intact.

## Task 3: Build the high hybrid sheet and question motion

**Files:**
- Create: `components/survey/SurveyQuestionTransition.tsx`
- Create: `components/survey/useSurveyRewardImpact.ts`
- Create: `components/survey/SurveySheetModal.tsx`
- Create: `tests/survey_sheet_modal.test.tsx`
- Modify: `components/survey/SurveyRewardPanel.tsx`
- Modify: `tests/survey_offer_render.test.tsx`
- Modify: `jest.rntl.config.cjs`

- [ ] **Step 1: Write failing sheet tests**

```tsx
test('renders one high sheet without a nested question card', () => {
  const view = render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
  expect(view.getByTestId('survey-sheet-shell')).toBeTruthy();
  expect(view.getByTestId('survey-sheet-scroll')).toBeTruthy();
  expect(view.getByRole('header', { name: launch.survey.questions[0].text })).toBeTruthy();
  expect(view.getByLabelText('Pytanie 1 z 4')).toBeTruthy();
  expect(view.queryByTestId('survey-question-card')).toBeNull();
});

test('Reduce Motion removes question translation', () => {
  mockReduceMotion = true;
  const view = render(
    <SurveyQuestionTransition transitionKey="q2" direction="forward">
      <Text>Question two</Text>
    </SurveyQuestionTransition>,
  );
  expect(view.getByTestId('survey-question-transition').props.testOnly_startX).toBe(0);
});

test('answer targets are selectable and at least 44 pixels high', () => {
  const view = render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
  const option = view.getByRole('radio', { name: 'Wieczorem' });
  expect(StyleSheet.flatten(option.props.style).minHeight).toBeGreaterThanOrEqual(44);
  fireEvent.press(option);
  expect(view.getByRole('radio', { name: 'Wieczorem' }).props.accessibilityState.selected).toBe(true);
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_sheet_modal.test.tsx
```

Expected: FAIL because sheet and transition components do not exist.

- [ ] **Step 3: Implement the transition with shared tokens**

```tsx
const startX = reduceMotion ? 0 : direction === 'forward'
  ? SURVEY_HYBRID.questionShiftPx
  : -SURVEY_HYBRID.questionShiftPx;

useEffect(() => {
  opacity.value = 0;
  x.value = startX;
  opacity.value = withTiming(1, {
    duration: reduceMotion ? LUM.heroFadeMs : LUM.contentMs,
    easing: Easing.out(Easing.cubic),
  });
  x.value = withTiming(0, {
    duration: reduceMotion ? LUM.instantMs : LUM.contentMs,
    easing: Easing.out(Easing.cubic),
  });
  return () => {
    cancelAnimation(opacity);
    cancelAnimation(x);
  };
}, [opacity, reduceMotion, startX, transitionKey, x]);
```

Render one `Animated.View` with only `opacity` and `translateX`. Expose typed `testOnly_startX` only in tests.

- [ ] **Step 4: Implement `SurveySheetModal`**

Use this stable hierarchy:

```tsx
<HybridSheetShell
  visible={visible}
  onClose={onClose}
  onDismissed={onDismissed}
  closeLabel={closeLabel}
  testID="survey-sheet-shell"
  glowColor={t.accent}
>
  <View style={styles.sheetBody}>
    <View style={styles.header}>
      <FlowText provenance="authored" numberOfLines={2}>{launch.survey.title}</FlowText>
      <FlowText provenance="authored" accessibilityLabel={progressLabel}>{flow.stepIndex + 1} / {total}</FlowText>
    </View>
    <SurveyProgress current={flow.stepIndex + 1} total={total} />
    <ScrollView testID="survey-sheet-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <SurveyQuestionTransition transitionKey={flow.currentQuestion.id} direction={flow.direction}>
        <SurveyQuestionFields flow={flow} />
      </SurveyQuestionTransition>
    </ScrollView>
    <PressableHybrid
      variant="primary"
      disabled={!flow.currentAnswered || flow.submitting}
      busy={flow.submitting}
      onPress={flow.goNext}
      contentStyle={[styles.primaryAction, { backgroundColor: t.accent }]}
    >
      <FlowText provenance="authored" style={{ color: t.correctText, fontWeight: '700' }}>{actionLabel}</FlowText>
    </PressableHybrid>
  </View>
</HybridSheetShell>
```

Compute `closeLabel`, `progressLabel`, and `actionLabel` in `SurveySheetModal` with `triLang` for all eight supported languages. Define `SurveyProgress` and `SurveyQuestionFields` as private typed functions in the same file; they receive `current`, `total`, or `SurveyFlowController` explicitly and do not fetch or own flow state.

Use `flexGrow: 1` for scroll content and no animated outer height. Use one segment per question while each remains at least `SURVEY_HYBRID.progressSegmentMinPx`; otherwise use a left-anchored `scaleX` fill. Never animate width.

- [ ] **Step 5: Keep completion and errors inside the same sheet**

When submission is not editing, replace only the sheet body with the existing `SurveyRewardPanel`. Refactor its buttons to `PressableHybrid`, remove local `duration: 220` and flat opacity presses, preserve shard art and full copy.

For the final reward, create `components/survey/useSurveyRewardImpact.ts`. It owns `opacity`, `translateY`, and `scale` shared values only:

```ts
export function useSurveyRewardImpact(visible: boolean) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(visible && reduceMotion ? 1 : 0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!visible || reduceMotion) {
      opacity.value = visible ? 1 : 0;
      y.value = 0;
      scale.value = 1;
      return;
    }
    opacity.value = 0;
    y.value = SURVEY_HYBRID.rewardLiftPx;
    scale.value = SURVEY_HYBRID.rewardStartScale;
    opacity.value = withTiming(1, { duration: LUM.heroFadeMs });
    y.value = withTiming(0, { duration: CHK.fallMs, easing: Easing.bezier(...CHK.fallBezier) });
    scale.value = withSpring(1, CHK.squash);
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
      cancelAnimation(scale);
    };
  }, [opacity, reduceMotion, scale, visible, y]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));
}
```

This hook imports no sound director and creates no rings, dust, timer, or loop. Under Reduce Motion it renders the final frame.

- [ ] **Step 6: Verify GREEN and commit**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_sheet_modal.test.tsx tests/survey_offer_render.test.tsx
git add -- components/survey/SurveyQuestionTransition.tsx components/survey/useSurveyRewardImpact.ts components/survey/SurveySheetModal.tsx components/survey/SurveyRewardPanel.tsx tests/survey_sheet_modal.test.tsx tests/survey_offer_render.test.tsx jest.rntl.config.cjs
git commit -m "feat: add animated survey sheet"
```

Expected: sheet, question motion, long copy, reward, retry, account-change, and Reduce Motion tests PASS.

## Task 4: Wire Home locally and preserve the route

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/survey_screen.tsx`
- Create: `tests/home_survey_sheet_contract.test.ts`
- Modify: `tests/survey_offer_delivery_contract.test.ts`
- Modify: `tests/home_startup_stability.test.ts`

- [ ] **Step 1: Write failing ownership contracts**

```ts
test('Home opens a local sheet without routing or refetching', () => {
  expect(home).toContain('const [openSurveyLaunch, setOpenSurveyLaunch]');
  expect(home).toContain('<SurveySheetModal');
  expect(home).toContain('setOpenSurveyLaunch({');
  expect(home).not.toMatch(/pathname:\s*['"]\/survey_screen['"]/);
  expect(home.match(/fetchActiveSurveyWithRetry\(/g)).toHaveLength(1);
});

test('compatibility route still delegates scoped handoff to the same sheet', () => {
  expect(route).toContain('takePrimedSurvey(surveyId, scope)');
  expect(route).toContain('<SurveySheetModal');
  expect(layout).toContain('<Stack.Screen name="survey_screen"');
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx jest --runInBand --runTestsByPath tests/home_survey_sheet_contract.test.ts tests/survey_offer_delivery_contract.test.ts tests/home_startup_stability.test.ts --no-cache
```

Expected: FAIL because Home still pushes `/survey_screen`.

- [ ] **Step 3: Add local launch state and mount one sheet**

```tsx
const [openSurveyLaunch, setOpenSurveyLaunch] = useState<SurveyLaunch | null>(null);

<SurveyTaskCard
  challenge={surveyOffer.challenge}
  onOpen={(challenge) => {
    if (!challenge.survey) return;
    setOpenSurveyLaunch({
      survey: challenge.survey,
      stableId: surveyOffer.stableId,
      dayKey: surveyOffer.dayKey,
      lang,
    });
  }}
/>

{openSurveyLaunch ? (
  <SurveySheetModal
    visible
    launch={openSurveyLaunch}
    onClose={() => setOpenSurveyLaunch(null)}
  />
) : null}
```

Remove Home’s `hapticTap`, `primeSurvey`, and `router.push` for this primary path only. Close the sheet if active stable ID, day key, or language no longer matches its launch.

- [ ] **Step 4: Make the route a thin compatibility wrapper**

Keep param validation and `takePrimedSurvey`. For valid scope:

```tsx
return (
  <SurveySheetModal
    visible
    launch={{ survey, stableId: scope.stableId, dayKey: scope.dayKey, lang }}
    onClose={closeRoute}
    onDismissed={closeRoute}
  />
);
```

`closeRoute` must be idempotent. Keep the current unavailable copy and safe-back action. Keep the route registration and scoped handoff.

- [ ] **Step 5: Update intentional contracts, verify GREEN, and commit**

Update `tests/survey_offer_delivery_contract.test.ts` to require local sheet ownership while retaining route/handoff and pure-card assertions.

```powershell
npx jest --runInBand --runTestsByPath tests/home_survey_sheet_contract.test.ts tests/survey_offer_delivery_contract.test.ts tests/home_startup_stability.test.ts --no-cache
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_screen_submission_behavior.test.tsx tests/survey_sheet_modal.test.tsx
git add -- 'app/(tabs)/home.tsx' app/survey_screen.tsx tests/home_survey_sheet_contract.test.ts tests/survey_offer_delivery_contract.test.ts tests/home_startup_stability.test.ts
git commit -m "feat: open surveys in home sheet"
```

Expected: both test commands PASS; Home no longer routes, compatibility route still resolves.

## Task 5: Harden lifecycle, accessibility, and performance

**Files:**
- Modify: `components/survey/SurveySheetModal.tsx`
- Modify: `app/survey_flow_controller.ts`
- Modify: `tests/survey_sheet_modal.test.tsx`
- Modify: `tests/survey_flow_controller.test.tsx`
- Modify: `tests/motion_hybrid_contract.test.ts`

- [ ] **Step 1: Add failing close/account/accessibility tests**

```tsx
test('close during submit prevents late presentation and duplicate dismiss', async () => {
  const pending = deferred<SubmitSurveyResult>();
  mockSubmitSurvey.mockReturnValueOnce(pending.promise);
  const onClose = jest.fn();
  const view = render(<SurveySheetModal visible launch={launch} onClose={onClose} />);
  fireEvent.press(view.getByRole('button', { name: 'Wyślij' }));
  fireEvent.press(view.getByLabelText('Zamknij ankietę'));
  pending.resolve({ reward: 1 });
  await act(async () => pending.promise);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(view.queryByText('+1 odłamek')).toBeNull();
});

test('announces progress once and hides visual segments', () => {
  const view = render(<SurveySheetModal visible launch={launch} onClose={jest.fn()} />);
  expect(view.getAllByLabelText('Pytanie 1 z 4')).toHaveLength(1);
  expect(view.getByTestId('survey-progress-segments').props.accessible).toBe(false);
});
```

- [ ] **Step 2: Verify RED**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_sheet_modal.test.tsx tests/survey_flow_controller.test.tsx
```

- [ ] **Step 3: Make close ownership idempotent**

```ts
const closeRequestedRef = useRef(false);
const requestClose = useCallback(() => {
  if (closeRequestedRef.current) return;
  closeRequestedRef.current = true;
  flow.deactivate();
  onClose();
}, [flow, onClose]);

useEffect(() => {
  if (visible) closeRequestedRef.current = false;
}, [visible]);
```

Late requests may finish synchronization but cannot dispatch UI state after `deactivate()` or present into another account/session.

- [ ] **Step 4: Complete accessibility and performance guards**

- Question: header role.
- Options: radio role with selected/disabled state and 44 px minimum.
- Progress label: one accessible numeric owner; visual segments hidden.
- Error: alert role/live region; completion: polite live region.
- Shard and decorative icons: inaccessible.
- Lime CTA foreground: `t.correctText`.
- No animated height, `setInterval`, local motion literals, blur animation, or continuous loop.

Add this survey-specific guard without changing the existing ratchet:

```ts
const surveyMotion = surveyFiles.map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
expect(surveyMotion).toContain('constants/motionHybrid');
expect(surveyMotion).not.toMatch(/Animated\.timing\([^)]*duration:\s*\d+/s);
expect(surveyMotion).not.toMatch(/withTiming\([^)]*duration:\s*\d+/s);
expect(surveyMotion).not.toMatch(/setInterval\s*\(/);
expect(surveyMotion).not.toMatch(/animatedHeight|height:\s*[^,]+\.value/);
```

- [ ] **Step 5: Verify GREEN and commit**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_sheet_modal.test.tsx tests/survey_flow_controller.test.tsx tests/survey_offer_render.test.tsx tests/survey_screen_submission_behavior.test.tsx
npx jest --runInBand --runTestsByPath tests/motion_hybrid_contract.test.ts tests/survey_screen_submission_contract.test.ts tests/survey_offer_delivery_contract.test.ts --no-cache
git add -- components/survey/SurveySheetModal.tsx app/survey_flow_controller.ts tests/survey_sheet_modal.test.tsx tests/survey_flow_controller.test.tsx tests/motion_hybrid_contract.test.ts
git commit -m "test: harden survey sheet lifecycle"
```

Expected: both commands PASS with zero failures.

## Task 6: Final focused verification and review

**Files:** Verify only; repair failures in the task that introduced them.

- [ ] **Step 1: Run the full focused gate**

```powershell
npx jest --config jest.rntl.config.cjs --runInBand tests/survey_offer_render.test.tsx tests/survey_flow_controller.test.tsx tests/survey_sheet_modal.test.tsx tests/survey_screen_submission_behavior.test.tsx
npx jest --runInBand --runTestsByPath tests/home_survey_sheet_contract.test.ts tests/survey_offer_delivery_contract.test.ts tests/survey_screen_submission_contract.test.ts tests/home_startup_stability.test.ts tests/motion_hybrid_contract.test.ts tests/retired_daily_tasks_full_removal_contract.test.ts --no-cache
```

Expected: both commands exit 0 with zero failing tests.

- [ ] **Step 2: Check the patch surface**

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` exits 0. Pre-existing unrelated status entries may remain; no task-owned file is accidentally omitted from its commit.

- [ ] **Step 3: Verify one iOS and one Android target**

Confirm all eight observations:

1. C2 row shows the real title, no subtitle/green edge, and compact `+1`.
2. High sheet rises without bounce and remains fixed between questions.
3. Forward/back motion directions are correct.
4. Long copy and text keyboard remain usable.
5. Swipe/backdrop dismiss exactly once.
6. Retry stays in the same sheet.
7. Completion uses one quiet common impact and returns Home.
8. Reduce Motion removes translation and impact displacement.

- [ ] **Step 4: Request economy-critical and UI/motion review**

Review must confirm no direct shard write/server balance projection, unchanged `surveyId` event/grant identity, preserved account checks, no schema/admin/Jarvis change, shared motion tokens only, and no second modal/animated height/loop.

## Completion criteria

- Home uses C2 and opens the high local hybrid sheet.
- Compatibility route and scoped handoff remain operational.
- One controller owns submission/reconciliation.
- Motion uses `PRESS`, `LUM`, `CHK`, and `SURVEY_HYBRID`; Reduce Motion passes.
- Backend, schema, reward, and balance behavior are unchanged.
- Both final Jest commands pass and real-device checks are recorded.
