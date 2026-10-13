# PM-216 — обмер стор-бандла Android (репетиция 13.10, Ядро)

Задание координатора 13.10: обмер сейчас, не 16.10; размер, топ-30 модулей, список «недостижимо в стор-сборке — убрать» с оценкой.
**Ничего не удалено** — список ждёт «ок» координатора.

## Как мерили

- Стор-экспорт под светофором: `EXPO_PUBLIC_STORE_RELEASE=1` + env профиля `production` из eas.json
  (`EXPO_PUBLIC_AI_DIALOG_ENABLED`, `EXPO_PUBLIC_EXPLAIN_ENABLED`), `--platform android --output-dir dist-store --source-maps`, 77 с.
- Топ модулей — второй экспорт с `--no-bytecode` (во временную папку сессии, 45 с): карта Hermes `.hbc` привязана к функциям,
  а не к байтам, и приписывала 16 МБ одному `renderRootComponent` — для разбивки по модулям она не годится. Доли ниже — от
  размеченного JS (31,9 МБ); в байткоде модуль весит примерно ту же долю от 28,8 МБ.
- `node scripts/pm216_release_size_report.mjs dist-store`, `node scripts/pm220_perf_gates.mjs bundle dist-store`.

## Размер

| | 03.10 (база, `PM-216_bundle_before_after_2026-10-03.md`) | 13.10 | Δ |
|---|---:|---:|---:|
| android JS (Hermes) | 36,47 МБ | **28,79 МБ** (30 185 000 Б) | **−7,68 МБ (−21 %)** |
| android JS gzip | 13,95 МБ | 11,64 МБ | −2,31 МБ |
| ассеты в экспорте | 97 шт., 1,94 МБ | 28 шт., 0,60 МБ | см. примечание |

Бюджет PM-220 (`config/perf-budgets.json`): android в бюджете (JS 30,19 / 37,47 МБ, gzip 12,20 / 14,29 МБ). Итог гейта «РЕГРЕССИЯ»
только потому, что iOS в обмере нет (без Mac/EAS не экспортировалась).

Примечание об ассетах: экспорт кладёт в `metadata.json` только ресурсы из `updates.assetPatternsToBeBundled` (`app.config.js`).
Это не всё, что встраивается в установочный файл: встраивание определяет манифест релизной сборки (память 03.10 — 467 ресурсов).
Размер ассетов приложения этим отчётом не меряется — только JS.

## Топ-30 модулей (JS без байткода)

| # | КБ | Доля | Модуль |
|---:|---:|---:|---|
| 1 | 2942 | 9,4 % | `modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts` |
| 2 | 1795 | 5,7 % | `components/lesson_help_theory_data.tsx` |
| 3 | 1020 | 3,3 % | `app/idioms_data.ts` |
| 4 | 832 | 2,7 % | `app/lesson_data_25_32.ts` |
| 5 | 737 | 2,4 % | `@revenuecat/purchases-js-hybrid-mappings` (index.umd.js) |
| 6 | 573 | 1,8 % | `app/lesson_data_17_24.ts` |
| 7 | 541 | 1,7 % | `app/lesson_intro_screens_en_17_32.ts` |
| 8 | 506 | 1,6 % | `app/lesson_data_9_16_phrases_es.gen.ts` |
| 9 | 503 | 1,6 % | `app/learning_v2_factory_lesson_audio_index_v1.generated.ts` |
| 10 | 489 | 1,6 % | `app/learning_v2_factory_production_audio_entries_v1.generated.ts` |
| 11 | 453 | 1,4 % | `app/lesson_data_1_8_phrases_es.gen.ts` |
| 12 | 294 | 0,9 % | `app/lesson_words.tsx` |
| 13 | 279 | 0,9 % | `app/phrase_audio_url_map.generated.ts` |
| 14 | 221 | 0,7 % | `app/paywall_copy.ts` |
| 15 | 209 | 0,7 % | `app/lesson_intro_screens_es_l2.ts` |
| 16 | 191 | 0,6 % | `app/ai_dialog_scenarios.ts` |
| 17 | 182 | 0,6 % | `modules/learning-v2/content/factory_native/factory_native_catalog_v1.generated.ts` |
| 18 | 181 | 0,6 % | `modules/learning-v2/content/source/es_episode_01_session_01_localized_details_v1.ts` |
| 19 | 162 | 0,5 % | `app/preposition_explanations.ts` |
| 20 | 151 | 0,5 % | `app/lesson1_smart_options.ts` |
| 21 | 126 | 0,4 % | `app/lesson_words_source_locales.ts` |
| 22 | 124 | 0,4 % | `components/CleanOnboarding.tsx` |
| 23 | 118 | 0,4 % | react-native `ReactNativeRenderer-prod.js` |
| 24 | 116 | 0,4 % | `app/flashcards_swipe.tsx` |
| 25 | 115 | 0,4 % | react-native `ReactFabric-prod.js` |
| 26 | 111 | 0,4 % | `app/notifications.ts` |
| 27 | 110 | 0,4 % | `app/cloud_sync.ts` |
| 28 | 106 | 0,3 % | `app/exam.tsx` |
| 29 | 106 | 0,3 % | `app/dialogue_language_packs.ts` |
| 30 | 98 | 0,3 % | `app/(tabs)/lessons.tsx` |

По группам: `modules/learning-v2` 5,0 МБ (16 %), `app/flashcards` 0,70 МБ, react-native 0,68 МБ, reanimated 0,66 МБ,
`modules/account-session-v2` 0,28 МБ, posthog (core + RN) 0,42 МБ.

## Недостижимо в стор-сборке R1 — кандидаты «убрать» (НЕ удалено, ждёт «ок»)

| # | Что | JS | ≈ байткода | Почему недостижимо | Как убрать | Риск |
|---|---|---:|---:|---|---|---|
| А | Испанский учебный контент: `lesson_data_*_phrases_es.gen.ts`, `lesson_intro_screens_es_l2.ts`, `modules/learning-v2/content/source/es_episode_01_*` (17 файлов) | 1,61 МБ (5,0 %) | ≈ 1,4 МБ | уроки и Learning V2 для es скрыты (D129, `learning_language_surface_readiness.ts`) | ленивая загрузка через аксессор реестра (Performance Bible: «контент лениво/с сервера»), не удаление: таблица готовности может включить es | средний — `lesson_data_1_8.ts` и `legacy_lesson_payload.ts` импортируют статически |
| Б | Learning V2 целиком (207 файлов: фабричные манифесты, аудио-индексы, плеер) — **только если 15.10 выберут план Б** (`PHRASEMAN_R1_HIDE_V2=1`) | 6,57 МБ (20,6 %) | ≈ 5,9 МБ | при плане Б раздел скрыт | заглушка модулей V2 в стор-режиме сборщика по флагу | высокий — решение владельца 15.10; пересекается с А на 0,29 МБ |
| В | Dev-код без заглушки: `components/dev/DevHubSheet.tsx` + `devToolRegistry.ts`, `app/_dev_cancel_flow_preview.tsx`, `dev_youtube_demo`, `dev_energy_tools`, `dev_dialog_send`, `dev_today_tasks`, `dev_fc_lang_state`, `dev_overlays_off`, `dev_robot_display`, `dev_ai_consent`, `dev_as_free_flag`, `dev_practice_runes_seed`, `dev_year_activity`, `dev_plus_controls`, `friends_together/dev_bots` и др. (56 файлов) | 0,12 МБ (0,4 %) | ≈ 0,1 МБ | закрыты рантайм-проверками `__DEV__`/`IS_STORE_RELEASE`/`ENABLE_DEV_TOOLS` | добавить в список заглушек стор-режима (`storeReleaseDevStateStubs` / `storeReleaseDevModules`) | низкий; выгода — гигиена, не размер |

Что **достижимо** и не убирается: `lesson_help_theory_data` (справка уроков, en), `idioms_data` (фраза дня: `daily_phrase_system`,
`idioms_lazy`), `ai_dialog_scenarios` (каталог Диалогов V2 тоже на нём), `phrase_audio_url_map`, RevenueCat hybrid-mappings
(часть SDK покупок), posthog.

Мелочь, найденная по пути: `dev_practice_runes_seed.readDevPracticeRunesFakeState` читает параметр ссылки `devRunesSeed` без
проверки сборки — в стор-сборке ссылка `phraseman://…?devRunesSeed=x` покажет поддельный стартовый счётчик рун до чтения копилки.
На деньги не влияет (зачёт идёт из копилки на диске, `settlePracticeRuneEarnings`), закрывается пунктом В.

## Гейты стор-экспорта (шаг 8 R1_RUNBOOK)

Первый настоящий экспорт показал два **ложных** отказа; оба гейта — зона Ядра, исправлены точнее, а не мягче:

- `[STORE-BUNDLE-DEV]`: «[DEV-STATE]» — общий префикс журналов в dev-ветках 58 боевых файлов; в `.hbc` остались 2 такие строки
  (Карточки-сообщество, опрос настроек), а сами dev-модули были подменены. Теперь: точная проверка по source map — ни одного
  настоящего модуля из 17 заглушек сборщика среди источников бандла (карта обязательна, без неё — отказ); маркеры
  `dev_vip_override`, `HUB-LIFECYCLE` проверяются байтово как раньше. На экспорте 13.10 — **OK**.
- `[DPK-GATE]`: «0 dpk в metadata.json» — следствие фильтра `assetPatternsToBeBundled`, а не потеря пакетов. Теперь: бандл обязан
  регистрировать каждый пакет с md5 текущего файла (`registerAsset.hash`); встраивание — по манифесту релизной сборки (как было).
  На экспорте 13.10 — **OK** (хэши es/de/it в `.hbc` найдены).

Команда экспорта в день сборки — с `--source-maps` (шапка `scripts/store_bundle_dev_strings_gate.mjs`, R1_RUNBOOK шаг 8).
