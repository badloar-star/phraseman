# Task packet: храповик непереведённого интерфейса — откуда новые русские строки; фиксация базы; селектор settings-gap-008

Governance-ID: TG-CD783A9756EC
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: scripts/scan_untranslated_ui.mjs, config/ (база сканера), scripts/dev_links_r1_steps_misc2.py

## Outcome

1. Список новых русских строк вне triLang (файл, строка, последний коммит, автор-сессия) — координатору для раздачи владельцам.
2. После — новая база (--update) отдельным коммитом.
3. settings-gap-008: разбор step_target_not_found:#settings-clear-cache-row.

## Scope

In scope: отчёт, база, селектор. Out of scope: перевод чужих файлов.

## Architecture

No architecture change.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: база должна отражать реальность, иначе новые строки прячутся в допуске.

## Verification

Сканер до/после, тест существования селекторов.

## Rollback

Откат коммитов.
