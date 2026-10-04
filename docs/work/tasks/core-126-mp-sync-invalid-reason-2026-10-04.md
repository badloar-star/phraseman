# Task packet: §126 п.9 — mistakePracticeSyncEvents 400 (~50%): причина отказа в журнале

Governance-ID: TG-0CF68C553F0B
Status: Done (logs first)
Owner: Ядро

## Outcome
Все отказы разбора запроса синхронизации журнала ошибок шли через немой catch → invalid-argument без причины. Теперь fail(reason) несёт конкретную причину (request_shape / append_shape / list_shape / event_shape:<поле> / event_too_large / event_target_mismatch / record_uid), а catch пишет [MP-SYNC] invalid: причина, studyTarget, число событий, длина запроса (без uid). Ответ клиенту прежний.

## Scope
functions/src/mistake_practice_event_sync.ts — только мои хунки; чужая незакоммиченная строка 'it' в STUDY_TARGETS остаётся в рабочей копии (коммит через временный индекс, по указанию координатора).

## Architecture
fail(reason) бросает ту же ошибку 'mistake_practice_event_sync_invalid' с полем reason; разбор события проверяет условия по одному, чтобы назвать первое нарушенное поле.

## Security and privacy
Без uid и содержимого событий: только имена полей, studyTarget, счётчики, длина.

## Technical debt
Сама починка формата — после логов с прода (нужна выкладка).

## Verification
Тесты mistake_practice_event_sync (functions), проверка типов functions.

## Rollback
Откат коммита.
