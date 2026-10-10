# Удаление гостя: серверные данные должны удаляться (🔴 релиза 2.0.0)

Governance-ID: TG-20707BD701DC
Сессия исполнителя (тот же пакет): Governance-ID: TG-C23F1F7BF0C4

## Outcome
Гость (анонимный вход), нажавший «Удалить аккаунт», получает удаление серверных данных: надёжно,
с повтором после перезапуска, без повторного входа. Локальное стирание и мгновенный переход на онбординг
не меняются (решение владельца 27.07). Никаких новых окон/уведомлений в потоке удаления (правило 22.09).

## Факты (живой прогон 10.10, §AA-34 находка 2)
- `app/cloud_sync.ts` `startCloudDeletionEnqueue` (~5440) бросает `account_delete_credential_proof_missing`, если нет `proof.operationId/capability`.
- `app/auth_provider.ts` `prepareAccountDeletion` (~4040): `pendingDeleteLock = isProvablyAnonymousAccount ? null : persistAccountDeletePendingAuth(...)` — у гостя замка (и ключа) нет. Комментарий рядом говорит «best-effort only for a provably anonymous account» — код с ним расходится (с 29.08).
- Ветка гостя в `deleteAccountAndWipe` (~4210, `else { void cloudDeleteEnqueueOperation.acknowledgment ... }`) рассчитывает, что запрос уйдёт; на деле — `Uncaught (in promise)` и `cloudDeleted=false`.
- Сервер (`functions/src/account_delete.ts`): `accountDeleteEnqueue` (auth + operationId/capability → очередь, дожатие по ключу без входа: `accountDeleteCredentialStatus`), `accountDeleteMine` (auth → немедленное полное удаление). Оба выложены (aa-owner-steps). Серверных правок НЕ требуется.

## Scope
Только клиент: `app/auth_provider.ts` (prepareAccountDeletion / deleteAccountAndWipe, ветка гостя), при необходимости `app/cloud_sync.ts` (вызов). Тесты: новый `tests/aa_guest_server_delete.test.ts` + соседние сторожа удаления.
Вне scope: сервер, UI окна удаления, Account Authority (cutover OFF), политика.

## Architecture
1. Гостю тоже пишется замок удаления `persistAccountDeletePendingAuth(...)` — best-effort, в потолке `ACCOUNT_DELETE_LOCAL_WIPE_TIMEOUT_MS` (как обещает комментарий). Записался → есть `proof` → постановка идёт тем же путём, что у Google/Apple (`accountDeleteEnqueue`), и после перезапуска дожимается существующим механизмом повтора (`ensureAccountDeleteCredentialSafe` и т. п.) — проверить, что он подхватывает и гостевой замок.
2. Не записался → запасной путь: прямой `accountDeleteMine` ПОКА гость ещё вошедший (до выдачи новой личности), ждать только отправки (dispatch), не ответа. Лог причины.
3. Ничто из этого не задерживает переход на онбординг сверх текущих потолков; стирание телефона по-прежнему сразу.
4. Гость с замком НЕ должен попасть в ветки, предназначенные для связанных аккаунтов, которые ждут выхода из провайдера/повторного входа (`requiresDurableServerDeletion`, `ensureFreshPostDeletionIdentity` → `pending_auth`): сохранить нынешнее поведение гостя по UI.
5. Логи на каждом исходе: `[ACC-MUT] delete:anon_lock=ok|failed`, `delete:anon_server=enqueue|direct|skipped reason=...`, плюс catch с причиной. Никаких `Uncaught (in promise)`.

## Security and privacy
- Ключ (capability) хранится так же, как у связанных (SecureStore), только хеш уходит на сервер — как сейчас.
- Не добавлять новых данных/полей; политика уже обещает удаление — правка приводит поведение в соответствие.
- App Check не трогать (запломбирован).

## Technical debt
- Комментарий «best-effort for anonymous» станет правдой. Отметить в коде `// зачем:`.

## Verification
- Новый тест: гость → замок записан → `startCloudDeletionEnqueue` получает proof (нет `proof_missing`); замок не записан → вызывается `accountDeleteMine`; оба пути не задерживают онбординг; ошибки сети ловятся (нет необработанных отказов).
- Сторожа: account_delete_flow_contract, aa_release_floor_auth_ui, account_authority_legacy_callsite_guard, auth_provider_behavior и все наборы с «delete» в имени — по одному, `npm run test:one`, со слотом, при свободной памяти ≥ 2 ГБ.
- Живой прогон гостя на эмуляторе — только по окну координатора.

## Rollback
Один коммит; откат `git revert <hash>` возвращает прежнее поведение (локальное стирание без серверного).
Governance-ID: TG-D81D9F5DBC63 — статус задачи 21:12 в INBOX §AA-36.

## Итог исполнителя (2026-10-10)

**Изменено (не закоммичено):**
- `app/auth_provider.ts`
  - `prepareAccountDeletion`: замок удаления пишется и гостю (тот же потолок 5 с); лог `[ACC-MUT] delete:anon_lock=ok|failed`. Гость без замка/ключа — постановку НЕ зовём (была бы proof_missing), сразу стартует прямой `accountDeleteMine` (`delete:anon_server=direct reason=no_lock`). Гость по-прежнему `requiresDurableServerDeletion=false`.
  - `finishAccountDeletion`, ветка гостя: наблюдатель ответа постановки (`delete:anon_server=enqueue ack=ok|failed`), затем `settleGuestEnqueueOutcome`: ответ ждём в фоне (потолок 8 с) → нет ответа → квитанция по ключу (`receipt=credential_safe`) → нет квитанции → запасной прямой вызов, пока гость ещё вошедший (`delete:anon_server=direct reason=enqueue_failed`). Успех → фаза `server_enqueued` (best-effort). Прямой вызов: ждём только отправки, ответ логируется (`delete:anon_server_direct ack=ok|failed`, failed → DebugLogger critical). Выход из Firebase — строго после отправки.
  - `ensureFreshPostDeletionIdentity` → `enqueueDeletion`: ветка «аноним с тем же uid, что в замке» раньше молча возвращала true (постановку не слала НИКОГДА). Теперь `retryGuestServerDeletionOnce`: одна постановка с ключом (потолок 8 с, без 15-с квитанции), лог `delete:anon_server=enqueue_retry ack=ok|failed`, всегда true — старт не блокируется отказом.
  - `PreparedAccountDeletion`: `cloudDeleteEnqueueOperation` стал nullable, добавлен `guestDirectDeleteOperation`.
- `app/cloud_sync.ts`: новый `startCloudDeletionDirect(stableId)` (+ тип `AccountDeleteDirectAck`) — `accountDeleteMine` со stableId, прочитанным ДО стирания; форма dispatch/ack как у постановки. Чужие незакоммиченные правки файла не тронуты.
- `tests/aa_guest_server_delete.test.ts` (новый, 7 поведенческих проверок).
- `tests/account_authority_legacy_callsite_guard.test.ts`: перепись осознанно +3 (startCloudDeletionDirect 1, startCloudDeletionEnqueue 2→3, waitForAccountDeletionCredentialSafe 3→4, occurrences 116→119) с пояснением.

**Подхватывает ли механизм повтора гостевой замок после перезапуска:** до правки — НЕТ (ветка «аноним с тем же uid» в `enqueueDeletion` возвращала true без постановки). После правки — да, но только пока на телефоне жива та же гостевая сессия Firebase: сервер (`resolveStableUidForDelete`) принимает постановку лишь от вошедшей личности-владельца, поэтому дожатие возможно ровно в случае «приложение убили до выхода из Firebase». Если выход уже был (фаза `old_stable_cleared`), повтор с новой анонимной личности сервер отверг бы (`stable_id_mismatch`) — поэтому в фоне ДО выхода сделаны квитанция + прямой вызов.

**Тесты (по одному, со слотом):** aa_guest_server_delete 7/7 (до правки 6 failed — красный), account_delete_flow_contract 23/23, account_authority_legacy_callsite_guard 31/31, auth_provider_behavior 110/110, aa_release_floor_auth_ui 19/19, aa_s4a_client_delete_local_first 35/35, aa_s5_delete_main_path 13/13, account_delete_enqueue_deadline 3/3, account_delete_guard_unreadable_boot_contract 5/5, account_delete_immediate_onboarding_contract 2/2, account_delete_modal_layout_contract 4/4, account_delete_quarantine_authority 19/19, account_delete_quarantine_behavior 4/4, account_delete_timeout 1/1, admin_legacy_account_delete_callable_contract 3/3, ideas_admin_delete_contract 2/2, notification_delete_undo 4/4, post_delete_fresh_identity_integration 15/15, post_delete_retired_identity_ui_contract 3/3. Проверка типов не запускалась (запрет).

**Риски / осталось:**
- `tests/account_delete_anonymous_no_guard_gate.mjs` (нигде не подключён) теперь падает намеренно: он сторожит отменённое этим пакетом правило «гостю замок не пишем». Удалить/переписать — решение координатора.
- Гость с замком идёт по нижнему пути: выход → `old_stable_cleared` → `ensureFreshPostDeletionIdentity('delete')` (новая анонимная личность). UI не меняется (онбординг уже открыт), но без сети фон вернёт `local_exit_unverified` (лог), дочистку подхватит старт. Пока замок в фазе `local_data_cleared` (≤ ~25 с фона при плохой сети), облачные вызовы гостя на онбординге в карантине — как у связанных.
- Гость, удаливший аккаунт и сразу входящий через Google, пока фон не закончен, подождёт `convergePendingAccountDeleteBeforeCredential` (раньше у гостя замка не было).
- Если запись замка гостя зависла дольше 5 с и дописалась позже — останется «ничейный» замок `prepared`; старт его дочистит (повторное стирание). Редкий случай зависания Keychain; так же было до 29.08.
- Путь без замка: stableId гостя не очищается (как и раньше); после серверного удаления телефон перейдёт на новую личность штатной веткой `identity_retired` — без новых окон.
- Прямой вызов не передаёт ключ Account V2 (флаг выключен; при включении — проверить, стирает ли `accountDeleteMine` данные V2).
- Проверка типов не прогонялась — нужен `npm run typecheck` по окну координатора. Живой прогон гостя на эмуляторе — по окну координатора.
- При коммите `app/cloud_sync.ts` брать только свой ханк (в файле чужие незакоммиченные правки).

## Политика конфиденциальности — черновик правки (применить после итога исполнителя)
Governance-ID: TG-26FBEB1554D0
`legal/privacy_policy_en.json` и `_en_ios.json`, раздел «20. Account and data deletion», после абзаца про 14 дней. Сейчас про гостя ничего нет; гостю «войди снова — восстановим» недоступно (способа входа нет).
Черновик (уточнить по факту кода: срок через очередь = 14 дней; запасной путь `accountDeleteMine` удаляет сразу; есть ли повтор после перезапуска):
> If you use the App without signing in with Google or Apple (a guest account), the same deletion flow applies, but a guest account has no sign-in method, so it cannot be restored after you delete it. The App clears local data on the device immediately and sends the deletion request in the background; if the device is offline, the App retries the request when it can reach our servers again. Server-side data of a guest account is deleted no later than at the end of the 14-day grace period.
Затем `npm run legal:sync`, «Last updated» — дата релиза. Публикует владелец.
Governance-ID: TG-E3076A219FC2 — сторож account_delete_anonymous_no_guard_gate.mjs переписан под новое правило (гостю замок best-effort, без proof-less постановки).
Governance-ID: TG-99B2CEA44E10 — REVISE ревью: прямой путь гостя ждёт ответ сервера (потолок) перед выходом, а не только начало отправки.
Governance-ID: TG-6CD62769D76A — коммит правки удаления гостя после APPROVE (cloud_sync — только свой ханк).
Governance-ID: TG-6CD62769D76A (прод.) — политика: абзац про удаление гостевого аккаунта (раздел 20), legal:sync.

## Решения координатора 23:35
Governance-ID: TG-202A96D05237 — сторож .mjs перенесён в юнит-набор aa_guest_server_delete; C3 / кнопки без EAS / тексты входа — аудит.
