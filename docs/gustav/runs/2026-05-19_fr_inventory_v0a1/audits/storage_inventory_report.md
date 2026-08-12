# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-08-11T20:32:04.102Z

## Summary

- Files scanned: 4134
- Records: 3634
- Unique literal keys: 587
- Key patterns: 81
- Unknown expressions: 1045
- Cloud sync keys observed: 139
- Learning-state records: 579
- Target namespace required: 129
- Blockers: 0
- High risks: 128
- Unknown-scope records: 306

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
- `high` [...keys]: app/cloud_sync.ts:818 (unknown, multiGet)
- `high` stickyOwnedKeys: app/cloud_sync.ts:2771 (unknown, multiGet)
- `high` stickyLessonKeys: app/cloud_sync.ts:2793 (unknown, multiGet)
- `high` authoritativeGiftPerks.removeKeys: app/cloud_sync.ts:2875 (unknown, multiRemove)
- `high` Array.from(: app/cloud_sync.ts:3541 (unknown, multiRemove)
- `high` sourceAccountKeys: app/cloud_sync.ts:3669 (unknown, multiGet)
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
- `high` effectPairs: app/friend_gift_inbox.ts:109 (unknown, multiSet)
- `high` missingKeys: app/friend_gift_inbox.ts:111 (unknown, multiRemove)
- `high` restorePairs: app/friend_gift_inbox.ts:115 (unknown, multiSet)
- `high` removeKeys: app/friend_gift_inbox.ts:116 (unknown, multiRemove)
- `high` [...legacyKeys, storageKey]: app/friend_gift_inventory.ts:75 (unknown, multiGet)
- `high` storageKey: app/friend_gift_inventory.ts:89 (unknown, set)
- `high` legacyKeys: app/friend_gift_inventory.ts:91 (unknown, multiRemove)
- `high` storageKey: app/friend_gift_inventory.ts:121 (unknown, set)
- `high` ownerKey: app/gift_account_storage.ts:71 (unknown, get)
- `high` ownerKey: app/gift_account_storage.ts:76 (unknown, set)
- `high` ownerKey: app/gift_account_storage.ts:78 (unknown, get)

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
- [...keys] at app/cloud_sync.ts:818
- season_cosmetics_v1 at app/cloud_sync.ts:2741
- stickyOwnedKeys at app/cloud_sync.ts:2771
- stickyLessonKeys at app/cloud_sync.ts:2793
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:2844
- authoritativeGiftPerks.removeKeys at app/cloud_sync.ts:2875
- ${...}${...}:0 at app/cloud_sync.ts:3403
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3435
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3441
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3442
- Array.from( at app/cloud_sync.ts:3541
- ${...}${...}:${...} at app/cloud_sync.ts:3569
- ${...}${...}:${...} at app/cloud_sync.ts:3596
- ${...}${...}:${...} at app/cloud_sync.ts:3597
- sourceAccountKeys at app/cloud_sync.ts:3669
- account_switch_emergency_backup_page_v1:${...}:${...} at app/cloud_sync.ts:3674
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:42
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:43
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:95
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:105
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:120
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:133
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
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:172
- top_helpers_remote_at_v2 at app/firestore_top_helpers.ts:189
- flashcardsSwipeHintSeenKey(studyTarget at app/flashcards_swipe.tsx:2026

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
