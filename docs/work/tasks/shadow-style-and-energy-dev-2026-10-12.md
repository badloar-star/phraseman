# Стиль «Тень» (контейнеры без обводок) и Dev Hub режима энергии (Дизайн)

Governance-ID: TG-66A4E1E15A4B
Governance-ID: TG-651E744DEAEC
Governance-ID: TG-C003EAC04C41
Governance-ID: TG-16DAA8EE6A2D
Governance-ID: TG-58164EA7E8E1
Governance-ID: TG-6664B2BFDF80
Governance-ID: TG-973E4397D6F8
Governance-ID: TG-B1A5E113151A
Governance-ID: TG-E7780E54ECB0
Governance-ID: TG-1D7CDD1F35AA
Governance-ID: TG-AC4E1A221F04
Governance-ID: TG-1F74701EF0EF
Governance-ID: TG-657DBEF1AF4A
Governance-ID: TG-D975EBF05C32
Governance-ID: TG-7EEEA730BE69
Governance-ID: TG-27D3DBE4BAFB
Governance-ID: TG-04890C4DB9FA
Governance-ID: TG-922770C169C6
Governance-ID: TG-21092D739E6F
Governance-ID: TG-B3AF58C585DE
Governance-ID: TG-184DBBB350A8

## Outcome
1. Решение владельца 12.10 («второй вариант делаем»): ни одного контейнера с обводкой; плашки отделяют тень и мягкий блик, выбранное приподнято (`docs/design/v2-app/SHADOW_STYLE_SPEC.md`, эталоны shadow-style-etalon*.html). Слоями: kit → токены тем → экраны, каждый слой отдельным коммитом; сторожа обводок обновить под новое правило.
2. Режим энергии Б: доделать Б3 (баннер «Последняя энергия…»), Б6 («Plus активирован»), Б8 («Энергия восстановилась»); в Dev Hub (только dev, не в стор-сборке) — локальный переключатель режима А/Б поверх серверного ключа и быстрые кнопки состояний (энергия 5/1/0, Plus вкл/выкл) для проверки Б1–Б8 руками.

## Scope
Слой kit (`components/cards-grid/CardsKit.tsx` KitSurface/Sheen и потребители), токены теней (`constants/liquidGlass*`, совместно с сессией «Темы»), затем экраны по эталонам; `components/dev/*`, `app/energy_mode.ts` (override — контракт с Ядром), `components/energy/*`.

## Architecture
Тень и градиент — через один источник (`liquidGlassShadowStyle` Тем + KitSurface), экраны не рисуют свои. Override режима — локальный ключ AsyncStorage, читается только при `__DEV__ && !IS_STORE_RELEASE`; в стор-сборке код не достижим.

## Security and privacy
Данные пользователей не затрагиваются. Dev-override вырезается из стор-сборки (router.ctx.js, ENABLE_DEV_TOOLS).

## Technical debt
Тени дороже по отрисовке на слабых Android — замерять на списках; сторожа обводок обновляются вместе с кодом (не ослабляются).

## Verification
Проверка типов, сторожа типографики/раскладки/темы, юнит-тесты, кадры Эмулятора и сверка Сверкой с эталонами «Тень».

## Rollback
Откат коммитов по слоям; режим по умолчанию А.
