# Spire Italian Contour Implementation Plan

**Goal:** ship Italian as a complete fail-closed Spire contour with 4,000 generated tasks, weekly packs, audio, reports, quarantine, and production-admin controls.

## Phase 1 — Contract tests (RED)

- Extend registry tests to require `it` across client, server, admin, reports, quarantine, rules, and packaged assets.
- Add Italian audio expectations for `it-IT`.
- Extend the multilingual builder gate to require an Italian fact pack, 4,000 tasks, exact quotas, hashes, and language invariants.

**Acceptance:** focused tests fail only because Italian is not implemented.

## Phase 2 — Italian source and deterministic generator

- Add Italian grammar and lexical fact inventory with cited sources.
- Add Italian rendering, agreement, elision/preposition handling, tokenisation, and distractor proofs to the shared builder.
- Generate Italian tasks and manifest deterministically.

**Acceptance:** generated Italian output contains exactly 4,000 structurally valid, target-bound tasks and is reproducible byte-for-byte.

## Phase 3 — Runtime, server, and moderation wiring

- Extend canonical Spire and Arena-content registries to `it`.
- Include Italian in asset packaging and direct multilingual pool loading.
- Extend report, incident, flag, room/progress, and pack-build contracts.
- Extend Firestore protection for `spire_task_flags_it`.

**Acceptance:** Italian builds use only Italian tasks; reports quarantine Italian tasks; no fallback is possible.

## Phase 4 — App and production admin

- Enable Italian selection and beta badge in the Spire UI.
- Enable Italian device speech as `it-IT`.
- Add Italian to the production-admin selector, preparation state, review queue, quarantine controls, and weekly build.

**Acceptance:** an Italian learner sees Italian Spire tasks; the admin can manage the complete Italian lifecycle with the same controls as ES/FR/DE.

## Phase 5 — Quality and release audit

- Run content-generation tests, Spire unit tests, Functions typecheck/build, app typecheck, Firestore rules tests, and deterministic asset packaging.
- Run an independent linguistic/contract audit and a second regression audit after corrections.
- Record any release blocker honestly; do not mark the contour available while a required receipt is missing.

**Acceptance:** all deterministic gates pass and independent review reports no critical or high-severity defect.

