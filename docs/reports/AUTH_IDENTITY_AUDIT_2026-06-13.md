# Аудит авторизации и идентичности — моделирование сценариев

**Дата:** 2026-06-13
**Объём:** backend Cloud Functions (`functions/src/*`) + `firestore.rules` + клиентский identity-flow (`app/auth_provider.ts`, `app/stable_id.ts`, `app/cloud_sync.ts`, `app/premium_guard.ts`)
**Цель:** смоделировать все реальные сценарии входа/выхода/перезахода на разных аккаунтах, устройствах и платформах; найти дыры (потеря премиума, дубль премиума, угон/расслоение аккаунта); дать план починки.

---

## 0. Модель идентичности (как устроено сейчас)

Три слоя, намеренно расцеплены:

1. **`stable_id`** — случайный UUID (`Crypto.randomUUID()`), генерится 1 раз на установку, хранится в Keychain/EncryptedSharedPreferences (+ зеркало в AsyncStorage на Android для переживания переустановки). Это первичный ключ `users/{stable_id}`, лидерборда, лиг. **Не** выводится из auth uid.
2. **Firebase Auth uid** — токен для `request.auth` в rules. На старте — **анонимный** (`signInAnonymously`). После входа через Google/Apple → **новый** uid провайдера (через `signInWithCredential`, **не** `linkWithCredential` — анонимный uid выбрасывается).
3. **Провайдер-линк** — `auth_links/{providerUid}` = `{ stable_id, email, ... }`. Это якорь «Google/Apple аккаунт → какой stable_id».

**Связка «кто ты» держится только на `stable_id` + `auth_links`.** Firebase uid — расходник.

**Серверный источник правды по премиуму** — `users/{stable_id}.progress` (поля `premium_*`, `vip_*`). Туда пишут **только** Admin SDK (вебхук RevenueCat, Telegram-бот, админ-грант). Клиент эти поля **только читает** — `firestore.rules:progressHasNoPremiumWrites()` блокирует клиентскую запись, `cloud_sync.ts` вырезает их из исходящего патча. Это правильно и подтверждено.

### Ключевой инвариант безопасности (и его слабое место)

Право писать в `users/{stableId}` и `auth_links` опирается на `stableUserMatchesAuth(stableId)`:

```
users/{stableUid}.firebaseAuthUid == request.auth.uid
```

А `firebaseAuthUid` в свой `users`-док клиент **проставляет сам** (правило `create` = `newUserDocOwnerMatchesAuth`: достаточно `request.resource.data.firebaseAuthUid == request.auth.uid`). То есть **привязка `auth.uid → stable_id` — это самозаявление клиента**: «я кладу свой uid в док с этим id». Доказательства реального владения именно этим stable_id нет — только то, что ты знаешь его строку и можешь записать свой uid в (ещё ничей) док. См. дыру **H1**.

---

## 1. Карта сценариев (моделирование)

Обозначения: A/B — провайдер-аккаунты (Google/Apple). D1/D2 — устройства. S_x — stable_id. ✅ = ведёт себя корректно. ⚠️ = есть риск. 🔴 = подтверждённая дыра.

### 1.1 Базовые (один аккаунт)

| # | Сценарий | Что происходит | Вердикт |
|---|----------|----------------|---------|
| 1 | Первый запуск, без входа | `signInAnonymously` → анон uid; `getStableId()` → новый S_local; прогресс копится в `users/{S_local}` под анон uid | ✅ |
| 2 | Вход A на новом устройстве (нет `auth_links/A`) | транзакция: создаётся `auth_links/A = {stable_id: S_local}`, в `users/{S_local}` пишется `firebaseAuthUid = uid_A` | ✅ |
| 3 | Выход (обычный `signOutCurrentProvider`) | Firebase `signOut`, анон-кэш сброшен. **stable_id и локальный прогресс НЕ чистятся** | ⚠️ см. 1.4 (бил-через) |
| 4 | Перезаход тем же A на том же D1 | `auth_links/A.stable_id == S_local` → ветка `linked_existing` → `restoreFromCloud` | ✅ |
| 5 | Вход A на втором устройстве D2 (свой S_local2, A уже привязан к S_A на D1) | `remoteStableId = S_A` → `merged_swap_to_remote`: перед свапом `syncToCloud` (D2-прогресс улетает в `users/{S_local2}`), затем `copyLocalRealPremiumToStableId(S_A)`, `setStableId(S_A)`, wipe, `restoreFromCloud` из S_A | ⚠️ см. H3, H4 |

### 1.2 Несколько аккаунтов на одном устройстве

| # | Сценарий | Что происходит | Вердикт |
|---|----------|----------------|---------|
| 6 | Вход A, выход, вход B (одно устройство, без wipe между обычным signOut и входом B) | После signOut S_local не очищен. При входе B: `auth_links/B` указывает на S_B (≠ S_local) → `merged_swap_to_remote` на S_B. **Перед свапом** `copyLocalRealPremiumToStableId(S_B)` копирует локальные `premium_*` из памяти аккаунта A в облако B, если у A активный store-план | 🔴 **H3** дубль премиума |
| 7 | Вход B → выход → вход A снова | symmetric к 6; A восстановится из облака, но премиум A мог «протечь» на B в шаге 6 | 🔴 **H3** |
| 8 | Switch account (правильный UI-флоу) A→B | `signOutAndWipeForAccountSwitch`: forceSync (или abort если офлайн), wipe всех ключей, `clearStableId`. Затем вход B на чистом состоянии | ✅ кроме H4 (in-memory premium-кэш не сброшен явно) |

### 1.3 Слияние аккаунтов (merge by XP)

| # | Сценарий | Что происходит | Вердикт |
|---|----------|----------------|---------|
| 9 | Аноним накопил XP, входит A (у A в облаке тоже есть прогресс) | XP-merge: выигрывает больший `user_total_xp`. remote≥local → swap на S_A; local>remote → keep S_local, линк переписывается на S_local | ⚠️ **H2** клиентский merge, не серверный |
| 10 | A залогинен и на D1, и на D2 одновременно, оба копят прогресс | нет реал-тайм реконсиляции: last-write-wins с гейтом `cloudXP>localXP`. Per-field max для уроков/задач. Шарды отдельным каналом (max) | ⚠️ **H6** возможна потеря не-XP полей |
| 11 | Два разных анонимных устройства, потом оба входят в один A | Первое: created/swap. Второе: D2 имеет S_local2; видит `auth_links/A=S_A`; swap на S_A. Прогресс D2 ушёл в `users/{S_local2}` (forceSync до свапа), но **S_local2 не сливается с S_A автоматически** — он остаётся осиротевшим, XP/премиум на нём теряются для пользователя | 🔴 **H5** потеря прогресса |

### 1.4 Платёж ↔ аккаунт (premium binding)

| # | Сценарий | Что происходит | Вердикт |
|---|----------|----------------|---------|
| 12 | Покупка через RevenueCat (App User ID = stable_id) | вебхук: `candidateUserIds` (attrs `phraseman_uid`/`stable_id` → `app_user_id` → aliases), `findExistingUserRef` пишет `premium_*` в найденный `users/{uid}` | ⚠️ **H7, H8** |
| 13 | Покупка, но RevenueCat App User ID = `$RCAnonymousID` (RC не успел установить stable_id) | `prioritizeUserCandidates` ставит анонимные в конец; если стабильных нет — пишет премиум в **анонимный** id. Если потом юзер логинится, этот премиум не на его stable_id | 🔴 **H7** возможна потеря/осиротение премиума |
| 14 | Покупка на устройстве D1 (S_A), затем merge D2 (S_local2 выиграл по XP) | премиум записан на S_A вебхуком; merge сделал каноном S_local2 (local выиграл). `mergeUserProgress` переносит премиум-блок на победителя — но merge на клиенте (шаг 9) **не вызывает** `mergeUserProgress` (это серверная функция, см. H2). Клиентский swap-флоу полагается на `copyLocalRealPremiumToStableId`, который копирует только из **локального** хранилища | 🔴 **H2+H3** премиум может не доехать |
| 15 | Telegram-оплата (Stars) | заказ сохраняется `paid_pending_manual_activation`, привязка по **нику**, активирует **админ вручную** через панель | ✅ (медленно, но не авто-misbind) |
| 16 | Возврат денег (REFUND) через стор | вебхук `PREMIUM_INACTIVE_EVENTS` включает REFUND → `premium_plan=''`, expiry=now → премиум снят | ✅ |
| 17 | Истечение без вебхука (вебхук потерялся) | `premiumExpiryCron` каждые 6ч гасит просрочку с grace 72ч; бессрочные (expiry='0' без rc_expiry_ms) не трогает | ✅ |

### 1.5 Удаление и восстановление

| # | Сценарий | Что происходит | Вердикт |
|---|----------|----------------|---------|
| 18 | Delete account из приложения | `accountDeleteMine`: рекурсивно удаляет ~80 коллекций по stable+auth id, гасит Firebase Auth user, wipe локально | ✅ (но см. H9 — `auth_links` чистится по id/email, орфаны возможны) |
| 19 | Delete account → перезаход тем же A | `auth_links/A` мог остаться (удаляется по `stable_id`/`email`), указывает на удалённый S_A. Транзакция ловит `!remoteUserSnap.exists` → переписывает линк на новый S_local, ветка `created_new` | ✅ обработано явно |
| 20 | Переустановка без облачного бэкапа (iCloud Keychain/Google Backup выключены) | новый stable_id; старый прогресс осиротел; восстановление только повторным входом A (→ swap на S_A через `auth_links`) | ⚠️ зависит от настроек юзера |

---

## 2. Найденные дыры и риски

### 🔴 H1 — Привязка `auth.uid → stable_id` самозаявляется клиентом (фундаментальная)
**Где:** `firestore.rules` `newUserDocOwnerMatchesAuth` (create users), `stableUserMatchesAuth`; `auth_identity.ts:linkStableAuthUid` (сервер сам чинит `firebaseAuthUid` на любой запрошенный stableId, если у дока ещё нет другого живого владельца).
**Суть:** «владение» stable_id доказывается тем, что клиент знает его строку и кладёт свой uid в (ничей) `users`-док. `assertStableOwner` пропускает, если `firebaseAuthUid` пуст или равен своему. То есть **любой, кто узнал чужой stable_id, до того как у того дока проставлен `firebaseAuthUid`, может «застолбить» его за собой** (написать свой uid → стать владельцем по правилам → читать/писать прогресс, претендовать на привязку).
**Риск:** угон осиротевших аккаунтов (анонимные доки без `firebaseAuthUid` — таких много: все, кто не логинился). stable_id — это случайный UUID (не угадывается), поэтому реальная эксплуатация требует утечки id (логи, бэкап, шаринг устройства). **Severity: средняя** (нужен leak id), но это корень модели.
**Чинить:** при первом проставлении `firebaseAuthUid` фиксировать его необратимо (claim-once); запретить серверному `linkStableAuthUid` молча переклеивать `firebaseAuthUid` на док, у которого его ещё нет, без дополнительного пруфа (наличие `auth_links/{uid}.stable_id == stableId` ИЛИ `linkedAuth.providerUid == uid`). Сейчас `allowProviderRelink` частично это делает, но дефолтный путь (`requireKnownIdentity` не задан) возвращает `authUid` и создаёт док.

### 🔴 H2 — Merge всё ещё на клиенте; серверный `authMergeStableAccounts` не подключён
**Где:** `app/auth_provider.ts:796-947` (клиентская `runTransaction` merge by XP). Серверная `mergeStableAccounts` (`functions/src/auth_merge.ts`) и обёртка `mergeStableAccountsViaServer` (`cloud_sync.ts:1083`) существуют и покрыты тестами, но **в `signInWithProvider` не вызываются** (подтверждено: единственные ссылки — определение + контракт-тест).
**Суть:** именно клиентская merge-транзакция, читающая чужой `users`-док, была корнем бага расслоения аккаунтов (memory `phraseman_identity_split_rootcause`). Её перенесли на сервер, но **не переключили клиента**. Клиентская транзакция читает `users/{remoteStableId}` — это разрешено rules только если remote-док уже привязан к этому uid (через предварительный `ensureStableAuthLinkForStableId`), но merge самих `progress` НЕ происходит: победитель просто становится каноном, прогресс проигравшего на клиенте не сливается (только `copyLocalRealPremiumToStableId` тащит локальный премиум).
**Риск:** прогресс/премиум проигравшей стороны теряется (нет `mergeUserProgress`); XP-tie может выбрать не ту сторону; edge-кейсы расслоения. **Severity: высокая** (потеря данных + это незавершённая миграция).
**Чинить:** в ветке «different stable_id» (auth_provider.ts:854) вместо клиентской транзакции вызывать `mergeStableAccountsViaServer(localStableId, remoteStableId)`, затем `setStableId(результат.canonicalStableId)` + restore. Серверная версия делает настоящий best-of-field merge прогресса и шардов.

### 🔴 H3 — Кросс-аккаунтная запись премиума при свапе (`copyLocalRealPremiumToStableId`)
**Где:** `app/auth_provider.ts:86-115`, вызывается на `:998` в `merged_swap_to_remote`.
**Суть:** перед свапом stable_id код копирует **локальные** `premium_*` (REAL_PREMIUM_TRANSFER_KEYS, включая `premium_plan/expiry/rc_*`) в `users/{remoteStableId}.progress`, если локальный store-план «активен и не истёк». Намерение — «не потерять только что купленный премиум». Но это запись премиума **аккаунта A в облачный док аккаунта B**. Правила пропускают (пишем в док, привязанный к текущему uid).
**Риск:** **дубль премиума.** Сценарий 6: вошёл A (есть store-премиум), вышел, вошёл B → премиум A копируется на B. Теперь премиум на двух stable_id от одной покупки. Если оба аккаунта потом залогинятся с разных устройств — два активных премиума с одной подписки. RevenueCat при следующем событии перепишет только тот id, что в App User ID; «протёкший» на B премиум проживёт до `premiumExpiryCron` (а у store-плана `premium_expiry='0'` + есть `premium_rc_expiry_ms`? — нет, copy ставит `premium_expiry='0'` и **не** ставит `premium_rc_expiry_ms`, см. H3a). **Severity: высокая** (прямой дубль платного доступа).

#### 🔴 H3a — Протёкший премиум становится «бессрочным ручным» и не гасится кроном
**Где:** `copyLocalRealPremiumToStableId` ставит `premium_plan=monthly/yearly`, `premium_expiry='0'`, **без** `premium_rc_expiry_ms`.
**Суть:** `premiumExpiryCron.planExpiryDeactivation`: для store-плана с `premium_expiry<=0` и **без** `premium_rc_expiry_ms` → это трактуется как «бессрочная ручная выдача — НЕ трогаем НИКОГДА». Значит скопированный на B премиум **никогда не истечёт** автоматически.
**Риск:** вечный бесплатный премиум на аккаунте-реципиенте. **Severity: высокая.**
**Чинить:** либо убрать `copyLocalRealPremiumToStableId` вовсе (премиум и так привязан к stable_id в RevenueCat; правильный путь — `syncRevenueCatAfterAuthLink` переустановит App User ID на новый canonical и RC сам пришлёт событие на верный id), либо копировать с реальным `premium_rc_expiry_ms`, чтобы крон мог погасить, и только если RC реально знает эту подписку за этим юзером.

### ⚠️ H4 — In-memory premium-кэш не инвалидируется явно при свапе аккаунта
**Где:** `app/premium_guard.ts` (5-мин кэши `_cachedReal/_cachedVip/_cachedAccessResult`); swap-флоу `auth_provider.ts:990-1039` не зовёт `invalidatePremiumCache()` напрямую (только косвенно, если в восстановленном доке есть VIP-state).
**Риск:** до 5 минут после A→B свапа премиум-UI может показывать статус **предыдущего** аккаунта A. Не утечка денег (только UI), но путаница и потенциальный доступ к premium-фичам на чужом аккаунте на короткое окно. **Severity: низкая-средняя.**
**Чинить:** вызвать `invalidatePremiumCache()` сразу после `setStableId` в swap-блоке.

### 🔴 H5 — Осиротевший stable_id при входе на втором устройстве (потеря прогресса)
**Где:** `merged_swap_to_remote` (сценарии 5, 11).
**Суть:** на D2 был свой S_local2 с накопленным прогрессом. При входе A видим `auth_links/A=S_A` → forceSync (S_local2 в облако) → swap на S_A → restore из S_A. **S_local2 остаётся отдельным доком**, никогда не сливается с S_A (merge by XP в этой ветке не запускается — `remoteStableId` найден сразу из `auth_links`, идём в верхнюю ветку `if (remoteStableId)` на :773, минуя XP-merge транзакцию). Прогресс/премиум на S_local2 теряется для юзера.
**Риск:** потеря прогресса анонимного периода на втором+ устройстве. **Severity: высокая** (частый реальный кейс: «поставил на телефон, поиграл анонимно, вошёл — мой анонимный прогресс пропал»).
**Чинить:** в верхней ветке `if (remoteStableId)` тоже вызывать серверный merge `mergeStableAccountsViaServer(S_local, S_remote)` вместо простого свапа (H2 закрывает и это).

### ⚠️ H6 — Last-write-wins без per-field времени для не-XP полей
**Где:** `cloud_sync.ts` гейт `cloudXP>localXP || (==XP && cloudStreak>localStreak)`.
**Суть:** мульти-девайс без векторных часов. Per-field max есть только для уроков/задач/перфект-сетов/шардов. Прочие поля (настройки прогресса, счётчики, не-max поля) — last push wins против собственного снапшота устройства. Отстающее устройство может запушить устаревшее значение.
**Риск:** мелкая потеря/откат не-XP состояния при активной игре на 2 устройствах. **Severity: низкая.**

### 🔴 H7 — RevenueCat: премиум может записаться на анонимный RC-id
**Где:** `revenuecat_shards.ts:findExistingUserRef` + `prioritizeUserCandidates`.
**Суть:** если в событии нет стабильного кандидата (attrs `phraseman_uid`/`stable_id` пусты, `app_user_id` = `$RCAnonymousID`), `searchCandidates` падает на анонимные id и премиум пишется в `users/{$RCAnonymousID...}`. Это происходит, если покупка случилась до того, как клиент вызвал `Purchases.logIn(stable_id)` / установил attribute.
**Риск:** премиум осиротел на анонимном доке; легитимный платящий не видит премиум на своём stable_id → тикет в поддержку, ручная починка. Потенциально и дубль (если потом RC пришлёт RENEWAL уже с stable_id → премиум и там, и на анонимном). **Severity: средняя-высокая** (зависит от того, насколько рано клиент делает `logIn`).
**Чинить:** проверить, что клиент устанавливает RevenueCat App User ID = stable_id **до** любой покупки (`syncRevenueCatAfterAuthLink` это делает после линка, но аноним покупает до линка). Для анонимных событий — не активировать премиум, а складывать в «pending по transaction_id» и доставлять при `logIn`/`ALIAS`-событии. Сейчас `aliases` учитываются в кандидатах — убедиться, что RC шлёт `SUBSCRIBER_ALIAS`/`TRANSFER` события и они обрабатываются (сейчас TRANSFER не в списках событий вообще).

### ⚠️ H8 — RevenueCat вебхук пишет премиум в первый найденный док, не сверяя владельца
**Где:** `findExistingUserRef` берёт первый существующий из кандидатов.
**Суть:** кандидаты — это `app_user_id` + `aliases` + subscriber attributes. Если злоумышленник смог подсунуть в RevenueCat attribute `phraseman_stable_id` = чужой stable_id (через свой клиент, до покупки), его покупка активирует премиум на **чужом** аккаунте — но это «дарение», не кража, и требует знания чужого stable_id (H1). Обратное (украсть чужой премиум) так не выходит. Вебхук защищён `REVENUECAT_WEBHOOK_AUTH` — подделать само событие нельзя. **Severity: низкая** (нужен leak id + это самоповреждение).

### ⚠️ H9 — App Check выключен в проде → callable-функции зовутся без аттестации
**Где:** `callable_options.ts:ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true'` (по умолчанию **false**). Касается `authEnsureStableLink`, `authMergeStableAccounts`, `vipRevokeMine`, `accountDeleteMine` и всех HOT_CALLABLE.
**Суть:** (подтверждает memory `phraseman_app_check_disabled_prod`) любой с валидным Firebase Auth токеном (включая анонимный, который раздаётся всем) может дёргать эти endpoints из не-приложения. В сочетании с H1 (самозаявление stable_id) и `accountDeleteMine` (разрушительная) это повышает поверхность атаки.
**Риск:** скриптовая эксплуатация identity-логики и `accountDeleteMine` без приложения. **Severity: средняя** (нужен auth-токен, но он анонимно-доступен).
**Чинить:** включить `ENFORCE_APP_CHECK=true` на v2-функциях (особенно `accountDeleteMine`, `authMergeStableAccounts`) + включить App Check API (сейчас 403). Это **не однострочник** — нужен прогрев аттестации, иначе отвалятся живые клиенты; раскатывать через мониторинг `app_check_header_shape`-логов (они уже пишутся в `authEnsureStableLink`).

### ⚠️ H10 — Удаление аккаунта: возможны орфаны `auth_links` / непокрытые коллекции
**Где:** `account_delete.ts` — `auth_links` чистится по `stable_id`, `providerUid`, `email`. Если у юзера несколько провайдеров (Google+Apple) на один stable_id, а удаление идёт по одному auth uid, второй `auth_links`-док может остаться. Также список коллекций фиксирован — новые коллекции надо вручную добавлять.
**Риск:** висячий `auth_links` → при повторном входе вторым провайдером оживёт удалённый путь (но `!remoteUserSnap.exists` ловит это → created_new). Privacy-риск: остатки данных. **Severity: низкая.**

---

## 3. Что уже хорошо (подтверждено)

- ✅ Клиент **не пишет** `premium_*`/`vip_*` в Firestore — двойная защита (rules `progressHasNoPremiumWrites` + вырезание в `cloud_sync`).
- ✅ Серверный премиум-гейт ИИ-фич (`premium_status.ts`) читает из `users.progress`, не из тела запроса (закрыт старый класс багов).
- ✅ REFUND деактивирует премиум; `premiumExpiryCron` гасит просрочку с grace 72ч и не трогает бессрочные ручные.
- ✅ Идемпотентность вебхуков RevenueCat (`revenuecat_premium_events`/`revenuecat_shard_transactions` по eventId/transactionId).
- ✅ Серверный `mergeStableAccounts` корректно делает best-of-field merge и покрыт тестами (`auth_merge.test.ts`) — **остаётся только подключить его к клиенту** (H2).
- ✅ Delete-account → re-login обработан явно (orphan `auth_links`, отсутствующий remote-док).
- ✅ Шарды мёржатся по max (нет дюпа фарма).
- ✅ `vipRevokeMine` только понижает права, identity строго из `request.auth`.

---

## 4. План починки (по приоритету)

### P0 — закрыть дубль и потерю премиума/прогресса
1. **H2+H5:** подключить серверный merge. В `signInWithProvider` обе ветки (`if (remoteStableId)` и XP-merge) → `mergeStableAccountsViaServer(localStableId, remoteStableId)`, затем `setStableId(canonicalStableId)`. Убирает клиентскую транзакцию-merge целиком.
2. **H3+H3a:** убрать `copyLocalRealPremiumToStableId` (или жёстко обусловить реальным RC-сроком). После п.1 премиум доедет через серверный `mergeUserProgress` + переустановку RC App User ID.
3. **H4:** `invalidatePremiumCache()` сразу после `setStableId` в swap.

### P1 — платёжная привязка и поверхность атаки
4. **H7:** гарантировать `Purchases.logIn(stable_id)` до любой покупки; для анонимных RC-событий — pending-доставка, обработать `TRANSFER`/`SUBSCRIBER_ALIAS`.
5. **H9:** включить App Check (постепенно, по логам `app_check_header_shape`), приоритет — `accountDeleteMine`, `authMergeStableAccounts`.

### P2 — фундамент и мелочи
6. **H1:** claim-once для `firebaseAuthUid`; серверный `linkStableAuthUid` не переклеивает на док без пруфа.
7. **H6:** per-key время или больше per-field merge для не-XP полей.
8. **H10:** чистить все `auth_links` юзера по обоим провайдерам.

---

## 5. Меры предосторожности, которые можно применить уже сейчас (низкий риск)

Это безопасные, изолированные правки, не ломающие живых юзеров:

1. **H4 (1 строка):** добавить `invalidatePremiumCache()` после `setStableId(outcome.remoteStableId)` в `auth_provider.ts:1001`. Чистый плюс, нет даунсайда.
2. **H3a (defensive):** в `copyLocalRealPremiumToStableId` проставлять `premium_rc_expiry_ms` из локального `premium_rc_expiry_ms`, чтобы протёкший премиум **мог** быть погашен кроном (снижает ущерб от H3 до починки H2).
3. **Логирование:** добавить `console.warn` в `findExistingUserRef`, когда премиум пишется в анонимный RC-id (видеть масштаб H7 до фикса).
4. **Тест-стражи:** добавить юнит-тест, что `copyLocalRealPremiumToStableId` не создаёт «бессрочный» премиум без rc_expiry_ms; и контракт-тест, что `signInWithProvider` зовёт серверный merge (зафиксировать намерение H2 до реализации).

Я НЕ трогал код — это аудит. Правки выше готов внести по согласованию (начать предлагаю с безопасной меры №1 и №2).
