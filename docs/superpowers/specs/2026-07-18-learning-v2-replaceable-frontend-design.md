# Learning V2 Replaceable Frontend Design

**Status:** owner-approved direction; implementation plan pending owner review of this document  
**Date:** 2026-07-18  
**First mode:** `sound-discrimination`  
**Owner decision:** Codex builds the complete working core and complete working frontend. Kimi may later replace the visual frontend without changing governed learning behavior.

## 1. Outcome

Phraseman Learning V2 will ship as a complete 32-episode, speaking-first learning system with a fully functional Codex-built React Native and Admin frontend. The first implementation is not a placeholder. It must be usable, accessible, testable, offline-safe where promised, and suitable for real device preview.

The frontend is nevertheless a replaceable presentation layer. A later Kimi redesign may replace layout, components, visuals, typography, finite motion, icons, assets, and theme tokens while preserving the same core contracts, state transitions, accessible actions, typed commands, analytics semantics, and durable outcomes.

## 2. Non-goals

- Kimi does not own learning contracts, scoring, evidence, progress, stars, access, persistence, permissions, voice lifecycle, analytics semantics, release loading, or backend behavior.
- A redesign is not allowed to rewrite runtime contracts merely to fit a preferred component structure.
- Codex does not build a knowingly disposable placeholder UI. The baseline UI must pass the same behavioral, accessibility, performance, and device gates expected after redesign.
- Browser/Admin preview does not substitute for React Native device evidence.
- This decision does not waive Phase 03 lawful reference-evidence and hash-bound owner approval gates.
- Legacy learning remains available until the explicit Phase 14 decision.

## 3. Layered architecture

```text
canonical contracts / policies / release content
                    ↓
domain and activity runtime state machines
                    ↓
pure presenters / selectors
                    ↓
immutable typed ViewModel + allowed commands
                    ↓
replaceable React Native or Admin presentation
                    ↓
typed command dispatch
                    ↓
controller validates, applies and persists governed outcome
```

### 3.1 Stable core

Kimi must not modify these namespaces as part of a visual redesign:

- `modules/learning-v2/contracts/**`
- `modules/learning-v2/content/**`
- `modules/learning-v2/progress/**`
- `modules/learning-v2/policies/**`
- core activity/session runtime under `modules/learning-v2/runtime/**`
- V2 Functions, authoring, release, progress, evidence and voice backend code.

The stable core owns:

- content and payload validation;
- episode graph and session state;
- scoring and correctness;
- evidence and non-assessment classification;
- stars, access, mastery and checkpoint projections;
- retry, fallback and permission eligibility;
- persistence, hydration, outbox and idempotency;
- release pinning, cache and recovery;
- analytics event meaning and allowlisted fields;
- all durable writes.

Core modules must not import React, React Native, Expo Router, visual components, theme values, icons, animation libraries, or device-specific presentation code.

### 3.2 Frozen UI port

Create a React-free, pure TypeScript port under `modules/learning-v2/runtime/`:

```ts
export type PreviewState =
  | 'prompt'
  | 'active'
  | 'processing'
  | 'success'
  | 'needs_work'
  | 'recovery';

export interface ActivityViewModel {
  readonly activityId: string;
  readonly nodeId: string;
  readonly activityTypeKey: string;
  readonly rendererKey: string;
  readonly previewState: PreviewState;
  readonly prompt: PromptViewModel;
  readonly content: Readonly<unknown>;
  readonly feedback?: FeedbackViewModel;
  readonly availableCommands: readonly ActivityCommand['type'][];
  readonly accessibility: AccessibilityViewModel;
  readonly conditions: PreviewConditions;
}

export type ActivityCommand =
  | { readonly type: 'audio.play' }
  | { readonly type: 'answer.select'; readonly optionId: string }
  | { readonly type: 'answer.submit' }
  | { readonly type: 'hint.request' }
  | { readonly type: 'voice.permission.request' }
  | { readonly type: 'voice.record.start' }
  | { readonly type: 'voice.record.stop' }
  | { readonly type: 'fallback.open'; readonly route: 'typed' | 'listen_only' }
  | { readonly type: 'recovery.retry' }
  | { readonly type: 'navigation.continue' }
  | { readonly type: 'navigation.close' };

export interface ActivityScreenProps {
  readonly model: Readonly<ActivityViewModel>;
  readonly dispatch: (command: ActivityCommand) => void;
}
```

The final definitions may be split into focused files, but the behavioral boundary is normative:

- UI receives one immutable view model;
- UI emits typed commands;
- controller/runtime is the single command owner;
- UI never creates a durable learning result itself.

### 3.3 Replaceable frontend

Codex implements the complete frontend in:

- `components/learning-v2/**` or an equivalent dedicated feature UI namespace;
- thin V2 route screens;
- Admin V2 pure renderers and controllers;
- UI-only themes, assets and finite animations;
- RNTL, accessibility and visual regression tests.

Kimi may later replace:

- `ActivityScaffold`;
- the six activity shells;
- activity renderers;
- episode map presentation;
- feedback, prompt and action-dock components;
- Admin presentation renderers;
- visual tokens, icons, typography, assets and finite motion.

Kimi may not introduce direct imports from UI into Firebase, AsyncStorage, progress/evidence reducers, release internals, voice providers, permission controllers, or backend progress writers.

## 4. Required correction before frontend fan-out

The current `ActivityRegistration` includes `resolveRenderer: () => unknown`. This couples the React-free activity registry to presentation resolution.

Before building shared shells:

1. retain `rendererKey` in the core activity descriptor;
2. remove renderer component resolution from the core registry;
3. create a separate UI-owned lazy renderer registry;
4. add dependency-contract tests proving that core remains React-free;
5. return typed recovery UI for an unknown renderer key.

The presentation registry may lazily resolve components, but authoring artifacts contain only stable keys and versioned policy/content references, never component paths or executable code.

## 5. Stable routes and composition

The app exposes stable, thin routes:

- `learning_v2_episode`;
- `learning_v2_activity`;
- the governed preview route/envelope.

Routes may:

- validate route parameters;
- obtain the `LearningV2AppPort`;
- subscribe to a session snapshot;
- render the replaceable screen;
- dispatch close/back commands.

Routes may not:

- compute gates or stars;
- choose scoring/evidence policies;
- contain episode content;
- write progress;
- bypass release validation;
- silently fall back to legacy content for an invalid V2 release.

Unknown or stale release/activity/renderer state returns a typed recovery view model, not a crash, blank screen, or silent success.

## 6. Shared UI quality contract

Codex baseline and any Kimi replacement must both satisfy:

1. Six canonical states only: `prompt`, `active`, `processing`, `success`, `needs_work`, `recovery`.
2. Offline, permissions, signal, scorer outcome, theme, text scale and motion remain orthogonal conditions, not extra states.
3. Stable scaffold geometry; no full-screen spinner or feedback layout jump.
4. Minimum 44 pt iOS / 48 dp Android targets.
5. Normal text contrast at least 4.5:1; large/non-text UI at least 3:1.
6. Dark foreground on lime/neon-green surfaces.
7. 200% text without clipping, overlap, broken words or page-level horizontal scrolling.
8. Visible focus, correct roles/names/states and non-color-only status.
9. Screen-reader focus moves to feedback once and announces the result once.
10. Waveform is hidden from the accessibility tree and represented by text/timer/status.
11. Reduced motion preserves meaning and removes looping, bounce, shake and parallax.
12. Permission explanation precedes the system dialog; returning from the dialog never starts recording automatically.
13. Permission denial offers settings, a governed fallback when allowed, and back/close; no retry-only dead end.
14. Hidden screens do not remain hot; timers, subscriptions, capture and animation obey focus and AppState.
15. First frame uses last-known-good state or final-geometry skeletons.
16. Components contain no episode-specific content or policy decisions.

Generic `ui-ux-pro-max` suggestions are advisory only. Its claymorphism, Baloo/Comic Neue and generic education palette are not adopted automatically. Phraseman brand, approved reference evidence, UI Contrast Rule, Performance Bible and accessibility contracts override the catalog.

## 7. Admin frontend boundary

Admin V2 remains under `/v2/`. Existing legacy admin behavior is preserved.

- Eight Content Studio routes remain distinct.
- Renderer is a pure function of a page view model.
- Controller calls named server-authoritative Admin actions.
- Browser does not write Firestore directly or choose production environment.
- Human Russian labels are primary; keys and hashes are secondary.
- One primary CTA per screen.
- Loading, empty, error, dirty, conflict, success and disabled states are explicit.
- Publish, deprecate and mass actions require preview, confirmation, audit and rollback explanation.
- Keyboard navigation, visible focus and 375/768/1024/1440 layouts are required.
- Browser preview is structural; device parity requires the real PreviewEnvelope path and device receipts.

## 8. Kimi handoff packet

Before Kimi replaces a renderer or shell, Codex produces:

```text
docs/v2/frontend-handoff/
  README.md
  ownership.md
  prohibited-writes.md
  conformance-commands.md
  shared/
    renderer-port.ts
    renderer-event-catalog.json
    state-condition-schema.json
    accessibility-matrix.md
  modes/<activityTypeKey>/
    HANDOFF.md
    manifest.json
    fixture-index.json
    state-matrix.json
    accessibility.json
    event-expectations.json
    file-ownership.json
    prohibited-writes.json
    screenshots/
```

Each mode packet pins:

- `activityTypeKey`, `rendererKey`, family, shell and storyboard;
- payload/kernel/renderer schema versions;
- exact template and five policy refs;
- canonical fixtures and SHA-256 hashes;
- allowed commands and expected command sequences;
- six states and applicable conditions;
- accessibility expectations;
- prohibited imports and writes;
- exact file ownership;
- focused verification commands;
- approved contact-sheet revision/hash;
- current owner decision.

## 9. Replaceability gate

Codex baseline and Kimi replacement are behaviorally equivalent when the same fixtures produce:

```text
same canonical semantic state
→ same accessible actions
→ same typed command sequence
→ same governed analytics
→ same durable outcome
→ no additional writes or provider calls
```

Pixel equality is not required after an approved redesign. Behavioral, accessibility, privacy, security and persistence equivalence are required.

Tests must prefer accessible roles/names/states and emitted commands over component structure, CSS classes or JSX snapshots. Visual regression tests remain separate and may change with an approved skin.

## 10. First vertical implementation: Sound Discrimination

The owner selected `sound-discrimination` in the visual companion.

Ordered implementation:

1. complete lawful first-hand reference capture, original Phraseman contact sheet, distinctiveness/accessibility review and hash-bound owner approval;
2. freeze the React-free UI port and dependency boundaries;
3. decouple renderer resolution from the core activity registry;
4. implement the headless Sound Discrimination controller/presenter and complete fixture/state matrix;
5. implement `ActivityScaffold`, the necessary Choice/Voice presentation boundaries and a fully working Codex renderer;
6. implement offline, permission, interruption, recovery, 200% text and reduced-motion paths;
7. connect the thin V2 route and no-progress PreviewEnvelope;
8. run spec, quality, accessibility and deterministic verification;
9. publish the Kimi handoff packet for this mode;
10. reuse the frozen ports and shells for the next selected modes.

The strict all-five release gate remains. Per-mode readiness allows the approved first mode to advance without falsely marking the other four ready.

## 11. Testing strategy

Required layers:

- core contract and dependency-boundary tests;
- presenter/controller tests without React;
- registry and unknown-renderer recovery tests;
- RNTL interaction and accessibility tests;
- state/condition parameterized tests;
- offline/interruption/resume tests;
- typed command ordering and idempotency tests;
- prohibited-import/no-direct-write tests;
- visual/contact-sheet regression tests;
- PreviewEnvelope no-progress integration;
- real-device iOS and Android evidence before release claims.

No normal test may rewrite source, fixtures, snapshots, assets or contracts.

## 12. Completion definition

The replaceable frontend foundation is complete only when:

- the React-free UI port is frozen and versioned;
- renderer resolution is presentation-owned;
- Sound Discrimination core and baseline Codex UI are fully functional;
- every required state/condition/accessibility path is covered;
- the approved contact sheet matches the implementation revision/hash;
- preview creates no progress, rewards, stars or analytics;
- Kimi can replace the renderer using only its allowlisted frontend files;
- all behavior and accessibility parity gates pass;
- the V2 handover records exact commands, counts, files, hashes and next task;
- no production deployment, release or legacy removal is inferred from local completion.

## 13. Multilingual and writing-system addendum

The owner-approved
`docs/superpowers/specs/2026-07-19-learning-v2-multilingual-writing-systems-design.md`
is a mandatory upstream contract for the replaceable frontend.

Codex and any Kimi replacement must support profile-driven LTR/RTL, mixed
scripts, grapheme-safe text, annotation layers, font/glyph preflight and
Script Curriculum presentation without embedding locale or writing-system
business logic in components. Chinese and Japanese are the first complete
special packs; Korean and Arabic must be demonstrated as extensibility proofs.

Kimi deliverables follow `docs/v2/frontend-handoff/kimi-k3/` and remain isolated
presentation artifacts until Codex verifies contract, accessibility,
performance and prohibited-import parity.
