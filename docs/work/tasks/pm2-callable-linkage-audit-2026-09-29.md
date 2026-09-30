# Task packet: сверка клиентских вызовов серверных функций после ретайра PM2.0

Governance-ID: TG-6318B0B42357
Status: In progress
Owner: Claude session (ночь, владелец спит; разрешил Opus/агентов)
Related epic/enabler: E21, E22, E25

## Outcome

Ни один клиентский вызов не ссылается на удалённую/неэкспортированную серверную функцию (иначе `not-found` в рантайме). Успех: скрипт-проба сравнивает имена вызовов в app/components/modules с экспортами functions/src/index.ts и проходит; расхождения либо исправлены, либо записаны как blocker.

## Scope

In scope: новая read-only проба `tests/client_callable_linkage.probe.ts`; точечные правки клиентских вызовов удалённых функций; запись в PROGRESS.md.
Out of scope: deploy, изменение серверной логики, удаление тестов, 217 нерелевантных ошибок tsc.

## Architecture

Границы не меняются. Проба только читает исходники. Инвариант: каждое имя из httpsCallable(...) есть в экспортах index.ts либо в явном allowlist с причиной.

## Security and privacy

Данные и разрешения не затрагиваются. Секреты не читаются.

## Technical debt

Contain: allowlist исключений с причиной в самой пробе; неразобранные расхождения — в PROGRESS как BLOCKED с владельцем «владелец/следующая сессия».

## Verification

`npx tsx tests/client_callable_linkage.probe.ts` exit 0; повтор всех проб; запись фактов в PROGRESS.md.

## Rollback

Удалить новый файл пробы; правки клиента откатываются обратной правкой конкретного файла.
