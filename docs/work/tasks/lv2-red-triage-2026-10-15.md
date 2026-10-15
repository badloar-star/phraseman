# Learning V2 — разбор красных тестов к сборке (15.10)

> Только анализ, без правок рантайма V2 и контента Codex. Прогон заново на HEAD `2c53be6f4` (maxWorkers=1): из 71 красного
> файла полного прогона `fef40e826` позеленели 2, красных 69. ⚠️ В рабочем дереве в момент прогона лежал **незакоммиченный WIP Codex**
> (generated_release en/l01/s16+, factory_native catalog/manifest, audio — ~665 изменённых путей V2), поэтому контентные
> тесты частично отражают WIP, а не HEAD.

## Главное для сборки

**Ворота EAS** — `package.json` → `eas-build-post-install` → `node scripts/learning_v2_plan_b_gates.mjs`. Он запускает два скрипта
(не тесты): №3 `scripts/learning_v2_release_parity_gate.mjs` и №4 `scripts/learning_v2_audio_coverage_gate.mjs`
(то же в `scripts/release_precheck.mjs:126`). Тесты из этой таблицы в ворота сборки не входят.

| Гейт | Потолок 15 (закоммичен, `app/learning_v2_bundle_availability_v1.generated.ts:4`) | Потолок 145 (сгенерирован на WIP в дереве) |
|---|---|---|
| №3 выпуск = исходник | ✅ PASS, код 0. Расхождение исходник ↔ выпуск — 135, справка (выпуск принят владельцем 15.10) | ❌ код 1: «release quality evidence: BLOCKED — 990 блокирующих, 1321 AUDIO_EVIDENCE_UNVERIFIED» с en:lesson-01:session-16 |
| №4 озвучка | ✅ (в 48e9a2993: 15/15) | ✅ OK: 145 собираются из бандла, problems 0 |

🔴 **Риск сборки:** потолок «прыгает». Генератор на рабочем дереве с WIP Codex переписывает его на 145: файл менялся в 22:19,
сейчас снова 15 = HEAD. EAS собирает рабочую папку, а не коммит. Если в момент сборки в дереве окажется потолок 145, гейт №3
упадёт: у занятий 16+ нет квитанций озвучки (AUDIO_EVIDENCE). Перед `eas build`:
`grep CEILING_V1 app/learning_v2_bundle_availability_v1.generated.ts` должен показать **15**, и
`node scripts/learning_v2_plan_b_gates.mjs` — «гейты №3/№4 зелёные». Запасной путь — план Б (`PHRASEMAN_R1_HIDE_V2=1` + рубильник).

## Позеленели на HEAD
- `learning_v2_released_audio_completeness_guard`
- `learning_v2_accepted_green_prefix_runtime`

## Группы
- **(а) гейты сборки и их зеркала** — 6. Проверяют то, что уходит в бандл (потолок, озвучка, подпись выпуска). В воротах EAS их нет:
  там только скрипты выше. Почти все привязаны к прежнему потолку или озвучке — обновить ожидания под выпуск 15 / «один голос».
- **(б) устаревшие сторожа** под новый контент Codex, режим «один голос», ужесточённый контракт 48e9a2993, новые темы, удалённые экраны — 60.
- **(в) похожие на реальные регрессии рантайма** — 3. Проверены: регрессий нет, все три — устаревшие тесты (итого (б) 63).

### (а) гейты сборки и их зеркала
| Файл | Упавших | Где | Причина |
|---|---|---|---|
| learning_v2_new_word_encounter_projection_v1 | 2 | `tests/learning_v2_new_word_encounter_projection_v1.test.ts:65` | ждёт 198 карточек слов по выпущенным занятиям, есть 57 — сторож привязан к прежнему потолку, выпуск теперь 15 |
| lesson1_release_parity | 1 | `tests/lesson1_release_parity.test.ts:11` | подпись выпуска s01 в бандле ≠ закреплённой; s01 перевыпущен в 48e9a2993 (принят владельцем) — закрепку обновить |
| learning_v2_authored_sessions_reach_the_player | 2 | `tests/learning_v2_authored_sessions_reach_the_player.test.ts:33` | потолок бандла «честный» ждёт 14, собирается 13 — потолок и авторский набор разошлись (WIP Codex s16+ в дереве) |
| learning_v2_factory_native_projection_v1 | 1 | `tests/learning_v2_factory_native_projection_v1.test.ts:342` | проекция factory-native урока 1 не сходится с контрактом — перепроверить на чистом дереве (в дереве WIP s16+) |
| learning_v2_remote_audio_pack_contract | 1 | `tests/learning_v2_remote_audio_pack_contract.test.ts:106` | состав удалённого аудиопакета ≠ ожидаемому [1,4] — озвучка «один голос» поменяла пакеты |
| learning_v2_es_bundle_reachability_guard | 1 | `tests/learning_v2_es_bundle_reachability_guard.test.ts:34` | испанских занятий внутри потолка 0 — выпуск только EN (решение 15.10); сторож ждёт ES > 0 |

### (б) устаревшие сторожа
| Файл | Упавших | Где | Причина |
|---|---|---|---|
| learning_v2_lesson1_chapter_gate | 2 | `tests/learning_v2_lesson1_chapter_gate.test.ts:28` | скрипт главы урока 1 (авторский конвейер) завершается кодом 1 на WIP-исходниках |
| learning_v2_lesson1_real_session_mock | 1 | `tests/learning_v2_lesson1_real_session_mock.test.ts:27` | скрипт мок-сессии урока 1 (авторский конвейер) завершается кодом 1 на WIP-исходниках |
| learning_v2_episode_01_sessions_33_40_source | 4 | `tests/learning_v2_episode_01_sessions_33_40_source.test.ts:7`<br>`modules/learning-v2/content/source/episode_01_sessions_33_40_support_v1.ts:2077` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_sessions_25_32_source | 12 | `tests/learning_v2_episode_01_sessions_25_32_source.test.ts:5`<br>`modules/learning-v2/content/source/episode_01_sessions_25_32_support_v1.ts:2434` | ждёт 15 карточек, в исходнике 9 — новый формат Codex (12 проверок) |
| learning_v2_episode_01_sessions_49_56_source | 1 | `tests/learning_v2_episode_01_sessions_49_56_source.test.ts:12`<br>`modules/learning-v2/content/source/episode_01_sessions_49_56_support_v1.ts:85` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_sessions_41_48_source | 1 | `tests/learning_v2_episode_01_sessions_41_48_source.test.ts:26`<br>`modules/learning-v2/content/source/episode_01_sessions_41_48_support_v1.ts:83` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_session_17_source | 10 | `tests/learning_v2_episode_01_session_17_source.test.ts:12`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:549` | ждёт 15 карточек, в исходнике 9 — новый формат Codex (10 проверок) |
| learning_v2_episode_01_session_11_source | 8 | `tests/learning_v2_episode_01_session_11_source.test.ts:9`<br>`modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts:1193` | ждёт 15 карточек на занятие, в новом исходнике 4 — формат занятий Codex сменился |
| learning_v2_episode_01_session_23_source | 1 | `tests/learning_v2_episode_01_session_23_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:549` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_session_22_source | 1 | `tests/learning_v2_episode_01_session_22_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:549` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_session_20_source | 1 | `tests/learning_v2_episode_01_session_20_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:549` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_session_21_source | 1 | `tests/learning_v2_episode_01_session_21_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:549` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_session_24_source | 1 | `tests/learning_v2_episode_01_session_24_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:551` | ждёт 5 элементов, в исходнике 3 — новый формат Codex |
| learning_v2_episode_01_session_16_source | 1 | `tests/learning_v2_episode_01_session_16_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts:1210` | ждёт 5 элементов, в исходнике 3 — новый формат Codex |
| learning_v2_episode_01_session_18_source | 1 | `tests/learning_v2_episode_01_session_18_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:549` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_session_05_source | 2 | `tests/learning_v2_episode_01_session_05_source.test.ts:12` | в исходнике S05 есть [[NEEDS_TRANSLATION]] (WIP Codex); в выпущенном generated_release и в app — нет (проверено git grep HEAD) |
| learning_v2_episode_01_session_14_source | 1 | `tests/learning_v2_episode_01_session_14_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts:1193` | ждёт 15 карточек, в исходнике 6 — новый формат Codex |
| learning_v2_episode_01_session_12_source | 1 | `tests/learning_v2_episode_01_session_12_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts:1193` | ждёт 15 карточек, в исходнике 4 — новый формат Codex |
| learning_v2_episode_01_session_19_source | 1 | `tests/learning_v2_episode_01_session_19_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts:549` | ждёт 15 карточек, в исходнике 9 — новый формат Codex |
| learning_v2_episode_01_session_15_source | 1 | `tests/learning_v2_episode_01_session_15_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts:1193` | ждёт 15 карточек, в исходнике 6 — новый формат Codex |
| learning_v2_episode_01_session_06_source | 1 | `tests/learning_v2_episode_01_session_06_source.test.ts:7` | закреплён старый id одобрения, исходник — новый packet Codex |
| learning_v2_episode_01_session_03_source | 1 | `tests/learning_v2_episode_01_session_03_source.test.ts:7` | закреплён старый id одобрения, исходник — новый packet Codex |
| learning_v2_session_compiler | 1 | `tests/learning_v2_session_compiler.test.ts:18` | ждёт 12 занятий в уроке, курс теперь 56 на урок |
| learning_v2_episode_01_session_07_source | 1 | `tests/learning_v2_episode_01_session_07_source.test.ts:7` | закреплён старый id одобрения, исходник — новый packet Codex |
| learning_v2_episode_01_session_09_source | 1 | `tests/learning_v2_episode_01_session_09_source.test.ts:7` | закреплён старый id одобрения, исходник — новый packet Codex |
| learning_v2_episode_01_session_01_source | 1 | `tests/learning_v2_episode_01_session_01_source.test.ts:7` | закреплён старый id одобрения (hash 746b…), в исходнике новый packet id Codex (owner-word-first-rewrite) |
| learning_v2_episode_01_session_13_source | 1 | `tests/learning_v2_episode_01_session_13_source.test.ts:4`<br>`modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts:1193` | ждёт 15 карточек, в исходнике 6 — новый формат Codex |
| learning_v2_episode_01_session_02_source | 1 | `tests/learning_v2_episode_01_session_02_source.test.ts:7` | закреплён старый id одобрения, исходник — новый packet Codex |
| learning_v2_episode_01_session_10_source | 1 | `tests/learning_v2_episode_01_session_10_source.test.ts:7` | закреплён старый id одобрения, исходник — новый packet Codex |
| learning_v2_episode_01_session_04_source | 1 | `tests/learning_v2_episode_01_session_04_source.test.ts:7` | закреплён старый id одобрения, исходник — новый packet Codex |
| learning_v2_course_session_audio_release_extension_v1 | 2 | `tests/learning_v2_course_session_audio_release_extension_v1.test.ts:33`<br>`modules/learning-v2/contracts/mode_native_payload_v1.ts:312` | фикстура старой формы payload; контракт ужесточён в 48e9a2993 (reveal policy, feedback без correct) — mode_native_payload_v1.ts:312 |
| learning_v2_course_lesson_audio_release_index_v1 | 2 | `tests/learning_v2_course_lesson_audio_release_index_v1.test.ts:63`<br>`modules/learning-v2/contracts/mode_native_payload_v1.ts:312` | та же устаревшая фикстура payload (mode_native_payload_v1.ts:312) |
| learning_v2_all_ready_tasks_runtime_audit | 1 | `tests/learning_v2_all_ready_tasks_runtime_audit.test.ts:64` | аудит ждёт режим listen_choose у задания — режимы заданий в новом контенте другие |
| learning_v2_generator_course_manifest | 1 | `tests/learning_v2_generator_course_manifest.test.ts:130` | ждёт 256 записей манифеста, есть 288 — курс расширен |
| learning_v2_generator_session_shard | 5 | `tests/learning_v2_generator_session_shard.test.ts:205`<br>`modules/learning-v2/content/generator_session_shard.ts:209` | старый формат шарда (15 карточек, 8 локалей) отвергается generator_session_shard.ts — новый формат Codex |
| learning_v2_session_contract | 1 | `tests/learning_v2_session_contract.test.ts:50` | ждёт 12 обязательных занятий в трёх зонах — форма курса сменилась (56) |
| learning_v2_activity_released_session_submission_spool_v2 | 2 | `tests/learning_v2_activity_released_session_submission_spool_v2.test.ts:?`<br>`modules/learning-v2/progress/activity_released_session_submission_v2.ts:131` | фикстура отправки занятия не проходит валидатор (код валидатора не менялся 9 недель) — данные курса сменились |
| learning_v2_neutral_qa_session_e2e_harness_v1 | 10 | `tests/learning_v2_neutral_qa_session_e2e_harness_v1.test.ts:117`<br>`modules/learning-v2/runtime/course_session_client_children_v1.ts:218` | фикстура children-клиента старой формы; валидатор ужесточён в 48e9a2993 (course_session_client_children_v1.ts:218) |
| learning_v2_p0_p1_smoke | 1 | `tests/learning_v2_p0_p1_smoke.test.ts:77` | ждёт артефакт 12×12, курс теперь 56 занятий |
| learning_v2_neutral_qa_hostile_red_matrix_v1 | 8 | `tests/learning_v2_neutral_qa_hostile_red_matrix_v1.test.ts:49`<br>`modules/learning-v2/runtime/course_session_client_children_v1.ts:218` | та же устаревшая фикстура children-клиента |
| learning_v2_factory_production_audio_contract | 1 | `tests/learning_v2_factory_production_audio_contract.test.ts:50` | сторож ищет текст лога «[V2-BUNDLED] null step=audio_child»; файл озвучки переписан в 48e9a2993 и WIP — проверить, что ранний выход всё ещё пишет причину |
| learning_v2_activity_post_terminal_card_catalog_v1 | 3 | `tests/learning_v2_activity_post_terminal_card_catalog_v1.test.ts:140`<br>`modules/learning-v2/runtime/activity_post_terminal_card_catalog_v1.ts:104` | каталог карточек «после занятия»: значения в новом контенте не проходят валидатор (код 9 недель без изменений) |
| learning_v2_mode_feedback_v1 | 1 | `tests/learning_v2_mode_feedback_v1.test.ts:36` | обращается к feedback старой формы (responseId у undefined); в 48e9a2993 feedback ученика без поля correct, вердикт — у локального оценщика |
| learning_v2_intro_semantic_runs_contract | 2 | `tests/learning_v2_intro_semantic_runs_contract.test.ts:35`<br>`modules/learning-v2/runtime/course_session_client_children_v1.ts:218` | та же устаревшая фикстура children-клиента |
| learning_v2_course_session_save_card_v1 | 1 | `tests/learning_v2_course_session_save_card_v1.test.ts:27`<br>`modules/learning-v2/runtime/course_session_client_children_v1.ts:218` | та же устаревшая фикстура children-клиента |
| learning_v2_course_session_completed_spool_v1 | 2 | `tests/learning_v2_course_session_completed_spool_v1.test.ts:25`<br>`modules/learning-v2/runtime/course_session_client_children_v1.ts:218` | та же устаревшая фикстура children-клиента |
| learning_v2_episode_01_session_map | 1 | `tests/learning_v2_episode_01_session_map.test.ts:46` | карта занятий: грамматика вводится повторно — новая карта Codex |
| learning_v2_episode_01_sessions_33_40_intro_data | 1 | `tests/learning_v2_episode_01_sessions_33_40_intro_data.test.ts:25` | испанское интро упоминает «урок/курс» — правило текста интро; контент Codex |
| learning_v2_course_session_audio_readback_v1 | 2 | `tests/learning_v2_course_session_audio_readback_v1.test.ts:17`<br>`modules/learning-v2/contracts/mode_native_payload_v1.ts:312` | та же устаревшая фикстура payload (mode_native_payload_v1.ts:312) |
| learning_v2_voice_physical_device_runner_v1 | 2 | `tests/learning_v2_voice_physical_device_runner_v1.test.ts:193` | dev-раннер проверки голоса на устройстве: воспроизведение не вызвано — сменился путь озвучки «один голос»; в стор-сборку не входит |
| learning_v2_intro_theme_contract | 1 | `tests/learning_v2_intro_theme_contract.test.ts:46` | ждёт 9 тем, в приложении +8 новых (работа «Темы») |
| learning_v2_e1_content_compiler | 1 | `tests/learning_v2_e1_content_compiler.test.ts:49` | компилятор E1 под старую семантику 12 занятий |
| learning_v2_episode_01_to_be_only | 1 | `tests/learning_v2_episode_01_to_be_only.test.ts:136` | «copula_be» вводится в сессиях 1 и 9 — новая карта Codex |
| learning_v2_content_quality_gate_wiring | 1 | `tests/learning_v2_content_quality_gate_wiring.test.ts:13` | ищет константу LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1; сам вызов assertLearningV2SessionContentQuality на месте (authored_sessions_v1.ts:539) — гейт не обойдён |
| learning_v2_intro_reader_fixture_contract | 1 | `tests/learning_v2_intro_reader_fixture_contract.test.ts:10` | ищет текст «!DEV_MODE && !ENABLE_DEV_TOOLS»; защита есть в другой форме — if (!ENABLE_DEV_TOOLS) Redirect (intro-reader-fixture.tsx:142), в стор-сборке гасится |
| learning_v2_session_skip_interaction | 0 | `tests/learning_v2_session_skip_interaction.test.ts:215`<br>`src/RNGestureHandlerModule.ts:4` | jest не разбирает react-native-gesture-handler (нет мока) — плеер стал импортировать жесты; инфраструктура теста |
| learning_v2_listen_choose_option_label_v1 | 0 | `tests/learning_v2_listen_choose_option_label_v1.test.ts:?` | файл теста пуст («must contain at least one test») — заглушка |
| learning_v2_lesson_map_screen_contract | 0 | `tests/learning_v2_lesson_map_screen_contract.test.ts:11` | экран app/learning-v2/lesson/[id].tsx удалён намеренно (5bef1e710, 12 дней назад) — тест удалить |
| learning_v2_lexical_density_policy_v2 | 0 | `tests/learning_v2_lexical_density_policy_v2.test.ts:?` | файл теста пуст — заглушка |
| learning_v2_english_l4_curriculum_contract | 0 | `tests/learning_v2_english_l4_curriculum_contract.test.ts:57` | l4_exact_lexical_assignment_by_session — лексика урока 4 у Codex поменялась |

### (в) похоже на реальные регрессии рантайма — проверено 15.10 поздно вечером: все три НЕ регрессии, перенесены в (б)
| Файл | Упавших | Где | Вывод после проверки |
|---|---|---|---|
| learning_v2_new_word_encounter_save_v1 | 1 | `tests/learning_v2_new_word_encounter_save_v1.test.ts:76` | **(б).** Слово сохраняется: «added» → «saved» → «duplicate» проходят. Проба записей хранилища: `phraseman_stable_uid_cache`, затем `app_health_*`, затем `custom_flashcards_v2` с карточкой (en «ready», ru, транскрипция, sourceId). Тест берёт ПЕРВУЮ запись (`setItem.mock.calls[0]`) и считает её карточками, а первой теперь пишется стабильный id. У ученика слова не теряются. |
| learning_v2_session_launch_r09 | 1 | `tests/learning_v2_session_launch_r09.test.ts:71` | **(б).** Индикатор цел: `setLaunchInFlight(true)` до ожидания, `false` в finally (`app/learning_v2_home_continue_route.ts:55,82`). R08 (08b9e168e) добавил в `prepareLearningV2SessionRunV1` уступку кадра `setTimeout(0)` и `import()` клиента до вызова prepare (`app/learning_v2_session_launch_v1.ts:89-96`). Тест зовёт `finishPrepare` до того, как мок вызван. Тест надо прокрутить таймеры. |
| learning_v2_intro_colour_bridge | 2 | `tests/learning_v2_intro_colour_bridge.test.ts:15` | **(б), намеренно.** Не 48e9a2993: мост `app/learning_v2_intro_semantic_bridge.ts:73` с 26.08 (50eea79a4) отдаёт tone «danger» как plain. Зачёркивание — только по явной разметке `semantic="targetWrong"`: «danger — указание палитры, не лингвистическое доказательство» (шапка файла). Тест от аудита 23.08 ждёт старое правило. |


### Сводный список «похоже на регрессию» (мои три + раздел Ядра «22:25»), без дублей — 15.10 поздно вечером
| Пункт | Источник | Вывод | Что сделано |
|---|---|---|---|
| Подсветка ошибочного примера в интро (`intro_colour_bridge`) | оба | Правило с 26.08 (50eea79a4): danger → plain, зачёркивание только по `semantic="targetWrong"` | Тест переписан под правило + позитивные случаи, 212de545e |
| «Готовим» на «Продолжить» (`session_launch_r09`) | САЙТ | Индикатор цел; R08 сдвинул вызов prepare за уступку кадра и import() | Тест ждёт вызов prepare и проверяет, что «готовим» горит весь отрезок, 212de545e |
| Сохранение «нового слова» (`new_word_encounter_save_v1`) | САЙТ | Слова сохраняются; первой пишется стабильный id | Тест ищет записи по ключу `custom_flashcards_v2`, 212de545e |
| Карточки слов 198 → 57 (`new_word_encounter_projection_v1:65`) | Ядро | **(а), не чинить.** Проба по 56 занятиям: карточки есть только в s01–s15 (4,3,3,4,4,3,4,0,4,3,4,4,6,4,7 = 57; s08 — контрольная без новых слов), s16–s56 собираются без карточек и лежат за потолком выпуска 15. «198 на 56 занятий» — факт релиза 01.10. | — |
| `mode_feedback_v1` S01 | Ядро | Файл теста сейчас переписывается другой сессией: 211 незакоммиченных строк, в том числе этот случай — «верное: коротко «Верно.», без авторского текста». Падение в моём прогоне — на их WIP. | Не трогал (правило общего дерева) |

## Что делать (предложение Ядру)
1. Перед сборкой: потолок = 15 в дереве и зелёный `learning_v2_plan_b_gates.mjs`. Не собирать с WIP Codex, который переписывает потолок.
2. (в) снята: все три проверены, регрессий рантайма нет, тесты устарели (см. таблицу выше). Чинить тесты — вместе с (б), после сборки.
3. (а): обновить ожидания под выпуск 15 и «один голос» (владелец Codex / Ядро). Сборку не держат.
4. (б): массовая чистка сторожей после стабилизации контента Codex. Сборку не держат. Удалить тест экрана карты урока, заполнить или удалить пустые файлы.

Сырые данные: `C:/Temp/claude/lv2_rerun.json`, `lv2_lines.tsv`, логи гейтов `gate_learning_v2_*.log`, `gate_parity2.log`.
