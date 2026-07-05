# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-07-05T18:49:35.240Z

## Summary

- Files scanned: 3178
- Records: 3263
- Unique literal keys: 518
- Key patterns: 34
- Unknown expressions: 758
- Cloud sync keys observed: 151
- Learning-state records: 451
- Target namespace required: 7
- Blockers: 0
- High risks: 6
- Unknown-scope records: 32

## Top Risks

- `high` candidates.map(([key]: app/account_switch_backup_restore.ts:89 (unknown, multiGet)
- `high` missing: app/account_switch_backup_restore.ts:94 (unknown, multiSet)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:56 (legacy_english, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:69 (legacy_english, set)
- `high` stickyOwnedKeys: app/cloud_sync.ts:1991 (unknown, multiGet)
- `high` CONSTELLATION_INTRO_SEEN_KEY: app/constellation_search.tsx:210 (unknown, get)

## Unknowns

- candidates.map(([key] at app/account_switch_backup_restore.ts:89
- missing at app/account_switch_backup_restore.ts:94
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:29
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:194
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:217
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:220
- stickyOwnedKeys at app/cloud_sync.ts:1991
- compass_day_closing_locked_last_v1 at app/compass/day_closing_ritual.ts:15
- constellation_intro_seen_v1 at app/constellation_intro.tsx:28
- constellation_intro_seen_v1 at app/constellation_intro.tsx:70
- CONSTELLATION_INTRO_SEEN_KEY at app/constellation_search.tsx:210
- 0,0 at app/constellation_star_names.ts:19
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:37
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:39
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:147
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:163
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:172
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:189
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:21
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:51
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:63
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:65
- name_index_synced_for_v1 at app/nickname_guard.ts:5
- name_index_synced_for_v1 at app/nickname_guard.ts:36
- name_index_synced_for_v1 at app/nickname_guard.ts:48
- name_index_synced_for_v1 at app/nickname_guard.ts:65
- shard_survey_done_daykey_v1 at app/survey_daily_task.ts:17
- shard_survey_done_daykey_v1 at app/survey_daily_task.ts:22
- shard_survey_done_daykey_v1 at app/survey_daily_task.ts:31
- progress_local_event_applied_v1 at app/xp_manager.ts:155
- progress_local_event_applied_v1 at app/xp_manager.ts:179
- progress_local_event_applied_v1 at app/xp_manager.ts:186

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
