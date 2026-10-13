# Task packet: use_spire_game.ts ≤ 400 строк — оценка бюджета ступени в свой модуль

Governance-ID: TG-452EB6FBD860
Status: In progress
Owner: Ядро (сессия 1)
Related: сообщение Авторизации 13.10; сторож tests/spire_game_source_contract.test.mjs «every new file stays small» (402 > 400
после 11ef1e76b — потолки getIdToken и логи ранних выходов)

## Outcome

- app/spire/spire_step_budget.ts (новый): `spireEstimateStepBudgetMs`, память последнего бюджета этажа
  (`spireRememberStepBudget`), сброс для тестов. Поведение то же — перенос без изменений логики.
- app/spire/use_spire_game.ts: импорт из нового модуля + реэкспорт прежних имён (тесты и вызовы не меняются); файл ≤ 400.

## Scope

In scope: перенос ~18 строк. Out of scope: логика бюджета, остальные упавшие проверки этого сторожа (языковые контуры, токены
стекла — не зона этой правки).

## Architecture

No architecture change.

## Security and privacy

Перенос кода без новых данных.

## Technical debt

- use_spire_game.ts близко к потолку (≈ 385); следующая крупная правка — выносить комнату/друзей в свой хук.

## Verification

node --test spire_game_source_contract (проверка длины); точечный tests/spire_optimistic_ui_r1.test.ts; babel-проверка.

## Rollback

Откат коммита.
