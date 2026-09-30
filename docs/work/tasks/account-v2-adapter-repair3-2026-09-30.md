# Task packet: Account V2 — Firestore-адаптер, ремонт №3 (условия APPROVE)

Governance-ID: TG-9CA66AD34ABC
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Закрыть P2 3-го ревью (вердикт APPROVE с условием): gRPC 3 «transaction has expired» → повторяемый; getall_mismatch → повторяемый; серия неудач учитывает и окончательные отказы, откатившие счётчик (нет бесплатного цикла); `resource-exhausted` с retryAfterMs не расходует клиентский потолок попыток (эталон + тест); TEMP-цифра потолка обхода через инстансы; тест ветки `nowMs < previous.firstMs`; перевернуть тест 574.

## Scope

In scope: functions/src/accounts_v2_adapter/*. Out of scope: ядро, index.ts, firestore.rules, deploy, commit, клиент.

## Architecture

Без изменения модели; уточнение классификации и учёта.

## Security and privacy

Текст сообщений ошибок не логируется (только проверяется на /transaction has expired/).

## Technical debt

Accept temporarily: суточный учёт неудач в документе rate — позже (TEMP-цифра).

## Verification

RED→GREEN; мутации; strict tsc; eslint; подтверждающее ревью.

## Rollback

Копия `.tmp_adapter_backup3/`.
