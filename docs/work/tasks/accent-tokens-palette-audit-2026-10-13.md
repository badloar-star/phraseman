# Токены accentGraphic/accentTextSafe в v2-палитре и таблица замен в аудите

Governance-ID: TG-3B786C1ABDD0
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (срочная просьба координатора: производные токены, в тёмном байт-в-байт accent)

## Outcome
Токены уже есть в GlassTokens/Theme (c62e8fc70); добавляю accentTextSafe в турнирную v2-палитру и фиксирую в аудите таблицу замен на эти токены.

## Scope
`components/ui/v2_theme.ts` (одно поле палитры), раздел «Таблица замен» в `docs/phraseman-2.0/LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md`.

## Architecture
accentGraphic: светлое — accent, углублённый до ≥3:1 (legibleOn), тёмное — ровно accent. accentTextSafe: светлое — accentText, тёмное — ровно accent.

## Security and privacy
Только цвета.

## Technical debt
Потребители переводятся по разделам аудита.

## Verification
tests/accent_graphic_token.test.ts (23 темы × 2 оформления × 5 уровней).

## Rollback
git revert коммита.
