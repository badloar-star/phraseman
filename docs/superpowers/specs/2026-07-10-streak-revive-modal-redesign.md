# Streak Revive Modal Redesign

## Objective

Replace the current reward-card presentation of `StreakReviveModal` with the selected asymmetric recovery-pass design. The result must feel structurally new, make the decision easier to understand, and contain no outlined containers.

## Scope

- Redesign only the streak-recovery modal in `components/StreakReviveModal.tsx`.
- Preserve the existing recovery, insufficient-balance, expiration, dismissal, navigation, analytics/event, haptic, countdown, and localization behavior.
- Do not modify the shared `RewardCardV2` appearance or other reward modals.
- Do not add image assets or remove any existing feature.

## Visual Structure

The modal is a compact centered recovery pass composed of two filled regions without borders:

1. A warm orange header occupies roughly the upper third. It displays the lost streak as the dominant element: a large number and a short localized “days in a row” label. A 44-by-44 close control sits in the upper-right corner on a subtle translucent fill.
2. A dark body contains the decision content. It presents a concise title, one explanatory sentence, the primary recovery button, the shard cost immediately beneath it, the secondary “start a new streak” action, and the remaining time.
3. The pass uses a deep shadow and large corner radius for separation from the dimmed application, never strokes or one-pixel outlines.

The layout is intentionally asymmetric: the result is communicated through color and scale in the header, while the decision is isolated in the quieter lower region. The previous circular flame hero, nested streak pill, price pill, concentric rings, and reward-card composition are not retained.

## Interaction

- Primary button: restores the streak using the existing `onConfirm` flow.
- Secondary action: dismisses the offer and starts a new streak through the existing `onDismiss` flow.
- Close button and backdrop dismissal use the same existing dismissal behavior.
- All actions remain disabled while the recovery request is busy.
- The primary label changes to a localized progress state while busy.
- The countdown continues updating once per second and closes the modal after expiration.
- Insufficient shard balance still closes the modal and navigates to the shard shop.

## Responsive and Accessibility Rules

- Use safe-area insets and a maximum pass width so the composition works on compact phones and tablets.
- On short screens, the body may scroll while the actions remain reachable.
- Interactive controls use `Pressable`, a minimum 44-by-44 touch target, accessibility roles, labels, and disabled state.
- Text may wrap and scale without clipping across every existing interface language.
- Normal text must meet 4.5:1 contrast. Dark text is used on the warm orange and bright primary surfaces.
- Motion is limited to the existing modal transition; no required animation conveys state.

## Theme Behavior

- Keep the selected warm recovery accent across themes.
- Derive the lower surface, scrim, text, and muted text from the active Phraseman theme where possible.
- Use filled tonal surfaces and shadows only. `borderWidth`, `borderColor`, and decorative outline rings are prohibited in this modal.

## Verification

- Add a focused contract test for the borderless asymmetric structure and preserved actions.
- Run the focused streak-revive tests and the project TypeScript check.
- Inspect the modal at a compact phone viewport and a typical tall-phone viewport.
- Manually verify restore, insufficient balance, start-new, close/backdrop, busy, and expiration paths.
