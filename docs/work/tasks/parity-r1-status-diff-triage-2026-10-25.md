# Task packet: разбор 62 строк status_diff реестра сверки выпуска R1 (без кода)

Governance-ID: TG-F2B8694FD57A
Status: Done
Owner: 3 · МАКЕТЫ (заказ координатора 25.10)
Related epic/enabler: scripts/visual_parity_gate.mjs (PARITY-GATE), docs/phraseman-2.0/registries/visual_parity.json

## Outcome

Координатор 25.10: пока Сверка поднимает эмулятор — разобрать 62 строки status_diff (R1, после отложенных по триажу) по
существующим кадрам и макетам: (а) настоящее расхождение в приложении (что, какой файл), (б) устарел макет, (в) неясно.
Таблица в docs/work/, топ-10 заметных пользователю сверху. Код не трогаем.

## Scope

In scope: docs/work/parity-r1-status-diff-triage-2026-10-25.md, этот пакет. Out of scope: код, реестр, пересъёмка.

## Architecture

No architecture change. Строки получены evaluateRegistry(…, {release:'r1', deferTriage:true}) — 62 нарушения status_diff.

## Security and privacy

Нет данных пользователей; разбор по кадрам и тексту реестра.

## Technical debt

- Accept temporarily: кадры 12–18.10, код с тех пор менялся — выводы (а) подтверждать свежим кадром до правки.

## Verification

62 из 62 строк в таблице; категории по тексту diffs/вердиктов реестра и точечной проверке кода (settings_notifications, ExpandedCardV2).

## Rollback

Удалить документ — ни код, ни реестр не меняются.
