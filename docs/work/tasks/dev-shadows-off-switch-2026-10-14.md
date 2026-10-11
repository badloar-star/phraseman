# Dev-переключатель «тени выкл» (гипотеза падения qemu)

Governance-ID: TG-45D5F5FB9C0B
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (задача координатора, §AUTH-2320)
Related epic/enabler: shadow-style-remove-borders-first-release-2026-10-14.md

## Outcome
Ссылка `phraseman://dev_state?shadows=off|on` отключает/включает все boxShadow стиля «Тень» (plate/nested/raised/action) только в памяти процесса. Сверка снимет profile-004/005 с тенями и без и проверит, роняют ли размытые тени эмулятор.

## Scope
constants/liquidGlassShadowStyle.ts (флаг + 4 функции), app/dev_state_fixtures.ts (разбор + применение), точечный тест. Логика экранов не меняется.

## Architecture
Модульный флаг `devShadowsOff` в единственном источнике чисел «Тени»; сеттер срабатывает только при `__DEV__`; применяется через dev_state (шаг под isDevStateAvailable, в стор-сборке отказ). Лог [SHADOW-OFF]. Экраны перечитывают при следующем рендере (dev_state после применения делает replace на next).

## Security and privacy
Данные не затрагиваются, в хранилище и сеть ничего не пишется.

## Technical debt
Уже смонтированные мемо-экраны обновятся при следующем рендере/переходе.

## Verification
Точечный тест: флаг выключает все 4 функции, разбор ссылки, сеттер не работает вне dev.

## Rollback
git revert коммита.
