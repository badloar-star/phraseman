# GUSTAV P1A Minimal Apply Packet

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Approval: `not_requested`

Generated at: 2026-05-19T20:53:20.024Z

## Summary

- Files: 4
- Production files: 2
- Test files: 2
- Dirty worktree overlaps: 0
- Commands: 3
- Blockers: 0
- Warnings: 0
- Ready for approval: yes
- May start French generation: no
- May modify production app files: no

## Required Approval Text

> User approved P1A minimal apply packet 2026-05-19_fr_inventory_v0a1 on 2026-05-19. Approved file list: docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/p1a_minimal_apply_packet.json.

## Files

### app/study_target.ts

- Action: `add`
- Role: `study_target_model`
- Phase: `P1A`
- Dirty worktree overlap: no
- Reason: Add the production StudyTarget en/fr contract without touching the existing dev StudyTargetLang en/es path.
- Exit criteria:
  - StudyTarget accepts en/fr only.
  - Default production target remains en.
  - sourceLocale ru/uk cannot change studyTarget.
  - dev StudyTargetLang es is not accepted as production French.
- Rollback: Remove the newly added P1A file; no existing production state is migrated or deleted in this packet.

### app/target_storage_keys.ts

- Action: `add`
- Role: `target_key_builder`
- Phase: `P1A`
- Dirty worktree overlap: no
- Reason: Add target-safe storage key builders and raw key guard before any target-sensitive storage migration.
- Exit criteria:
  - Every allowed target domain produces distinct en/fr keys.
  - sourceTargetKey includes both studyTarget and sourceLocale where required.
  - legacyEnglishKey cannot produce French keys.
  - assertTargetKey rejects raw target-sensitive v1 keys outside migration adapters.
- Rollback: Remove the newly added P1A file; no existing production state is migrated or deleted in this packet.

### tests/gustav_surface_target_switch.test.ts

- Action: `add`
- Role: `test_contract`
- Phase: `P1A`
- Dirty worktree overlap: no
- Reason: Add direct P1A tests that prove target/sourceLocale separation, key distinctness, legacy English fallback limits and raw key rejection.
- Exit criteria:
  - P1A direct Jest command passes.
  - P1A with dev target regression command passes.
  - No production route or storage consumer is modified in this packet.
- Rollback: Remove the newly added P1A file; no existing production state is migrated or deleted in this packet.

### tests/gustav_target_storage_keys.test.ts

- Action: `add`
- Role: `test_contract`
- Phase: `P1A`
- Dirty worktree overlap: no
- Reason: Add direct P1A tests that prove target/sourceLocale separation, key distinctness, legacy English fallback limits and raw key rejection.
- Exit criteria:
  - P1A direct Jest command passes.
  - P1A with dev target regression command passes.
  - No production route or storage consumer is modified in this packet.
- Rollback: Remove the newly added P1A file; no existing production state is migrated or deleted in this packet.

## Commands

- `P1A_DIRECT_TESTS`: `npx jest --runTestsByPath tests/gustav_surface_target_switch.test.ts tests/gustav_target_storage_keys.test.ts --no-cache --runInBand`
- `P1A_WITH_DEV_TARGET_REGRESSION`: `npx jest --runTestsByPath tests/gustav_surface_target_switch.test.ts tests/gustav_target_storage_keys.test.ts tests/study_target_lang_dev.test.ts tests/flashcard_content_lang.test.ts tests/storage.test.ts --no-cache --runInBand`
- `FULL_TEST_SUITE_AFTER_P1`: `npm test`

## Findings

No findings.

## Notes

- This packet narrows approval to the P1A first slice only.
- It does not approve the broad 83-file apply plan.
- It does not write product files, test files or French content.
- After approval, only the four packet files may be edited for P1A.
