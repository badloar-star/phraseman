# GUSTAV Dirty Overlap Preservation Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T20:00:58.445Z

## Summary

- Planned dirty overlaps: 20
- Reviewed overlaps: 20
- Currently dirty overlaps: 20
- No-longer-dirty overlaps: 0
- Missing files: 0
- Total diff added lines: 314
- Total diff deleted lines: 106
- Blockers: 0
- High risks: 0
- Can preserve dirty worktree: yes
- May modify production app files: no

## Decisions

### app/_layout.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +5 / -1
- Preservation status: `preservation_plan_recorded`
- Phase: `P5`
- Owner area: `storage`
- Adapters: `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/(tabs)/home.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +26 / -13
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/(tabs)/settings.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +26 / -8
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `study_target`
- Adapters: `production_study_target`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/cloud_sync.ts

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +1 / -0
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `level_exam_certificate_store`, `target_stats_store`, `cloud_sync_target_buckets`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/daily_tasks_screen.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +25 / -0
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `quiz_progress_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/daily_tasks.ts

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +5 / -0
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/diagnostic_test.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +0 / -1
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `personal_practice_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/exam.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +5 / -3
- Preservation status: `preservation_plan_recorded`
- Phase: `P2`
- Owner area: `storage`
- Adapters: `legacy_english_compat`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/firestore_leaderboard.ts

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +1 / -1
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/flashcards_collection.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +51 / -1
- Preservation status: `preservation_plan_recorded`
- Phase: `P3`
- Owner area: `course`
- Adapters: `flashcards_target_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/flashcards_swipe.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +14 / -0
- Preservation status: `preservation_plan_recorded`
- Phase: `P3`
- Owner area: `course`
- Adapters: `flashcards_target_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/lesson_intro_screens.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +46 / -23
- Preservation status: `preservation_plan_recorded`
- Phase: `P5`
- Owner area: `storage`
- Adapters: `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/lesson_irregular_verbs.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +0 / -1
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `lesson_session_store`, `lesson_reward_idempotency`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/lesson_words.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +1 / -1
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `lesson_progress_store`, `lesson_session_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/lesson1.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +2 / -2
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `lesson_session_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/level_exam.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +6 / -2
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `level_exam_certificate_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/pack_opening.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +28 / -24
- Preservation status: `preservation_plan_recorded`
- Phase: `P5`
- Owner area: `storage`
- Adapters: `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/trainer_smart_session.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +34 / -7
- Preservation status: `preservation_plan_recorded`
- Phase: `P3`
- Owner area: `trainer`
- Adapters: `trainer_practice_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### app/trainer.tsx

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +37 / -18
- Preservation status: `preservation_plan_recorded`
- Phase: `P3`
- Owner area: `trainer`
- Adapters: `trainer_practice_store`, `route_surface_integration`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

### hooks/use-flashcards.ts

- Git status: ` M`
- Currently dirty: yes
- Exists: yes
- Diff: +1 / -0
- Preservation status: `preservation_plan_recorded`
- Phase: `P1`
- Owner area: `storage`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `flashcards_target_store`
- Strategy:
  - Read the current file before any apply edit.
  - Patch only the target-isolation call sites listed by the adapter plan.
  - Preserve unrelated current hunks and avoid whole-file rewrites or broad formatting.
  - If an intended hunk overlaps current local edits, stop and create a smaller follow-up patch instead of replacing the user change.
- Required before edit:
  - Re-run this preservation audit immediately before production apply.
  - Review git diff for this file in the same turn as the edit.
  - Keep rollback additive: disable new v2 target path without deleting legacy English keys.

## Findings

### DOP-000: Dirty-overlap preservation plan recorded

Severity: `info`

20 dirty-overlap file(s) have preservation instructions before any production apply.

Source refs:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/file_changes.json:1` (apply_plan)

## Notes

- This audit records preservation strategy only; it does not approve production app writes.
- Dirty files remain dirty and must be rechecked immediately before any approved apply.
- No French content is generated by this audit.
