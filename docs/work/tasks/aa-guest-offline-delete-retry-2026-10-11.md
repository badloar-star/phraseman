# Удаление гостя без сети: повтор на сервере после подключения (🔴 релиза)

Governance-ID: TG-F5939EAC5D97
Governance-ID: TG-0317BC63EDB4 (сессия исполнителя, та же задача)

## Outcome
Гость удалил аккаунт без сети → телефон стёрт сразу (как сейчас) → при следующем запуске/подключении удаление серверных данных дожимается по сохранённому замку/ключу, без окон. Необработанный отказ `Uncaught (in promise) UNAVAILABLE` пойман с причиной в логе. Тест «без сети → онлайн → сервер получил запрос».

## Факты (живой прогон 10.10 22:05, логи scratchpad `aa_run3_offline.txt`, `aa_run3_restart.txt`)
- Без сети: `anon_lock=ok` → стирание ок → онбординг; постановка `UNAVAILABLE` → прямой `UNAVAILABLE` → `before_signout=failed` → фон `local_exit_unverified` (новая личность не выдана — старая гостевая сессия Firebase жива).
- `Uncaught (in promise) Error: UNAVAILABLE` — какой-то промис в гостевом пути удаления без обработчика (кандидаты: `cloudDeleteEnqueueOperation.dispatchSettled`/`acknowledgment` второй подписки, `startGuestDirectServerDeletion`, credential-safe ожидание).
- Перезапуск с сетью: `[ACCOUNT-DELETE-GUARD] read_cache:invalidated persist ×2` → `account_delete_quarantine:broken_guard_discarded: disagreement anchorV=3 phase=stable_link_verified` → `discard_broken` → `persist` → `clear` → `enqueue_retry` НЕ было.
- Гипотеза (не доказана): `persistAccountDeletePendingAuthLock` пишет ЯКОРЬ раньше ЗАПИСИ (app/account_delete_quarantine.ts ~464–500); переход в `ready` (якорь v3 требует `lock.phase === 'ready'`, `anchorMatchesLock` ~338) — чтение `readAccountDeletePendingAuthRaw` между двумя записями видит якорь v3 + запись `stable_link_verified` → «сломан» → `discardBrokenGuardRecords`. Диагностика уже в коде (a350f04ba): `[ACCOUNT-DELETE-GUARD] disagreement fields=… persists_in_flight=…`.
- Повтор гостя после перезапуска: `ensureFreshPostDeletionIdentity` → ветка «аноним с тем же uid» → `retryGuestServerDeletionOnce(lock)` (app/auth_provider.ts ~1196).

## Scope
`app/account_delete_quarantine.ts`, `app/auth_provider.ts` (гостевой путь/повтор), тесты. Сервер не трогать. App Check не трогать.

## Architecture
1. СНАЧАЛА воспроизвести в поведенческом тесте (харнес как в `tests/aa_guest_server_delete.test.ts`): гость, сеть падает (enqueue и direct бросают UNAVAILABLE), удаление → затем «перезапуск» (сброс модулей, тот же SecureStore/AsyncStorage моки, сеть есть) → вызвать путь старта (`resumePendingAccountDeleteLocalExit`/`ensureFreshPostDeletionIdentity('startup')` — как делает приложение). Снять логи `[ACCOUNT-DELETE-GUARD] disagreement fields=… persists_in_flight=…` и `[ACC-MUT]`. Зафиксировать факт в пакете.
2. Починить ПО ФАКТУ: если гонка «чтение между записями» — сериализовать чтение с идущей записью в процессе (чтение ждёт текущую запись), не меняя порядок записи (якорь-первым — защита от падений) и не ослабляя правило «расхождение половин = снять» для настоящей порчи. Если причина иная — описать и чинить минимально.
3. Повтор: после исправления путь старта должен дойти до `retryGuestServerDeletionOnce` и отправить постановку с ключом; при неуспехе — замок не теряется, следующий старт пробует снова (без окон).
4. Необработанный отказ: найти промис без обработчика, добавить обработку с логом причины (`[ACC-MUT] … reason=`).

## Security and privacy
Цель — выполнить обещание политики (удаление данных гостя). Никаких новых данных. Ключ — как сейчас (SecureStore, на сервер хеш).

## Technical debt
Диагностику `describeAnchorLockMismatch`/`persists_in_flight` оставить (логи на ранних выходах — навсегда).

## Verification
Новый тест «без сети → онлайн → сервер получил постановку с ключом», тест «нет необработанных отказов»; соседние: aa_guest_server_delete, account_delete_quarantine_authority/behavior, account_delete_guard_unreadable_boot_contract, aa_s4a_client_delete_local_first, post_delete_fresh_identity_integration, auth_provider_behavior, account_delete_flow_contract, account_authority_legacy_callsite_guard — по одному, со слотом, свободно ≥2 ГБ. Ревью до APPROVE. Живой прогон — в окно эмулятора.

## Rollback
Отдельный коммит; `git revert`.
Governance-ID: TG-F5939EAC5D97 — запись AA-44.
Governance-ID: TG-C1944C169D5E — аудит потока «выход → вход другим → вход тем же» на потерю данных и Optimistic UI выхода (только чтение).

## Факт воспроизведения (исполнитель, 10.10, тест `tests/aa_guest_offline_delete_retry.test.ts`, ДО починки)
Харнес как в `aa_guest_server_delete.test.ts`; «перезапуск» = новый реестр модулей, SecureStore общий (Keychain), зеркало AsyncStorage перенесено. Сеть: без сети `startCloudDeletionEnqueue`/`startCloudDeletionDirect`/анонимный вход падают `UNAVAILABLE`. Лог снят в scratchpad `aa_offline_repro_before.txt`. Последовательность совпала с живым прогоном 1:1:
- Без сети: `anon_lock=ok` → `persist`(local_data_cleared) → `enqueue ack=failed reason=UNAVAILABLE` → `direct reason=enqueue_failed` → `direct ack=failed reason=UNAVAILABLE` → `before_signout=failed` → **гость ВЫХОДИТ из Firebase** (signout=1) → `completePreparedAccountDeleteLocalExit` пишет замок **сразу в `old_stable_cleared`** (якорь v1), минуя `server_enqueued` → анонимный вход без сети не удался → `local_exit_unverified`.
- Перезапуск с сетью: старт идёт из `old_stable_cleared` → `anonymous_authenticated` (persist 1) → `stable_link_verified` (persist 2) → запись `ready`: **`[ACCOUNT-DELETE-GUARD] disagreement fields=phase_not_ready(stable_link_verified)+cleanupAuthorized anchorV=3 phase=stable_link_verified cleanup=0 persists_in_flight=1`** → `discard_broken` → запись `ready` всё же легла (запись без якоря, но `ready+cleanupAuthorized` допускается) → `clear` → статус `ready`. Постановок на сервер при старте: **0**.
- Необработанный отказ: подтверждён — `acknowledgment` постановки, созданной в БЫСТРОЙ фазе (`prepareAccountDeletion`, стек `auth_provider.ts:4236`), отклоняется `UNAVAILABLE` раньше, чем фон (`finishAccountDeletion`) вешает на него обработчик после уведомлений/push-токена/дренажей → `unhandledRejection` + `PromiseRejectionHandledWarning` (= `Uncaught (in promise) … UNAVAILABLE` → «Promise rejection handled» на телефоне).

**Вывод по факту (две независимые причины):**
1. **Главная — повтор невозможен по построению, а не из-за «сломанного» замка.** Гостя разлогинивают даже когда сервер НИЧЕГО не получил, и замок перепрыгивает в `old_stable_cleared`; при старте ветка `enqueueDeletion` (фаза `local_data_cleared`) не выполняется, а старой гостевой личности (единственной, от которой сервер примет постановку) уже нет. Выброс замка на шаге `ready` в этом сценарии ни на что не повлиял — к нему повтор уже был пропущен.
2. **Гонка подтверждена (`persists_in_flight=1`)**: чтение замка между записью якоря v3 и записью `ready` видит половины разных фаз и выбрасывает живой замок. Здесь безвредно (последняя фаза), но тот же механизм на смене якоря в ранних фазах (v1→v2/ключ) снял бы незавершённое удаление.
Governance-ID: TG-C1944C169D5E (прод.) — запись AA-45a.

## Итог исполнителя (10.10, НЕ закоммичено)
Чинил по факту выше, три правки:
1. **Повтор гостя возможен** (`app/auth_provider.ts`): `settleGuestEnqueueOutcome` теперь возвращает исход (`enqueued`/`direct_sent`/`unconfirmed`). Если постановка И прямой вызов ЯВНО отказали (сервер не получил ничего) — фон НЕ разлогинивает гостя и НЕ пишет `old_stable_cleared`: замок остаётся в `local_data_cleared`, лог `[ACC-MUT] delete:anon_server=deferred_to_startup`, результат прежний (`local_exit_unverified`), окон нет. При старте/возврате ветка «аноним с тем же uid» → `retryGuestServerDeletionOnce` шлёт постановку с ключом. `retryGuestServerDeletionOnce` возвращает `false` на ВРЕМЕННЫЙ отказ (`unavailable|deadline|timeout|network|offline`) → `pending_offline`, замок цел до следующего старта; отказ по существу сходится локально, как раньше. `signOutProvider` в координаторе теперь покидает именно удалённую гостевую личность (uid = `providerUid`), иначе новая личность не выдалась бы.
2. **Гонка чтения** (`app/account_delete_quarantine.ts`): чтение замка ждёт идущие записи (`guardPersistFlights`, ≤5 кругов, лог `read:waits_for_persist`). Порядок «якорь раньше записи» не тронут; правило «расхождение половин = снять» для настоящей порчи не ослаблено.
3. **Необработанный отказ**: `observeEarlyAcknowledgmentRejection` — ранний наблюдатель с логом `[ACC-MUT] delete:<label> ack_rejected_observed reason=` на постановке из быстрой фазы и на прямом вызове гостя; сам промис не меняется.

Тесты (по одному, со слотом): новый `aa_guest_offline_delete_retry` 3/3 (лог после починки — scratchpad `aa_offline_repro_after.txt`: `enqueue_retry ack=ok`, чтение посреди записи `read:waits_for_persist` → `phase=ready`, без `disagreement`, без необработанных отказов); `aa_guest_server_delete` 11/11 (тест 5 обновлён осознанно: при отказе обоих вызовов выхода гостя больше нет); `account_delete_quarantine_authority` 19/19; `account_delete_quarantine_behavior` 4/4; `account_delete_guard_unreadable_boot_contract` 5/5; `aa_s4a_client_delete_local_first` 35/35; `post_delete_fresh_identity_integration` 15/15; `auth_provider_behavior` 110/110; `account_delete_flow_contract` 23/23; `account_authority_legacy_callsite_guard` 31/31.

Риски: (а) до старта с сетью гость остаётся в старой анонимной сессии со старым stableId, синхронизация на карантине (`local_data_cleared`) — то же состояние, что у связанного аккаунта без сети; проверить живьём, что онбординг/главная работают в нём без ошибок; (б) если отказ был не сетевым, а сервер всё же удалил гостя — повтор упадёт не-временно и замок сойдётся локально; если сессия пропала — ветка связанных (квитанция 15 с) до TTL 7 дней; (в) проверка типов не запускалась (по правилу задачи).
Governance-ID: TG-8C078C6855A7 — перепрогон трёх наборов после косметической правки, ревью, коммит.
Governance-ID: TG-44D65D8DC7D3 — REVISE ревью: потолок на круг ожидания записи при чтении замка; лог в немом catch чтения якоря.
Governance-ID: TG-6617EF933F26 — APPROVE после REVISE; коммит удаления гостя без сети.
