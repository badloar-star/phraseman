# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-08-13T01:51:55.132Z

## Summary

- Files scanned: 4261
- Records: 3698
- Unique literal keys: 600
- Key patterns: 81
- Unknown expressions: 1062
- Cloud sync keys observed: 140
- Learning-state records: 583
- Target namespace required: 132
- Blockers: 1
- High risks: 130
- Unknown-scope records: 350

## Top Risks

- `high` [...keys]: app/account_switch_backup_restore.ts:86 (unknown, multiGet)
- `high` missing: app/account_switch_backup_restore.ts:319 (unknown, multiSet)
- `high` missing: app/account_switch_backup_restore.ts:404 (unknown, multiSet)
- `high` achievementPayoutPendingKey(stableId: app/achievements.ts:3044 (unknown, get)
- `high` storageKey: app/ai_consent_factory.ts:60 (unknown, get)
- `high` storageKey: app/ai_consent_factory.ts:78 (unknown, set)
- `high` aiDialogIntroSeenKey(target: app/ai_dialog_intro_seen.ts:14 (unknown, get)
- `high` aiDialogIntroSeenKey(target: app/ai_dialog_intro_seen.ts:25 (unknown, set)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:56 (legacy_english, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:69 (legacy_english, set)
- `high` doomed: app/cache_reset.ts:93 (unknown, multiRemove)
- `high` [...keys]: app/cloud_sync.ts:833 (unknown, multiGet)
- `high` fcKey: app/cloud_sync.ts:2729 (unknown, get)
- `high` stickyOwnedKeys: app/cloud_sync.ts:2820 (unknown, multiGet)
- `high` stickyLessonKeys: app/cloud_sync.ts:2842 (unknown, multiGet)
- `high` authoritativeGiftPerks.removeKeys: app/cloud_sync.ts:2924 (unknown, multiRemove)
- `high` Array.from(: app/cloud_sync.ts:3590 (unknown, multiRemove)
- `high` sourceAccountKeys: app/cloud_sync.ts:3718 (unknown, multiGet)
- `high` lessonIds.map((id: app/daily_tasks.ts:2140 (unknown, multiGet)
- `high` ids.map((id: app/daily_tasks.ts:2452 (unknown, multiGet)
- `high` ids.map((id: app/daily_tasks.ts:2453 (unknown, multiGet)
- `high` deliveryKey: app/daily_tasks.ts:3007 (unknown, get)
- `high` deliveryKey: app/daily_tasks.ts:3258 (unknown, get)
- `high` getDevLocalPlusStorageKey(stableId: app/dev_plus_controls.ts:87 (unknown, get)
- `high` getDevLocalPlusStorageKey(normalizedStableId: app/dev_plus_controls.ts:98 (unknown, set)
- `high` storageKey(request: app/explain_local_cache.ts:51 (unknown, get)
- `high` storageKey(request: app/explain_local_cache.ts:64 (unknown, set)
- `high` flashcardsSwipeHintSeenKey(studyTarget: app/flashcards_swipe.tsx:2026 (unknown, get)
- `high` flashcardsSwipeHintSeenKey(studyTarget: app/flashcards_swipe.tsx:2039 (unknown, set)
- `high` [[inventoryKey, JSON.stringify(next: app/flashcards/pack_trial_gift.ts:271 (unknown, multiSet)
- `high` active_recall_items: app/flashcards/word_strength.ts:114 (legacy_english, get)
- `blocker` trainer_store_v1: app/flashcards/word_strength.ts:115 (legacy_english, get)
- `high` effectPairs: app/friend_gift_inbox.ts:109 (unknown, multiSet)
- `high` missingKeys: app/friend_gift_inbox.ts:111 (unknown, multiRemove)
- `high` restorePairs: app/friend_gift_inbox.ts:115 (unknown, multiSet)
- `high` removeKeys: app/friend_gift_inbox.ts:116 (unknown, multiRemove)
- `high` [...legacyKeys, storageKey]: app/friend_gift_inventory.ts:75 (unknown, multiGet)
- `high` storageKey: app/friend_gift_inventory.ts:89 (unknown, set)
- `high` legacyKeys: app/friend_gift_inventory.ts:91 (unknown, multiRemove)
- `high` storageKey: app/friend_gift_inventory.ts:121 (unknown, set)

## Unknowns

- pm_app_welcome_played_v1 at app/_layout.tsx:2948
- pm_app_welcome_played_v1 at app/_layout.tsx:2950
- tournament_weekly_prize_seen:${last.weekId} at app/(tabs)/tournaments.tsx:360
- tournament_weekly_prize_seen:${last.weekId} at app/(tabs)/tournaments.tsx:361
- [...keys] at app/account_switch_backup_restore.ts:86
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:108
- account_switch_emergency_backup_page_v1:${backup.backupId}:${...} at app/account_switch_backup_restore.ts:259
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:297
- missing at app/account_switch_backup_restore.ts:319
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:337
- missing at app/account_switch_backup_restore.ts:404
- achievementPayoutPendingKey(stableId at app/achievements.ts:3044
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
- remote_account_deleted_notice_v1 at app/auth_provider.ts:418
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2544
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2552
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2554
- doomed at app/cache_reset.ts:93
- level_up_shown_levels_v1 at app/cloud_sync.ts:1
- shard_survey_last_at_ms at app/cloud_sync.ts:1
- season_cosmetics_v1 at app/cloud_sync.ts:355
- [...keys] at app/cloud_sync.ts:833
- fcKey at app/cloud_sync.ts:2729
- season_cosmetics_v1 at app/cloud_sync.ts:2790
- stickyOwnedKeys at app/cloud_sync.ts:2820
- stickyLessonKeys at app/cloud_sync.ts:2842
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:2893
- authoritativeGiftPerks.removeKeys at app/cloud_sync.ts:2924
- ${...}${...}:0 at app/cloud_sync.ts:3452
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3484
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3490
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3491
- Array.from( at app/cloud_sync.ts:3590
- ${...}${...}:${...} at app/cloud_sync.ts:3618
- ${...}${...}:${...} at app/cloud_sync.ts:3645
- ${...}${...}:${...} at app/cloud_sync.ts:3646
- sourceAccountKeys at app/cloud_sync.ts:3718
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3723
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:42
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:43
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:95
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:105
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:120
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:133
- community_pack_liked_ids_v1 at app/community_packs/packSocialStorage.ts:10
- community_pack_added_registered_ids_v1 at app/community_packs/packSocialStorage.ts:11
- daily_phrase_home_pulse_day_v1 at app/daily_phrase_pulse.ts:3
- lessonIds.map((id at app/daily_tasks.ts:2140
- ids.map((id at app/daily_tasks.ts:2452
- ids.map((id at app/daily_tasks.ts:2453
- deliveryKey at app/daily_tasks.ts:3007
- daily_polyglot_v1 at app/daily_tasks.ts:3067
- daily_polyglot_v1 at app/daily_tasks.ts:3073
- daily_polyglot_v1 at app/daily_tasks.ts:3089
- deliveryKey at app/daily_tasks.ts:3258
- getDevLocalPlusStorageKey(stableId at app/dev_plus_controls.ts:87
- getDevLocalPlusStorageKey(normalizedStableId at app/dev_plus_controls.ts:98
- ai_explain_local_cache_v1: at app/explain_local_cache.ts:4
- storageKey(request at app/explain_local_cache.ts:51
- storageKey(request at app/explain_local_cache.ts:64
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:37
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:39
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:147
- top_helpers_snapshot_v2 at app/firestore_top_helpers.ts:163

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
