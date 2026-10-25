# Task packet: эталон m10 «Итог урока» приведён к приложению V2DoneScreen (разбор R1, moments-v3-m10-a)

Governance-ID: TG-87018D02461D
Status: In progress
Owner: 3 · МАКЕТЫ (заказ координатора 25.10)
Related epic/enabler: scripts/visual_parity_gate.mjs (PARITY-GATE), docs/phraseman-2.0/registries/visual_parity.json

## Outcome

Координатор 25.10 (R1 от Дизайна): m10 «Итог урока» — (б) устаревший эталон: «✕» слева сверху и крупные цифры с
разделителями остаются как в приложении (решения владельца «Статистика — всё крупное», 06b311f0d). Вердикт по мелочам — как в
приложении: «Разобрать N ошибки» — тихая текстовая ссылка secondary 16/600; стрелка основной кнопки — у правого края (right 22).

## Scope

In scope: docs/design/v2-app/engagement-moments-v3-all.html (только m10), этот пакет. Out of scope: код, реестр.

## Architecture

No architecture change.

## Security and privacy

Макеты, данных нет.

## Technical debt

- None.

## Verification

Страницы открываются без ошибок консоли; изменены только строки комнаты/итога недели и m08.

## Rollback

git revert коммита — только макеты.

