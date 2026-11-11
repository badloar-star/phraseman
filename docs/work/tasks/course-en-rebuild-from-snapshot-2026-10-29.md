# Task packet: пересборка английского курса из снимка HEAD (тексты 28–29.10) + перепин сторожа петли меню

Governance-ID: TG-1DF5CC04E9B3
Status: In progress
Owner: Learning V2 session; координатор 29.10 («пересобираешь ТЫ, из снимка HEAD»; Теория закоммитила уроки 9–16)

## Outcome

1. В снимке `git archive HEAD`: build_release по изменённым после cf3e41b2b занятиям en (+ старые расхождения), манифест,
   индекс заданий, сторожа курса. Испанский не трогается.
2. Сверка «старый бандл → новый»: меняются только пояснения, заголовки и «Что вы освоите»; занятия, где меняются озвучиваемые
   реплики, — в отдельный список переозвучки и не переносятся.
3. Перенос в рабочее дерево только сгенерированных файлов en, после git status каждого пути (грязный → стоп и список).
4. tests/lessons_overlays_audit_r58.test.ts: защита от петли lesson1 ↔ меню (15.10) выражена через решение отскока
   (шаг назад только к списку прямо под меню), а не через запрет любого шага назад.

## Scope

Снимок в C:/Temp/claude/lv2_rebuild_*; в дереве — content/learning-v2-course/release/en, modules/learning-v2/content/factory_native/
generated_release/en, factory_native_manifest_v1.generated.ts, factory_native_catalog_v1*, factory_native_task_counts_v1.generated.ts; один тест.

## Architecture

md (sessions/en) → build_release.mjs → release/en → build_learning_v2_factory_native_manifest.mjs → generated_release/en + манифест →
build_learning_v2_task_counts.ts → индекс. release/en и generated_release/en сейчас совпадают байт в байт.

## Security and privacy

Не затрагивается: только учебные тексты.

## Technical debt

Правки md без пересборки повторяются; сторож «исходник новее сборки» — отдельная задача. l27–l32: сверка фабрики ждёт файл
практики, которого у этих уроков нет (особенность сборки, не дрейф).

## Verification

check-source-release по пересобранным занятиям = PASS; сторожа курса (reachability, task_counts_index, live_new_word, банки экзамена,
bundled_session_material); сравнение озвучиваемых реплик было/стало.

## Rollback

Revert коммита(ов) пересборки.
