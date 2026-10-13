# «Активность за год»: пустой список дней не пересоздаётся на каждый рендер (ревью Авторизации 13.10)

Governance-ID: TG-26F9B5B1CF06
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0»

## Outcome
При пустом кэше экран `year_activity` не пересчитывает модель сетки (365 клеток) на каждый рендер: вместо нового `[]` используется одна общая константа.

## Scope
Одна строка в `app/year_activity.tsx` (константа `NO_DAYS` и её использование). Поведение и внешний вид не меняются.

## Architecture
`useMemo(() => buildYearActivityModel(days), [days])` зависит от ссылки на `days`; стабильная ссылка при пустых данных убирает лишние пересчёты.

## Security and privacy
Данных и разрешений не касается.

## Technical debt
Закрывает замечание ревью; других долгов не добавляет.

## Verification
Источник-контракт в `tests/year_activity_model.test.ts` (константа есть, `?? []` в `days` нет); синтаксическая проверка.

## Rollback
git revert коммита.

## Дополнение (13.10, координатор)
Тем же коммитом перепинён эталон `panel` в `tests/flashcards_speaking_liquid_glass_source_contract.test.mjs`: c9037920f добавил в `SpeakingPanel.tsx` только комментарий `light-accent-ok`, код панели не менялся. Откат — git revert.
