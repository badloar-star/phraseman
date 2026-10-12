# Task packet: английский интерфейс — achievements_screen, lesson_intro_rich, diagnostic_test (EN_READINESS_R1)

Governance-ID: TG-78E1BC01C7CB
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10), раздел с Ядром
Related epic/enabler: docs/phraseman-2.0/EN_READINESS_R1.md, scripts/scan_untranslated_ui.mjs

## Outcome

Русский текст вне triLang в трёх файлах (achievements_screen 17, lesson_intro_rich 15, diagnostic_test 22 строки) переведён через triLang на все языки интерфейса (в первую очередь en); счётчик сканера непереведённого вниз.

## Scope

In scope: тексты интерфейса трёх файлов. Out of scope: контент уроков, серверные тексты, флаг ENGLISH_UI_LOCALE_ENABLED (не включается).

## Architecture

No architecture change: обёртки triLang вокруг существующих строк.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: русский текст виден всем не-русским пользователям.

## Verification

scan_untranslated_ui (счётчик вниз), тесты затронутых экранов, срез типов.

## Rollback

Откат коммитов (по файлу).
