# Task packet: сторож «до кнопки действия можно добраться» — разбор 11 новых и 2 устаревших

Governance-ID: TG-94EA8E61CB15
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 04.10)
Related epic/enabler: UX — кнопка «Готово» не уходит за экран на низких телефонах

## Outcome

Сторож tests/reachable_action_buttons_contract.test.ts снова зелёный и честный: устаревшие записи
долга (ExplainReportButton, ReportErrorButton — уже починены) убраны; по 11 новым срабатываниям
решено: настоящая ловушка (кнопка без прокрутки) — баг, отдаётся владельцу экрана через координатора;
ложное срабатывание — явное исключение с обоснованием. Шпиль (зона Codex) — только отмечается.

## Scope

In scope: tests/reachable_action_buttons_contract.test.ts. Out of scope: вёрстка экранов
(сессии 2/3, Codex для Шпиля).

## Architecture

Без изменений: эвристика остаётся; ложные срабатывания — отдельный список с причиной, настоящие —
в известный долг только по решению координатора.

## Security and privacy

Нет.

## Technical debt

Contain: настоящие ловушки фиксируются как долг с владельцем (координатор раздаёт).

## Verification

npm run test:one -- --runInBand tests/reachable_action_buttons_contract.test.ts.

## Rollback

git revert.
