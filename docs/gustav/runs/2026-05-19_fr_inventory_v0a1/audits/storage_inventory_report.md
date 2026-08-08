# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-08-02T12:08:07.683Z

## Summary

- Files scanned: 3943
- Records: 3481
- Unique literal keys: 567
- Key patterns: 55
- Unknown expressions: 947
- Cloud sync keys observed: 143
- Learning-state records: 510
- Target namespace required: 59
- Blockers: 0
- High risks: 58
- Unknown-scope records: 171

## Top Risks

- `high` candidates.map(([key]: app/account_switch_backup_restore.ts:105 (unknown, multiGet)
- `high` missing: app/account_switch_backup_restore.ts:112 (unknown, multiSet)
- `high` missing.map(([key]: app/account_switch_backup_restore.ts:114 (unknown, multiRemove)
- `high` achievementPayoutPendingKey(stableId: app/achievements.ts:3230 (unknown, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:56 (legacy_english, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:69 (legacy_english, set)
- `high` doomed: app/cache_reset.ts:35 (unknown, multiRemove)
- `high` stickyOwnedKeys: app/cloud_sync.ts:2530 (unknown, multiGet)
- `high` stickyLessonKeys: app/cloud_sync.ts:2552 (unknown, multiGet)
- `high` lateLearningV2Keys: app/cloud_sync.ts:3169 (unknown, multiRemove)
- `high` sourceAccountKeys: app/cloud_sync.ts:3223 (unknown, multiGet)
- `high` lessonIds.map((id: app/daily_tasks.ts:2272 (unknown, multiGet)
- `high` ids.map((id: app/daily_tasks.ts:2593 (unknown, multiGet)
- `high` ids.map((id: app/daily_tasks.ts:2594 (unknown, multiGet)
- `high` storageKey(request: app/explain_local_cache.ts:51 (unknown, get)
- `high` storageKey(request: app/explain_local_cache.ts:64 (unknown, set)
- `high` flashcardsSwipeHintSeenKey(studyTarget: app/flashcards_swipe.tsx:2012 (unknown, get)
- `high` flashcardsSwipeHintSeenKey(studyTarget: app/flashcards_swipe.tsx:2025 (unknown, set)
- `high` legacyFreeLessonCapKey(studyTarget: app/legacy_free_lesson_access.ts:120 (unknown, get)
- `high` [capKey, migrationKey]: app/legacy_free_lesson_access.ts:130 (unknown, multiGet)
- `high` [[quarantineKey, raw], [key, '[]']]: app/level_up_reward_reconciler.ts:127 (unknown, multiSet)
- `high` LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY: app/level_up_reward_reconciler.ts:144 (unknown, get)
- `high` LEVEL_UP_REWARD_OWNER_KEY: app/level_up_reward_reconciler.ts:202 (unknown, get)
- `high` LEVEL_UP_REWARD_OWNER_KEY: app/level_up_reward_reconciler.ts:214 (unknown, set)
- `high` LEVEL_UP_REWARD_FALLBACK_KEY: app/level_up_reward_reconciler.ts:290 (unknown, set)
- `high` LEVEL_UP_REWARD_FALLBACK_KEY: app/level_up_reward_reconciler.ts:346 (unknown, set)
- `high` snapshotCommitPairs(stableId, values: app/premium_vip_storage.ts:114 (unknown, multiSet)
- `high` snapshotCommitPairs(stableId, normalized: app/premium_vip_storage.ts:191 (unknown, multiSet)
- `high` snapshotCacheKey(stableId: app/public_profile_snapshot.ts:106 (unknown, get)
- `high` snapshotCacheKey(stableId: app/public_profile_snapshot.ts:115 (unknown, set)
- `high` migrationKey: app/referral_system.ts:58 (unknown, get)
- `high` scope.storageKey: app/referral_system.ts:69 (unknown, set)
- `high` migrationKey: app/referral_system.ts:74 (unknown, set)
- `high` scope.storageKey: app/referral_system.ts:79 (unknown, get)
- `high` scope.storageKey: app/referral_system.ts:116 (unknown, set)
- `high` scope.storageKey: app/referral_system.ts:133 (unknown, set)
- `high` REFERRAL_STATE_STORAGE_KEY: app/referral_vip.ts:133 (unknown, set)
- `high` REFERRAL_STATE_STORAGE_KEY: app/referrals.tsx:298 (unknown, get)
- `high` spinCreditsStorageKey(stableId: app/roulette_spin_client.ts:77 (unknown, set)
- `high` spinCreditsStorageKey(stableId: app/roulette_spin_client.ts:92 (unknown, get)

## Unknowns

- tournament_weekly_prize_seen:${last.weekId} at app/(tabs)/tournaments.tsx:308
- tournament_weekly_prize_seen:${last.weekId} at app/(tabs)/tournaments.tsx:309
- candidates.map(([key] at app/account_switch_backup_restore.ts:105
- missing at app/account_switch_backup_restore.ts:112
- missing.map(([key] at app/account_switch_backup_restore.ts:114
- achievementPayoutPendingKey(stableId at app/achievements.ts:3230
- age_consent_cloud_pending_v1 at app/age_consent_cloud.ts:25
- app_messages_cache_v2 at app/app_messages.ts:35
- app_messages_last_background_refresh_ms_v2 at app/app_messages.ts:36
- app_messages_local_preview_v2 at app/app_messages.ts:39
- app_message_local_preview_states_v2 at app/app_messages.ts:40
- app_messages_report_reply_pending_claims_v2 at app/app_messages.ts:44
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:46
- app_message_visibility_outbox_v1 at app/app_messages.ts:48
- app_message_personal_modal_ack_outbox_v1 at app/app_messages.ts:50
- app_message_received_anim_ids_v2 at app/app_messages.ts:53
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:631
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:633
- remote_account_deleted_notice_v1 at app/auth_provider.ts:418
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2510
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2518
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2520
- doomed at app/cache_reset.ts:35
- shard_survey_last_at_ms at app/cloud_sync.ts:1
- stickyOwnedKeys at app/cloud_sync.ts:2530
- stickyLessonKeys at app/cloud_sync.ts:2552
- lateLearningV2Keys at app/cloud_sync.ts:3169
- sourceAccountKeys at app/cloud_sync.ts:3223
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:24
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:25
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:77
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:87
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:102
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:115
- compass_briefing_seen_ at app/compass/compass_briefing_host.tsx:55
- compass_day_closing_free_used_v1 at app/compass/day_closing_ritual.ts:12
- compass_day_closing_locked_last_v1 at app/compass/day_closing_ritual.ts:15
- lessonIds.map((id at app/daily_tasks.ts:2272
- ids.map((id at app/daily_tasks.ts:2593
- ids.map((id at app/daily_tasks.ts:2594
- daily_polyglot_v1 at app/daily_tasks.ts:3054
- daily_polyglot_v1 at app/daily_tasks.ts:3060
- daily_polyglot_v1 at app/daily_tasks.ts:3076
- ai_explain_local_cache_v1: at app/explain_local_cache.ts:4
- storageKey(request at app/explain_local_cache.ts:51
- storageKey(request at app/explain_local_cache.ts:64
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:37
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:39
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:147
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:163
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:172
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:189
- flashcardsSwipeHintSeenKey(studyTarget at app/flashcards_swipe.tsx:2012
- flashcardsSwipeHintSeenKey(studyTarget at app/flashcards_swipe.tsx:2025
- week_points_last_final at app/hall_of_fame_utils.ts:130
- week_points_last_final at app/hall_of_fame_utils.ts:147
- legacyFreeLessonCapKey(studyTarget at app/legacy_free_lesson_access.ts:120
- [capKey, migrationKey] at app/legacy_free_lesson_access.ts:130
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:28
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:66
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:82
- lesson_bonus_pending_v1 at app/lesson_bonus_grant.ts:84
- [[quarantineKey, raw], [key, '[]']] at app/level_up_reward_reconciler.ts:127
- LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY at app/level_up_reward_reconciler.ts:144
- LEVEL_UP_REWARD_OWNER_KEY at app/level_up_reward_reconciler.ts:202
- LEVEL_UP_REWARD_OWNER_KEY at app/level_up_reward_reconciler.ts:214
- LEVEL_UP_REWARD_FALLBACK_KEY at app/level_up_reward_reconciler.ts:290
- LEVEL_UP_REWARD_FALLBACK_KEY at app/level_up_reward_reconciler.ts:346
- partial_dual_claimed_levels_v1 at app/level_up_storage_keys.ts:10
- pending_level_up_reward_retry_v1 at app/level_up_storage_keys.ts:14
- pending_level_up_reward_context_v1 at app/level_up_storage_keys.ts:15
- pending_level_up_reward_fallback_v1 at app/level_up_storage_keys.ts:16
- pending_level_up_reward_owner_v1 at app/level_up_storage_keys.ts:17
- pending_level_up_queue_quarantine_v1 at app/level_up_storage_keys.ts:18
- pending_level_up_reward_retry_quarantine_v1 at app/level_up_storage_keys.ts:19
- pending_level_up_reward_context_quarantine_v1 at app/level_up_storage_keys.ts:20
- pending_level_up_reward_fallback_quarantine_v1 at app/level_up_storage_keys.ts:21
- name_index_synced_for_v1 at app/nickname_guard.ts:13
- generated_name_confirmed_v1 at app/nickname_guard.ts:14
- generated_nickname_pending_v1 at app/nickname_guard.ts:15

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
