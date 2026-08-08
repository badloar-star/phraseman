# Admin Content Factory — Release 10B evidence

Date: 2026-07-13  
Scope: Admin v2 Content Studio only  
Deployment: not performed

## Delivered

- Capability-driven single-stage and lesson-range creation UI.
- Generator categories for lessons, quizzes, challenges, flashcards and Arena without removing the legacy advanced form.
- Approved-only dependency picker with client search, bounded cursor pagination and duplicate-safe page merging.
- One atomic server call for a lesson-range plan, with aggregate and per-stage progress, conflict details and failed-stage retry controls.
- Queue filters for request, kind, state, scope, study language and explanation language, plus cursor pagination.
- Stage-specific review for phrases, theory, topics, questions, flashcards and Arena; correct answers and distractors are visually distinct.
- Immutable artifact editing with the exact preview fingerprint and a semantic diff; raw JSON remains available as secondary technical data.
- Accessible responsive states for 375, 768, 1024 and 1440 px.

## Verification

- JavaScript syntax checks: passed for the extracted state, controller, renderers and `admin-core.js`.
- Root focused contracts: 2 suites / 16 tests passed after the final delta.
- Admin v2 E2E smoke: 7 / 7 passed, including dependencies, atomic range creation, revision edit/diff, filters, cursor pagination, keyboard focus and four viewport widths.
- Functions admin stage tests: 23 / 23 passed.
- Functions TypeScript build: passed.
- Admin v2 language audit: 23 files, 0 hard-term findings.
- Admin v2 visible-text audit: 18 items, 0 blocked findings.
- Admin v2 tooltip audit: 142 / 142 controls covered.
- Admin v2 runtime-state audit: 0 blocked findings.
- Firestore rules and indexes dry-run for `phraseman-ea0b3`: passed; no deployment performed. Two pre-existing rules warnings remain (`isProgressServerAuthoritative`, variable name `resource`).
- Focused `git diff --check`: passed; only line-ending conversion warnings were reported for two tracked Admin files.
- Smoke manifest SHA-256: `aff345a74e0d31ec43e7eade0520813ddfd14f772a0f2d9adc3c266333445e74`.

Advisor's first review found that the bulk-progress retry button used an inert attribute and ignored `retryable`. The final state uses the existing single-stage run path, renders the button only when `retryable === true`, and has an E2E click assertion proving that exactly one failed stage is retried. The focused scenario and the complete 7-test browser suite both passed after this correction.

## Known unrelated guard drift

An intentionally broader legacy audit, `tests/web_admin_runtime_fallback_audit.test.ts`, was sampled and failed four existing expectations unrelated to R10B: it expects the former monolithic `admin/index.html` implementation and a different invite-page deep-link policy. The R10B files do not touch those behaviours, so this release neither changes the stale test nor changes the unrelated product flows.

## Safety

- No production provider call was made.
- No project OpenAI key was used.
- No Firebase deployment, publication, commit or push was performed.
- Existing generator capabilities and the legacy advanced form were preserved.
