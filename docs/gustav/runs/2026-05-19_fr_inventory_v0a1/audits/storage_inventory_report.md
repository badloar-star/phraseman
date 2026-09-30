# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-09-27T19:51:35.524Z

## Summary

- Files scanned: 5480
- Records: 3110
- Unique literal keys: 543
- Key patterns: 93
- Unknown expressions: 1224
- Cloud sync keys observed: 110
- Learning-state records: 708
- Target namespace required: 403
- Blockers: 4
- High risks: 398
- Unknown-scope records: 694

## Top Risks

- `high` [HELPFUL_REPORTS_CONFIRMED_KEY]: app/(tabs)/home.tsx:2539 (unknown, multiGet)
- `high` [...keys]: app/account_switch_backup_restore.ts:88 (unknown, multiGet)
- `high` missing: app/account_switch_backup_restore.ts:325 (unknown, multiSet)
- `high` missing: app/account_switch_backup_restore.ts:416 (unknown, multiSet)
- `high` [ACHIEVEMENT_ACCESS_PLUS_PAID_KEY, ACHIEVEMENT_ACCESS_PRO_PAID_KEY]: app/achievements.ts:1437 (unknown, multiGet)
- `high` storageKey: app/ai_consent_factory.ts:64 (unknown, get)
- `high` storageKey: app/ai_consent_factory.ts:82 (unknown, set)
- `high` storageKey: app/ai_dialog_daily_quota.ts:159 (unknown, get)
- `high` legacyKey: app/ai_dialog_daily_quota.ts:163 (unknown, get)
- `high` storageKey: app/ai_dialog_daily_quota.ts:165 (unknown, set)
- `high` storageKey: app/ai_dialog_daily_quota.ts:197 (unknown, get)
- `high` storageKey: app/ai_dialog_daily_quota.ts:208 (unknown, set)
- `high` markerKey: app/ai_dialog_extra_replies_client.ts:152 (unknown, get)
- `high` pendingKey: app/ai_dialog_extra_replies_client.ts:154 (unknown, get)
- `high` dialogExtraRepliesPendingKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:196 (unknown, get)
- `high` dialogExtraRepliesSyncMarkerKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:200 (unknown, get)
- `high` dialogExtraRepliesPreparedKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:243 (unknown, set)
- `high` dialogExtraRepliesPreparedKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:246 (unknown, remove)
- `high` pendingKey: app/ai_dialog_extra_replies_client.ts:291 (unknown, get)
- `high` dialogExtraRepliesEnvelopeKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:299 (unknown, get)
- `high` markerKey: app/ai_dialog_extra_replies_client.ts:306 (unknown, get)
- `high` pendingKey: app/ai_dialog_extra_replies_client.ts:310 (unknown, set)
- `high` pendingKey: app/ai_dialog_extra_replies_client.ts:312 (unknown, get)
- `high` pendingKey: app/ai_dialog_extra_replies_client.ts:328 (unknown, get)
- `high` dialogExtraRepliesPendingKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:353 (unknown, get)
- `high` storageKey: app/ai_dialog_hint_economy.ts:77 (unknown, get)
- `high` storageKey: app/ai_dialog_hint_economy.ts:95 (unknown, get)
- `high` storageKey: app/ai_dialog_hint_economy.ts:98 (unknown, set)
- `high` spend.durableWrites.map(([key, value]: app/ai_dialog_hint_economy.ts:166 (unknown, multiSet)
- `high` storageKey: app/ai_dialog_ownership.ts:103 (unknown, get)
- `high` pendingKey: app/ai_dialog_ownership.ts:251 (unknown, get)
- `high` pendingKey: app/ai_dialog_ownership.ts:323 (unknown, get)
- `high` storageKey: app/ai_dialog_ownership.ts:379 (unknown, get)
- `high` storageKey: app/ai_dialog_ownership.ts:383 (unknown, set)
- `high` storageKey: app/ai_dialog_ownership.ts:415 (unknown, set)
- `high` spend.durableWrites.map(([key, value]: app/ai_mistake_explain_limit_session.ts:80 (unknown, multiSet)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:157 (legacy_english, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:170 (legacy_english, set)
- `high` ACCOUNT_SWITCH_QUARANTINE_KEY: app/auth_recovery_boot_gate.ts:157 (unknown, get)
- `high` ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY: app/auth_recovery_boot_gate.ts:158 (unknown, get)

## Unknowns

- pm_app_welcome_played_v1 at app/_layout.tsx:2636
- pm_app_welcome_played_v1 at app/_layout.tsx:2638
- home_week_dot_animation_last_shown_v1 at app/(tabs)/home.tsx:228
- home_week_dot_animation_last_shown_v1 at app/(tabs)/home.tsx:2533
- [HELPFUL_REPORTS_CONFIRMED_KEY] at app/(tabs)/home.tsx:2539
- [...keys] at app/account_switch_backup_restore.ts:88
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:110
- account_switch_emergency_backup_page_v1:${backup.backupId}:${...} at app/account_switch_backup_restore.ts:262
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:300
- missing at app/account_switch_backup_restore.ts:325
- ${...}${...}:${...} at app/account_switch_backup_restore.ts:346
- missing at app/account_switch_backup_restore.ts:416
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:3
- account_switch_completion_receipt_v1 at app/account_switch_quarantine.ts:4
- account_switch_post_completion_handoff_v1 at app/account_switch_quarantine.ts:5
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:6
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:435
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:463
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:484
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:500
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:509
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:510
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:526
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:550
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:571
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:596
- account_switch_post_completion_handoff_v1 at app/account_switch_quarantine.ts:647
- account_switch_post_completion_handoff_v1 at app/account_switch_quarantine.ts:663
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:697
- account_switch_completion_receipt_v1 at app/account_switch_quarantine.ts:698
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:699
- active_days_v1 at app/achievements.ts:1347
- active_days_v1 at app/achievements.ts:1359
- [ACHIEVEMENT_ACCESS_PLUS_PAID_KEY, ACHIEVEMENT_ACCESS_PRO_PAID_KEY] at app/achievements.ts:1437
- age_consent_cloud_pending_v1 at app/age_consent_cloud.ts:25
- storageKey at app/ai_consent_factory.ts:64
- storageKey at app/ai_consent_factory.ts:82
- storageKey at app/ai_dialog_daily_quota.ts:159
- legacyKey at app/ai_dialog_daily_quota.ts:163
- storageKey at app/ai_dialog_daily_quota.ts:165
- storageKey at app/ai_dialog_daily_quota.ts:197
- storageKey at app/ai_dialog_daily_quota.ts:208
- markerKey at app/ai_dialog_extra_replies_client.ts:152
- pendingKey at app/ai_dialog_extra_replies_client.ts:154
- dialogExtraRepliesPendingKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:196
- dialogExtraRepliesSyncMarkerKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:200
- dialogExtraRepliesPreparedKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:243
- dialogExtraRepliesPreparedKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:246
- pendingKey at app/ai_dialog_extra_replies_client.ts:291
- dialogExtraRepliesEnvelopeKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:299
- markerKey at app/ai_dialog_extra_replies_client.ts:306
- pendingKey at app/ai_dialog_extra_replies_client.ts:310
- pendingKey at app/ai_dialog_extra_replies_client.ts:312
- pendingKey at app/ai_dialog_extra_replies_client.ts:328
- dialogExtraRepliesPendingKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:353
- ai_dialog_hint_session_v1 at app/ai_dialog_hint_economy.ts:43
- storageKey at app/ai_dialog_hint_economy.ts:77
- storageKey at app/ai_dialog_hint_economy.ts:95
- storageKey at app/ai_dialog_hint_economy.ts:98
- spend.durableWrites.map(([key, value] at app/ai_dialog_hint_economy.ts:166
- ai_dialog_intro_seen:v1 at app/ai_dialog_intro_seen.ts:5
- storageKey at app/ai_dialog_ownership.ts:103
- pendingKey at app/ai_dialog_ownership.ts:251
- pendingKey at app/ai_dialog_ownership.ts:323
- storageKey at app/ai_dialog_ownership.ts:379
- storageKey at app/ai_dialog_ownership.ts:383
- storageKey at app/ai_dialog_ownership.ts:415
- spend.durableWrites.map(([key, value] at app/ai_mistake_explain_limit_session.ts:80
- app_messages_cache_v2 at app/app_messages.ts:37
- app_messages_last_background_refresh_ms_v2 at app/app_messages.ts:38
- app_messages_local_preview_v2 at app/app_messages.ts:41
- app_message_local_preview_states_v2 at app/app_messages.ts:42
- app_messages_report_reply_pending_claims_v2 at app/app_messages.ts:46
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:48
- app_message_visibility_outbox_v1 at app/app_messages.ts:50
- app_message_personal_modal_ack_outbox_v1 at app/app_messages.ts:52
- app_message_modal_ack_outbox_v1 at app/app_messages.ts:54
- app_message_received_anim_ids_v2 at app/app_messages.ts:57
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:802
- app_messages_report_reply_pending_claims_v1 at app/app_messages.ts:804

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
