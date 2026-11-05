# Красные тесты — перепроверка на текущем дереве (2026-11-05 10:24 UTC)

Автор: 11 · Ревизор. Метод: те же **110 файлов** из `RED_TESTS_FULL_2026-11-05.md` перегнаны на текущем РАБОЧЕМ дереве (общее, грязное; `git archive` HEAD для всех 110 не гонялся). Итог: было 110 красных файлов / 155 тестов → **сейчас 64 файла / 99 тестов красные**, 46 файлов позеленели сами (чужой WIP был закоммичен или починен).

Классы: 🔴 реальный (задевает сборку/пользователя/замок) · 🟡 устарел или чужой WIP (разобрать владельцу области).

## 🔴 Реальные красные (10)
| Файл | Тестов | Владелец | Суть |
|---|---|---|---|
| `owner_locks_exam_episode_words_2026_10_25.test.ts` | 3 | 1 · Learning V2 |  ● замок 25.10: в экзамене только слова из эпизодов до него › chapter_exam_v2_l23_c1.ts: незнакомых слов нет expect(received).toEqual(expected) // dee |
| `i18n_missing_en_fallback.test.ts` | 2 | 10 · Переводчик / Ядро |  ● no unguarded direct reads of a language dictionary that lacks `en` › scan_direct_lang_index finds no new unguarded reads Command failed: C:\Program |
| `english_ui_enable_preflight.test.ts` | 2 | 10 · Переводчик / Ядро |  ● English interface enable preflight (crash of 27.08 must not repeat) › there are ZERO language dictionaries without an English key (baseline and liv |
| `spire_scene_contract.test.ts` | 1 | 8 · Моменты (Пик) |  ● spire_scene_contract assert(received) Expected value to be equal to: true Received: false |
| `achievements.test.ts` | 1 | 1 · Ядро / 3 · Макеты (достижения, карточка, объявления) |  ● achievements › has the approved unique catalog and safe locale fallback for every active achievement expect(received).toBe(expected) // Object.is e |
| `owner_locks_announcements_2026_10_28.test.ts` | 1 | 1 · Ядро / 3 · Макеты (достижения, карточка, объявления) |  ● замок владельца 28.10 — объявления = макет (36 шаблонов) › гейт: results.json снят с текущего макета, порог = замок, 432 кадра, 0 расхождений, 0 пр |
| `codex_review_critical_contract_2026_10_28.test.ts` | 1 | 1 · Ядро / 5 · Вход |  ● Codex review 2026-10-28 critical contracts › OWNER_LOCKS records the 26.10 shared exam-modal decision without claiming device verification expect(r |
| `learning_v2_locale_gate.test.ts` | 1 | 1 · Learning V2 |  ● Learning V2 locale gate after the owner full-off decision › every known and unresolved interface locale is fail-closed expect(received).toEqual(exp |
| `account_provision_lock_android_runtime_entrypoint.test.ts` | 1 | 1 · Ядро / 5 · Вход |  ● Android Account V2 provision-lock entrypoint and host runner › aggregate cleanup attempts package restore, Android restore, APK recheck, source che |
| `progress_preservation_owner_lock_2026_11_04.test.ts` | 1 | 1 · Ядро / 5 · Вход |  ● ЗАМОК ВЛАДЕЛЬЦА 04.11: прогресс старого курса не удаляется › число удалений ключей хранилища не выросло ни в одном файле и не появилось в новых exp |

## 🟡 Остальные (54)
| Файл | Тестов | Владелец (предположение по имени) |
|---|---|---|
| `scroll_inertia_contract.test.ts` | 1 | 8 · Моменты (Пик) |
| `spire_tower_window_height.test.ts` | 2 | 8 · Моменты (Пик) |
| `a4_decisions_contract.test.ts` | 1 | 1 · Ядро / 5 · Вход |
| `themed_art_guard.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `phone_state_legacy_inventory.test.ts` | 1 | 1 · Ядро / 5 · Вход |
| `modal_theme_hardcode_guard.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `learning_v2_mode_feedback_lane.test.tsx` | 2 | 1 · Learning V2 |
| `light_accent_graphics_ratchet.test.ts` | 3 | 2 · Дизайн / 4 · Темы |
| `season_shared_modal.test.tsx` | 3 | 2 · Дизайн / 4 · Темы |
| `flashcards_speaking_quota_unavailable_behavior.test.ts` | 2 | 1 · Ядро / 5 · Вход |
| `learning_v2_bundled_session_material.test.ts` | 3 | 1 · Learning V2 |
| `button_audit_design_fixes_contract.test.ts` | 4 | 2 · Дизайн / 4 · Темы |
| `learning_v2_accepted_green_prefix_runtime.test.ts` | 14 | 1 · Learning V2 |
| `max_removed_contract.test.ts` | 1 | 1 · Ядро / 5 · Вход |
| `screen_back_content_below_contract.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `render_test_registry_contract.test.ts` | 2 | 1 · Ядро / 5 · Вход |
| `admin_revenue_analytics_contract.test.ts` | 5 | 9 · Сайт / Ядро |
| `learning_v2_theory_v1.test.ts` | 1 | 1 · Learning V2 |
| `learning_v2_sessions_without_word_cards_contract.test.ts` | 1 | 1 · Learning V2 |
| `perf_freeze_contract.test.ts` | 1 | 1 · Ядро / 5 · Вход |
| `number_noun_pairs_guard.test.ts` | 1 | 10 · Переводчик / Ядро |
| `today_tasks_week_2026_10_22.test.ts` | 1 | 2 · Дизайн |
| `source_guard_eol_normalized_contract.test.ts` | 1 | 1 · Ядро / 5 · Вход |
| `learning_v2_course_released_session_client_v3.test.ts` | 6 | 1 · Learning V2 |
| `learning_v2_session_intro_feedback_behavior.test.tsx` | 1 | 1 · Learning V2 |
| `android_clipping_crash_guard.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `video_pack_owned_from_local_ids.test.ts` | 2 | 2 · Дизайн |
| `admin_legacy_detailed_analytics_contract.test.ts` | 1 | 9 · Сайт / Ядро |
| `text_integrity_probe.test.ts` | 1 | 10 · Переводчик / Ядро |
| `learning_v2_full_off_policy.test.ts` | 2 | 1 · Learning V2 |
| `spire_floor_record_flag.test.ts` | 1 | 8 · Моменты (Пик) |
| `spire_home_week_module.test.ts` | 1 | 8 · Моменты (Пик) |
| `test_runner_coverage_contract.test.ts` | 1 | 1 · Ядро / 5 · Вход |
| `profile_card_showcase.test.ts` | 1 | 1 · Ядро / 3 · Макеты (достижения, карточка, объявления) |
| `flashcards_entry_fail_open_contract.test.ts` | 1 | 1 · Ядро / 5 · Вход |
| `daily_poll_card_contract.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `app_messages_read_persistence_ui_contract.test.ts` | 1 | 2 · Дизайн |
| `skeleton_geom_log.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `learning_v2_system_tts_only.test.ts` | 1 | 1 · Learning V2 |
| `home_first_frame_defer_2026_10_22.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `cards_set_header_safe_area_contract.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `learning_v2_full_off_entry_slice.test.ts` | 1 | 1 · Learning V2 |
| `dialogs_chain7_fixes_contract.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `cards_pack_opt_ui_gaps_contract.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `dev_dialog_feedback_fixture.test.ts` | 1 | 2 · Дизайн |
| `button_fill_sweep_guard.test.ts` | 2 | 2 · Дизайн / 4 · Темы |
| `today_scene_wiring_contract.test.ts` | 1 | 2 · Дизайн / 4 · Темы |
| `spire_all_members_profile.test.tsx` | 0 | 8 · Моменты (Пик) |
| `profile_card_showcase_sheet.test.tsx` | 0 | 1 · Ядро / 3 · Макеты (достижения, карточка, объявления) |
| `paywall_c_native_render.test.tsx` | 0 | — (координатор назначит) |
| `learning_v2_scripted_repeat_player_lifecycle.test.tsx` | 0 | 1 · Learning V2 |
| `flashcards_training_target_language_behavior.test.ts` | 0 | 1 · Ядро / 5 · Вход |
| `flashcards_recall_pending_start_behavior.test.ts` | 0 | 1 · Ядро / 5 · Вход |
| `classic_starter_native_ports.test.ts` | 0 | — (координатор назначит) |

## Заметки
- `progress_preservation_owner_lock_2026_11_04` (храповик): виновник `app/streak_stats.tsx` (`removeItem` в коммите 0e663c05e), Дизайн исправляет на `setItem` с пустой строкой — после коммита перепроверить.
- `owner_locks_exam_episode_words_2026_10_25` — ЗАМОК ВЛАДЕЛЬЦА (незнакомые слова в экзамене, `chapter_exam_v2_l23_c1`).
- Строки с 0 упавших тестов в колонке — падение на уровне набора (ошибка импорта/окружения).
- Список владельцев — предположение по имени файла; координатор раздаёт по файлу.
