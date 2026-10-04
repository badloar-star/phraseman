# Task packet: Account Authority 2.0 — этап S3: сервер — удаление, правила, TTL

Governance-ID: TG-82054C0456F4
Governance-ID: TG-A372255522C9
Governance-ID: TG-4681DF3C98AA
Governance-ID: TG-92E462A421A5
Governance-ID: TG-827BE782E9D3
Governance-ID: TG-0B02B6B716AD
Status: Planned
Owner: Claude session (Account Authority 2.0)

## Outcome
По плану (docs/superpowers/plans/2026-10-01-account-authority-2-0.md, строка S3):
1. **Firebase-порты удаления** для шва `AccountDeleteStateStorePort` (S2a, `functions/src/account_authority/delete_contract.ts`, `firebase_lease_callable.ts` → `overrides.deleteStateStore`): состояние удаления аккаунта AA в Firestore (одна транзакция с подготовкой удаления; `beginBoundAccountDeletion` уже готов).
2. **Задача purge** — ограниченная (батчи, лимит документов за проход), идемпотентная (курсор/квитанция), возобновляемая; удаляет все документы коллекций `account_authority_*` этого аккаунта (принципалы по хешу uid, аренда, квитанции, отметки сессий, привязки, индекс токенов, счётчик квоты) и освобождает личность провайдера (release provider identity, по контракту delete_contract).
3. **Legacy-удаление** (`deleteAccountAndWipe` / `account_delete*.ts` в functions/src) — добавить коллекции `account_authority_*` в очистку (иначе после удаления по старому пути остаются принципалы/аренда/привязки — найдено security-ревью S2a: raw/hashed uid не стирались).
4. **Явные deny-правила** в `firestore.rules` для всех коллекций `account_authority_*` (клиент не читает и не пишет; только Admin SDK). ВНИМАНИЕ: в firestore.rules есть ЧУЖИЕ незакоммиченные правки — трогать только свои строки, коммит частями.
5. **TTL**: поле `expireAt` (уже пишется S2a, у принципала НЕТ — решение §AA-9 (2)) — описать политики TTL (Firestore TTL на `expireAt` для коллекций аренды/привязок/квоты/отметок/индекса/retired_sessions) в репозитории (firestore.indexes.json fieldOverrides ttl или документ развёртывания — что принято в проекте) — САМО включение TTL в проде = развёртывание, только по команде координатора.
6. **Джарвис**: если какой-то департамент читает эти коллекции — обновить контракт (`functions/src/jarvis/jarvis_data_contract_guard.test.ts`); иначе явно записать «не читает».
7. Функции по-прежнему НЕ экспортируются из `functions/src/index.ts`, `rolloutEnabled:false`.

## Scope
`functions/src/account_authority/*`, legacy-удаление аккаунта в `functions/src/account_delete*` (только добавление коллекций AA), `firestore.rules` (только свои правила), конфиг TTL, тесты (юнит + Firestore-эмулятор, если доступен без перегрузки машины — иначе юнит на фейковом Firestore и пометка «эмулятор — S8»).

## Architecture
Сервер — единственный, кто пишет коллекции AA; удаление: подготовка (одна транзакция) → асинхронный ограниченный purge → освобождение провайдера; legacy-удаление тоже чистит AA.

## Security and privacy
Security-ревью обязательно. Удаление полное (все коллекции AA по аккаунту/хешу uid), идемпотентное; правила deny-all для клиента; TTL как страховка. Политика конфиденциальности (S10): срок хранения 90 дн. и удаление вместе с аккаунтом — проверить формулировку.

## Technical debt
Включение TTL и выкладка — по команде координатора (развёртывание). Эмулятор Firestore — S8, если сейчас машина перегружена.

## Verification
Тесты: purge удаляет все коллекции AA аккаунта и не трогает чужие; повтор purge идемпотентен; обрыв посреди — возобновление с курсора; legacy-удаление чистит AA; правила: клиент не читает/не пишет `account_authority_*` (тест правил на эмуляторе или существующий раннер правил проекта); мутации; тайпчек функций (только если нет идущего полного — правило нагрузки); security-ревью до APPROVE.

## Rollback
git revert; включение TTL/выкладка — не выполнялись.

## Итог исполнителя S3 (2026-10-04)

Status: Implemented (не закоммичено, не задеплоено; rolloutEnabled:false; экспорта из index.ts нет).

1. **Порт состояния удаления** — `functions/src/account_authority/account_delete_store.ts`:
   `createFirestoreAccountDeleteStateStore(db)` (документ `account_authority_delete_jobs_v1/{accountId}`,
   строгий разбор job, чужой аккаунт/тенант/порча → ошибка); расписание истечения хранится полем
   `expirySweepAtMs` в том же документе (атомарно с терминальным состоянием);
   `listDueAccountDeleteExpirySweeps(db, now, limit)` — запрос для будущего планового sweep.
   По умолчанию адаптер по-прежнему `DELETE_STATE_STORE_NOT_WIRED` (подключение — S4).
2. **Purge** — `account_authority_purge.ts`: `createFirestoreAccountDeletePurgePort(db)` под существующий
   `AccountDeletePurgePort`/`runBoundedDeletePurge`. Проход ≤ maxItems (≤450, одна пачка), каждый проход
   заново находит остаток запросами (идемпотентно, обрыв = повтор), курсор `aa-purge.v1:<n>` растёт
   (контроль цикла контракта). Стирает отметки сессий, принципалы аккаунта (по accountId+tenantId),
   привязки, индекс токенов, квоту (по хешу uid из принципала v2/v1); принципал — только после всех
   своих зависимых. Надгробие аренды и квитанция удаления остаются (по контракту); в надгробии
   `deleted` журнал квитанций очищается (`storedLeaseState`). Освобождение личности —
   `createFirebaseProviderIdentityReleasePort({resolveRawUid, deleteAuthUser})`: user-not-found = успех,
   сырой uid неизвестен → ошибка (контракт повторит, затем identity_release_failed).
3. **Legacy** — `account_delete.ts`: стадия `account_authority_purge` между `merge_identity_records` и
   `accounts_v2_purge`, `purgeAccountAuthorityForLegacyIdentities(db, [...identities, stableUid, authUid])`:
   обе трактовки личности (accountId и сырой uid), acct-… через принципала, принципалы последними,
   ≤50 проходов иначе стадия падает (задача повторится).
4. **Правила** — `firestore.rules`: явный deny-all на 6 корней `account_authority_*` + функция
   `isServerOwnedAccountAuthorityRoot` и её исключение в админском catch-all (иначе OR-сложение
   открывало бы их браузерному админу).
5. **TTL** — `firestore.indexes.json` fieldOverrides `expireAt ttl:true` для аренды, `retired_sessions`,
   привязок, индекса токенов, квоты. Принципал и состояние удаления — без TTL. Включится при ближайшем
   деплое индексов — решение координатора.
6. **Джарвис** — `functions/src/jarvis/*_firestore_fetcher.ts` коллекции AA НЕ читают; сторож в тесте S3.
7. Экспорта нет, `rolloutEnabled:false` (оба callable) — сторож в тесте S3.

Единый список коллекций — `account_authority_collections.ts` (литералы в остальных файлах AA запрещены сторожем).
Тесты: `s3_delete_rules_ttl.test.ts` 31/31; соседние AA 10+68+13+19+23, `account_delete.test.ts` 51,
`coverage_guard` 8, корневые правила 155+6 — зелёные. Мутации 12/12 убиты (M3 первой редакции был
эквивалентным — заменён). Эмулятор правил — S8.

## S3 раунд 2 — по security-ревью (REQUEST_CHANGES), 2026-10-04
- **H-S3-1 TTL:** убрать 5 записей TTL из `firestore.indexes.json` (скрипт `npm run firestore:rules` деплоит и индексы → включилось бы без команды). Перенести политики в документ развёртывания `docs/phraseman-2.0/deploy/account_authority_ttl.md` (что включать, команда, когда — вместе с rollout по команде координатора). Подколлекцию `retired_sessions` переименовать в уникальную `account_authority_retired_sessions_v1` (через `account_authority_collections.ts`), пока данных нет — чтобы TTL группы не задел чужие одноимённые коллекции. Сторож: в firestore.indexes.json нет TTL на коллекциях AA.
- **H-S3-2 legacy purge по устаревшему принципалу:** аккаунт, найденный через принципал, стирать ЦЕЛИКОМ только если `accountId` входит в «круг личности» удаления ИЛИ это `acct-…` с `accountSource === 'new_account'` (принадлежит только этому uid). Иначе удалять только принципал и зависимые САМОГО удаляемого uid (привязки/индекс/квота по его хешу), не трогая документы аккаунта и чужие принципалы. Лог решения. Тест на сценарий «X перепривязан к S2, удаляется S — S2 не тронут».
- **Освобождение Firebase Auth (решение AA по рекомендации ревью; координатор уведомлён):** удалять Auth сразу в запросе `delete_begin` (`request.auth.uid`); на случай сбоя хранить сырой uid в документе задачи `account_authority_delete_jobs_v1` (deny-all для клиентов) и стирать поле `FieldValue.delete()` сразу после успешного освобождения (образец — `account_delete_job.ts` authUid). Порт release использует это поле. Тесты: успех в запросе — поле не пишется/стёрто; сбой → поле есть → фоновый повтор освобождает → поле стёрто; user-not-found = успех только при сырым uid из задачи.
- **Тесты на выжившие мутации:** (Ma) принципалы личностей не удаляются в незавершённом проходе legacy-purge; (Mb) фильтр по tenantId в collectAccountPrincipals.
- S10: в политику — временное хранение uid в задаче удаления до освобождения; осиротевшие записи AA — по TTL 90 дн. (после включения).

## Итог исполнителя S3 — раунд 2 (2026-10-04)

- **H-S3-1 TTL:** 5 записей TTL убраны из `firestore.indexes.json` (файл = HEAD). Политики — в
  `docs/phraseman-2.0/deploy/account_authority_ttl.md` (группы, команды gcloud, когда, откат, текст для S10).
  Подколлекция отметок переименована: `account_authority_retired_sessions_v1` (константа
  `AA_RETIRED_SESSIONS_SUBCOLLECTION`; тесты S2a/адаптера переведены на новое имя). Сторожа: нет TTL AA в
  indexes.json; документ содержит команду для каждой группы и не содержит принципала/задачи удаления.
- **H-S3-2 legacy:** `legacyPrincipalAccountDecision` — аккаунт за принципалом uid стирается целиком только
  при `accountId` в круге личности или `acct-…` + `accountSource: 'new_account'`; иначе — только принципал и
  зависимые самого uid (лог `legacy_purge principal_account`, reason). Тест «X перепривязан к S2, удаляется S».
- **Освобождение Auth:** подготовка delete_begin (та же транзакция) передаёт сырой `request.auth.uid` в
  хранилище (`rememberProviderUid`); хранилище пишет `pendingAuthUid` в задачу удаления, только пока
  `pendingProviderIdentity !== null` и uid совпадает с субъектом аренды; иначе каждая запись —
  `FieldValue.delete()` (set merge). Порт `createFirebaseProviderIdentityReleasePort({readPendingAuthUid,
  deleteAuthUser})` + `firestorePendingAuthUidReader(db)`: uid только из задачи, сверка хеша, user-not-found =
  успех только с uid из задачи. В адаптере: `overrides.providerIdentityRelease` (по умолчанию не подключено, S4),
  claims — серверный `claim-<uuid>`. Тесты: успех в запросе → Auth удалён, поля нет; сбой → поле есть →
  `runIdentityReleaseAttempt` освобождает → поле стёрто; отказ без uid; отказ при чужом uid.
- **Ma/Mb:** Mb убит новым тестом (принципал того же accountId из другого тенанта не тронут). Ma —
  эквивалентный мутант: при `truncated` в legacy-проходе бюджет уже исчерпан (addDocIfExists ничего не
  добавляет), либо усечение — от дублей в collectAccountPrincipals, когда зависимые всех uid уже собраны в этом
  же проходе. Защитная проверка оставлена; добавлены тесты-инварианты (сироты при любом бюджете 1..30;
  обрыв на maxPasses + повтор задачи стирает acct-…).
- Тесты: s3 45/45, адаптер 10, S2a 68, привязки 13, delete_contract 19, граница 23, account_delete 51.
  Мутации: 19 из 20 убиты (Ma эквивалентен). Эталон — `.tmp_aa_s3_backup/r2_after/`, cmp всех 12 файлов совпал.
- firestore.rules и account_delete.ts в раунде 2 не менялись. Без git, без деплоя, без эмулятора.

## Итог исполнителя S3 — раунд 3 (2026-10-04)

- **L-1 (сверка хеша при записи `pendingAuthUid`):** найден и исправлен реальный дефект: при повторном
  delete_begin от второго uid U (удаление начал V) запись задачи стирала сохранённый uid V
  (`FieldValue.delete()`). Теперь хранилище держит в транзакции список кандидатов (uid из документа + uid,
  предложенные подготовкой) и пишет первый, чей хеш совпал с субъектом `pendingProviderIdentity`.
  Тесты: «начал V, повтор от U → поле = V»; «без сохранённого: чужой не пишется, свой пишется».
  Мутация Mb' (запись без сверки хеша) — `Tests: 2 failed, 47 passed, 49 total` — убита.
- **L-2 (осиротевший `acct-X` после перепривязки):** описан в `docs/phraseman-2.0/deploy/account_authority_ttl.md`
  (раздел «Осиротевший acct-… после перепривязки») и в тексте для S10. Поиск в legacy-purge НЕ сделан:
  субъект в освобождённой аренде лежит только в массиве карт `receiptLedger.entries` (where невозможен),
  `activeLease = null`; обратная ссылка в принципале = смена схемы S2a и всех путей перезаписи принципала.
  Документ `acct-X` при перепривязке переписан с `expireAt` +90 дн. → уходит по TTL (TTL включать вместе с rollout обязательно).
- **L-3 (закрытая форма job при merge):** `ACCOUNT_DELETE_JOB_KEYS` + `assertClosedJobShape` в
  `storedAccountDeleteState` (лишний ключ → отказ записи с логом), комментарий «зачем» у merge.
  Сторожа: ключи фикстуры (тип) = список = ключи записи = ключи разбора; job с лишним ключом не пишется.
  Мутации L3 (без проверки) и L3b (неполный список) убиты.
- Тесты: `s3_delete_rules_ttl` 49/49. Полный набор мутаций: 23 прогона — убиты все, кроме эквивалентного Ma
  (см. раунд 2); R3 переписан под новый код (R3n) и убит. Эталон — `.tmp_aa_s3_backup/r3_after/`, cmp 13 файлов совпал.
- Изменены только `account_delete_store.ts`, `s3_delete_rules_ttl.test.ts`, документ развёртывания. Без git, без деплоя.
