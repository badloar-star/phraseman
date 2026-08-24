# Onboarding Remediation Design

## Goal

Make the current Bevel onboarding truthful at the purchase boundary, consistent with the user's notification choice, safe across embedded purchase/auth completion, and usable with reduced motion, screen readers, large text, rotation, and Android touch targets.

## Owner decisions

- Keep the current privacy claim. Service providers acting for Phraseman are not treated as third-party disclosure in the product copy.
- Preserve every existing screen and capability. Language/level stay locally disabled; Remote Config ordering remains authoritative; `name` remains mandatory.
- Keep the current visual direction. Changes are targeted accessibility, layout, copy, and state-policy repairs rather than a redesign.

## Architecture

Critical decisions become small pure policies with direct unit tests: trial presentation, notification choice, and onboarding-source behavior. `CleanOnboarding` remains the rendering owner, while `_layout` and `paywall_purchase` consume the same persisted notification choice. Store uncertainty never becomes a synthetic trial.

Completion commits `onboarding_done` first, then guarantees navigation/overlay removal independently of nonessential premium and welcome work. Provider sign-in remains serialized after the UI deadline so a second identity mutation cannot overlap the first; generation guards prevent stale UI updates.

## Purchase contract

- Trial wording is rendered only from a confirmed free intro phase and confirmed eligibility where the platform exposes it.
- Unknown, failed, or ineligible states use ordinary subscription terms and never show a free duration or cancellation date.
- The selected subscription disclosure sits beside the CTA and states trial duration when applicable, subsequent store price, billing period, automatic renewal, and store cancellation.
- Lifetime remains a one-time purchase disclosure.
- The secondary offers sheet reflects loading/error/unavailable package state and cannot expose a dead purchase CTA.
- `onboarding` and `onboarding_plan` are both embedded onboarding sources for post-purchase/restore navigation; neither dismisses a route modal.

## Notification contract

- `allow`, `skip`, and blocked/denied outcomes are persisted under one exported key.
- `_layout` and post-purchase scheduling never re-prompt after `skip` or `blocked`.
- Reminder promises are conditional on a confirmed trial and the user's notification choice; scheduling remains best effort after permission exists.

## Completion and identity contract

- Durable completion is the point of no return.
- Home navigation and overlay removal are guaranteed in `finally`; slow premium checks and welcome setup cannot hold the last onboarding screen.
- A provider sign-in that exceeds the UI deadline remains the sole active identity operation until it settles. The UI may explain the delay, but it cannot start a competing provider operation.
- Stale provider results may not update onboarding UI state.

## Accessibility and motion

- Read the system reduced-motion preference and react to preference changes.
- Reduced motion replaces loops, rotations, confetti, spring overshoot, and large translations with immediate/fade-only states.
- Motion values use `constants/motionHybrid.ts` tokens or named onboarding constants derived from them.
- Modal content is scrollable, marked modal for assistive technology, receives initial focus, and restores focus to its opener.
- Dynamic errors use live-region/announcement behavior.
- Normal text reaches 4.5:1; non-text controls reach 3:1; bright green surfaces use dark foreground.
- Interactive targets are at least 48 dp on Android.
- Phone/chart geometry derives from `useWindowDimensions`, and fixed one-line price slots are removed or allowed to reflow.

## Copy

- Keep informal singular Russian throughout.
- Replace the absolute outcome promise with a mechanism-based benefit claim.
- The trial push title and body are conditional on an actual trial.
- Privacy wording remains unchanged by owner decision.

## Verification

Use TDD for each policy and regression. Run focused onboarding/paywall/motion Jest suites, relevant TypeScript diagnostics, and inspect the final diff. Device-only VoiceOver/TalkBack and real store sandbox behavior must be reported separately if no device is available.
