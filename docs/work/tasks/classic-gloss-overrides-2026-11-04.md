# Task packet: вычитка словарей классических курсов (EN v3 и ES)

Governance-ID: TG-538F523BA5E6
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: пробелы словарей Classic (координатор, Теория, 04.11)

## Outcome

Для 45 английских глосс EN v3 даны значения на ru, uk, es, pt-BR, vi, id, tr, а неверные переводы ES исправлены (pt-BR, tr). Результат — файл docs/work/classic_gloss_overrides.json, который Теория встроит в конвертер и пересоберёт пакет. Успех: JSON читается, все 45 ключей на месте, pl не тронут.

## Scope

In scope: docs/work/classic_gloss_overrides.json (новый файл, только данные) и этот пакет.
Out of scope: scripts/classic_course_pack.mjs, модули курса, коммит (коммитит Теория), pl (HOLD).

## Architecture

No architecture change: только данные для конвертера, код не меняется.

## Security and privacy

Не затрагивается: персональных данных нет, сеть не используется.

## Technical debt

Contain: часть ES-записей эвристическая (по списку Теории), записи «нормальные» не трогаю. Выход — проверка Теорией после пересборки.

## Verification

Проверка: `node -e "JSON.parse(...)"` на файле; ключи EN сверены со списком из docs/work/classic_gloss_gaps_2026_11_04.md (45 шт.). Пересборку делает Теория.

## Rollback

Удалить файл docs/work/classic_gloss_overrides.json; без него конвертер берёт английское значение, как сейчас.
