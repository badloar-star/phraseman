# Шпиль: сторож дизайн-слоя и фон под нижней кнопкой

Governance-ID: TG-D9FF7162F72C

## Outcome
Сторож `tests/spire_design_layer_contract.test.mjs` держит дизайн-слой экранов Шпиля (шрифты 16/13, межстрочный ≥ 1.25×, токены цвета, кит-нажатие, локализованная подпись жалобы). Затухание под нижней кнопкой Шпиля — в цвет низа градиента темы, сплошное под кнопкой.

## Scope
`tests/spire_design_layer_contract.test.mjs`, `components/spire/useSpirePalette.ts` (`useSpireBgBottom`), `components/spire/SpireHomeScreen.tsx` (затухание дока). Продолжение пакета `spire-design-layer-2026-10-11.md`.

## Architecture
Сторож использует общий сканер типографики `tests/helpers/typography_store_surface.mjs`. Затухание — `LinearGradient` `[bgBottom 00 → FF → FF]`, как в `PanelDock`.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Экраны Шпиля остаются вне сторожей стор-поверхности, пока раздел выключен флагом; отдельный сторож закрывает этот разрыв.

## Verification
Типы и тесты Шпиля в слоте светофора, новый сторож.

## Rollback
Откатить коммит.
