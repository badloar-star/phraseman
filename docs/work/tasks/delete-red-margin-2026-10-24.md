# Запас контраста красного «Удалить» на шторке (≥ 4,8)

Governance-ID: TG-80504859C59A
Governance-ID: TG-171DB38EB6A2

## Outcome
Координатор 24.10: «Удалить» на шторке ошибок (mpColors(g).bad на opaqueSheet) в dark/grad_coral/max даёт 4,57 при норме 4,5 — запас мал. Поднять до ≥ 4,8 оттенком текущей темы (не новым цветом) и закрепить тестом с порогом 4,5.

## Scope
In scope: токены тем (`constants/liquidGlassThemePalette.ts` — роль bad), тест-сторож `tests/sheet_danger_contrast.test.ts`.
Out of scope: компонент шторки `components/mistakes-panel/PanelKit.tsx` и экраны ошибок (файлы автора).

## Architecture
Роль bad уже доводится `legibleOn` до 4,55 на карточке/контроле/своих подложках, но шторка (opaqueSheet) в этот список не входила. Добавляем opaqueSheet в поверхности и цель 4,8 для bad — тон сохраняется, меняется только глубина.

## Security and privacy
Данных не касается.

## Technical debt
Долга не добавляется.

## Verification
Новый тест: bad к opaqueSheet ≥ 4,5 (сторож) во всех 23 темах × 2 оформлениях × 3 уровнях; разово — худший ≥ 4,8. Прогон существующих сторожей палитры.

## Rollback
Откатить коммит.
