# Learning V2 Static Owner Review — Design

**Status:** owner-approved on 2026-08-28 (`variant 1`).

## Goal

Provide one lightweight browser surface where the owner can fully walk through every English Learning V2 session currently exposed by the canonical authoring registry, without starting Expo/Metro, Firebase, or the application bootstrap.

## Source authority

The review surface is not a second content source. It is generated from `learningV2AuthoringDevicePreviewRowsV1()` and `buildLearningV2AuthoringDevicePreviewV1()`, which already execute the real `authored source -> shard -> learner package` projection. Intro answer metadata that is intentionally omitted from the learner child is joined from the same exact `authoredLearningV2SessionSource(sessionOrdinal)` object.

The generated navigation exposes only the continuous locked prefix and current authoring session returned by the registry. A future forbidden ordinal is never rendered and cannot be opened by changing a URL parameter.

## Output and lifecycle

- Generator: `scripts/build_learning_v2_static_owner_review.ts`.
- Pure bundle builder: `modules/learning-v2/preview/static_owner_review_bundle_v1.ts`.
- Browser template/runtime: `scripts/learning-v2-static-owner-review/`.
- Generated artifact: `.codex-tmp/learning-v2-owner-review/index.html` plus its serialized source bundle.
- Lightweight server: `scripts/serve_learning_v2_static_owner_review.mjs`.
- Project command: `npm run learning-v2:owner-review-html` rebuilds and serves the latest artifact.

The artifact is disposable; the generator is permanent. Each completed session becomes visible only after the canonical registry exposes it and the command is rerun.

## Learner flow

The landing screen lists the currently reviewable sessions with authoring status, intro/practice counts, package fingerprint, and locale selector. Opening a session presents exactly three intro pages, then the real practice order.

Each practice interaction is rendered from its mode-native payload:

- `phrase_builder`: selectable tiles assemble the target and expose exact feedback.
- `listen_choose`: browser speech uses the exact approved transcript as the DEV fallback; localized meaning choices remain selectable when audio is unavailable.
- `listen_build_dictation`: the target stays hidden until the attempt and is assembled from real tiles.
- `context_gap_grammar`: one visible gap with real options and per-response feedback.
- `speed_match`: two independently ordered columns; matched pairs remain visible and disabled.
- `scripted_repeat_compare`: reference playback, real browser microphone hold-to-talk where available, captured playback, and honest self-compare state.

Word-first overlays are inserted from `auxiliaryChild.entries[n].newWordEncounter` immediately before the corresponding practice interaction. The card can flip immediately, auto-flips after three seconds, speaks the exact word, and never changes the underlying practice index.

## Review-only boundary

This surface writes no learner progress, economy state, Firebase data, approvals, or authoring status. Local browser state may remember only presentation preferences such as locale. Completing the HTML walkthrough does not promote a DRAFT session; it is owner-review evidence only.

## Visual and accessibility rules

The page is mobile-first and responsive. Instruction text and target-language material are separate layers; target text uses the session accent and stronger weight. Touch targets are at least 44 px, focus is visible, controls have accessible names, and reduced-motion removes decorative travel without removing state transitions. Internal family names remain hidden from learner screens and are available only in a collapsed QA inspector.

## Acceptance

1. A generated artifact opens without Expo, Metro, Firebase, or application routing.
2. It shows sessions 1 and 2 for the current registry state and rejects 3–56.
3. Every locale has three real intro pages and every real practice interaction.
4. All six active mode-native families are interactive.
5. New-word overlays appear at their real positions.
6. Source fingerprints and counts are visible on the landing card/QA inspector.
7. Focused automated contracts and a browser walkthrough pass.

