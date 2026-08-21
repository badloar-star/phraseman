# Home Survey Sheet Redesign

**Date:** 2026-08-21
**Status:** Approved design; implementation not started

## Goal

Replace the visually heavy survey card on Home and the standalone-looking survey screen with one coherent, lightweight interaction:

1. Home shows a compact task row with the real survey title and the fixed `+1` shard reward.
2. Tapping the row opens a high, animated bottom sheet over Home.
3. Motion follows the approved Phraseman hybrid, **«Световод + Чекан»**, without continuous decorative animation or expensive layout animation.

The redesign must preserve the existing survey fetch, account-scope, submission, completion-marker, retry, and immutable economy-event behavior.

## Approved Visual Decisions

### Home task row

- Replace the current large rounded reward card with a compact row integrated into the Home content flow.
- Remove the green accent strip on the left completely.
- Stop rendering the gold `survey.webp` artwork in this surface. Do not delete the asset as part of this task.
- Render a quiet circular survey/clipboard icon using the existing icon system; do not add a new raster asset.
- The center of the row contains **only** `challenge.title`, the real active survey title.
- Do not render `challenge.description`, an eyebrow such as “Опрос дня”, question count, or any secondary line.
- Allow the title to wrap to two lines so meaningful names are not truncated prematurely.
- The trailing element is a compact shard marker and `+1`. It is not a green edge or a full CTA button.
- The row has no hard outline. Separation comes from a low-contrast tonal fill, one subtle top highlight, and spacing.
- Active rows are buttons with a minimum 44×44 touch target. Completed or unavailable rows preserve the current disabled semantics.

The displayed reward must use the same fixed survey reward contract as submission (`SHARD_REWARDS.survey_completed`), not an editable survey-config amount that the server ignores.

### Survey modal sheet

- Home opens a modal bottom sheet instead of navigating the primary user flow to a full-screen survey route.
- Use `HybridSheetShell`; do not create another modal or gesture implementation.
- The sheet is high and stable, using the existing shell ceiling of `maxHeight: 86%`. Its outer height must not animate between questions.
- Home remains visible under the standard dimmed backdrop.
- Top order: grabber, real survey title, `current / total`, segmented progress.
- Body order: question, answer controls, flexible space, primary action.
- The primary action stays pinned visually at the bottom of the sheet and respects the safe-area and keyboard inset.
- Long questions and text answers scroll inside the content region; the sheet itself stays planted.
- One question is visible at a time.
- Selected answers use a purple tonal fill and a radio/check state. Lime is reserved for the primary action and must use dark foreground text.
- No nested card surrounds the complete question. The sheet is the containing surface.

For unusually large question counts, progress must remain legible. Use one segment per question while the segments remain at least 4 px wide; otherwise use a compact transform-driven progress fill plus the numeric count. Do not animate `width`.

### Completion and error states

- Submission, retryable errors, account-change errors, and completion all remain inside the same sheet. Do not open a second native modal or alert.
- Optimistic submission disables answer controls and the action button while keeping the current content stable.
- Retryable failure shows a concise inline error with Retry and Back actions.
- `account_changed` keeps Retry disabled and directs the user to close and reopen the survey, matching the existing behavior.
- Successful completion replaces the question content with the shard reward, `+1 осколок`, configured final title/subtitle where available, and a `Готово` action.
- Preserve the existing short automatic return after reconciled success, while the explicit `Готово` action remains available.

## Motion Design

All new motion numbers come from `constants/motionHybrid.ts`. No local spring, duration, or easing literals are allowed in the new survey surface.

### 1. Home press

- Use `PressableHybrid` with `variant="card"`.
- Press scale is `PRESS.scale.card` (`0.988`) with `PRESS.downMs`.
- No opacity drop during normal motion. Reduce Motion may use the primitive’s existing opacity feedback.

### 2. Sheet entrance and exit

- Delegate backdrop, rise, drag, dismiss, cancellation, and Reduce Motion to `HybridSheetShell`.
- Entrance is `LUM`: backdrop resolves, the sheet rises from below with `LUM.settle`, and there is no bounce.
- Exit is shorter through `LUM.exitMs`.
- The sheet remains interruptible and swipe-dismissable.

### 3. Question transitions

- The sheet never moves when the step changes.
- Add `SURVEY_HYBRID.questionShiftPx = 8` to `constants/motionHybrid.ts` and use that shared token for step motion.
- Forward: old content moves `SURVEY_HYBRID.questionShiftPx` left while fading; new content resolves from the same distance on the right.
- Backward: reverse those directions.
- Use only `transform` and `opacity`, with `LUM.contentMs` and an ease-out curve already represented by the hybrid primitives.
- Prevent double-step transitions while preserving immediate answer selection.
- Under Reduce Motion, remove translation and keep a brief opacity/state change only.

### 4. Answer and progress feedback

- Answer rows use the hybrid card press, not legacy `TapScale` (`0.88` scale plus opacity).
- Selection changes color and radio/check state; it does not bounce.
- Progress changes by segment state or transform scale, never animated width/height.
- No infinite shimmer, floating icon, pulse, parallax, blur animation, or decorative loop.

### 5. Reward culmination

- `CHK` is used only for the final shard reward.
- The shard receives one short impact/light response, then rests completely.
- Supporting copy and `Готово` resolve through `LUM`; they do not share the impact spring.
- Under Reduce Motion, keep the color/opacity resolution and remove impact displacement.

## Architecture

### Presentation boundary

Create a dedicated `components/survey/SurveySheetModal.tsx` that owns the approved sheet layout and presentation state. It receives the active `SurveyOfferSnapshot`, stable account/day/language scope, visibility, and close/completion callbacks.

Do not duplicate the submission algorithm. Extract the reusable survey flow state and actions from `app/survey_screen.tsx` into one controller/hook used by both the sheet and the compatibility route. That shared owner must continue to handle:

- answers and current step;
- monotonic request/attempt guards;
- account-generation checks;
- optimistic reward state and reconciliation;
- auto-return timer cleanup;
- completion marker and offer-cache update;
- retryable error mapping.

`app/(tabs)/home.tsx` owns only whether the selected survey sheet is open. `SurveyTaskCard` remains a pure render component and must not fetch, resolve identity, prime handoff state, or navigate itself.

### Compatibility route

Keep `app/survey_screen.tsx` and its route registration. Existing dev showcase, stale navigation state, or external/internal callers must continue to resolve safely. The compatibility route should delegate to the same flow/controller rather than retaining a second implementation.

The primary Home path changes from `primeSurvey` + `router.push('/survey_screen')` to opening the local sheet with the already scoped survey offer. The existing scoped handoff remains available for compatibility callers until a separate removal is explicitly approved.

## Data, Economy, and Account Invariants

This is a presentation refactor only. No Firestore collection, field, Cloud Function, admin surface, or Jarvis contract changes are in scope.

The implementation must preserve the following behavior exactly, even if its source location changes:

- `submitSurvey` as the server submission boundary;
- reward display based on `SHARD_REWARDS.survey_completed`;
- `commitConfirmedExternalShardEvent` with the same immutable `survey_reward` grant and `surveyId` event key;
- no server balance projection and no direct shard balance write;
- `markSurveyOfferDone` before presenting reconciled success;
- account-generation checks before and after every asynchronous account-sensitive step;
- the opened day key captured once for the session;
- scoped separation by `stableId`, `dayKey`, and language;
- retry idempotency and the existing active-request guard.

Closing the sheet during submission must not allow a late request to update an unmounted or different-account surface.

## Accessibility

- Sheet uses `accessibilityViewIsModal` through `HybridSheetShell`.
- Backdrop and swipe dismissal retain an explicit localized close label.
- Survey title is announced once; question text is a heading.
- Progress announces “question N of M”; visual segments are hidden from screen readers.
- Answer rows expose selected/disabled state and remain at least 44 px high.
- Submission and error state changes use polite/assertive live regions as appropriate.
- The shard illustration is decorative; the reward text supplies the accessible meaning.
- Dynamic type must not clip the title, question, options, error text, or bottom action. Content becomes scrollable before controls overlap.
- Reduce Motion follows the behavior defined in the Motion Design section.

## Performance Constraints

- Only `transform` and `opacity` animate.
- Use Reanimated/shared hybrid primitives already present in the project; do not add an animation dependency.
- No background timer, continuous loop, blur view, animated height, or per-frame React state.
- Cancel in-flight animations and auto-return timers on close/unmount.
- Keep the Home offer fetch policy unchanged; opening the sheet must not refetch the survey.
- Reuse the already loaded `surveyOffer.challenge.survey` object.

## Tests and Acceptance Criteria

Update existing source-level contracts that currently require Home to navigate to `/survey_screen`; replace them with the new sheet ownership contract while preserving the compatibility route assertions.

Required focused coverage:

1. `SurveyTaskCard` renders the real title, no description, no accent strip, no gold art, and the fixed `+1` reward.
2. Active/disabled accessibility and `onOpen` behavior remain intact.
3. Home opens and closes `SurveySheetModal` without refetching or cross-account/day/language leakage.
4. The sheet uses `HybridSheetShell`, `PressableHybrid`, and shared hybrid motion tokens.
5. Forward/back transitions are direction-aware and Reduce Motion removes translation.
6. Long question/title/option and text-input cases scroll without changing the outer sheet height.
7. Submission behavior, identity-generation gates, immutable reward event, completion marker, cache reconciliation, retry, and timer cleanup preserve current tests.
8. Closing during submit cannot present late success or error in another account/session.
9. The final reward uses the shard asset, dark-on-lime CTA contrast, and no second modal/alert.
10. `tests/motion_hybrid_contract.test.ts` and the focused survey contracts pass without weakening their guards.

## Out of Scope

- Survey backend, schema, admin editor, reward amount, or question authoring changes.
- Removing the compatibility route, scoped handoff, or the existing raster asset from the repository.
- Redesigning inbox polls or the Plus/VIP survey.
- Adding analytics or telemetry events.
- Broad migration of legacy animation primitives elsewhere in the app.
