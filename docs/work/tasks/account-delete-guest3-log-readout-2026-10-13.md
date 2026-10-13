# Task packet: чтение серверных журналов удаления пустого гостя на №3 (вечер 13.10, только чтение)

Governance-ID: TG-A7CB460DBA82
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 — после 19:30 проверка удаления пустого гостя на аккаунте №3 (финальное нажатие — владелец);
после «нажато» от Сверки — сводка координатору и Авторизации.

## Outcome

- Заготовлен скрипт чтения журналов (gcloud logging read, ADC владельца, только чтение) функций accountDeleteEnqueue /
  accountDeleteMine / accountDeleteWorker за окно проверки и по uid: stage, decision, fallbackFullScan, authDeleted, elapsedMs,
  ошибки.
- Сводка координатору и Авторизации.

## Пробный прогон (13.10, по журналам 12.10)

Скрипт проверен на попытке удаления 12.10 17:37 UTC (runId 89fd3ced_1791826656202): проход дошёл до
`collection_group_matches` (удалено 42 документа) и упал с кодом 9 — не было индекса COLLECTION_GROUP по
`idea_likes_sent.targetAuthorUid`. На 13.10 этот индекс в проде READY (gcloud firestore indexes fields describe),
сверка 41/41 READY — повтор этой причины не ожидается.

## Scope

In scope: чтение журналов Cloud Logging. Out of scope: любые записи в прод, нажатие удаления (владелец), правка кода.

## Architecture

No architecture change.

## Security and privacy

Журналы содержат uid тестового гостя; в сводку — только uid тестового аккаунта и технические поля, без личных данных.
Выгрузка — во временную папку сессии.

## Technical debt

Нет новых.

## Verification

Сводка опирается на строки журнала с отметками времени.

## Rollback

Не требуется (только чтение).
