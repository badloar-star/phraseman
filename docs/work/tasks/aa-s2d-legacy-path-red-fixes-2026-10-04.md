# Task packet: Account Authority 2.0 — этап S2d: три 🔴 старого пути (решение координатора §127)

Governance-ID: TG-6419EC376E68
Governance-ID: TG-9D83081CA57E
Governance-ID: TG-4AC6243A1836
Governance-ID: TG-484FC0875198
Governance-ID: TG-58204A2B6E28
Governance-ID: TG-EE637CD5E202
Governance-ID: TG-1E9632865312
Governance-ID: TG-B7E2909105D7
Governance-ID: TG-B4486107C219
Governance-ID: TG-B7893DF57C45
Governance-ID: TG-855522DA9A29
Governance-ID: TG-76C816115684
Governance-ID: TG-DBB3D81C4FF1
Governance-ID: TG-31ED28C5AF02
Governance-ID: TG-EE637CD5E202
Status: Planned (после коммита S2c)
Owner: Claude session (Account Authority 2.0)

## Outcome

Порядок фиксирован координатором.

**🔴3 — профиль «прыгает» после перезапуска (уровень/дни 13↔12, 155↔52).**
`persistStableId` (`app/stable_id.ts` ~316) считает запись успешной при записи хотя бы в один слой; старт (~141) читает SecureStore первым. Сделать: успех только при записи во ВСЕ слои (иначе — повтор/явный провал с логом); старт читает согласованное значение (при расхождении слоёв — правило выбора: значение, подтверждённое последней успешной записью/сервером; лог `layersDiverge` со слоями и источником, без идентификаторов в открытом виде) и чинит расходящийся слой. Тест: SecureStore не записался → перезапуски не меняют профиль.

**🔴2 — потеря свежего прогресса при входе / swap_timeout_swap_presync_20000ms.**
До стирания локальных данных — ОБЯЗАТЕЛЬНО выгрузить локальное или дождаться уже идущей синхронизации (`app/cloud_sync.ts` ~2587); при mismatch без успешной выгрузки — НЕ стирать, понятный отказ (код для UI). Полное восстановление чужого профиля и adopt — НЕ внутри presync-таймаута 20 с (`app/auth_provider.ts` ~2742 → `doSyncToCloud` ~3154): вынести после переключения, с собственным прогрессом/повтором. Сценарные тесты медленной сети (presync дольше таймаута, параллельная синхронизация, mismatch).

**🔴1 — Plus при двух аккаунтах (вариант B, Fable).**
После ЛЮБОГО переключения аккаунта — тихий `Purchases.restorePurchases()` + повтор на следующем старте/возврате из фона, пока entitlement не совпадёт (с ограничением частоты, без лавины). Plus не мигает: локальный флаг Plus держится до ответа; откат только при ПОДТВЕРЖДЁННОМ отсутствии entitlement. Перед ручной сменой аккаунта при активном Plus — мягкое предупреждение «Plus перейдёт на новый аккаунт на этом устройстве» (текст/вид — от «Дизайна»; здесь только точка вызова и ключ текста). Логи `[PLUS-TRANSFER]`: appUserID хешем, причина, entitlements (имена), результат, каждый catch. Настройку RevenueCat «Transfer» проверяет владелец (вне кода).

## Scope
`app/stable_id.ts`, `app/auth_provider.ts` (swap/presync), `app/cloud_sync.ts` (presync/синхронизация — только свои хунки), путь RevenueCat (`app/revenuecat_*`, premium-кэш), их тесты. Чужие незакоммиченные хунки не трогать. Без деплоя, без прод-данных.

## Architecture
Старый путь 1.6.x доводится до безопасного поведения до cutover; новая система (AA) эти сценарии уже закрывает.

## Security and privacy
Логи без uid/stableId/appUserID в открытом виде (хеш-префикс), без токенов/чеков покупок. Покупки не создаются и не отменяются — только восстановление существующих.

## Technical debt
Тексты UI — от «Дизайна»; поле причины nonce на сервере — Ядро.
- LOW (S2d раунд 2, security-ревью): правило «SecureStore первым» при расхождении без метки — iCloud-бэкап (восстановление на новый iPhone) может вернуть AsyncStorage и Keychain разного возраста, и Keychain из бэкапа может перевесить более свежий профиль. Нужна метка поколения в обоих слоях (позже, не в S2d).
- S2d раунд 2: выгрузка локального прогресса ДО смены credential (вместо аварийной копии) — отдельным шагом позже.

## Verification
RED→GREEN на каждый 🔴, сценарные тесты (медленная сеть, расхождение слоёв, переключение с активным Plus), мутации, тайпчек, независимое ревью (security — для 🔴1 и 🔴2).

## Rollback
git revert по коммиту каждого 🔴.

## Итог исполнителя S2d (2026-10-04)

Ничего не закоммичено и не добавлено в индекс. Копии файлов до правок лежат в `.tmp_aa_s2d_backup/`. Каждый 🔴 оформлен отдельной частью.

### 🔴3 — профиль «прыгает» (H6-1)
- **Причина.** `app/stable_id.ts`, `persistStableId` (было ~316): запись считалась успешной, если записался ХОТЯ БЫ один слой. Старт (`readOrCreateStableId`, ~141) читает SecureStore первым.
- **Что сделано.**
  - Каждый слой пишется с одним повтором. Успех = записаны ВСЕ слои.
  - SecureStore не принял запись → старое значение в нём удаляется И в AsyncStorage ставится метка `phraseman_stable_uid_secure_stale_v1` = новый id.
  - Не удалось ни удалить, ни поставить метку, или не записан ни один слой → явный провал `stable_id_persist_failed`.
  - AsyncStorage не принял, SecureStore принял → снимается старая метка.
  - Старт при расхождении слоёв: AsyncStorage побеждает, только если метка совпадает с его значением, иначе SecureStore первым, как раньше. Отставший слой чинится, после починки метка снимается. Лог `[PROFILE-FLIP] startup layersDiverge` (chosen/reason/repair, хеш-метки) идёт в журнал.
  - То же правило действует в `readExistingStableId`. `clearStableId` снимает метку.
- **Почему метка, а не время.** У слоёв нет времени записи, а `Date.now()` в модуле подменяют тесты входа. Правдиво то, что записала последняя намеренная смена (свап/adopt после ответа сервера). Без метки остаётся «SecureStore первым» — это верно для переустановки на iOS.
- **Тесты.** `aa_s2d_stable_id_layers` 11/11, `stable_id` 30/30 (тест «failed set» осознанно ждёт `stable_id_persist_failed`), `aa_s2c_profile_flip_trace` 3/3 (характеризация перевёрнута A→B).
- **Мутации.** 8, все убиты.

### 🔴2 — потеря свежего прогресса при входе (H7-1/H7-2)
- **Причина.** Presync в `app/auth_provider.ts` (~2752) звал `syncToCloud({forceNow})`.
  - Если синхронизация уже шла, вызов сразу возвращался (`cloud_sync.ts` ~2587).
  - При mismatch `doSyncToCloud` (~3154) делал adopt и полное восстановление чужого профиля внутри окна в 20 с. Локальный прогресс не выгружался, а presync считался успешным.
- **Что сделано.**
  - `ensureAuthoritativeIdentityForCloudMutation(id, { adoptOnMismatch })` — по умолчанию поведение прежнее, добавлено поле `mismatch`.
  - `forceSyncToCloud({ adoptOnIdentityMismatch, onRefusal })` сообщает причину отказа.
  - `syncToCloud({forceNow})` теперь ждёт идущую синхронизацию и потом запускает свою.
  - Presync = `forceSyncToCloud({adoptOnIdentityMismatch:false})` с тем же лимитом 20 с.
  - Выгрузка не подтверждена → данные НЕ стираются, `{result:'error', error:'local_progress_not_uploaded'}`. В лог пишется `swap presync_failed` (reason, wiped:false).
  - Восстановление профиля remote, как и раньше, идёт после свапа в фоне.
- **Тесты.** `aa_s2d_presync_cloud_sync` 4/4. Добавлены 3 сценария в `auth_provider_behavior`: mismatch, медленная сеть дольше 20 с, выгрузка до стирания. Весь набор 96/96; на старом auth_provider новые сценарии падали 3/3.
- **Мутации.** 6, все убиты.

### 🔴1 — Plus при двух аккаунтах (вариант B)
- **Событие смены аккаунта.** `stable_id.onStableIdChanged` срабатывает на ЛЮБУЮ смену: setStableId на другой id и clearStableId.
- **Удержание Plus.** `app/plus_transfer_hold.ts` — лёгкий модуль без RevenueCat.
  - Удержание `plus_transfer_hold_v1` действует 72 ч. Флаг heldPlus ставится по свежему (до 24 ч) решению premium_guard для прежнего аккаунта.
  - premium_guard держит Plus по удержанию. premium_* нового аккаунта при этом не пишутся.
- **Тихое восстановление.** `app/plus_transfer.ts`.
  - Вызывает тихий `restorePurchases`. До и после проверяется appUserID.
  - Повтор на старте и при возврате из фона: не чаще раза в 10 мин, всего не больше 12 попыток.
  - Entitlement есть → `applyPushedCustomerInfo`.
  - Отсутствие ПОДТВЕРЖДЕНО → удержание снимается, отправляется `premium_deactivated`.
  - Сбой → Plus держится дальше.
  - Модуль ставится из `revenuecat_init._doInit`.
- **Мягкое предупреждение.** Точка вызова — `getPlusTransferSwitchWarning()` в `AccountLogoutFlow.tsx`. Ключ `plus_transfer_switch_warning`, текст — ЧЕРНОВИК для «Дизайна».
- **Логи.** `[PLUS-TRANSFER]`, appUserID только хешем.
- **Тесты.** `aa_s2d_plus_transfer` 11/11, `aa_s2d_plus_transfer_guard` 2/2. Тесты покупок/paywall зелёные: premium_guard 29, lifetime_purchase 14, premium_revenuecat_state 20, manage_subscription ×2, revenuecat_* ×3.
- **Мутации.** 9, все убиты.

### Общее
- Сторож переписи `account_authority_legacy_callsite_guard` обновлён осознанно, 31/31.
- `npm run typecheck`: 0 ошибок.
- Есть падения, не связанные с S2d:
  - `revenuecat_init_identity` («stale account») падает и на исходном файле.
  - `paywall_funnel_behavior` — ошибка TS в типе варианта.
  - `premium_context_vip_events_contract` — проверка исходника premium_context.

### Вопросы координатору
1. 🔴2: в ветке `merged_swap_to_remote` без маркера передачи выгрузить локальный профиль A нельзя: сервер всегда называет remote, правила запрещают запись. Поэтому вход с непустым прогрессом теперь получает `local_progress_not_uploaded`, а следующий тап — `account_switch_required` (H5-1). Варианты:
   - (а) оставить отказ;
   - (б) сделать аварийную копию и продолжить;
   - (в) выгружать до смены credential.
2. 🔴1: на iOS (StoreKit 2) `restorePurchases` может показать запрос Apple ID. `syncPurchases` RevenueCat не советует при `purchasePackage`. Нужно решение.
3. 🔴1: подтвердить параметры: окно 72 ч, повтор не чаще 10 мин, 12 попыток.
4. Индекс git показывает `D app/identity_trace.ts` и `D tests/aa_s2c_*`, хотя файлы есть и коммит 5c0c5e234 их содержит. Не трогал.

### Для security-ревью и S10
- Удержание Plus — только локальное решение UI, привязано к целевому stable_id, откат при подтверждённом отсутствии.
- `adoptOnMismatch:false` используется только в presync.
- В логах нет сырых id и чеков.
- Политика (S10): чек стора теперь уходит в RevenueCat автоматически после смены аккаунта, а не только по кнопке. Сверить формулировку.

## S2d раунд 2 — по security-ревью (REQUEST_CHANGES), 2026-10-04
- **H-S2d-1 (взаимная блокировка):** откатить ожидание идущей синхронизации в `syncToCloud({forceNow})` (cloud_sync ~2606–2617): покупка в «Управлении подпиской» зовёт его под `withAccountTransitionLock`, а идущий doSyncToCloud в adopt ждёт тот же замок. Presync это не нужно (идёт через forceSyncToCloud с потолком FORCE_SYNC_WAIT_INFLIGHT_MS). Тест-сторож: syncToCloud({forceNow}) при идущей синхронизации возвращается без ожидания.
- **H-S2d-2 (тупик гостя с прогрессом) — вариант (б), безопасность подтверждена ревьюером:** при неподтверждённой выгрузке — `saveAccountSwitchEmergencyBackup` для stableId A, проверить сохранение ДО стирания; любой отказ сохранения (other_owner_pending/capacity/history_upgrade_required/identity_unavailable) → прежний отказ `local_progress_not_uploaded` без стирания; без `allowShelveOtherOwnerBackup`; дальше — тот же `mergeStableAccountsViaServer(A, B)`, как до S2d; лог сохранения копии в `[AUTH-LINK-GOOGLE]`. Тесты: гость с прогрессом входит в существующий аккаунт → вход проходит, копия есть, доливается только в A; отказ сохранения → отказ без стирания. (Выгрузка до смены credential — отдельным шагом позже.)
- **H-S2d-3 (iOS):** автоматический путь — `Purchases.syncPurchases()` (без системного запроса); `restorePurchases` — только по кнопке «Восстановить покупки». Тест.
- **M-S2d-1:** при `stable_id_cleared` — `heldPlus:false` (держать Plus только при свапе на конкретный target). Тест: выход A с Plus → вход B на том же устройстве — Plus не выдаётся.
- **Старый немой catch** у ожидания forceSyncToCloud (~4541) — лог в релизе.
- LOW (iCloud-бэкап может перевесить свежий Keychain) — записать в Technical debt.

## Итог исполнителя S2d — раунд 2 (2026-10-04)

Ничего не закоммичено и не добавлено в индекс. Копии файлов до правок раунда 2 лежат в `.tmp_aa_s2d_backup/r2/`. Мутации восстанавливались байт-в-байт (cmp).

### Проверки
- Полный тайпчек: 0 ошибок.
- Наборы: stable_id_layers 11, stable_id 30, profile_flip 3, presync_cloud_sync 6, auth_provider_behavior 101, plus_transfer 13, plus_transfer_guard 2, plus_switch_notice 5, local_progress_not_uploaded_copy 4, legacy_callsite_guard 31, premium_guard 29, identity_anchor 5, s2b_cloud_sync 8, account_switch_quarantine 33, account_switch_backup_restore 22, registration_prompt_modal_lifecycle 4, registration_prompt_recovery_ui_contract 8, auth_provider_stable_link 35, logout_wipe_trace 5.
- `revenuecat_init_identity` по-прежнему 1 падение — оно было и до S2d.

### Что сделано по пунктам
- **H-S2d-1.** `syncToCloud({forceNow})` при идущей синхронизации снова возвращается сразу. Сторож — тест «never waits…».
- **H-S2d-2, вариант (б).** Если выгрузка не подтвердилась, сохраняется аварийная копия A без `allowShelveOtherOwnerBackup`, затем она проверяется через `readAccountSwitchEmergencyBackupSummary`: владелец должен быть A. В лог `swap presync_backup_saved` пишется размер копии (`backupPairs`, `backupBytes`). Дальше — прежний `mergeStableAccountsViaServer(A, B)`.
  - Любой отказ копии (`other_owner_pending`, `capacity`, `history_upgrade_required`, `identity_unavailable`, `unavailable`, `owner_mismatch`) → `local_progress_not_uploaded` без стирания.
- **Жизнь копии.** Ключи копии не входят в инвентарь стирания аккаунта (тест). При входе в B копия не трогается (`different_account`). Удаляется она только:
  - при восстановлении в тот же A;
  - через 30 дней — при первой попытке восстановления после срока;
  - на форсированном выходе её не удаляют, а откладывают под другим ключом.
- **H-S2d-3.** Тихий путь на обеих платформах: `syncPurchases()` + `getCustomerInfo()`. `restorePurchases` остаётся только за кнопкой.
- **M-S2d-1.** При `stable_id_cleared` ставится `heldPlus:false`; удержание без target Plus не даёт.
- **Немой catch** в `forceSyncToCloud` (ожидание идущей синхронизации) теперь пишет `[SYNC-DENY]` и DebugLogger.
- **Флаг предупреждения о Plus.** `PLUS_TRANSFER_SWITCH_NOTICE_ENABLED = true`.
  - Условие: `shouldShowPlusTransferSwitchNotice(isPremium, peekStableId())` — показывается только при store-Plus.
  - В `settings.tsx` считается через `useMemo` один раз на открытие окна.
  - Временный вызов из `AccountLogoutFlow` удалён.
- **Тексты `local_progress_not_uploaded`.** Подключены в `RegistrationPromptModal` («Повторить» оставлен) и в `describeAuthError` в `CleanOnboarding`. Текст выбирает `signInRefusalCopyFor`.

### Мутации
- 12, все убиты: R1, R1b, R2, R2b, R2c, R2d, R3, R4, R4b, R5, U1, U2.


## S2d раунд 3 — решения координатора §135 (2026-10-04)
- ❓1: отдельный код `local_progress_backup_blocked` (копию сделать нельзя: other_owner_pending и родственные) — текст и кнопка «Сменить аккаунт» как у account_switch_required (тексты 9 языков от «Дизайна» в app/account_sync_copy.ts; подключаю я, когда появятся — до того ветка с тем же поведением, что account_switch_required). `local_progress_not_uploaded` — только для настоящего сбоя связи/записи. Распределить коды отказа копии между двумя кодами явно (таблица в итоге) + тесты.
- ❓2: после ПОДТВЕРЖДЁННОГО merge(A→B) — долить копию A в B только недостающими ключами (в B ничего не перезаписывать), лог `[ACC-BACKUP-MERGE]` с числом ключей (без значений), затем удалить копию; до подтверждения не трогать. Тест «копия не блокирует Сменить аккаунт после merge»; тест «в B ничего не перезаписано»; тест «merge не подтверждён — копия жива».
- ❓3: принято; проверка переноса Plus на устройстве с настройкой Transfer — владельцу в FINAL.
- Плюс замечания повторного security-ревью раунда 2 (если будут).
- **Повторное security-ревью раунда 2 (REQUEST_CHANGES) — механика для ❓2 (совпадает с §135):**
  1. Merge подтверждён (`merge.ok && canonicalStableId === B` в этом же входе) → под замком смены аккаунта записать метку-псевдоним `{from: A, to: B, at}`; копию НЕ переписывать (страницы v3 связаны хешами). Фоновое восстановление после входа (auth_provider ~3106, `tryRestoreAccountSwitchBackup`) принимает копию, если `backup.stableId === alias.from && alias.to === currentId` → доливает в B только отсутствующие ключи (B не перезаписывать), лог `[ACC-BACKUP-MERGE]` с числом ключей, удаляет копию и метку.
  2. Merge НЕ подтверждён (откат на свап без merge) → копию A сразу отложить (shelve), чтобы не блокировала «Сменить аккаунт»; добавить очистку отложенных копий `account_switch_emergency_backup_shelved_v1:*` старше 30 дней (давняя утечка).
  3. Не удалять копию по признаку «выгрузка подтверждена» — в этой ветке дельта A в облако не попадала.
- **RevenueCat:** `syncPurchasesForResult()` вместо устаревшего `syncPurchases()`+`getCustomerInfo()` (решение «подтверждённое отсутствие» — по ответу самой синхронизации); не запускать проверку переноса, пока открыт поток покупки (paywall / «Управление подпиской») — отложить до следующего повода.
- Текст «Plus перейдёт…» — сверить с поведением при «Сменить аккаунт» (Plus переходит после синхронизации покупок и при настройке Transfer в RC) — замечание «Дизайну» через координатора.

## Итог исполнителя S2d — раунд 3 (2026-10-04)

Ничего не закоммичено и не добавлено в индекс. Копии файлов до правок лежат в `.tmp_aa_s2d_backup/r3/`. Мутации восстанавливались байт-в-байт (cmp). Одна запись упала на занятом файле — повторена и сверена.

### (A) Два кода отказа — `app/presync_backup_refusal.ts`
**`local_progress_backup_blocked`** — копию сделать нельзя по состоянию устройства, повтор не поможет:

| Код отказа копии | Причина |
|---|---|
| `account_switch_backup_other_owner_pending` | на телефоне уже лежит копия другого аккаунта |
| `account_switch_backup_history_upgrade_required` | старую копию нужно сначала обновить |
| `account_switch_backup_value_upgrade_required` | значение слишком большое для формата копии |
| `account_switch_backup_capacity` | нет места |
| `account_switch_backup_unavailable` | личность в карантине удаления аккаунта |

**`local_progress_not_uploaded`** — сбой связи или записи, повтор имеет смысл:

| Код отказа копии | Причина |
|---|---|
| `account_switch_backup_identity_unavailable` | не удалось прочитать личность |
| `account_switch_backup_verification_failed` | запись копии не прошла проверку |
| `account_switch_backup_namespace_conflict` | конфликт ключей при записи |
| `account_switch_backup_owner_mismatch` | копия не читается как копия гостя |
| любой неизвестный код | по умолчанию — повтор |

- **Тексты.** `signInRefusalCopyFor` в `account_sync_copy.ts`: для blocked — тексты «Дизайна» `localProgressBackupBlockedCopy` (6eb7937ec, файл не правил), `offersAccountSwitch:true`.
- **Модалка входа (`RegistrationPromptModal`).** Для blocked снимается «Повторить» и показывается кнопка `auth-switch-account` — тот же переход, что у `account_switch_required`. Подпись кнопки берётся из текста отказа.
- **Онбординг (`CleanOnboarding.describeAuthError`).** Тот же текст через `signInRefusalCopyFor`.

### (B) Жизнь копии гостя
- **Merge подтверждён** (`merge.ok && canonical === B`): под замком смены аккаунта пишется метка `account_switch_backup_merge_alias_v1` = `{from:A, to:B, at}`.
  - `restoreAccountSwitchEmergencyBackupIfSafe` принимает копию A для B только по метке.
  - В B доливаются только отсутствующие ключи. Ключи с id A в имени пропускаются.
  - Лог `[ACC-BACKUP-MERGE] restored` с числами `restoredKeys`, `skippedExisting`, `skippedForeignKeys`.
  - Затем удаляются копия и метка.
- **Merge не подтверждён** → копия A сразу откладывается (`shelveAccountSwitchEmergencyBackupOf`, только своего владельца).
- **Очистка.** `pruneShelvedAccountSwitchBackups` удаляет отложенные копии старше 30 дней вместе со страницами. Вызывается после каждой попытки восстановления копии при входе.
- **Удаление по признаку «выгрузка подтверждена» не делается:** при подтверждённой выгрузке ни метки, ни откладывания нет (тест).

### (C) RevenueCat
- `syncPurchasesForResult()` — решение по `customerInfo` из ответа самой синхронизации.
- Новая метка `app/purchase_flow_activity.ts` (счётчик в памяти, `withPurchaseFlow`) стоит на четырёх вызовах магазина: paywall (покупка, восстановление), «Управление подпиской» (смена тарифа, восстановление).
- Пока поток покупки открыт, проверка переноса возвращает `deferred_purchase_flow`: попытка не тратится, Plus держится.

### Тесты
- Зелёные: presync_backup_refusal 12, backup_merge_alias 5, presync_cloud_sync 8, plus_transfer 16, local_progress_copy 5, auth_provider_behavior 104, account_switch_backup_restore 22, legacy_callsite_guard 31, paywall_purchase_behavior 10, paywall_purchase_activation 8, paywall_purchase_pending 1, manage_subscription_* 5+3, lesson_purchase_continuation 2, onboarding_embedded_purchase 3, registration_prompt ×2, plus_switch_notice 5, plus_transfer_guard 2, premium_guard 29, lifetime 14, stable_id ×3, identity_anchor 5, s2b 8, quarantine 33, stable_link 35, wipe_trace 5.
- Не связано с S2d: `manage_subscription_save_offer` «уход в стор…» падает и на исходном файле.
- Тайпчек: 0 ошибок.

### Мутации
- 14 пунктов, все убиты: T1–T3, T4b, T5–T8, T9b, T10b, T11–T14.

## Итог исполнителя S2d — раунд 3, дополнения (2026-10-04)

### Логи без сырых id
- В `cloud_sync.ts` замаскированы две строки:
  - `[ACC-MUT] backup:shelved_other_owner` — `owner=identityTag(...)`, `stamp=` вместо ключа, потому что в ключе есть id владельца;
  - `[ACC-MUT] backup:other_owner_blocked` — `owner`/`current` через `identityTag`.
- Других логов с сырыми id в функциях копий нет.
- Сторож — тест `guard: backup logs never carry a raw stable id`. Мутации K1, K2 убиты.

### PM-229 — немые catch
- Закрыто: `auth_provider.ts` 25 → 0, `account_switch_quarantine.ts` 3 → 0.
- В auth_provider введён помощник `swallowAuthAs(prefix, step, whenSwallowed)`: пишет префикс, шаг и код ошибки, без id и токенов. Поведение не изменилось.
- В quarantine — `traceAccountSwitchWipe`.
- База храповика: `auth_provider` и `account_switch_quarantine` убраны из BASELINE `tests/pm229_silent_catch.probe.ts` (37 → 9). Проба зелёная.
- Тест `aa_s2d_pm229_auth_zero` — 3. Мутации Z1, Z2 убиты.

### §139 (2) — потолок для оверлея «стираю»
- Новый `app/account_switch_deadline.ts`: `awaitWithStillRunningNotice` и `ACCOUNT_SWITCH_UI_DEADLINE_MS = 45_000`.
  - Смену не обрываем: стирание идёт через маркер/карантин и возобновляется.
  - По потолку оверлей снимается, показывается «ещё идёт» через тот же `showInfoAlert`; текст — черновик ru/en, ключ `account_switch_still_running`.
  - Лог `[ACC-SWITCH-WIPE] ui_deadline still_running`.
- Подключено в `settings.tsx` на обоих вызовах смены.
- Пункты (1) и (3) не трогал: по поправке координатора они уже есть в HEAD.
- Тест `aa_s2d_account_switch_deadline` — 5. Мутации D1–D3 убиты.
- Тайпчек: 0 ошибок.



## S2d ЗАКРЫТ (ebc1a860d, security APPROVE). Раунд 4 — 6 LOW ревью раунда 3 («ничего на потом»), 2026-10-04
- L-R3-1: конфликт по графу Learning V2 при доливании по псевдониму → не `invalid` с вечной копией: конфликтующие ключи пропускать как «уже есть» (лог числа), копию и метку удалять; тест.
- L-R3-2: сбой записи метки-псевдонима → копию сразу отложить (shelve), чтобы не блокировала «Сменить аккаунт»; тест.
- L-R3-3: `saveAccountSwitchEmergencyBackup` учитывает псевдоним: копия A с меткой {from A, to текущий} не считается чужой (не other_owner_pending) — сначала доливание/удаление, затем новая копия; тест.
- L-R3-4: `pruneShelvedAccountSwitchBackups` — ошибка разбора на каждом ключе отдельно (лог), цикл не прерывается; плюс запуск не чаще раза в сутки (метка времени последней очистки); тест.
- L-R3-5: повторный тап после потолка 45 с — отдельная метка «смена ещё идёт» (in-memory), повторный тап показывает тот же статус «ещё идёт», а не отказ; метка снимается по приходу результата; тест.
- L-R3-6: `purchase_flow_activity` — потолок жизни метки (напр. 10 мин), по истечении снимается с логом, чтобы зависший вызов стора не блокировал перенос Plus до перезапуска; тест.

## Итог исполнителя S2d — раунд 4 (2026-10-04)

Не закоммичено, в индекс не добавлено. Копии до правок лежат в `.tmp_aa_s2d_backup/r4/`. Мутации восстанавливались байт-в-байт (cmp).

### Что сделано
- **L-R3-1** (`account_switch_backup_restore.ts`): при доливании по псевдониму конфликт графа Learning V2 больше не даёт `invalid`.
  - Пропускается весь граф копии, а не только конфликтующий ключ: половину чужого графа ставить нельзя.
  - Остальное доливается, копия, страницы и метка удаляются.
  - Лог `[ACC-BACKUP-MERGE] restored` получил поля `graphConflict` и `skippedGraphKeys`.
  - Своя копия без псевдонима ведёт себя как раньше.
- **L-R3-2** (`auth_provider.settleGuestBackupAfterSwap`): если метка-псевдоним не записалась, пишется лог `swap backup_alias_write_failed`, а копия откладывается.
- **L-R3-3** (`cloud_sync.saveAccountSwitchEmergencyBackup`): копия гостя с меткой `{from, to: текущий}` больше не считается чужой.
  - Сначала копия доливается через `foldMergedGuestBackupBeforeNewBackup` → `restoreAccountSwitchEmergencyBackupIfSafe(…, { lockTimeoutMs: 1500 })`, затем пишется новая копия.
  - Если замок занят (save вызывают и под ним) или долив не удался, копия откладывается и метка снимается. Взаимной блокировки нет.
  - У restore появились опция `lockTimeoutMs`, статус `lock_busy` и экспорт `clearAccountSwitchBackupMergeAlias`.
- **L-R3-4** (`pruneShelvedAccountSwitchBackups`):
  - каждый ключ обрабатывается в своём try с логом `shelved_prune_key_failed` (номер ключа, без id);
  - запуск не чаще раза в сутки, время последней очистки хранится в `account_switch_shelved_prune_last_run_v1`.
- **L-R3-5** (`account_switch_deadline.isAccountSwitchStillRunning`): метка ставится на потолке и снимается, когда приходит результат смены.
  - В Настройках оба входа в смену (основной и «без сохранения») при метке показывают тот же статус.
  - Текст статуса — `accountSwitchStillRunningCopy` «Дизайна» (90aecd479), черновик удалён.
- **L-R3-6** (`purchase_flow_activity`): у каждого потока своя запись и потолок `PURCHASE_FLOW_MAX_AGE_MS` = 10 мин. По истечении пишется лог `[PLUS-TRANSFER] purchase_flow expired`.

### Тесты и проверки
- Наборы: backup_merge_alias 9, presync_cloud_sync 14, account_switch_deadline 7, plus_transfer 17, auth_provider_behavior 105, account_switch_backup_restore 22, legacy_callsite_guard 31, pm229_auth_zero 3, stable_link 35, quarantine 33, plus_switch_notice 5, paywall_purchase_behavior 10, manage_subscription_race 5.
- Тайпчек: 0 ошибок.
- PM-229: 9 немых catch, база не поднималась.

### Мутации
- 10, все убиты: R1, R1b, R2, R3, R3b, R4, R4b, R5, R5b, R6.
- R1 сначала выжила: ветку v3 не покрывал ни один тест. Добавлен тест v3, после чего мутация убита.

