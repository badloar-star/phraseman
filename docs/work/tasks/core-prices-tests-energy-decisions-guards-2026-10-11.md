# Task packet: тесты окна Plus под «цены всегда», решения по энергии в спецификации, разбор красных сторожей

Governance-ID: TG-169D1287B6E4
Status: In progress
Owner: сессия «1 · Ядро» (Дизайн 11.10: `paywall_plus_resilient_checkout` ждёт пустую цену без магазина; координатор:
решения по режимам энергии в ENERGY_MODES_SPEC, разбор `session_attempts_screen_wiring_gate`, `motion_polish_gate`,
`runtime_gate`).

## Outcome
1. Тест окна Plus проверяет новый контракт: без магазина и без кэша — справочная цена с источником `reference`.
2. ENERGY_MODES_SPEC — «решено координатором 11.10».
3. Разбор трёх красных сторожей: причина, хозяин, точное место.

## Scope
In: один тест, документ, отчёт. Out: правка экранов других сессий.

## Architecture
Без изменений кода приложения.

## Security and privacy
Без новых данных.

## Technical debt
- Contain: красные сторожа — их хозяевам.

## Verification
Прогон теста окна Plus и трёх сторожей.

## Rollback
`git revert`.
