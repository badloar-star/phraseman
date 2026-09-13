# Task packet: экран тренировки карточек «Не удалось проверить лимит» — сперва логи

Governance-ID: TG-E02F7784532F
Status: In progress
Owner: сессия Claude (freemium vNext), по вводной владельца 2026-09-13
Related epic/enabler: Revenue VNext Epic 2A (квота тренировок), инцидент phone-state SQLCipher NOTADB

## Outcome

Владелец на iOS dev-сборке видит «Не удалось проверить лимит тренировок» на экране
устной тренировки, хотя `consume` квоты уже пускает при недоступном хранилище.
Значит, отказ рождается НЕ в квоте, а где-то в цепочке входа сессии — и цепочка
глотает ошибку немым `.catch(async () => {…})`. Результат задачи: каждый ранний
выход и каждый catch цепочки входа четырёх экранов сессий печатает стадию,
причину и значения (`[FC-TRAIN-ENTRY]`), а сообщение на экране больше не врёт
«не удалось проверить лимит», когда лимит ни при чём. Успех: один перезапуск
владельца показывает точную стадию падения.

## Scope

In scope: `app/flashcards_speaking_session.tsx`, `app/flashcards_blitz_session.tsx`,
`app/flashcards_recall_session.tsx`, `app/flashcards_swipe.tsx` — только логирование
в catch/ранних выходах цепочки входа и честный текст состояния «не удалось
подготовить тренировку» (вместо «лимит»). `hooks/useSpeakingAttemptGate.ts` уже
fail-open при `unavailable`.

Out of scope: починка SQLCipher/ключа Keychain (ведёт другая сессия:
`modules/phone-state/database.ts`), изменение самой квоты `revenue_quota_access.ts`
(правится параллельно), pending-grant журнал.

## Architecture

Без архитектурных изменений. Цепочка входа: `resolveFlashcardTrainingPendingGrantAccount`
→ `prepareFlashcardTrainingPendingGrant` → `reconcile…` → энергия → `consumeFlashcardTrainingQuota`
→ `markQuotaCommitted` → playable. Ответ на вопрос владельца «должна ли квота зависеть от
SQLCipher»: чеки квоты остаются иммутабельными фактами PhoneState (Economy Constitution:
баланс — проекция операций, второго писателя-«зеркала» в AsyncStorage не заводим);
деградация — fail-open без списания (уже сделано в `consume`, и так же работает
голосовой гейт). Отдельное AsyncStorage-зеркало создало бы двойную истину.

## Security and privacy

Логи не содержат PII: stableId уже печатается существующими логами цепочки,
новые строки добавляют стадию, код ошибки и булевы флаги.

## Technical debt

- Pay now: немые catch в четырёх экранах (нарушение правила «сперва логи»).
- Contain: текст состояния — RVTD-034 (честное сообщение о стадии), сторож
  `tests/flashcards_session_entry_catch_logs_contract.test.ts` запрещает возврат немого catch.

## Verification

- `tests/flashcards_session_entry_catch_logs_contract.test.ts` — во всех четырёх
  экранах catch цепочки входа содержит `[FC-TRAIN-ENTRY]` и печатает `error`.
- Повтор владельцем: `grep FC-TRAIN-ENTRY .expo/metro-console.log` показывает `entry:catch stage=…`.

## Rollback

`git revert` — только логи и текст; поведение цепочки не меняется.
