# Task packet: чек-лист проверки удаления ПОСЛЕ деплоя индексов (документ, ничего не запускать)

Governance-ID: TG-49AB5D18F043
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

docs/phraseman-2.0/ACCOUNT_DELETE_VERIFY_AFTER_INDEXES.md — таблицы: (1) как убедиться, что 5 индексов READY (только чтение);
(2) строки журнала клиента и сервера при повторе настоящего удаления гостя (только по слову владельца Сверке); (3) признаки провала
и действия.

## Scope

Только документ. Ничего не запускается, не деплоится, аккаунты не трогаются.

## Architecture

Форматы строк — из кода: app/account_delete_enqueue.ts, app/cloud_sync.ts, app/firestore_cache_clear.ts,
functions/src/account_delete.ts (accountDeleteLog, runDeleteStage, account_deletion_diagnostics).

## Security and privacy

В журналах только хэши/коды; документ не содержит uid и почт.

## Technical debt

- Contain: при смене формата логов — обновить документ.

## Verification

Каждая строка сверена с исходником (grep по префиксам).

## Rollback

Документ; откат коммита.
