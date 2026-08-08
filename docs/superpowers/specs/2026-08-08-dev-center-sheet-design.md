# DEV Center Sheet Design

**Date:** 2026-08-08
**Status:** approved in visual and behavioral review; Plus simulation revision approved 2026-08-08
**Scope:** Phraseman mobile development builds only

## Goal

Replace the retired Settings entry for mobile developer/admin tools with one isolated DEV modal sheet opened from the existing flask icon in the Home header. The sheet must remain easy to scan and extend, provide side-effect-free previews for the two current level-up presentations, and allow a device-local Plus simulation for the currently active account.

## Product boundaries

- The existing `home-dev-hub-button` icon and the sheet exist only when `ENABLE_DEV_TOOLS` is true; implementation must not add a second icon.
- Store builds expose neither the icon nor another navigation path to the sheet.
- The retired `settings-open-testers` entry, `SETTINGS_TESTERS_ROUTE`, and old mobile admin routes remain removed.
- The feature does not call OpenAI APIs.
- Level-up preview does not mutate XP, current level, pending queues, spin credits, gifts, inventory, analytics rewards, or server state.
- Plus simulation does not write Firebase, call `adminGrantAccess`, change RevenueCat entitlements, or affect another device.

## Entry and presentation

Home already renders one small flask-shaped DEV trigger (`home-dev-hub-button`) in its top header. The implementation reuses that exact control and changes only its action from pushing the provisional full-screen route to opening the modal sheet. It must not add or restyle a duplicate trigger.

Pressing the icon opens a bottom modal sheet above Home. The sheet uses the established theme tokens and native product vocabulary. It closes through:

- the visible close button in the sheet header;
- Android/system Back;
- a downward sheet gesture;
- a press on the dimmed backdrop.

The sheet owns scroll only when its contents exceed the available height. It reserves final geometry on first render and does not use a full-screen spinner.

## Information architecture

The sheet is rendered from a small central registry rather than hand-ordered JSX. Each section has a stable identifier, label, sort order, and ordered tools. Each tool has a stable identifier, title, icon, accessibility label, presentation kind, and action.

Initial sections:

1. `level-up-preview`
   - `standard-level-up`: ordinary level-up preview.
   - `milestone-level-up`: every-fifth-level milestone preview.
2. `local-access`
   - `grant-local-plus`: enable local Plus for the active account.
   - `revoke-local-plus`: disable local Plus for the active account.

New DEV tools join the same registry and therefore receive deterministic grouping and sorting without adding new navigation concepts.

## Level-up previews

Both actions render the real current `LevelUpThresholdModal` surface through an explicit preview-only host. They do not seed or drain the production pending-level queue.

### Standard

- Uses a non-milestone example level.
- Shows the current level-up reward presentation including the spin reward.
- Uses the restrained finite entrance choreography.

### Milestone

- Uses an example level divisible by five.
- Shows the current milestone presentation including the spin reward.
- Uses a visibly stronger but still finite motion treatment: slightly longer emphasis, stronger badge/ambient reveal, and the existing reduced-motion fallback.

The standard/milestone distinction is explicit data, not inferred from labels. The preview host passes a typed variant into the shared modal. Preview callbacks only close or move between preview states; they never acknowledge a queue, grant `+100 XP`, mint/consume a spin, or open the live spin claim screen.

## Local Plus simulation

The Plus override is stored locally and scoped to the active account identity. Anonymous/uninitialized identity disables both Plus actions and shows a concise inline explanation.

The state model has three UI states:

- `loading`: hydrate the account-scoped local override while preserving control geometry;
- `granted`: locally present this account as Plus on this device;
- `forced-free`: locally present this account as Free on this device. The neutral `inherit` value is represented by the genuine entitlement projection rather than a separate visible override state.

Grant and revoke are idempotent. A successful change updates Premium context immediately through the existing access refresh/event path. A storage failure restores the previous visible state and shows an inline error. Account-generation changes discard stale async results and hydrate the override for the new owner.

The override changes only the local effective presentation; it never rewrites paid Premium, VIP, intro access, tester flags, RevenueCat state, or cloud progress fields. Its three persisted values behave as follows:

- `inherit`: use the genuine entitlement projection unchanged;
- `granted`: locally present the active account as Plus (`isPremium=true`, `hasPremiumAccess=true`, `isVip=false`, `isPro=false`);
- `removed`: locally present the active account as Free even when a genuine Plus/VIP/Pro entitlement exists.

The genuine entitlement remains stored and authoritative outside the DEV projection. Switching the override back to `inherit` restores it without a purchase, revoke, cloud write, or RevenueCat call.

### Celebration choice before grant

Pressing `Выдать Plus` does not grant immediately. It expands a compact selector inside the Plus section, avoiding a nested modal and keeping the DEV list understandable. The selector offers the three existing production celebration variants:

- green — `vip`, the legacy issued-Plus/VIP celebration;
- yellow — `premium`, the subscription Plus celebration;
- blue — `pro`, the Phraseman Pro celebration.

Each choice shows both color and a text label. The blue choice is explicitly labelled as the Pro animation even though the resulting DEV access projection is Plus.

The approved state sequence is:

1. `idle` — no selector or celebration is active;
2. `choosing-celebration` — the inline three-color selector is visible; cancelling returns to `idle` and grants nothing;
3. `celebrating(variant)` — the existing `PremiumCelebrationModal` runs with the selected variant while no Plus override has yet been written;
4. `granting` — only the celebration close callback writes `granted` and refreshes Premium context;
5. success returns to the DEV sheet with an accessible confirmation; failure restores the previous override and shows an accessible inline error.

`Снять Plus` does not show a celebration. It writes `removed`, refreshes Premium context, and immediately presents the active account as Free locally.

## Accessibility and motion

- Every interactive control has `accessibilityRole="button"` and a specific label.
- Touch targets are at least 44x44.
- Status is communicated with text, not color alone.
- Text uses theme typography with the project-supported weight vocabulary.
- The modal traps accessibility focus while visible and hides the covered Home content from screen readers.
- Standard and milestone motion remain finite and use transform/opacity.
- Reduced motion replaces staged movement with a short crossfade or immediate state.

## Errors and recovery

- Missing active account: Plus controls disabled; level-up previews remain available.
- Local storage failure: show an inline error and keep the prior effective access state.
- Stale account result: ignore it and hydrate the current account.
- Preview component error: close only the preview layer, keep the DEV sheet usable, and show a concise inline error.

No error path writes server state or silently claims a successful Plus change.

## Test strategy

Add focused tests first and observe them fail before implementation:

- DEV icon is gated by `ENABLE_DEV_TOOLS` and absent from store-facing paths.
- Settings and retired mobile admin routes remain absent.
- Registry sorting is deterministic by section and tool order.
- Sheet exposes the visible close action and all supported dismissal paths.
- Standard and milestone previews pass different typed variants.
- Preview mode cannot reach XP, queue, gift, spin-claim, or server mutation code.
- Milestone uses stronger finite choreography and both variants honor reduced motion.
- Local Plus is account-scoped, idempotent, and isolated across account-generation changes.
- `removed` forces the local effective projection to Free while leaving genuine entitlement storage unchanged.
- Grant opens the inline green/yellow/blue selector, and selector cancellation writes no override.
- Each selection reuses the existing `vip | premium | pro` celebration and writes `granted` only from its close callback.
- Grant/revoke update the local effective access projection without Firebase, RevenueCat, tester flags, or admin callable usage.
- Missing identity and storage errors produce accessible disabled/error states.

Focused lint, TypeScript, contract tests, and the existing level-up/production guard tests decide completion. Existing failing level-up contracts discovered in the inherited working tree must be reconciled rather than weakened.

## Existing work to preserve

The current working tree already contains uncommitted level-spin and `LevelUpThresholdModal` work, including server-side `standard | milestone` spin-credit kinds and a saved Spin Lab mockup. It also contains a provisional `DevHubScreen`, `app/dev_hub.tsx`, `dev_plus_controls.ts`, a Home flask icon, and focused tests created by another active session. The icon and useful DEV hub internals must be reused. The provisional full-screen route/presentation must be converted to the approved modal sheet, not duplicated. The current local Plus helper also uses global tester keys and therefore still needs the approved account-scoped isolation. Existing work is not complete: the modal UI does not yet consume the milestone kind, one focused contract suite currently fails five tests, and a scoped TypeScript check reports an animated-style type error. Implementation must integrate with and repair this work without reverting unrelated changes.
