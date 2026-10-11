# Task packet: ворота Шпиля — троттлинг 60 с, сброс кэша конфига при смене флага вкладки, решения в спецификации

Governance-ID: TG-C6183BDD6BD4
Status: In progress
Owner: сессия «1 · Ядро» (координатор 11.10: перечит не чаще раза в 60 с; сброс кэша `config/spire_v1` при смене
`spire_tab_enabled`; решения по режимам энергии — в ENERGY_MODES_SPEC; разбор красных сторожей экранов).

## Outcome
1. `SPIRE_GATE_REFRESH_MIN_INTERVAL_MS` = 60 с.
2. Флаг вкладки сменился (после чтения кэша рубильников) → кэш `config/spire_v1` сбрасывается, следующий вход читает сервер.
3. ENERGY_MODES_SPEC: «решено координатором 11.10».
4. Разбор `session_attempts_screen_wiring_gate`, `motion_polish_gate`, `runtime_gate` — кому чинить и где.
5. Удалить дубль `scripts/spire_enable_prod.ts`.

## Scope
In: `app/spire_gate_refresh.ts`, `app/spire_tab_flag.ts`, `app/spire_config_client.ts`, спецификация, тесты.
Out: правки экранов Дизайна.

## Architecture
Сброс кэша — только при смене значения флага (редкое событие), без новых чтений сверх одного документа при входе.

## Security and privacy
Без новых данных.

## Technical debt
- Contain: общий TTL рубильников 6 ч остаётся для остальных разделов.

## Verification
Тесты ворот, сторожи Шпиля.

## Rollback
`git revert`.
