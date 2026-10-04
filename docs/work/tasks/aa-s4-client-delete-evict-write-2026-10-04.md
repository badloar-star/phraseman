# Task packet: Account Authority 2.0 — этап S4: клиент — удаление, вытеснение, запись

Governance-ID: TG-827BE782E9D3
Governance-ID: TG-72830AB4CED8
Governance-ID: TG-1846F3E67AFF
Governance-ID: TG-AAD59B3E1A7A
Governance-ID: TG-CB8B98373602
Governance-ID: TG-CCB95B0388AB
Governance-ID: TG-9DD7F1ECD0C7
Status: Planned
Owner: Claude session 5 · АВТОРИЗАЦИЯ (Account Authority 2.0)
Related epic/enabler: docs/superpowers/plans/2026-10-01-account-authority-2-0.md, строка S4 (≈246); зависит от S2 (готово), S3 (c6241c9d7)

## Outcome
Клиентская половина Account Authority 2.0 готова к флагу (rollout по-прежнему выключен):
- удаление аккаунта на устройстве срабатывает МГНОВЕННО и локально первым (синхронная метка-надгробие → экран сразу как после удаления; асинхронный стиратель и серверная задача догоняют фоном, переживают перезапуск);
- серверные порты удаления из S3 подключены по умолчанию в адаптере (хранилище состояния, purge, освобождение Firebase Auth), повтор освобождения/истечения — серверный обработчик (НЕ экспортируется, rolloutEnabled:false);
- вытеснение устройства (`handleLeaseRevoked`) срабатывает по коду отказа сервера и при resume/foreground с троттлингом;
- `commitPreservedWrite` для `lesson_progress` и `flashcards_srs`: запись, сделанная до вытеснения/смены, не теряется;
- журнал операций ограничен (512) и чистится;
- смена аккаунта использует привязку по uid (A→B без цикла);
- шлюз продления R1 в `accounts_v2_client_flag.ts`.
Мера успеха: тесты сценариев + мутации, логи `[AA-S4]` на каждой ветке, ноль немых catch (зонд PM-229 не растёт, базовая 5), независимое ревью APPROVE (security — для серверной части S4a).

## Scope
Делится на два подэтапа, каждый — исполнитель → ревью → коммит:
- **S4a:** (1) адаптер `functions/src/account_authority/firebase_lease_callable.ts`: по умолчанию `createFirestoreAccountDeleteStateStore`, `createFirestoreAccountDeletePurgePort`, `createFirebaseProviderIdentityReleasePort` + `firestorePendingAuthUidReader` (вместо NOT_WIRED); (2) серверный обработчик повтора освобождения / истечения (`listDueAccountDeleteExpirySweeps`, `runIdentityReleaseAttempt`, bounded purge) — функция-обработчик без экспорта из `functions/src/index.ts`; (3) клиент: локальное удаление первым (надгробие синхронно, стиратель асинхронно, идемпотентно, возобновляется после убийства процесса) в runtime/адаптере/транспорте `accounts_v2_client_runtime.ts` и соседях; (4) смена аккаунта с привязкой по uid.
- **S4b:** `handleLeaseRevoked` (коды отказа сервера + resume/foreground, троттлинг), `commitPreservedWrite` для lesson_progress и flashcards_srs, очистка журнала операций (512), шлюз R1 в `accounts_v2_client_flag.ts`.
Out of scope: миграция/совместимость/слияние/звёзды (S5), матрица сценариев целиком (S6), матрица флагов (S7), Firebase-эмулятор и тесты правил (S8), Android (S9), деплой/политика/TTL-включение (S10). Экраны и дизайн не меняются (UI удаления существующий). Чужие контуры не трогать (LANES.md).

## Architecture
Сервер — единственная правда об аккаунте; клиент — local-first: действие пользователя меняет локальное состояние сразу, сеть догоняет. Удаление: клиент пишет надгробие (синхронно) → UI показывает результат → фоновый стиратель локальных данных + `delete_begin` → сервер: подготовка (1 транзакция) → освобождение Auth в запросе → bounded purge; сбои → серверный повтор по задаче. Вытеснение: код отказа сервера/проверка при resume → `handleLeaseRevoked` → сохранённые записи (`commitPreservedWrite`) фиксируются до локальной очистки. Инварианты: надгробие нельзя «воскресить» поздним ответом (last-write-guard), повтор идемпотентен, журнал ≤512.

## Security and privacy
Удаление и освобождение личности — security-ревью обязательно для S4a. Сырой uid не логируется (только хеши/коды). Надгробие и стиратель не должны оставлять данные прошлого аккаунта при смене (утечка между аккаунтами). App Check не включать (пломба). Политика (S10): локальное удаление данных на устройстве + серверное; временный uid в задаче.

## Technical debt
- Плановый запуск обработчика повтора (scheduler) — Accept temporarily до S10: обработчик есть и протестирован, расписание/экспорт — только с rollout по команде; владелец — сессия 5, выход — S10.
- Тесты правил на эмуляторе — Contain: S8.
- Ma (эквивалентный мутант S3) — принят, задокументирован.

## Verification
- jest точечно со слотом светофора: `npm run test:one -- tests/<файл>` (клиент), `cd functions && npx jest --no-coverage --no-watchman --maxWorkers=2 src/account_authority/<файл>` (сервер); соседние тесты AA и `account_delete.test.ts` зелёные.
- Сценарии: удаление офлайн → перезапуск → стиратель докончил; повтор `delete_begin`; поздний ответ не воскрешает аккаунт; смена A→B→A без цикла; вытеснение во время записи урока — запись сохранена; журнал >512 → обрезан; R1: продление запрещено/разрешено по флагу.
- Мутации (ручные, с восстановлением по cmp), строка `Tests:` для каждой.
- Зонд `npx tsx tests/pm229_silent_catch.probe.ts` — не больше базовой 5.
- tsc — точечно/только при отсутствии чужого полного прогона.
- Ревью: security (S4a) / code (S4b) до APPROVE.

## Rollback
git revert коммитов S4a/S4b; rollout выключен, callables не экспортированы — на пользователей не влияет. Надгробие/стиратель активны только под флагом Account Authority (выключен).

## Итог исполнителя S4a (2026-10-04)

Status: Implemented (не закоммичено, не задеплоено; rolloutEnabled:false у всех трёх callable; из functions/src/index.ts ничего не экспортировано; ворота cutover на клиенте — константа false).

**Сервер**
1. `functions/src/account_authority/firebase_lease_callable.ts` — порты S3 по умолчанию: `defaultDeleteStateStore` (:136, Firestore), `defaultProviderIdentityRelease` (:145, `createFirebaseProviderIdentityReleasePort` + `firestorePendingAuthUidReader`, Auth удаляется лениво через `admin.auth().deleteUser`); подмены сохранены, добавлены `deleteAuthUser`, `purge`. `DELETE_STATE_STORE_NOT_WIRED`/«delete_not_wired» удалены. `createFirebaseAccountDeleteWorkerPorts` (:731). Новый `handleFirebaseAccountAuthorityDeleteBegin` (:826) + `accountAuthorityDeleteBegin` (:872, rolloutEnabled:false, без экспорта) — для клиентского транспорта.
2. `account_delete_store.ts` — поле `pendingWorkAtMs` (:172/:218) и `listDueAccountDeletePendingWork` (:346, один where+limit ≤100). Попутно убраны два `...spread` в логах S3 (сторож логов был красным).
3. `account_delete_worker.ts` (новый) — `runAccountDeleteWorkerPass` (:146): повтор освобождения Auth → сразу purge; `purge_queued` → ≤4 прохода (≤450 удалений пачкой); истечение квитанций. Потолки 20 задач / 50 квитанций. Без экспорта и расписания.
4. Найден и исправлен дефект `delete_contract.ts` (`beginBoundAccountDeletion`, :651–667): повтор delete_begin после первой попытки падал `no_active_session` (failed-precondition). Теперь отдаётся существующая задача, лог `[AA-S4] delete_begin replay`.

**Клиент**
5. `account_authority_lease_transport.ts` — `deleteAccount` (:647) → `accountAuthorityDeleteBegin` {operationId, ревизия аренды, bindingToken}; закрытая форма ответа (:234); повтор временных сбоев с тем же operationId/ревизией.
6. `account_authority_production_adapter.ts` — local-first: `clearAccountData` (:737) синхронно пишет надгробие (SecureStore, проверка чтением); `openScope` отказывает надгробленному (:665); стиратель `drainLocalErasures` (:492) — асинхронный, идемпотентный, при закрытии области и на старте; `createLocalFirstDeleteLease` (:853) — надёжная очередь серверного удаления (UI не ждёт сеть; выгрузка на старте/после входа/при удалении; окончательные коды :831 снимают запись; после завершения забывается привязка); `interruptedDeletes` (:783) — восстановление удаления, прерванного убийством процесса.
7. `accounts_v2_client_runtime.ts:320` `runAccountAuthorityDeleteTransition` (двойной тап — один промис); `app/accounts_v2_client_flag.ts:213` `beginAccountAuthorityDeletionIfEnabled` (cutover выключен → null без require/сети); `app/auth_provider.ts:3863` — вызов под воротами в `beginAccountDeletion`.
8. Смена аккаунта: привязка по uid/миграция v1 (S2b) проверены; закрыто — надгробие A не мешает входу B, привязка удалённого A забывается; A→B→A через runtime + боевой адаптер зелёный.

**Тесты**: сервер 278/278 (новый `s4a_delete_wiring_worker` 9; s2a 68, s3 49, адаптер 10, граница 23, delete_contract 19, привязки 13+12, lease 16, s2b 8, account_delete 51). Клиент: новый `aa_s4a_client_delete_local_first` 13/13; transport 18, app_integration 18, logging_guard 10, runtime 51, s2b_transport 41, auth_provider_wiring 8, bootstrap_contract 10, s2c_tails 17, s2c_user_cases 6. PM-229 silentCatch=0. tsc functions — 0; клиент точечно — 0.

**Мутации**: 13/13 убиты (M1–M13), каждая — восстановление и `cmp` с `.tmp_aa_s4_backup/a_after/`.

**Чужое**: `tests/account_authority_legacy_callsite_guard.test.ts` — 2 красных (перепись auth_provider `stableIdentityReads` 19→20, `peekStableId` 7→8) — счёт вызовов до и после моей правки одинаков; причина — чужие правки в HEAD.

**Отложено**: S4b (handleLeaseRevoked, commitPreservedWrite, журнал 512, R1); S5 — какой путь удаления главный при cutover; S8 эмулятор; S10 расписание обработчика, экспорт callable, TTL, политика.

## Итог исполнителя S4a — раунд 2 (2026-10-04)

По security-ревью (APPROVE с доработками «до коммита»). Governance-ID TG-72830AB4CED8 уже в шапке.

- **M-S4a-1 (отравленная задача держит очередь)** — служебные поля фонового шага ВНЕ job (`workFailures`, `workLastFailureCode`, `workQuarantinedAtMs`); закрытая форма job и её сторож не тронуты.
  - `account_delete_store.ts:411` `recordAccountDeleteWorkFailure` — точечный merge только служебных полей (без разбора job): счётчик +1, `pendingWorkAtMs = now + пауза` (1, 2, 4… мин, потолок 6 ч); на `ACCOUNT_DELETE_WORK_MAX_FAILURES = 8` — снятие с очереди (`pendingWorkAtMs = null`, `workQuarantinedAtMs`) и строка уровня error `[AA-S4] delete_worker job_quarantined` (только код сбоя и число сбоев, без id: id в логах AA запрещены сторожем; задачу владелец находит по полю `workQuarantinedAtMs`).
  - `account_delete_worker.ts:206` — при job_failed вызов записи сбоя; `:211` — удачный шаг обнуляет счётчик (`clearAccountDeleteWorkFailures` :441).
  - `:449` `quarantineMalformed` — испорченный документ (нет job / чужой статус / битый accountId) снимается сразу при выборке, а не занимает limit каждый проход.
  - Хранилище (`:270`, `:323`) — снятая задача не возвращается в очередь записью контракта (например, повтором delete_begin).
- **LOW-1** — `accountDeleteIdentityRetryDelayMs` (:195): после сбоя освобождения Auth пауза 1, 2, 4 мин…, потолок 30 мин; первая попытка сразу. Число попыток контракта (4) не менялось.
- **Тесты**: `s4a_delete_wiring_worker` 16/16 (+7: 20 отравленных + 1 здоровая — здоровая обработана на 2-м проходе; снятие после 8 сбоев и больше не выбирается; испорченный документ снимается сразу; удачный шаг обнуляет счётчик; снятая задача не возвращается повтором delete_begin; LOW-1 ×2). Соседи: s3_delete_rules_ttl 49, delete_contract 19, firebase_lease_callable 10, s2a_identity_security 68, callable_boundary 23, account_delete 51; logging_guard 10. PM-229 silentCatch=0. tsc functions — 0.
- **Мутации раунда 2**: 7/7 убиты (R1 сбой не записывается — 3 failed; R2 нет снятия после N — 2; R3 испорченный не снимается — 1; R4 нет паузы Auth — 3; R5 контракт возвращает снятую задачу — 1; R6 счётчик не обнуляется — 1; R7 нулевая пауза — 1), каждая восстановлена и сверена `cmp`.
- **Эталон**: `.tmp_aa_s4_backup/a2_after/` — полный набор файлов S4a (15), cmp совпал.

## Итог исполнителя S4a — раунд 3 (2026-10-04)

По ревью REQUEST_CHANGES. Governance-ID TG-1846F3E67AFF в шапке.

- **H-B1 (обязательство удалить данные).** Очередь серверного удаления вынесена в `modules/account-authority-v2/account_authority_remote_delete_queue.ts` (адаптер похудел до ~1240 строк; модуль под сторожем логов AA). Запись снимается ТОЛЬКО по доказательству (`PROOF_CODES` :71): успех delete_begin; `identity_unresolved` (принципал без TTL, стирается только purge AA или старым удалением); принятое старое удаление (`resolveAccountAuthorityRemoteDeleteByLegacy` :108). Остальное (`HOLD_CODES` :76) держится с состоянием: `needs_sign_in` (unauthenticated), `needs_check` (сбой чтения привязки, нет ревизии, binding_rejected — привязка могла истечь по TTL, непонятный ответ, request_invalid, disabled, provider_rejected), `not_completed` (lease_rejected) + тревога через DebugLogger critical (переживает перезапуск, только код). Попытки тратят только временные сбои; исчерпан бюджет (50) → `not_completed` + тревога, запись НЕ снимается. Старт и новое удаление выгружают `pending`/`needs_check`, вход — все.
  - Рассинхрон с выходом: runtime (`account_authority_runtime.ts:540`) теперь сначала отправляет запрос удаления (очередь ждёт первую отправку ≤ 5 с), и только потом выходит из провайдера — раньше они шли параллельно и запрос почти всегда уходил без входа.
  - Если человек этим аккаунтом больше не войдёт: старый поток удаления при `result.ok` (сервер принял его задачу, замок server_enqueued) снимает запись AA как доказательство (`app/auth_provider.ts:3881` → флаг → клиент): задача старого удаления сама чистит данные AA (стадия `account_authority_purge`, S3). Под воротами cutover (выключены).
  - Геттер для будущего экрана: `accountAuthorityRemoteDeleteQueueState()` (:100) — только числа {total, pending, needsSignIn, needsCheck, notCompleted}. Новый UI не делался.
- **M-A1.** `recordAccountDeleteWorkFailure` — транзакция: перечитывает документ и пишет только если jobId, статус и pendingWorkAtMs совпали с выборкой (`sameObservation` :424), иначе лог `failure_skipped reason=state_moved_on` и ничего не пишет.
- **M-B2.** `account_authority_durable_slots.ts` — по одной записи на ключ + индекс номеров слотов; проверка ≤ 2048 байт перед записью. Обе очереди (стирание 32, удаление 16) на нём; ключи v2. Журнал операций 512 в `LOCAL_METADATA_KEY` — S4b, не тронут (отмечено: при 512 записях он тоже переходит 2 КБ).
- **L-B3.** Тест: открытая область того же аккаунта не стирается (лог `local_erase deferred`, ни одного вызова стирания), после закрытия — стирается.
- **L-A2.** `countQuarantinedAccountDeleteJobs` (:498) — `.count()` по `workQuarantinedAtMs > 0`, без id; хватает автоматического однополевого индекса. К Джарвису/тревогам не подключено.
- **Тесты**: клиент `aa_s4a_client_delete_local_first` 23/23; сервер `s4a_delete_wiring_worker` 18/18. Соседи сервера: s3 49, delete_contract 19, firebase_lease_callable 10, s2a 68, callable_boundary 23, account_delete 51. Соседи клиента: transport 18, app_integration 18, logging_guard 10, runtime 51, s2b_transport 41, auth_provider_wiring 8, bootstrap_contract 10, s2c_tails 17, s2c_user_cases 6; legacy_callsite_guard — те же 2 чужих красных (перепись auth_provider). PM-229 silentCatch=0; tsc functions 0, клиент точечно 0.
- **Мутации раунда 3**: 11/11 убиты (Q1 «не вошёл» окончательный — 2 failed; Q2 сбой привязки окончательный — 1; Q3 lease_rejected без тревоги — 1; Q4 удерживающие коды тратят попытки — 6; Q5 бюджет снимает запись — 1; Q6 выход раньше запроса — 1; Q7 доказательство старого удаления не снимает — 1; Q8 нет потолка очереди — 1; Q9 Ma стиратель не ждёт закрытия — 1; Q10 запись сбоя без сверки — 2; Q11 счётчик не то считает — 1), cmp совпал.
- **Эталон**: `.tmp_aa_s4_backup/a3_after/` — полный набор (18 файлов), cmp совпал.

## Итог исполнителя S4a — раунд 4 (2026-10-04)

По ревью REQUEST_CHANGES (узко). Governance-ID TG-AAD59B3E1A7A в шапке.

- **M-1 (переиспользование слота).** `account_authority_durable_slots.ts` переписан: номера слотов НЕ переиспользуются — индекс хранит монотонный счётчик `next` (:226), занятые `slots` и `trash` (номера, ждущие асинхронного удаления). Добавить: слот `next` → индекс {next+1}; обрыв между шагами — слот перезапишется тем же номером. Убрать: индекс (номер в trash) → асинхронное удаление → номер из trash; обрыв — подчистка сирот на старте (:210). Отложенное удаление больше не может стереть новую запись.
  - Самовосстановление (:165): нечитаемый/испорченный слот не валит хранилище — critical-строка (DebugLogger), запись пропускается, но номер ОСТАЁТСЯ в индексе и перечитывается на каждом старте (обязательство не стирается; временный сбой Keychain лечится сам); место в очереди занято, в геттере — поле `unreadable`. Испорченный сам индекс — по-прежнему отказ закрыто (одна атомарная запись; без него неизвестно, какие обязательства есть).
- **L-1.** Доказательство старым удалением привязано к фазе `server_enqueued`: метка ставится сразу после `advanceAccountDeletePendingAuthLock(..., 'server_enqueued')` (`auth_provider.ts:4183`), completion снимает запись AA только по этой метке (:3893), не по `result.ok`; анонимная ветка метку не ставит. Набор в памяти (:3794), очищается в completion.
- **L-2.** Удержанные записи живут 90 дней (как квитанция сервера) → снятие с critical-строкой `hold_expired` (`expireHeld` :307, проверка на каждом проходе, включая старт). `needs_check` отправляется не чаще раза в сутки, дальше пауза удваивается, потолок 30 дней (`remoteDeleteCheckDelayMs` :81, поля записи `enqueuedAtMs`/`holdChecks`/`nextCheckAtMs`). Нового серверного эндпоинта нет.
- **L-3.** Вход выгружает ТОЛЬКО записи вошедшего аккаунта (`eligible` :296, accountId из ответа аренды) — токен привязки A не уходит под сессией B. Старт/новое удаление — pending и needs_check с истёкшей паузой.
- **Тесты**: `aa_s4a_client_delete_local_first` 30/30 (+7: remove→add→отложенное удаление→перезапуск; сирота после «убийства» дочищена; нечитаемый слот — тревога, хранилище работает, запись возвращается; L-3; L-2 пауза; L-2 90 дней; L-1 сторож исходника). Соседи клиента: transport 18, app_integration 18, logging_guard 10, runtime 51, s2b_transport 41, auth_provider_wiring 8, bootstrap_contract 10, s2c_tails 17, s2c_user_cases 6; legacy_callsite_guard — те же 2 чужих красных. Сервер (без изменений в раунде): s4a 18, s3 49, delete_contract 19, firebase_lease_callable 10, s2a 68, callable_boundary 23, account_delete 51. PM-229 = 0; tsc клиент точечно 0.
- **Мутации раунда 4**: 7/7 убиты (P1 наименьший свободный номер; P2 нет подчистки сирот; P3 нечитаемый слот валит хранилище; P4 доказательство по result.ok; P5 вечное удержание; P6 needs_check на каждом старте; P7 вход выгружает чужие записи — каждая `Tests: 1 failed, 29 passed, 30 total`), cmp совпал.
- **Эталон**: `.tmp_aa_s4_backup/a4_after/` — полный набор (18 файлов), cmp совпал.

## Итог исполнителя S4a — раунд 5 (2026-10-04)

Три LOW после APPROVE. Governance-ID TG-CB8B98373602 в шапке.

- **LOW-1** (`account_authority_durable_slots.ts`). Выбрано: нечитаемые записи НЕ входят в ёмкость (`size()` = читаемые; `add` упирается в `max` читаемых), но и НЕ стираются — для очереди удаления потеря записи = потеря обязательства; тревога `slot_unreadable` на каждом старте, пока не прочитается. Жёсткий потолок индекса — `2 × max` номеров (индекс остаётся в 2 КБ; упёрлись — `queue_full` с причиной `unreadable_bound`). Перенос в trash после N стартов не делал: это стирание обязательства без доказательства. Дубль ключа после временно нечитаемого слота: действует НОВЫЙ слот (записан позже), старый номер уходит в trash и стирается — запись больше не становится вечно нечитаемой. Порча индекса — critical через DebugLogger (`index_invalid`), отказ закрыто сохранён.
- **LOW-2** (`account_authority_remote_delete_queue.ts`). Часы недостоверны (`now < enqueuedAtMs` или `nextCheckAtMs − now > 30 дн.`) → needs_check проверяется при этом поводе, пауза пересчитывается после ответа (лог `clock_unreliable`); по сроку при часах назад не снимается (отрицательный возраст — проверка срока это уже исключает, отдельная ветка была бы эквивалентной).
- **LOW-3**. По сроку 90 дн. снимаются ТОЛЬКО `needs_sign_in` и `needs_check`; `not_completed` держится до входа этим аккаунтом или доказательства старым удалением; `pending` — свой бюджет попыток.
- **Тесты**: `aa_s4a_client_delete_local_first` 35/35 (+5: ёмкость при нечитаемом, unit size/unreadable, дубль → trash без тревоги, часы назад на 40 дн., not_completed через 200 дн.; тест порчи индекса проверяет critical). Соседи клиента: transport 18, app_integration 18, logging_guard 10, runtime 51, s2b_transport 41, auth_provider_wiring 8, bootstrap_contract 10, s2c_tails 17, s2c_user_cases 6; legacy_callsite_guard — те же 2 чужих красных. PM-229 = 0; tsc точечно 0. Сервер в раунде не менялся.
- **Мутации раунда 5**: 6/6 убиты (F1 нечитаемые в ёмкости; F2 дубль вечно нечитаем; F3 порча индекса без тревоги; F4 нет защиты от часов; F5 not_completed снимается по сроку; F6 нет потолка нечитаемых), cmp совпал. F1 в первом прогоне выжил (ёмкость считалась не через size()) — добавлен прямой unit-тест, повтор убил.
- **Эталон**: `.tmp_aa_s4_backup/a5_after/` — полный набор (18 файлов), cmp совпал.

## Итог исполнителя S4b (2026-10-04)

Status: Implemented (не закоммичено; ворота cutover выключены — поведение приложения не меняется; сервер не трогали). Governance-ID TG-CCB95B0388AB в шапке.

1. **Вытеснение.** Закрытый список «аренду забрали»: `ACCOUNT_AUTHORITY_EVICTION_LEASE_CODES = {revision_mismatch, stale_lease}` (`account_authority_failure_policy.ts:98`) — отказ контракта на ПРОДЛЕНИИ известной аренды (ревизия есть, проверка «допущенного выхода» не идёт). Транспорт отдаёт отдельный код `account_authority_lease_evicted` (`account_authority_lease_transport.ts:552`); сеть/сервер (`unavailable`, `network`, `throttled`) — НЕ вытеснение. Порт `acquire` получил намерение `intent: 'sign_in' | 'resume'` (runtime, транспорт, нормализатор bootstrap): явный вход человека делает ОДИН повтор с ревизией сервера — забирает аренду (:549); продление — никогда (иначе устройства отбирали бы аренду по кругу).
   Runtime: при продлении с вытеснением — `evictAfterRenewalRefused` (:841): записи сохранённых доменов фиксируются, область закрывается, состояние `device_taken_over`; из провайдера НЕ выходим, аренду не отпускаем. Холодный старт после вытеснения — тоже `device_taken_over` (:943). Продление в `device_taken_over` сеть не дёргает (:331) — вернуть аккаунт может только явный вход. Временный сбой сети при продлении живой сессии — сессия и область остаются (:951), раньше это был полный выход.
2. **Сохранённые домены** (`lesson_progress`, `flashcards_srs`). Runtime запоминает захваченные записи и фиксирует их в области ВЛАДЕЛЬЦА до её закрытия при вытеснении, явном вытеснении (`handleLeaseRevoked`), выходе и смене аккаунта (`flushCapturedWrites` :789, смена — :979); поздний `commitPreservedWrite` той же записи — идемпотентно `committed`. Удаление аккаунта такие записи отбрасывает (данные стираются). В область B запись A не попадает никогда. Предупреждение: в AA пишется только отметка фиксации (полезная нагрузка — в хранилищах фич/синхронизации V2; перенос — S5). Видимое пользователю (прогресс урока, SRS) живёт в локальных хранилищах фич и вытеснением не откатывается. Захваченные, но не зафиксированные записи живут в памяти процесса (убийство процесса до перехода — отметки нет; данные фич остаются).
3. **Журнал операций.** Поколение — ключ `local_metadata.v2`, операции — по одной на ключ через `account_authority_durable_slots.ts` (≤ 2048 Б, номера не переиспользуются). Очистка `pruneOperationJournal` (`account_authority_production_adapter.ts:362`): предел 64, квитанций завершённых разрушающих ≤ 16; незавершённые разрушающие не вытесняются никогда (журнал из них полон → `store_full`, ничего не теряется). Перенос v1 → v2 (:521): поколение и все незавершённые операции сохраняются, старый ключ удаляется после записи v2. Почему SecureStore: порт синхронный, заборы поколения обязаны быть надёжными до ответа; секретов нет (id и поколение), «только на этом устройстве».
4. **Шлюз R1** (`app/accounts_v2_client_flag.ts:32`, `:52`): продление через `createAccountAuthorityRenewalDriver` (новый `account_authority_renewal_driver.ts`) — холодный старт и возврат из фона (слушатель AppState ставится один раз), не чаще раза в 5 минут, неудача отметку не сдвигает. Модули AA грузятся лениво и только при включённых воротах cutover.
- **Изменённые чужие ожидания** (осознанно, по задаче S4b): runtime — две проверки «старая запись A отвергнута после смены» → теперь «зафиксирована в A до смены, в B — никогда»; S2b/S2c — продление с `revision_mismatch`/`stale_lease` теперь `lease_evicted` вместо общего `lease_rejected`.
- **Тесты**: новый `aa_s4b_evict_preserve_journal` 16/16. Соседи: s4a 35, transport 18, app_integration 18, logging_guard 10, runtime 51, s2b_transport 41, auth_provider_wiring 8, bootstrap_contract 10, s2c_tails 17, s2c_user_cases 6, accounts_v2_client_wiring_v2 19; legacy_callsite_guard — те же 2 чужих красных. PM-229 = 0; tsc точечно 0.
- **Мутации**: 12/12 убиты (B1–B12; B8 «очистка вытесняет незавершённые» в первом прогоне выжил — добавлен тест переполнения без неразрушающих, повтор убил), cmp совпал.
- **Эталон**: `.tmp_aa_s4_backup/b_after/` — полный набор (25 файлов), cmp совпал.

## Итог исполнителя S4b — раунд 2 (2026-10-04)

Два LOW после APPROVE. Governance-ID TG-9DD7F1ECD0C7 в шапке.

- **L-1.** Тест: 64 незавершённые разрушающие + резервирование ещё одной разрушающей → `store_full`, все 64 на месте, новой нет. Мутация ревьюера Mb (вместо `break` выбросить старейшую операцию) убита: `Tests: 3 failed, 16 passed, 19 total`.
- **L-3.** Перенос v1 → v2 переносит ВСЕ незавершённые разрушающие, даже сверх ёмкости журнала (`journal.add(…, { overCapacity: true })`, `account_authority_production_adapter.ts:535`; в `durable_slots` обход ёмкости `:265`, физический потолок индекса не обходится — `indexLimit()` `:257`). Неразрушающие и завершённые обрезаются как обычно. Если незавершённых больше физического потолка индекса (2 × 64 номера, индекс в пределах 2 КБ при длинных номерах) — critical-строка `journal migration_overflow` (DebugLogger) и отказ закрыто ДО каких-либо записей; ключ v1 остаётся нетронутым (ничего не потеряно). После такого переноса новые операции получают `store_full`, пока незавершённые не завершатся.
- **Тесты**: `aa_s4b_evict_preserve_journal` 19/19 (+3: L-1; перенос 100 незавершённых — все на месте, остальное обрезано, перезапуск читает; переполнение потолка → тревога и отказ, v1 цел). Соседи клиента: s4a 35, transport 18, app_integration 18, logging_guard 10, runtime 51, s2b_transport 41, auth_provider_wiring 8, bootstrap_contract 10, s2c_tails 17, s2c_user_cases 6, accounts_v2_client_wiring_v2 19. PM-229 = 0.
- **Мутации**: 4/4 убиты (Mb — 3 failed; L3a перенос без обхода ёмкости — 1; L3b без проверки потолка — 1; L3c слоты игнорируют обход — 1), cmp совпал.
- **Эталон**: `.tmp_aa_s4_backup/b2_after/` — полный набор (25 файлов), cmp совпал.

## Ревью S4b раунд 2 — APPROVE; остаточный долг (решение координирующей сессии 5)
- LOW-1 `migration_overflow` (перенос журнала v1→v2 физически не влез): Contain — устройство пишет critical на каждом старте, v1 цел, AA не стартует. Выход (поддержка сбрасывает v1 после проверки critical-строки) описать в документе развёртывания на S10; владелец — сессия 5. Практически недостижимо (>128 незавершённых разрушающих операций).
- LOW-2 тест «обычный add не обходит ёмкость» на уровне `account_authority_durable_slots.ts` (сейчас гарантия держится на порядке проверок резервирования): Pay в S6 (матрица + мутации); владелец — сессия 5.
