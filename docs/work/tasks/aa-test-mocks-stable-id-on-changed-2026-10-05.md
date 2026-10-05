# Task packet: моки stable_id без onStableIdChanged (поручение координатора)

Governance-ID: TG-81CBE8AB238A
Status: In progress
Owner: Claude session 5 · АВТОРИЗАЦИЯ

## Outcome
Тесты, которые мокают `app/stable_id` вручную и по цепочке загружают `app/plus_transfer.ts` (через `revenuecat_init`), падают при загрузке: `onStableIdChanged is not a function` (функция появилась в ebc1a860d, S2d). Чиним только моки, код приложения не меняется.

## Scope
In: ручные моки `../app/stable_id` в тестах, где набор падает с этой ошибкой. Out: код приложения; прочие причины падений (записываются отдельно координатору).

## Architecture
Нет изменений: в фабрику мока добавляется `onStableIdChanged: () => () => undefined` (подписка-заглушка, возвращает отписку).

## Security and privacy
Нет — только тесты.

## Technical debt
Contain: перечень проверенных 35 файлов и результат — в отчёте координатору.

## Verification
Каждый исправленный файл — один прогон через слот светофора; до правки — падение при загрузке, после — набор запускается.

## Rollback
git revert.
