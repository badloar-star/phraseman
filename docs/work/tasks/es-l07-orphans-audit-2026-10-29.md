# Разбор: испанские сироты es/l07 s17–s28 (только чтение)

Governance-ID: TG-EF3919F20464
Governance-ID: TG-7230CCAF56A1
Governance-ID: TG-C583058B50A7
Governance-ID: TG-1F0ED14C2A75
Governance-ID: TG-99DE0611AEF1
Governance-ID: TG-28B87997C775
Governance-ID: TG-8129CE603E18
Governance-ID: TG-7A0EFD3C5AF9
Status: In progress — пересборка es по решению координатора 29.10 (сироты закоммичены 526bc42ea)
Owner: Learning V2 session; поручение координатора 29.10 («пока ждём финал — только чтение и подготовка»)

## Outcome

Понять, что сделано в незакоммиченной испанской партии es/l07 s17–s28, что в ней сломано и что нужно для пересборки es.

## Что лежит в дереве (не закоммичено)

- `content/learning-v2-course/sessions/es/l07/s17…s28/` — только `final.ru.md`, `final.uk.md`; atomic-файлов в es нет вообще (сборщик строит задания прямо из md). Записаны 28.10 с 17:51.
- `content/learning-v2-course/release/es/l07/s17…s28/` и `modules/learning-v2/content/factory_native/generated_release/es/l07/s17…s28/` — по 5 файлов на занятие (answers, auxiliary, intro, learner, learner.uk).
- `factory_native_manifest_es_v1.generated.ts` (+434), `factory_native_catalog_es_v1.generated.ts` (+217) — дописаны 28.10 в 18:30.
- Автор — та же сессия, что закоммитила предыдущие партии («add Spanish lesson 7 sessions 13-16», a2269ecc9, 18:04). Партию оборвали между сборкой и коммитом.

## Проверено

1. Все 12 занятий собираются `build_release.mjs` без ошибок (снимок, md из дерева).
2. Пересобранный release/es/l07/s17–s28 совпадает с лежащим в дереве байт в байт (60 файлов, без учёта CR).
3. generated_release/es == release/es для этих 12 занятий (байт в байт).
4. Манифест es в дереве — 365 строк, последняя l07/s28. Регенерация `--language es` из данных дерева — тоже 365 строк; отличия только в `learningOutcomeByAuthoredLocale` и `sourceFingerprint`: манифест берёт «Что вы освоите» прямо из md, а Теория правила es md после 28.10 18:30.

## Главное, что сломано (уже в HEAD, не только сироты)

- Манифест es в HEAD — 334 строки, обрывается на l06/s53 (последний коммит манифеста 65b66878c, 28.10 17:33).
- Содержимое l06/s54–s56 и l07/s01–s16 закоммичено (sessions + release + generated_release), но строк в манифесте у них НЕТ → в приложении испанский курс кончается на l06/s53, 19 закоммиченных занятий невидимы.
- Незакоммиченный манифест в дереве эту дыру закрывает (+31 строка: l06/s54–56, l07/s01–28), но собран по md 28.10 — без сегодняшних правок Теории.

## Что сделать (порядок)

1. Дождаться, пока Теория закончит es l01–l07/s16 (она правит только final.*.md и коммитит по урокам).
2. Закоммитить сироты s17–s28: sessions + release + generated_release — равно бою, проверено п. 1–3.
3. Пересобрать es целиком от HEAD (release/es → generated_release/es) — подтянет правки Теории в intro всех 364 занятий.
4. Манифест + каталог es: `node scripts/build_learning_v2_factory_native_manifest.mjs --language es` (сейчас — 365 строк, последняя l07/s28); НЕ коммитить вчерашний манифест из дерева — он отстаёт от md.
5. Сторожа: `tests/learning_v2_es_bundle_reachability_guard.test.ts`, live_new_word (если охватывает es), es exam banks; затем коммит частями ≤250 путей.
6. Тест `tests/learning_v2_system_tts_only.test.ts` (изменён в дереве, ждёт `systemTtsOnly: studyTarget !== "es"`) — сирота испанской записанной озвучки (es-professor-v4); отдельный вопрос владельцу/координатору: включать ли записанный голос для es. До решения не коммитить — он красный.

## Security and privacy

Не затрагивается: учебные тексты.

## Rollback

Ничего не менялось.

## Scope

Пересборка испанского курса целиком от HEAD: content/learning-v2-course/release/es, modules/learning-v2/content/factory_native/generated_release/es,
factory_native_manifest_es_v1.generated.ts, factory_native_catalog_es_v1.generated.ts. Английский и плеер не трогаются.

## Architecture

Тот же сборщик build_release.mjs (es без atomic — задания из final.*.md) и build_learning_v2_factory_native_manifest.mjs --language es, в снимке HEAD; перенос в дерево и коммит частями.

## Technical debt

Манифест es отстал от содержимого 28.10 — закрывается этой пересборкой; сторож «манифест покрывает все выпущенные занятия» стоит добавить отдельно.

## Verification

Сборка всех занятий es без отказов, манифест 365 строк, сторож tests/learning_v2_es_bundle_reachability_guard.test.ts и es_new_word_card_editorial, grep сравнения выпуска с md.
