# План: исправление расслоения ID при мульти-девайс входе + жёсткая уникальность имён

Дата: 2026-06-09
Автор: аудит + план (Claude)
Статус: ОЖИДАЕТ УТВЕРЖДЕНИЯ. Код не трогается до approval.

---

## 0. Контекст и решения пользователя

Реальный кейс (скрин): пользовательница Civi (`mytrainingbox1@gmail.com`) имеет ДВА аккаунта — Lvl7 (планшет) и Lvl4 (телефон), с разным прогрессом, хотя это «один человек, один Google». При входе на телефоне «пришлось начинать сначала», потом аккаунт «подключился сам», но прогресс разный.

Утверждённые решения:
- **Политика слияния:** объединять ЛУЧШЕЕ по каждому полю (max XP/streak/уроки/шарды, объединение premium/VIP, непустые имена). Никто ничего не теряет.
- **Где чинить:** на сервере — Cloud Function с Admin SDK (обходит Firestore rules — именно правила сейчас и есть корень бага).
- **Объём:** сначала этот разбор+план, затем код по утверждению.
- **Эта пользовательница:** только системный фикс; её аккаунт подтянется штатно при следующем входе. Ручную правку прод-данных НЕ делаем. (VIP ей выдаётся через admin-панель отдельно.)

---

## 1. Корневые причины (подтверждены чтением кода)

### Проблема 1 — расслоение ID

Архитектура (хорошая): primary key пользователя = `stable_id` (UUID, `app/stable_id.ts`), хранится в Keychain/SecureStore. Firebase Auth `uid` — только токен для правил, пишется в `users/{stableId}.firebaseAuthUid`. Кросс-девайс восстановление идёт через `auth_links/{providerUid} → stable_id`.

Слияние двух профилей делается на КЛИЕНТЕ в транзакции внутри `signInWithProvider` (`app/auth_provider.ts:787-970`). Оно читает чужой док:
```
const remoteUserSnap = await tx.get(usersRef.doc(remoteStableId)); // auth_provider.ts:847
```
Но правило (`firestore.rules:102`):
```
match /users/{userId} { allow read, delete: if userDocOwnerMatchesAuth(userId); ... }
```
`userDocOwnerMatchesAuth` (`firestore.rules:27-29`) требует `users/{userId}.firebaseAuthUid == request.auth.uid`. У ДРУГОГО устройства `firebaseAuthUid` другой → **read DENIED → транзакция бросает → ловится в catch (`auth_provider.ts:971`) → возвращается `{result:'error'}` → слияние НЕ происходит → два аккаунта остаются.**

Дополнительные триггеры расслоения:
- Если на планшете юзер вошёл (есть `auth_links`) → телефон читает link OK, но `tx.get(users/{tabletStableId})` падает по правам → ошибка → split.
- Если на планшете юзер НЕ входил (только «Позже» в онбординге, `components/onboarding.tsx:2878`) → `auth_links` нет вообще → ветка `created_new` → split by design.
- `signInWithCredential` (`auth_provider.ts:729`) на анонимной сессии НЕ линкует анонимный аккаунт (нигде нет `linkWithCredential`), а заводит отдельный Google-uid — поэтому восстановление целиком зависит от `auth_links`-lookup, который ломается по правам.

**Что уже есть и почти решает:** `functions/src/auth_identity.ts` содержит `resolveStableUidForAuth` + `cleanupLegacyAuthIdentityDuplicates` (Admin SDK, обходит правила, умеет прятать дубли и мерджить leaderboard/league). НО клиентский логин дергает только `authEnsureStableLink` для ЛОКАЛЬНОГО stableId — он НЕ передаёт второй (remote) stableId и НЕ запускает слияние прогресса (`users.progress`, shards). То есть инфраструктура есть, но логин-флоу её не использует для merge.

### Проблема 2 — уникальность имён фейковая

Три независимых пробоя (все подтверждены):

1. **Основной путь онбординга вообще не проверяет.** `components/onboarding.tsx:958`:
   ```ts
   const result = 'ok' as Awaited<ReturnType<typeof reserveName>>; // ХАРДКОД
   ```
   Ветки `if (result === 'taken')` / `'error'` мертвы. Реальный вызов — fire-and-forget: `void reserveName(trimmed, '').catch(() => {})` (`onboarding.tsx:986`). Имя ставится всегда.

2. **Settings применяет имя ДО ответа сервера.** `app/(tabs)/settings.tsx` `saveName`: пишет local + закрывает модалку, `reserveName` бежит в detached `void (async()=>{})()`; откат «best-effort», ошибка/сеть → имя остаётся. Это зафиксировано контракт-тестом `tests/settings_name_save_contract.test.ts` (его придётся переписать).

3. **Серверная транзакция не атомарна по контенду.** `functions/src/leaderboard.ts` `nameReserve`:
   - Пред-проверка `where('nameLower'==).limit(8)` (строки 130-133) — ВНЕ транзакции (TOCTOU-гонка).
   - Внутри транзакции (строка 141) существующая бронь `name_index/{nameLower}` блокирует ТОЛЬКО если `txNameOwnerIsActive` (читает leaderboard/users владельца — ДРУГИЕ доки). Новый юзер без видимого leaderboard читается «неактивным» → его имя молча перезаписывается (строка 145). Двое на свежем имени оба проходят.
   - Имя ещё уходит в `league_groups` напрямую без проверки `name_index` (`app/firestore_leagues.ts`).

`isNameAvailable` (`app/firestore_leaderboard.ts:114`) — мёртвый код, ноль вызовов. Все ошибки брони глотаются (fail-open).

---

## 2. Целевая архитектура решения

### 2.1 Слияние на сервере (Проблема 1)

Новая Cloud Function `authMergeStableAccounts` в `functions/src/auth_identity.ts`:
- Вход: `{ stableIdA, stableIdB }` (локальный и remote, который клиент достал из `auth_links`).
- Проверка владения: вызывающий auth-uid должен владеть ОБОИМИ (через `assertStableOwner` с `allowProviderRelink`, т.к. провайдер только что залогинился) ИЛИ хотя бы одним + второй привязан к тому же провайдеру через `auth_links`. Admin SDK читает любые доки, права не мешают.
- **Слияние «лучшее по полю»** в `users.progress` (helper `mergeUserProgress`):
  - Числовые накопительные (`user_total_xp`, streak, счётчики уроков, energy и т.п.) → `max`.
  - `shards` (отдельное поле `users.shards`) → `max` (или сумма? — см. вопрос ниже, по умолчанию `max`, безопаснее).
  - Premium/VIP → ОБЪЕДИНЕНИЕ: если у любого активен premium/VIP — он переносится на canonical (берём более «сильный»/дальний `*_until`, `had_premium_ever=true` если был у любого). Это closes риск «после слияния пропал premium».
  - Непустые строки (`user_name`, выбранные курсы, аватар) — берём непустое, приоритет у «победителя по XP».
  - Прочие map-поля прогресса — мердж по ключам, числа max, строки непустые.
- Выбор canonical stableId = тот, у кого больше `user_total_xp` (как сейчас), НО данные проигравшего вливаются, не теряются.
- Прячем проигравший док: `identityHidden=true`, `canonicalStableId=<canonical>` (повторно используем существующий механизм из `cleanupLegacyAuthIdentityDuplicates`).
- Переносим leaderboard/league/name_index через существующий `cleanupLegacyAuthIdentityDuplicates`/`cleanupSiblingStableIdentityDuplicates`.
- Возврат: `{ ok, canonicalStableId }`.
- **Идемпотентность:** если уже слиты (один скрыт и указывает на другой) — просто вернуть canonical. Безопасно при повторных входах.

Регистрация: `exports.authMergeStableAccounts` в `functions/src/index.ts` + **добавить в whitelist `deploy:safe`** в `functions/package.json` (иначе не задеплоится — известная грабля, ср. `onArenaSessionAborted`).

### 2.2 Клиент: маршрутизировать merge через сервер (Проблема 1)

В `app/auth_provider.ts`, ветка «разные stable_id» (сейчас `auth_provider.ts:845-938`):
- Вместо клиентской транзакции, которая падает по правам, — вызвать `authMergeStableAccounts({ stableIdA: localStableId, stableIdB: remoteStableId })`.
- По ответу `canonicalStableId`:
  - Если canonical !== local → выполнить существующий post-swap путь (`auth_provider.ts:980-1023`): `syncToCloud(forceNow)` → `copyLocalRealPremiumToStableId` → `setStableId(canonical)` → `wipeLocalAccountData` → `ensureAnonUser` → `syncRevenueCatAfterAuthLink` → `restoreFromCloud` → `loadShardsFromCloud`. Этот порядок КРИТИЧЕН для сохранения premium/trial (RevenueCat `appUserID` должен стать новым stableId ДО чтения entitlement).
  - Если canonical === local → просто `restoreFromCloud` (данные второго влиты на сервере).
- Сохранить существующую обработку orphan/несуществующего remote (ветка `auth_provider.ts:857-881`) — она про удалённые аккаунты, остаётся.
- Локальная транзакция остаётся ТОЛЬКО для случаев, где чужой док не читается, но фактически теперь весь cross-stable merge уходит на сервер. Ветки `linked_existing`/`created_new` (где доки локальные/свои) можно оставить клиентскими — там прав хватает.

Fallback: если серверный вызов упал (сеть) — не плодить новый аккаунт; показать «не удалось войти, попробуйте позже» и НЕ переключать stableId (лучше остаться как есть, чем создать третий профиль).

### 2.3 Жёсткая уникальность имён (Проблема 2)

**Сервер — переписать `nameReserve` на честную атомарность (`functions/src/leaderboard.ts`):**
- Убрать пред-проверку `where(...).limit(8)` вне транзакции.
- Источник истины — ТОЛЬКО `name_index/{nameLower}`. Внутри транзакции:
  - `tx.get(nameRef)`. Если существует и `uid !== stableUid` → **`already-exists` БЕЗУСЛОВНО** (без `txNameOwnerIsActive`-лазейки). Так Firestore сериализует конкурентов на одном документе.
  - Отдельно — путь самолечения «осиротевшей» брони: если владелец брони реально удалён/скрыт (`users/{owner}` отсутствует ИЛИ `identityHidden==true`), бронь можно перехватить — но это решается ПЕРЕД основной транзакцией отдельным шагом «reclaim orphan», который тоже транзакционен и проверяет именно `name_index`-док + статус владельца, и только если владелец доказанно мёртв. Не смешивать с горячим путём.
  - `oldName` cleanup — оставить.
  - Запись в `leaderboard` — оставить, но только в успешной ветке.
- `nameCheckAvailability` — привести к той же логике (бронь существует и владелец жив → недоступно).

**Клиент — реально блокировать (Проблема 2):**
- `components/onboarding.tsx:931 handleNameDone`: убрать хардкод `'ok'`, по-настоящему `await reserveName(trimmed, '')`, и при `'taken'`/`'error'` НЕ пускать дальше (ветки уже написаны, просто оживить). `setNameBusy` на время запроса (UX — спиннер).
- `app/(tabs)/settings.tsx saveName`: сделать `await reserveName(...)` ДО применения имени; применять и закрывать модалку только при `'ok'`; при `'taken'` показать ошибку и оставить старое имя. Переписать контракт-тест `tests/settings_name_save_contract.test.ts` под новый (правильный) порядок.
- `app/firestore_leagues.ts`: перед публикацией имени в `league_groups` — убедиться, что имя уже забронировано за этим stableId (или публиковать имя из leaderboard-дока, который пишет только `nameReserve`). Чтобы league не был дырой в обход брони.
- Решить судьбу авто-имён (`generateAutoName`, `handleSkipName`): они тоже должны бронироваться (сейчас коллизия маловероятна из-за суффикса, но для консистентности — бронить).

**Правила (`firestore.rules`):** оставить `name_index` create/update/delete только Admin SDK (уже так, строки 432-435). Дополнительно — закрыть прямую запись `progress.user_name` клиентом? (Сейчас клиент свободно пишет `user_name` в свой `users`-док, `cloud_sync.ts:296`, и это обходит бронь как «отображаемое имя».) Вариант: не блокировать (имя в users — лишь кэш), но НЕ показывать его публично без брони. Публичные поверхности (leaderboard/league/public_profiles) и так пишутся только сервером/по `canonicalUserMatchesAuth`. Зафиксировать инвариант тестом.

---

## 3. Фазы работ (по утверждению)

**Фаза A — Сервер: слияние аккаунтов.**
- A1. `mergeUserProgress` helper + `authMergeStableAccounts` callable в `auth_identity.ts`.
- A2. Юнит-тесты `functions/src/auth_identity.test.ts`: best-of-merge XP/streak/shards; premium у проигравшего переносится; VIP у проигравшего переносится; идемпотентность; ownership-проверки (чужой не сольёт).
- A3. Регистрация в `index.ts` + whitelist `deploy:safe`.

**Фаза B — Сервер: честная уникальность имён.**
- B1. Переписать `nameReserve`/`nameCheckAvailability` (атомарность на `name_index`, безусловный блок, отдельный reclaim-orphan).
- B2. Тесты: гонка двух броней одного имени → один ok, второй taken; case/space (`Bob`==`bob`==`"Bob "`); reclaim только для реально мёртвого владельца; занятое активным — всегда taken.

**Фаза C — Клиент: маршрутизация merge + блокировка имён.**
- C1. `auth_provider.ts` cross-stable ветка → `authMergeStableAccounts`; сохранить post-swap порядок premium/RevenueCat; безопасный fallback.
- C2. `onboarding.tsx handleNameDone` — реальная проверка; `handleSkipName` — бронь авто-имени.
- C3. `settings.tsx saveName` — await до применения; переписать `settings_name_save_contract.test.ts`.
- C4. `firestore_leagues.ts` — имя в league только после брони.
- C5. Тест `auth_provider_stable_link.test.ts` — обновить под новый флоу (merge через CF, не падает по правам).

**Фаза D — Верификация.**
- D1. `npm test` (клиент) и `cd functions && npm test` — зелёные новые/изменённые тесты; зафиксировать, что НЕ ввёл новых регрессий сверх известного красного baseline (memory: ~124 suite уже красные по content-грепам — это НЕ моя зона).
- D2. `cd functions && npm run build` (tsc) — зелёно.
- D3. (Опц.) эмулятор Firestore — прогон merge-сценария end-to-end, если запросишь.

**Фаза E — Прод (по отдельному approval, НЕ в этой сессии без явного «деплой»).**
- E1. Деплой rules + functions.
- E2. Мониторинг `auth_signin_*` логов и `identity_cleanup_candidates`.
- E3. (Опц., если попросишь) точечное слияние конкретной пользовательницы Civi через admin-инструмент после выката.

---

## 4. Зона «НЕ СЛОМАТЬ» (регресс-чек обязательно)

1. **Trial → premium через релогин/merge.** RevenueCat `appUserID` обязан стать новым canonical stableId ДО чтения entitlement (`syncRevenueCatAfterAuthLink` перед `restoreFromCloud`). Иначе оплативший триал прочитается как free.
2. **VIP переживает merge.** `copyLocalRealPremiumToStableId` копирует только paid-ключи; VIP теперь явно переносится серверным `mergeUserProgress` (новое — закрывает текущую дыру).
3. **`firebaseAuthUid` на canonical-доке = `request.auth.uid`** после merge (иначе PERMISSION_DENIED на всё). Серверный merge выставляет это через `linkStableAuthUid`.
4. **Два premium-блэклиста идентичны** (`firestore.rules:40-67` ↔ `cloud_sync.ts` `PREMIUM_PROGRESS_KEYS`). Если добавляю/переименовываю premium-поле — синхронно в обоих. (В этом плане новых premium-полей НЕ ввожу.)
5. **Telegram Stars → VIP по нику** (`admin/testers.html findUserByNickname` = `where('progress.user_name'==nick)`). Нормализация имён в `nameReserve` уже NFKC+lowercase; убедиться, что существующие оплаченные заказы по нику резолвятся после изменений (нормализацию имён в users НЕ меняю агрессивно; бронь — отдельный индекс).
6. **24h stale-grace** (`premium_guard.ts`) может маскировать кривой swap на сутки — тестировать merge на свежей установке/`invalidatePremiumCache`, не доверять «сразу показывает premium».

---

## 5. Открытые вопросы к тебе (не блокируют старт Фазы A, но повлияют на детали)

1. **Shards при слиянии — `max` или сумма?** План по умолчанию: `max` (безопаснее против дюпа валюты). Если хочешь «не наказывать» — можно сумму, но тогда нужен анти-абуз (один и тот же человек не должен фармить шарды двумя девайсами и складывать). Рекомендую `max`.
2. **Авто-имена бронировать?** Рекомендую да (консистентность), хоть коллизия и редка.
3. **Прямую запись `progress.user_name` клиентом — оставляем как «кэш отображения» (рекоменд.) или тоже гейтим правилом?** Рекомендую оставить (публичные поверхности и так защищены), но закрепить инвариант тестом.

---

## 6. Что НЕ делаю в этой задаче

- Не трогаю генерацию контента/планов, уроки, UI-анимации.
- Не делаю ручных правок прод-данных (по твоему решению).
- Не ввожу `linkWithCredential` (большая смена auth-модели; текущая `stable_id`+`auth_links` архитектура сохраняется, лечится её серверное слияние).
- Не деплою без отдельного явного «деплой».
