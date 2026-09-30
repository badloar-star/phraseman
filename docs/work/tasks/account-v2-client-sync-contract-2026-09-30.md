# Task packet: Account V2 — клиентский пакет синхронизации по серверному контракту

Governance-ID: TG-831C22D22486
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Клиентский модуль `modules/account-session-v2/account_sync*.ts` (принятый Пакет 3A Codex) выполняет TEMP-контракт сервера (шапки functions/src/accounts_v2_apply_core.ts и functions/src/accounts_v2_adapter/callable.ts + errors.ts): понимает квитанции applied/duplicate/conflict/rejected{code}; решает по `details.final`; `resource-exhausted` с `retryAfterMs` — ожидание, не тратит попытку; повтор с backoff, потолок 5 неудачных попыток → карантин пакета; операции одной сущности отправляются в одном пакете; baseRevision ожидающих операций НИКОГДА не переписывается; неподтверждённые операции не меняются; порядок outbox по сущности сохраняется; SRS `updatedAtMs` — гибридные часы max(Date.now()+смещение_от_serverNowMs, увиденное+1); при `srs_time_in_future` — SRS отдельной новой операцией; поддержка `removeItemIds`; предел жизни операции в outbox < 180 суток (TTL квитанций). Сервер-сторож паритета (accounts_v2_envelope_parity.test.ts) обновлён, если меняются исходы квитанций клиента.

## Scope

In scope: modules/account-session-v2/account_sync.ts, account_sync_outbox.ts, account_sync_runner.ts и их тесты tests/account_sync*_v2.test.ts; при необходимости functions/src/accounts_v2_envelope_parity.test.ts. Out of scope: UI, интеграция в app/_layout или Auth (Пакет 6), index.ts, деплой, эмулятор, commit, остальной app.

## Architecture

Клиент остаётся изолированным модулем без подключения к приложению. Транспорт (httpsCallable) — через инъекцию, в тестах — фейк. Логика решения — повторяет эталон сервера `accountsV2ClientAction`/`accountsV2IsWaitResponse`.

## Security and privacy

Клиент не отправляет чужой uid; ownerUid из сессии. Новых данных не собирает. Логи без содержимого payload.

## Technical debt

Accept temporarily: подключение к приложению — Пакет 6; UI карантина/конфликтов — отдельная задача дизайна.

## Verification

RED→GREEN, `npm run test:one` по затронутым tests/account_sync*_v2.test.ts (со слотом), jest functions по паритету; строгая проверка типов по затронутым файлам; eslint; независимое ревью SPEC+SECURITY до APPROVE.

## Rollback

Копия затронутых файлов в `.tmp_client_sync_backup/`.
