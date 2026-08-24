# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-08-24T08:00:28.171Z

## Summary

- Files scanned: 4587
- Records: 3567
- Unique literal keys: 600
- Key patterns: 86
- Unknown expressions: 1048
- Cloud sync keys observed: 139
- Learning-state records: 552
- Target namespace required: 215
- Blockers: 4
- High risks: 210
- Unknown-scope records: 516

## Top Risks

- `high` [HELPFUL_REPORTS_CONFIRMED_KEY]: app/(tabs)/home.tsx:1806 (unknown, multiGet)
- `high` [...keys]: app/account_switch_backup_restore.ts:86 (unknown, multiGet)
- `high` missing: app/account_switch_backup_restore.ts:319 (unknown, multiSet)
- `high` missing: app/account_switch_backup_restore.ts:404 (unknown, multiSet)
- `high` [ACHIEVEMENT_ACCESS_PLUS_PAID_KEY, ACHIEVEMENT_ACCESS_PRO_PAID_KEY]: app/achievements.ts:1613 (unknown, multiGet)
- `high` storageKey: app/ai_consent_factory.ts:60 (unknown, get)
- `high` storageKey: app/ai_consent_factory.ts:78 (unknown, set)
- `high` aiDialogIntroSeenKey(target: app/ai_dialog_intro_seen.ts:14 (unknown, get)
- `high` aiDialogIntroSeenKey(target: app/ai_dialog_intro_seen.ts:25 (unknown, set)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:56 (legacy_english, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:69 (legacy_english, set)
- `high` invitationKey(account.stableId: app/avatar_dna_invitation.ts:62 (unknown, get)
- `high` doomed: app/cache_reset.ts:97 (unknown, multiRemove)
- `high` [...keys]: app/cloud_sync.ts:860 (unknown, multiGet)
- `high` fcKey: app/cloud_sync.ts:3079 (unknown, get)
- `high` stickyOwnedKeys: app/cloud_sync.ts:3170 (unknown, multiGet)
- `high` stickyLessonKeys: app/cloud_sync.ts:3192 (unknown, multiGet)
- `high` authoritativeGiftPerks.removeKeys: app/cloud_sync.ts:3268 (unknown, multiRemove)
- `high` Array.from(: app/cloud_sync.ts:3937 (unknown, multiRemove)
- `high` sourceAccountKeys: app/cloud_sync.ts:4077 (unknown, multiGet)
- `high` flashcardsCommunityOwnedPackTitlesKey(studyTarget: app/community_packs/communityOwnedStorage.ts:59 (unknown, get)
- `high` flashcardsCommunityOwnedPackTitlesKey(studyTarget: app/community_packs/communityOwnedStorage.ts:81 (unknown, set)
- `high` flashcardsLocalAuthorPacksKey(studyTarget: app/community_packs/localAuthorPacks.ts:57 (unknown, get)
- `high` flashcardsLocalAuthorPacksKey(studyTarget: app/community_packs/localAuthorPacks.ts:64 (unknown, set)
- `high` chunk: app/customization_account_cleanup.ts:32 (unknown, multiRemove)
- `high` chunk: app/customization_account_cleanup.ts:33 (unknown, multiGet)
- `high` getDevLocalPlusStorageKey(stableId: app/dev_plus_controls.ts:87 (unknown, get)
- `high` getDevLocalPlusStorageKey(normalizedStableId: app/dev_plus_controls.ts:98 (unknown, set)
- `high` clientShardLedgerStateStorageKey(ownerStableId: app/economy/client_shard_operation_ledger.ts:284 (unknown, get)
- `high` operationKey: app/economy/client_shard_operation_ledger.ts:341 (unknown, get)
- `high` grantReceiptKey: app/economy/client_shard_operation_ledger.ts:342 (unknown, get)
- `high` preparedKey: app/economy/client_shard_operation_ledger.ts:343 (unknown, get)
- `high` stateKey: app/economy/client_shard_operation_ledger.ts:373 (unknown, set)
- `high` preparedKey: app/economy/client_shard_operation_ledger.ts:378 (unknown, remove)
- `high` reduced.writes.map(([key, value]: app/economy/client_shard_operation_ledger.ts:399 (unknown, multiSet)
- `high` preparedKey: app/economy/client_shard_operation_ledger.ts:401 (unknown, remove)
- `high` preparedKey: app/economy/client_shard_operation_ledger.ts:433 (unknown, set)
- `high` exactResultWrites.map(([key, value]: app/economy/client_shard_operation_ledger.ts:437 (unknown, multiSet)
- `high` grantReceiptKey: app/economy/client_shard_operation_ledger.ts:438 (unknown, set)
- `high` operationKey: app/economy/client_shard_operation_ledger.ts:480 (unknown, set)

## Unknowns

- pm_app_welcome_played_v1 at app/_layout.tsx:2658
- pm_app_welcome_played_v1 at app/_layout.tsx:2660
- active_days_v1 at app/(tabs)/friends.tsx:1320
- [HELPFUL_REPORTS_CONFIRMED_KEY] at app/(tabs)/home.tsx:1806
- [...keys] at app/account_switch_backup_restore.ts:86
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:108
- account_switch_emergency_backup_page_v1:${backup.backupId}:${...} at app/account_switch_backup_restore.ts:259
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:297
- missing at app/account_switch_backup_restore.ts:319
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:337
- missing at app/account_switch_backup_restore.ts:404
- active_days_v1 at app/achievements.ts:1498
- active_days_v1 at app/achievements.ts:1510
- [ACHIEVEMENT_ACCESS_PLUS_PAID_KEY, ACHIEVEMENT_ACCESS_PRO_PAID_KEY] at app/achievements.ts:1613
- age_consent_cloud_pending_v1 at app/age_consent_cloud.ts:25
- storageKey at app/ai_consent_factory.ts:60
- storageKey at app/ai_consent_factory.ts:78
- ai_dialog_intro_seen:v1 at app/ai_dialog_intro_seen.ts:4
- aiDialogIntroSeenKey(target at app/ai_dialog_intro_seen.ts:14
- aiDialogIntroSeenKey(target at app/ai_dialog_intro_seen.ts:25
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
- ${...}:${...} at app/arena_friend_duel.tsx:82
- ${...}:${...} at app/arena_friend_duel.tsx:99
- ${...}:${...} at app/arena_friend_duel.tsx:155
- remote_account_deleted_notice_v1 at app/auth_provider.ts:423
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2711
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2719
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2721
- invitationKey(account.stableId at app/avatar_dna_invitation.ts:62
- doomed at app/cache_reset.ts:97
- active_days_v1 at app/cloud_sync.ts:1
- level_up_shown_levels_v1 at app/cloud_sync.ts:1
- personal_plan_completed_tasks_v1 at app/cloud_sync.ts:1
- personal_plan_progress_v1 at app/cloud_sync.ts:1
- personal_plan_state_v1 at app/cloud_sync.ts:1
- personal_plan_task_progress_v1 at app/cloud_sync.ts:1
- personal_plan_xp_ledger_v1 at app/cloud_sync.ts:1
- shard_survey_last_at_ms at app/cloud_sync.ts:1
- дней вместе at app/cloud_sync.ts:1
- Позвать at app/cloud_sync.ts:1
- season_cosmetics_v1 at app/cloud_sync.ts:336
- [...keys] at app/cloud_sync.ts:860
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:1780
- fcKey at app/cloud_sync.ts:3079
- season_cosmetics_v1 at app/cloud_sync.ts:3140
- stickyOwnedKeys at app/cloud_sync.ts:3170
- stickyLessonKeys at app/cloud_sync.ts:3192
- personal_plan_completed_tasks_v1 at app/cloud_sync.ts:3206
- personal_plan_progress_v1 at app/cloud_sync.ts:3206
- personal_plan_state_v1 at app/cloud_sync.ts:3206
- personal_plan_task_progress_v1 at app/cloud_sync.ts:3206
- personal_plan_xp_ledger_v1 at app/cloud_sync.ts:3206
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3237
- authoritativeGiftPerks.removeKeys at app/cloud_sync.ts:3268
- ${...}${...}:0 at app/cloud_sync.ts:3799
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3831
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3837
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3838
- Array.from( at app/cloud_sync.ts:3937
- ${...}${...}:${...} at app/cloud_sync.ts:3965
- ${...}${...}:${...} at app/cloud_sync.ts:3999
- ${...}${...}:${...} at app/cloud_sync.ts:4000
- sourceAccountKeys at app/cloud_sync.ts:4077
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:4082
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:44
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:45
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:97
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:107
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:122
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:135

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
