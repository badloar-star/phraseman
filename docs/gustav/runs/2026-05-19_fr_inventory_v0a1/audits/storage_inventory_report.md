# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-08-16T08:39:51.658Z

## Summary

- Files scanned: 4043
- Records: 3551
- Unique literal keys: 570
- Key patterns: 68
- Unknown expressions: 1026
- Cloud sync keys observed: 139
- Learning-state records: 574
- Target namespace required: 121
- Blockers: 0
- High risks: 120
- Unknown-scope records: 287

## Top Risks

- `high` candidates.map(([key]: app/account_switch_backup_restore.ts:105 (unknown, multiGet)
- `high` missing: app/account_switch_backup_restore.ts:112 (unknown, multiSet)
- `high` missing.map(([key]: app/account_switch_backup_restore.ts:114 (unknown, multiRemove)
- `high` achievementPayoutPendingKey(stableId: app/achievements.ts:3044 (unknown, get)
- `high` storageKey: app/ai_consent_factory.ts:60 (unknown, get)
- `high` storageKey: app/ai_consent_factory.ts:78 (unknown, set)
- `high` aiDialogIntroSeenKey(target: app/ai_dialog_intro_seen.ts:14 (unknown, get)
- `high` aiDialogIntroSeenKey(target: app/ai_dialog_intro_seen.ts:25 (unknown, set)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:56 (legacy_english, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:69 (legacy_english, set)
- `high` doomed: app/cache_reset.ts:93 (unknown, multiRemove)
- `high` stickyOwnedKeys: app/cloud_sync.ts:2683 (unknown, multiGet)
- `high` stickyLessonKeys: app/cloud_sync.ts:2705 (unknown, multiGet)
- `high` authoritativeGiftPerks.removeKeys: app/cloud_sync.ts:2787 (unknown, multiRemove)
- `high` lateLearningV2Keys: app/cloud_sync.ts:3331 (unknown, multiRemove)
- `high` sourceAccountKeys: app/cloud_sync.ts:3385 (unknown, multiGet)
- `high` lessonIds.map((id: app/daily_tasks.ts:2136 (unknown, multiGet)
- `high` ids.map((id: app/daily_tasks.ts:2448 (unknown, multiGet)
- `high` ids.map((id: app/daily_tasks.ts:2449 (unknown, multiGet)
- `high` deliveryKey: app/daily_tasks.ts:3003 (unknown, get)
- `high` deliveryKey: app/daily_tasks.ts:3253 (unknown, get)
- `high` getDevLocalPlusStorageKey(stableId: app/dev_plus_controls.ts:87 (unknown, get)
- `high` getDevLocalPlusStorageKey(normalizedStableId: app/dev_plus_controls.ts:98 (unknown, set)
- `high` storageKey(request: app/explain_local_cache.ts:51 (unknown, get)
- `high` storageKey(request: app/explain_local_cache.ts:64 (unknown, set)
- `high` flashcardsSwipeHintSeenKey(studyTarget: app/flashcards_swipe.tsx:2017 (unknown, get)
- `high` flashcardsSwipeHintSeenKey(studyTarget: app/flashcards_swipe.tsx:2030 (unknown, set)
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
- `high` baseKey: app/gift_account_storage.ts:99 (unknown, get)

## Unknowns

- pm_app_welcome_played_v1 at app/_layout.tsx:2887
- pm_app_welcome_played_v1 at app/_layout.tsx:2889
- tournament_weekly_prize_seen:${last.weekId} at app/(tabs)/tournaments.tsx:355
- tournament_weekly_prize_seen:${last.weekId} at app/(tabs)/tournaments.tsx:356
- candidates.map(([key] at app/account_switch_backup_restore.ts:105
- missing at app/account_switch_backup_restore.ts:112
- missing.map(([key] at app/account_switch_backup_restore.ts:114
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
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2550
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2558
- remote_account_deleted_notice_v1 at app/auth_provider.ts:2560
- doomed at app/cache_reset.ts:93
- level_up_shown_levels_v1 at app/cloud_sync.ts:1
- shard_survey_last_at_ms at app/cloud_sync.ts:1
- season_cosmetics_v1 at app/cloud_sync.ts:350
- season_cosmetics_v1 at app/cloud_sync.ts:2653
- stickyOwnedKeys at app/cloud_sync.ts:2683
- stickyLessonKeys at app/cloud_sync.ts:2705
- authoritativeGiftPerks.removeKeys at app/cloud_sync.ts:2787
- lateLearningV2Keys at app/cloud_sync.ts:3331
- sourceAccountKeys at app/cloud_sync.ts:3385
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:24
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:25
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:77
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:87
- coin_exchange_quote_cache_v1 at app/coin_exchange_client.ts:102
- coin_exchange_history_cache_v1 at app/coin_exchange_client.ts:115
- daily_phrase_home_pulse_day_v1 at app/daily_phrase_pulse.ts:3
- lessonIds.map((id at app/daily_tasks.ts:2136
- ids.map((id at app/daily_tasks.ts:2448
- ids.map((id at app/daily_tasks.ts:2449
- deliveryKey at app/daily_tasks.ts:3003
- daily_polyglot_v1 at app/daily_tasks.ts:3063
- daily_polyglot_v1 at app/daily_tasks.ts:3069
- daily_polyglot_v1 at app/daily_tasks.ts:3085
- deliveryKey at app/daily_tasks.ts:3253
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
- flashcardsSwipeHintSeenKey(studyTarget at app/flashcards_swipe.tsx:2017
- flashcardsSwipeHintSeenKey(studyTarget at app/flashcards_swipe.tsx:2030
- [[inventoryKey, JSON.stringify(next at app/flashcards/pack_trial_gift.ts:271
- effectPairs at app/friend_gift_inbox.ts:109
- missingKeys at app/friend_gift_inbox.ts:111
- restorePairs at app/friend_gift_inbox.ts:115
- removeKeys at app/friend_gift_inbox.ts:116
- [...legacyKeys, storageKey] at app/friend_gift_inventory.ts:75
- storageKey at app/friend_gift_inventory.ts:89
- legacyKeys at app/friend_gift_inventory.ts:91
- storageKey at app/friend_gift_inventory.ts:121
- ownerKey at app/gift_account_storage.ts:71
- ownerKey at app/gift_account_storage.ts:76
- ownerKey at app/gift_account_storage.ts:78
- baseKey at app/gift_account_storage.ts:99

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
