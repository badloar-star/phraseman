# Task packet: Account V2 — Пакет 3S, ремонт №6 (контракт клиента + два теста)

Governance-ID: TG-78EC6C619D2E
Status: In progress
Owner: Claude session (Account V2)

## Outcome

6-е ревью: SECURITY APPROVE, SPEC HOLD только из-за текста TEMP-контракта клиента. Переписать пункт (а) (продвижение базы ожидающих операций только при доказанном отсутствии чужих ревизий: applied/duplicate с serverRevision == known+1 или == known; после conflict/разрыва — перечитать сущность, базу не переписывать; никогда не менять операции из отправленного/неподтверждённого пакета); пункт (в) — `serverNowMs` отдаёт адаптер в ответе callable вне квитанций; добавить пункт о сохранении порядка outbox по сущности и запрете подмешивать операции другого устройства. Два теста: SRS в пакете с равным временем использует исходную базу (op2 база 1 seq 3 после op1 база 1 seq 5 → conflict); GC tombstone ровно на ревизии R0 вытесняется (ловит мутацию `<`).

## Scope

In scope: functions/src/accounts_v2_*.ts (только комментарии TEMP и тесты). Out of scope: логика ядра, клиент, index.ts, firestore.rules, deploy, commit.

## Architecture

Без изменений логики.

## Security and privacy

Без изменений.

## Technical debt

Contain: контракт клиента уточнён.

## Verification

jest всех accounts_v2 (новые тесты зелёные; проверить мутацией, что тесты ловят подмену базы в SRS и `<` в GC), strict tsc, eslint, ≤800 строк; финальное ревью.

## Rollback

Копия до ремонта №6: `.tmp_3s_backup6/`.
