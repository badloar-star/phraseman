# Ядро · проверка права вызова без ложного 🔴 на только что созданной функции (координатор 29.10)

Governance-ID: TG-EF70BB092117
Status: Done — node --test 6/6; вживую: --only storyPollVote с имитацией отставания Asset → get-iam-policy «public», код 0
Owner: 1 · ЯДРО

## Outcome
`scripts/check_callable_invoker.mjs` не даёт 🔴 на функцию, которой firebase deploy только что выдал allUsers → run.invoker
(storyPollVote 29.10 07:21:42: поиск Cloud Asset отстаёт на минуты). Порядок: поиск Cloud Asset → для «нет права»
прямой `gcloud run services get-iam-policy` → если и там нет — повтор через 150 с → только потом 🔴. Лог `[INVOKER-CHECK]`
в каждой ветке (источник ответа, попытка, причина).

## Scope
In scope: `scripts/check_callable_invoker.mjs`, новый тест `tests/check_callable_invoker.test.mjs` (node --test).
Out of scope: выкладка, изменение прав, `deploy_from_clean_head.sh` (вызов и коды выхода прежние).

## Architecture
Логика вынесена в экспортируемую `checkCallableInvokers({ gcloud, sleep, only, retryDelayMs, log })`; запуск файлом —
прежний CLI. Коды выхода: 0 — всё есть; 1 — нет права, подтверждено напрямую после повтора; 2 — не удалось проверить.

## Security and privacy
Только чтение IAM-политик своего проекта; новых прав и данных нет.

## Technical debt
Не создаёт: CLI и коды выхода прежние.

## Verification
node --test: Asset отстал → прямое чтение подтверждает (0, без повтора); прямое «нет» → повтор → появилось (0);
нет после повтора (1); прямое чтение падает дважды (2); --only фильтр.

## Rollback
`git revert` коммита.
