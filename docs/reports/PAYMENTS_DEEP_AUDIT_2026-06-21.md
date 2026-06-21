# Глубокий аудит платёжной системы Phraseman — 2026-06-21

Метод: многоагентный воркфлоу (8 измерений аудита + адверсариальная верификация),
воркфлоу упал на фазе верификации из-за лимита сессии → **ключевые находки
верифицированы лично чтением кода**. Всего 37 уникальных находок из 8 измерений.

## Легенда серьёзности
- **P0** — утечка дохода ИЛИ потеря оплаченного доступа у платящего.
- **P1** — доступ выдаётся не тому/не тогда, рассинхрон источников истины.
- **P2** — граничный случай / UX / наблюдаемость.

---

## ✅ ВЕРИФИЦИРОВАНО ЛИЧНО — ПОДТВЕРЖДЕНО

### P0-1. `profile_card_level` ломает ВЕСЬ облачный синк после апгрейда карточки
**Файл:** `app/cloud_sync.ts:1400,1403` ⇄ `firestore.rules:94`
**Суть:** `profile_card_level` в blocklist правил (внутри progress), но НЕ в клиентских
strip-списках (`PREMIUM_PROGRESS_KEYS` стр.660-682 / `SERVER_OWNED_PROGRESS_KEYS` стр.690-703 /
regex `isServerOwnedProgressKey`). После апгрейда карточки (CF пишет `profile_card_level`
в облако → restore → AsyncStorage) при следующем `syncToCloud` поле уходит в исходящий
patch → rules отклоняют весь `set` с PERMISSION_DENIED → **синк XP/streak/прогресса
устойчиво ломается** у каждого, кто прокачал карточку.
**Фикс:** добавить `profile_card_level` в `SERVER_OWNED_PROGRESS_KEYS` (cloud_sync.ts:690).

### P0-2. Прямая запись `shards` при СОЗДАНИИ документа (обход hasNoShardWrites)
**Файл:** `firestore.rules:963`
**Суть:** `allow update` (962) вызывает `hasNoShardWrites()`, а `allow create` (963) — НЕТ.
`shards` — топ-уровневое поле (не в progress), `newDocHasNoPremiumWrites` его не покрывает.
Кастомный клиент при первом создании `users/{uid}` может вписать `shards: 99999`.
**Фикс:** добавить `&& hasNoShardWrites()` в `allow create` ИЛИ create-вариант,
проверяющий отсутствие shards-полей в новом документе.

### P0-3. Серверный `isStorePremiumActive` ИГНОРИРУЕТ `premium_rc_expiry_ms`
**Файл:** `functions/src/premium_status.ts:71-81`
**Суть:** Сервер смотрит только на `premium_expiry`. Вебхук при активной подписке
пишет `premium_expiry='0'` и реальный срок кладёт в `premium_rc_expiry_ms`. Если
EXPIRATION-вебхук потерялся, `premium_expiry` остаётся '0' → сервер вечно считает
премиум активным → бесплатный дорогой OpenAI (stats/weekly/dialog). Клиент
(`premium_guard.ts:99`) и крон проверяют rc_expiry, сервер — нет (рассинхрон).
**Фикс:** в `isStorePremiumActive` учесть `premium_rc_expiry_ms` (с тем же grace, что крон).

### P0-4. `premium_guard.getVerifiedRealPremiumStatus` не признаёт план 'lifetime' офлайн
**Файл:** `app/premium_guard.ts:79` (`storePlan = monthly|yearly|annual`)
**Суть:** При сбое/таймауте RC (8с) или в Expo Go код идёт по локальной ветке,
где `storePlan` НЕ включает 'lifetime' → `paidProgressActive=false` → покупатель
«Навсегда» теряет доступ. Та же категория, что уже фикшеные `isStorePremiumPlan`.
**Фикс:** добавить `lifetime` в `storePlan` (стр.79).

### P0-5 (degr. до P1). `merged_keep_local` не вызывает серверный merge — VIP теряется
**Файл:** `app/auth_provider.ts:1113-1131` (ветка), `:949` (выбор)
**Суть:** `merged_swap_to_remote` вызывает `mergeStableAccountsViaServer`, а
`merged_keep_local` (когда localXP>remoteXP или remote чужой) — только `syncToCloud()`.
VIP/admin-grant/intro/loyalty из remote-аккаунта (живут только в Firestore progress)
не переносятся → теряются. Store-премиум спасает RC restore, поэтому реальный риск —
**потеря VIP/реферального доступа**, не store. → P1.
**Фикс:** в ветке `merged_keep_local` тоже вызвать серверный merge (remote→local) при
владении обоими доками, либо хотя бы перенести premium/VIP-блок.

### P1-1. ИИ-диалоги «Фри»: клиент даёт безлимит, сервер режет после 1 (рассинхрон)
**Файл:** `functions/src/premium_dialog.ts:593,610` ⇄ клиентский гейт
**Суть:** при переводе фичи в «Фри» через Пульт клиент открывает доступ, но серверная
квота для не-премиума = 1 диалог → после первого `resource-exhausted`. Рассинхрон
источников истины «бесплатно/платно».
**Фикс:** сервер должен учитывать remote-флаг `gate_ai_dialog_premium` (если фича Фри —
не применять free-кап) ИЛИ согласовать семантику.

### P1-2. `init` может понизить план 'lifetime' → 'monthly'
**Файл:** `app/revenuecat_init.ts:321-324`
**Суть:** `existingStorePlan` проверяет только monthly|yearly; для lifetime → null →
`inferPremiumPlanFromProductId(..., 'monthly')`; при пустом productId план перезапишется
на monthly. (`applyPushedCustomerInfo:222` — та же проблема, P2.)
**Фикс:** добавить 'lifetime' в проверку existingStorePlan + дефолт.

### P1-3. Referee-VIP (7 дней приглашённому) ничем не ограничен по количеству
**Файл:** `functions/src/referral.ts` markRefereeQualified
**Суть:** награда приглашённому не имеет кап-лимита (в отличие от referrer 3/30) →
потенциальный фарм бесплатного VIP через множественные приглашения себя.
**Статус:** требует доп-проверки квалификации (реальный урок1). Severity зависит от
того, насколько легко создать N аккаунтов. Помечено для ручной проверки.

### P1-4. Месячный счётчик `referral_vip_claims_monthly` растёт бесконечно
**Файл:** `functions/src/referral.ts:665-667` (нет prune, в отличие от daily стр.219-225)
**Суть:** не очищается — раздувает progress-документ со временем.
**Фикс:** добавить prune для monthly-счётчика по аналогии с daily.

---

## 🟠 P2 / ТРЕБУЮТ ПРОВЕРКИ (из воркфлоу, не все верифицированы лично)

- `daily-tasks-shard-farm` (daily_tasks_shards.ts:33): нет валидации выполнения заданий
  + принимает любой dayKey → фарм по 1 осколку за уникальную дату. P2 (мягкая валюта,
  идемпотентность по dayKey есть). **Фикс:** ограничить dayKey ≈ сегодня/вчера UTC +
  серверная проверка выполнения.
- `missing-user-silent-200` (revenuecat_shards.ts:221): событие на id без user-doc → 200,
  RC не повторит. Покрыто частично TRANSFER-логикой, но окно есть.
- `transfer-drops-lifetime` (revenuecat_shards.ts:439 readDonorPremiumBlock): проверить
  что lifetime (plan=lifetime, expiry=0) корректно проходит `isStorePlan` в донор-блоке.
- `legacy-adminvip-permanent-vip-leak` (revenuecat_shards.ts:246): legacyAdminVip с
  vip_until='0' → вечный VIP, крон (vip_until<=0) не снимает. By design? Проверить.
- `vip-keys-mirror-mismatch`: vip_expiry/vip_grant_at/vip_revoked_at в merge VIP_KEYS,
  но не в rules blocklist. Проверить, может ли клиент их форджить.
- `had-premium-ever-not-set-on-normal-purchase` (paywall_purchase.ts:190): ставится
  только в personal_plan-флоу. P2 (вебхук ставит had_premium_ever='1' на сервере).
- `restore-errors-swallowed-no-telemetry`, `cron-write-failure-silent`: наблюдаемость.
- `daily-cap-utc-boundary-doubling`, `rc-stale-grace-24h-refund-window`: граничные времена.
- `telegram-admin-reactivation-stacks-vip`, `telegram-recurring-renewal-not-flagged`,
  `telegram-admin-grant-no-canonical`: Telegram ручная выдача (известная зона).
- `resolve-premium-no-authuid-misses-siblings`: stats/weekly зовут resolvePremiumAccess
  без authUid → не находят оплату на доке-сиблинге. Проверить вызовы.

---

## Уже пофикшено в этой сессии (для контекста)
1. revenuecat_shards.ts: NON_RENEWING_PURCHASE + premiumPlanFromEvent→lifetime (commit a541c751)
2. auth_merge.ts + app/premium_progress.ts: isStorePremiumPlan += lifetime (commit 3398298a)
