# PM-216 — обмер release-бандла до/после и что в нём недостижимо (2026-10-03)

Метод: `git archive <коммит>` в одноразовую папку вне репозитория, `npx expo export --platform ios --platform android`
(релизный режим: minify + Hermes bytecode, `node_modules` общие), затем `node scripts/pm216_release_size_report.mjs <каталог>`.
Под светофором (слот), ничего не публиковалось. Профиль: Windows, 12 ГБ свободной памяти, `--max-old-space-size=8192`.

## Размер до/после (JS = Hermes bytecode, assets = то, что перечислено в metadata.json экспорта)

| | до: `dc2c79ff2` | после: HEAD (≈ `8917963d6`) | Δ |
|---|---:|---:|---:|
| android JS | 36 465 752 Б | 36 452 788 Б | −12 964 Б (−0,04 %) |
| android JS gzip | 13 945 818 Б | 13 938 812 Б | −7 006 Б |
| ios JS | 36 451 442 Б | 36 441 805 Б | −9 637 Б (−0,03 %) |
| ios JS gzip | 13 942 182 Б | 13 936 638 Б | −5 544 Б |
| ассеты (обе платформы) | 97 шт., 1 940 652 Б | 97 шт., 1 940 652 Б | 0 |

«До» — коммит перед сегодняшним удалением клиентского каталога подарков (`level_gift_system`, `theme_gift_pool`),
мёртвых `prepare*RunePurchase`, правками админки и политики. Вывод цифры: **это уборка репозитория, а не бандла** (почему — ниже).
Установочные файлы (AAB/APK, IPA) в этот обмер не входят: iOS-файл без Mac/EAS не получить; единственный локальный release-APK
(x86_64, 02.10) — 68 476 799 Б, он старее сегодняшних изменений и для сравнения «до/после» не годится.

## Почему удаление мёртвого кода почти не меняет бандл

1. `router.ctx.js` собирает маршруты ТОЛЬКО из `app/**/*.tsx` (регулярка заканчивается на `.tsx`) и исключает каталоги
   `audio|community_packs|components|constants|error_traps|flashcards|graphify-out|quizzes|services|settings|types`.
   Любой `app/*.ts`, который никто не импортирует, в бандл не попадает.
2. Проверено по самому бандлу (поиск идентификаторов в `.hbc` android): `getBotProfile`, `PosMicroDiagnosisId`, `lessonPackFromRows`,
   `getMilestoneLevelGift`, `buildWeeklyReviewSnapshot`, `pickPercentileLine`, `createChargedOperationGuard`, `resolveHomeLearningPriority` —
   **отсутствуют** (все это живущие в репозитории, но недостижимые модули); `parseLocalPendingReveal` (живой) — присутствует.
3. По source map (android): в бандле 2 219 локальных файлов; граф импортов (`dead_graph`, 656 «мёртвых» файла клиента, из них 68 в `app/`,
   653 601 Б) пересекается с ними на **0** файлов — карта достижимости и фактический бандл согласованы.

Итого мёртвые 68 файлов `app/` (≈ 0,65 МБ исходников: `pos_micro_diagnosis` 143 КБ, `error_traps/*` 105 КБ, `personal_training_source_locales` 71 КБ,
`lesson_prepositions_es_*` 85 КБ и др.) на установленное приложение не влияют. Их удаление — гигиена репозитория, часть файлов
связана с проверками-сторожами и аудит-скриптами (`scripts/gustav_*`, `specs/support-product-lifecycle.json`), поэтому я их НЕ трогал.

## Что реально весит в бандле (android, исходники по source map, ≈ 42,6 МБ → 36,5 МБ байткода)

| Группа | МБ исходников |
|---|---:|
| `app/` | 21,84 |
| `components/` | 5,68 |
| `modules/` (Learning V2 и др.) | 5,55 |
| `node_modules` (всё) | 8,70 |
| из них react-native / reanimated / revenuecat-hybrid-mappings | 2,48 / 0,85 / 0,65 |

Крупнейшие локальные файлы: `modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts` 1,2 МБ,
`components/lesson_help_theory_data.tsx` 1,1 МБ, `app/lesson_data_1_8_phrases_es.gen.ts` 0,89 МБ, `app/lesson_data_25_32.ts` 0,69 МБ,
`app/idioms_data.ts` 0,63 МБ, `app/lesson_intro_screens_en_17_32.ts` 0,60 МБ, `learning_v2_factory_production_audio_entries_v1.generated.ts` 0,57 МБ,
`lesson_data_9_16_phrases_es.gen.ts` 0,56 МБ, `lesson_data_17_24.ts` 0,54 МБ, `learning_v2_factory_lesson_audio_index_v1.generated.ts` 0,52 МБ.
Бандл — это в основном **учебный контент**, который едет весь сразу.

## Недостижимые, но попадающие в бандл маршруты (все крошечные)

`app/(tabs)/arena.tsx` 500 Б, `(tabs)/journal.tsx` 596 Б, `premium_modal_v2.tsx` 1 544 Б, `flashcards_audio.tsx` 383 Б, `shards_shop.tsx` 266 Б —
редиректы старых ссылок (pm004: archive), нужны для прежних сборок. `shop.tsx` 31 351 Б + `shop_catalog.ts` 14 326 Б — по слову владельца (24.08)
остаётся; с сегодняшнего дня за редиректом вне dev (коммит `c20b98988`). Исключить их из store-бандла можно добавлением `shop` в список
исключений `router.ctx.js` (≈ 45 КБ исходников, 0,1 %) — не сделано: цена (потеря маршрута для старых диплинков) выше выгоды.

## Что даст настоящее уменьшение (решения, не уборка)

- Грузить контент языка/курса лениво или с сервера (Performance Bible, «серверная доставка контента»): `lesson_data_*_es.gen.ts` (1,45 МБ),
  `idioms_data`, `lesson_help_theory_data` (1,1 МБ), фабричные манифесты Learning V2 (≈ 2,3 МБ) — ≈ 5–6 МБ исходников, то есть порядка 13 % бандла.
- Для английского-only релиза: решить, нужен ли в нём испанский/немецкий/французский учебный контент (решение владельца, D96/D129).
- Повторять этот обмер перед релизом: `node scripts/pm220_perf_gates.mjs bundle <каталог экспорта>` проверяет бюджет (config/perf-budgets.json).
