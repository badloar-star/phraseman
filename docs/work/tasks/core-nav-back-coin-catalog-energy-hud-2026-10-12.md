# Task packet: сторож «назад» — каталог рангов монет и выход из остановленного занятия

Governance-ID: TG-DEC7103DA553
Status: Done — тесты 16/16, срез типов 0 своих ошибок
Owner: сессия «1 · Ядро» (координатор 12.10: «tests/navigation_back_underlay красный на двух пунктах из твоей зоны… Классифицируй экран и переведи back на безопасный возврат по правилу теста. Тест зелёный, коммит»).

## Outcome
`tests/navigation_back_underlay_contract.test.ts` зелёный:
1. `/coin_rank_catalog` (97099c35d) получает роль — контекстный портал, как `/coin_rank`: открывается только с экрана рангов,
   а тот — с Главной, из Уроков и из кошелька, поэтому каталог наследует раздел точки входа.
2. `components/energy/EnergyAttemptsHud.tsx`: выход из остановленного занятия (без своего `onStoppedExit`) идёт через
   `safeRouterBack(router)` — история «назад» с защитой разделов и одноразовых экранов занятия, а не голый `router.back()`.

## Scope
In: `app/navigation_back.ts` (одна строка в `CONTEXTUAL_PORTAL_PATHS`), `components/energy/EnergyAttemptsHud.tsx` (вызов
выхода). Out: сам тест, экраны рангов, логика энергии и остановки.

## Architecture
Без новых механизмов: существующий список контекстных порталов и общий `safeRouterBack` (лог `[NAV-BACK] decision` уже есть).

## Security and privacy
Не затрагивается.

## Technical debt
Запасной адрес выхода из остановленного занятия — Главная (по умолчанию `safeRouterBack`), если в истории нет безопасного
кандидата; экраны с собственным `onStoppedExit` ведут себя как раньше.

## Verification
`tests/navigation_back_underlay_contract.test.ts` целиком; соседние сторожа энергии в занятии
(`tests/session_attempts*`, если касаются HUD); срез типов по изменённым файлам.

## Rollback
`git revert` коммита.
