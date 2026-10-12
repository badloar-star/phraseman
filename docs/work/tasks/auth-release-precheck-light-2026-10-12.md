# Task packet: лёгкий прогон release:precheck (без полного tsc и jest) + отметка о виде онбординга в варианте А

Governance-ID: TG-1F78F1AF5E9F
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)
Related epic/enabler: выпуск R1 в сторы 17.10; docs/phraseman-2.0/RELEASE_PRECHECK_STATUS_2026-10-12.md

## Outcome

(1) В handoff/en_ui_study_target_variant_A.md отмечено: вид экранов онбординга не меняется (онбординг заморожен по виду), при `en` лишь
убирается одна карточка English. (2) RELEASE_PRECHECK_STATUS_2026-10-12.md обновлён таблицей «гейт → зелёный/красный → почему → чья зона»
по всем гейтам release:precheck, кроме полного tsc и jest: заглушки стора, DPK-GATE, сторожа i18n, сверка-гейт,
REPORT_ERROR_ENABLED=false в релизе, флаги Account V2 не тронуты. Тяжёлое — только при ≥4 ГБ через слот.

## Scope

In scope: запуск лёгких шагов precheck (node-скрипты), чтение их вывода; два документа.
Out of scope: полный typecheck и jest-прогон; правка кода гейтов и приложения.

## Architecture

No architecture change: прогон проверок и документы.

## Security and privacy

Только чтение и отчёт.

## Technical debt

- Contain: красные гейты — списком с владельцем.

## Verification

Каждая строка отчёта — по фактическому выводу команды (код возврата и строка результата).

## Rollback

Документы; исправить коммитом.
