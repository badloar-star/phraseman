# Приёмка новых .accent (lessons/dialogs), вырезка .accent для intro_*, план значка лиги в рангах Шпиля

Governance-ID: TG-68BEB11AECA1
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решения владельца, журнал п.81, через координатора 12.10)

## Outcome
1) Новые слои `.accent` для `lessons` и `dialogs` (тёмные и светлые), вырезанные из основы, приняты командой `import_art_style S2_clay_accentfix` (сначала `--dry-run`), четыре строки этих предметов убраны из `ACCENT_MISALIGNED_DEBT`, тесты арта зелёные. 2) Для `intro_cards_hub`, `intro_cards_swipe`, `intro_legacy_lessons` слои вырезаются тем же скриптом `make_accent_from_base`, склейка «основа + тинт» уходит координатору ДО импорта. 3) `spire_tile` не трогается (владелец дал Codex задачу вшить корону). 4) Для значка лиги в рангах Шпиля — склейка 4–5 лучших вариантов из 33 прошедших сторож (читаемость на 64 px, тёмное/светлое, 3 темы) и план без правок кода: сколько ступеней рангов, куда в коде Шпиля встанет значок.

## Scope
Файлы арта (`assets/images/v2art/{dark,light}/lessons|dialogs.accent.webp`, сгенерированный `themed_art_assets.generated.ts` через штатный генератор), `scripts/make_accent_from_base.mjs` (добавить предметы `intro_*`), `scripts/gen_themed_art_assets.mjs` (убрать 4 строки долга), склейки и документ плана в `ART_STYLE_FOR_CODEX/`. Код Шпиля читается, но НЕ меняется.

## Architecture
Приёмка идёт штатным importer'ом: сжатие ≤ 400 КБ, `[THEMED-ART-GUARD]` (альфа + совпадение с основой, основа берётся из `assets`), резервная копия заменяемого в `_backup`, затем `gen_themed_art_assets.mjs` пересобирает реестр слотов. Для `intro_*` в SPEC скрипта добавляются области поиска детали (закладка), результат — в `trials/S2_clay_accentfix`.

## Security and privacy
Только картинки и их регистрация; данные пользователей, права и сеть не затрагиваются.

## Technical debt
Слои `intro_*` до замены остаются в списке долга сторожа. Выбор значка лиги и число ступеней — решение владельца/координатора.

## Verification
`import_art_style --dry-run`, затем запись; `gen_themed_art_assets --check`; тесты `themed_art`, `themed_art_guard`, `home_art_accent_layers`, `themed_art_clay_accent_contrast`, `import_art_style`, `accent_alignment_guard` (ратчет долга) — по слоту светофора, `--runInBand`.

## Rollback
Заменённые файлы лежат в `ART_STYLE_FOR_CODEX/_backup/S2_clay_accentfix-<время>/`; `git revert` коммита возвращает и файлы, и список долга.
