# Task packet: лимит Блица «28 из 30» не меняется после раунда — сперва логи [BLITZ-LIMIT]

Governance-ID: TG-A94759F3DC37
Status: Logs (шаг 1) — починка после воспроизведения
Owner: Ядро; находка DQA через координатора 04.10

## Outcome
После раунда Блица экран настройки показал тот же остаток «28 из 30», что и до раунда. По коду: лимит полностью локальный (AsyncStorage `training_sessions:v1:<stableId>`, без сети), экран перечитывает его при каждом фокусе (useFlashcardTrainingQuotaPreview). Значит, вероятнее «списания не было», чем «не перечитал». Кандидаты: (1) Блиц списывает только при `pendingRecord.phase === 'prepared'` — подхваченная незакрытая запись прошлого раунда даёт ноль списаний; (2) повтор `receiptId` → idempotent; (3) hasPremiumAccess=true; (4) сбой записи → local_storage. Логи покажут, какой.

## Scope
Только логи [BLITZ-LIMIT]:
- app/flashcards_blitz_session.tsx — перед списанием: фаза записи выдачи, короткий receiptId, premium/accessResolved; после — статус, used, bypass; ветка «списание пропущено, запись уже committed».
- app/monthly_training_sessions.ts — consume/preview: ветка (idempotent receipt / premium / exhausted / записано / сбой), used до/после, источник (диск).
- hooks/useFlashcardTrainingQuotaPreview.ts — что прочитал экран и по какому поводу (фокус / возврат в приложение / смена аккаунта).

## Architecture
Поведение не меняется.

## Security and privacy
receiptId — обрезанный технический идентификатор; данных пользователя нет.

## Technical debt
Экран при каждом обновлении сбрасывает показанное значение в «waiting» (мигание счётчика) — при починке держать прежнее значение до нового (правило «мгновенно»).

## Verification
Тесты monthly_training_sessions и Блица; проверка типов по файлам.

## Rollback
Откат коммита.
