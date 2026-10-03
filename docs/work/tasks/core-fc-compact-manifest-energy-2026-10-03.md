# Task packet: Блиц/Вспомни/Устно — компактный manifest отложенной выдачи (вернуть учёт энергии и месячного лимита)

Governance-ID: TG-8ABFE3E6BA4F
Governance-ID: TG-A7951E69FB75
Governance-ID: TG-8055E8993EBE
Governance-ID: TG-E09AA27840CD
Status: Done — ревью Opus: HIGH исправлен, LOW сделаны
Owner: Ядро; координатор 03.10 («дыра в экономике — бесплатно без лимита»)

## Outcome
С 14.09 (0217c4a21) `prepareFlashcardTrainingPendingGrant` (app/flashcard_training_pending_grant.ts) принимает только компактный manifest (MODE_MANIFEST_KEYS: blitz — orderedCardIds/poolCardIds/roundCardIds/seed/initialCardId/options; recall — orderedCardIds/seed; speaking — orderedCardIds/seed/task; id по ID_RE `^[A-Za-z0-9_.:@/-]{1,180}$`). Блиц шлёт {pool, roundQueue, initialQuestion, energyIntent}, «Вспомни» {round, energyIntent}, «Устно» {cards, prefs, energyIntent} → invalid_input → fail-open → энергия и месячный лимит не списываются. Свайп шлёт компактный формат и учитывается.
Нужно: три экрана шлют компактный manifest; восстановление собирает карточки из уже загруженного пула по id; энергия/квота снова списываются ровно как в свайпе. Fail-open (решение владельца 14.09) остаётся для настоящих отказов инфраструктуры.

## Scope
app/flashcards_blitz_session.tsx, app/flashcards_recall_session.tsx, app/flashcards_speaking_session.tsx (+ при необходимости маленький общий помощник id карточки в app/flashcards/), тесты. Валидатор в app/flashcard_training_pending_grant.ts НЕ ослаблять.

## Architecture
Id карточки в manifest — устойчивый отпечаток (card.id может не проходить ID_RE): `fc_` + хэш от id (без коллизий в пределах пула; при коллизии — ошибка manifest → fail-open с логом). Восстановление: map отпечаток → карточка из текущего пула; несовпадение → `pending_grant_manifest_cards_unavailable` (fail-open). energyIntent больше не в payload: брать текущий интент экрана; если `record.energyOperationId` не совпадает с текущим интентом — разобрать (восстановить интент из полей записи или явная ошибка с логом), без двойного списания.

## Security and privacy
Без новых данных; в manifest вместо текста карточек — отпечатки (меньше данных на диске).

## Technical debt
Нет нового; 4 устаревшие проверки flashcard_training_quota_contract разбираются рядом.

## Verification
RED→GREEN поведенческие тесты: prepare возвращает prepared (не invalid_input) для реальных payload трёх экранов; восстановление из manifest даёт те же карточки; энергия списывается один раз; повтор (reused) не списывает повторно; карточки с неASCII id проходят. Мутации. Точечные тесты + тайпчек файлов. Ревью Opus (деньги).

## Rollback
git revert (вернёт бесплатный fail-open).

## Итог исполнителя (Ядро, 03.10)
Status: Implemented, не закоммичено.

- Новые модули: `app/flashcards/training_manifest_ids.ts` (отпечаток `fc_`+64 бита, индекс пула, коллизия → `pending_grant_manifest_id_collision`, нехватка карточек → `pending_grant_manifest_cards_unavailable`), `app/flashcards/training_energy_intent.ts` (интент под запись журнала, иначе `pending_grant_energy_intent_mismatch`).
- Блиц/«Вспомни»/«Устно»: компактный manifest (blitz: orderedCardIds=пул, roundCardIds, seed, initialCardId; recall: orderedCardIds, seed; speaking: orderedCardIds, seed, task), восстановление из текущего загруженного пула по отпечаткам. energyIntent из payload убран.
- energyIntent: запись == текущий интент → он; ротированная запись (`:resume:N`) → интент журнала; запись прежней попытки (reused) → интент пересобирается по record.attemptId (Blitz/Speaking перебирают суффикс ревизии 0..5); иначе явная ошибка + fail-open. Двойного списания нет: подтверждается ТА операция, что записана в журнале; charged/refunded разруливает reconcile до экрана.
- Валидатор не ослаблен. Тесты: tests/flashcard_training_compact_manifest.test.ts (15). Законные сдвиги сторожей: quota_contract (12/12), fc_recall_session_contract, energy_start_cost_contract, recall_pending_start_behavior (мок реестра энергии).
- Не связано с пакетом и падало до него: energy_start_confirmation_contract (нет app/personal_plan_exercise.tsx), flashcards_entry_fail_open_contract (свайп, regex), fc_session_multi_deck (текст «necesita al menos» в Блице, вёрстка Дизайна).

## Ревью Opus и доводка (Ядро, 03.10)
- Ревью: REQUEST_CHANGES → HIGH «Устно»: при fail-open запись журнала не снималась — следующие входы с теми же настройками бесплатны до max(expiresAtMs, quotaResetAt). Исправлено: abandon(refundSpeakingEntry) + discard ДО speakingLocalStart(), как в «Вспомни»/Блице; сторож порядка.
- Ядро нашло и убрало в «Устно» остаток мутации исполнителя (лишний `speakingLocalStart()` до снятия записи — восстановление файла не прошло из-за блокировки записи). Сторож эту мутацию ловит (проверено: 17/18 с ней, 18/18 без неё).
- LOW: перебор ревизии 0..текущая+1 (потолок 50); FREE_CUSTOM_CARD_LIMIT = 50 закреплён; Блиц пишет один список (orderedCardIds = очередь раунда); refundSpeakingEntry пробрасывает ошибку возврата в abandon (не помечает «возвращено» при невозвращённой энергии).
- Принято (решение 14.09): при fail-open по уже сыгранной подхваченной записи Блиц/«Вспомни» возвращают энергию и стартуют без списания — узкая лазейка «начать → убить приложение → изменить набор».
- Тесты: compact_manifest 18/18, pending_grant 37/37, quota_contract 12/12, blitz_access 5/5, recall 3/3 + 1/1, speaking_quota_unavailable 2/2, speaking_logic 11/11, energy_start_cost 15/15, entry_catch_logs 6/6; тайпчек файлов 0.
- Не из-за пакета красные: energy_start_confirmation_contract (нет app/personal_plan_exercise.tsx), fail_open_contract ветка свайпа, fc_session_multi_deck (вёрстка Блица «Дизайна»); fc_blitz/fc_speaking attempts_integration (.tsx) похоже не исполняются.
