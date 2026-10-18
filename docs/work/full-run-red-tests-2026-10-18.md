# Полный прогон на HEAD d4e2a37dc→(дерево до 03:30), 18.10 — красные jest

Итого jest: 2860 файлов, красных 104, зелёных 2754, пропущено 2; проверок 21846, красных 176. node-тесты (*.test.mjs/*.test.cjs): 1373, красных 0.
Столбец «Последний коммит файла» — последний коммит САМОГО ТЕСТА, а не файла, который он проверяет; красный мог появиться позже из-за чужой правки проверяемого кода.

| Тест | Красных проверок | Последний коммит теста | Дата | Контур | Первая ошибка |
|---|---|---|---|---|---|
| learning_v2_activity_post_terminal_card_catalog_v1.test.ts | 3 | 1c450880c | 2026-08-13 | Learning V2 (контент/фабрика курса) | Error: learning_v2_post_terminal_card_meanings_invalid |
| learning_v2_activity_released_session_submission_spool_v2.test.ts | 2 | 68f4ef973 | 2026-08-15 | Learning V2 (контент/фабрика курса) | Error: learning_v2_activity_released_session_submission_invalid |
| learning_v2_all_ready_tasks_runtime_audit.test.ts | 1 | bbe74b388 | 2026-10-01 | Learning V2 (контент/фабрика курса) | assert.strictEqual(received, expected) |
| learning_v2_authored_sessions_reach_the_player.test.ts | 2 | 8ab9671e7 | 2026-08-23 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_content_quality_gate_wiring.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toContain(expected) // indexOf |
| learning_v2_course_lesson_audio_release_index_v1.test.ts | 2 | 3376f0653 | 2026-08-27 | Learning V2 (контент/фабрика курса) | Error: learning_v2_mode_native_payload_invalid |
| learning_v2_course_session_audio_readback_v1.test.ts | 2 | 68f4ef973 | 2026-08-15 | Learning V2 (контент/фабрика курса) | Error: learning_v2_mode_native_payload_invalid |
| learning_v2_course_session_audio_release_extension_v1.test.ts | 2 | 3376f0653 | 2026-08-27 | Learning V2 (контент/фабрика курса) | Error: learning_v2_mode_native_payload_invalid |
| learning_v2_course_session_completed_spool_v1.test.ts | 2 | 68f4ef973 | 2026-08-15 | Learning V2 (контент/фабрика курса) | Error: learning_v2_course_session_client_child_invalid |
| learning_v2_course_session_save_card_v1.test.ts | 1 | 68f4ef973 | 2026-08-15 | Learning V2 (контент/фабрика курса) | Error: learning_v2_course_session_client_child_invalid |
| learning_v2_e1_content_compiler.test.ts | 1 | 4792f3e59 | 2026-08-12 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_english_l4_curriculum_contract.test.ts | 0 | e2a74ef30 | 2026-10-11 | Learning V2 (контент/фабрика курса) |   ● Test suite failed to run |
| learning_v2_episode_01_session_01_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_02_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_03_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_04_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_05_source.test.ts | 5 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).not.toContain(expected) // indexOf |
| learning_v2_episode_01_session_06_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_07_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_09_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_10_source.test.ts | 1 | 6326e86a3 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_11_source.test.ts | 8 | 96c32bb97 | 2026-08-24 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_12_source.test.ts | 1 | 90dc4d031 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_13_source.test.ts | 1 | 90dc4d031 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_14_source.test.ts | 1 | 90dc4d031 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_15_source.test.ts | 1 | 90dc4d031 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_16_source.test.ts | 1 | 90dc4d031 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_17_source.test.ts | 10 | 15a8bc907 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_18_source.test.ts | 1 | d5cac4e23 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_19_source.test.ts | 1 | d5cac4e23 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_20_source.test.ts | 1 | d5cac4e23 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_21_source.test.ts | 1 | d5cac4e23 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_22_source.test.ts | 1 | d5cac4e23 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_23_source.test.ts | 1 | d5cac4e23 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_session_24_source.test.ts | 1 | d5cac4e23 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_session_map.test.ts | 1 | 50eea79a4 | 2026-08-26 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_episode_01_sessions_25_32_source.test.ts | 12 | dd9bace16 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_sessions_33_40_intro_data.test.ts | 1 | 05a45451f | 2026-08-24 | Learning V2 (контент/фабрика курса) | Error: expect(received).not.toMatch(expected) |
| learning_v2_episode_01_sessions_33_40_source.test.ts | 4 | 96c32bb97 | 2026-08-24 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_sessions_41_48_source.test.ts | 1 | 93e40fe8e | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_sessions_49_56_source.test.ts | 1 | 079ba80fb | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_episode_01_to_be_only.test.ts | 1 | 50eea79a4 | 2026-08-26 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_es_bundle_reachability_guard.test.ts | 1 | d65a9588b | 2026-08-27 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBeGreaterThan(expected) |
| learning_v2_factory_native_projection_v1.test.ts | 1 | 7a97f2fd7 | 2026-10-13 | Learning V2 (контент/фабрика курса) | assert.strictEqual(received, expected) |
| learning_v2_factory_production_audio_contract.test.ts | 1 | 4d4d792e0 | 2026-10-05 | Learning V2 (контент/фабрика курса) | assert.match(received, expected) |
| learning_v2_generator_course_manifest.test.ts | 1 | 4792f3e59 | 2026-08-12 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_generator_session_shard.test.ts | 5 | 58c18c3e8 | 2026-08-17 | Learning V2 (контент/фабрика курса) | Error: learning_v2_session_shard_fields_invalid |
| learning_v2_intro_reader_fixture_contract.test.ts | 1 | 3cf12d439 | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toContain(expected) // indexOf |
| learning_v2_intro_semantic_runs_contract.test.ts | 2 | e77cd13cb | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: learning_v2_course_session_client_child_invalid |
| learning_v2_intro_theme_contract.test.ts | 1 | c99a2a86b | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toEqual(expected) // deep equality |
| learning_v2_lesson_map_screen_contract.test.ts | 0 | 3ede129b0 | 2026-08-26 | Learning V2 (контент/фабрика курса) |   ● Test suite failed to run |
| learning_v2_lesson1_chapter_gate.test.ts | 2 | 90a3aac0d | 2026-08-20 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_lesson1_real_session_mock.test.ts | 1 | 05a45451f | 2026-08-24 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_lexical_density_policy_v2.test.ts | 0 | e2a74ef30 | 2026-10-11 | Learning V2 (контент/фабрика курса) |   ● Test suite failed to run |
| learning_v2_listen_choose_option_label_v1.test.ts | 0 | 1d70c8fc5 | 2026-09-19 | Learning V2 (контент/фабрика курса) |   ● Test suite failed to run |
| learning_v2_mode_router_family_coverage.test.ts | 0 | 4d4d792e0 | 2026-10-05 | Learning V2 (контент/фабрика курса) |   ● Test suite failed to run |
| learning_v2_neutral_qa_hostile_red_matrix_v1.test.ts | 8 | 3175ae524 | 2026-08-15 | Learning V2 (контент/фабрика курса) | Error: learning_v2_course_session_client_child_invalid |
| learning_v2_neutral_qa_session_e2e_harness_v1.test.ts | 10 | dc839aee4 | 2026-08-15 | Learning V2 (контент/фабрика курса) | Error: learning_v2_course_session_client_child_invalid |
| learning_v2_new_word_encounter_projection_v1.test.ts | 2 | b9bb9a84c | 2026-10-01 | Learning V2 (контент/фабрика курса) | Error: expect(received).toBe(expected) // Object.is equality |
| learning_v2_p0_p1_smoke.test.ts | 1 | 4792f3e59 | 2026-08-12 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_session_compiler.test.ts | 1 | 4792f3e59 | 2026-08-12 | Learning V2 (контент/фабрика курса) | Error: expect(received).toHaveLength(expected) |
| learning_v2_session_contract.test.ts | 1 | 4792f3e59 | 2026-08-12 | Learning V2 (контент/фабрика курса) | Error: expect(received).toMatchObject(expected) |
| learning_v2_session_intro_feedback_behavior.test.tsx | 1 | — | — | Learning V2 (контент/фабрика курса) | TypeError: Cannot read properties of undefined (reading 'get') |
| learning_v2_session_skip_interaction.test.ts | 0 | 772505e66 | 2026-10-05 | Learning V2 (контент/фабрика курса) |   ● Test suite failed to run |
| learning_v2_voice_physical_device_runner_v1.test.ts | 2 | 0217c4a21 | 2026-09-14 | Learning V2 (контент/фабрика курса) | Error: expect(jest.fn()).toHaveBeenCalledTimes(expected) |
| account_authority_legacy_callsite_guard.test.ts | 1 | d410c90f1 | 2026-10-17 | Вход/Аккаунты/синхронизация | Error: expect(received).toEqual(expected) // deep equality |
| account_details_identity_actions_contract.test.ts | 1 | db402696b | 2026-07-26 | Вход/Аккаунты/синхронизация | Error: expect(received).toContain(expected) // indexOf |
| accounts_v2_legacy_sync_switch.test.ts | 1 | ae0345685 | 2026-10-05 | Вход/Аккаунты/синхронизация | Error: expect(received).toBeLessThan(expected) |
| auth_provider_stable_link.test.ts | 1 | 0c094c846 | 2026-10-14 | Вход/Аккаунты/синхронизация | Error: expect(received).toBeGreaterThanOrEqual(expected) |
| cloud_sync_account_race_contract.test.ts | 2 | fdacf49aa | 2026-10-10 | Вход/Аккаунты/синхронизация | Error: expect(received).toContain(expected) // indexOf |
| source_guard_eol_normalized_contract.test.ts | 1 | a2f943bde | 2026-10-15 | Вход/Аккаунты/синхронизация | Error: expect(received).toEqual(expected) // deep equality |
| startup_settings_writer_boundaries.test.ts | 1 | 7e9867173 | 2026-10-10 | Вход/Аккаунты/синхронизация | Error: expect(received).toHaveLength(expected) |
| kimi_voice_capture_session_lifecycle.test.ts | 1 | 71b371dd9 | 2026-10-10 | Голос | Error: expect(received).toBe(expected) // Object.is equality |
| gustav_builder_work_orders.test.ts | 1 | 9f46ea4cc | 2026-07-05 | Густав (французский пайплайн) | Error: expect(received).toBeGreaterThanOrEqual(expected) |
| gustav_feature_parity_matrix.test.ts | 1 | c65476519 | 2026-07-03 | Густав (французский пайплайн) | Error: expect(received).toBeGreaterThanOrEqual(expected) |
| gustav_flashcard_pack_generator_contract.test.ts | 3 | 9f46ea4cc | 2026-07-05 | Густав (французский пайплайн) | Error: Command failed: node scripts/gustav_build_flashcard_pack_generator_contract.mjs |
| gustav_fr_ai_prompt_parity_gate.test.ts | 1 | 3aba27e14 | 2026-07-11 | Густав (французский пайплайн) | Error: expect(received).toContain(expected) // indexOf |
| gustav_fr_collectible_candidate_bridge_gate.test.ts | 1 | d3278d400 | 2026-07-05 | Густав (французский пайплайн) | Error: ENOENT: no such file or directory, open 'C:\appsprojects\phraseman\docs\gustav\gene |
| gustav_fr_collectible_cards_v1.test.ts | 1 | d3278d400 | 2026-07-05 | Густав (французский пайплайн) | Error: ENOENT: no such file or directory, open 'C:\appsprojects\phraseman\docs\gustav\gene |
| gustav_fr_full_surface_closeout_work_order.test.ts | 1 | 4ccd8c4f4 | 2026-08-21 | Густав (французский пайплайн) | Error: expect(received).toMatchObject(expected) |
| gustav_fr_lesson_llm_review_decision_schema_gate.test.ts | 1 | d3278d400 | 2026-07-05 | Густав (французский пайплайн) | Error: expect(received).toBe(expected) // Object.is equality |
| gustav_fr_lesson_llm_review_launch_contract.test.ts | 1 | d3278d400 | 2026-07-05 | Густав (французский пайплайн) | Error: expect(received).toMatchObject(expected) |
| gustav_fr_non_lesson_surface_backlog_gate.test.ts | 1 | 4ccd8c4f4 | 2026-08-21 | Густав (французский пайплайн) | Error: expect(received).toBe(expected) // Object.is equality |
| gustav_french_app_surface_parity_v2_packet.test.ts | 1 | 1c450880c | 2026-08-13 | Густав (французский пайплайн) | Error: expect(received).toBe(expected) // Object.is equality |
| gustav_french_curriculum_contract.test.ts | 1 | efe19ae9d | 2026-09-30 | Густав (французский пайплайн) | Error: expect(received).toContain(expected) // indexOf |
| gustav_french_lesson_runtime_source_gate.test.ts | 1 | c65476519 | 2026-07-03 | Густав (французский пайплайн) | Error: expect(received).toContain(expected) // indexOf |
| gustav_french_vocabulary_target_gate.test.ts | 3 | efe19ae9d | 2026-09-30 | Густав (французский пайплайн) | Error: expect(received).toContain(expected) // indexOf |
| gustav_lesson_runtime_target_isolation.test.ts | 3 | 401293e05 | 2026-09-05 | Густав (французский пайплайн) | Error: expect(received).toContain(expected) // indexOf |
| gustav_onboarding_server_prefetch_contract_v2_packet.test.ts | 1 | 1b10225e3 | 2026-08-15 | Густав (французский пайплайн) | Error: expect(received).toBe(expected) // Object.is equality |
| gustav_research_best_practices_work_order.test.ts | 1 | 553face77 | 2026-08-13 | Густав (французский пайплайн) | Error: expect(received).toBeGreaterThanOrEqual(expected) |
| gustav_trusted_brain_contract.test.ts | 1 | 9f46ea4cc | 2026-07-05 | Густав (французский пайплайн) | Error: expect(received).toContain(expected) // indexOf |
| gustav_validator_p1a_stale_preapply.test.ts | 1 | b96be8cb7 | 2026-07-02 | Густав (французский пайплайн) | Error: expect(received).toBe(expected) // Object.is equality |
| english_ui_enable_preflight.test.ts | 1 | 97f63a0bd | 2026-10-12 | Диалоги/i18n (DialogQuotaBadge, DialogueV2HubNotices — «Лимит N ответов») | Error: Command failed: C:\Program Files\nodejs\node.exe C:\appsprojects\phraseman\scripts\ |
| i18n_missing_en_fallback.test.ts | 1 | 1d0187b88 | 2026-10-11 | Диалоги/i18n (DialogQuotaBadge, DialogueV2HubNotices — «Лимит N ответов») | Error: Command failed: C:\Program Files\nodejs\node.exe C:\appsprojects\phraseman\scripts\ |
| number_noun_pairs_guard.test.ts | 1 | 768a01af2 | 2026-10-12 | Диалоги/i18n (DialogQuotaBadge, DialogueV2HubNotices — «Лимит N ответов») | Error: expect(received).toEqual(expected) // deep equality |
| android_clipping_crash_guard.test.ts | 1 | ad0c7ed1d | 2026-06-04 | ДИЗАЙН (моё) — починено | Error: expect(received).toEqual(expected) // deep equality |
| flashcard_pages_restore_lock.test.ts | 1 | 47edcb2ba | 2026-10-11 | Карточки/видео | Error: expect(received).toBeLessThan(expected) |
| flashcards_doc_field_clear.test.ts | 1 | 74da431c8 | 2026-10-05 | Карточки/видео | Error: expect(received).toBeLessThan(expected) |
| video_phrase_set_packs_catalog_cache.test.ts | 5 | 481fedeea | 2026-10-13 | Карточки/видео | TypeError: Cannot read properties of undefined (reading 'titleRu') |
| combo_moment_m08.test.tsx | 1 | 9f3e21564 | 2026-10-18 | Моменты/движение | Error: expect(jest.fn()).toHaveBeenLastCalledWith(...expected) |
| motion_hybrid_contract.test.ts | 2 | a632db78e | 2026-10-11 | Моменты/движение | Error: expect(received).toEqual(expected) // deep equality |
| switch_on_tone.test.ts | 1 | 66e133283 | 2026-10-15 | Темы (градиентные темы, контраст) | Error: expect(received).toEqual(expected) // deep equality |
| test_runner_coverage_contract.test.ts | 1 | 8e4c3de6a | 2026-10-03 | Тест-инфраструктура | Error: expect(received).toEqual(expected) // deep equality |
| lessons_overlays_audit_r58.test.ts | 1 | 5b4a9dfe5 | 2026-10-15 | Уроки (app/lesson_menu.tsx) | Error: expect(received).toContain(expected) // indexOf |

## node-сторожа (скрипты)

| Сторож | Результат | Последний коммит скрипта | Причина | Контур |
|---|---|---|---|---|
| guard:phone-state-inventory (--check) | зелёный | — | — | Вход |
| guard:phone-state-writers | зелёный | — | — | Вход |
| guard:motion-ratchet (guard_runtime_lifecycle_ratchet) | красный | 39ee3db70 (26.08) | читает tests/runtime_lifecycle_ratchet.test.ts, файла нет (ENOENT) | Движение/нагрев |
| i18n:check, i18n:en-index-check | зелёные | — | — | i18n |
| i18n:en-check (scan_missing_en_dictionaries) | красный | e6dc6dd53 (15.10) | components/DialogQuotaBadge.tsx — словарь ru+uk без en (46e6bf4c1, 18.10) | Диалоги/i18n |
| release:precheck | красный | 4d305eb5d (15.10) | PARITY-GATE: несверенные экраны по макетам (единственный сработавший гейт) | Сверка |
| guard_achievement_art_manifest_v2 / _catalog_v2 / _foundation_v2 | красные | 96c32bb97 (24.08) | в каталоге 32 достижения вместо ожидаемых 70, ID манифеста ≠ каталогу | Достижения (давний) |
| guard_global_broadcast_privacy_rules_rollout | красный по замыслу | 96c32bb97 (24.08) | блокировка выкладки правил: порядок выката не пройден | Ядро/Правила |
| guard_learning_v2_de_task7_v2_l01_c05 / c06 | красные | 7a97f2fd7 (13.10) | нет файлов-манифестов docs/v2/curriculum/de/TASK7_*_EVIDENCE_MANIFEST_2026-10-13.json | Learning V2 DE (давний) |
| остальные guard_*.mjs из pre-commit (admin_*, as_any, foreign_staged, functions_duplicates, league_*, mass_deletion, secret_env_overlap, session_release, phone_state_*) | зелёные | — | — | — |
