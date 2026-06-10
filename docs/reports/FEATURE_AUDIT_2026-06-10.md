# Аудит фич Phraseman — что не работает (2026-06-10)

> **СТАТУС ФИКСОВ (та же сессия, позже в тот же день):**
> ✅ П.1 арена-комнаты: 6 CF экспортированы и задеплоены (все 9 arenaRoom* live, проверено functions:list)
> ✅ П.2 statsInsightsGenerate: задеплоен + в whitelist
> ✅ П.3 arena_rank_progression.ts: закоммичен (+тест)
> ✅ П.4 whitelist deploy:safe: дополнен 12 функциями
> ✅ Рефералка: создан remote_config/app с bools.referral_enabled=true (дока не существовало вовсе); invite-страница уже была live (200)
> ✅ ИИ-диалог + «Объясни проще»: флаги включены в eas.json production (вступят в силу со следующей store-сборкой)
> ✅ Админка: дубли ar-* ID развязаны (Rooms → arr-*), admin hosting задеплоен
> ⚪ Не включал сознательно: SCREEN_TRANSITIONS (выключены из-за крашей Android/Fabric), испанская локаль UI (недоделана), PostHog (нет ключа), dev-флаги
> ⚪ «Load more» в Referrals: ложная тревога — победившая копия управляет кнопкой сама, фикс не нужен
> ⚪ Тест re_engage_push и моки premium_guard — не трогал (низкий приоритет, дрейф тестов)

Полный статический аудит: клиент ↔ Cloud Functions ↔ реальный прод-деплой (78 функций по `firebase functions:list`),
навигация, фиче-флаги, админка, контент, tsc, все тесты (app 557 сьютов + functions 26 сьютов).

## 🔴 КРИТИЧНО — сломано прямо сейчас

### 1. Живые комнаты Арены («играть с другом по коду») — мертвы в проде
6 из 9 Cloud Functions написаны в `functions/src/arena_rooms.ts`, но **не подключены в `functions/src/index.ts`**
→ не задеплоены ни одним способом. Клиент их зовёт и получает `functions/not-found`:

| Функция | Вызов с клиента | Определена (не экспортирована) |
|---|---|---|
| `arenaRoomJoin` | `app/services/arena_rooms_live.ts:306` | `arena_rooms.ts:252` |
| `arenaRoomLeave` | `arena_rooms_live.ts:313` | `arena_rooms.ts:295` |
| `arenaRoomSetReady` | `arena_rooms_live.ts:320` | `arena_rooms.ts:308` |
| `arenaRoomKick` | `arena_rooms_live.ts:327` | `arena_rooms.ts:327` |
| `arenaRoomClose` | `arena_rooms_live.ts:334` | `arena_rooms.ts:345` |
| `arenaRoomChatSend` | `arena_rooms_live.ts:341` | `arena_rooms.ts:368` |

Итог: создать комнату можно (`arenaRoomCreate` задеплоен), но друг **не может войти**, ready/кик/чат/закрытие — всё 404.
Фикс: импорт+экспорт 6 функций в `index.ts`, добавить в whitelist `deploy:safe`, задеплоить.

### 2. ИИ-микротексты в статистике (`statsInsightsGenerate`) — не задеплоены
Свежая фича (коммиты 9c50a4ce + 8233ed02): клиент `app/stats_insights_client.ts:183` зовёт CF,
функция экспортирована (`index.ts:141`), но её **нет среди 78 задеплоенных** и **нет в whitelist `deploy:safe`**.
Premium-юзер не увидит заметок (клиент гасит ошибку мягко). Фикс: добавить в whitelist + задеплоить.

### 3. `functions/src/arena_rank_progression.ts` НЕ закоммичен, а закоммиченный `index.ts` его импортирует
`index.ts:5` (в HEAD) делает `import { applyStarDelta, isPromotion } from './arena_rank_progression'`,
файл — `??` untracked (вместе с тестом). **После `git push` сборка functions сломается на любой другой машине/CI**
(`Cannot find module`). Фикс: `git add functions/src/arena_rank_progression.ts functions/src/arena_rank_progression.test.ts` + коммит.
(Файл, похоже, забыла добавить другая сессия — правился он не здесь.)

## 🟠 ВАЖНО — протухание и дрейф

### 4. Whitelist `deploy:safe` отстал от прода — 11 задеплоенных функций в него не входят
`explainPhrase`, `submitExplainReport`, `premiumDialogSend`, `weeklyReviewGenerate`, `reEngagePushCron`,
`computeLeaderboardStatsCron`, `resetWeeklyXpCron`, `cleanupExpiredAppMessagesCron`, `arenaHillDailyRewardCron`,
`submitWebsiteContact`, `telegramPremiumActivationNotifier`.
Они задеплоены вручную, но штатный `npm run deploy:safe` их **никогда не обновит** → фиксы в этих функциях молча не доедут до прода.
Обратное направление чистое: все 67 имён whitelist задеплоены.

### 5. Падает тест functions на master: `src/re_engage_push.test.ts`
Реализация стала возвращать `pushTokenTimezone`, тест не обновлён (со времён cleanup-коммита 1d659478).
1 failed / 291 passed. Это дрейф теста, не прод-баг, но он красит CI.

## 🟡 Фичи «тёмные» в проде (выключены флагами — не баг, но помнить)

- **Рефералка целиком**: RC `referral_enabled` дефолт `false` (`app/remote_flags.ts:60`). Если в админке не включено — фича мертва. Проверить значение в `remote_config/app`.
- **ИИ-диалог («Фил»)**: `EXPO_PUBLIC_AI_DIALOG_ENABLED` не задан в EAS production → выключен (бэкенд `premiumDialogSend` задеплоен).
- **«Объясни проще»**: `EXPO_PUBLIC_EXPLAIN_ENABLED` не задан в EAS production → выключен (бэкенд `explainPhrase` задеплоен).
- **PostHog**: ключ не задан в проде → аналитика-no-op.
- Латентный баг на будущее: клиентский лимит диалогов (`dialogs_limit_session.ts`) не смотрит на `isPremium` —
  при включении флага премиумы упрутся в клиентскую плашку «1/день» (сервер бы им разрешил).
- RC-килсвитч `speaking_enabled` объявлен, но нигде в UI не читается (рубильник-пустышка).

## 🟠 Админка

- **Дубли ID на вкладке Arena Rooms** (`ar-search`, `ar-only-active`, `ar-count`, `ar-summary` определены и в Arena Ranks, и в Arena Rooms; `getElementById` берёт первый): **поиск и фильтр «только активные» на вкладке Rooms молча не работают**, счётчик/summary Rooms пишутся в скрытую вкладку Ranks. admin/index.html:9684+9837, 9687+9840, 9468+9842, 9697+9850.
- **Referrals «Load more»**: победившая копия `loadReferralsData` (line 22488) не выставляет `_referralsHasMore`, на который смотрит кнопка → видимость кнопки залипает.
- «Выдать VIP» на месте и работает (3 точки входа → `openPremiumGrantModal`, line 13794). Комментарий про CF `grantVip` (line 9193) — ложь, реально прямой `updateDoc` под `isAdmin()`.
- ~30 пар дублей window-функций подтверждены (вторая копия побеждает) — править всегда вторую.

## ✅ Что проверено и НЕ сломано

- **Навигация**: все `router.push`/`Link` ведут на существующие экраны, битых переходов нет. Орфаны (мёртвые экраны без входа): `app/hint.tsx`, `app/spike_voice.tsx`, `app/friends_screen.tsx`, `app/personal_plan_playback_waveform.tsx`, `app/modal.tsx`.
- **Удаление voyazh-контента (58065c94)**: обработано корректно — Компас рендерит фразовый контент дней 1–11 из inline-стора + generic fallback, аудио сходится, краша/пустых дней нет. Осадок: 4 устаревших `fill_progress_voyazh_*` теста и инертные `generatedPacketId` в каталоге.
- **FORCE_PREMIUM предохранитель цел**: `config.ts:71-72` = intent && __DEV__ && !IS_STORE_RELEASE, guard-тест на месте, `tester_no_premium` побеждает.
- **vipRevokeMine**: экспорт закоммичен, функция задеплоена и в whitelist (хвост из памяти закрыт).
- **tsc functions**: 0 ошибок. **Тесты functions**: 291/292 зелёные.
- **Админка → CF**: все 3 вызываемых функции существуют; вкладки Alerts и Explain Reports подключены.

## 🧪 Тесты приложения: 127 сьютов красные (261 тест) — почти всё baseline

- Известный baseline ~124 сьюта (контракт-грепы строк исходников). Сейчас 127 — в пределах того же класса.
- Семейства: `gustav_*` (~17, остатки несмерженной multilang-работы из integration/merge-all), `onboarding_graphite_*` (~13, контракты устаревшей итерации темы — текущий код использует другие ассеты), `personal_plan_fill_progress_*` (леджер ушёл вперёд на Echo Day 11), локали es, `*_contract`.
- `tests/unit/premium_guard.test.ts` — красный из-за устаревших моков (реализация перешла с `getItem` на `multiGet` для `tester_no_premium`); сам код корректен, прод-путь не затронут.
- tsc приложения: 27 ошибок — типовой шум (FlashList v2 `estimatedItemSize`, hitSlop-объекты, draft-файл в docs/), рантайм не ломает.

## 🔒 Стоячие известные риски (без изменений)

- **App Check не энфорсится в проде** (ENFORCE_APP_CHECK unset, API выключен) — OpenAI-функции доступны с анонимным токеном без аттестации.
- `.codex-tmp-admin-live.html` (1.17 МБ) закоммичен в корень репо — мусор.

## Приоритет фиксов

1. Закоммитить `arena_rank_progression.ts` (+тест) — иначе push сломает functions всем.
2. Экспортировать 6 `arenaRoom*` в `index.ts` + whitelist + деплой — оживить комнаты Арены.
3. `statsInsightsGenerate` в whitelist + деплой — оживить ИИ-заметки статистики.
4. Дополнить whitelist `deploy:safe` 11 именами — закрыть канал протухания.
5. Починить дубли `ar-*` ID в админке (вкладка Rooms).
6. Обновить тест `re_engage_push` (+ моки `premium_guard`).
