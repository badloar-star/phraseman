# Task packet: разбор строк реестра diff в зонах Ядра (energy-modes, spire, spire-gap, paywalls, paywall-gap, learn)

Governance-ID: TG-E77336B09B2B
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; образец CARDS_LAYOUT_ROWS_R1_2026-10-13.md (Дизайн); цвета уже разобраны DIFF_COLOR_TRIAGE (249bad18d)

## Outcome

docs/phraseman-2.0/CORE_ZONES_DIFF_ROWS_R1_2026-10-13.md: по каждой из 75 строк — код менялся после кадра (переснять), состояние/данные
кадра (Сверке шаги/фикстура), ложный масштаб ≤ 5 % (Макетам match), реальный дефект (файл:строка, кто чинит), решение владельца.
Реальные дефекты зоны Ядра — правки в окна кода отдельными пакетами.

## Scope

In scope: чтение реестра, кода, git log; документ. Out of scope: цветовые расхождения (у Тем), правки чужих зон.

## Architecture

No architecture change.

## Security and privacy

Не касается данных.

## Technical debt

- Строки, требующие решения владельца, выносятся координатору.

## Verification

Для каждой строки «код менялся» — коммит после времени кадра по файлам кода строки (git log --since).

## Rollback

Откат коммита документа.
