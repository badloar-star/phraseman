# Глубокий аудит и форензика phraseman — 2026-06-11

> 41 субагент, 8 направлений, адверсариальная верификация P0/P1 двумя скептиками.  
> Итог: **15 подтверждено, 1 отклонено**. Закрыто с прошлых раундов: **34 находки**.

---

## Executive Summary

Проект стал заметно здоровее с прошлых раундов: главный класс багов (uid из тела запроса), дыры шардов через onCall, OOM-кроны — закрыты. Однако три фундаментальные проблемы живут с самого начала и так и не закрыты:

1. **Firestore rules** не защищают shards/XP/streak — клиент пишет любой баланс (P0, открыто с аудита 06-10).
2. **Клиентский шрифтовой патч Text.render тихо умер** на RN 0.81 — 2128 мест рендерят без Inter-Bold (новое, P1).
3. **EnergyContext** без useMemo + секундный тикер ре-рендерит 21 потребителя каждую секунду (новое, P1).

Дополнительно: master на **81 коммит впереди origin/master** — вся работа последних дней существует только локально и будет потеряна при проблемах с машиной.

---

## Сводная таблица подтверждённых P0/P1

| Сев | Направление | Находка | Файл | Фикс |
|-----|-------------|---------|------|------|
| P0 | economy / data | shards/XP/streak пишутся клиентом — любой баланс | `firestore.rules` | Серверная валидация изменений валюты через CF |
| P1 | forensics | master 81 коммит впереди origin — работа только локально | git | `git push origin master` |
| P1 | forensics | Tracked-код импортирует untracked-файлы → CI сломан | `functions/src/index.ts` | `git add` всех новых файлов + коммит |
| P1 | economy | Сервер доверяет league points с клиента → бесплатная топ-награда | `functions/src/leaderboard.ts` | Серверный расчёт очков из firestore, не из запроса |
| P1 | economy | Экзамен 10000 XP × бусты без капа, повторяемо | `app/exam.tsx` | Серверный кап XP за экзамен + флаг «уже сдал» |
| P1 | economy | A/B пейвола на `Math.random()` вместо `getPaywallVariant` | `app/components/premium_modal.tsx` | Заменить на детерминированный вариант |
| P1 | data | Участник арены форсирует победу: state='finished' без форфейта | `firestore.rules` | Валидация разрешённых значений state в rules |
| P1 | data | matchmaking_queue отдаёт push-токены и ники всем авторизованным | `firestore.rules` | Ограничить чтение queue только uid == request.auth.uid |
| P1 | client | Text.render патч тихо умер на RN 0.81 → 2128 мест без Inter-Bold | `app/font_family_patch.ts` | Переписать через глобальный `Text.defaultProps` или StyleSheet |
| P1 | client | EnergyContext без useMemo + 1с тикер → 21 потребитель ре-рендерится каждую секунду | `contexts/EnergyContext.tsx` | `useMemo` на value + убрать state-тикер (ref + forceUpdate) |
| P1 | client | registerXP → полная перезапись 70KB activity-очереди в AsyncStorage на каждый ответ | `lib/xp_manager.ts` | Батчинг записей, кольцевой буфер |
| P1 | server-cf | `scorePronunciationAttempt` читает OPENAI_API_KEY из `process.env` без `defineSecret` | `functions/src/scoring.ts` | `defineSecret('OPENAI_API_KEY')` + `.run()` |
| P1 | server-cf | Telegram-оплата не активирует Premium автоматически | `functions/src/telegram_payment.ts` | Вебхук активации Premium по успешному платежу |
| P1 | deps-config | App Check не энфорсится: `enforceAppCheck: false` в 3 CF + API выключен | `functions/src/index.ts` | Включить ENFORCE_APP_CHECK, App Check API в консоли |
| P1 | content | Уроки 18 и 20: 49 фраз вместо 50 — тест lesson_phrases_regression красный | `lib/lessons/lesson18.ts`, `lesson20.ts` | Добавить недостающую фразу в каждый урок |

---

## Закрыто с прошлых раундов (дельта)

### Серверная безопасность (7 из 7 прошлых P0/P1)
- `leagueActivateGroupBoost`: stableId из тела → закрыт, теперь из `request.auth.uid`
- `isPremium` из тела в 3 OpenAI-CF → закрыт коммитом `05f65d60` (серверная проверка)
- `computeLeaderboardStatsCron` OOM → закрыт, memory 512MiB
- `syncFriendActivityMirrorCron` OOM → закрыт, memory 512MiB
- `questionTimeout` мёртв → закрыт, watchdog `de8f5b08`
- 6 арена-CF не экспортированы → закрыт коммит `8dc7a5af`
- `premiumExpiryCron` — частично: 72ч grace и RC-поля добавлены `00b50c73`

### Экономика (4 из 8 прошлых)
- `leagueActivateGroupBoost` stableId: закрыт (см. выше)
- `isPremium` из тела: закрыт `05f65d60`
- `FORCE_PREMIUM` предохранитель: на месте, страж `tests/force_premium_prod_guard.test.ts` PASS
- `tester_no_premium > FORCE_PREMIUM`: фикс `7e4c12d5`

### Firestore/данные (6 из 7 прошлых)
- `progressHasNoPremiumWrites` + isAdmin: применено
- Запрет клиентской записи vip_* / premium: в rules
- Catch-all deny: есть
- arena-сессии cleanup: есть кроны
- collectibles premium-гейтинг: добавлен
- friend_activity_mirror race condition: закрыт batch-транзакцией

### Контент (5 из 6)
- lesson32 wordsEn: исправлен
- Контракт re-key `${lessonId}_phrase_${N}`: тест зелёный
- 5 дистракторов (6 вариантов): тест зелёный
- collectibles wave A+B (sets 07-18): 198 текстов + 198 артов, reviewed PASS
- Wave D (sets 25-30): закоммичен

### Тесты/CI (6 из 7)
- `scan_secrets.mjs`: теперь tracked в корне
- `force_premium_prod_guard.test.ts`: PASS, не ослаблен
- pre-commit хук: активен (husky)
- `re_engage_push.test.ts`: остаётся красным (предсуществующий)
- Арена-CF экспорт: закрыт

### Зависимости/Конфиги (7 из 8)
- `ADMIN_ALERT_BOT_TOKEN`: через `defineSecret`, не в коде
- `OPENAI_API_KEY` в основных CF: через `defineSecret`
- Кэш `.firebase`: добавлен в `.gitignore` (но всё ещё tracked — нужен `git rm --cached`)
- google-services.json: проверен, только client-config
- RC ключи: рассинхрона имён не найдено
- PostHog key-gated: подтверждено
- Telegram chat_id в `admin_config/alerts`: не в коде

---

## Детальные секции по направлениям

### git-форензика (12 находок, 6 закрыто)

**P1 — Master 81 коммит впереди origin**  
`git log origin/master..master --oneline | wc -l` = 81. Вся работа с 06-09 по 06-11 только локально. Риск: потеря всего при проблемах с машиной или OS. **Фикс: `git push origin master` прямо сейчас.**

**P1 — Tracked-код импортирует untracked-файлы**  
`functions/lib/arena_rank_progression.js`, `premium_status.js`, `stats_insights.js`, `weekly_review.js` — скомпилированы и есть в lib, но исходники (`functions/src/arena_rank_progression.ts` и др.) untracked. Чистый клон сломается. **Фикс: `git add functions/src/*.ts` для всех новых файлов.**

**P2 — 24 мусорных файла в корне tracked**  
`('none')`, `+m[1])`, `0.18`, `0x0400`, `127`, `2`, `3`, `99`, `=json`, `Math.random()`, `Number((correctCount`, `SSIU`, `` [`lesson${i `` и др. — артефакты сломанных PowerShell-редиректов, tracked и запушены на GitHub. Содержат обрывки кода.

**P2 — Большой объём незакоммиченной работы в дереве**  
`cinemaThemes.ts`, правки `theme.ts`, `ThemeContext.tsx`, `screenBackground.ts`, `ScreenGradient.tsx`, `home.tsx`, `lessons.tsx`, правки `functions/src/arena*`, сайт `knowly-www/*` — незакоммичены. Включая security-правку `firestore.rules`.

**P2 — Репо распух до 1.43 GiB**  
1980 qa-artifact файлов, HTML-дампы, SSIU-файлы, скриншоты. Нужна чистка через `git filter-repo` или BFG.

**P2 — functions/lib под git**  
139 скомпилированных `.js` + `.map` файлов затрекованы. Постоянный шум в `git status`, конфликтная зона между параллельными сессиями, риск деплоя старого кода.

**P3** — `.firebase/hosting.YWRtaW4.cache` tracked; 5 zombie agent-worktree в `.claude/worktrees`; 9 локальных веток протухло; `phraseman-speaking` worktree: 11 брошенных незакоммиченных файлов (button audit 06-09); `scorePronunciationAttempt` вне `deploy:safe`; 1288 dangling-объектов в fsck.

---

### Cloud Functions / Сервер (6 находок, 7 закрыто)

**P1 — scorePronunciationAttempt: `process.env` без `defineSecret`**  
`functions/src/scoring.ts`: `process.env.OPENAI_API_KEY` — в новом Firebase Gen2 нужен `defineSecret`. При деплое функция будет падать с `openai_key_missing`.

**P1 — Telegram-оплата: ручная активация**  
`functions/src/telegram_payment.ts` не вызывает активацию Premium при успешном платеже — требует ручного действия в админке. Потенциальная потеря платящих пользователей.

**P2 — Нет крона деактивации VIP/admin-grant**  
Store-премиум держится RC-вебхуком, но VIP и admin-grant флаги не деактивируются автоматически после срока. Истёкшие premium-флаги остаются `true`.

**P2 — scorePronunciationAttempt вне deploy:safe**  
Экспортирован, клиентом не вызывается, нет дневной квоты, нет премиум-гейта.

**P3** — Мёртвый код `sync_leaderboard.ts` и `identity_cleanup.ts`; нет дневной квоты на `scorePronunciationAttempt`.

---

### Экономика (7 находок, 4 закрыто)

**P0 — shards/XP/streak: клиент-авторитарно**  
`firestore.rules`: нет `hasOnly` на разрешённые поля в `users/{uid}` → прямой `updateDoc({shards: 99999})` проходит. Это главная денежная дыра проекта, открыта с 06-10.

**P1 — Сервер доверяет league points с клиента**  
`functions/src/leaderboard.ts`: очки берутся из request data, не из Firestore. `updateDoc({league_points: 1000000000})` → бесплатная топ-награда + корона.

**P1 — Экзамен 10000 XP без капа, повторяемо**  
Нет серверной проверки «уже сдал», нет капа на XP за один экзамен. Через бусты лиги даёт аномальный перевес.

**P1 — A/B пейвола на `Math.random()`**  
`premium_modal.tsx`: `Math.random() < 0.5` вместо `getPaywallVariant(uid)`. Вариант A/B не детерминирован, аналитика не работает, пользователь каждый раз видит разный пейвол.

**P1 — Фейковая зачёркнутая цена**  
Оба прод-пейвола показывают захардкоженную «старую цену» без реального периода повышенной цены. Dark pattern, риск App Review rejection.

**P2** — energy_plusN затирает больший бонус меньшим; энергия полностью клиентская (нет серверной компоненты).

**P3** — tester_* флаги без `IS_STORE_RELEASE`; isPremium/isVip в league cosmetics клиентские.

---

### Клиент: производительность и утечки (12 находок, новое направление)

**P1 — Text.render патч умер на RN 0.81**  
`app/font_family_patch.ts`: перехватывает `Text.render` для подмены fontWeight → Inter-Bold. В RN 0.81/Bridgeless этот механизм не работает. 2128 мест с `fontWeight: 'bold'` рендерятся дефолтным шрифтом платформы. Визуально: Android показывает Roboto Bold вместо Inter Bold повсюду.

**P1 — EnergyContext: 21 потребитель ре-рендерится каждую секунду**  
`contexts/EnergyContext.tsx`: `value` создаётся inline без `useMemo`, секундный тикер через `setInterval` обновляет state → все 21 потребителя (включая `home.tsx` 3745 строк, `lesson1.tsx` 3214 строк) ре-рендерятся каждую секунду. Убивает FPS на дешёвых Android.

**P1 — registerXP: 70KB AsyncStorage на каждый ответ**  
`lib/xp_manager.ts`: каждый правильный ответ в уроке вызывает `registerXP` → `xp_changed` event → полная перезапись activity-очереди (~70KB) + `loadData()` главного экрана. На уроке из 10 вопросов = 10 синхронных перезаписей.

**P2 — BouncyScrollView: JS-колбэк onScroll на 60Hz**  
`components/BouncyScrollView.tsx`: `onScroll` остался JS-side (не `useAnimatedScrollHandler`). На 58 экранах при каждом скролле вызывается JS bridge crossing 60 раз/сек.

**P2 — quiz_data.ts 2.7MB + quiz_source_locale 2MB: синхронный cold-load**  
Оба файла импортируются статически и блокируют JS-поток при первом открытии квизов. После этого остаются в heap навсегда.

**P2 — DebugLogger: неограниченный рост AsyncStorage**  
`lib/debug_logger.ts`: каждый вызов создаёт `debug_log_<timestamp>` ключ в AsyncStorage. `clearOldLogs` нигде не вызывается. Android лимит ~6MB → silent fails при переполнении.

**P2 — ScreenGradient: бесконечные анимации на скрытых экранах**  
`components/ScreenGradient.tsx`: `Animated.loop` орбов и GoldFabricFlow крутятся без `useFocusEffect` гейтинга → фоновые табы и скрытые экраны стека анимируют невидимый фон.

**P2 — Text.defaultProps мёртв под React 19**  
`app/_layout.tsx`: попытка установить `android_hyphenationFrequency` через `Text.defaultProps` тихо игнорируется (React 19 удалил поддержку defaultProps на функциональных компонентах).

**P3** — TabSlider: все посещённые табы смонтированы навсегда, HomeScreen без memo; PremiumContext/MatchmakingContext/AchievementContext: inline value без useMemo; ArenaDuelEmojiReact: setInterval пересоздаётся на каждом тике; `club_boosts` история без капа.

---

### Firestore / Данные (8 находок, 6 закрыто)

**P0 — shards: клиент пишет любое значение** (дублирует экономику, P0)

**P1 — XP/streak/league points принимаются от клиента**  
`firestore.rules` users/progress: нет валидации `request.resource.data.hasOnly(allowedFields)`. `league_points`, `totalXp`, `streak` записываются клиентом без ограничений → перцентили и награды лиги фальсифицированы.

**P1 — Арена: state='finished' без форфейта**  
`firestore.rules` `arena_sessions/{id}`: переход state → 'finished' не валидируется (разрешённые значения не проверяются). Участник может форсировать победу без реального окончания матча.

**P1 — matchmaking_queue раскрывает push-токены и ники**  
`firestore.rules` `matchmaking_queue`: `allow read: if request.auth != null` — любой авторизованный читает всю очередь со всеми `expoPushToken` и `displayName` других игроков.

**P2 — 3 составных запроса без индекса в firestore.indexes.json**  
Упадут в рантайме при достижении порогового объёма данных.

**P3** — daily_phrases: чтение до 500 документов на один показ; leaderboard раскрывает stableUid↔firebaseAuthUid связку; isPremium/isVip в лиге клиентские.

---

### Контент (4 находки, 5 закрыто)

**P1 — Уроки 18 и 20: 49 фраз вместо 50**  
`npx jest tests/lesson_phrases_regression --silent` красный прямо сейчас. Тест-страж зафиксировал регрессию.

**P2 — set01_animals: нет арта секретной карточки**  
329/330 артов — коммит wave D заявляет «330 arts», но арт `set01_secret` отсутствует. Пользователь видит placeholder.

**P2 — Сгенерированные каталоги Сокровищницы отстали**  
`tools/collectibles/generate.mjs` генерирует клиентский + серверный каталог. 24 сета из 30 готовых в source, но сгенерированные файлы не обновлены — фича не работает для sets 19-30.

**P3** — collectibles lint: `british_06.literalRu` с заглавной буквы.

---

### Тесты / CI (8 находок, 6 закрыто)

**P1 — Незакоммиченный `reward`-тип в events.ts валит typecheck**  
`app/events.ts` (незакоммичен): добавлен новый тип `reward` без экспорта. Все сьюты, импортирующие events, не компилируются.

**P2 — firebase.json без predeploy-хука**  
`firebase deploy` запускается без `tsc` → деплоится whatever в `functions/lib`, а не свежий build. Риск деплоя старого скомпилированного кода.

**P2 — CI мёртв для прямых пушей в master**  
GitHub Actions настроен только на PR trigger. Все коммиты напрямую в master (а их 81 за 3 дня) проходят без CI.

**P2 — Класс «suite failed to run»**  
Непокрытый мок `@react-native-firebase/app` роняет несколько сьютов ещё на этапе парсинга — они не красные, они вообще не запускаются.

**P2** — re_engage_push.test.ts хронически красный с 08.06; tsc baseline 27-28 ошибок (14 hitSlop + 7 FlashList v2 + 4 draft); coverage-гейт измеряет один файл.

**P3** — forceExit маскирует висящие хэндлы.

---

### Зависимости / Конфиги (8 находок, 7 закрыто)

**P1 — App Check не энфорсится**  
`functions/src/index.ts`: 3 CF с `enforceAppCheck: false`; `ENFORCE_APP_CHECK` нигде не задан. OpenAI-CF зовутся с анонимным токеном без аттестации устройства.

**P2 — eas.json: `AI_DIALOG_ENABLED=true` в production**  
Фил активен в стор-сборках (флаг `EXPO_PUBLIC_AI_DIALOG_ENABLED`), хотя фича не ready.

**P2 — async-storage 1.24.0 при Expo SDK 54 (ожидает 2.2.0)**  
Может вызвать тихую поломку при апгрейде.

**P2 — 24MB .dev-screens, functions/lib (139 файлов), maestro-results в git**  
`.gitignore` не покрывает эти директории; всё уже tracked.

**P3** — RESEND_API_KEY через `defineString` (не `defineSecret`) + пустой в `.env` → почтовые уведомления тихо выключены; POSTHOG_KEY нет в eas.json production → аналитика в сторе может быть выключена; npm audit: 1 critical (shell-quote) в dev + 11 moderate в functions; app.json 1.5.42 ≠ package.json 1.5.41; referral_enabled дефолт false.

---

## Отклонено верификацией (1)

- **«Worktree phraseman-integration: брошенная незакоммиченная работа»** — оба скептика опровергли: `git -C C:/appsprojects/phraseman-integration status` = clean, незакоммиченного нет. Верификаторы проверили по коду.

---

## Рекомендованный порядок работ (топ-10)

| # | Действие | Почему срочно |
|---|----------|---------------|
| 1 | `git push origin master` | 81 коммит существует только локально — риск потери всего |
| 2 | `git add functions/src/*.ts` + коммит незакоммиченной работы | CI/чистый клон сломаны прямо сейчас |
| 3 | firestore.rules: добавить `hasOnly` на shards/XP/streak | P0 — печать любой валюты клиентом |
| 4 | firestore.rules: серверный расчёт league points | P1 — бесплатная топ-награда за клиентский запрос |
| 5 | Переписать шрифтовой патч (Text.render мёртв на RN 0.81) | P1 — 2128 мест с неправильным шрифтом на Android |
| 6 | EnergyContext: useMemo на value + убрать setState-тикер | P1 — постоянный ре-рендер 21 потребителя (FPS) |
| 7 | `scorePronunciationAttempt`: `defineSecret` + deploy:safe | P1 — функция упадёт в проде при деплое |
| 8 | firestore.rules: валидация state арены + restrict matchmaking_queue | P1 — форс-победа и утечка токенов |
| 9 | Уроки 18 и 20: добавить недостающую фразу | P1 — тест красный прямо сейчас |
| 10 | Запустить `generate.mjs` для сетов 19-30 Сокровищницы | P2 — фича мертва для половины контента |
