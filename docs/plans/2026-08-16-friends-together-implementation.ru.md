# «Вместе» — спецификация реализации (вкладка Друзья)

Дата: 2026-08-16. Статус: **УТВЕРЖДЕНО владельцем к реализации** («начинай реализацию фулл с тестами и аудитами»).
Макет-эталон: `docs/prototypes/2026-08-16-vmeste-friends-concept.html` (экраны крупно, без подписей; движение по `constants/motionHybrid.ts`).
Ветка: `feature/referral-roulette`. Главную НЕ трогаем. Никаких новых валют/сущностей: только XP, звёзды, цепь, сундук, пуш.

## 0. Решения владельца (зафиксированы)
| Вопрос | Решение |
|---|---|
| Новые валюты/ресурсы («огоньки», «планки») | **Нет.** Только существующее. |
| Главная | **Не меняется.** Всё во вкладке Друзья. |
| Награды в Plus | **Нет.** Только звёзды, XP-бусты, щит цепи, косметика из каталога сундука. |
| Сундук недели: фарм друзей | Считаются только друзья уровня «Приятели»+, топ-10 по вкладу, кап 2 000 XP/друг; открытие при своих ≥5 днях и ≥1 000 XP за неделю; награда × свои дни (5→×1, 6→×1.25, 7→×1.5). |
| Пороги сундука | I 6 000 · II 12 000 · III 20 000 |
| Награды сундука | I: ×2 XP 60 мин + 10★ · II: + щит цепи + 25★ · III: + 100★ + аура из каталога сундука лиги |
| Жители лиг | В друзья не попадают — отдельной защиты не нужно. |
| Экраны | Крупно, минимум объектов и цифр, никаких подписей-пояснений. |
| Анимация | Строго по словарю гибрида (`LUM`/`CHK`/`PRESS`/`TOAST`, `use_reward_impact_hybrid.ts`). |

## 1. Механика (кратко)
1. **Дружба растёт.** «День вместе» = календарный день (локальная дата каждого), в который урок прошли оба. Дни копятся и не сгорают. Уровни: 1 Знакомые (0) · 2 Приятели (3) · 3 Друзья (10) · 4 Близкие (30) · 5 Лучшие (100). Перки: с уровня 2 — бонус к опыту **обоим** в общий день: 2 → +5 %, 4 → +10 %, 5 → +15 % (не суммируется между друзьями — берётся максимум; в `xp_manager` — отдельный множитель ×1.05/1.10/1.15). Уровень 3 — подарки этому другу дешевле на 25 %. Веха уровня даёт звёзды обоим (клейм сервером): L2 +5★, L3 +10★, L4 +20★, L5 +50★. Косметика (рамка на L4, аура на L5) — **фаза 3** (нужен арт).
2. **Сундук недели.** Прогресс = Σ по топ-10 друзьям уровня ≥2 min(weeklyXp, 2000). Пороги 6/12/20k. Клейм в воскресенье (ISO-неделя лиг), условие: мои активные дни за неделю ≥5 и мой weeklyXp ≥1000. Множитель награды по своим дням.
3. **Позвать.** Друг сегодня без урока → 1 тап → пуш от имени зовущего. 1 раз в день на друга, ≤5 в день от отправителя, ≤3 в день получателю, тихие часы 22:00–09:00 по локальному времени получателя, отключаемо категорией «Друзья».
4. **Пригласить.** Реферал (существующий): при квалификации приглашённого пара стартует с 3 «днями вместе» (сервер пишет `bonusDays: 3` в пару). Первую неделю weeklyXp приглашённого считается в сундук пригласившего ×2 (флаг в паре `boostUntilWeekKey`).

## 2. Данные
### 2.1 Клиентские поля в `users/{uid}.progress` (через `cloud_sync` SYNC_KEYS)
- `active_days_v1` — JSON `{ "anchor": "YYYY-MM-DD", "bits": "1101…" }`, `bits.length ≤ 120`, индекс 0 = день `anchor` (локальная дата устройства), индекс i = anchor − i дней. Пишется в `updateStreakOnActivity` (`app/hall_of_fame_utils.ts`) рядом с `last_active_date`. Мерж между устройствами — побитовое OR по датам.
- `friends_push_v1` — JSON `{ "enabled": true, "tz": <минуты смещения от UTC, как getTimezoneOffset()*-1> }`. Пишется при смене тумблера «Друзья» и раз в сутки при старте (только если изменилось).

### 2.2 Серверные коллекции (только сервер пишет)
- `friend_pairs/{pairId}` (pairId = `[a,b].sort().join('__')`): `{ uids:[a,b], claimedLevel:{[uid]:number}, bonusDays:number, boostUntilWeekKey?:string, updatedAt }`. Читать могут оба участника.
- `users/{uid}/friends_chest_claims/{weekKey}`: `{ tier, progress, myDays, multiplier, rewards, claimedAt }`.
- `users/{uid}/friend_nudges/{dayKey}`: `{ sent:{[friendUid]:ts}, sentCount, receivedCount }` — обе стороны в одном доке владельца.
- Уведомление `type:'friend_nudge'` в `users/{uid}/notifications` (существующий `buildUserNotification`).

### 2.3 Правила Firestore
`friend_pairs/{pairId}`: read — если `request.auth.uid` в `resource.data.uids` (или его stableUid); write — только admin/функции. `friends_chest_claims`, `friend_nudges` — read владельцу, write false.

## 3. Сервер (`functions/src/friends_together.ts` + `friends_together.test.ts`)
Общее: `onCall(CALLABLE_BASE)` как в `friend_gifts.ts`; идемпотентность по `requestId` (receipt-паттерн из `arena_expansion.ts`); stableUid через существующий резолвер; звёзды — через `stars_ledger.ts` (`prepareStarOperations`/`commitStarOperations`); XP-буст и щит цепи — как в `league_chest.ts` (`buildRewardProgressPatch`/xp_boost/streak_shield); аура — дроп `avatar_aura` из каталога `league_chest`.

1. **`friendsGetProfiles`** (`friends_profiles.ts`) — расширить `FriendPublicProfile`: `lastActiveDate: string|null`, `activeDays: {anchor,bits}|null`, `weeklyXp: number` (из `progress.week_points_v2`/`weekly_xp` при совпадении недели, иначе 0), `friendsPush: {enabled,tz}|null`. Источник — `users/{uid}.progress` (1 доп. чтение на uid; серверный кэш 60 с сохраняется). Клиентский `friends_profiles_batch.ts` — пробросить поля.
2. **`friendsTogetherClaimLevel({friendUid, level, requestId})`** — проверяет дружбу в обе стороны, читает `active_days_v1` обоих + `bonusDays` пары, считает дни вместе (пересечение дат, окно 120 дней + bonusDays), проверяет `daysTogether ≥ threshold(level)` и `claimedLevel[me] < level`; транзакция: `claimedLevel[me]=level`, начисляет звёзды **вызывающему** (второй участник клеймит сам — так у каждого своё окно-празднование), уведомление `friend_level` другу не шлём (шум). Ошибки: `failed-precondition: not_friends | not_reached`, `already-exists: claimed`.
3. **`friendsClaimWeeklyChest({weekKey, requestId})`** — только для прошедшей/текущей завершённой недели (воскресенье по UTC-неделе лиг или weekKey < текущего); читает список друзей (`users/{me}/friends`), их `progress` (кап 100), пары (для уровня ≥2 и boostUntilWeekKey), мои `active_days_v1`/weeklyXp; считает прогресс по правилам §1.2; проверяет условия; пишет `friends_chest_claims/{weekKey}` и применяет награды (звёзды × multiplier округлить вниз; xp_boost 60 мин; streak_shield +1 на II+; аура на III). Ошибки: `failed-precondition: week_open | own_days | own_xp | tier_zero`, `already-exists`.
4. **`friendsNudge({friendUid, requestId})`** — дружба в обе стороны; получатель `friends_push_v1.enabled !== false`; тихие часы по `tz` получателя (22–09 локально; нет tz → считать по UTC+3); лимиты из §1.3 через `friend_nudges/{dayKey}` обоих; уведомление `friend_nudge` + `sendExpoPush(expoPushToken, "<Имя>", "зовёт: 5 минут — и цепь цела", {nav:'friends'})`. Ошибки: `failed-precondition: not_friends | disabled | quiet_hours`, `resource-exhausted: daily_limit | sender_limit | receiver_limit`.
5. **Реферал** (`referral.ts`, точка квалификации): `friend_pairs/{pairId}.bonusDays = 3`, `boostUntilWeekKey = weekKey(now)+1`. Идемпотентно.
6. Экспорт в `functions/src/index.ts`; ручки в `remote_config/app.numbers` читаются сервером с дефолтами: `friends_level_thresholds`, `friends_chest_tiers`, `friends_chest_cap_per_friend`, `friends_chest_top_n`, `friends_chest_min_days`, `friends_nudge_*`.

Тесты (jest, `functions/src/friends_together.test.ts`, чистые функции вынести в `friends_together_core.ts`): дни вместе (пересечение, окно, bonusDays, разные anchor), уровни/пороги, прогресс сундука (кап, топ-10, только ≥2, boost ×2), условия клейма, множитель по дням, тихие часы по tz, лимиты nudge, идемпотентность.

## 4. Клиент — ядро (`app/friends_together/`, тесты в `tests/friends_together_*.test.ts`)
- `together_days.ts` — `encodeActiveDays/decodeActiveDays`, `markActiveDay(state, dayKey)`, `mergeActiveDays(a,b)` (OR по датам), `daysTogether(a, b, bonusDays)`, `hasCommonDay(a,b,dayKey)`, `levelForDays`, `nextThreshold`, `bonusPercentForLevel`. Без побочных эффектов.
- `together_config.ts` — дефолты + чтение `remote_config/app.numbers` (паттерн `referral_roulette_flag.ts`), флаг `friends_together_enabled` (дефолт false до релиза).
- `together_store.ts` — снапшот пар `{friendUid → {days, level, todayCommon, claimedLevel}}` в AsyncStorage (первый кадр из снапшота), пересчёт из батча профилей; выставляет `friends_together_bonus_v1 = {dayKey, percent}` для `xp_manager`.
- `weekly_chest_model.ts` — чистый билдер (по образцу `league_club_hub_model.ts`): progress/tier/percent/canClaim/state/multiplier/topContributors.
- `nudge_client.ts` — вызов `friendsNudge` с requestId; **optimistic**: локальная отметка `nudged_today[friendUid]` до ответа, откат + тост при ошибке (коды → тексты), защита от двойного тапа; офлайн-очередь по образцу `friend_gift_outbox.ts` не нужна (действие не денежное) — только ретрай 1 раз.
- `claims_client.ts` — `claimLevel`, `claimWeeklyChest` с requestId; после успеха — обновить локальные звёзды через существующий путь синка звёзд.
- Хуки в существующее: `hall_of_fame_utils.updateStreakOnActivity` → `markActiveDay`; `cloud_sync` SYNC_KEYS += `active_days_v1`, `friends_push_v1` (+ мерж OR для `active_days_v1` при restore); `xp_manager` → множитель `friendsTogether` (×(1+percent/100), читается из AsyncStorage, кэш как у остальных); `notifications.ts` → категория `friends` (дефолт true) + запись `friends_push_v1` при смене; `friends_profiles_batch.ts` → новые поля.

## 5. UI (вкладка Друзья, `app/(tabs)/friends.tsx` + новые компоненты в `components/friends_together/`)
Строго по макету: крупно, без подписей.
- `FriendsChestCard` — сундук (существующая иконка/арт сундука лиги, если есть) + полоса с тремя порогами + одно слово-статус + кнопка «Открыть», когда `canClaim`.
- `FriendRow` — добавить полоску дружбы и пилюлю уровня; колокольчик «Позвать» (пресс-стандарт, гаснет мгновенно) либо «сегодня». Убрать из строки лишние цифры не требуется (существующие остаются) — но НЕ добавлять новых.
- `FriendTogetherSheet` — карточка друга: имя, уровень, связка аватаров, «N дней вместе», полоса до следующего уровня с его именем, три кнопки (Позвать/Сегодня · Подарок · Дуэль).
- `FriendLevelUpModal`, `FriendsChestModal` — на `use_reward_impact_hybrid` (герой падает и бьёт, кольца/пыль, лестница, CTA последней). Никакого конфетти.
- Пустое состояние + кнопка «Пригласить друга» (существующий реферальный шит).
- Настройки уведомлений: категория «Друзья».
- Тосты — `ActionToast` (тон success/reward), тексты короткие: «Позвал Марину», «Марина прошла урок · день вместе +1».
- Всё за флагом `friends_together_enabled`.

Optimistic UI обязателен: колокольчик, клейм уровня (модалка сразу, звёзды в кошельке — после ответа сервера, без «прыжка»), сундук (кнопка гаснет сразу).

## 6. Стоимость Firebase
Чтения на сессию: батч профилей (+1 чтение users на друга, кэш 60 с сервер / 5 мин клиент, обновление только при открытии вкладки и по pull-to-refresh) + `friend_pairs` для моих друзей (1 запрос `where uids array-contains me`, кэш 6 ч, обновление при клейме). Записи: клеймы (≤1/уровень, 1/нед) и зов (2 дока + уведомление). Ни одного листенера, ни одного нового крона.

## 7. Фазы и приёмка
- **Фаза A (сервер + ядро клиента):** callables + тесты; `active_days_v1` пишется и синкается; батч отдаёт поля; множитель XP; категория «Друзья». Приёмка: `tsc` точечно по затронутым файлам чист; jest точечно зелёный; сторожа (`layout_stability`, `perf_freeze`, `runtime_lifecycle_ratchet`) не тронуты.
- **Фаза B (UI):** вкладка + шит + модалки + настройки за флагом. Приёмка: контракты design-guard (без обводок, без подписей), reduce-motion ветки, оптимистичный отклик.
- **Фаза C (позже):** косметика уровней 4/5 (арт), лента «вы вместе N дней».
- Деплой функций до релиза клиента; флаг включается из админки.

## 8. Privacy Policy
Друзья видят факт «занимался сегодня» и число общих дней. Лента уже показывает завершения уроков друзьям (покрыто разделом про друзей/социальные функции — проверить текст `privacy.html`/`legal/`); при необходимости добавить строку: «Друзьям, которых вы добавили, видна ваша дневная активность в приложении (факт занятия в день) и число общих дней; вы можете удалить друга в любой момент». Пуш «Позвать» отправляется по вашему тапу от вашего имени; получатель может отключить категорию «Друзья».
