# Task packet: flashcards_entry_fail_open_contract — ветка свайпа (законный сдвиг)

Governance-ID: TG-8ECDCC8585A5
Status: Done
Owner: Ядро; координатор 03.10 («fail_open_contract (ветка свайпа) — твой»)

## Outcome
Сторож ждёт в app/flashcards_swipe.tsx литерал `/^pending_grant/.test(message)`. Свайп вынес решение в правило `canUseLegacySwipeGrantFailOpen(message, isTrueFalseSession)` (app/flashcards/training_entry_policy.ts): то же `/^pending_grant/` + исключения «Верно/Неверно» и защищённых расчётов. Сторож проверяет для свайпа вызов правила и само правило в модуле.

## Scope
tests/flashcards_entry_fail_open_contract.test.ts.

## Architecture
Без изменения кода.

## Security and privacy
Нет изменений.

## Technical debt
Принято: нового долга нет; правится только сторож под вынесенное правило.

## Verification
Файл 7/7.

## Rollback
git revert.
