# Task packet: тест gustav_french_daily_phrase_target_gate — учитывать отсрочку снимка фразы дня (52c135c72)

Governance-ID: TG-827D90584604
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~13:35 («поправь сам тест под отсрочку снимка, код не трогай»)

## Outcome

tests/gustav_french_daily_phrase_target_gate.test.ts: перед синхронным `getTodayPhraseSyncForTarget('en')` тест дожидается чтения
снимка (`hydrateDailyPhrasePeekFromStorage()`), как это делает приложение на старте (bootstrap _layout.tsx). Раньше тест ждал
фразу до гидрации — после 52c135c72 (11.10) синхронный путь в это время честно отдаёт null («снимок ещё читается»).

## Scope

In scope: только тест. Out of scope: app/daily_phrase_system.ts (код не трогаем).

## Architecture

No architecture change.

## Security and privacy

Нет данных.

## Technical debt

- Остальные сторожа фразы дня, вызывающие синхронный путь без гидрации, — проверены прогоном (115/116 до правки, падал только этот).

## Verification

Точечный прогон теста + соседние тесты фразы дня.

## Rollback

Откат коммита теста.
