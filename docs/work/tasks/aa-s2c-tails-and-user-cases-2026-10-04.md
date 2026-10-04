# Task packet: Account Authority 2.0 — этап S2c: хвосты S2b (4 LOW) + реальные случаи пользователей §126

Governance-ID: TG-BB69AE2C24EC
Governance-ID: TG-95B27B3DB2C5
Governance-ID: TG-6FD48AB193A1
Status: Planned
Owner: Claude session (Account Authority 2.0)

## Outcome

**A. Хвосты security-ревью S2b (c3c69debc):**
1. L-S2b-1: перед сохранением привязки сверять текущий uid Firebase с `firebaseAuthUid`; не совпал — не сохранять (лог `binding_store_skipped reason=uid_changed`).
2. L-S2b-2: промисы создания привязки по uidHash; `resetForLease` удаляет только запись владельца аренды.
3. L-S2b-3: при следующем входе A, если ранее «выход выполнен» был засчитан на повторе, — проверить/освободить свою оставшуюся аренду (лог).
4. L-S2b-4: отказ слияния/перепривязки из-за потерянного nonce → различимый код для UI «повторите вход» (не тупик) + тест; текст UI не меняем без макета — только код и место подключения.

**B. Реальные случаи из обращений (§126 координатора, только анализ кода + логи + тесты-сценарии; данные прода не трогать):**
5. «После смены Google-аккаунта в телефоне не удаётся привязать Google; два аккаунта, оплата на одном». Найти путь привязки Google (auth_provider/auth_recovery/merge), понять, где он отказывает при смене Google-аккаунта; проверить, закрывает ли новая система (D-AA1/H1 перепривязка, привязка по uid, nonce M-1, слияние D-AA2). Если старый путь (1.6.x) ломается — СПЕРВА ЛОГИ на каждое ветвление с единым префиксом `[AUTH-LINK-GOOGLE]`. Сценарный тест для новой системы. Отдельно: как оплата (Plus) привязана к аккаунту при двух аккаунтах — не теряется ли при слиянии (проверить путь premium при merge; если есть риск — записать как 🔴 для координатора, не чинить молча).
6. «После перезапуска уровень 13↔12 и дни 155↔52 (01–02.09)» — похоже на два профиля и переключение. Найти, где на старте выбирается профиль/stableId (кэш личности, stable_auth_link_cache_v1, account_switch_quarantine, гидрация снапшота), какая гонка может давать попеременно два профиля; логи `[PROFILE-FLIP]` на каждом выборе личности на старте (откуда взята: кэш/сеть/снапшот, какой ключ, без идентификаторов в открытом виде — хеш/короткий префикс хеша). Сценарный тест новой системы: перезапуски не переключают профиль.
7. `auth:signin_failure swap_timeout_swap_presync_20000ms` ×2 и `AccountLogoutFlow:wipe_failed` ×1 (1.6.19). Найти источники, понять причины; логи на ранних выходах/catch, если немые; тесты-сценарии; что закрывает новая система, что остаётся старому пути (1.6.x) — список.

## Scope
Клиент AA (`modules/account-authority-v2/*`, `modules/account-session-v2/*`), `app/auth_provider.ts`, `app/cloud_sync.ts`, `app/account_switch_quarantine.ts`, пути выхода/стирания (AccountLogoutFlow), их тесты. В общих файлах — только свои хунки; чужие незакоммиченные не трогать. Без деплоя, без чтения/записи прод-данных.

## Architecture
Без изменения архитектуры: доводка клиента и трассировка старых путей.

## Security and privacy
Логи без uid/stableId/токенов/nonce (только хеш-префиксы и коды). Новых данных не собираем.

## Technical debt
Старый путь 1.6.x живёт до min_app_version 2.0 — его поломки фиксируются логами и списком; чинятся, только если правка безопасна и мала.

## Verification
Тесты на каждый пункт (RED→GREEN), мутации, тайпчек, независимое (security) ревью.

## Rollback
git revert.

## Итог исполнителя S2c (2026-10-04)

Без git (ничего не в индексе, не коммитил), без деплоя, прод-данные не читал. App Check и MAX не тронуты. Тяжёлые прогоны — только со слотом, по одному файлу. Снимки до правок: `.tmp_aa_s2c_backup/pre/` (+ `*.headdiff` — чужие незакоммиченные хунки на момент старта), перед мутациями — `.tmp_aa_s2c_backup/premutation/`.

### Часть A — хвосты S2b

1. **L-S2b-1** (`account_authority_lease_transport.ts`, `createAccountAuthorityFirebaseInstallationBindingPort`). Новый вход `currentAuthUid`. Сверка uid идёт дважды: до вызова (`installation_binding binding_create_skipped`) и перед `credentials.write` (`installation_binding binding_store_skipped reason=uid_changed|signed_out|current_uid_unreadable`). При несовпадении — отказ закрыто: наружу `account_authority_installation_binding_unavailable`, внутри код `_uid_changed`. В продакшене uid читается лениво из `@react-native-firebase/auth` (`readFirebaseCurrentAuthUid`).
2. **L-S2b-2**. Промисы привязок в памяти лежат по ключу `hash:<sha256 uid>`. Это тот же хеш, что в ключе SecureStore. Его отдают новые методы хранилища `uidKey`/`leaseOwnerKey` (`account_authority_production_adapter.ts`). `resetForLease` сбрасывает только промис владельца аренды (лог `reset_memory result=owner`). Если записи аренды нет, не трогает ничего (`result=none`). Со старыми фейками без `leaseOwnerKey` чистит всё (`result=all reason=owner_key_unavailable`).
3. **L-S2b-3**. Выход, засчитанный «выполненным» на повторе (S2b-R4), ставит отметку в памяти. При следующем входе того же uid отметка проверяется методом `revisionStore.leaseOwnedBy(owner, uid)`: хеш uid в записи аренды сравнивается с хешем этого uid. Если сервер отвечает `revision_mismatch` (или старый сервер присылает отказ без кода), транспорт повторяет вход ОДИН раз с `expectedRevision=null`, то есть с ревизией сервера. Сервер сам продлевает свою оставшуюся аренду (`leftover_lease_reclaimed`) или отзывает её (`leftover_lease_revoked`) либо принимается его ревизия (`server_revision_adopted`). Если выход действительно дошёл, пишется `release_confirmed`, лишнего вызова нет. Второй отказ окончательный: `presumed_release_unresolved`, отметка снимается, цикла нет. Другой uid на том же устройстве проверку не запускает (`presumed_release_other_owner`). Без этой правки следующий вход A падал бы в `revision_mismatch` навсегда: клиент уже сдвинул свою ревизию на +1.
4. **L-S2b-4** (`account_authority_anon_merge_nonce.ts`). Модуль хранит не секрет, а факт «nonce этому stableId выдан» и «к вызову его не было» (`anon_merge_nonce lost`). `classifyAnonMergeNonceRejection` переводит `stable_id_mismatch`/`permission-denied` в `anon_merge_nonce_lost`, только если nonce действительно потерян; прочие отказы не меняются. Место подключения: `cloud_sync.ts`, результат `ensureStableAuthLinkForStableIdDetailed` получил поле `nonceRejection` (`failure` остался прежним, поэтому старые ветки ведут себя как раньше). Отказ merge различается в логе, контракт `null` не менялся. В `auth_provider.ts` итоговый `auth_link_failed` в ветках remote и local заменяется на `anon_merge_nonce_lost`. Ротация якоря при `stable_id_mismatch` сохранена. Текст UI не менялся: нужен макет, сейчас код уходит в общий «Повторить».

### Часть B — случаи пользователей (СПЕРВА ЛОГИ)

Новый модуль `app/identity_trace.ts`. В нём единые префиксы, метки `h:xxxxxxxx` (FNV-1a) вместо uid/stableId, коды ошибок без текста и имена ключей хранилища без встроенных id (`redactStorageKey`). Строки пишутся через `console.warn` (в релизе не вырезается). Аномалии дополнительно уходят в `DebugLogger` и переживают перезапуск; обычный путь в журнал НЕ пишется, чтобы холодный старт не тяжелел.

**5. «Сменил Google-аккаунт — Google не привязывается; два аккаунта, оплата на одном».** Путь: `auth_provider.ts` `runSignInWithProviderWhileOwningHandoffLease`. Найденные тупики (по коду, не по догадке):
- (H5-1) `auth_provider.ts:2158–2170`. Если Firebase уже держит ПРОВАЙДЕР-сессию, а вход идёт без `requireCurrentStableIdOwnership`, любой тап сразу возвращает `account_switch_required`. Такое состояние оставляет оборванный вход: после `linkWithCredential` (вход на месте) шаг swap падает (`swap_*`, в том числе `swap_timeout_swap_presync_20000ms`, см. п. 7). Отката провайдер-сессии нет (catch на ~2885 только возвращает ошибку). Человек остаётся с анонимным локальным профилем и «чужой» Google-сессией. На старте `ensureStableAuthLink` ротирует якорь (`cloud_sync.ts` ~2140), но B не загружается. Выход только через «Сменить аккаунт».
- (H5-2) `auth_provider.ts:2330–2346`. Google-аккаунт уже существует отдельно (`credential-already-in-use`), а локальный аноним не «чистый» → тоже `account_switch_required`. Это штатно, но для человека выглядит как «не привязывается».
- Логи `[AUTH-LINK-GOOGLE]` стоят на каждой развилке: `start` (authState/authUid/localStable), `native ok|failed|cancelled`, `link decision` (canTryLink), `link linked_in_place|conflict` (код), `handoff proof` (localClean/postCompletionHandoff), `handoff signed_in` (uidChanged), `link_lookup result|failed` (прежде немой catch), `ensure_link remote|local` (ok/failure/source/sameAsLocal/nonceRejection), `stale_identity rotated|rotation_failed`, `outcome`, `swap presync_*`, `swap merge_result`, `swap merge_skipped_fallback`, `branch account_switch_required` (source), `result *`. В журнал пишутся: account_switch_required, firebase failed, presync_failed, merge_skipped_fallback, result error.
- Новая система: сценарный тест A → B (новый Google) → A на одном устройстве. Привязка у каждого uid своя, binding_mismatch и цикла нет, при возврате A новая привязка не создаётся (`aa_s2c_user_cases_new_system`).

**6. «После перезапуска уровень 13↔12, дни 155↔52».** Где на старте выбирается профиль: `stable_id.ts` `readOrCreateStableId` (SecureStore → legacy SecureStore → AsyncStorage → генерация). Затем первая облачная запись: `cloud_sync.ts:3154` → `ensureAuthoritativeIdentityForCloudMutation` → при расхождении с сервером `adoptAuthoritativeStableIdentity` (стирание + `setStableId` + restore).
- (H6-1, механизм доказан тестом-характеризацией) `stable_id.ts:316–360`. `persistStableId` считает запись успешной, если удался ХОТЯ БЫ ОДИН слой, а `readOrCreateStableId` (`:141`) на старте читает SecureStore ПЕРВЫМ. Пусть SecureStore не записался (сбой Keystore/Keychain), а AsyncStorage записался. Тогда в процессе живёт B, холодный старт поднимает A, первая запись снова находит канонический B (adopt). Профиль прыгает на каждом перезапуске. Не чинил: причина не подтверждена логами с телефона, а правка ядра личности рискованна. Предложение для починки по факту логов: при сбое SecureStore удалять в нём старое значение или сверять слои на старте.
- (H6-2) Снапшот первого кадра (`app_snapshot_store.ts`) не привязан к аккаунту. Его чистит только wipe. Файл правят другие сессии, я его не трогал; лог покажет, если H6-1 не подтвердится.
- Логи `[PROFILE-FLIP]`: `startup source` (source, stable, asyncStable, layersAgree; в журнал при расхождении), `startup secure_read_failed`, `persist result` (secure/async по слоям, layersDiverge, epochCurrent; в журнал при сбое), `persist skipped`, `cleared`, `authoritative mismatch` (local/server/authUid/source), `adopt start|done|skipped(reason)`, `adopt restore_failed` (прежде немой catch).
- Новая система: 6 холодных перезапусков → каждый resume открывает тот же аккаунт (`aa_s2c_user_cases_new_system`). Пары stableId в двух хранилищах там нет: профиль определяет аренда по uid и одна durable-область.

**7. `swap_timeout_swap_presync_20000ms` ×2 и `AccountLogoutFlow:wipe_failed` ×1 (1.6.19).**
- presync (`auth_provider.ts:2742–2776`). Шаг `syncToCloud({forceNow})` ограничен 20 с. Внутри `doSyncToCloud` → `ensureAuthoritativeIdentityForCloudMutation(localStableId)` (`cloud_sync.ts:3154`). В ветке `merged_swap_to_remote` сервер называет канонический профиль ≠ локальному, поэтому прямо внутри presync запускаются adopt, стирание и ПОЛНЫЙ restore чужого профиля. На медленной сети это легко больше 20 с (H7-1). Если сервер отвечает mismatch, `doSyncToCloud` молча выходит, НИЧЕГО не выгрузив (H7-2), и presync «успешен», хотя свежий локальный прогресс не уехал. Отдельно: `syncToCloud` при `syncInFlight` возвращается сразу, не дожидаясь (`cloud_sync.ts:2587`), и это тоже ложный «presync ok». Логи: `swap presync_start|ok|failed|skipped` (код, длительность, authState после отказа). По соседству с `[PROFILE-FLIP] adopt start` видно, подтверждается ли H7-1.
- wipe_failed (`account_switch_quarantine.ts:1055`). reason ставится по ФАЗЕ маркера `provider_signed_out`, а не по шагу. За ним может стоять стирание (`account_wipe_incomplete`: живой писатель вернул ключ между удалением и проверкой) или запись маркера. Контекст `AccountLogoutFlow:wipe_failed` (`AccountLogoutFlow.tsx:116`) вообще общий для ЛЮБОГО отказа форсированного выхода (reason/detail в тексте). Логи `[ACC-SWITCH-WIPE]`: `resume step_failed` (phase/reason/code), `resume marker_invalid` и `quiesce_threw` (прежде немые catch), `resume quiesce_failed`, `residue` с ИМЕНАМИ вернувшихся ключей без id (`cloud_sync.ts`, две точки), `signout inspect_failed` и `shard_sync_failed` (прежде немые), `signout force_sync`, `signout generation_changed` (ранний выход прежде маскировался под sync_failed «pending_shard_queue»).
- Новая система закрывает: выход через аренду и durable-область (S1/S2b), «выход выполнен» на повторе плюс проверка при следующем входе (L-S2b-3); профиль не зависит от двух слоёв stableId. Остаётся старому пути 1.6.x до min_app_version 2.0: H5-1/H5-2 (тупик account_switch_required после оборванного swap), H6-1 (расхождение слоёв stable_id), H7-1/H7-2 (presync, который adopt'ит и/или ничего не выгружает), фазовая метка wipe_failed.

### Файлы и хунки (только свои)
- Новые: `app/identity_trace.ts`, `tests/account_authority_s2c_tails.test.ts`, `tests/aa_s2c_user_cases_new_system.test.ts`, `tests/aa_s2c_profile_flip_trace.test.ts`, `tests/aa_s2c_logout_wipe_trace.test.ts`.
- `modules/account-authority-v2/account_authority_lease_transport.ts` — весь diff мой (интерфейсы `leaseOwnedBy`/`uidKey`/`leaseOwnerKey`, `type` в ответе, presumedReleases в acquire/release, порт привязки, `readFirebaseCurrentAuthUid`).
- `modules/account-authority-v2/account_authority_anon_merge_nonce.ts` — весь diff мой.
- `modules/account-session-v2/account_authority_production_adapter.ts` — 2 хунка: `leaseOwnedBy` в revision store, `uidKey`/`leaseOwnerKey` в credential store.
- `app/auth_provider.ts` — весь diff мой (на старте чужих хунков не было).
- `app/stable_id.ts` — весь diff мой.
- `app/cloud_sync.ts` — мои хунки (номера в текущем файле): импорты 48, 51; тип `nonceRejection` 1057–1063; ensureLink catch 2112, 2123; merge catch 2423–2426; adopt 2467–2489; authoritative 2559–2572; wipe residue 4947–4957, 4984–4991. Чужие (на месте, не трогал): 101–106, 191, 198, 291, 360–384, 464, 597, 814–823, 1149, 1506–1511, 1724–1727, 1784–1787, перенос S2b-строк в merge (~2400–2408), 3873/3923.
- `app/account_switch_quarantine.ts` — мои хунки 4–24 (ленивый `traceAccountSwitchWipe`), 903–905, 911–916, 1062–1065. Чужие 1103–1108 и 1161–1164 не трогал.
- `tests/account_authority_legacy_callsite_guard.test.ts` — перепись обновлена осознанно: auth_provider stableIdentityReads 17→19, peekStableId 5→7, occurrences 109→111 (метки трассировки); stable_id persistedIdentityReadsAndWrites 20→21 (сверка слоёв); cloud_sync occurrences 71→73, +`classifyAnonMergeNonceRejection: 2`.

### Проверки
- Новые: `account_authority_s2c_tails` 17/17, `aa_s2c_user_cases_new_system` 6/6, `aa_s2c_profile_flip_trace` 3/3, `aa_s2c_logout_wipe_trace` 5/5.
- Затронутые зелёные: lease_transport 18/18, s2b_transport 41/41, app_integration 18/18, logging_guard 10/10, legacy_callsite_guard 31/31, s2b_auth_provider_guard 4/4, s2b_cloud_sync 8/8, auth_provider_wiring 8/8, auth_provider_bridge 8/8, runtime 51/51, auth_provider_stable_link 35/35, auth_provider_behavior 93/93, stable_id 30/30, account_switch_quarantine 33/33, cloud_sync_identity_anchor 5/5, storage_snapshot 12/12, bootstrap_contract 10/10, account_delete_flow_contract 22/22, post_auth_generation_guard 2/2, startup_provider_reauth_recovery 4/4, firebase_cost_controls 17/17, support_diagnostic_integration 2/2, accounts_v2_client_wiring_v2 19/19, account_v2_client_tails_6c_v2 10/10, account_v2_tails_6d_v2 10/10, boot_cloud_restore 4/4, async_storage_capacity 3/3.
- Чужие падения, ДО моих правок такие же (проверено подменой на снимки `pre/` и обратным восстановлением с cmp): no_blocking_recovery_wall_contract 1, auth_recovery_provider_credential 1, cloud_sync_account_race_contract 1, auth_signin_warmup_contract 2, startup_settings_writer_boundaries 1; `account_generation.test.ts` не собирается (нет `app/level_gift_opening_guard`).
- `npm run typecheck`: 0 ошибок (весь проект).
- Мутации 11/11 убиты, наборы реально запускались (17/6/3/5 тестов), cmp после каждой — ok: M1 сохранение без сверки uid, M2 сброс всех промисов, M3 нет отметки «выход допущением», M4 проверка с клиентской ревизией, M5 потеря nonce не запоминается, M6 нет `nonceRejection` в результате, M7 слои «всегда согласны», M8 нет трассы шага wipe, M9 ключ привязки без uid, M10 метка = сырой id, M11 расхождение слоёв скрыто. Тесты писались вместе с реализацией, RED подтверждён этими мутациями.

### Для координатора
- 🔴 **HEAD (c3c69debc) с битым `app/cloud_sync.ts`.** Две строки S2b (`if (res?.data?.ok === true) forgetAnonMergeNonce([a, b], 'merged')` и комментарий) закоммичены ВНУТРЬ `adoptAuthoritativeStableIdentity`, где нет `res`/`a`/`b`. В HEAD это ошибка компиляции и `ReferenceError` при любом adopt (случай 6 проходит именно через adopt). Исправление (перенос в `mergeStableAccountsViaServer`) лежит только незакоммиченным в рабочем дереве. Закоммитить вместе с S2c или отдельно, не откатывать.
- 🔴 **Plus при двух аккаунтах (старый путь, не чинил).** `auth_provider.ts` ~2792–2830: слияние вернуло null → свап на remote БЕЗ серверного merge → premium-блок локального аккаунта (Plus, купленный, пока человек был анонимом) не переносится. RevenueCat делает `logIn(canonical)` и покупки остаются на старом appUserID до «Восстановить покупки». Так же при «Сменить аккаунт» (H5-2): локальный аноним с Plus стирается, Plus остаётся на его облачном документе. Это видимая «оплата на одном аккаунте». Нужно решение: перенос premium на свапе / авто-restore RC / запрет свапа без merge при активном Plus. Лог `swap merge_skipped_fallback` покажет частоту.
- 🔴 **Потеря свежего прогресса при входе (старый путь, H7-2).** presync, который должен выгрузить свежий прогресс перед стиранием, при mismatch молча ничего не пишет, а при `syncInFlight` вообще не ждёт. Подтвердить логами `[AUTH-LINK-GOOGLE] swap presync_*` + `[PROFILE-FLIP] authoritative mismatch`.
- 🟡 Сервер отвечает на отказ по nonce общим `stable_id_mismatch`. Точнее было бы опубликовать `details.reason=nonce_required|nonce_mismatch` (правка сервера, на решение). Клиент уже различает сам.
- 🟡 Текст UI для `anon_merge_nonce_lost` и для тупика `account_switch_required` после оборванного swap: нужен макет.
- 🟡 H6-1: после подтверждения логом (`layersDiverge:true` / `layersAgree:false`) — малая правка в `persistStableId`.

### Что проверить ревьюеру
- Нигде в логах нет uid/stableId/токенов/nonce: метки `identityTag`, `redactStorageKey` для имён ключей, `identityErrorCode` без текста ошибки. В S1-логгере новые строковые поля — только из allowlist (`result`, `reason`).
- L-S2b-3: проверка с `expectedRevision=null` идёт не чаще одного раза на отметку и только для аренды того же uid (по хешу). Нет ли сценария, где null-повтор захватывает чужую аренду (сервер всё равно проверяет привязку и личность в транзакции).
- L-S2b-1: в продакшене uid берётся из `@react-native-firebase/auth` лениво; при нечитаемом uid — отказ закрыто.
- В `auth_provider.ts` контроль потока не менялся. Добавлены только трассы, `Date.now()` в них не используется (часы трассы — `performance.now`). Единственная смена поведения — код ошибки `anon_merge_nonce_lost` вместо `auth_link_failed` при доказанной потере nonce.
- Журнал (`persist`) пишется только на аномалиях. Обычный старт и обычный вход в AsyncStorage не пишут.
