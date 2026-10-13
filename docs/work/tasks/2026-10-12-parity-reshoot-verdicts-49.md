# Task packet: сверка свежих кадров по пересъёмкам, обновление сводки и дефектов кода

Governance-ID: TG-E262DDFCC223
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

По мере прихода пересъёмок Сверки выносятся вердикты (реестр по id), подтверждённые дефекты кода пишутся в R1_CODE_DEFECTS_FROM_PARITY.md со статусом «подтверждено», образцы-кадры, нарисованные с приложения (cards-v2 №54–72), приводятся в соответствие кадрам, сводка утреннего листа обновляется.

## Scope

In scope: registries/visual_parity.json (строки по id), docs/phraseman-2.0/R1_CODE_DEFECTS_FROM_PARITY.md, docs/design/v2-app/cards-v2.html (только новые кадры в конце), утренний лист OWNER_MORNING_MOCKUPS_A.*.

Out of scope: код приложения, утверждённые кадры cards-v2 №1–53, страницы под замком.

## Architecture

No architecture change: образцы и документация.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: дефекты кода — координатору списком.

## Verification

Число строк реестра прежнее (1093); новые кадры cards-v2 открываются в браузере; гейт visual_parity_gate считает.

## Rollback

Откат коммита.
