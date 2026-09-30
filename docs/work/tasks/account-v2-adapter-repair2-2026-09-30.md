# Task packet: Account V2 — Firestore-адаптер, ремонт №2 (окончательные коды только с явной меткой)

Governance-ID: TG-6ACFDD4A9F0F
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Повторное ревью: SECURITY APPROVE, SPEC HOLD (P1): временные сбои (gRPC 13/2/1, ошибки без кода, таймаут/OOM функции → HTTP 500 = `internal`) классифицировались как окончательный `internal` и уводили пакет в карантин. Решение: окончательными считаются ТОЛЬКО отказы с явной меткой `details.final === true` (детерминированные коды ядра/адаптера отдаются как `failed-precondition` с `details:{final:true, code}`); всё остальное, включая голый `internal` без метки, — повторяемое с клиентским потолком попыток (5, затем карантин) — TEMP-контракт. Плюс P3: учёт неудач в памяти инстанса для повторяемых путей (детерминированно падающий 4/10 не крутится бесплатно), тест и warn вытеснения кэша, TEMP-заметки (ручной сброс rate не снимает кэш-блок; склейка отправок клиента; HMAC для тега uid — позже).

## Scope

In scope: functions/src/accounts_v2_adapter/*. Out of scope: ядро, index.ts, firestore.rules, deploy, commit, клиент.

## Architecture

Контракт ошибок: `details.final === true` → карантин; иначе → повтор с backoff и клиентским потолком. resource-exhausted — всегда с retryAfterMs.

## Security and privacy

Без изменений; в details только машинный код, без данных.

## Technical debt

Contain: HMAC-тег uid — TEMP.

## Verification

RED→GREEN; тесты на коды 13/2/1/без кода/голый internal → unavailable-подобный повторяемый; детерминированные → failed-precondition+final; вытеснение кэша; strict tsc; eslint; повторное ревью.

## Rollback

Копия `.tmp_adapter_backup2/`.
