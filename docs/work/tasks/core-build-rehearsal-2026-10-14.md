# Task packet: генеральная репетиция сборки 16.10 (стор-экспорт android + гейты шага 8)

Governance-ID: TG-9C295397D260
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: E21 PM-216, E24 PM-252; R1_RUNBOOK шаг 8/8а; координатор 14.10

## Outcome

Итог «готово к 16.10 / что красное» координатору: свежий стор-экспорт android (env production, source maps) на HEAD после окна
18:30; гейты шага 8 ([STORE-BUNDLE-DEV] по карте, [DPK-GATE]), размер против бюджета PM-220; по карте бандла — вырезаны dev-модули
этих дней (dev_state, превью Пика с nicks, spireScroll/spireRankBy через заглушку, dev_dialog_feedback, edu=parity, DEV-хаб);
«Что нового» включено (minBuildId 132 = сборка app.json); Пик только ru/uk.

## Scope

In scope: экспорт в `dist-store/` (в .gitignore) под слотом, чтение бандла и карты, запуск гейтов. Out of scope: правка кода
(находки — владельцам строкой), сборка EAS, выкладка.

## Architecture

No architecture change: проверка готового артефакта.

## Security and privacy

Бандл и карта остаются локально.

## Technical debt

Contain: находки — владельцам зон до 16.10.

## Verification

Скрипт репетиции во временной папке сессии; вывод гейтов и проверок по карте прикладывается к отчёту координатору.

## Rollback

Удалить `dist-store/`; код не меняется.
