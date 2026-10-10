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

## Политика конфиденциальности — черновик правки (применить после итога исполнителя)
Governance-ID: TG-26FBEB1554D0
`legal/privacy_policy_en.json` и `_en_ios.json`, раздел «20. Account and data deletion», после абзаца про 14 дней. Сейчас про гостя ничего нет; гостю «войди снова — восстановим» недоступно (способа входа нет).
Черновик (уточнить по факту кода: срок через очередь = 14 дней; запасной путь `accountDeleteMine` удаляет сразу; есть ли повтор после перезапуска):
> If you use the App without signing in with Google or Apple (a guest account), the same deletion flow applies, but a guest account has no sign-in method, so it cannot be restored after you delete it. The App clears local data on the device immediately and sends the deletion request in the background; if the device is offline, the App retries the request when it can reach our servers again. Server-side data of a guest account is deleted no later than at the end of the 14-day grace period.
Затем `npm run legal:sync`, «Last updated» — дата релиза. Публикует владелец.
