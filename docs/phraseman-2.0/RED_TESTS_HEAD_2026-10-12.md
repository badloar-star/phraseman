# Красные тесты на HEAD — полный прогон 12.10.2026

**HEAD `862f055c5`: 2378 наборов раннера (17610 тестов) + 236 файлов node --test. Красных: 303 файлов / 587 тестов. Наши зоны — 65 файлов (119 тестов), из них настоящих 53, артефактов среза 12; Codex — 238 файлов (468 тестов).**

Как прогнано: чистый срез HEAD вне репозитория (git archive, соединения на node_modules), 30 частей по 80 файлов, `--maxWorkers=1`, со слотом светофора и проверкой памяти/tsc перед каждой частью; `*.test.mjs` — `node --test` по файлу. Тесты не чинились.
Срез не содержит `.git` и неотслеживаемых файлов — поэтому каждый красный из наших зон перепрогнан в рабочей копии: «артефакт среза» = там зелёный, «настоящий» = красный и там. «Свежий» = файл теста менялся за 24 ч до HEAD (иначе «давний» — красный, вероятно, давно).

## Наши зоны — 65 файлов, 119 тестов

| Файл | Тестов | Причина (первая) | Вердикт | Свежий/давний | Последний коммит теста |
|---|---|---|---|---|---|
| `tests/account_provision_lock_android_runtime_entrypoint.test.ts` | 6 | expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: 128 | настоящий — красный и в рабочей копии | давний | efe19ae9d (280 ч назад) |
| `tests/account_sqlite_lease_patch_activation_v2.test.ts` | 1 | account_sqlite_lease_patch_activation_invalid | настоящий — красный и в рабочей копии | давний | efe19ae9d (280 ч назад) |
| `tests/account_sqlite_lease_patch_v2.test.ts` | 2 | expect(received).toBeGreaterThan(expected) — Expected: > 703 / Received: -1 | настоящий — красный и в рабочей копии | давний | efe19ae9d (280 ч назад) |
| `tests/account_v2_client_tails_6c_v2.test.ts` | 1 | expect(received).toBeLessThan(expected) — Expected: < 300 / Received: 372 | настоящий — красный и в рабочей копии | давний | 76d60287c (263 ч назад) |
| `tests/account_v2_tails_6d_v2.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(null, ack)" / Received string: "void cloudDeleteEnqueueOperation.acknowl | настоящий — красный и в рабочей копии | давний | 76d60287c (263 ч назад) |
| `tests/ai_dialog_home_compact_header_contract.test.mjs` | 1 | The input did not match the regular expression /<V2IconButton icon="chevron-back"/. Input: | настоящий — красный и в рабочей копии | давний | 1395cbf2b (271 ч назад) |
| `tests/android_clipping_crash_guard.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | настоящий — красный и в рабочей копии | давний | ad0c7ed1d (3117 ч назад) |
| `tests/android_no_square_outline_guard.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "" / Received: "Найдены места, где Android нарисует КВАДРАТ вместо скруглённой тени: | настоящий — красный и в рабочей копии | давний | 4c87b45e5 (1839 ч назад) |
| `tests/auth_provider_stable_link.test.ts` | 1 | expect(received).not.toContain(expected) // indexOf — Expected substring: not ": outcome.remoteStableId" / Received string: "if (outcome.kind === 'merged_swap_to_remote') { | настоящий — красный и в рабочей копии | давний | 74da431c8 (171 ч назад) |
| `tests/community_pack_like_owner_fix.test.ts` | 2 | ReferenceError: __DEV__ is not defined | настоящий — красный и в рабочей копии | давний | 7ecb7866f (199 ч назад) |
| `tests/course_pack_download_idempotent_contract.test.ts` | 2 | expect(received).toBeGreaterThan(expected) — Expected: > 0 / Received: 0 | настоящий — красный и в рабочей копии | давний | 14efa1fd2 (1161 ч назад) |
| `tests/course_pack_runtime_contract.test.ts` | 1 | expect(received).toEqual(expected) // deep equality — Expected: ArrayContaining ["studyTarget must be an explicit supported StudyTarget", "sourceLocale must be an explicit normalized SourceLocale", "e | настоящий — красный и в рабочей копии | давний | 2dc1b3f0c (1430 ч назад) |
| `tests/dev_links_r1_contract.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | настоящий — красный и в рабочей копии | свежий | 289ae1dc2 (3 ч назад) |
| `tests/energy_start_cost_contract.test.ts` | 1 | ENOENT: no such file or directory, scandir 'C:\Temp\claude\jest_head\assets\images\energy' | настоящий — красный и в рабочей копии | свежий | 740a1f531 (8 ч назад) |
| `tests/feedback_outbox.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | артефакт среза — в рабочей копии зелёный | давний | 50eea79a4 (1118 ч назад) |
| `tests/firestore_reserved_document_id_guard.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | настоящий — красный и в рабочей копии | давний | b9a257fcb (980 ч назад) |
| `tests/flashcards_blitz_access_behavior.test.ts` | 1 | TypeError: Cannot read properties of undefined (reading 'OS') | настоящий — красный и в рабочей копии | давний | de2a5c40d (166 ч назад) |
| `tests/flashcards_blitz_liquid_glass_source_contract.test.mjs` | 1 | # AssertionError [ERR_ASSERTION]: The input did not match the regular expression /<BlitzGlassSurface radius=\\{16\\} \\/>/. Input: | настоящий — красный и в рабочей копии | свежий | 8123f4a67 (15 ч назад) |
| `tests/flashcards_deck_picker_liquid_glass_source_contract.test.mjs` | 1 | error: \|- | артефакт среза — в рабочей копии зелёный | свежий | 8123f4a67 (15 ч назад) |
| `tests/flashcards_recall_pending_start_behavior.test.ts` | 1 | TypeError: Cannot read properties of undefined (reading 'OS') | настоящий — красный и в рабочей копии | свежий | 7123d6e1d (14 ч назад) |
| `tests/flashcards_speaking_liquid_glass_source_contract.test.mjs` | 1 | Expected values to be strictly deep-equal: | настоящий — красный и в рабочей копии | свежий | 006ace473 (10 ч назад) |
| `tests/flashcards_training_setup_liquid_glass_source_contract.test.mjs` | 1 | Expected values to be strictly deep-equal: | настоящий — красный и в рабочей копии | свежий | 67f5136f5 (4 ч назад) |
| `tests/heisenberg_review_gate.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: 1 | артефакт среза — в рабочей копии зелёный | давний | b86873d57 (2192 ч назад) |
| `tests/home_lesson_progress_single_pass.test.ts` | 25 | ReferenceError: gcSnapshot is not defined | настоящий — красный и в рабочей копии | давний | 8fe6cbfda (247 ч назад) |
| `tests/i18n_missing_en_fallback.test.ts` | 2 | Command failed: C:\Program Files\nodejs\node.exe C:\Temp\claude\jest_head\scripts\scan_direct_lang_index.mjs | артефакт среза — в рабочей копии зелёный | свежий | 1d0187b88 (10 ч назад) |
| `tests/interaction_responsiveness_contract.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "presentation: 'modal', animation: 'none', animationDuration: 0, gestureEnabled: true" / Received string: "// ════════════════════ | настоящий — красный и в рабочей копии | свежий | a8d12d48a (22 ч назад) |
| `tests/jest_write_guard.test.ts` | 2 | expect(received).toBe(expected) // Object.is equality — Expected: true / Received: false | артефакт среза — в рабочей копии зелёный | давний | b62b419ba (171 ч назад) |
| `tests/kimi_voice_capture_session_lifecycle.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "listening" / Received: "idle" | настоящий — красный и в рабочей копии | давний | 71b371dd9 (32 ч назад) |
| `tests/late_listener_adoption_contract.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "const lifetime = createDisposableAdoption();" / Received string: "import { readStoredItem } from './storage_snapshot'; | настоящий — красный и в рабочей копии | давний | 95eec1717 (1722 ч назад) |
| `tests/lesson_intro_liquid_glass_source_contract.test.mjs` | 2 | intro cards keep a glass edge | настоящий — красный и в рабочей копии | давний | 841297d48 (171 ч назад) |
| `tests/lesson1_release_parity.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | настоящий — красный и в рабочей копии | давний | 06143603d (250 ч назад) |
| `tests/lessons_liquid_glass_source_contract.test.mjs` | 1 | header controls use a glass edge | настоящий — красный и в рабочей копии | давний | efe19ae9d (280 ч назад) |
| `tests/lingman_youtube_cache.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "const snapshot = loadedKey === currentRenderKey ? cachedSnapshot : null" / Received string: "import React, { useCallback, useEffe | настоящий — красный и в рабочей копии | давний | e2b7919a1 (166 ч назад) |
| `tests/manage_subscription_liquid_glass_source_contract.test.mjs` | 5 | Expected values to be strictly deep-equal: | настоящий — красный и в рабочей копии | свежий | 960f2de5f (15 ч назад) |
| `tests/manage_subscription_overlays_liquid_glass.test.mjs` | 11 | stub exists for ./dev_vip_override | настоящий — красный и в рабочей копии | свежий | 960f2de5f (15 ч назад) |
| `tests/midnight_flashcards_mode_icon_assets.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | настоящий — красный и в рабочей копии | давний | 0305463cb (1665 ч назад) |
| `tests/olive_phase1_surface_contract.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: ": t.correctText;" / Received string: "import React, { memo } from 'react'; | настоящий — красный и в рабочей копии | давний | 8fe6cbfda (247 ч назад) |
| `tests/overlay_queue_and_pending_alert_contract.test.ts` | 1 | expect(received).toBeLessThan(expected) — Expected: < -1 / Received: 840 | настоящий — красный и в рабочей копии | свежий | 1e18abc35 (5 ч назад) |
| `tests/paywall_store_promo_price_contract.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "yearlyPromo?.promoPriceString \|\| yearlyPrice" / Received string: "// ══════════════════════════════════════════════════════════ | настоящий — красный и в рабочей копии | давний | 60155883a (279 ч назад) |
| `tests/personal_admin_message_liquid_glass_source_contract.test.mjs` | 1 | The input did not match the regular expression /backgroundColor: glass\.opaqueSheet, borderColor: glass\.glassEdge/. Input: | настоящий — красный и в рабочей копии | давний | f2b44de62 (294 ч назад) |
| `tests/phone_state_native_config_contract.test.ts` | 2 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\android\app\src\main\res\xml\backup_rules.xml' | артефакт среза — в рабочей копии зелёный | давний | efe19ae9d (280 ч назад) |
| `tests/premium_modal_admin_grant_contract.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "await initRevenueCat(isOperationAccountCurrent);" / Received string: "const handlePurchase = useCallback(async () => { | настоящий — красный и в рабочей копии | давний | 075eff627 (195 ч назад) |
| `tests/premium_modal_locale.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "<ActivityIndicator color={g.ctaInk} />" / Received string: "// ══════════════════════════════════════════════════════════════════ | настоящий — красный и в рабочей копии | давний | 60155883a (279 ч назад) |
| `tests/privacy_settings_liquid_glass_source_contract.test.mjs` | 1 | 3426bd9295c45c238c6b6675cad20670491961cd17ce0541347eb5e2b456df4f survives exactly once | настоящий — красный и в рабочей копии | свежий | 9aec0daa5 (10 ч назад) |
| `tests/release_guard_staged_source.test.mjs` | 1 | error: \|- | артефакт среза — в рабочей копии зелёный | свежий | 015941e15 (18 ч назад) |
| `tests/render_daily_phrase_content_preview.test.mjs` | 1 | Expected values to be strictly equal: | настоящий — красный и в рабочей копии | свежий | e2a74ef30 (22 ч назад) |
| `tests/results_coins_profile_liquid_glass_source_contract.test.mjs` | 1 | error: \|- | артефакт среза — в рабочей копии зелёный | свежий | 2624a4d14 (21 ч назад) |
| `tests/rune_balance_snapshot_preservation_contract.test.ts` | 1 | Command failed: git grep -l patchAppSnapshot -- app components hooks modules | артефакт среза — в рабочей копии зелёный | давний | 589d11248 (30 ч назад) |
| `tests/scroll_inertia_contract.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | настоящий — красный и в рабочей копии | давний | 50eea79a4 (1118 ч назад) |
| `tests/settings_edu_liquid_glass.test.mjs` | 1 | The input did not match the regular expression /void loadSettings\(\)\.then\(setS\)/. Input: | настоящий — красный и в рабочей копии | свежий | 8798b920e (15 ч назад) |
| `tests/settings_promo_startup_stability.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "import { primeRemoteConfigCacheFromStorage } from './remote_config_client';" / Received string: "import { isForcedOnboardingForQa | настоящий — красный и в рабочей копии | давний | 62c7b2fc4 (203 ч назад) |
| `tests/shared_decision_modals_liquid_glass_source_contract.test.mjs` | 1 | The input did not match the regular expression /paddingBottom: bottomSheet \? 0 : Math\.max\(24, insets\.bottom, keyboardInset\)/. Input: | настоящий — красный и в рабочей копии | давний | efe19ae9d (280 ч назад) |
| `tests/single_workspace_runtime_contract.test.mjs` | 1 | error: \|- | артефакт среза — в рабочей копии зелёный | давний | 6ffd00679 (1432 ч назад) |
| `tests/spire_local_release_packet_evidence.test.mjs` | 1 | error: \|- | артефакт среза — в рабочей копии зелёный | свежий | 1c304d53e (22 ч назад) |
| `tests/spire_oddity_prompt.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\functions\src\generated\spire_multilingual_es.json' | артефакт среза — в рабочей копии зелёный | свежий | 56ade0818 (11 ч назад) |
| `tests/stable_id.test.ts` | 1 | TypeError: release is not a function | настоящий — красный и в рабочей копии | давний | ebc1a860d (190 ч назад) |
| `tests/startup_settings_boot_integration.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "closeStartupSettingsReadScope?.();" / Received string: "effectDisposed = true; | настоящий — красный и в рабочей копии | давний | c121457eb (31 ч назад) |
| `tests/support_report_liquid_glass_source_contract.test.mjs` | 3 | Cannot read properties of undefined (reading 'isSupportDiagnosticsEnabled') | настоящий — красный и в рабочей копии | свежий | 647e673c1 (11 ч назад) |
| `tests/survey_unavailable_liquid_glass_source_contract.test.mjs` | 1 | app/account_generation.ts | настоящий — красный и в рабочей копии | свежий | 10da25d42 (14 ч назад) |
| `tests/tab_freeze_handoff_contract.test.ts` | 2 | TabPane source boundary not found | настоящий — красный и в рабочей копии | давний | 721eb6ee9 (171 ч назад) |
| `tests/theme_hardcoded_colors_ratchet.test.mjs` | 1 | новые захардкоженные цвета: [["app/dev_state.tsx",3],["modules/learning-v2/modes/mode_feedback_v1.tsx",5]] — берите токены темы (g.text, g.opaqueCard, g.hairlineSoft, g.mediaInk…) или поставьте «// th | настоящий — красный и в рабочей копии | давний | e6f65dbbf (35 ч назад) |
| `tests/use_mistake_explain_bundle_state.test.ts` | 1 | ReferenceError: __DEV__ is not defined | настоящий — красный и в рабочей копии | свежий | c41c8c0fe (21 ч назад) |
| `tests/video_pack_add_maps_to_community_doc.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "Этот набор пока нельзя добавить себе." / Received string: "/** | настоящий — красный и в рабочей копии | свежий | 8e8fe95a8 (20 ч назад) |
| `tests/visual_parity_gate.test.mjs` | 1 | Expected values to be strictly equal: | настоящий — красный и в рабочей копии | свежий | ed004fbbf (3 ч назад) |
| `tests/website_global_background_contract.test.ts` | 2 | expect(received).toHaveLength(expected) — Expected length: 27 / Received length: 28 | настоящий — красный и в рабочей копии | давний | 3486c0d80 (30 ч назад) |

## Codex — прочие (106 файлов, 336 тестов)

Зона Codex (Learning V2, factory_native, курс и соседние): не перепроверялись — передаются списком.

| Файл | Тестов | Причина (первая) | Свежий/давний |
|---|---|---|---|
| `tests/gustav_ai_prompt_contract_v2_packet.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\audits\ai_prompt_contract_v2_packet.json' | давний |
| `tests/gustav_content_quality_gates_v2_packet.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\audits\content_quality_gates_v2_packet.json' | давний |
| `tests/gustav_flashcard_pack_generator_contract.test.ts` | 3 | Command failed: node scripts/gustav_build_flashcard_pack_generator_contract.mjs | давний |
| `tests/gustav_fr_daily_phrase_admin_workflow_handlers.test.ts` | 3 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-07-04_fr_daily_phrases_production_v1\build\fr_daily_phrase_bank.json' | давний |
| `tests/gustav_fr_daily_phrase_production_v1_gate.test.ts` | 2 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-07-04_fr_daily_phrases_production_v1\build\fr_daily_phrase_bank.json' | давний |
| `tests/gustav_fr_daily_phrase_runtime_pack_adapter.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-07-04_fr_daily_phrases_production_v1\build\fr_daily_phrase_runtime_payload_ru.dryrun.json' | давний |
| `tests/gustav_french_app_surface_parity_v2_packet.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_french_curriculum_contract.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "shouldBlockLessonAccess(lessonId, studyTarget)" / Received string: "import AsyncStorage from '@react-native-async-storage/async-s | давний |
| `tests/gustav_french_daily_phrase_target_gate.test.ts` | 1 | expect(received).toBeTruthy() — Received: undefined | давний |
| `tests/gustav_french_dev_surface_parity.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\GUSTAV_BRAIN.md' | давний |
| `tests/gustav_french_lesson_runtime_source_gate.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "const frenchRemoteLessonRequired = frenchStudyActive(studyTarget) && !isPlanPhraseLessonTask" / Received string: "import Ionicons | давний |
| `tests/gustav_french_notifications_target_isolation.test.ts` | 3 | expect(received).toContain(expected) // indexOf — Expected substring: "AsyncStorage.getItem('user_total_xp')" / Received string: "// notifications.ts | давний |
| `tests/gustav_french_remote_verify_command_rehearsal_v2_packet.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_french_remote_verify_dry_run_readiness_v2_packet.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_french_remote_verify_live_handoff_v2_packet.test.ts` | 2 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_french_runtime_content_integrity_audit.test.ts` | 2 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\audits\french_runtime_content_integrity_audit.json' | давний |
| `tests/gustav_french_runtime_registration_server_layout_v2_packet.test.ts` | 2 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\pack_candidates\fr\server_delivery_manifest_v2.json' | давний |
| `tests/gustav_french_server_object_remote_verify_v2_packet.test.ts` | 14 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\pack_candidates\fr\server_delivery_manifest_v2_draft.json' | давний |
| `tests/gustav_french_server_pack_upload_evidence_v2_packet.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_french_server_pack_upload_execution_gate_v2_packet.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_french_upload_remote_verify_parity_v2_packet.test.ts` | 3 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_french_vocabulary_target_gate.test.ts` | 3 | expect(received).toContain(expected) // indexOf — Expected substring: "shouldBlockLessonAccess(lessonId, studyTarget)" / Received string: "import KitProgressFill from '../components/KitProgressFill'; | давний |
| `tests/gustav_lesson_runtime_target_isolation.test.ts` | 3 | expect(received).toContain(expected) // indexOf — Expected substring: "const SYNC_STUDY_TARGETS = ['en', 'fr'] as const" / Received string: "// ════════════════════════════════════════════════════════ | давний |
| `tests/gustav_onboarding_server_prefetch_contract_v2_packet.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "PASS" / Received: "BLOCK" | давний |
| `tests/gustav_production_server_manifest_local_promotion_v2_packet.test.ts` | 2 | ENOENT: no such file or directory, copyfile 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\pack_candidates\fr\server_delivery_manifest_v2_draft.json' -> 'C:\Temp\gustav-local- | давний |
| `tests/gustav_production_server_manifest_publish_gate_v2_packet.test.ts` | 3 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\pack_candidates\fr\server_delivery_manifest_v2_draft.json' | давний |
| `tests/gustav_runtime_cache_integrity_rollback_v2_packet.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\audits\runtime_cache_integrity_rollback_v2_packet.json' | давний |
| `tests/gustav_runtime_download_activation_gate_v2_packet.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\audits\runtime_download_activation_gate_v2.json' | давний |
| `tests/gustav_runtime_server_delivery_contract_v2_packet.test.ts` | 2 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\runs\2026-05-19_fr_inventory_v0a1\audits\runtime_server_delivery_contract_v2_packet.json' | давний |
| `tests/gustav_surface_target_switch.test.ts` | 4 | expect(received).toEqual(expected) // deep equality | давний | **Ядру (Авторизация 12.10, a4dd58182):** устаревший — ждёт «в проде только английский» (en; fr/es dev-only), а продовый список языков давно шире (D129/D130); падает и без варианта А (проверено снятием патча). Переписать ожидания под таблицу готовности или удалить. |
| `tests/gustav_target_content_builders_contract.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\GUSTAV_TARGET_CONTENT_BUILDERS_CONTRACT.md' | давний |
| `tests/gustav_trusted_brain_contract.test.ts` | 1 | ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\docs\gustav\GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md' | давний |
| `tests/gustav_validator_p1a_stale_preapply.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: 1 | давний |
| `tests/learning_v2_activity_post_terminal_card_catalog_v1.test.ts` | 3 | learning_v2_post_terminal_card_meanings_invalid | давний |
| `tests/learning_v2_activity_released_session_submission_spool_v2.test.ts` | 2 | learning_v2_activity_released_session_submission_invalid | давний |
| `tests/learning_v2_all_ready_tasks_runtime_audit.test.ts` | 1 | assert.strictEqual(received, expected) — Received: | давний |
| `tests/learning_v2_authored_sessions_reach_the_player.test.ts` | 2 | expect(received).toBe(expected) // Object.is equality — Expected: 14 / Received: 13 | давний, вне R1 (только превью), не регрессия 13.10 — разбор 130488c8a, задача PM-293 (после R1, владелец LV2) |
| `tests/learning_v2_bootstrap_audio_seed_v1.test.ts` | 2 | expect(jest.fn()).toHaveBeenCalledWith(...expected) — Expected: [101] | давний |
| `tests/learning_v2_chapters_contract.test.mjs` | 1 | # AssertionError [ERR_ASSERTION]: the active chapter view must retain a locally selected lesson | давний |
| `tests/learning_v2_content_quality_gate_wiring.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1" / Received string: "// зачем: недостающее звено между авторским текстом и приложе | давний |
| `tests/learning_v2_course_lesson_audio_release_index_v1.test.ts` | 2 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_course_session_audio_preload_v1.test.ts` | 2 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_course_session_audio_readback_v1.test.ts` | 2 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_course_session_audio_release_extension_v1.test.ts` | 2 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_course_session_completed_spool_v1.test.ts` | 2 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_course_session_save_card_v1.test.ts` | 1 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_e1_content_compiler.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: true / Received: false | давний |
| `tests/learning_v2_english_l4_curriculum_contract.test.ts` | 1 | ● Test suite failed to run | свежий |
| `tests/learning_v2_episode_01_session_01_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "owner-word-first-rewrite-e01-s01-v1" | давний |
| `tests/learning_v2_episode_01_session_02_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "owner-mode-native-rewrite-e01-s02-v2" | давний |
| `tests/learning_v2_episode_01_session_03_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "owner-full-b1-e01-s03-v2" | давний |
| `tests/learning_v2_episode_01_session_04_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "full-b1-exact-i-am-states-e01-s04-v2" | давний |
| `tests/learning_v2_episode_01_session_05_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "full-b1-exact-i-am-temperature-e01-s05-v2" | давний |
| `tests/learning_v2_episode_01_session_06_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "full-b1-exact-i-am-feelings-e01-s06-v2" | давний |
| `tests/learning_v2_episode_01_session_07_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "full-b1-exact-i-am-voice-emotions-e01-s07-v2" | давний |
| `tests/learning_v2_episode_01_session_09_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "full-b1-exact-he-she-it-is-e01-s09-v2" | давний |
| `tests/learning_v2_episode_01_session_10_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09" / Received: "full-b1-exact-i-am-he-she-it-is-e01-s10-v2" | давний |
| `tests/learning_v2_episode_01_session_11_source.test.ts` | 8 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 4 | давний |
| `tests/learning_v2_episode_01_session_12_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 4 | давний |
| `tests/learning_v2_episode_01_session_13_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 6 | давний |
| `tests/learning_v2_episode_01_session_14_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 6 | давний |
| `tests/learning_v2_episode_01_session_15_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 6 | давний |
| `tests/learning_v2_episode_01_session_16_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: 5 / Received: 3 | давний |
| `tests/learning_v2_episode_01_session_17_source.test.ts` | 10 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_session_18_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_session_19_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_session_20_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_session_21_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_session_22_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_session_23_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_session_24_source.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: 5 / Received: 3 | давний |
| `tests/learning_v2_episode_01_session_map.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: false / Received: true | давний |
| `tests/learning_v2_episode_01_sessions_25_32_source.test.ts` | 12 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_sessions_33_40_intro_data.test.ts` | 1 | expect(received).not.toMatch(expected) — Expected pattern: not /сесси\|урок\|курс\|previous\|next\|lesson\|course\|already\|familiar/iu / Received string: "Ves a una mujer en una foto, pero no sabes q | давний |
| `tests/learning_v2_episode_01_sessions_33_40_source.test.ts` | 4 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_sessions_41_48_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_sessions_49_56_source.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 15 / Received length: 9 | давний |
| `tests/learning_v2_episode_01_to_be_only.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: "" / Received: "«copula_be»: сессии 1 и 9 | давний |
| `tests/learning_v2_es_bundle_reachability_guard.test.ts` | 1 | expect(received).toBeGreaterThan(expected) — Expected: > 0 / Received: 0 | давний |
| `tests/learning_v2_factory_native_projection_v1.test.ts` | 1 | assert.strictEqual(received, expected) — Received: | давний |
| `tests/learning_v2_factory_production_audio_contract.test.ts` | 1 | assert(received) — Received: | давний |
| `tests/learning_v2_generator_course_manifest.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 256 / Received length: 288 | давний |
| `tests/learning_v2_generator_session_shard.test.ts` | 5 | learning_v2_session_shard_fields_invalid | давний |
| `tests/learning_v2_intro_colour_bridge.test.ts` | 2 | expect(received).toBe(expected) // Object.is equality — Expected: "targetWrong" / Received: "plain" | давний |
| `tests/learning_v2_intro_reader_fixture_contract.test.ts` | 1 | expect(received).toContain(expected) // indexOf — Expected substring: "!DEV_MODE && !ENABLE_DEV_TOOLS" / Received string: "import { Redirect, useLocalSearchParams } from \"expo-router\"; | давний |
| `tests/learning_v2_intro_semantic_runs_contract.test.ts` | 2 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_intro_theme_contract.test.ts` | 1 | expect(received).toEqual(expected) // deep equality | давний |
| `tests/learning_v2_lesson_map_screen_contract.test.ts` | 1 | ● Test suite failed to run | давний |
| `tests/learning_v2_lesson1_bundle_builds.test.ts` | 130 | expect(received).toEqual(expected) // deep equality | давний |
| `tests/learning_v2_lesson1_chapter_gate.test.ts` | 2 | expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: 1 | давний |
| `tests/learning_v2_lesson1_real_session_mock.test.ts` | 1 | expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: 1 | давний |
| `tests/learning_v2_lexical_density_policy_v2.test.ts` | 1 | ● Test suite failed to run | свежий |
| `tests/learning_v2_listen_choose_option_label_v1.test.ts` | 1 | ● Test suite failed to run | давний |
| `tests/learning_v2_mistake_loop.test.ts` | 1 | ● Test suite failed to run | давний |
| `tests/learning_v2_mockup_readiness_evidence.test.mjs` | 1 | error: 'missing embedded JSON script #session-readiness' | свежий |
| `tests/learning_v2_mockup_session_quality.test.mjs` | 1 | error: 'missing embedded JSON script #session-audio-evidence' | свежий |
| `tests/learning_v2_neutral_qa_hostile_red_matrix_v1.test.ts` | 8 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_neutral_qa_session_e2e_harness_v1.test.ts` | 10 | learning_v2_course_session_client_child_invalid | давний |
| `tests/learning_v2_new_word_encounter_projection_v1.test.ts` | 2 | expect(received).toBe(expected) // Object.is equality — Expected: 198 / Received: 200 | давний |
| `tests/learning_v2_new_word_encounter_save_v1.test.ts` | 1 | SyntaxError: Unexpected token 'e', "test-uuid-1" is not valid JSON | давний |
| `tests/learning_v2_p0_p1_smoke.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 12 / Received length: 56 | давний |
| `tests/learning_v2_remote_audio_pack_contract.test.ts` | 1 | assert.deepStrictEqual(received, expected) — Received: | давний |
| `tests/learning_v2_session_compiler.test.ts` | 1 | expect(received).toHaveLength(expected) — Expected length: 12 / Received length: 56 | давний |
| `tests/learning_v2_session_contract.test.ts` | 1 | expect(received).toMatchObject(expected) | давний |
| `tests/learning_v2_session_skip_interaction.test.ts` | 1 | SyntaxError: Unexpected token 'export' | давний |
| `tests/learning_v2_voice_physical_device_runner_v1.test.ts` | 2 | expect(jest.fn()).toHaveBeenCalledTimes(expected) | давний |

## Codex — gustav: 132 файлов, одна причина

Все падают на чтении `docs/gustav/generated/**`: папка `docs/gustav/*` в `.gitignore` (строка 269) и отсутствует даже в рабочей копии — значит, красные везде, не артефакт среза. Нужно решение Codex: вернуть генерацию/файлы или пометить эти сторожа как требующие сгенерированных данных (пропуск, если папки нет).

`gustav_admin_website_parity_atlas.test.ts`, `gustav_builder_work_orders.test.ts`, `gustav_core_lessons_scope_sequence_work_order.test.ts`, `gustav_core_lessons_sequence_reconciliation.test.ts`, `gustav_english_blueprint_extractor.test.ts`, `gustav_english_lesson_surgical_blueprint.test.ts`, `gustav_feature_parity_matrix.test.ts`, `gustav_fr_activation_completion_audit_v2.test.ts`, `gustav_fr_admin_activation_rollback_gate.test.ts`, `gustav_fr_admin_equivalence_matrix.test.ts`, `gustav_fr_admin_global_readiness_bridge_gate.test.ts`, `gustav_fr_admin_parity_isolation_gate.test.ts`, `gustav_fr_admin_source_locale_write_contract.test.ts`, `gustav_fr_admin_write_path_isolation_gate.test.ts`, `gustav_fr_ai_prompt_parity_gate.test.ts`, `gustav_fr_app_level_parity_gate.test.ts`, `gustav_fr_blueprint_surface_parity.test.ts`, `gustav_fr_collectible_candidate_bridge_gate.test.ts`, `gustav_fr_collectible_cards_v1.test.ts`, `gustav_fr_conjugation_drill_gate.test.ts`, `gustav_fr_core_lesson_delivery_closeout_bridge_gate.test.ts`, `gustav_fr_daily_phrase_global_readiness_bridge_gate.test.ts`, `gustav_fr_flashcard_global_readiness_bridge_gate.test.ts`, `gustav_fr_full_surface_closeout_work_order.test.ts`, `gustav_fr_grammar_drill_global_readiness_bridge_gate.test.ts`, `gustav_fr_legacy_seed_quarantine_gate.test.ts`, `gustav_fr_lesson_audio_checksum_gate.test.ts`, `gustav_fr_lesson_audio_manifest_gate.test.ts`, `gustav_fr_lesson_audio_tts_batch_plan.test.ts`, `gustav_fr_lesson_cefr_reclassification_plan.test.ts`, `gustav_fr_lesson_correction_candidate_review_decision_schema_gate.test.ts`, `gustav_fr_lesson_correction_candidate_review_external_handoff.test.ts`, `gustav_fr_lesson_correction_candidate_review_import_dry_run.test.ts`, `gustav_fr_lesson_correction_candidate_review_requests.test.ts`, `gustav_fr_lesson_correction_candidate_work_order.test.ts`, `gustav_fr_lesson_decision_import_source_gate.test.ts`, `gustav_fr_lesson_decision_staging_gate.test.ts`, `gustav_fr_lesson_hash_lock_materialization_contract.test.ts`, `gustav_fr_lesson_hash_lock_writer_dry_run_gate.test.ts`, `gustav_fr_lesson_llm_review_batch_plan.test.ts`, `gustav_fr_lesson_llm_review_decision_progress_gate.test.ts`, `gustav_fr_lesson_llm_review_decision_schema_gate.test.ts`, `gustav_fr_lesson_llm_review_execution_readiness_gate.test.ts`, `gustav_fr_lesson_llm_review_execution_runner.test.ts`, `gustav_fr_lesson_llm_review_external_handoff.test.ts`, `gustav_fr_lesson_llm_review_launch_contract.test.ts`, `gustav_fr_lesson_llm_review_live_handoff.test.ts`, `gustav_fr_lesson_llm_review_partial_quarantine_gate.test.ts`, `gustav_fr_lesson_llm_review_requests.test.ts`, `gustav_fr_lesson_manifest_rewrite_hash_lock_gate.test.ts`, `gustav_fr_lesson_manifest_writer_apply_boundary_gate.test.ts`, `gustav_fr_lesson_missing_review_batch_work_order.test.ts`, `gustav_fr_lesson_non_accepted_fix_work_order.test.ts`, `gustav_fr_lesson_non_accepted_rows_gate.test.ts`, `gustav_fr_lesson_rebuild_candidate.test.ts`, `gustav_fr_lesson_review_decision_import_dry_run.test.ts`, `gustav_fr_lesson_review_materialized_integrity_gate.test.ts`, `gustav_fr_lesson_review_outcome_routing_gate.test.ts`, `gustav_fr_lesson_review_queue.test.ts`, `gustav_fr_lesson_review_route_materialization_gate.test.ts`, `gustav_fr_lesson_runtime_delivery_gate.test.ts`, `gustav_fr_lesson_server_pack_manifest_gate.test.ts`, `gustav_fr_lesson_server_payload_materialization_gate.test.ts`, `gustav_fr_lesson_server_upload_evidence_gate.test.ts`, `gustav_fr_lesson_server_upload_policy_gate.test.ts`, `gustav_fr_lesson01_audio_tts_manifest_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_candidate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_pack_draft.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_payload_hash_lock_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_review_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_rollback_manifest_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_runtime_delivery_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_server_pack_manifest_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_server_upload_evidence_gate.test.ts`, `gustav_fr_lesson01_blueprint_rebuild_theory_vocab_pack.test.ts`, `gustav_fr_lesson01_integrity_gate.test.ts`, `gustav_fr_lesson01_pack_candidate.test.ts`, `gustav_fr_lesson01_review_draft_llm_decision_gate.test.ts`, `gustav_fr_lesson01_review_draft_llm_decisions_codex.test.ts`, `gustav_fr_lesson01_review_draft_llm_packet.test.ts`, `gustav_fr_lesson01_review_draft.test.ts`, `gustav_fr_lesson01_theory_materialization.test.ts`, `gustav_fr_lesson02_blueprint_rebuild_pack.test.ts`, `gustav_fr_lesson02_delivery_gate_chain.test.ts`, `gustav_fr_lesson02_next_pass_work_order.test.ts`, `gustav_fr_lesson02_review_draft.test.ts`, `gustav_fr_lesson02_review_pipeline.test.ts`, `gustav_fr_lesson03_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson04_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson05_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson06_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson07_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson08_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson09_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson10_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson11_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson12_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson13_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson14_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson15_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson16_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson17_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson18_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson19_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson20_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson21_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson22_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson23_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson24_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson25_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson26_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson27_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson28_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson29_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson30_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson31_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_lesson32_blueprint_rebuild_with_delivery.test.ts`, `gustav_fr_non_lesson_surface_backlog_gate.test.ts`, `gustav_fr_personal_practice_mistake_taxonomy_candidate.test.ts`, `gustav_fr_personal_practice_mistake_taxonomy_review_chain.test.ts`, `gustav_fr_personal_practice_mistake_taxonomy_review_requests.test.ts`, `gustav_fr_personal_practice_native_bank_candidate.test.ts`, `gustav_fr_personal_practice_native_bank_review_chain.test.ts`, `gustav_fr_personal_practice_native_bank_review_requests.test.ts`, `gustav_fr_preposition_drill_gate.test.ts`, `gustav_fr_storage_cloud_isolation_bridge_gate.test.ts`, `gustav_fr_surgical_lesson_work_order.test.ts`, `gustav_fr_theory_vocab_intro_parity_gate.test.ts`, `gustav_research_best_practices_work_order.test.ts`

## Все красные тесты наших зон поимённо

- `tests/account_provision_lock_android_runtime_entrypoint.test.ts` — настоящий — красный и в рабочей копии
  - Android Account V2 provision-lock entrypoint and host runner keeps tracked fixtures complete while generated Android tar — expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: 128
  - Android Account V2 provision-lock entrypoint and host runner runner fails closed when packet-owned sources are untracked — expect(received).toBe(expected) // Object.is equality — Expected: true / Received: false
  - Android Account V2 provision-lock entrypoint and host runner launcher maps malformed child output to a fixed generic san — expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: null
  - Android Account V2 provision-lock entrypoint and host runner launcher maps unknown child output to a fixed generic sanit — expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: null
  - Android Account V2 provision-lock entrypoint and host runner launcher maps hostile child output to a fixed generic sanit — expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: null
  - Android Account V2 provision-lock entrypoint and host runner launcher accepts one canonical allowlisted child failure an — expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: null
- `tests/account_sqlite_lease_patch_activation_v2.test.ts` — настоящий — красный и в рабочей копии
  - Expo SQLite account-lease patch activation activates the exact candidate bytes at the one approved patch-package path — account_sqlite_lease_patch_activation_invalid
- `tests/account_sqlite_lease_patch_v2.test.ts` — настоящий — красный и в рабочей копии
  - Expo SQLite 16.0.10 account lease patch source conformance only adds a canonical cross-process provision lock with retai — expect(received).toBeGreaterThan(expected) — Expected: > 703 / Received: -1
  - Expo SQLite 16.0.10 account lease patch source conformance only source guards reject weakened provision lock admission a — expect(received).not.toBe(expected) // Object.is equality — Expected: not "// Copyright 2015-present 650 Industries. All rights reserved.·
- `tests/account_v2_client_tails_6c_v2.test.ts` — настоящий — красный и в рабочей копии
  - account v2 client tails 6C auth flow: key read/created with the lock operationId and cleared once the server accepted — expect(received).toBeLessThan(expected) — Expected: < 300 / Received: 372
- `tests/account_v2_tails_6d_v2.test.ts` — настоящий — красный и в рабочей копии
  - account v2 tails 6D (P3 of review 6C) (в) anonymous deletion clears the V2 key only on a SUCCESSFUL ack auth flow: the a — expect(received).toContain(expected) // indexOf — Expected substring: "clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled(null, ack)" / Received string: "void cloudDeleteEnqu
- `tests/ai_dialog_home_compact_header_contract.test.mjs` — настоящий — красный и в рабочей копии
  - dialogue hub keeps back, title and live energy in one safe-area header row — The input did not match the regular expression /<V2IconButton icon="chevron-back"/. Input:
- `tests/android_clipping_crash_guard.test.ts` — настоящий — красный и в рабочей копии
  - Android clipping crash guard keeps app-owned virtualized lists out of ReactClippingViewManager — expect(received).toEqual(expected) // deep equality
- `tests/android_no_square_outline_guard.test.ts` — настоящий — красный и в рабочей копии
  - Android: нет квадратных outline вокруг скруглённых элементов ни один элемент со скруглением не использует elevation без — expect(received).toBe(expected) // Object.is equality — Expected: "" / Received: "Найдены места, где Android нарисует КВАДРАТ вместо скруглённой тени:
- `tests/auth_provider_stable_link.test.ts` — настоящий — красный и в рабочей копии
  - auth provider stable-id linking remote stable-id swap never adopts a fallback owner after merge timeout or pending reser — expect(received).not.toContain(expected) // indexOf — Expected substring: not ": outcome.remoteStableId" / Received string: "if (outcome.kind === 'merged_swap_to_remote') {
- `tests/community_pack_like_owner_fix.test.ts` — настоящий — красный и в рабочей копии
  - причина 1: правило «лайк после добавления» видит факт добавления на любой цели цели не смешиваются: добавление на fr не — ReferenceError: __DEV__ is not defined
  - причина 1: правило «лайк после добавления» видит факт добавления на любой цели английская цель работает как раньше — ReferenceError: __DEV__ is not defined
- `tests/course_pack_download_idempotent_contract.test.ts` — настоящий — красный и в рабочей копии
  - course pack download is idempotent передаёт idempotent:true — иначе повторная загрузка падает — expect(received).toBeGreaterThan(expected) — Expected: > 0 / Received: 0
  - course pack download is idempotent ПОВТОРНАЯ сборка пака проходит, когда index.json уже на диске — expect(received).toBe(expected) // Object.is equality — Expected: "ready" / Received: "manifest_invalid"
- `tests/course_pack_runtime_contract.test.ts` — настоящий — красный и в рабочей копии
  - course pack runtime contract fails closed for unknown language dimensions and unsafe manifest paths — expect(received).toEqual(expected) // deep equality — Expected: ArrayContaining ["studyTarget must be an explicit supported StudyTarget", "sourceLocale must be an explicit normaliz
- `tests/dev_links_r1_contract.test.ts` — настоящий — красный и в рабочей копии
  - DEV_LINKS_R1 «уникальна: да» rows have a ready link; their «тапы» use only the known step grammar; the table keeps 8 col — expect(received).toEqual(expected) // deep equality
- `tests/energy_start_cost_contract.test.ts` — настоящий — красный и в рабочей копии
  - numeric energy v2 contract keeps the vector energy icon without an image asset — ENOENT: no such file or directory, scandir 'C:\Temp\claude\jest_head\assets\images\energy'
- `tests/feedback_outbox.test.ts` — артефакт среза — в рабочей копии зелёный
  - general feedback outbox delivery receipt serializes mount flush and enqueue so a delayed dequeue cannot erase the new ro — expect(received).toEqual(expected) // deep equality
- `tests/firestore_reserved_document_id_guard.test.ts` — настоящий — красный и в рабочей копии
  - Firestore reserved document ids в .doc() не передаётся зарезервированный литерал — expect(received).toEqual(expected) // deep equality
- `tests/flashcards_blitz_access_behavior.test.ts` — настоящий — красный и в рабочей копии
  - (набор не запустился) — TypeError: Cannot read properties of undefined (reading 'OS')
- `tests/flashcards_blitz_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - tests\\flashcards_blitz_liquid_glass_source_contract.test.mjs — # AssertionError [ERR_ASSERTION]: The input did not match the regular expression /<BlitzGlassSurface radius=\\{16\\} \\/>/. Input:
- `tests/flashcards_deck_picker_liquid_glass_source_contract.test.mjs` — артефакт среза — в рабочей копии зелёный
  - protects pre-edit business, classic, default tile, and dependency contracts — error: \|-
- `tests/flashcards_recall_pending_start_behavior.test.ts` — настоящий — красный и в рабочей копии
  - (набор не запустился) — TypeError: Cannot read properties of undefined (reading 'OS')
- `tests/flashcards_speaking_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - keeps the quota, attempt, hold, TTS, flight, and result runtime AST unchanged — Expected values to be strictly deep-equal:
- `tests/flashcards_training_setup_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - business AST and shared dependencies stay at the pre-edit baseline — Expected values to be strictly deep-equal:
- `tests/heisenberg_review_gate.test.ts` — артефакт среза — в рабочей копии зелёный
  - Heisenberg human review gate apply dry-run reports and rejects a machine-only GO ledger — expect(received).toBe(expected) // Object.is equality — Expected: 0 / Received: 1
- `tests/home_lesson_progress_single_pass.test.ts` — настоящий — красный и в рабочей копии
  - Home lesson progress: same results without repeated processing parses each stored lesson only once, including the select — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing counts correct answers without allocating filtered arrays — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps the selected lesson at zero for absent/invalid prog — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing preserves the 45-answer threshold, replay answers, exact — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing retains all lesson indices and one ordered storage batch — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing retains all lesson indices and one ordered storage batch — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps an invalid last id null absent without calling the — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps an invalid last id "" absent without calling the re — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps an invalid last id "0" absent without calling the r — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps an invalid last id "-1" absent without calling the — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps an invalid last id "33" absent without calling the — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps an invalid last id "NaN" absent without calling the — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing keeps completion before the resolver and last-lesson publ — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing preserves the selected lesson and warning when its resolv — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing does not cache old progress between successive loads — ReferenceError: gcSnapshot is not defined
  - Home lesson progress: same results without repeated processing leaves storage failures to the existing outer loadData ha — + ReferenceError {}
  - Home lesson progress: same results without repeated processing preserves the existing mounted guards for absent last les — ReferenceError: gcSnapshot is not defined
- `tests/i18n_missing_en_fallback.test.ts` — артефакт среза — в рабочей копии зелёный
  - no unguarded direct reads of a language dictionary that lacks `en` scan_direct_lang_index finds no new unguarded reads — Command failed: C:\Program Files\nodejs\node.exe C:\Temp\claude\jest_head\scripts\scan_direct_lang_index.mjs
  - dictionaries without an English key never grow scan_missing_en_dictionaries passes against config/missing-en-baseline.js — Command failed: C:\Program Files\nodejs\node.exe C:\Temp\claude\jest_head\scripts\scan_missing_en_dictionaries.mjs
- `tests/interaction_responsiveness_contract.test.ts` — настоящий — красный и в рабочей копии
  - instant interaction response contract production navigation cannot re-enable animated route transitions — expect(received).toContain(expected) // indexOf — Expected substring: "presentation: 'modal', animation: 'none', animationDuration: 0, gestureEnabled: true" / Received string: "// 
- `tests/jest_write_guard.test.ts` — артефакт среза — в рабочей копии зелёный
  - Jest source write guard blocks tests from writing into application source files — expect(received).toBe(expected) // Object.is equality — Expected: true / Received: false
  - Jest source write guard blocks inherited Node child processes from writing into source files — expect(received).toBe(expected) // Object.is equality — Expected: 19 / Received: 0
- `tests/kimi_voice_capture_session_lifecycle.test.ts` — настоящий — красный и в рабочей копии
  - Kimi voice capture session lifecycle accepts final callbacks after stop for the current session but ignores queued callb — expect(received).toBe(expected) // Object.is equality — Expected: "listening" / Received: "idle"
- `tests/late_listener_adoption_contract.test.ts` — настоящий — красный и в рабочей копии
  - late async listeners are adopted through a disposable owner — expect(received).toContain(expected) // indexOf — Expected substring: "const lifetime = createDisposableAdoption();" / Received string: "import { readStoredItem } from './storage_s
- `tests/lesson_intro_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - lesson intro C1–C3 uses the active Liquid Glass material while preserving its real reveal flow — intro cards keep a glass edge
  - intro derives contrast and tangible glass layers from the rendered Liquid palette — glass borders have a visible positive hairline width
- `tests/lesson1_release_parity.test.ts` — настоящий — красный и в рабочей копии
  - lesson 1 release parity (D150) reads the bundled release signature of lesson 1 session 1 — expect(received).toEqual(expected) // deep equality
- `tests/lessons_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - legacy lesson list resolves the active Liquid Glass theme above its real list data — header controls use a glass edge
- `tests/lingman_youtube_cache.test.ts` — настоящий — красный и в рабочей копии
  - Lingman snapshot cache screen masks account/channel changes and updates cached unread — expect(received).toContain(expected) // indexOf — Expected substring: "const snapshot = loadedKey === currentRenderKey ? cachedSnapshot : null" / Received string: "import React, { 
- `tests/manage_subscription_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - protects all 21 payment/account/business declarations and both account effects — Expected values to be strictly deep-equal:
  - renders the bounded Liquid Glass host across all 13 palettes with normalized full-wrap typography — stub exists for ./dev_vip_override
  - uses passive host surfaces without container borders — stub exists for ./dev_vip_override
  - keeps loading, monthly, yearly, lifetime, absent-store-data, and busy controls behaviorally distinct — stub exists for ./dev_vip_override
  - keeps real renewal dates and lifetime notes hidden while store data is loading — stub exists for ./dev_vip_override
- `tests/manage_subscription_overlays_liquid_glass.test.mjs` — настоящий — красный и в рабочей копии
  - measures the keyboard-reduced inner viewport and updates the numeric bound after resize — stub exists for ./dev_vip_override
  - lifts and bounds the Android panel by keyboard overlap minus the SafeAreaView bottom inset — stub exists for ./dev_vip_override
  - does not double-compensate resized Android viewports or alter iOS KeyboardAvoidingView behavior — stub exists for ./dev_vip_override
  - bounds the absolute overlay to ordinary safe-area content instead of the SafeAreaView itself — stub exists for ./dev_vip_override
  - renders reasons, Other input, selected state, and disabled Continue for every palette — stub exists for ./dev_vip_override
  - keeps the six reason callbacks, Russian English fallback, Other text, and one-haptic Continue flow — stub exists for ./dev_vip_override
  - renders progress and support retention with reachable visible decline actions and original callbacks — stub exists for ./dev_vip_override
  - renders empty restore with support and Close while preserving close-before-push and one haptic — stub exists for ./dev_vip_override
  - renders reasons, progress, support, and empty restore in all nine retained locales — stub exists for ./dev_vip_override
  - hides host accessibility if and only if any overlay is active — stub exists for ./dev_vip_override
  - preserves stay, decline, restore-close, and both close-before-support callback flows — stub exists for ./dev_vip_override
- `tests/midnight_flashcards_mode_icon_assets.test.ts` — настоящий — красный и в рабочей копии
  - midnight flashcards mode icon assets keeps the six icons compact, transparent, and free of warm fantasy colors — expect(received).toEqual(expected) // deep equality
- `tests/olive_phase1_surface_contract.test.ts` — настоящий — красный и в рабочей копии
  - Olive Phase 1 surfaces keeps Olive CTA contracts while shared decision modals use the active Liquid Glass tint — expect(received).toContain(expected) // indexOf — Expected substring: ": t.correctText;" / Received string: "import React, { memo } from 'react';
- `tests/overlay_queue_and_pending_alert_contract.test.ts` — настоящий — красный и в рабочей копии
  - overlay queue: the broadcast waits for a fresh install the broadcast is not even read while the install is fresh, and a — expect(received).toBeLessThan(expected) — Expected: < -1 / Received: 840
- `tests/paywall_store_promo_price_contract.test.ts` — настоящий — красный и в рабочей копии
  - скидка стора доезжает до пейвола честно пейвол Plus показывает промо-цену, зачёркнутую обычную и что будет ПОТОМ — expect(received).toContain(expected) // indexOf — Expected substring: "yearlyPromo?.promoPriceString \|\| yearlyPrice" / Received string: "// ══════════════════════════════════════
- `tests/personal_admin_message_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - personal admin message uses a glass card and keeps acknowledgement guarded — The input did not match the regular expression /backgroundColor: glass\.opaqueSheet, borderColor: glass\.glassEdge/. Input:
- `tests/phone_state_native_config_contract.test.ts` — артефакт среза — в рабочей копии зелёный
  - Android backup whitelist excludes encrypted PhoneState databases — ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\android\app\src\main\res\xml\backup_rules.xml'
  - Android Account V2 stays credential-protected and outside the backup whitelist — ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\android\app\src\main\AndroidManifest.xml'
- `tests/premium_modal_admin_grant_contract.test.ts` — настоящий — красный и в рабочей копии
  - premium modal dispatcher contract keeps purchase and restore safety in the shared purchase hook — expect(received).toContain(expected) // indexOf — Expected substring: "await initRevenueCat(isOperationAccountCurrent);" / Received string: "const handlePurchase = useCallback(asyn
- `tests/premium_modal_locale.test.ts` — настоящий — красный и в рабочей копии
  - Plus paywall footer locale contract keeps purchase and restore pending states visible and mutually blocked — expect(received).toContain(expected) // indexOf — Expected substring: "<ActivityIndicator color={g.ctaInk} />" / Received string: "// ══════════════════════════════════════════════
- `tests/privacy_settings_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - reviewed handlers and all original eight-locale maps remain byte-semantic snapshots — 3426bd9295c45c238c6b6675cad20670491961cd17ce0541347eb5e2b456df4f survives exactly once
- `tests/release_guard_staged_source.test.mjs` — артефакт среза — в рабочей копии зелёный
  - файла нет в коммите → проверяется версия из HEAD, рабочая копия не влияет — error: \|-
- `tests/render_daily_phrase_content_preview.test.mjs` — настоящий — красный и в рабочей копии
  - renders canonical-pass diagnostic quizzes only, deterministically, and holds every other locale block — Expected values to be strictly equal:
- `tests/results_coins_profile_liquid_glass_source_contract.test.mjs` — артефакт среза — в рабочей копии зелёный
  - practice energy pill is on glass in swipe trainings and prepositions — error: \|-
- `tests/rune_balance_snapshot_preservation_contract.test.ts` — артефакт среза — в рабочей копии зелёный
  - Rune balance survives every snapshot progress rebuild no other module rebuilds the progress section without carrying sta — Command failed: git grep -l patchAppSnapshot -- app components hooks modules
- `tests/scroll_inertia_contract.test.ts` — настоящий — красный и в рабочей копии
  - scroll inertia contract requires explicit sharp deceleration on every ordinary app scroll surface — expect(received).toEqual(expected) // deep equality
- `tests/settings_edu_liquid_glass.test.mjs` — настоящий — красный и в рабочей копии
  - learning settings retain all callbacks, normalized speed preview, and voice navigation — The input did not match the regular expression /void loadSettings\(\)\.then\(setS\)/. Input:
- `tests/settings_promo_startup_stability.test.ts` — настоящий — красный и в рабочей копии
  - settings promo-code startup stability applies the cached admin visibility flag before Settings can first render (other r — expect(received).toContain(expected) // indexOf — Expected substring: "import { primeRemoteConfigCacheFromStorage } from './remote_config_client';" / Received string: "import { isF
- `tests/shared_decision_modals_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - hybrid alert shell keeps center as the compatibility default and adds bottom placement without changing dismissal — The input did not match the regular expression /paddingBottom: bottomSheet \? 0 : Math\.max\(24, insets\.bottom, keyboardInset\)/. Input:
- `tests/single_workspace_runtime_contract.test.mjs` — артефакт среза — в рабочей копии зелёный
  - guard allows this checkout root and rejects another directory — error: \|-
- `tests/spire_local_release_packet_evidence.test.mjs` — артефакт среза — в рабочей копии зелёный
  - durable local packet bytes match every tracked checksum receipt — error: \|-
- `tests/spire_oddity_prompt.test.ts` — артефакт среза — в рабочей копии зелёный
  - spire_oddity_prompt все шаблоны «Найди лишнее» из пулов покрыты таблицей — ENOENT: no such file or directory, open 'C:\Temp\claude\jest_head\functions\src\generated\spire_multilingual_es.json'
- `tests/stable_id.test.ts` — настоящий — красный и в рабочей копии
  - concurrent getStableId calls share one generated identity and generation — TypeError: release is not a function
- `tests/startup_settings_boot_integration.test.ts` — настоящий — красный и в рабочей копии
  - two actual startup settings consumers retains the race budget and closes at actual settlement, with disposal cleanup — expect(received).toContain(expected) // indexOf — Expected substring: "closeStartupSettingsReadScope?.();" / Received string: "effectDisposed = true;
- `tests/support_report_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - actual handlers keep validation, duplicate guard, optimistic confirmation, preview collapse, and close behavior — Cannot read properties of undefined (reading 'isSupportDiagnosticsEnabled')
  - all reviewed nine-locale argument arrays survive and every locale renders through the actual screen — the shared title removes one duplicate baseline call and adds the local close label; PRF-09 drops the long intro paragraph; +2 for the send-failed banner and retry label
  - capture cleanup prevents a late diagnostic bundle from updating the unmounted screen — Cannot read properties of undefined (reading 'isSupportDiagnosticsEnabled')
- `tests/survey_unavailable_liquid_glass_source_contract.test.mjs` — настоящий — красный и в рабочей копии
  - identity, handoff, day-boundary, once-close, shared-sheet, messages, and protected source files remain byte-exact — app/account_generation.ts
- `tests/tab_freeze_handoff_contract.test.ts` — настоящий — красный и в рабочей копии
  - tab freeze ownership handoff contract commits ownership loss unfrozen before a passive effect arms freezing — TabPane source boundary not found
  - tab freeze ownership handoff contract unfreezes immediately and preserves the existing freeze-distance policy — TabPane source boundary not found
- `tests/theme_hardcoded_colors_ratchet.test.mjs` — настоящий — красный и в рабочей копии
  - hardcoded colors in screens never grow — they come from the selected theme tokens — новые захардкоженные цвета: [["app/dev_state.tsx",3],["modules/learning-v2/modes/mode_feedback_v1.tsx",5]] — берите токены темы (g.text, g.opaqueCard, g.hairlineSoft, g.mediaInk…) 
- `tests/use_mistake_explain_bundle_state.test.ts` — настоящий — красный и в рабочей копии
  - useMistakeExplain bundled ELI5 state does not start optional AI work while connectivity is still unknown — ReferenceError: __DEV__ is not defined
- `tests/video_pack_add_maps_to_community_doc.test.ts` — настоящий — красный и в рабочей копии
  - «+» у набора фраз ролика добавляет документ сообщества ролика текст отказа больше не отправляет «проверять связь» — expect(received).toContain(expected) // indexOf — Expected substring: "Этот набор пока нельзя добавить себе." / Received string: "/**
- `tests/visual_parity_gate.test.mjs` — настоящий — красный и в рабочей копии
  - настоящий router.ctx.js: стор-сборка вырезает Learning V2 и оставляет Главную — Expected values to be strictly equal:
- `tests/website_global_background_contract.test.ts` — настоящий — красный и в рабочей копии
  - public website global background contract classifies the complete 27-file HTML inventory with only justified shims exclu — expect(received).toHaveLength(expected) — Expected length: 27 / Received length: 28
  - public website global background contract legal/privacy-ios/index.html links the shared approved stylesheet exactly once — expect(received).toHaveLength(expected) — Expected length: 2 / Received length: 1


## Перепрогон 12.10 вечер (Ядро)

Все 65 файлов раздела «Наши зоны» перепрогнаны в рабочей копии HEAD ≈ `9898b202d` (12.10, 17:30–17:50): jest — `--runInBand`
пачками по 10 через светофор при свободной памяти ≥ 1,5 ГБ, `*.test.mjs` — `node --test` по одному файлу.

**Итог: 65 → зелёных 38 + починено Ядром 9 = 47 зелёных; красных осталось 18 (Codex 6, Дизайн 7, Темы 4, Авторизация 1).**

### Уже зелёные (38) — починены раньше другими коммитами или были артефактом среза

Зелёные: `account_sqlite_lease_patch_activation_v2`, `account_sqlite_lease_patch_v2`,
`account_v2_client_tails_6c_v2`, `account_v2_tails_6d_v2`, `auth_provider_stable_link`, `community_pack_like_owner_fix`,
`dev_links_r1_contract`, `energy_start_cost_contract`, `feedback_outbox`, `flashcards_recall_pending_start_behavior`,
`heisenberg_review_gate`, `home_lesson_progress_single_pass`, `i18n_missing_en_fallback`, `interaction_responsiveness_contract`,
`jest_write_guard`, `olive_phase1_surface_contract`, `overlay_queue_and_pending_alert_contract`, `phone_state_native_config_contract`,
`rune_balance_snapshot_preservation_contract`, `stable_id`, `use_mistake_explain_bundle_state`, `video_pack_add_maps_to_community_doc`,
`website_global_background_contract` (23 jest); `flashcards_blitz_liquid_glass_source_contract`,
`flashcards_deck_picker_liquid_glass_source_contract`, `lesson_intro_liquid_glass_source_contract`, `lessons_liquid_glass_source_contract`,
`manage_subscription_overlays_liquid_glass`, `personal_admin_message_liquid_glass_source_contract`,
`privacy_settings_liquid_glass_source_contract`, `release_guard_staged_source`, `results_coins_profile_liquid_glass_source_contract`,
`settings_edu_liquid_glass`, `shared_decision_modals_liquid_glass_source_contract`, `single_workspace_runtime_contract`,
`spire_local_release_packet_evidence`, `survey_unavailable_liquid_glass_source_contract`, `visual_parity_gate` (15 node --test).

### Починено Ядром — `9898b202d` (9 файлов, 39/39)

| Файл | Причина | Что сделано |
|---|---|---|
| `firestore_reserved_document_id_guard` | **настоящая находка**: dev-зонд `app/mem_tick.ts` брал зарезервированные имена `__mem_tick_probe__` / `__probe__` | имена → `mem_tick_probe` / `probe` (по ссылке не читаем и не пишем) |
| `spire_oddity_prompt` | моя регрессия из `41443be48` («вислів» по указанию владельца) | ожидание uk «Знайди вислів, який треба виправити.» |
| `late_listener_adoption_contract` | поток `subscribeUserAppMessages` удалён как мёртвый (`b59868b5b`) | проверки app_messages сняты, notifications/_layout остаются |
| `startup_settings_boot_integration` | перед `closeStartupSettingsReadScope?.()` появился комментарий — окно 250 символов мало | проверяется вся функция очистки |
| `settings_promo_startup_stability` | импорт расширен `readRemoteConfigCacheRaw` | импорт проверяется регуляркой |
| `tab_freeze_handoff_contract` | тип `LessonsPrivacyState` удалён — граница TabPane не находилась | граница — `function LessonsPaneBoundary(` |
| `course_pack_download_idempotent_contract` | поверхность `plan_content` убрана из `COURSE_PACK_SURFACES` | фикстура на `lesson` |
| `course_pack_runtime_contract` | `de` стал поддерживаемым языком изучения | «неизвестный» язык — `xx` |
| `lingman_youtube_cache` | маска снимка строже (`!pendingChannel`) | ожидание по текущему коду |

### Красные — чужие зоны (строкой владельцу)

| Файл | Зона | Причина | Что поправить |
|---|---|---|---|
| `flashcards_blitz_access_behavior` (4 теста) | Дизайн (Карточки) | мок `../app/dev_cards_state` без новой `getDevBlitzAnswer` → `is not a function` | в мок строки 44 добавить `getDevBlitzAnswer: () => null` |
| `scroll_inertia_contract` | Дизайн (Карточки) | `app/flashcards/ExpandedCardV2.tsx:226` — прокрутка без явного `decelerationRate="fast"` | добавить `decelerationRate="fast"` |
| `ai_dialog_home_compact_header_contract.mjs` | Дизайн (Диалоги) | в шапке хаба нет `<V2IconButton icon="chevron-back"` | шапка переделана — обновить контракт или вернуть кнопку |
| `paywall_store_promo_price_contract` | Дизайн (пейвол) | нет `yearlyPromo?.promoPriceString \|\| yearlyPrice` (PaywallPlus/PaywallPlusScreen) | сверить промо-цену с текущим кодом |
| `premium_modal_locale` | Дизайн (пейвол) | нет `<ActivityIndicator color={g.ctaInk} />` в подвале Plus | состояния «покупка/восстановление идёт» |
| `premium_modal_admin_grant_contract` | Дизайн (пейвол) | нет `await initRevenueCat(isOperationAccountCurrent);` в общем хуке покупки | проверить, куда переехала инициализация |
| `support_report_liquid_glass_source_contract.mjs` | Дизайн (поддержка) | массивы текстов на 9 языков изменились относительно снимка | обновить снимок после проверки текстов |
| `midnight_flashcards_mode_icon_assets` | Темы | нет иконок режимов `saved`, `custom`, `training` (и др.) | вернуть ассеты или обновить список |
| `flashcards_speaking_liquid_glass_source_contract.mjs` | Темы | AST «квота/попытка/удержание/TTS» отличается от базы | пересверить базу AST после правок экрана |
| `flashcards_training_setup_liquid_glass_source_contract.mjs` | Темы | AST и общие зависимости отличаются от базы | то же |
| `manage_subscription_liquid_glass_source_contract.mjs` | Темы | 21 объявление оплаты/аккаунта отличается от базы | то же |
| `account_provision_lock_android_runtime_entrypoint` (4 теста) | Авторизация | разбор вывода дочернего процесса блокировки — ожидаемые обобщённые отказы не совпадают. **Разобрано Авторизацией 12.10 (54/58):** внешний запускатель Codex (файл вне репозитория, изменён 28.09 08:15 после проверенного пакета) добавляет в обезличенный отказ поля `cleanupFailures`/`databaseRootDiagnostic`; тест прав, код репозитория ни при чём | внешний запускатель изменён после ревью — ждёт решения координатора/Codex. **Закрыто Авторизацией 12.10 ночью (58/58):** вывод редьюсера снят целиком (scratchpad launcher_probe2) — внутренний запускатель run-proof.ps1 пишет конверт из 8 полей (cleanupFailures, databaseRootDiagnostic) в том порядке, которого требует новый внешний; старый 6-польный договор отклонял бы любой настоящий отказ. Вердикт: устарел контракт теста, не код. Тест обновлён: общий отказ — 8 полей, канонический 8-польный принимается, 6-польный → общий отказ, подгружены Assert-JsonIntegerValue и списки скрипта. |
| `lesson1_release_parity` | Codex (Learning V2) | подпись занятия: `interactionProfile` стал `voice_heavy` вместо `standard` | — |
| `kimi_voice_capture_session_lifecycle` | Codex (`components/learning-v2-lab`) | после перезапуска сессии статус `idle` вместо `listening` | — |
| `android_no_square_outline_guard` | Codex | все 4 места — Learning V2 (`learning_v2_direct_session_player_v1.tsx:3610`, `_learning_v2_modes_showcase.tsx:132`, `LearningV2FounderPassModal.tsx:278`, `LearningV2PulseMapSessionRow.tsx:227`) | — |
| `android_clipping_crash_guard` | Codex | `components/learning-v2/horizons/LearningV2Horizons.tsx: FlatList` | — |
| `theme_hardcoded_colors_ratchet.mjs` | Codex | +5 цветов в `modules/learning-v2/modes/mode_feedback_v1.tsx` (`app/dev_state.tsx` уже чист) | — |
| `render_daily_phrase_content_preview.mjs` | контент фразы дня (конвейер `content/daily-phrases`) | сгенерированное превью ≠ закоммиченный `content/daily-phrases/es/REVIEW_PREVIEW.md` | перегенерировать превью владельцем конвейера |

### Статус на вечер 12.10 (после ответов владельцев зон)

- **Дизайн — 7 из 7 закрыты, `a7f4d2920`** (5 наборов раннера 52/52, два .mjs 10/10). Из них один — реальный дефект кода:
  у списка наборов в `ExpandedCardV2.tsx` не было `decelerationRate="fast"`. Остальные — контракты под осознанные правки
  (D158: цена с «≈», кружок покупки `g.accentInk`, `initRevenueCat` под потолком до оплаты; testID кнопки назад; мок
  `getDevBlitzAnswer`; снимок текста поддержки — одно слово «вислів» из `41443be48`).
- **Темы — 4 из 4 закрыты** (пакет TG-58DF6DACDEDC): базы AST трёх стеклянных экранов пересверены по diff (в т.ч. из-за
  `41443be48`), тест иконок режимов переведён в проверку «старых ассетов и ссылок нет» (папка удалена в `96c32bb97`).
- **Осталось 7:** Авторизация 1 (`account_provision_lock_android_runtime_entrypoint`), Codex 6 (`lesson1_release_parity`,
  `kimi_voice_capture_session_lifecycle`, `android_no_square_outline_guard`, `android_clipping_crash_guard`,
  `theme_hardcoded_colors_ratchet`, `render_daily_phrase_content_preview`).
