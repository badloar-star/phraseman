# Task packet: интро классики uk, en 1–4 (оверрайды)

Governance-ID: TG-41AF9B401B09
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: мастер-план 05.11, очередь Переводчика (интро uk по оверрайдам)

## Outcome

Написаны uk-оверрайды интро классики для en 1–4 (12 экранов: titleUK, textUK, linesUK) в docs/work/classic_intro_overrides_uk.json, по эталону ru от Тем. Успех: JSON парсится, ключи совпадают с ru-файлом, примеры остаются по-английски, коммит пачкой.

## Scope

In scope: docs/work/classic_intro_overrides_uk.json (en:01–04, intro 1–3), этот пакет.
Out of scope: ru-оверрайды (Темы), en 5+ (следующие пачки), код конвертера (scripts/classic_course_pack.mjs), lessons-*.json (Теория).

## Architecture

Данные-оверрайды, конвертер scripts/classic_course_pack.mjs читает их по screenId. Код не меняется.

## Security and privacy

Персональных данных нет.

## Technical debt

Обращение в uk — безличное и третье лицо; спорные формы «ви» по решению владельца Q54 не вводятся в тексты интро, а проверяются Темами. Несоответствие ru «ты» — отметить Темам.

## Verification

JSON парсится; проверка скриптом: все 12 ключей из ru-файла присутствуют; примеры совпадают с ru-оригиналом.

## Rollback

`git revert` коммита; конвертер вернётся к ru-оверрайдам без uk.
