# Task packet: M-1 — nonce, привязанный к метке для anon_merge_claim (привязка к вызывающему)

Governance-ID: TG-179ECC6AD225
Governance-ID: TG-3EB6CB827EB4
Governance-ID: TG-8746033721E5
Status: Done — security-ревью №2 PASS с замечаниями (LOW закрыты), ждёт выкладки
Owner: Ядро; поручение координатора 03.10 («M-1 — ДА, сразу, приоритет безопасности»)

## Outcome
Сейчас `anon_merge_claim` = { authUid, at } доказывает только, что анонимный владелец поставил метку. Любой, кто знает stableId жертвы, в течение 10 мин может вызвать `authMergeStableAccounts` со своим аккаунтом-победителем и поглотить аккаунт жертвы (с 8T — вместе с балансом монет). Нужно: `authStampAnonOwnership` выдаёт клиенту случайный nonce (crypto.randomBytes(32), base64url), на документе хранится только sha256; `authMergeStableAccounts` требует nonce и сверяет хэш (timingSafeEqual); метка гасится после использования (уже delete при слиянии — проверить ВСЕ ветки) и при неверном nonce не продлевается.

Совместимость с 1.6.24: старый клиент не шлёт запрос nonce и не передаёт его в merge. Метка БЕЗ nonceHash (поставлена по запросу без `nonceRequested: true`) → прежний путь с тем же 10-мин окном и логом `[ANON-MERGE-CLAIM] legacy_path`; выключатель-константа `ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED` (выключить после min_app_version 2.0). Метка С nonceHash без/с неверным nonce → permission-denied, понижения до legacy нет.

## Scope
functions/src/auth_identity.ts (stamp, readAnonMergeClaim, использование на :526), functions/src/auth_merge.ts (проверка в транзакции + публикации outbox), тесты. Клиент (app/auth_provider.ts, app/cloud_sync.ts) — отдельным шагом: файлы заняты другой сессией.

## Architecture
Сервер выдаёт nonce (он живёт до успешного слияния/перепривязки или конца 10-минутного окна метки; строгой «одноразовости» по использованию нет), хранит хэш; клиент держит nonce в памяти до merge. Без новых коллекций и чтений: хэш в том же поле метки.

## Security and privacy
Nonce не логируется (только первые 6 символов хэша). App Check не включать.

## Technical debt
Legacy-путь живёт до min_app_version 2.0 — дыра для меток старых клиентов сохраняется до выключателя.

## Verification
RED→GREEN: верный nonce → слияние; без nonce при nonceHash → отказ; неверный nonce → отказ; legacy-метка без nonce → проходит с логом; выключатель off → legacy отказ; повтор того же nonce после слияния → отказ. Мутации; functions-тесты по одному; тайпчек; security-ревью Opus.

## Rollback
git revert; функции откатывает координатор.

## Итог исполнителя + доводка Ядра (03.10)
- auth_identity.ts: `ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED=true` (выключить после min_app_version 2.0), `hashAnonMergeNonce`, `generateAnonMergeNonce` (randomBytes(32) base64url), `verifyAnonMergeClaimNonce` (timingSafeEqual; метка с nonceHash никогда не понижается до legacy), `parseAnonMergeNonce` (≤128). stamp: `nonceRequested===true` → nonceHash в метке, `mergeNonce` в ответе; без флага — прежняя метка и форма ответа. Запись метки через mergeFields (иначе старый nonceHash переживал бы stamp без флага). :526 (отпечаток для anon_relink) не менялся — не допуск слияния.
- auth_merge.ts: `anonMergeNonce` из запроса → резервирование (проверка nonce) → в outbox пишется только `anonClaimNonceHash`; публикация (триггер/cron без клиента) требует, чтобы метка несла тот же хэш (подмена метки между резервированием и публикацией → отказ). Отказ всегда permission-denied/stable_id_mismatch. Метка гасится в ветке успешного слияния; при отказе не трогается.
- Логи `[ANON-MERGE-CLAIM]` на всех ветках, nonce не логируется.
- Тесты: auth_identity 117/117 (+9), auth_merge 106/106 (+8), auth_merge_stars_transfer 13/13, flashcard_lists 25/25, revenuecat_phase2 2/2. Тайпчек — 0 новых.
- Мутации: M1 (не требовать nonce при nonceHash) → 2 падения; M2 (без timingSafeEqual) → 1; M3 (без сверки хэша на публикации) → 1 (тест добавлен Ядром после того, как мутант выжил).
- Контракт клиента (отдельный шаг, app/auth_provider.ts + app/cloud_sync.ts заняты): stamp `{stableId, nonceRequested:true}` → `mergeNonce` (держать в памяти); merge `{stableIdA, stableIdB, anonMergeNonce}`.


## Доводка по security-ревью (исполнитель, 03.10)
- HIGH-1: вторая дверь anon_relink (assertStableOwner) тоже требует verifyAnonMergeClaimNonce; nonce протянут authEnsureStableLink -> ensureStableLinkForAuth -> ensureStableIdentityPair/resolveStableUidForAuth -> assertStableOwner. nonceHash входит в отпечаток метки (подмена между assert и транзакцией = отказ).
- Legacy-ветка (метка без nonceHash), решение координатора: вызывающий обязан быть google.com/apple.com и auth_time*1000 >= claim.at - 5000 (иначе legacy_anonymous_caller / legacy_signed_in_before_claim; поля обязательны). На публикации (триггер/cron) эти проверки пропускаются (skipLegacyCallerChecks): остаются выключатель и равенство хэша.
- Метка одноразова и при anon_relink: гасится в той же транзакции; пишется аудит anon_relink_audit/{auto} (stableId, previousAuthUid, newAuthUid, provider, claimAt, at, mode, expiresAt=at+30д). Правила Firestore не менялись (за координатором).
- loser_has_provider: проигравший с linkedAuth.providerUid метками не поглощается.
- MEDIUM-1: окончательный отказ по метке на публикации -> outbox status cancelled_claim_invalid (+cancelReason), mistakePracticeMergePending снят с обеих сторон, повтор задачи = no-op.
- LOW-3: немой catch возврата в pending теперь логирует [AUTH-MERGE] outbox_requeue_failed.
- Измерение: [ANON-MERGE-CLAIM] device_headers (hasInstanceIdHeader/hasGmpIdHeader, без значений) в stamp/ensureStableLink/merge; authAgeMs в legacy_path и nonce_ok.
- Тесты: auth_identity 133/133, auth_merge 114/114, stars_transfer 13, flashcard_lists 25, revenuecat_phase2 2; tsc чист (кроме account_authority*). Мутации M1-M7 все ловятся.
- Контракт клиента: stamp {stableId, nonceRequested:true} -> mergeNonce; authEnsureStableLink и authMergeStableAccounts принимают anonMergeNonce.

## Доводка Ядра + security-ревью №2 (Opus, 03.10): PASS с замечаниями
- Публикация больше не проверяет срок метки (триггер/cron могут прийти позже 10 мин): сверяется ТА ЖЕ метка — `anonClaimAt` + `anonClaimNonceHash`, записанные в outbox при резервировании (`claim_changed` → отмена). Outbox без `anonClaimAt` (зарезервирован до выкладки) — прежнее правило свежести.
- LOW (ревью): повторное резервирование явно пишет/стирает `anonClaimNonceHash`, `anonClaimAt`, `cancelReason` (иначе после отмены повтор той же пары отменялся снова); `anon_relink_audit.expiresAt` — Timestamp + TTL-политика в firestore.indexes.json (30 дней реально соблюдаются); лог `legacy_path door=merge|relink` — по нему решим, оставлять ли legacy-дверь relink.
- Ревью подтвердило: других дверей нет (allowAnon/ProviderRelink только из ensureStableLinkForAuth), provider/auth_time из проверенного токена, skipLegacyCallerChecks недостижим с клиента, DoS-отмены законного слияния нет, данные при отмене не теряются.
- Открыто: `anon_relink_audit` и `coin_reconcile_receipts` не исключены из админского catch-all firestore.rules:3331 (LOW-A, отдельной правкой rules). Остаточный риск legacy: атакующий с Google-аккаунтом, знающий stableId, входит в 10-мин окно жертвы (через relink — захват документа) — до min_app_version 2.0 и выключателя.
- Тесты: auth_identity 133/133, auth_merge 117/117, stars_transfer 13/13, flashcard_lists 25/25, revenuecat_phase2 2/2, jarvis guard 100/100, app_check_sealed 4/4; тайпчек 0 новых; мутации M1–M8 ловятся.
- Выкладка: functions authStampAnonOwnership, authEnsureStableLink, authMergeStableAccounts, accountMergeOutboxWorker, accountMergeOutboxRetryCron + firestore:indexes (TTL anon_relink_audit).
