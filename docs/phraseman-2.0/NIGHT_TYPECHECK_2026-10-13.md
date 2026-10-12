# Ночная страховка типов · 13.10 (Ядро, по заказу координатора)

Полную проверку типов сделать нельзя: ей нужно окно памяти около 8 ГБ, а оно будет только утром. Поэтому проверены срезами файлы, которые ночью менялись в HEAD.

## Что проверено

- Источник: `git log --since="2026-10-12 22:00" --name-only` до 47682cf2d.
  - 170 файлов .ts/.tsx из 37 коммитов, удалённых среди них нет.
  - Скрипты разбора: `nt_list.py`, `nt_cfg.py`, `nt_run.sh` в scratchpad Ядра.
- Приложение — 129 файлов плюс 1 файл Learning V2, 12 срезов:
  - в срезе 10–12 файлов, у каждого среза свой tsconfig;
  - конфиг расширяет корневой `tsconfig.json`, с `skipLibCheck`;
  - файлы проверяются вместе со всем, что импортируют.
- Серверная часть — 3 файла `functions/` против `functions/tsconfig.json`.
- Условия запуска:
  - только через светофор (слот);
  - свободной памяти не меньше 3 ГБ;
  - на ПК не идёт ни одной другой проверки типов;
  - потолок памяти процесса 3 ГБ.
- **Канарейка.** Срез 2 прогнан ещё раз с подложенным файлом: он импортирует `PREWARM_STEP_GAP_MS` (число) через `@/`-путь и присваивает его строке. Получена ошибка `TS2322`. Значит, срезы действительно разрешают модули проекта и ловят ошибки; «0 ошибок» ниже — настоящий результат.

| срез | файлов | время, с | ошибок |
|---|---:|---:|---:|
| app-0 … app-10 | 129 (по 12, последний 9) | 7–27 | **0** |
| app-11 (Learning V2) | 1 | 7 | **0** |
| fn-0 | 3 | 2 | 0 в боевом коде (см. ниже) |

## Ошибки: файл:строка → ошибка → чей коммит

**Ошибок в боевом коде нет.**

`fn-0`: все 120 строк приходятся на `functions/src/client_reports.test.ts`. Это не ошибки кода — так устроен мой срез:

- `functions/tsconfig.json` исключает `src/**/*.test.ts` (`"exclude"`), поэтому сборка функций эти файлы не видит;
- мой срез назвал тестовый файл явно, без типов jest. Отсюда 119 ошибок `TS2304/TS2582` (`jest`, `describe`, `expect` не найдены);
- ещё одна ошибка — `TS7006` в строке 661 (`test.each(...)(…, async (studyTarget) => …)`): параметр без типа, потому что не найден тип `test.each`. Это следствие тех же отсутствующих типов jest.

Боевые `client_reports.ts` и `log_ttl.ts` — 0 ошибок.

## Только списком

- **Learning V2 (Codex):** `app/learning_v2_active_course_catalog_client_v1.ts`. Ночная правка в нём моя — мемо `bundledEnCatalogV1`, c96907f77. Срез app-11: 0 ошибок.
- **Тесты (37 файлов)** проверкой типов не покрыты: корневой `tsconfig.json` исключает `tests/`, а jest собирает их через babel без проверки типов. Их правильность подтверждают прогоны jest каждого коммита.
  - accent_graphic_token, account_provision_lock_android_runtime_entrypoint, account_wipe_owner_keys_guard, code_entry_invalid_format;
  - dev_appearance_override, dev_coins_errorscreen_appmessage, dev_dialog_send_fixture, dev_fc_lang_state, dev_links_r1_contract, dev_links_r1_selectors_exist, dev_state_r1_core_switches, dev_youtube_demo;
  - dialogs_chain7_fixes_contract, dialogue_v2_catalogue_container, dialogue_v2_session_route, dialogue_v2_voice_daily_limit;
  - energy_glass_capsule_contract, energy_ui_owner_direction_probe;
  - fc_deck_options_local_only, fc_lang_filter, flashcards_training_target_language_behavior;
  - instant_open_batch_contract, lesson_end_prewarm, light_accent_graphics_ratchet, optimistic_ui_audit_r1_contract;
  - settings_edu_voice_label_lang_contract, sound_director_prewarm_spread, store_release_dev_state_stubs;
  - support_diagnostics_attach_toggle, support_diagnostics_batched_flush, support_diagnostics_card_honest;
  - theme_first_run_default, training_setup_language_chip_contract, two_theme_new_screens_contrast, two_theme_static_colors_contract;
  - video_packs_catalog_branch, voice_display_name.

## Чего эта проверка НЕ доказывает

Срез проверяет названные файлы и всё, что они импортируют. Ошибка в файле, который ночью НЕ менялся, но зависит от изменённого (например, его потребитель), сюда не попадёт. Пример: тип стал уже, а потребитель лежит в другом месте. Это закроет утренний полный прогон `npm run typecheck`.
