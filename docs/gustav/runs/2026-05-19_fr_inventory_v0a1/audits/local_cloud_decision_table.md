# GUSTAV Local/Cloud Decision Table

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-05-19T16:02:33.861Z

## Summary

- Entries: 28
- Sync under target: 15
- Keep local target-scoped: 7
- Covered by existing cloud pattern: 6
- Block unknown: 0
- Blockers: 22
- High risks: 6

## Decisions

- `lesson1_progress` -> `covered_by_existing_cloud_pattern` / `high`
  Reason: Literal lesson progress key is covered by the existing lesson progress cloud family.
  Target path: `progress/targets/{studyTarget}/lesson${...}_progress`
  Evidence: app/lesson_complete.tsx:554 (get)
- `lesson1_words` -> `covered_by_existing_cloud_pattern` / `high`
  Reason: Literal lesson words key is covered by the existing lesson words cloud family.
  Target path: `progress/targets/{studyTarget}/lesson${...}_words`
  Evidence: app/lesson_menu.tsx:348 (set)
- `level_exam_${...}_best_pct` -> `covered_by_existing_cloud_pattern` / `high`
  Reason: Dynamic level exam key family is represented in cloud sync by explicit A1/A2/B1/B2 keys.
  Evidence: app/_admin_settings_testers.tsx:1008 (multiSet)
- `level_exam_${...}_pass_count` -> `covered_by_existing_cloud_pattern` / `high`
  Reason: Dynamic level exam key family is represented in cloud sync by explicit A1/A2/B1/B2 keys.
  Evidence: app/_admin_settings_testers.tsx:1008 (multiSet)
- `level_exam_${...}_passed` -> `covered_by_existing_cloud_pattern` / `high`
  Reason: Dynamic level exam key family is represented in cloud sync by explicit A1/A2/B1/B2 keys.
  Evidence: app/_admin_settings_testers.tsx:1008 (multiSet)
- `level_exam_${...}_pct` -> `covered_by_existing_cloud_pattern` / `high`
  Reason: Dynamic level exam key family is represented in cloud sync by explicit A1/A2/B1/B2 keys.
  Evidence: app/_admin_settings_testers.tsx:1008 (multiSet)
- `lesson${...}_cellIndex` -> `keep_local_target_scoped` / `blocker`
  Reason: Navigation/session/replay state should not roam across devices, but it must be isolated per study target.
  Local shape: `lesson${...}_cellIndex_v2::{studyTarget}`
  Evidence: app/_admin_settings_testers.tsx:1008 (multiSet)
- `lesson${...}_errorReplayOverride` -> `keep_local_target_scoped` / `blocker`
  Reason: Navigation/session/replay state should not roam across devices, but it must be isolated per study target.
  Local shape: `lesson${...}_errorReplayOverride_v2::{studyTarget}`
  Evidence: app/lesson1.tsx:1154 (constant)
- `lesson${...}_errorReplayQueue` -> `keep_local_target_scoped` / `blocker`
  Reason: Navigation/session/replay state should not roam across devices, but it must be isolated per study target.
  Local shape: `lesson${...}_errorReplayQueue_v2::{studyTarget}`
  Evidence: app/lesson1.tsx:1152 (constant)
- `lesson${...}_errorReplaySince` -> `keep_local_target_scoped` / `blocker`
  Reason: Navigation/session/replay state should not roam across devices, but it must be isolated per study target.
  Local shape: `lesson${...}_errorReplaySince_v2::{studyTarget}`
  Evidence: app/lesson1.tsx:1153 (constant)
- `lesson${...}_phraseOrder` -> `keep_local_target_scoped` / `blocker`
  Reason: Navigation/session/replay state should not roam across devices, but it must be isolated per study target.
  Local shape: `lesson${...}_phraseOrder_v2::{studyTarget}`
  Evidence: app/lesson_screen_bootstrap.ts:56 (multiGet)
- `open_diagnostic` -> `keep_local_target_scoped` / `blocker`
  Reason: Navigation/session/replay state should not roam across devices, but it must be isolated per study target.
  Local shape: `open_diagnostic_v2::{studyTarget}`
  Evidence: app/diagnostic_test.tsx:1086 (remove)
- `quiz_nav_level` -> `keep_local_target_scoped` / `blocker`
  Reason: Navigation/session/replay state should not roam across devices, but it must be isolated per study target.
  Local shape: `quiz_nav_level_v2::{studyTarget}`
  Evidence: app/(tabs)/quizzes.tsx:1893 (get)
- `achievement_daily_phrase_read_count` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_daily_phrase_read_count`
  Local shape: `achievement_daily_phrase_read_count_v2::{studyTarget}`
  Evidence: app/achievements_screen.tsx:170 (get)
- `achievement_daily_phrase_save_count` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_daily_phrase_save_count`
  Local shape: `achievement_daily_phrase_save_count_v2::{studyTarget}`
  Evidence: app/achievements_screen.tsx:171 (get)
- `achievement_lesson_${...}_perfect_passes_v1` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_lesson_${...}_perfect_passes_v1`
  Local shape: `achievement_lesson_${...}_perfect_passes_v1_v2::{studyTarget}`
  Evidence: app/achievements_screen.tsx:224 (multiGet)
- `achievement_quiz_hard_perfect_count` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_quiz_hard_perfect_count`
  Local shape: `achievement_quiz_hard_perfect_count_v2::{studyTarget}`
  Evidence: app/achievements_screen.tsx:165 (get)
- `achievement_quiz_perfect_levels_today_v1` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_quiz_perfect_levels_today_v1`
  Local shape: `achievement_quiz_perfect_levels_today_v1_v2::{studyTarget}`
  Evidence: app/achievements.ts:1536 (get)
- `achievement_quiz_perfect_streak_v1` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_quiz_perfect_streak_v1`
  Local shape: `achievement_quiz_perfect_streak_v1_v2::{studyTarget}`
  Evidence: app/achievements_screen.tsx:166 (get)
- `achievement_quiz_total_count` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_quiz_total_count`
  Local shape: `achievement_quiz_total_count_v2::{studyTarget}`
  Evidence: app/(tabs)/quizzes.tsx:748 (get)
- `achievement_trainer_perfect_session_count` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/achievement_trainer_perfect_session_count`
  Local shape: `achievement_trainer_perfect_session_count_v2::{studyTarget}`
  Evidence: app/achievements_screen.tsx:181 (get)
- `lesson${...}_bonus_granted` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/lesson${...}_bonus_granted`
  Local shape: `lesson${...}_bonus_granted_v2::{studyTarget}`
  Evidence: app/lesson_complete.tsx:450 (get)
- `lesson${...}_irregular_shards_granted` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/lesson${...}_irregular_shards_granted`
  Local shape: `lesson${...}_irregular_shards_granted_v2::{studyTarget}`
  Evidence: app/lesson_irregular_verbs.tsx:358 (get)
- `lesson${...}_preposition_progress` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/lesson${...}_preposition_progress`
  Local shape: `lesson${...}_preposition_progress_v2::{studyTarget}`
  Evidence: app/lesson_menu.tsx:133 (multiGet)
- `mistake_log_v1` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/mistake_log_v1`
  Local shape: `mistake_log_v1_v2::{studyTarget}`
  Evidence: app/mistake_log.ts:18 (constant)
- `prep_drill_perfect_${...}` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/prep_drill_perfect_${...}`
  Local shape: `prep_drill_perfect_${...}_v2::{studyTarget}`
  Evidence: app/preposition_drill.tsx:200 (get)
- `quiz_hard_count` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/quiz_hard_count`
  Local shape: `quiz_hard_count_v2::{studyTarget}`
  Evidence: app/_admin_settings_testers.tsx:1487 (multiRemove)
- `trainer_store_v1` -> `sync_under_target` / `blocker`
  Reason: Target-sensitive progress, practice, reward idempotency or achievement counter must not remain flat/local-only without a reviewed decision.
  Target path: `progress/targets/{studyTarget}/trainer_store_v1`
  Local shape: `trainer_store_v1_v2::{studyTarget}`
  Evidence: app/trainer_store.ts:22 (constant)

## Notes

- This table resolves target-sensitive local keys that were absent from cloud mapping comparison.
- covered_by_existing_cloud_pattern means the missing entry is a literal or dynamic family already represented by a broader cloud mapping.
- French generation remains blocked while sync_under_target and keep_local_target_scoped keys do not have implemented target namespaces and tests.
