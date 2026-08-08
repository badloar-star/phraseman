# Survey Daily Challenge Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the shard survey into a violet-accented fourth Daily Challenge, remove decorative gray tracks from individual challenge cards, and deliver an optimistic branded submit/reward/retry journey without emoji or system alerts.

**Architecture:** `DailyTasksScreen` becomes the single owner of the active-survey snapshot and passes a typed model to a presentation-only `SurveyTaskCard`, which renders through `DailyTaskCard` after the three normal tasks. A small pure survey-submission state machine drives immediate optimistic reward presentation while authoritative shard balance and the daily-completion marker remain server-confirmed and account-generation guarded; failures retain answers and expose an in-app retry. `getActiveShardSurvey` gains an optional backward-compatible completion timestamp so the current authenticated account can safely recover legacy same-day completion, while the submit callable and its idempotent reward transaction remain unchanged.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, Firebase callable functions, React Native Testing Library 14, Jest, existing Text Integrity primitives and shard assets.

---

## File map

- Create `app/survey_submission_state.ts`: pure state machine and stale-attempt protection for optimistic submit/retry.
- Create `app/survey_daily_challenge_model.ts`: pure fourth-task snapshot, localized copy, and three-of-four calculations.
- Create `app/survey_daily_task_cache.ts`: bounded account/day/language-safe session cache with latest-request-wins commits.
- Create `components/survey/SurveyRewardPanel.tsx`: branded in-screen reward and retry presentation using the bundled shard asset.
- Modify `app/survey_screen.tsx`: consume the state machine, reconcile server truth, retain answers, auto-return safely.
- Modify `components/SurveyTaskCard.tsx`: presentation-only adapter over `DailyTaskCard`; remove its independent fetch/state ownership.
- Modify `components/daily-tasks/DailyTaskCard.tsx`: make individual progress decoration optional without changing bonus progress.
- Modify `app/daily_tasks_screen.tsx`: own survey snapshot, place the survey after normal tasks, and remove individual gray tracks.
- Modify `app/survey_client.ts`: retain bounded active-survey retry used while auth/cloud state settles.
- Use existing `app/account_generation.ts`: capture and validate the account generation around every async submit/reconciliation.
- Modify `app/survey_daily_task.ts`: expose explicit confirmed marker operations needed by reconciliation.
- Modify `app/survey_handoff.ts`: carry account/day metadata and recover the primed survey from the session cache.
- Modify `app/cloud_sync.ts`: remove the legacy global survey marker during account-local wipe.
- Create `tests/survey_daily_challenge_model.test.ts`: fourth-task counts and localized model boundaries.
- Create `tests/survey_daily_task_cache.test.ts`: TTL, language/account isolation, completed retention, and stale response tests.
- Create `tests/survey_daily_task_marker.test.ts`: legacy migration, account switch, midnight, and storage failure tests.
- Modify `tests/cloud_sync_daily_tasks_merge.test.ts`: guard account-switch removal of the legacy survey marker.
- Create `tests/survey_submission_state.test.ts`: pure optimistic/retry/stale-response tests.
- Create `tests/survey_daily_challenge_render.test.tsx`: shared-card geometry, violet state, reward asset, retry, and accessibility tests.
- Create `tests/shard_survey_idempotency_contract.test.ts`: freeze the existing callable response/claim/reward-zero invariants.
- Modify `functions/src/shard_survey.ts`: add read-only `completion.completedAtMs` to active-survey responses; do not change submit payload or transaction.
- Modify `functions/src/shard_survey_core.test.ts` or add a focused callable contract: validate backward-compatible completion response behavior.
- Modify `tests/survey_daily_task_delivery_contract.test.ts` or create it when absent on the implementation branch: ownership, retry, ordering, count, asset, and no-alert contracts.
- Modify `tests/daily_tasks_text_integrity_render.test.tsx`: optional individual progress and unchanged aggregate bonus progress.
- Modify `jest.rntl.config.cjs` and its exact discovery assertion: include the new rendered survey suite only.

## Task 1: Import only the approved retry hunks into the clean worktree

**Files:**
- Modify: `app/survey_client.ts`
- Modify: `app/daily_tasks_screen.tsx`
- Create/Modify: `tests/survey_daily_task_delivery_contract.test.ts`

- [ ] **Step 1: Rebase the clean implementation branch onto the latest local target**

```powershell
git status --short
git rebase codex/streak-revive-modal-redesign
```

Expected: clean rebase and `app/account_generation.ts` plus `tests/account_generation.test.ts` are present. Stop on conflicts; do not resolve unrelated target work by guessing.

- [ ] **Step 2: Inspect the primary workspace index without changing it**

```powershell
git -C C:\appsprojects\phraseman diff --cached -- app/survey_client.ts app/daily_tasks_screen.tsx tests/survey_daily_task_delivery_contract.test.ts
```

Expected: the bounded `fetchActiveSurveyWithRetry` helper, its Daily Tasks call site, and possibly its contract test. Stop if the diff contains unrelated changes in the same hunks.

- [ ] **Step 3: Add the retry contract in the isolated worktree and verify RED**

Create `tests/survey_daily_task_delivery_contract.test.ts` with assertions for `fetchActiveSurveyWithRetry`, three attempts, bounded delay, and the Daily Tasks call site. Run:

```powershell
npx jest tests/survey_daily_task_delivery_contract.test.ts --runInBand
```

Expected: FAIL because the clean branch does not yet contain the staged primary-workspace retry.

- [ ] **Step 4: Reapply only the reviewed retry hunks**

Use `apply_patch` in the isolated worktree. The helper signature must remain:

```ts
export async function fetchActiveSurveyWithRetry(
  data: { stableId: string; platform: string; lang: string },
  options: { attempts?: number; delayMs?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<ActiveSurvey | null>
```

This first preservation commit must keep the existing survey-only behavior exactly. Task 2 atomically introduces `ActiveSurveyLookupResult` and updates the server wrapper, retry helper, and Daily Tasks call site together. Do not copy the primary index, stash, package files, or unrelated Daily Tasks changes.

- [ ] **Step 5: Verify and commit the isolated preservation change**

```powershell
npx jest tests/survey_daily_task_delivery_contract.test.ts --runInBand
git add app/survey_client.ts app/daily_tasks_screen.tsx tests/survey_daily_task_delivery_contract.test.ts
git commit -m "fix: preserve active survey delivery retry"
```

Expected: PASS. The primary workspace remains untouched.

## Task 2: Add account-safe fourth-task model, marker, and session cache

**Files:**
- Create: `app/survey_daily_challenge_model.ts`
- Create: `app/survey_daily_task_cache.ts`
- Modify: `app/survey_daily_task.ts`
- Modify: `app/survey_handoff.ts`
- Modify: `app/cloud_sync.ts`
- Modify: `app/survey_client.ts`
- Modify: `functions/src/shard_survey.ts`
- Create: `tests/survey_daily_challenge_model.test.ts`
- Create: `tests/survey_daily_task_cache.test.ts`
- Create: `tests/survey_daily_task_marker.test.ts`
- Modify: `tests/cloud_sync_daily_tasks_merge.test.ts`
- Create: `tests/shard_survey_completion_contract.test.ts`

- [ ] **Step 1: Write failing pure count/model tests**

Define fixtures for no survey, active survey, completed survey, zero/one/three base tasks, and all eight interface languages. Assert:

```ts
expect(computeSurveyDailyCounts({ baseTotal: 3, baseDone: 2, survey: null }))
  .toEqual({ total: 3, done: 2, rewardThreshold: 3 });
expect(computeSurveyDailyCounts({ baseTotal: 3, baseDone: 2, survey: { phase: 'active' } }))
  .toEqual({ total: 4, done: 2, rewardThreshold: 3 });
expect(computeSurveyDailyCounts({ baseTotal: 3, baseDone: 2, survey: { phase: 'completed' } }))
  .toEqual({ total: 4, done: 3, rewardThreshold: 3 });
```

- [ ] **Step 2: Write failing marker and cache tests**

Marker tests require an explicit scope:

```ts
const scope = { stableId: 'account-a', dayKey: '2026-07-11' };
await markSurveyDailyTaskDone(scope, { surveyId: 's1', title: 'Survey', rewardShards: 3, questionCount: 2 });
expect(await readSurveyDailyTaskCompletion(scope)).toMatchObject({ surveyId: 's1' });
expect(await readSurveyDailyTaskCompletion({ ...scope, stableId: 'account-b' })).toBeNull();
```

Assert that two different day writes for the same account replace one account-scoped value rather than create daily keys. Cache tests cover synchronous `peek`, TTL 60 seconds, maximum four entries, key changes for language/account/day, latest request wins, and retention of a completed snapshot when a newer server read returns `null`.

Add an account-wipe guard requiring the legacy key in `accountLocalDataKeysForToday()` (or its account-local extra-key set), plus a migration test proving a legacy marker created for account A is never attributed to account B after the wipe/switch sequence.

- [ ] **Step 3: Run pure tests and verify RED**

```powershell
npx jest tests/survey_daily_challenge_model.test.ts tests/survey_daily_task_cache.test.ts tests/survey_daily_task_marker.test.ts --runInBand
```

Expected: FAIL because the model/cache/scoped marker APIs do not exist.

- [ ] **Step 4: Add the backward-compatible authenticated completion signal**

Add `ActiveSurveyLookupResult` to `app/survey_client.ts`. Change the internal active-survey callable wrapper and retry helper to return both fields while keeping the request payload unchanged.

In `functions/src/shard_survey.ts`, every `getActiveShardSurvey` response returns:

```ts
{
  survey: localizedSurveyOrNull,
  completion: lastSurveyAtMs > 0 ? { completedAtMs: lastSurveyAtMs } : null,
}
```

This is additive, so old clients continue reading `survey`. Do not change `submitShardSurvey`. Add a contract proving the completion timestamp comes from the authenticated stable user's `progress.shard_survey_last_at_ms`, is returned alongside an active survey when applicable, and does not accept a client-provided completion value.

- [ ] **Step 5: Implement the typed model and calculations**

Create:

```ts
export type SurveyDailyChallengePhase = 'loading' | 'active' | 'completed' | 'submitting' | 'retryable-error';

export type SurveyDailyChallengeSnapshot = {
  surveyId: string;
  title: string;
  description: string;
  questionCount: number;
  rewardShards: number;
  phase: SurveyDailyChallengePhase;
  survey: ActiveSurvey | null;
};
```

`computeSurveyDailyCounts` clamps totals/done to non-negative integers and returns `rewardThreshold = survey ? Math.min(3, total) : baseTotal`. `buildSurveyDailyDescription(lang, questionCount, rewardShards)` returns complete localized copy for every `INTERFACE_LANGS` value without emoji.

Also export `buildServerConfirmedLegacyCompletion(lang)`, producing a renderable generic snapshot when the authenticated completion timestamp exists but old storage/server data has no survey metadata:

```ts
{
  surveyId: 'server-confirmed-completed-survey',
  title: localizedSurveyCompletedTitle,
  description: localizedCountedAsDailyTask,
  questionCount: 0,
  rewardShards: 0,
  phase: 'completed',
  survey: null,
}
```

Test this for all eight languages. It must never imply a new reward; it only preserves the completed fourth-card state.

- [ ] **Step 6: Replace the global marker with an account/day-scoped record**

Use one versioned key per non-reversible stable-id hash, for example `shard_survey_done_v2:<sha256-prefix>`. Store `dayKey` inside the value so a new day overwrites the same account key and storage cannot grow one key per day. Persist only the minimal completed summary.

Add `shard_survey_done_daykey_v1` to the account-local wipe set in `app/cloud_sync.ts`. Because the legacy value contains no owner identity, do not attribute it by itself. During revalidation, use the authenticated server response `completion.completedAtMs` as the migration proof: if that timestamp falls in the requested client `dayKey`, write the scoped v2 generic summary from `buildServerConfirmedLegacyCompletion(lang)` for the resolved `stableId`, then delete the legacy key. On account wipe, delete the legacy key. Test that a legacy marker without matching server confirmation produces `null` for account B. Capture the `dayKey` when opening the survey and use that same key after submit so crossing midnight cannot credit the next day.

- [ ] **Step 7: Implement the bounded session cache**

Use a module `Map` capped at four entries and TTL 60 seconds. Export:

```ts
export function peekSurveyDailyTask(scope: SurveyDailyTaskCacheScope, now = Date.now()): SurveyDailyChallengeSnapshot | null;
export function beginSurveyDailyTaskRequest(scope: SurveyDailyTaskCacheScope): number;
export function commitSurveyDailyTaskRequest(scope: SurveyDailyTaskCacheScope, requestId: number, snapshot: SurveyDailyChallengeSnapshot | null, now = Date.now()): boolean;
```

Reject stale request ids and refuse to replace a completed snapshot with `null`. Prune expired/oldest entries on every write.

- [ ] **Step 8: Extend handoff metadata**

Prime `{ survey, stableId, dayKey, lang }`, and let `takePrimedSurvey` fall back to the matching session cache entry when navigation remounts. Never return a cached localized survey for a different language/account/day.

- [ ] **Step 9: Verify and commit**

```powershell
npx jest tests/survey_daily_challenge_model.test.ts tests/survey_daily_task_cache.test.ts tests/survey_daily_task_marker.test.ts tests/cloud_sync_daily_tasks_merge.test.ts tests/shard_survey_completion_contract.test.ts --runInBand
git add app/survey_daily_challenge_model.ts app/survey_daily_task_cache.ts app/survey_daily_task.ts app/survey_handoff.ts app/survey_client.ts app/cloud_sync.ts functions/src/shard_survey.ts tests/survey_daily_challenge_model.test.ts tests/survey_daily_task_cache.test.ts tests/survey_daily_task_marker.test.ts tests/cloud_sync_daily_tasks_merge.test.ts tests/shard_survey_completion_contract.test.ts
git commit -m "feat: model account-safe survey daily challenge state"
```

Expected: PASS.

## Task 3: Make Daily Tasks the single survey-state owner

**Files:**
- Modify: `app/survey_client.ts`
- Modify: `app/daily_tasks_screen.tsx`
- Modify: `components/SurveyTaskCard.tsx`
- Create/Modify: `tests/survey_daily_task_delivery_contract.test.ts`

- [ ] **Step 1: Write the failing ownership and retry contract**

Add a source contract that requires a typed cached snapshot in the screen and forbids network/state ownership in `SurveyTaskCard`:

```ts
expect(screen).toContain('useState<SurveyDailyChallengeSnapshot | null>');
expect(screen).toContain('peekSurveyDailyTask');
expect(screen).toContain('commitSurveyDailyTaskRequest');
expect(screen).toContain('fetchActiveSurveyWithRetry({ stableId, platform: Platform.OS, lang })');
expect(card).not.toContain('useFocusEffect');
expect(card).not.toContain('fetchActiveSurvey');
expect(card).not.toContain('getCanonicalUserId');
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```powershell
npx jest tests/survey_daily_task_delivery_contract.test.ts --runInBand
```

Expected: FAIL because the card still fetches independently and Daily Tasks does not own the typed cached snapshot.

- [ ] **Step 3: Move the scoped cached snapshot into `DailyTasksScreen`**

Resolve `{ stableId, dayKey: getTodayKey(), lang }`, synchronously hydrate initial state from `peekSurveyDailyTask(scope)`, and compute counts only through `computeSurveyDailyCounts`. On focus, read `readSurveyDailyTaskCompletion({ stableId, dayKey })`; a completion summary builds a completed snapshot even when the server returns `null`. Otherwise begin a request id, fetch via `fetchActiveSurveyWithRetry`, inspect both `{ survey, completion }`, safely migrate a server-confirmed same-day completion, build the localized model, and commit only through `commitSurveyDailyTaskRequest`. Apply React state only when the commit returns `true` and the focus callback is not cancelled.

Quiet revalidation must preserve the previous snapshot on auth/network exceptions and skip `setState` when the semantic snapshot is unchanged.

- [ ] **Step 4: Convert `SurveyTaskCard` to typed presentation props**

Define:

```ts
export type SurveyTaskCardProps = {
  challenge: SurveyDailyChallengeSnapshot;
  onOpen: (challenge: SurveyDailyChallengeSnapshot) => void;
};
```

Remove `useFocusEffect`, canonical-id lookup, callable imports, router, and internal `survey`/`done` state. The parent omits the component when the snapshot is null.

- [ ] **Step 5: Run tests and commit**

```powershell
npx jest tests/survey_daily_task_delivery_contract.test.ts --runInBand
git add app/survey_client.ts app/daily_tasks_screen.tsx components/SurveyTaskCard.tsx tests/survey_daily_task_delivery_contract.test.ts
git commit -m "refactor: give daily challenges ownership of survey state"
```

Expected: contract PASS; no changes to callable payloads.

## Task 4: Render the survey as the fourth shared task and remove gray tracks

**Files:**
- Modify: `components/daily-tasks/DailyTaskCard.tsx`
- Modify: `components/SurveyTaskCard.tsx`
- Modify: `app/daily_tasks_screen.tsx`
- Modify: `tests/daily_tasks_text_integrity_render.test.tsx`
- Create: `tests/survey_daily_challenge_render.test.tsx`
- Modify: `jest.rntl.config.cjs`

- [ ] **Step 1: Add failing shared-card render tests**

Cover these exact assertions:

```tsx
await render(<DailyTaskCard {...base} progress={undefined} />);
expect(screen.queryByTestId('task-progress')).toBeNull();

await render(<DailyBonusCard {...base} testID="bonus" progress={<View testID="aggregate-progress" />} />);
expect(screen.getByTestId('aggregate-progress')).toBeTruthy();
```

Render the survey adapter with long Polish copy and assert:

```ts
expect(screen.getByTestId('daily-survey-task-title').props.children).toBe(longTitle);
expect(screen.getByTestId('daily-survey-task-description').props.children).toContain('7');
expect(StyleSheet.flatten(screen.getByTestId('daily-survey-task').props.style).borderRadius).toBe(22);
expect(screen.getByTestId('daily-survey-task-pressable')).toBeTruthy();
```

- [ ] **Step 2: Run RNTL and verify RED**

```powershell
npm run test:rntl -- --runInBand
```

Expected: FAIL because `progress` is required and `SurveyTaskCard` still has a bespoke shell.

- [ ] **Step 3: Make task progress optional and structurally absent**

Change the prop to `progress?: ReactNode`. Render progress wrappers only when `props.progress != null`:

```tsx
{props.progress != null && props.variant !== 'bonus' ? (
  <View testID={`${props.testID}-progress`} pointerEvents="none" style={styles.progressLayer} accessibilityRole="progressbar">
    {props.progress}
  </View>
) : null}
```

Keep `DailyBonusCard` requiring progress with an explicit type:

```ts
export type DailyBonusCardProps = Omit<DailyTaskCardProps, 'accentColor' | 'onPress' | 'reroll' | 'premium' | 'progress'> & {
  progress: ReactNode;
};
```

- [ ] **Step 4: Stop passing individual task tracks**

In the standard `sortedTasks.map` call, remove the `progress={<View ...taskCapsuleBottomTrack.../>}` prop. Retain task background fill/glow/accent, claim, reroll, Premium badge, and the aggregate `DailyBonusCard` progress prop. Remove unused `taskCapsuleBottomTrack`, `taskCapsuleBottomFill`, and gradient-only styles/imports only after a literal reference search confirms zero remaining consumers.

- [ ] **Step 5: Render survey option B through `DailyTaskCard`**

Use a fixed accessible violet palette that still respects gold/business theme text tokens:

```ts
const SURVEY_ACCENT = '#B98CFF';
const SURVEY_SURFACE = '#211B31';
const SURVEY_ICON_PLATE = '#493466';
```

The adapter passes `testID="daily-survey-task"`, `Ionicons name="chatbubble-ellipses-outline"`, full localized title/description, `claimed={challenge.phase === 'completed'}`, and the same check indicator used by tasks. The description comes from the typed challenge model; do not include `💎`. Use `onPress={() => onOpen(challenge)}` only while active. The parent extracts `challenge.survey`, primes it with account/day/language metadata, and navigates.

- [ ] **Step 6: Place the survey after normal tasks**

Remove the standalone `<SurveyTaskCard />` above the bonus/tasks block. Insert the typed survey card immediately after `sortedTasks.map(...)`, so visual order is the three generated tasks followed by survey. Derive list/header counts and the three-of-four threshold exclusively from `computeSurveyDailyCounts`.

- [ ] **Step 7: Register the exact RNTL file and run tests**

Add only `tests/survey_daily_challenge_render.test.tsx` to `jest.rntl.config.cjs` and its discovery assertion. Run:

```powershell
npm run test:rntl -- --runInBand
npx jest tests/daily_tasks_text_integrity_contract.test.ts tests/survey_daily_task_delivery_contract.test.ts --runInBand
```

Expected: PASS; individual gray tracks absent; aggregate bonus progress present.

- [ ] **Step 8: Commit**

```powershell
git add components/daily-tasks/DailyTaskCard.tsx components/SurveyTaskCard.tsx app/daily_tasks_screen.tsx tests/daily_tasks_text_integrity_render.test.tsx tests/survey_daily_challenge_render.test.tsx tests/survey_daily_task_delivery_contract.test.ts jest.rntl.config.cjs
git commit -m "feat: make survey the fourth daily challenge"
```

## Task 5: Add a pure optimistic submission state machine

**Files:**
- Create: `app/survey_submission_state.ts`
- Create: `tests/survey_submission_state.test.ts`

- [ ] **Step 1: Write failing reducer tests**

Test editing → optimistic reward, optimistic → reconciled, optimistic → retryable error, retry with a new attempt id, and stale response rejection:

```ts
const started = reduceSurveySubmission(initialSurveySubmissionState, { type: 'submit_started', attemptId: 1, expectedReward: 3 });
expect(started).toMatchObject({ phase: 'optimistic-reward', attemptId: 1, expectedReward: 3 });

const failed = reduceSurveySubmission(started, { type: 'submit_failed', attemptId: 1, messageKey: 'network' });
expect(failed).toMatchObject({ phase: 'retryable-error', expectedReward: 0 });

const stale = reduceSurveySubmission(retried, { type: 'submit_succeeded', attemptId: 1, reward: 3 });
expect(stale).toEqual(retried);
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npx jest tests/survey_submission_state.test.ts --runInBand
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement explicit states and attempt matching**

Use:

```ts
export type SurveySubmissionState =
  | { phase: 'editing'; attemptId: number; expectedReward: 0; confirmedReward: 0; messageKey: null }
  | { phase: 'optimistic-reward'; attemptId: number; expectedReward: number; confirmedReward: 0; messageKey: null }
  | { phase: 'reconciled'; attemptId: number; expectedReward: number; confirmedReward: number; messageKey: null }
  | { phase: 'retryable-error'; attemptId: number; expectedReward: 0; confirmedReward: 0; messageKey: SurveySubmitErrorKey };
```

All success/failure actions return the current state unchanged when `action.attemptId !== state.attemptId`. Export `surveyRewardForDisplay(state)` so rendering never duplicates reward arithmetic.

- [ ] **Step 4: Verify and commit**

```powershell
npx jest tests/survey_submission_state.test.ts --runInBand
git add app/survey_submission_state.ts tests/survey_submission_state.test.ts
git commit -m "feat: model optimistic survey submission"
```

Expected: PASS.

## Task 6: Build branded reward and retry presentation

**Files:**
- Create: `components/survey/SurveyRewardPanel.tsx`
- Modify: `tests/survey_daily_challenge_render.test.tsx`

- [ ] **Step 1: Add failing reward/error presentation tests**

Render optimistic, reconciled, and error phases. Assert the shard image exists, emoji does not, retry is 44px minimum, answers/error copy are accessible, and reduced motion can skip decorative animation:

```ts
expect(screen.getByTestId('survey-reward-shard-asset').props.source).toBeTruthy();
expect(screen.queryByText('💎')).toBeNull();
expect(screen.getByRole('button', { name: retryLabel })).toBeTruthy();
expect(StyleSheet.flatten(screen.getByTestId('survey-retry').props.style).minHeight).toBeGreaterThanOrEqual(44);
```

- [ ] **Step 2: Verify RED**

```powershell
npm run test:rntl -- --runInBand
```

Expected: FAIL because `SurveyRewardPanel` does not exist.

- [ ] **Step 3: Implement `SurveyRewardPanel`**

Use Expo `Image` with:

```tsx
<Image
  testID="survey-reward-shard-asset"
  source={oskolokImageForPackShards(Math.max(1, reward), themeMode)}
  style={styles.shardImage}
  contentFit="contain"
/>
```

The panel accepts `phase`, `reward`, localized title/subtitle/error strings, `onDone`, and `onRetry`. It uses `FlowText`, Ionicons for success/error, no native `Alert`, and a normal in-screen retry panel. Animation is transform/opacity only and must not own navigation timing.

- [ ] **Step 4: Verify and commit**

```powershell
npm run test:rntl -- --runInBand
git add components/survey/SurveyRewardPanel.tsx tests/survey_daily_challenge_render.test.tsx
git commit -m "feat: add branded survey reward and retry panel"
```

## Task 7: Wire optimistic submit, reconciliation, retry, and auto-return

**Files:**
- Modify: `app/survey_screen.tsx`
- Modify: `app/survey_daily_task.ts`
- Create: `tests/survey_screen_submission_contract.test.ts`
- Modify: `tests/survey_daily_challenge_render.test.tsx`

- [ ] **Step 1: Write failing flow contracts**

Require:

```ts
expect(screenSource).toContain("type: 'submit_started'");
expect(screenSource).toContain("type: 'submit_succeeded'");
expect(screenSource).toContain("type: 'submit_failed'");
expect(screenSource).toContain('<SurveyRewardPanel');
expect(screenSource).not.toContain('<Text style={{ fontSize: 44 }}>💎</Text>');
expect(screenSource).not.toContain('Alert.alert');
expect(screenSource).toContain('markSurveyDailyTaskDone({ stableId, dayKey: openedDayKey }');
expect(screenSource.indexOf('markSurveyDailyTaskDone')).toBeGreaterThan(screenSource.indexOf('await submitSurvey'));
```

Also assert an auto-return timeout is scheduled only after reconciliation and cleared on unmount/retry.

Add an RNTL integration case with a deferred `submitSurvey` promise: submit, unmount, then resolve and reject in separate tests. Resolve must complete authoritative balance/marker reconciliation but must not dispatch React state, schedule navigation, or emit an unmounted warning. Reject after unmount must not dispatch or navigate.

Add a third deferred case: capture generation for account A, submit, call `beginAccountGeneration('account-b')`, then resolve A's request. Assert no `replaceShardsBalanceLocal`, scoped marker write, session-cache commit, React dispatch, or navigation occurs in account B's local session.

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/survey_screen_submission_contract.test.ts --runInBand
```

Expected: FAIL because current submit waits before showing reward and uses emoji.

- [ ] **Step 3: Replace submit booleans with reducer state**

Keep `answers` untouched across failure. At press time:

```ts
const attemptId = ++attemptIdRef.current;
dispatch({ type: 'submit_started', attemptId, expectedReward: survey.rewardShards });
```

After resolving `stableId`, capture `const accountToken = captureAccountGeneration()` and require `accountToken.stableId === stableId && accountToken.phase === 'active'` before sending. Then call `submitSurvey`. Do not optimistically mutate canonical shard storage or the durable daily marker. Split same-generation authoritative side effects from mounted UI effects.

On success, first check `isCurrentAccountGeneration(accountToken, stableId)`. If false, stop all local reconciliation: the server transaction for account A remains authoritative and will sync on its next login, while account B receives no old balance/marker/cache writes. If true, reconcile `balanceAfter` and call `markSurveyDailyTaskDone({ stableId, dayKey: openedDayKey }, completedSummary)` even if the screen merely unmounted during ordinary navigation. Update the matching session-cache snapshot as part of that same-generation authoritative path. Only when `mountedRef.current` and the attempt is still current may the code emit presentation events, dispatch success, or schedule navigation. Emit `shards_earned` only when `reward > 0`. On `reward === 0`, reconcile as completed with zero confirmed reward and use localized already-completed copy.

- [ ] **Step 4: Implement safe failure and retry**

Map the existing error families to `SurveySubmitErrorKey`; dispatch failure only when `mountedRef.current` and the attempt is current. Keep `answers`, current question, and primed survey. Retry calls the same `onSubmit` with a new attempt id. Disable the final action while a request is active. Set `mountedRef.current = false` and clear navigation timers in effect cleanup.

- [ ] **Step 5: Implement confirmed auto-return**

After state becomes `reconciled`, schedule a 1200–1600ms return with a ref-owned timeout. Clear it on unmount, manual `Готово`, retry, and any phase change. The visible localized `Готово` action calls the same idempotent close function immediately. Never auto-return from `optimistic-reward` before the server confirms.

- [ ] **Step 6: Render `SurveyRewardPanel` and preserve complete copy**

Replace the emoji final screen and action-toast error branch with `SurveyRewardPanel`. Keep system-level `ActionToast` only outside this survey submit/reward/error flow. Convert survey title/final copy to `FlowText` or unrestricted native `Text` with no truncation prop.

- [ ] **Step 7: Run focused tests and commit**

```powershell
npx jest tests/survey_submission_state.test.ts tests/survey_screen_submission_contract.test.ts --runInBand
npm run test:rntl -- --runInBand
git add app/survey_screen.tsx app/survey_daily_task.ts components/survey/SurveyRewardPanel.tsx tests/survey_screen_submission_contract.test.ts tests/survey_daily_challenge_render.test.tsx
git commit -m "feat: submit surveys with optimistic in-app feedback"
```

## Task 8: Verify daily counts, server idempotency, text integrity, and performance

**Files:**
- Modify only if a focused test exposes a defect: `tests/survey_daily_task_delivery_contract.test.ts`, `tests/daily_tasks_text_integrity_contract.test.ts`, `config/text-integrity-baseline.json`
- Create: `tests/shard_survey_idempotency_contract.test.ts`

- [ ] **Step 1: Freeze and verify server idempotency without changing the callable**

Create a contract over `functions/src/shard_survey.ts` and `app/survey_client.ts` that requires:

```ts
expect(server).toContain('responseDocId(surveyId, stableUid)');
expect(server).toContain("doc(`survey_${surveyId}`)");
expect(server).toContain('alreadyGranted: true, reward: 0');
expect(client).not.toContain('attemptId:');
```

Slice the `if (claimSnap.exists)` branch and assert it does not update `userRef` shard balance or `statsRef`. Slice the first-grant branch and assert balance/stats writes remain inside the same transaction. This freezes response id `surveyId__stableUid`, claim id `survey_${surveyId}`, no repeat balance/stats increment, and unchanged callable payload.

```powershell
npx jest tests/shard_survey_idempotency_contract.test.ts --runInBand
Push-Location functions; npm test -- --runInBand src/shard_survey_core.test.ts; Pop-Location
```

Expected: contract and pure core tests PASS. The planned additive `getActiveShardSurvey` completion field is allowed. Do not modify the `submitShardSurvey` request payload, transaction, claim branch, balance writes, or stats writes unless a new failing mocked-transaction test proves a separate server defect.

- [ ] **Step 2: Run Daily Challenge count and UI contracts**

```powershell
npx jest tests/survey_daily_task_delivery_contract.test.ts tests/daily_tasks_text_integrity_contract.test.ts tests/daily_tasks_trainer_availability.test.ts tests/survey_screen_submission_contract.test.ts tests/shard_survey_idempotency_contract.test.ts --runInBand
npm run test:rntl -- --runInBand
```

Expected: survey absent/present/completed counts pass; three-of-four threshold remains; 44px actions, long copy, and aggregate bonus progress pass.

- [ ] **Step 3: Run the Text Integrity ratchet before any baseline write**

```powershell
npm run text-integrity:audit
```

Expected: no added groups or count increases. If only migrated survey/card truncation groups are removed, use `npm run text-integrity:update-baseline` and review that the manifest shrinks only. Never accept additions from unrelated dirty work.

- [ ] **Step 4: Run lint and performance/navigation guards**

```powershell
npx eslint app/survey_screen.tsx app/survey_submission_state.ts app/survey_daily_task.ts app/survey_client.ts app/daily_tasks_screen.tsx components/SurveyTaskCard.tsx components/survey components/daily-tasks
npx jest tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/owner_direction_runtime_contract.test.ts --runInBand
git diff --check
```

Expected: no lint errors; no new timers/subscriptions outside the one cleared auto-return timeout; navigation guards pass. Record unrelated pre-existing owner-direction drift separately rather than weakening its allowlist.

- [ ] **Step 5: Manually inspect the approved matrix**

On the LAN build, inspect default/gold/business themes at narrow phone width and 200% font scale:

- active violet survey as item four;
- no gray strip on each standard task;
- aggregate bonus meter still visible;
- long title/description wrap completely;
- immediate optimistic reward panel;
- correct shard asset and no emoji;
- confirmed auto-return plus manual `Готово`;
- simulated failure retains answers and exposes retry;
- completed card persists on return.

- [ ] **Step 6: Request final Advisor review**

Provide the approved spec, actual diff, test output, audit counts, screenshots, and any unresolved unrelated worktree drift. Completion requires `DECISION: APPROVED`.

- [ ] **Step 7: Commit verification-only updates**

If verification legitimately shrank the baseline or adjusted focused tests:

```powershell
git add config/text-integrity-baseline.json tests/survey_daily_task_delivery_contract.test.ts tests/daily_tasks_text_integrity_contract.test.ts tests/shard_survey_idempotency_contract.test.ts
git commit -m "test: verify survey daily challenge integration"
```

Skip this commit when there are no verification-only file changes.

## Integration note

The primary workspace contained uncommitted survey retry work when this clean planning worktree was created. Before final integration, compare `app/survey_client.ts`, `app/daily_tasks_screen.tsx`, and `tests/survey_daily_task_delivery_contract.test.ts` against the primary workspace. Preserve the bounded retry behavior and its tests; never overwrite newer user changes while merging the implementation branch.
