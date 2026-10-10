# Task packet: удалить сторож personal_plan_sunset_dev_bypass

Governance-ID: TG-709240B02BA7
Status: Done (2026-10-10)
Owner: сессия «2 · Дизайн» (поручение координатора)
Related epic/enabler: снятие «Личного плана» (efe19ae9d, 30.09)

## Outcome
Из набора тестов убран сторож, который импортирует удалённый модуль app/personal_plan_sunset и не может запуститься («Cannot find module»).

## Scope
In scope: tests/personal_plan_sunset_dev_bypass_contract.test.ts (удаление).
Out of scope: три соседних теста с тем же импортом (personal_plan_sunset, _activation, _clock) — отдать координатору/Ядру; код приложения не меняется.

## Architecture
Без изменений: модуль и «Личный план» удалены раньше, сторож охранял несуществующее.

## Security and privacy
Не затрагивает данные.

## Technical debt
Pay now: мёртвый сторож убран. Contain: три соседних сироты названы в отчёте.

## Verification
Сторож больше не в списке красных; grep по импортам модуля в tests/ показывает оставшиеся три.

## Rollback
git revert коммита (файл вернётся из истории).
