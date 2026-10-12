# accentTextSafe в v2-палитре и добавление в базовую линию DayRings

Governance-ID: TG-47ADA5DF65BC
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (просьба координатора по данным Ядра df6696aa9)

## Outcome
v2-палитра отдаёт accentTextSafe (v2_sheet, v2_ui его ждут); базовая линия графики равна факту сканера (60).

## Scope
`components/ui/v2_theme.ts`, пометка в `components/home/DayRings.tsx`, `config/light-accent-graphics-baseline.json`, раздел таблицы замен в аудите.

## Architecture
accentTextSafe палитры = `t.accentTextSafe ?? t.accent`; в тёмном равен accent.

## Security and privacy
Только цвета.

## Technical debt
Нет.

## Verification
Сканер = базовая линия; тест токена.

## Rollback
git revert.
