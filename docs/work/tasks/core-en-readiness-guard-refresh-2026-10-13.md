# Task packet: сторож EN-готовности приведён к текущему сканеру

Governance-ID: TG-47DF698A3442
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10; NIGHT_REGRESSION_2026-10-13 (en_readiness_dictionaries_contract, 963d8b8e5/cca3a2602)

## Outcome

Сканер scripts/scan_untranslated_ui.mjs в 15:12 получил второй параметр maskLocaleKeyedEntries(source, original = source) —
сторож ждал прежнюю подпись и покраснел. Проверка смысла (маскирование карт ru/uk только при соседнем языке) сохраняется,
подпись — без привязки к числу параметров. К вопросу 4 владельца утром сторож зелёный.

## Scope

In scope: tests/en_readiness_dictionaries_contract.test.ts. Out of scope: сам сканер, флаг ENGLISH_UI_LOCALE_ENABLED.

## Architecture

No architecture change.

## Security and privacy

Не касается данных.

## Technical debt

- Нет.

## Verification

Точечный прогон tests/en_readiness_dictionaries_contract.test.ts через светофор.

## Rollback

Откат коммита.
