# Task packet: L-1 — монеты на скрытых дублях и поздние начисления на скрытый uid

Governance-ID: TG-8746033721E5
Governance-ID: TG-1E4FE6A85102
Governance-ID: TG-693D1F6D78D4
Status: Done — ревью APPROVE, безопасность PASS; ждёт выкладки
Owner: Ядро; поручение координатора 03.10 (после M-1)

## Outcome
1. `cleanupSiblingStableIdentityDuplicates` (functions/src/auth_identity.ts ~:1273-1330) скрывает users/{duplicateUid} (тот же firebaseAuthUid) в транзакции с лидербордом, но баланс `stars` дубля остаётся на скрытом документе. Переносить его в ту же транзакцию тем же механизмом 8T (`prepareAccountMergeStarsTransfer`/`commitAccountMergeStarsTransfer`, functions/src/auth_merge_stars_transfer.ts): части по 5000, идемпотентность по opId, при любой неувязке — пропуск целиком, чистка не падает.
2. Поздние начисления на уже скрытый аккаунт — СНАЧАЛА измерение: лог `[STARS-LEDGER] credit_to_hidden_account` (uid 8 символов, reason, delta) в журнале при начислении (delta > 0) на документ с identityHidden === true. Исправление — по фактам логов, отдельным шагом.
3. admin_user_operations.ts:393 — не место скрытия (принимает только уже скрытый alias) — не трогать.

## Scope
functions/src/auth_identity.ts (одна функция), functions/src/auth_merge_stars_transfer.ts (при необходимости — параметр источника), functions/src/stars_ledger.ts (только лог), тесты.

## Architecture
Переиспользуем 8T; источник opId — `dedup_<sha256(stable\0duplicate)>` вместо outboxId слияния.

## Security and privacy
Только между документами одного firebaseAuthUid (как и сейчас чистка). Логи без полных uid.

## Technical debt
Поздние начисления не переносятся до решения по логам.

## Verification
RED→GREEN: дубль с балансом → после чистки 0, у стабильного +баланс как grant; повтор → без удвоения; сбой журнала → пропуск, чистка проходит; дубль без stars → ноль лишних чтений; лог начисления на скрытый. Мутации. Тесты по одному файлу.

## Rollback
git revert; функции откатывает координатор.

## Итог исполнителя
Сделано (без коммита и деплоя):
- `functions/src/auth_identity.ts`: `dedupStarsSourceId` (экспорт), `prepareDuplicateStarsTransfer`, и в `cleanupSiblingStableIdentityDuplicates` — `beginStarLedgerTransactionAttempt`, чтение `users/{duplicate}` в транзакции, prepare 8T до записей, commit перед скрытием. 8T не менялся: якорь `dedup_<sha256>` передан как `outboxId` (opId = `account_merge:dedup_<64hex>.<i>`, ≤ 73 символа).
- `functions/src/stars_ledger.ts`: `console.warn('[STARS-LEDGER] credit_to_hidden_account uid=<8> reason=<r> delta=<n>')` при delta > 0 на identityHidden; поведение не менялось.
- Тесты: auth_identity 140 (6 новых + заглушка БД расширена вложенными коллекциями), stars_ledger 36 (2 новых); auth_merge 117, auth_merge_stars_transfer 13, learning_v2_stars_ledger 18, jarvis_data_contract_guard 100 — зелёные; tsc чист.
- Мутации (с cmp-восстановлением): убран commit → 3 красных; недетерминированный якорь → 2 красных; инверсия условия лога → 1 красный.
- Решения: дубль, скрытый под ДРУГИМ canonicalStableId, монеты не отдаёт (лог hidden_under_other_canonical); нет users/{stable} → пропуск.
- Ранее скрытые дубли (identityHidden + canonicalStableId === stableId) по-прежнему пропускаются `continue` — монеты на них не досчитываются. Перенос для них технически возможен (stars уже в данных запроса, нулевая доп. стоимость при балансе 0), идемпотентен по opId, и он же подобрал бы поздние начисления; но не включён — решает координатор после логов.

## Ревью (Opus, код + безопасность, 03.10): APPROVE + PASS; правки до коммита
- MEDIUM-1: владелец дубля перепроверяется ВНУТРИ транзакции (`firebaseAuthUid === authUid`); иначе `skip reason=auth_uid_changed` — ни переноса, ни скрытия. Мутация «без проверки» → тест падает.
- LOW-2: основной аккаунт скрыт → `skip reason=stable_hidden`, монеты остаются.
- LOW-3: если дубль скрыт, а монеты (часть) остались (любой пропуск/остаток) → `identity_cleanup_candidates` reason `dedup_stars_skipped` {duplicateUid, balance, skipReason} для ручного разбора.
- LOW-4: тесты на auth_uid_changed, stable_hidden, кандидата и его отсутствие при полном переносе.
- Ранее скрытые дубли — не досчитываем в этой функции (инвариант раннего continue); при необходимости — разовый скрипт с тем же opId `dedup_<…>` и проверкой владельца.
- Тесты: auth_identity 144/144, auth_merge 117/117, stars_transfer 13/13, stars_ledger 36/36, learning_v2_stars_ledger 18/18, jarvis guard 100/100; тайпчек 0.
- Выкладка: authEnsureStableLink (+ cron/вызовы cleanupLegacyAuthIdentityDuplicates — см. index.ts), функции, пишущие журнал монет (лог credit_to_hidden_account — только наблюдение).
