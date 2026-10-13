# План Б R1 — вынос данных Learning V2 из стор-бандла (PM-216 «Б»)

Подготовило Ядро 13.10 по решению координатора: «подготовь патчем, не включать; применяем, только если 15.10 владелец скажет
„скрыть“». **Статус: ПОДГОТОВЛЕНО, НЕ ПРИМЕНЕНО.** Применяется в паре с `eas_json_production_hide_v2.patch` (план Б целиком —
`docs/phraseman-2.0/R1_PLAN_B_HIDE_V2.md`).

## Что даёт

При плане Б потолок V2 = 0: ни одно занятие не собирается, вкладки V2 нет. А три сгенерированных модуля данных всё равно едут
в стор-бандл. Патч подменяет их в стор-сборке с `PHRASEMAN_R1_HIDE_V2=1` пустыми данными той же формы:

| Модуль | JS | Заглушка (`store_release_stubs/plan_b_v2/`) |
|---|---:|---|
| `modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts` | 2,94 МБ | `FACTORY_NATIVE_MANIFEST_V1 = []` |
| `app/learning_v2_factory_lesson_audio_index_v1.generated.ts` | 0,50 МБ | `LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1 = {}` |
| `app/learning_v2_factory_production_audio_entries_v1.generated.ts` | 0,49 МБ | `…_ENTRIES_V1 = []`, `…_EXPECTED_ENTRY_COUNT_V1 = 0` |

Итого ≈ 3,9 МБ JS (12 %), ≈ 3,5 МБ байткода (обмер 13.10: `evidence/PM-216_store_bundle_2026-10-13.md`). Каталог
(`factory_native_catalog_v1.generated.ts`, 0,11 МБ) намеренно не трогается — от него зависят подписи языков, выгода мала.
Dev-сборка и сборка без `PHRASEMAN_R1_HIDE_V2=1` не меняются.

## Почему безопасно (по коду 13.10) и что проверить руками

Проверки `throw` в потребителях (`factory_native_course_v1.ts`, `learning_v2_factory_production_audio_v1.ts`) срабатывают при
**сборке занятия**, а не при загрузке модуля; при потолке 0 занятие не собирается. Два модуля уже грузятся лениво
(`require` внутри функции). **Не доказано по коду** и проверяется на эмуляторе: `learning_v2_bootstrap_audio_seed_v1.ts` импортирует
функции аудио-записей — если сид запускается на старте при потолке 0, с пустыми записями он должен вернуть пусто или залогировать
отказ, а не уронить старт.

## Применение (только по слову владельца «скрыть V2», 15.10)

```bash
git apply docs/work/plan-b/eas_json_production_hide_v2.patch
```

```bash
git apply docs/work/plan-b/bundler_config_plan_b_v2_data_stubs.patch
```

```bash
mkdir -p store_release_stubs/plan_b_v2 && cp docs/work/plan-b/stubs/*.ts store_release_stubs/plan_b_v2/
```

Коммит — `safe_commit` (конфиг сборщика и заглушки — не каталоги кода, окно не нужно).

## Проверка после применения (до сборки 16.10)

1. Стор-экспорт под светофором с `EXPO_PUBLIC_STORE_RELEASE=1 PHRASEMAN_R1_HIDE_V2=1 … --source-maps` → по карте трёх модулей
   нет, вместо них `store_release_stubs/plan_b_v2/*`; размер JS ≈ −3,5 МБ (`scripts/pm216_release_size_report.mjs`).
2. `node scripts/plan_b_v2_hidden_check.mjs --expect-applied` и `release:precheck` — зелёные; гейты V2 «НЕПРИМЕНИМО».
3. Эмулятор, стор-подобная сборка: холодный старт без красного экрана; журнал без `learning_v2_factory_*_missing` на старте;
   вкладка «Уроки» открывается, вкладки V2 нет; урок 1 (V1) проходится.

## Откат

`git revert` коммита применения (или обратный `git apply -R` обоих патчей + удалить `store_release_stubs/plan_b_v2/`).
Снятие плана Б при выпуске V2 обновлением — `R1_PLAN_B_HIDE_V2.md`, раздел 5: убрать `PHRASEMAN_R1_HIDE_V2` — заглушки перестают
подменяться сами.
