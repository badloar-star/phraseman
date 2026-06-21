# Финальный пред-релизный аудит Phraseman — 2026-06-21

**Метод:** многоагентный аудит (32 агента) по 6 осям — overlay-ordering, flags, gifts-boons,
sequences, crash-runtime, payments-entitlement. Каждая находка адверсариально верифицирована
против реального исходника. Аудит по ТЕКУЩЕМУ рабочему дереву (незакоммиченные изменения = то,
что идёт в релиз). Ключевые находки (P1 + дефолты флагов) перепроверены вручную.

**Итог:** 0 блокеров P0. 1 реальный P1, 6 P2, 16 P3. Из 24 поднятых находок все 24 подтверждены.

**Вердикт: FIX-THEN-SHIP** — критических блокеров нет, но P1 обязателен до публикации,
а #6 и #20 (P2) настоятельно рекомендуются (риск порчи всего remote_config и краш всего
приложения в белый экран).

Tallies: overlay-ordering 5/5 · flags 5/5 · gifts-boons 5/5 · sequences 4/4 · crash-runtime 2/2 · payments-entitlement 3/3.

---

## P1 — исправить ДО релиза

### 1. IntroFullAccessModal и LoyaltyGiftModal рендерятся в обход OverlayArbiter (overlay-ordering + sequences — один дефект)
**Лично перепроверено.**
- `app/_layout.tsx:2372-2393` (IntroFullAccessModal), `2395-2405` (LoyaltyGiftModal).
- Типы: `IntroFullAccessModal.tsx:155-159`, `LoyaltyGiftModal.tsx:310-314` — обе `<Modal transparent statusBarTranslucent>`.
- **Импакт:** гейтятся «сырым» `appOverlaysEnabled && <state> !== null`, а НЕ через `useOverlayVisible`.
  Соседние `LeagueBonusAvailableModal` (`:2117`) и `DailyTasksFirstVisitModal` (`:2119`) — корректно
  через арбитр. Возвращающийся free-юзер (истёк intro / loyalty-подарок) на холодном старте может
  получить арбитражную модалку (update/broadcast/levelUp/dailyPlan) ОДНОВРЕМЕННО с intro/loyalty →
  две `statusBarTranslucent`-модалки разом = именно сценарий мерцания/зависания System UI / ANR,
  ради предотвращения которого арбитр и написан (`OverlayArbiter.tsx:5-9`).
- **Фикс:** добавить `introFullAccess` и `loyaltyGift` в `OverlayKey`/`OVERLAY_PRIORITY`/`EMPTY_OVERLAY_WANTS`
  и гейтить через `useOverlayVisible('introFullAccess', introFullAccessModal !== null)` /
  `useOverlayVisible('loyaltyGift', loyaltyGiftModal !== null)`.

---

## P2 — желательно ДО релиза (минимум #6 и #20)

### 6. saveWeeklyBoons может обнулить весь remote_config при сбое pre-read (flags)
- `admin/index.html:22686` (read с `catch(_){}`) → `:22695` (`setDoc(..., { merge: false })`).
- Братья `saveControlPanelBool`/`saveControlPanelPremium` уже починены; `saveWeeklyBoons` остался
  со старым паттерном. Если `getDoc` бросит → `prev={}` → `merge:false` ПЕРЕЗАПИШЕТ весь
  `remote_config/app` (все лимиты/гейты/тексты), мгновенно прилетит клиентам через `onSnapshot`.
- **Фикс:** убрать try/catch вокруг pre-read (как в `saveControlPanelMaintenance`).

### 20. Кэш лиги уходит в рендер club_screen без проверки массива → краш всего приложения (crash-runtime)
- `app/club_screen.tsx:601` (`setGroup(state.group)` без guard), `:608`, `:822` (`[...group].sort`);
  корень `app/league_engine.ts:509-518`, `app/league_open_cache_policy.ts:10-13`.
- Удалённый путь санитизирует `group` (`Array.isArray ? : []`), кэшевый — нет. Битый AsyncStorage →
  `TypeError: not iterable` → глобальный ErrorBoundary роняет ВСЁ приложение в белый экран.
- **Фикс:** коэрсить `group` к массиву в `loadLeagueState` + defensive `Array.isArray(...) ? : []` в club_screen.

### 2. Watchdog H-ARBITER пинг-понгит слот каждые 15с при застрявшем владельце (overlay-ordering)
- `components/OverlayArbiter.tsx:78-88`. Force-pass зовёт только `setActive`, wants владельца не чистятся →
  через 15с слот возвращается. Проявляется только в уже-сломанном состоянии (ownState завис true).
- **Фикс:** при force-pass подавлять владельца (`forciblyReleased`-set) + юнит-тест на 2 тика.

### 3. Переход level-up → подарок освобождает слот на 180-260мс (overlay-ordering)
- `app/_layout.tsx:629-665, 701, 718, 860-880`. Между `setShowLevelUp(false)` и `setShowGiftModal(true)`
  ownState=false → арбитр отдаёт слот любому ожидающему; сундук-награда мигает за чужой модалкой.
- **Фикс:** удерживать слот флагом `levelUpTransitioning` от `dismissLevelUp` до `onGiftClose`.

### 22. Mastery рекламируется как премиум, но премиум-проверка мёртвая — фича бесплатна (payments)
- `app/mastery.ts:107-110` (`void isPremium;`). Ни один call-site не зовёт `shouldGateFeature('mastery')`;
  переключатель `gate_mastery_premium` = no-op. Но mastery в перках пейволла (`paywall_copy.ts`).
- **Фикс:** либо реально гейтить вход в повтор, либо убрать из `FeatureGate`/перков пейволла.

---

## P3 — пострелизный хотфикс / техдолг

### overlay-ordering
- **4.** Мёртвые ключи `releaseWave`/`firstLessonSheet`/`boonEarlyPlashka` в `OVERLAY_PRIORITY` (нет хоста). Удалить или подключить. *(Лично подтверждено.)*
- **5.** Непреемптивная очередь может задержать `update`/`entitlementExpired` за тостами до ~15с. Опц.: критичные ключи сделать преемптивными.

### flags
- **7.** Admin-дефолты `referral_enabled`/`explain_enabled` рассинхронены (app=true, админка показывает false) → Save без касания выключит фичи; `referral` читается напрямую → отключится у всех. `def:true` в RC_BOOL_FIELDS/CP_FEATURE_TOGGLES. **Взять пораньше.**
- **8.** Комментарий `app/referral_flags.ts:6` врёт («Default off», на деле true).
- **9.** JSDoc `app/explain_phrase_flags.ts:31` врёт («Дефолт false», на деле true).
- **10.** Комментарий `app/ai_dialog_flags.ts:11` ссылается на несуществующую `DIALOG_FREE_LIFETIME_*` (реальный гейт = `freeDialogUsed` в `functions/src/premium_dialog.ts:230-247`).

### gifts-boons
- **11.** Release-wave updater-бонус отключён от прода (замаскирован `VERSION=0`); включение всё равно никому не заплатит. `app/release_wave_bonus.ts`.
- **12.** Boon-награды (Mystery Monday/Comeback/Perfect Week) без серверного claim и dedup → фарм переустановкой/часами (3-20 осколков). `app/boons/boon_rewards.ts:51-74`.
- **13.** Mystery Monday молча выдаёт награду при тапе по фону без reveal. `components/MysteryMondayHost.tsx:91-94`.
- **14.** Free streak-saver boon фармится часами устройства. `app/boons/boon_bootstrap.ts:50-59`.
- **15.** Метаданные процентов `variable_reward_system` неточны (косметика, поле не показывается). `app/variable_reward_system.ts:58-82`.

### sequences
- **17.** premium_modal гонит два `router.replace` для уже-премиум personal_plan юзера → мерцающий пейволл. `app/premium_modal.tsx:112-140`.
- **18.** Trainer/coach премиум-гейты после покупки роняют юзера на хаб, а не в разблокированную фичу. `problem_coach.tsx:93`, `trainer_*_session.tsx`.
- **19.** `canActivatePlan` игнорирует `grantedByBoon`, `useFeatureAccess` — учитывает (латентная мини-петля). `app/compass/compass_access.ts:34-44`.

### crash-runtime
- **21.** `weightedPick` возвращает undefined для пустого rarity-тира (`!` маскирует) → будущий краш ролла подарка. `app/level_gift_system.ts:749-768`.

### payments-entitlement
- **23.** Срок intro/loyalty в sync-ключах без серверной защиты → клиент может продлить себе бесплатный full-access. Принятый риск на запуск. `app/cloud_sync.ts:500-512`.
- **24.** Ветка EXPIRATION безусловно затирает `premium_plan` даже для lifetime, если RC пришлёт EXPIRATION. Latent. `functions/src/revenuecat_shards.ts:266-269`.

---

## Дополнительно (вне воркфлоу, лично найдено)

### Сборка (tsc) — рабочее дерево НЕ компилируется чисто в зоне подарков/бонусов
- `app/boons/boon_copy.ts` и `components/LoyaltyGiftModal.tsx` сейчас дают tsc-ошибки: параллельная
  сессия добавляет языки (`pt-BR`/`vi`/`id`/`tr`/`pl`) и поля `detail`, но не закончила — несколько
  boon-записей без `detail`, тип `Record<"ru"|"uk"|"es", ...>` не расширен под новые языки.
- **4 тест-сьюта падают** (`boon_copy`, `boon_copy_bible`, `league_bonus_gift_images`, `shards_shop_locale_runtime`) из-за этого tsc.
- Файлы правятся в ДРУГОЙ сессии → не трогать здесь, но **до релиза дерево должно компилироваться**:
  дождаться завершения той работы и прогнать `tsc` + jest заново.
- Общий tsc по дереву: 34 ошибки (≈ известный baseline 33 + плавающие из boon_copy).

---

## Приоритетный порядок исправлений перед релизом

1. **P1 #1** — провести IntroFullAccess/LoyaltyGift через арбитр (главный риск ANR на холодном старте Android).
2. **P2 #6** — убрать swallow в `saveWeeklyBoons` (один клик при сбое = обнуление всего prod-конфига).
3. **P2 #20** — санитизировать `group` в кэше лиги (битый кэш = белый экран всего приложения).
4. **Сборка** — дождаться доперевода boon_copy/LoyaltyGiftModal в параллельной сессии, добиться чистого tsc + зелёных тестов.
5. **P2 #22** — решить судьбу mastery (гейтить или убрать из перков пейволла).
6. **P2 #2, #3** — overlay watchdog ping-pong и удержание слота level-up→подарок.
7. **P3** — пакетный пострелизный хотфикс (начать с #7 — может тихо выключить рефералы).

---

## ✅ РЕЗОЛЮЦИЯ — всё исправлено (5 коммитов в master, НЕ запушено)

| Коммит | Что закрыто |
|---|---|
| `cab83a5c` overlay | **P1** Intro/Loyalty через арбитр (анти-ANR) · **#2** watchdog анти-пинг-понг (`decideWantsWrite` карантин) · **#3** удержание слота level-up→подарок (`levelUpTransitioning`) · **#4** удалены мёртвые ключи releaseWave/firstLessonSheet/boonEarlyPlashka |
| `433b6bc6` league | **#20** `sanitizeLeagueState` — group всегда массив у источника+кэша+defensive в club_screen (анти-белый-экран) |
| `7afd71ea` flags | **#6** saveWeeklyBoons не глотает pre-read перед merge:false (анти-обнуление remote_config) · **#7** referral/explain def true в admin · **#8/#9/#10** правки врущих комментариев · бонус: починен мок-дрейф feature_gates теста |
| `dd1c4d1a` boons | **#12** claim-маркеры в cloud_sync (анти-фарм переустановкой) · **#13** Mystery Monday reveal на месте · **#14** streak-saver day-guard · **#21** weightedPick фолбэк · **#11/#15** документированы |
| `c29e1169` payments | **#17** анти-мерцание пейвола personal_plan · **#24** lifetime от ложного EXPIRATION (`shouldDeactivateOnInactiveEvent`) · **#19** decidePlanAccess паритет с useFeatureAccess · **#22** mastery остаётся бесплатным (решение пользователя), задокументирован недостижимый пейвол · build: LoyaltyGiftModal pt-BR (tsc 34→33) |

**Проверка:** 335 тестов зелёных (35 сьютов), client tsc 33 (baseline, мои 0), functions tsc 0.

**Вынесено отдельно (риск/масштаб):**
- **#18** trainer/coach post-purchase navigation — 5 файлов, трогает purchase-success path; перед релизом рискованно (P3). Заведена фоновая задача.
- **#23** серверная защита срока intro/loyalty — accepted launch risk (только промо-доступ, не платный тариф).
- **CRLF** в `club_screen.tsx`/`shards_shop.tsx` (не мой код, накопленное из других сессий) ломает 2 content-regex теста (`league_bonus_gift_images`, `shards_shop_locale_runtime`) — на HEAD LF=проходят. Заведена фоновая задача нормализовать EOL.

**Перед релизом осталось:** `firebase deploy --only functions` (revenuecat_shards) + билд приложения. Rules не трогались.
