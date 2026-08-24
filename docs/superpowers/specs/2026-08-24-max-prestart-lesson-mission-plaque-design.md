# MAX prestart lesson mission plaque — design

**Date:** 2026-08-24  
**Status:** owner-approved visual direction; implementation not started  
**Approved option:** A — light-glass mission card with one-shot typewriter text

## Mission

When the learner opens the main MAX tutor section and the premint is still
preparing, do not show a disabled Start button. Show a calm animated mission
card in the same CTA slot. The card types one short, personalized sentence
describing today's work with MAX. The instant premint becomes usable, the card
is replaced by the active `Начать урок` CTA; the animation must never delay the
conversation.

## Scope

- Applies only to the primary tutor entry (`format === "tutor"`).
- Keeps Home preview prefetch, tile-tap premint, prestart premint reuse, quota
  handling, retry behavior, consent, and navigation intact.
- Does not change scenario, companion, or trial prestart surfaces.
- Does not add a new LLM/API call, generated copy pipeline, Firestore field, or
  authoring-content dependency.

## User-visible states

### Preparing

- The normal tutor CTA slot contains the mission card, not a disabled button.
- Card label: locale-native equivalent of `Сегодня с MAX`.
- Body: one short personalized mission sentence.
- Characters appear once from left to right with a visible static caret.
- The final text footprint is reserved before animation starts, so neither the
  card nor surrounding content moves as characters appear.

### Ready

- The mission card is replaced immediately by the active `Начать урок` CTA.
- If readiness arrives mid-sentence, typing stops and the CTA transition starts
  immediately. There is no minimum display time and no wait for the sentence
  to finish.
- The card-to-CTA resolve uses only opacity/transform and the existing Motion
  Hybrid timing tokens; it must not alter layout geometry.

### Failed or unavailable

- Existing localized failure text and retry action remain authoritative.
- The mission card is not presented as progress after preparation has failed.
- No active Start CTA is exposed without a ready premint.
- Existing no-minutes messaging remains unchanged and takes precedence over a
  start action.

## Mission source and advance determination

The mission is `MaxTutorPreview.outcome`, already computed by the existing
read-only tutor preview and prefetched on Home before the learner taps the MAX
tile. Prestart initializes synchronously from `peekMaxTutorPreview`, then shares
the same in-flight/fresh cache through `prefetchMaxTutorPreview`.

This preserves the approved sequence:

1. Home prefetches the lesson preview, including `displayTitle` and `outcome`.
2. The MAX tile tap begins premint and navigates immediately.
3. Prestart reuses the cached preview for the mission and the matching premint
   entry for voice readiness.
4. The mission card exists only while that premint is `preparing`.

If no preview value is available on the first frame, the existing authored,
locale-native tutor fallback supplies the sentence. Arrival of a real preview
may replace that fallback once; the typing sequence restarts for the final
mission. It must never restart repeatedly for an unchanged string.

## Component boundary

Add the focused presentational component
`components/max/MaxLessonMissionPlaque.tsx` with this public responsibility:

- input: full mission string and interface language;
- input: whether Reduce Motion is enabled;
- output: a non-interactive, fixed-footprint mission card;
- internal behavior: one-shot character reveal with cleanup on text change and
  unmount.

`app/max_call_prestart.tsx` owns state selection:

- `preparing` + tutor → mission plaque;
- `ready` + minutes available → active Start CTA;
- failure/no minutes → existing error/quota handling.

The component does not know about premint, navigation, Firebase, quota, or
preview fetching.

## Motion and visual rules

- Follow Motion Hybrid “Световод”: light/depth, no bounce and no reward impact.
- Use theme tokens only; lime/green surfaces use dark foreground.
- Motion values live in `constants/motionHybrid.ts`; no local magic timings.
- Character reveal is finite and uses a cleaned-up `setTimeout` chain, not a
  background interval or an infinite loop.
- Card/CTA transition uses transform/opacity only.
- Under Reduce Motion, render the complete sentence on the first frame and use
  an instantaneous or token-approved minimal state resolve.
- The caret is static in production; no perpetual blink loop.
- Reserve the full sentence's final measured footprint by rendering an
  invisible full-text layout copy with the animated visible copy over it.
- Support large text up to the surrounding screen's existing
  `maxFontSizeMultiplier={2}` contract.

## Accessibility

- The card is informational, not a disabled control.
- Expose the complete mission as one accessibility label; do not announce each
  character or mark the card as busy.
- Animated text fragments are hidden from the accessibility tree so screen
  readers receive one stable sentence.
- The ready CTA retains its existing localized label, hint, role, and dark text
  on the bright accent surface.
- Failure and readiness announcements remain polite and unchanged.

## Testing and acceptance criteria

### RED contracts

1. Tutor `preparing` renders the mission plaque and no Start button.
2. Tutor `ready` with minutes renders the Start button and no mission plaque.
3. Readiness replaces a partially typed mission immediately.
4. The mission comes from the prefetched `MaxTutorPreview.outcome`; no new
   network/generation seam is introduced.
5. Reduce Motion renders the complete mission without character timers.
6. Timer cleanup prevents updates after unmount or mission replacement.
7. Full hidden text reserves layout height while visible text is typed.
8. Scenario/companion/trial behavior remains unchanged.

### Focused GREEN verification

- New mission-plaque unit/contract tests.
- Existing MAX prestart readiness, preview, premint, accessibility, design, and
  Home-entry focused contracts, excluding only independently documented stale
  assertions not caused by this change.
- `git diff --check` for touched files.

## Non-goals

- No artificial delay to showcase the animation.
- No multi-step checklist, rotating tips, progress percentage, spinner, or
  decorative infinite animation.
- No mission generation during premint.
- No changes to lesson goal selection, MAX tutor pedagogy, voice prompt, billing
  minutes, or server reservation semantics.
