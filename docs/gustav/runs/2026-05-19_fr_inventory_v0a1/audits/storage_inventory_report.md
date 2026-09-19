# GUSTAV Storage Inventory Report

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-09-19T18:46:25.793Z

## Summary

- Files scanned: 5502
- Records: 4162
- Unique literal keys: 656
- Key patterns: 103
- Unknown expressions: 1467
- Cloud sync keys observed: 139
- Learning-state records: 827
- Target namespace required: 481
- Blockers: 4
- High risks: 476
- Unknown-scope records: 881

## Top Risks

- `high` [HELPFUL_REPORTS_CONFIRMED_KEY]: app/(tabs)/home.tsx:2696 (unknown, multiGet)
- `high` [...keys]: app/account_switch_backup_restore.ts:88 (unknown, multiGet)
- `high` missing: app/account_switch_backup_restore.ts:325 (unknown, multiSet)
- `high` missing: app/account_switch_backup_restore.ts:416 (unknown, multiSet)
- `high` [ACHIEVEMENT_ACCESS_PLUS_PAID_KEY, ACHIEVEMENT_ACCESS_PRO_PAID_KEY]: app/achievements.ts:1665 (unknown, multiGet)
- `high` storageKey: app/ai_consent_factory.ts:64 (unknown, get)
- `high` storageKey: app/ai_consent_factory.ts:82 (unknown, set)
- `high` aiDialogDailyQuotaStorageKey(stableUid: app/ai_dialog_daily_quota.ts:74 (unknown, get)
- `high` aiDialogDailyQuotaStorageKey(stableUid: app/ai_dialog_daily_quota.ts:110 (unknown, set)
- `high` outboxKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:101 (unknown, get)
- `high` outboxKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:119 (unknown, set)
- `high` pendingKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:120 (unknown, set)
- `high` pendingKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:152 (unknown, get)
- `high` pendingKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:165 (unknown, get)
- `high` pendingKey(ownerStableId: app/ai_dialog_extra_replies_client.ts:167 (unknown, remove)
- `high` ownedKey(stableId: app/ai_dialog_ownership.ts:82 (unknown, get)
- `high` ownedKey(ownerStableId: app/ai_dialog_ownership.ts:144 (unknown, set)
- `high` outboxKey(ownerStableId: app/ai_dialog_ownership.ts:146 (unknown, get)
- `high` outboxKey(ownerStableId: app/ai_dialog_ownership.ts:148 (unknown, set)
- `high` outboxKey(ownerStableId: app/ai_dialog_ownership.ts:186 (unknown, get)
- `high` outboxKey(stableId: app/ai_dialog_ownership.ts:229 (unknown, get)
- `high` outboxKey(stableId: app/ai_dialog_ownership.ts:233 (unknown, set)
- `high` ownerStableId ? ownedKey(ownerStableId: app/ai_dialog_ownership.ts:260 (unknown, set)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:130 (legacy_english, get)
- `high` ai_mistake_limit_notice_shown_v1: app/ai_mistake_explain_limit_session.ts:143 (legacy_english, set)
- `high` ACCOUNT_SWITCH_QUARANTINE_KEY: app/auth_recovery_boot_gate.ts:157 (unknown, get)
- `high` ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY: app/auth_recovery_boot_gate.ts:158 (unknown, get)
- `high` ACCOUNT_PROVIDER_HANDOFF_KEY: app/auth_recovery_boot_gate.ts:159 (unknown, get)
- `high` invitationKey(account.stableId: app/avatar_dna_invitation.ts:62 (unknown, get)
- `high` scopedKey(SESSIONS_KEY: app/avatar_nudge_state.ts:67 (unknown, set)
- `high` scopedKey(VISITED_KEY: app/avatar_nudge_state.ts:82 (unknown, set)
- `high` doomed: app/cache_reset.ts:98 (unknown, multiRemove)
- `high` [...keys]: app/cloud_sync.ts:969 (unknown, multiGet)
- `high` fcKey: app/cloud_sync.ts:4145 (unknown, get)
- `high` stickyOwnedKeys: app/cloud_sync.ts:4237 (unknown, multiGet)
- `high` stickyLessonKeys: app/cloud_sync.ts:4263 (unknown, multiGet)
- `high` authoritativeGiftPerks.removeKeys: app/cloud_sync.ts:4342 (unknown, multiRemove)
- `high` Array.from(: app/cloud_sync.ts:5062 (unknown, multiRemove)
- `high` sourceAccountKeys: app/cloud_sync.ts:5232 (unknown, multiGet)
- `high` flashcardsCommunityOwnedPackTitlesKey(studyTarget: app/community_packs/communityOwnedStorage.ts:68 (unknown, get)

## Unknowns

- pm_app_welcome_played_v1 at app/_layout.tsx:2892
- pm_app_welcome_played_v1 at app/_layout.tsx:2894
- active_days_v1 at app/(tabs)/friends.tsx:1336
- home_week_dot_animation_last_shown_v1 at app/(tabs)/home.tsx:230
- home_week_dot_animation_last_shown_v1 at app/(tabs)/home.tsx:2690
- [HELPFUL_REPORTS_CONFIRMED_KEY] at app/(tabs)/home.tsx:2696
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
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:394
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:422
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:443
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:459
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:468
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:469
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:485
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:509
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:530
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:555
- account_switch_post_completion_handoff_v1 at app/account_switch_quarantine.ts:606
- account_switch_post_completion_handoff_v1 at app/account_switch_quarantine.ts:622
- account_switch_quarantine_v1 at app/account_switch_quarantine.ts:656
- account_switch_completion_receipt_v1 at app/account_switch_quarantine.ts:657
- account_provider_handoff_v1 at app/account_switch_quarantine.ts:658
- active_days_v1 at app/achievements.ts:1543
- active_days_v1 at app/achievements.ts:1555
- [ACHIEVEMENT_ACCESS_PLUS_PAID_KEY, ACHIEVEMENT_ACCESS_PRO_PAID_KEY] at app/achievements.ts:1665
- age_consent_cloud_pending_v1 at app/age_consent_cloud.ts:25
- storageKey at app/ai_consent_factory.ts:64
- storageKey at app/ai_consent_factory.ts:82
- aiDialogDailyQuotaStorageKey(stableUid at app/ai_dialog_daily_quota.ts:74
- aiDialogDailyQuotaStorageKey(stableUid at app/ai_dialog_daily_quota.ts:110
- outboxKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:101
- outboxKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:119
- pendingKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:120
- pendingKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:152
- pendingKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:165
- pendingKey(ownerStableId at app/ai_dialog_extra_replies_client.ts:167
- ai_dialog_hint_session_v1 at app/ai_dialog_hint_economy.ts:38
- ai_dialog_hint_session_v1 at app/ai_dialog_hint_economy.ts:66
- ai_dialog_hint_session_v1 at app/ai_dialog_hint_economy.ts:82
- ai_dialog_hint_session_v1 at app/ai_dialog_hint_economy.ts:85
- ai_dialog_intro_seen:v1 at app/ai_dialog_intro_seen.ts:5
- ownedKey(stableId at app/ai_dialog_ownership.ts:82
- ownedKey(ownerStableId at app/ai_dialog_ownership.ts:144
- outboxKey(ownerStableId at app/ai_dialog_ownership.ts:146
- outboxKey(ownerStableId at app/ai_dialog_ownership.ts:148
- outboxKey(ownerStableId at app/ai_dialog_ownership.ts:186
- outboxKey(stableId at app/ai_dialog_ownership.ts:229
- outboxKey(stableId at app/ai_dialog_ownership.ts:233
- ownerStableId ? ownedKey(ownerStableId at app/ai_dialog_ownership.ts:260
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
- ${...}:${...} at app/arena_friend_duel.tsx:89
- ${...}:${...} at app/arena_friend_duel.tsx:109
- ${...}:${...} at app/arena_friend_duel.tsx:188
- remote_account_deleted_notice_v1 at app/auth_provider.ts:483
- remote_account_deleted_notice_v1 at app/auth_provider.ts:3704
- remote_account_deleted_notice_v1 at app/auth_provider.ts:3711
- remote_account_deleted_notice_v1 at app/auth_provider.ts:3713
- ACCOUNT_SWITCH_QUARANTINE_KEY at app/auth_recovery_boot_gate.ts:157
- ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY at app/auth_recovery_boot_gate.ts:158

## Notes

- This is an automated heuristic inventory, not a final migration plan.
- French generation remains blocked while blocker/high-risk learning keys are unresolved.
- Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.
- The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.
