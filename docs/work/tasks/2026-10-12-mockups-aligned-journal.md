# Task packet: журнал «образцы приведены к коду» + кадр «Сохранённые — загрузка»

Governance-ID: TG-24A64A1967BF
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Владелец утром видит одним документом (docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md), где за ночь 11–12.10 менялся ЕГО образец, а не код: что было, что стало, почему. Отдельным блоком — изменения образцов, утверждённых владельцем. Плюс в cards-v2.html добавлен кадр «Сохранённые — загрузка» и строка cards-031 перепривязана на него. Мера успеха: паритет не «совпадает» молча за счёт сдвинутого образца; число строк реестра прежнее.

## Scope

In scope: docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md (новый), docs/design/v2-app/cards-v2.html (кадр №54), registries/visual_parity.json (cards-031 по id).

Out of scope: код приложения; страницы под замком владельца.

## Architecture

No architecture change: документация и образцы.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: журнал фиксирует расхождения образец↔код и их основание, чтобы их можно было подтвердить или откатить.

## Verification

Кадр №54 виден в браузере и совпадает с SavedCollectionStates.tsx; cards-031 сверяется без устаревших отличий; число строк реестра прежнее.

## Rollback

Откат коммита.
