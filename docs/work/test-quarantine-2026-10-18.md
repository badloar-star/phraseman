# Карантин тестов и сторожей — 18.10.2026

Решение о судьбе (вернуть / удалить) — за координатором и владельцем ПОСЛЕ релиза. Здесь ничего не удалено: тесты лежат на месте, они только не запускаются обычным прогоном.
Основание: полный прогон 5028b4273 (docs/work/full-run-red-tests-2026-10-18.md); поручение координатора 18.10 03:50: «конвейеры не этого выпуска, данные в .gitignore, файлов не было никогда — не удалять, вынести в карантин».

Механика: тесты Густава перечислены в `testPathIgnorePatterns` основного раннера (package.json). Сторож `tests/test_runner_coverage_contract.test.ts` требует, чтобы КАЖДАЯ такая запись без другого раннера была перечислена в этом файле — карантин не может стать тихим.
Вернуть тест: убрать запись из `testPathIgnorePatterns` и строку отсюда, после того как данные восстановлены (см. «Условие возврата»).

## 1. Густав FR — 19 тестов (jest)

Общая причина: французский конвейер Густава (scripts/gustav_*.mjs + docs/gustav/generated/**) — не этот выпуск. `docs/gustav/*` в `.gitignore` с коммита 1016c411a (02.07.2026), порождённые данные (`generated/fr/**`, `runs/**`) в репозитории не лежат и на чистом клоне отсутствуют (ENOENT) либо расходятся с актуальными скриптами. Тесты не менялись с июля–сентября. Четыре теста (lesson_runtime_target_isolation, french_curriculum_contract, french_vocabulary_target_gate, french_lesson_runtime_source_gate) данных Густава не читают — они утверждают строки в исходниках приложения, которые с тех пор изменились; для них «красный с момента» не определён (бисекция не делалась).
Условие возврата: данные Густава снова генерируются скриптом-источником на чистом клоне (или закоммичены), либо владелец решает удалить конвейер.
Кто вернёт: Густав (контур французского курса), решает владелец после релиза.

| Тест | Последний коммит теста | Красный с момента | Первая ошибка | Зависит от |
|---|---|---|---|---|
| gustav_lesson_runtime_target_isolation.test.ts | 401293e05 (2026-09-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toContain(expected) // indexOf | строки исходников приложения (данных Густава не читает) |
| gustav_french_curriculum_contract.test.ts | efe19ae9d (2026-09-30) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toContain(expected) // indexOf | строки исходников приложения (данных Густава не читает) |
| gustav_validator_p1a_stale_preapply.test.ts | b96be8cb7 (2026-07-02) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBe(expected) // Object.is equality | docs/gustav/runs/2026-05-19_fr_inventory_v0a1; scripts/gustav_validate_run.ts |
| gustav_flashcard_pack_generator_contract.test.ts | 9f46ea4cc (2026-07-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: Command failed: node scripts/gustav_build_flashcard_pack_genera | scripts/gustav_build_flashcard_pack_generator_contract.mjs; docs/gustav/OPERATOR.md; scripts/gustav_builder_work_orders. |
| gustav_french_vocabulary_target_gate.test.ts | efe19ae9d (2026-09-30) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toContain(expected) // indexOf | строки исходников приложения (данных Густава не читает) |
| gustav_french_app_surface_parity_v2_packet.test.ts | 1c450880c (2026-08-13) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBe(expected) // Object.is equality | docs/gustav/runs/2026-05-19_fr_inventory_v0a1; docs/gustav/runs/2026-05-19_fr_inventory_v0a1; scripts/gustav_french_app_ |
| gustav_trusted_brain_contract.test.ts | 9f46ea4cc (2026-07-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toContain(expected) // indexOf | scripts/gustav_validate_trusted_brain.mjs; docs/gustav/GUSTAV_TRUSTED_BRAIN_ARCHITECTURE.md; docs/gustav/GUSTAV_TRUSTED_ |
| gustav_fr_ai_prompt_parity_gate.test.ts | 3aba27e14 (2026-07-11) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toContain(expected) // indexOf | docs/gustav/generated/fr/ai_prompts/fr_ai_prompt_parity_gate_v1.json; scripts/gustav_build_fr_ai_prompt_parity_gate.mjs |
| gustav_fr_full_surface_closeout_work_order.test.ts | 4ccd8c4f4 (2026-08-21) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toMatchObject(expected) | docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_external_handoff_run_next_batch.ps1; docs/gustav/generated/fr/rev |
| gustav_onboarding_server_prefetch_contract_v2_packet.test.ts | 1b10225e3 (2026-08-15) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBe(expected) // Object.is equality | docs/gustav/runs/2026-05-19_fr_inventory_v0a1; docs/gustav/runs/2026-05-19_fr_inventory_v0a1; scripts/gustav_onboarding_ |
| gustav_fr_non_lesson_surface_backlog_gate.test.ts | 4ccd8c4f4 (2026-08-21) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBe(expected) // Object.is equality | docs/gustav/generated/fr/english_blueprint/fr_non_lesson_surface_backlog_gate_v1.json; scripts/gustav_build_fr_non_lesso |
| gustav_french_lesson_runtime_source_gate.test.ts | c65476519 (2026-07-03) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toContain(expected) // indexOf | строки исходников приложения (данных Густава не читает) |
| gustav_fr_lesson_llm_review_launch_contract.test.ts | d3278d400 (2026-07-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toMatchObject(expected) | docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_launch_contract_v1.json; docs/gustav/generated/fr/reviewer/fr_les |
| gustav_fr_lesson_llm_review_decision_schema_gate.test.ts | d3278d400 (2026-07-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBe(expected) // Object.is equality | docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decision_schema_gate_audit_v1.jso; scripts/gustav_validate_fr_les |
| gustav_fr_collectible_cards_v1.test.ts | d3278d400 (2026-07-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: ENOENT: no such file or directory, open 'C:\appsprojects\phrase | docs/gustav/generated/fr/collectibles; scripts/gustav_build_fr_collectible_cards_v1.mjs; scripts/gustav_generate_fr_coll |
| gustav_research_best_practices_work_order.test.ts | 553face77 (2026-08-13) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBeGreaterThanOrEqual(expected) | docs/gustav/generated/fr/research_best_practices/fr_feature_research_packets.json; docs/gustav/generated/fr/research_bes |
| gustav_feature_parity_matrix.test.ts | c65476519 (2026-07-03) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBeGreaterThanOrEqual(expected) | scripts/gustav_feature_parity_matrix.mjs; docs/gustav/generated/feature_parity/english_feature_atlas_french_gap_matrix.j |
| gustav_builder_work_orders.test.ts | 9f46ea4cc (2026-07-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: expect(received).toBeGreaterThanOrEqual(expected) | scripts/gustav_builder_work_orders.mjs; docs/gustav/generated/work_orders/fr_builder_work_orders.json; docs/gustav/OPERA |
| gustav_fr_collectible_candidate_bridge_gate.test.ts | d3278d400 (2026-07-05) | не бисектился (тест не менялся с даты слева; данные Густава в .gitignore с 02.07, 1016c411a) | Error: ENOENT: no such file or directory, open 'C:\appsprojects\phrase | docs/gustav/generated/fr/collectibles/fr_collectible_candidate_bridge_gate_v1.json; scripts/gustav_build_fr_collectible_ |

## 2. node-сторожа, не входящие в проверку выпуска (скрипты)

Это не jest-тесты, в `testPathIgnorePatterns` они не попадают; npm-скрипты и файлы остаются на месте. Не запускать их в проверке выпуска, пока не возвращены. Ни один не стоит в pre-commit.

| Сторож | Причина | С какого коммита | Условие возврата / кто вернёт |
|---|---|---|---|
| scripts/guard_runtime_lifecycle_ratchet.mjs (npm: guard:motion-ratchet) | читает tests/runtime_lifecycle_ratchet.test.ts — файла нет (ENOENT) | 39ee3db70 (26.08) | восстановить файл-базу ratchet или удалить сторож; Движение/нагрев |
| scripts/guard_achievement_art_manifest_v2.mjs | ID манифеста ≠ активному каталогу ачивок | 96c32bb97 (24.08) | каталог ачивок: 32 активных вместо ожидаемых 70; Достижения |
| scripts/guard_achievement_catalog_v2.mjs | ожидает 70 активных определений, в каталоге 32; нет проверок lig/shelf/recovery-подстрок | 96c32bb97 (24.08) | то же |
| scripts/guard_achievement_foundation_v2.mjs | ожидает 70 активных определений, получено 32 | 96c32bb97 (24.08) | то же |
| scripts/guard_learning_v2_de_task7_v2_l01_c05_das_ist_scope.mjs | нет файла docs/v2/curriculum/de/TASK7_V2_L01C05_DAS_IST_SCOPE_EVIDENCE_MANIFEST_2026-10-13.json | 7a97f2fd7 (13.10) | немецкий курс не этого выпуска; Learning V2 DE |
| scripts/guard_learning_v2_de_task7_v2_l01_c06_hausmeister_scope.mjs | нет файла docs/v2/curriculum/de/TASK7_V2_L01C06_HAUSMEISTER_SCOPE_EVIDENCE_MANIFEST_2026-10-13.json | 7a97f2fd7 (13.10) | то же |

Не в карантине (красный по замыслу, не мёртвый): scripts/guard_global_broadcast_privacy_rules_rollout.mjs — блокирует выкладку правил до порядка выката; scripts/release_precheck.mjs — PARITY-GATE (несверенные экраны) — это настоящий гейт выпуска.

## 3. Тесты V2, падающие на среде — 2 теста

Передал V2 (координатор 18.10 03:56). Это не контент и не дефект выпущенных уроков: тесты рендерят компоненты, а нужных подмен ни в основном раннере, ни в раннере RNTL у них нет. Проверено 18.10:
- основной раннер: подмена react-native без `StyleSheet` — `Cannot read properties of undefined (reading 'create')`; `@expo/vector-icons/Ionicons` и `react-native-gesture-handler` — ESM, «Cannot use import statement outside a module»;
- раннер RNTL: `genericDirectEventTypes` (gesture-handler) и `EventEmitter` (expo-modules-core через vector-icons) — нужны подмены в самом тесте, как у остальных RNTL-тестов.
Общую подмену в настройку раннера не добавлял: 56 файлов тестов трогают vector-icons, у многих свои подмены с разными фабриками на одном пути — общая подмена изменила бы их поведение.
Условие возврата: V2 добавляет в сам тест локальные подмены (Ionicons, gesture-handler, StyleSheet), переносит тест в раннер RNTL и убирает запись из `testPathIgnorePatterns`.

| Тест | Ошибка | Кто вернёт |
|---|---|---|
| learning_v2_mode_router_family_coverage.test.ts | основной: StyleSheet.create в LearningV2Glass; RNTL: нет подмены Ionicons | V2 |
| learning_v2_session_skip_interaction.test.ts | основной: gesture-handler ESM; RNTL: genericDirectEventTypes | V2 |

## 4. V2 — после релиза, сводка V2 03:55

Полная пофайловая таблица V2 — `docs/work/test-quarantine-v2-2026-10-18.md` (af59cead2); сторож раннера читает её и сверяет: каждый тест оттуда исключён из основного раннера. Класс Б (дефект выпущенных занятий) = 0: проба V2 по всем 441 занятиям — все открываются, доставка published_mp3, пропусков озвучки 0. Решение о судьбе — координатор/владелец после релиза.

Группы (слова V2):
- (а) 31 файл, проверяющий старый исходник `modules/learning-v2/content/source`: episode_01_*_source, session_map, to_be_only, 33_40_intro_data. Не менялся с 01.10, в выпуск не идёт.
- (б) lesson1_chapter_gate, lesson1_real_session_mock — старый authored_sessions_v1.
- (в) authored_sessions_reach_the_player, es_bundle_reachability — испанский V2 скрыт (D129).
- (г) generator_course_manifest, generator_session_shard, session_compiler, session_contract, p0_p1_smoke, e1_content_compiler — модель «12 сессий».
- (д) english_l4_curriculum_contract.
- (е) около 10 фикстур эпизода 1 (course_session_*, neutral_qa_*, activity_*: client_child_invalid, mode_native_payload_invalid).
- (ж) lesson_map_screen_contract, listen_choose_option_label_v1, lexical_density_policy_v2; устаревшие проверки intro_theme_contract, intro_reader_fixture_contract, content_quality_gate_wiring.
- voice_physical_device_runner_v1 — контур «Голос», после релиза, сперва логи (мок вызван 0 раз вместо 1).

НЕ в карантине (остаются в обычном прогоне): `learning_v2_session_intro_feedback_behavior` — зелёный после гейта журнала [INTRO-BLUR] (18.10); `new_word_encounter_projection_v1`, `all_ready_tasks_runtime_audit` — перепин V2 сделан; `factory_production_audio_contract`, `factory_native_projection_v1` — перепины лежат в рабочей копии V2 (файлы не трогаю). Если до коммита V2 они красные — это красные V2, а не карантин.
