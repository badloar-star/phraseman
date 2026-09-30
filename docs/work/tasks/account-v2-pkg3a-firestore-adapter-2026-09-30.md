# Task packet: Account V2 — Пакет 3A-srv: Firestore-адаптер порта + callable (без экспорта)

Governance-ID: TG-AEB4A011B5CF
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Серверное ядро 3S получает реальный адаптер Firestore и тонкий callable-обработчик, оба НЕ подключены к functions/src/index.ts (деплой ничего не создаёт). Адаптер: пути документов под `accounts_v2/{uid}/entities/{docId}` и `accounts_v2/{uid}/ops/{opDocId}`, чтение всего плана одним getAll внутри транзакции, запись в той же транзакции, порт бросает на ключ вне плана. Callable: auth → resolveCallerUid → validateBatch → транзакция(planBatchReads → getAll → applyBatch) → ответ `{receipts, serverNowMs}`; лимит частоты (минимальный, на uid, в памяти инстанса + документ-счётчик? — выбрать дешёвый) и TTL-поле квитанций (expireAt) из TEMP. Юнит-тесты на фейковом Firestore (без эмулятора).

## Scope

In scope: новые functions/src/accounts_v2_firestore_port.ts, accounts_v2_callable.ts и их тесты. Out of scope: index.ts, firestore.rules, firestore.indexes.json (исключения индексов — записать в отчёт как задачу деплоя), эмулятор, deploy, commit, клиент.

## Architecture

Порт = синхронный интерфейс ядра поверх заранее прочитанных снапшотов (предчтение по planBatchReads), записи накапливаются и применяются tx.set в конце. Одна транзакция на пакет; retries Firestore безопасны, так как ядро детерминировано. App Check не используется (запломбирован): callable с `enforceAppCheck: false` через существующие callable_options проекта.

## Security and privacy

uid только из request.auth; документы под uid; ответ не содержит чужих данных; логи — префикс [ACCOUNTS-V2] без содержимого. Новых данных пользователя сверх уже описанных в Account V2 нет.

## Technical debt

Accept temporarily: правила Firestore (запрет прямой записи клиента в accounts_v2/**) и исключения индексов — следующий шаг с общей правкой firestore.rules; подключение к index.ts — только после клиентского пакета.

## Verification

RED→GREEN; jest по новым тестам и всем accounts_v2; strict tsc; eslint; grep: index.ts без accounts_v2; ≤800 строк; независимое ревью SPEC+SECURITY до APPROVE.

## Rollback

Новые файлы не подключены — удаление файлов.
