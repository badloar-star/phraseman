# Task packet: Account V2 — клиентский пакет синхронизации, ремонт №1

Governance-ID: TG-7CD73967EF61
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Закрыть SPEC HOLD ревью клиента (SECURITY APPROVE):
- P1: короткий офлайн (8–15 с) навсегда уводил пакет в карантин. Решение: потолок = И ≥5 неудачных попыток, И ≥24 ч с первой неудачи (время по часам с поправкой на сервер); плюс возвратный карантин — requeue для кода `sync_dispatch_attempts_exhausted` (с долгой паузой). Эталон сервера errors.ts (`accountsV2ClientAction`, контракт) и сторож паритета обновить синхронно.
- P2: `sync_receipt_invalid` — неудача с backoff и потолком (отдельный код карантина); счётчик сбрасывать только после проверки квитанций.
- P2: гибридные часы — верхняя граница `serverNow + ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS − запас`; «увиденное» должно быть подтверждено сервером (документировать); смещение часов хранить на диске.
- P2: перевыпуск SRS выкидывает поля, переписанные более поздними операциями той же сущности.
- P2: итоги conflict/rejected переживают крах: `listUnresolved()`/флаг resolved в ack; детерминированные id перевыпуска `${id}:srs`/`${id}:rest`.
- P3: срок жизни по времени с поправкой на сервер + отрицательный возраст подозрителен; id пакета с хэшем списка номеров для «дыр»; легаси `{outcome:'rejected'}` — backoff/потолок; лог причины `sync_receipt_invalid`; устаревшие комментарии сервера (firestore_port.ts, accounts_v2_contract.ts); сторож: 170 < ACCOUNTS_V2_RECEIPT_TTL_MS; недостающие тесты из ревью.

## Scope

In scope: modules/account-session-v2/account_sync*.ts, tests/account_sync*_v2.test.ts, functions/src/accounts_v2_envelope_parity.test.ts, functions/src/accounts_v2_adapter/errors.ts (+ его тест), комментарии в functions/src/accounts_v2_adapter/firestore_port.ts и functions/src/accounts_v2_contract.ts (только комментарии). Out of scope: подключение к app, деплой, commit.

## Architecture

Контракт ошибок: карантин по потолку только если и попыток ≥5, и прошло ≥24 ч; карантин по потолку возвратный.

## Security and privacy

Без новых данных; логи — коды без payload.

## Technical debt

Accept temporarily: UI карантина/конфликтов — Пакет 6/дизайн.

## Verification

RED→GREEN; все tests/account_*_v2*; functions src/accounts_v2_; строгая проверка типов; eslint; повторное ревью.

## Rollback

Копия `.tmp_client_sync_backup2/`.
