# Daily Phrase Once-Daily Pulse Design

## Goal

Make the home-screen Daily Phrase card communicate that the whole container is tappable without showing a separate “Check yourself” action.

## Scope

- Remove the visible `homeAdditionalAction` / `homeAdditionalActionText` CTA from the `homeAdditional` Daily Phrase card.
- Keep the entire card as the existing accessible `Pressable` that opens the details quiz.
- Add a short two-pulse scale cue to the complete `homeAdditional` card.
- Do not change the compact/default Daily Phrase card, the modal quiz, rewards, storage for answered state, phrase data, deep links, or widget synchronization.

## Visibility and Daily Eligibility

The home screen owns viewport detection because it owns the vertical `BouncyScrollView`. It will combine its existing scroll handler with a lightweight visibility check for the Daily Phrase card. The cue becomes eligible when at least 50% of the card intersects the visible window.

The cue is shown at most once per local calendar day. A versioned AsyncStorage marker stores the last local date on which the cue began. The marker is written before animation starts so rerenders, tab switches, or interrupted animation cannot replay it on the same day. Storage failure must fail quietly and must not block rendering or pressing the card; the in-memory guard still prevents repeated playback during the current mount.

## Motion

Animate only `transform: scale` with the native driver:

1. scale `1` to `1.025`;
2. return to `1`;
3. repeat once;
4. settle exactly at `1`.

The sequence is brief and restrained, with no infinite loop, interval, layout-property animation, sound, or haptic feedback. If Reduce Motion is enabled, skip the cue and leave scale at `1`.

The existing pressed feedback and details-opening behavior remain unchanged.

## Accessibility

- The whole card remains one accessible button.
- Its accessibility label contains the title and current phrase but no removed CTA copy.
- Reduce Motion prevents the decorative pulse.
- Removing the CTA does not reduce the touch target because the parent card remains pressable.

## Testing

Focused tests will verify that:

- the `homeAdditional` render branch no longer contains the CTA or its label;
- the complete card receives the animated scale transform;
- visibility must cross the chosen threshold before eligibility is consumed;
- the same local-day marker cannot trigger twice;
- a new local date can trigger again;
- Reduce Motion skips playback;
- the animation is a finite two-pulse native-driver sequence with cleanup and a final scale of `1`;
- existing Daily Phrase quest, locale, target-gate, and achievement contracts still pass.

## Acceptance Criteria

- “Check yourself” is not visible below the Daily Phrase on the home screen and leaves no empty CTA spacing.
- Tapping anywhere in the card still opens the same Daily Phrase details flow.
- On the first qualifying viewport appearance each local day, the whole card gently pulses twice and then stays still.
- Scrolling away and back, rerendering, or revisiting the tab on the same day does not replay the cue.
- The cue may play again after the local calendar date changes.
- Reduced Motion users see no pulse.
- No unrelated home-screen or Daily Phrase behavior changes.
