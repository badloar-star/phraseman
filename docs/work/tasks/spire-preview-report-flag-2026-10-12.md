# Task packet: красный флажок «пожаловаться» в dev-превью заданий Шпиля (spire-gap-001/002/004/005)

Governance-ID: TG-916036B40A5C
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по просьбе Макетов (12.10)
Related epic/enabler: R1 «приложение = макет», app/dev_spire_preview.tsx

## Outcome

Боевой SpireStepScreen рисует флажок (SpireTaskReportButton) при answering && task && язык изучения; превью `/dev_spire_preview` передавало `reportSlot={null}`, поэтому на кадрах превью флажка не было. Превью рисует тот же ReportErrorButton (variant icon-flag, testID spire-task-report-0) с пустым транспортом: вид как в бою, жалоба никуда не уходит.

## Scope

In scope: app/dev_spire_preview.tsx (только слот флажка), тест-сторож превью. Out of scope: шапка Шпиля и капсула энергии (приказ владельца 01.10, зона Темы).

## Architecture

No architecture change: тот же компонент, пустой submitOverride (dev-маршрут вырезан из стор-сборки).

## Security and privacy

Данных не касается: submitOverride возвращает 'sent' без сети.

## Technical debt

Pay now: превью отличалось от боевого экрана.

## Verification

Тест-сторож по исходникам, срез типов, пересъёмка за Сверкой.

## Rollback

Откат коммита.
