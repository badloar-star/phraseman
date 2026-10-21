# Task packet: «Обучение» способ 2 — dev-вход /dev_season_preview для Сверки

Governance-ID: TG-A2E0F65407BC
Governance-ID: TG-859D4306934C
Status: В работе
Owner: 2 · ДИЗАЙН (поручение координатора 21.10: «dev-вход без подмены боевой вкладки, как /dev_spire_preview»)

## Outcome

Сверке (6) нужны состояния экрана «Обучение» («Сезон и карусель карт») по ссылке, не подменяя вкладку «Уроки» и не трогая боевой прогресс.
Маршрут `/dev_season_preview?state=…&theme=dark|light` рисует настоящий SeasonCourse на моках прогресса (колода из строк курса, как их строит карта курса).

## Scope

- components/learning-v2/season/season_preview_fixtures.ts — чистые моки: состояния, строки прогресса, тексты эпизодов (из эталона course-hybrid-1-4.html), стартовое состояние экрана.
- app/dev_season_preview.tsx — маршрут (ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводит на Главную); тема — только в памяти процесса через setDevAppearance.
- components/learning-v2/season/SeasonCourse.tsx — необязательный проп initialState (стартовая карта, раскрытая карта, веер): нужен превью, в бою не передаётся.
- tests/season_dev_preview_contract.test.ts — состояния, моки и защита от попадания маршрута в релиз.

## Architecture

Мок прогресса строится теми же строками (LearningV2CourseAccordionRowV1), что и боевая колода: buildSeasonDeck не знает, моки это или нет. Сеть, Firestore и хранилище не читаются и не пишутся.
Боевая вкладка «Уроки» (app/(tabs)/lessons.tsx) не меняется. Экзамен главы остаётся за флагом SEASON_CHAPTER_EXAM_ENABLED=false: карта видна, кнопки нет.

## Security and privacy

Данных не собираем. В релизной сборке маршрут уводит на Главную, как dev_spire_preview.

## Technical debt

Тексты эпизодов 19–24 в моках — заглушки (в эталоне их нет), на кадры Сверки не попадают.

## Verification

tsc по затронутым файлам, точечный jest, храповики ratchet (типографика, цвета темы, обводки), babel.parseSync после каждой правки .tsx.

## Rollback

Удалить app/dev_season_preview.tsx, season_preview_fixtures.ts и проп initialState — боевой код не затронут.
