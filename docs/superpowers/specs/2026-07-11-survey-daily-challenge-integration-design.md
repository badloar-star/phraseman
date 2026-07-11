# Survey Daily Challenge Integration Design

## Goal

Make the active shard survey a genuine fourth Daily Challenge rather than a visually separate banner. It must share the task-card geometry and interaction quality, use a deliberate violet survey accent, update optimistically, avoid system alerts, and use the existing shard artwork instead of emoji.

This work also removes the unexplained gray bottom tracks from every Daily Challenge card. No replacement progress line is added.

## User Experience

### Daily Challenges list

- The survey appears in the same ordered task list as the other challenges, not in a separate block above them.
- It uses the extracted `DailyTaskCard` presentation and therefore matches task radius, padding, typography, icon plate, responsive reflow, touch target, theme behavior, and complete-text policy.
- The survey keeps a distinct violet fill/glow/accent so users can recognize it without interpreting it as an optional banner.
- Its title and full description remain visible without truncation.
- Its description states the number of questions and shard reward using localized copy.
- The leading icon is a consistent vector survey icon. Shard rewards use the existing shard image asset, never `💎` or another emoji.
- The list count and completion logic treat the survey as the fourth task. Existing three-of-four daily-bonus semantics remain unchanged.
- Completed state remains visible until the daily reset and uses the same claimed/completed language as other tasks.

### Gray track removal

- Remove the bottom gray track from all standard Daily Challenge cards.
- Do not add a colored progress bar as a replacement.
- Keep task completion, claim, reroll, Premium badge, accent bar, fill/glow, and accessibility behavior intact.
- The daily bonus card may retain its meaningful aggregate completion meter because it communicates progress across the challenge set; this requirement concerns the decorative gray line on each individual task card.

### Survey completion journey

1. The user answers every survey question and presses the final submit action.
2. The client preserves the answers and immediately enters an optimistic success state.
3. The survey is locally marked complete, the Daily Challenge card can render as completed on return, and the expected shard delta is reflected in the visible reward presentation.
4. A short branded reward screen uses `oskolokImageForPackShards(...)` (or the equivalent established shard asset map) and localized `+N shards` copy.
5. After a short accessible delay, the app automatically returns to Daily Challenges. A visible `Готово`/localized action remains available so the user is never trapped by animation timing.
6. The server response reconciles the authoritative shard balance and completion status. Idempotent `reward === 0` responses do not double-credit or show a misleading second reward.

### Failure and retry

- A failed submission rolls back only the optimistic completion/reward state.
- Answers remain in memory; the user does not refill the survey.
- Show an in-app error panel/toast with localized plain-language copy and a 44-pixel-minimum `Retry` action.
- Do not use `Alert.alert`, platform system dialogs, or raw system notifications in the survey submit/reward/error flow.
- Repeated presses are guarded while a request is active.
- Retry uses the same submission identity/idempotency contract so the server cannot award twice.

## Architecture

### Single owner for active-survey state

`DailyTasksScreen` owns the active-survey and daily-completion snapshot used for task counts and rendering. `SurveyTaskCard` no longer performs a second independent fetch. The screen passes a typed survey-task model into the shared presentation. This prevents list count and card visibility from disagreeing during auth/cloud hydration.

The model includes:

- survey id;
- localized title/description;
- question count;
- reward shards;
- `loading | active | completed | submitting | retryable-error` state;
- open/retry handlers;
- accessibility labels.

### Shared presentation

Use `DailyTaskCard` for the survey task. Extend its typed presentation API only where a reusable state is missing; do not reintroduce a second bespoke card shell. Survey-specific data, navigation, and persistence remain outside the presentation component.

Individual task cards stop passing/rendering the bottom progress-track slot. The daily aggregate bonus card keeps its separate progress composition.

### Optimistic transaction

The survey submit controller records a pre-submit snapshot of:

- answers;
- local daily-completion marker;
- visible shard balance/version;
- current survey UI phase.

It then applies the optimistic state once. On success it reconciles to the server balance/version and commits the daily marker. On failure it restores the completion/reward snapshot while retaining answers and exposes retry state. Navigation/unmount must not apply stale responses to a newer attempt.

## Visual and Accessibility Rules

- Match the established task capsule geometry; survey distinction comes from violet theme presentation, not a different layout.
- Preserve dark foreground on any bright lime/green action surface.
- No emoji UI icons. Use Ionicons for survey/check/retry affordances and an existing bundled shard image for rewards.
- All controls are at least 44×44 logical pixels.
- Full authored/localized text is visible; no `numberOfLines`, ellipsis, or disabled font scaling on semantic copy.
- Reward motion uses transform/opacity, respects reduced-motion settings, and does not delay the actionable completion path.
- Error information is conveyed by text and icon, not color alone.

## Data and Compatibility

- Preserve existing callable payloads, Firestore survey documents, reward reconciliation, and daily marker keys unless investigation proves a contract gap.
- Preserve `fetchActiveSurveyWithRetry`, survey handoff, cloud-enable behavior, and three-of-four bonus calculations.
- Existing completed users must continue to see a completed fourth-task state even when the server no longer returns the already-completed active survey.
- Offline or settling auth state must not briefly remove a previously known survey card; hydrate from the last known in-session snapshot where available and quietly revalidate.

## Testing

- Contract test: survey renders through `DailyTaskCard` inside the task list and no standalone card shell remains.
- Render tests: active, submitting, completed, reward, retryable error, long localized copy, large font, narrow width, gold/business/default themes.
- State tests: optimistic apply, authoritative reconciliation, `reward === 0`, network failure rollback, retry, repeated press, stale response after unmount.
- Asset test: no `💎`/reward emoji in survey card or reward screen; established shard asset is wired.
- Notification test: no `Alert.alert` or platform notification in the survey flow; in-app feedback and retry are reachable.
- Daily-count tests: survey absent/present/completed and existing three-of-four threshold.
- Regression test: individual task-card gray tracks are absent while aggregate bonus progress remains.
- Run Text Integrity audit without increasing the baseline, focused performance/navigation guards, and the dedicated RNTL harness.

## Acceptance Criteria

- The survey is visually and semantically the fourth Daily Challenge.
- The approved violet-accent option B is used.
- Individual challenge cards show no bottom gray strip.
- Submission feels immediate and reconciles safely with server truth.
- Failure never loses answers and offers an in-app retry.
- No system alert is used in the user survey journey.
- Every shard reward uses the correct bundled asset instead of emoji.
- Existing survey, reward, daily-bonus, reroll, Premium, theme, and accessibility behavior remains available.
