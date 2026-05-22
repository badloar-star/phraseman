# GUSTAV P1A Post-Apply Guard

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T20:58:55.423Z

## Summary

- Allowed files: 4
- Allowed production files: 2
- Allowed test files: 2
- Forbidden write zones: 10
- Guard rules: 5
- Guard commands: 5
- Post-apply status: `not_run`
- Blockers: 0
- Warnings: 0
- Guard ready after approval: yes
- May start French generation: no
- May modify production app files: no

## Allowed Files

- `app/study_target.ts`
- `app/target_storage_keys.ts`
- `tests/gustav_surface_target_switch.test.ts`
- `tests/gustav_target_storage_keys.test.ts`

## Forbidden Write Zones

- `generated/`
- `curriculum/`
- `research/`
- `source_graph/`
- `docs/gustav/runs/*/generated/`
- `app/lesson*_v2*`
- `app/lesson_words*`
- `app/quiz_data*`
- `app/cloud_sync.ts`
- `components/StudyTargetContext.tsx`

## Guard Rules

- `P1A-SCOPE-ONLY` (blocker): A future P1A implementation may change only the four allowed packet files.
  - failure action: Stop apply, record unexpected file list, and do not continue to P1B/P1C.
- `P1A-NO-FRENCH-GENERATION` (blocker): No generated French content, lesson data, quiz data, source graph output or curriculum files may be created by P1A.
  - failure action: Revert or isolate generated artifacts before any content workflow continues.
- `P1A-NO-DEV-BRIDGE` (blocker): P1A may not modify StudyTargetContext, study_target_lang_dev, settings or spanish_content_gate; those belong to P1B.
  - failure action: Move bridge changes into a separate reviewed P1B packet.
- `P1A-TESTS-MUST-RUN` (blocker): P1A direct tests and dev-target companion regressions must pass before any later slice starts.
  - failure action: Keep readiness HOLD and do not request generation approval.
- `P1A-BROAD-PLAN-STAYS-CLOSED` (blocker): The broad 83-file apply plan remains unapproved; P1A approval cannot authorize it.
  - failure action: Reject the apply transition and regenerate the minimal packet.

## Commands

- `P1A_ALLOWED_STATUS`: `git status --short -- app/study_target.ts app/target_storage_keys.ts tests/gustav_surface_target_switch.test.ts tests/gustav_target_storage_keys.test.ts`
  - purpose: Show status for the four allowed P1A files only.
- `P1A_UNEXPECTED_APP_TEST_CHANGES`: `git status --short -- app tests components hooks constants`
  - purpose: List app/test/component changes; every returned path must be one of the four allowed P1A files before leaving the slice.
- `P1A_DIRECT_TESTS`: `npx jest --runTestsByPath tests/gustav_surface_target_switch.test.ts tests/gustav_target_storage_keys.test.ts --no-cache --runInBand`
  - purpose: Run direct P1A contract tests.
- `P1A_WITH_DEV_TARGET_REGRESSION`: `npx jest --runTestsByPath tests/gustav_surface_target_switch.test.ts tests/gustav_target_storage_keys.test.ts tests/study_target_lang_dev.test.ts tests/flashcard_content_lang.test.ts tests/storage.test.ts --no-cache --runInBand`
  - purpose: Run P1A tests with dev en/es target and storage regressions.
- `P1A_READINESS_RECHECK`: `node /private/tmp/gustav-build/gustav_readiness_gate.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1`
  - purpose: Recompute Gustav readiness after P1A implementation.

## Findings

No findings.

## Notes

- This guard is ready for a future approved P1A implementation, but it does not run post-apply checks yet.
- P1A implementation remains blocked until the minimal packet is explicitly approved.
- The guard intentionally keeps French generation and broad production apply closed.
- If the future implementation touches anything outside the four allowed files, Gustav must stop and audit the drift.
