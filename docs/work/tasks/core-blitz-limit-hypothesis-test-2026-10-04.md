# Task packet: Блиц «28 из 30» — тест гипотезы «подхваченная запись списывает ноль» + мигание «waiting»

Governance-ID: TG-94EA8E61CB15
Governance-ID: TG-94EA8E61CB15
Status: Done (тест + мигание); починка самой причины — после воспроизведения [BLITZ-LIMIT] на эмуляторе
Owner: Ядро; поручение координатора 04.10

## Outcome
1) Тест фиксирует механизм (уточнён тестом): отпечаток записи выдачи (flashcard_training_pending_grant) строится только из параметров раунда — у каждого раунда Блица на той же колоде он одинаковый. Блиц НЕ делает `claimFlashcardTrainingPendingGrantStart` (он есть только в свайпе), поэтому переходы фаз отвечают `claim_required`, запись навсегда в фазе prepared, очистка её не удаляет (Блиц статус игнорирует). Следующий раунд получает `reused` с квитанцией ПЕРВОГО раунда → `consume` видит уже посчитанную квитанцию → idempotent → остаток не меняется («28 из 30» до и после).
2) Экран настройки при каждом обновлении сбрасывал показанный остаток в «waiting» — мигание. Теперь прежнее значение держится до нового.
3) Немые места: результат очистки в Блице и `catch {}` в acknowledgeAndClear пишут причину.

## Scope
- tests/flashcard_training_pending_grant_reuse_skips_quota.test.ts — сценарий гипотезы.
- hooks/useFlashcardTrainingQuotaPreview.ts — без сброса в WAITING при обновлении (первое значение — WAITING как раньше).
- app/flashcards_blitz_session.tsx — лог [BLITZ-LIMIT] blitz:clear_result.
- app/flashcard_training_pending_grant.ts — catch пишет причину.

## Architecture
Поведение списания не меняется — сперва воспроизведение по логам (очередь эмулятора координатора).

## Security and privacy
Данных нет.

## Technical debt
Сама починка (новый раунд не должен наследовать запись прошлого) — после логов.

## Verification
Новый тест + тесты pending grant / квоты / Блица; проверка типов.

## Rollback
Откат коммита.
