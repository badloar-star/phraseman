# Task packet: убрать задвоенный emitAppEvent('dev_onboarding_done') в dev_state_fixtures

Governance-ID: TG-444AC661B671
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; 4ca9997fd (мой коммит забрал 3 строки Авторизации) + f9f6b9171 (Авторизация закоммитила их повторно)

## Outcome

В HEAD блок «зачем + emitAppEvent('dev_onboarding_done')» стоял дважды подряд — событие закрытия онбординга уходило два раза.
Оставлена одна копия (строки Авторизации f9f6b9171), удалены 3 строки дубля.

## Scope

In scope: app/dev_state_fixtures.ts — только удаление дубля. Out of scope: всё остальное.

## Architecture

No architecture change.

## Security and privacy

Только dev-код.

## Technical debt

- Отложенные коммиты сверяют numstat внутри скрипта в момент коммита.

## Verification

git diff: 0/+3 удаления, syntax check; тест dev_state_fixtures.

## Rollback

Откат коммита.
