# Таббар: сжатие капсулы при прокрутке (разбор) и запасной вариант «Этаж N» компактной строкой (15.10)

Governance-ID: TG-EE550CDB7983

## Outcome
1) Координатор: капсула таббара в Настройках при прокрутке сужается (≈30–870 → ≈75–830 px); «ширина должна быть одной на всех вкладках, при прокрутке и без». Сначала логи: какая вкладка и когда меняет ширину. 2) Подготовить (выключенным) запасной вариант: при шрифте 1.3 и окне башни < 180 dp карточка «Этаж N» — компактная строка; включение одним флагом после кадров Макетов.

## Scope
`app/(tabs)/_layout.tsx` (dev-журнал `[TABBAR-COLLAPSE]`), `components/spire/SpireFloorInfo.tsx` (компактная ветка), `components/spire/spire_tower_window.ts` (флаг и чистое условие), `SpireHomeScreen.tsx` (передача высоты окна), тест `spire_tower_window_height`.

## Architecture
Сжатие капсулы — одна анимация в `_layout` (`tabScrollProgress`: масштаб 0,9, сдвиг 8, прозрачность по макету `docs/design/tabbar/tabbar-variants.html` `.bar-wrap.collapsed`), общая для вкладок, сообщающих прокрутку через `TopFadeScrollContext` (Главная, Обучение, Сообщество, Настройки). Журнал показывает вкладку, направление, y и масштаб. Компактная карточка — условие `spireFloorInfoCompact(fontScale, windowH, enabled)`, флаг `SPIRE_COMPACT_FLOOR_INFO_ENABLED = false`.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Решение, оставлять ли сжатие (утверждено макетом tabbar-variants 24.09) — за координатором и владельцем.

## Verification
Журнал `[TABBAR-COLLAPSE]` в dev; тесты таббара и окна башни.

## Rollback
Откат коммита.
