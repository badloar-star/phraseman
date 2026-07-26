# Admin Foundation Transfer Manifest

Date: 2026-07-16
Status: audit complete; transfer not yet applied.

## Objective

Move the existing Admin Content Studio foundation into the Learning V2 worktree without importing an entire historical snapshot, replacing the current Admin shell, weakening V2 permissions, or removing legacy behavior.

## Provenance

| SHA | Role | Scope | Decision |
| --- | --- | --- | --- |
| `5781aa82c8a504e5482e1e6391849526dbca9fe7` | original snapshot | 212 files, `+15,679/-166`; introduces all six required UI/backend surfaces and integration seams | unsafe as a direct cherry-pick |
| `43ba949e4270860090bd71059e11b9830f059765` | restored Admin shell | 39 files, `+52,741/-40,310`; UI files only plus shell replacement | unsafe as a direct cherry-pick |
| `445ccaac16955e89426394d1773e18ce82197170` | backend foundation snapshot | 164 files, `+10,271/-68`; stage callables, worker, stage engine and surface dependencies | unsafe as a direct cherry-pick |
| `0dd8149f971d9a05cb4a65cf6ae53c1a0a1b6d3d` | callable exports | one `functions/src/index.ts` change | unsafe without backend foundation |

The canary branch `codex/content-factory-canary-20260713` is not a complete source of the Admin foundation. Its later commits add lesson-intro-specific behavior and are outside the first V2 transfer slice.

## Required surfaces

UI:

- `admin/v2/scripts/pages/content-generator.js`
- `admin/v2/scripts/content-factory/controller.js`
- `admin/v2/scripts/content-factory/state.js`
- `admin/v2/scripts/content-factory/stage-renderers.js`
- `admin/v2/scripts/content-factory/renderers.js`
- targeted integration in `admin/v2/scripts/admin-core.js`
- targeted callable bindings in `admin/v2/scripts/admin-firebase.js`

Backend:

- `functions/src/admin_content_stages.ts`
- `functions/src/content_stage_worker.ts`
- only the stage-core imports required by the selected lesson-stage path
- corresponding callable exports and tests

## Dependency and safety rules

Do not copy the two backend entrypoints alone: they import stage contracts, capabilities, service, runner, control repository, lease, generation, prompt, artifact, budget, release-surface and review-fingerprint modules. The generic foundation must be reduced explicitly before transfer.

Do not replace `admin-core.js`, `admin-firebase.js`, `admin-router.js`, `functions/src/index.ts`, or `admin/index.html` wholesale. Adapt them surgically against the current V2 versions.

The first runtime path is one lesson-stage draft flow only: capability read → create → generate/retry → cursor-paginated list → immutable preview → manual review. Bulk/range, Arena, flashcards, Challenge, release sealing/activation/rollback, runtime consumer migration and lesson-intro extensions are excluded.

Before implementation, the writer must add a RED contract proving callable-only mutations, server-owned capabilities, separate `content.review` permission, immutable preview evidence, audit reason/fingerprint, queue reuse, and legacy generator preservation. Then implement and run the focused Admin/UI, Functions, permission, rules, syntax, TypeScript, diff and secret gates.

## Rollback

The transfer is additive and feature-flagged. Rollback returns navigation to the existing legacy route; it does not delete data, rewrite release pointers destructively, or remove legacy entrypoints.

## Current evidence

- V2 worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch `codex/learning-v2-pilot`.
- Main checkout remains dirty and read-only.
- Terra writer found the six reusable surfaces absent in the V2 worktree and correctly made no code change.
- Source-worktree JavaScript syntax checks passed.
- Jest in the source-worktree could not start because `ts-jest` is unavailable in that environment; this is an environment blocker, not a passing implementation gate.

## Surgical transfer result

Terra added the RED guard `tests/admin_v2_lesson_stage_transfer_contract.test.ts`. It correctly fails because the V2 worktree lacks `content-generator.js`. The measured source closure is 71 files (66 backend and 5 UI), or 73 when the two surgical integration files `admin-core.js` and `admin-firebase.js` are included. The closure also reaches excluded Arena, flashcard and quiz-release modules. It therefore exceeds the 20-file limit and no pseudo-foundation or cherry-pick was created.

The next executable design task is to split the backend stage platform at a new code-owned generic boundary, with an explicit exclusion test for surface-specific modules, before attempting implementation again.

## Approved generic boundary

The replacement design is an operational kernel capped at 18 files. It registers only `lesson_draft_v1` and exposes opaque immutable input/artifact refs, execution state, review receipts and append-only audit events. A lesson adapter may call existing generation/artifact primitives, but the kernel cannot import Arena, flashcard, quiz/challenge, release or runtime modules and cannot define Episode/Evidence/star/mastery types. Browser mutations remain callable-only; review uses `content.review`, maker-checker, expected revision and idempotency. Feature-off behavior returns to legacy.
