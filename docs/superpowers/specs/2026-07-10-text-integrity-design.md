# Phraseman Text Integrity Design

**Status:** Approved design

**Date:** 2026-07-10

## Objective

No mobile-app user may lose user-visible text because a React Native component clips it or replaces it with a layout-generated ellipsis. This invariant applies on small and large phones, tablets, portrait and landscape layouts, split-screen windows, every registered interface locale, and the full system font scale supported by the operating system.

Product-authored copy and localized content must be visible in full in the current surface. Unbounded user-generated content may begin in an explicitly collapsed state only when the UI provides an obvious `Show full text` action. The collapsed state must not use a system-generated ellipsis, the expanded state must expose the complete source text, and assistive technology must always receive the complete source text.

Product-authored remote-config copy, server-generated instructional content, AI explanations, and localized remote payloads remain authored content. Their delivery mechanism does not make them eligible for a collapsed preview.

The scope is the React Native application under `app/`, `components/`, `constants/`, `hooks/`, `lib/`, and `modules/`. The web admin surface in `admin/index.html` is outside this program.

## Baseline

The initial read-only inventory found:

- 538 `numberOfLines` occurrences across 142 files;
- 360 explicit one-line caps and 122 two-line caps;
- 6 explicit `ellipsizeMode` usages;
- existing tests that intentionally require truncation on selected screens;
- many fixed `height` and `maxHeight` declarations that require semantic inspection because not every fixed dimension contains text.

This baseline makes a global search-and-replace unsafe. The migration must classify each site by layout semantics and proceed in small, independently verifiable groups.

## Product Rules

### Authored and localized text

- Show the complete text in the current surface.
- Prefer wrapping and container growth.
- When a horizontal composition becomes too narrow, reflow controls vertically instead of hiding copy.
- Long explanations may scroll inside a bounded body region while the primary action remains outside that scroll region.
- Do not disable system font scaling.
- Do not solve overflow only by shrinking text below the readable minimum defined by the design system.

### User-generated and external unbounded text

- A compact preview is allowed only through an explicit expandable component.
- This mode is limited to user-generated values and external identity/feed values such as chat messages, bios, display names, club names, reviews, and reports.
- Product-authored server copy, AI explanations, learning prompts, translations, and remote-config text are not eligible and must use full flow or a scrollable text region.
- The preview must include a visible `Show full text` control and may not rely on tail, head, or middle ellipsis.
- Expanding reveals the complete value in-place or in an accessible detail surface.
- The full value is always exposed through the accessibility label/value.
- Existing long values remain displayable. New product limits for names or messages are not introduced solely to make layout easier.

### Controls

- Touch targets remain at least 44 logical pixels in both dimensions.
- Buttons may grow vertically and use multiple text lines.
- A horizontal CTA row must reflow into a vertical stack when its labels cannot fit.
- Icons and existing actions are preserved; text integrity is not permission to delete functionality.

### Accessibility

- The operating-system font scale is supported without an artificial ceiling, including 200% and above.
- `allowFontScaling={false}` is prohibited for user-visible text unless a separately reviewed non-text glyph case proves it is required.
- Screen readers receive the full source copy, including when user-generated content is initially collapsed.
- Color is not the only indicator for expansion, overflow, or interaction state.

## Semantic Text Layout System

The implementation must use semantic primitives rather than monkey-patching React Native `Text`.

### `FlowText`

For body copy, descriptions, prompts, translations, and labels that should expand naturally.

- No line cap or ellipsis mode.
- Wraps and increases parent height.
- Supports safe breaking for unbroken tokens and URLs.
- Reports overflow through the development probe.

### `AdaptiveLabel`

For buttons, headers, pills, compact cards, tabs, and rows with adjacent actions.

- Wraps before shrinking.
- May shrink only to an approved readable minimum computed from the already system-scaled font size. Shrinking must never return 200% Dynamic Type text to its unscaled baseline size.
- If the scaled minimum still does not fit, the component wraps or requests responsive reflow instead of shrinking further.
- Requests responsive reflow when the containing horizontal composition cannot fit.
- Never silently removes part of the label.

### `ScrollableTextRegion`

For long explanations, result analysis, modal bodies, and theory content.

- Uses a viewport derived from the current window and safe areas.
- Shows a visible scroll indicator when scrolling is possible.
- Keeps primary and destructive actions outside the scrollable body.
- Coordinates with parent swipe and gesture handlers so vertical reading remains possible.

### `ExpandableText`

Only for unbounded user-generated or external identity/feed text where an always-expanded row would materially harm feed usability or list performance. Product-authored remote or AI text is explicitly excluded.

- Begins either fully expanded or explicitly collapsed.
- Collapsed state uses a visible localized reveal action, not generated ellipsis.
- Expanded state shows the complete source value.
- Preserves expansion state while the row remains mounted.
- Provides the complete value to accessibility services in both states.

## Responsive Container Patterns

### Headers

- Allow titles to use multiple lines.
- Move trailing actions to a second row when width is insufficient.
- Header height is content-driven and safe-area-aware.

### Buttons and CTA groups

- Allow labels to wrap.
- Increase height with content.
- Convert horizontal groups to vertical stacks when required.
- Preserve loading, disabled, focus, and pressed states.

### Lists

- Ordinary lists use variable-height rows.
- FlashList and FlatList estimates must be updated when row geometry changes.
- Fixed `getItemLayout` assumptions must be removed or replaced only for migrated rows.
- Realtime leaderboards and feeds use `ExpandableText` when unlimited row growth would destabilize scrolling.
- Scroll anchoring and the first-frame geometry must comply with the Performance Bible.

### Modals and sheets

- Body content scrolls within the available window.
- Footer actions remain visible outside the body scroll region.
- KeyboardAvoidingView, safe areas, and short landscape windows are included in the layout calculation.

### Gesture screens

- Text scrolling takes priority while the user interacts with a scrollable explanation.
- Parent card swipes or arena gestures must not steal that vertical scroll.
- Existing gameplay controls remain reachable after responsive reflow.

## Enforcement Architecture

### Inventory and ratchet

- Generate a machine-readable inventory of every existing raw line cap and explicit ellipsis mode.
- Classify each site as `flow`, `adaptive`, `scroll`, `expand`, `non-text`, or `temporary-exception`.
- Freeze the baseline immediately: CI rejects new unsafe sites.
- Each temporary exception records file, owner, reason, category, and expiry milestone.
- The allowlist may only shrink.

### ESLint rule

Add a custom AST rule that rejects:

- raw `numberOfLines` on `Text`, `Animated.Text`, and project text wrappers;
- `ellipsizeMode="head"`, `"middle"`, or `"tail"`;
- `allowFontScaling={false}` on user-visible text;
- bypasses that recreate the same behavior inside new wrappers.

Only approved semantic primitives and reviewed non-text cases may bypass the rule.

### Development probe

Semantic primitives register with a development-only `TextIntegrityProbe`.

The probe records:

- route or screen;
- stable `testID`;
- locale;
- window width and height;
- font scale;
- semantic mode;
- provenance category and text length;
- an optional one-way content hash for deduplication;
- local text, host-container, and related-action bounds;
- safe-area-adjusted usable viewport bounds.

Structured probe violations never store raw names, chat messages, bios, reports, server content, or other potentially identifying text. Raw strings may appear only in a transient local developer overlay and must not be persisted or copied into CI logs or report artifacts.

The probe reports local clipping, overflow, inaccessible content, and related actions outside the registered safe-area viewport when the host primitive supplied absolute bounds. Cross-component and navigation-level off-screen controls remain the responsibility of the E2E layout harness. The probe is disabled in production builds.

The probe must detect geometric clipping as well as visible ellipsis. A simple search for the `…` character is insufficient because that character can be legitimate punctuation.

## Test Matrix

Every primitive and migrated critical route is verified at:

- widths 320, 360, and 390 logical pixels;
- a representative tablet width;
- portrait, landscape, and split-screen dimensions;
- system font scale 1.0, 1.3, 2.0, and the platform maximum available to automation;
- all eight registered interface locales;
- long words without spaces, URLs, display names, club names, server copy, translations, and long explanations.

Tests cover:

- visible ellipsis;
- bottom and side clipping;
- text hidden under adjacent controls;
- buttons pushed off-screen;
- inaccessible modal content;
- broken long-token wrapping;
- gesture conflicts;
- variable-height list anchoring and performance.

Adaptive-label tests assert that effective minimum text size is derived from the system-scaled value. A 200% font setting must not be reduced to the 100% baseline; layouts must wrap, reflow, or scroll once the scaled minimum is reached.

Contract tests alone are insufficient. Key routes also receive screenshot or E2E coverage with a runtime assertion that the development probe recorded zero violations.

## Rollout

### Phase 0: Policy and inventory

- Land this specification.
- Generate and classify the baseline manifest.
- Add the CI ratchet that forbids new unsafe sites while preserving the temporary baseline.

### Phase 1: Primitives and diagnostics

- Implement the four semantic primitives.
- Add primitive unit and rendering contracts.
- Add the custom ESLint rule.
- Add the development probe and structured violation output.

### Phase 2: Shared application shell

- Migrate shared buttons, headers, tabs, banners, toasts, modal shells, and navigation chrome.
- Verify responsive reflow before migrating feature screens that consume these components.

### Phase 3: Learning-critical routes

- Migrate lessons, quizzes, personal plans, flashcards, trainer/review, daily tasks, and theory.
- Prompts, answers, explanations, and translations show full authored text immediately.
- Long explanations use scroll regions with actions outside.

### Phase 4: Social and game routes

- Migrate friends, clubs, chats, Arena, leaderboards, collectibles, and player profiles.
- Use variable-height rows or explicit expansion according to the user-generated-content policy.
- Run FPS, anchoring, and gesture checks for each migrated list or realtime surface.

### Phase 5: Remaining product routes

- Migrate onboarding, paywalls, settings, account flows, shops, achievements, and rare production screens.

### Phase 6: Closeout

- Sweep remaining inventory entries.
- Remove all temporary exceptions.
- Run the full device, locale, orientation, and font-scale matrix.
- Turn the CI ratchet into a hard zero-allowlist gate.

## Change Safety

- Migrate groups of approximately 5–15 related sites, not all 142 files at once.
- Capture the current visual state before each group.
- Write a failing contract before changing behavior.
- Run focused tests, screenshots, accessibility checks, and relevant performance checks after each group.
- Do not start the next group until the current group passes.
- Keep each diff independently reversible.
- If a site cannot be migrated safely, retain it as an explicit temporary exception rather than deleting controls, weakening tests, or shipping broken geometry.

## Performance Invariants

- No new full-screen loading state.
- First render uses stable last-known geometry or an appropriate estimate.
- Variable-height migration must not break FlashList/FlatList anchoring.
- Module-level caches introduced by diagnostics require bounds or TTL.
- Development measurement is disabled in production.
- Long text rendering must not keep hidden screens active or add ungated timers.

## Acceptance Criteria

The program is complete only when:

- the unsafe-site allowlist is empty;
- CI rejects every new raw truncation site;
- authored and localized text is always visible in full;
- unbounded user content is fully available through explicit expansion without generated ellipsis;
- product-authored remote and AI-generated instructional text is never routed through the collapsed user-content mode;
- adaptive shrinking preserves the user's effective system font scale and falls back to wrap or reflow at the scaled minimum;
- all touch targets remain at least 44 logical pixels;
- the development probe reports zero violations across the release matrix;
- critical-route screenshot/E2E checks pass;
- accessibility and performance gates pass;
- no existing user-visible feature or control was removed to satisfy the policy.

## Non-Goals

- Rewriting product copy merely to make it shorter.
- Introducing restrictive user-data limits solely for layout convenience.
- Migrating the web admin UI in this program.
- Treating legitimate authored ellipsis punctuation as a layout defect.
- Performing a one-commit search-and-replace across the application.

## Implementation

The foundation and the Daily Challenges pilot are implemented on `codex/text-integrity-foundation` according to the [implementation plan](../plans/2026-07-10-text-integrity-foundation.md).

- Semantic text components live in [`components/text-integrity`](../../../components/text-integrity), with the Daily Challenges presentation in [`components/daily-tasks`](../../../components/daily-tasks).
- The production AST inventory and shrink-only ratchet are implemented in [`scripts/text-integrity`](../../../scripts/text-integrity), backed by the committed [`config/text-integrity-baseline.json`](../../../config/text-integrity-baseline.json).
- The pilot removes six legacy unsafe groups from the baseline and preserves full task/bonus copy, actions, progress, Premium state, themes, and accessibility behavior.
- Automated foundation, rendering, lint, inventory, navigation, and focused performance checks pass. The full device screenshot matrix remains a release-validation step because no Android emulator or `adb` runtime was available in this implementation environment.
- The remaining baseline is intentionally non-zero (428 groups / 551 sites). This records the verified foundation and pilot only; it does not claim completion of the all-app migration.
