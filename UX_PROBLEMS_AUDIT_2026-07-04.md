# Аудит проблем, портящих пользовательский опыт — 2026-07-04

Полный аудит по 6 зонам: покупки/пейволы, сохранность прогресса, навигация/крэши,
аудио/спикинг, ошибки/сеть, UI/производительность. Только чтение кода, ничего не правилось.
~57 находок: **12 критичных**, ~25 средних, остальные низкие.

---

## КРИТИЧНЫЕ (чинить в первую очередь)

### K1. «Сменить аккаунт» безвозвратно стирает несинхронизированный прогресс
`app/auth_provider.ts:1295-1303` + `app/cloud_sync.ts:2260-2277`
`forceSyncToCloud()` провалился (офлайн/таймаут) → пишется emergency backup → **wipe вызывается всё равно**.
Ключ `account_switch_emergency_backup_latest_v1` **нигде не читается** — кода восстановления не существует.
Сценарий: смена аккаунта без сети = потеря всего несинкнутого прогресса навсегда.

### K2. Restore «облако победило» затирает офлайн-покупки
`app/cloud_sync.ts:1802-1803, 1034, 1966-1996`
Арбитр — только сравнение XP. При победе облака все ключи вне allowlist слепо перезаписываются
(`mergeLessonRestoreValue` по умолчанию отдаёт cloudValue). Union-merge купленного — только в sticky-ветке.
Сценарий: купил пак/ауру офлайн на устройстве A, на B опыта больше → покупка исчезла, осколки списаны.

### K3. Осколки: read-modify-write без транзакции на основном пути
`app/shards_system.ts:385-421` (applyShardDeltaToCloud), тот же TOCTOU в `syncShardsToCloud:1060`
`get()` → пауза → `set(merge)`. Параллельное начисление CF/другого устройства молча перетирается.
Сейчас спасают firestore.rules (клиентская запись shards блокируется) — но код рассчитан на успешную запись:
латентный рассинхрон, если правила и клиент разъедутся при деплое.

### K4. Тихая потеря наград за завершённый урок
`app/lesson_complete.tsx:603-748` — весь grantBonus под одним пустым `catch {}` (строка 747).
Сбой сети в момент завершения урока → бонусный XP, сундук, осколки молча не начислены. Ни ошибки, ни
повтора, ни телеметрии. Совпадает с реальными жалобами на пропажу осколков.

### K5. Полное отсутствие офлайн-детекции (системно)
`@react-native-community/netinfo` отсутствует в package.json; 0 использований NetInfo во всём коде.
Без интернета приложение нигде не говорит «нет сети»: экраны молча показывают устаревший кэш,
действия падают с генерик-тостами. Нет различения «нет сети» vs «ошибка сервера».

### K6. Отложенные покупки (Ask to Buy / 3-D Secure) не обрабатываются
`app/paywall_purchase.ts:361-393` — catch различает только userCancelled; `PAYMENT_PENDING` нет нигде.
Ребёнок покупает с подтверждением родителя → «Не удалось оформить. Попробуй ещё раз» → путаница/двойная покупка.

### K7. Премиум включается локально без проверки активного entitlement
`app/paywall_purchase.ts:302-311` — после `purchasePackage` безусловно `persistStorePremiumLocally` +
празднование, без проверки `customerInfo.entitlements.active` (в restore на :433 проверка есть).
Рассинхрон клиент↔RC↔сервер, «отваливающийся» премиум.

### K8. Тап по пуш-уведомлению на холодном старте — навигация без guard'а
`app/notifications.ts:2183-2233` (все ветки setupNotificationTapHandler), регистрация в `_layout.tsx:1664`.
Ни одна ветка не использует `scheduleAfterRootNavigationReady` — класс крэша
«Attempted to navigate before mounting the Root Layout». Приложение закрыто → тап по пушу → крэш.

### K9. Android back выкидывает из живого матча арены без сдачи
`app/arena_game.tsx` — BackHandler отсутствует; confirmForfeit только с экранной кнопки.
Back посреди матча → выход без записи forfeit → соперник висит в матче, ставка осколками не разрешается.
Смежное: экзамен (60 мин) тоже не защищён — `exam.tsx:809` back без подтверждения теряет попытку.

### K10. Android hold-запись не запрашивает разрешение на микрофон
`components/SpeakingPanel.tsx:942-964, 1021-1042` → `app/speaking_hold_recorder.ts:132-233`
PCM-рекордер сам грант не просит; `requestPermissionsAsync` только на системных путях.
Без гранта: init падает → SILENT_STOP → вечное «не расслышал» без диалога о разрешении. Мёртвая петля.

### K11. Скролл горячих экранов идёт через JS-мост
`app/(tabs)/friends.tsx:2945-2948`, `(tabs)/settings.tsx:972`, arena_lobby/arena_rating/avatar_select/
club_screen/daily_tasks/quizzes/arena_results — `useNativeDriver:false` + `scrollEventThrottle:16`.
UI-тредовый вариант **уже написан** (`components/BouncyScrollView.tsx:205-219`), но не используется нигде.
Симптом: рывки скролла, особенно Android.

### K12. Обрезание вариантов ответа в матче арены
`app/arena_game.tsx:1124` — `numberOfLines={2}` без `adjustsFontSizeToFit` на двуязычной строке.
Игрок под таймером не видит конец длинного ответа. Тот же класс, что чинили на флешкартах.
Аналогично план-квизы: `app/(tabs)/quizzes.tsx:2864-2867`.

---

## СРЕДНИЕ

### Прогресс / данные
- **Wall-clock LWW осколков** — `shards_system.ts:184-188, 404-406, 1141-1148`: конфликты решаются часами
  устройства; сбитые часы откатывают заработанное (при равенстве меток облако побеждает).
- **shards_balance не входит в forceSyncToCloud** — `cloud_sync.ts:594-596`: при смене аккаунта осколки
  офлайн-сессии не выгружаются (forceSyncShardsToCloud не вызывается в этом флоу).
- **spendShards cloud_reconcile** — `shards_system.ts:818-830`: при «облаку не хватает» локальный баланс
  принудительно урезается к облачному; честно заработанное может списаться.
- **XP-лок с таймаутом 1.2 с** — `xp_manager.ts:232-248`: две параллельные registerXP теряют одно начисление
  (быстрые серии ответов на медленных Android).
- **Boot-restore vs ранние начисления** — `cloud_sync.ts:1788-1795 → 2034-2035`: XP, заработанный пока идёт
  restore, перезатирается облачным снапшотом.
- **Legacy blind-merge XP** — `cloud_sync.ts:1651-1661`: до серверного cutover (progressServerAuthoritative)
  последний синк слепо затирает XP/стрик другого устройства.
- **Стрик по UTC** — `daily_tasks.ts:1994-1996`, `xp_manager.ts:397`: огонёк сгорает несправедливо в
  «неудобных» часовых поясах.

### Ошибки / сеть
- **Тихий провал restore при запуске** — `_layout.tsx:1810, 1944`: после переустановки без сети — нулевой
  прогресс без сообщения и кнопки «Повторить» (паника «всё пропало»).
- **httpsCallable без таймаута** — хелпер `explain_callable_timeout.ts:12` (30 с) используют 4 файла из ~30
  (66 вызовов). Репорт/подарок/промокод крутят спиннер до ~70 с на висящей сети
  (`client_reports.ts:69`, `friend_gifts.ts`, `promo_code_client.ts`, `ideas_client.ts`).
- **Лента друзей — латентный вечный спиннер** — `(tabs)/friends.tsx:1290-1316`: load() без try/finally.
- **WeeklyReviewCard** — `WeeklyReviewCard.tsx:64-79`: setBusy без finally → «генерируем» навсегда.

### Покупки
- **Веб-чекаут ручная активация** — `functions/src/web_checkout.ts:307-320, 438-485`: письмо с кодом может
  тихо не отправиться → человек заплатил, доступа нет (paid_pending_activation).
- **700 мс таймаут проверки доступа** — `premium_modal.tsx:96-113`: fallback=false → оплатившему на медленной
  сети показывают пейвол.
- **syncRevenueCatIdentity блокирует покупку** — `paywall_purchase.ts:275-300`: «Ошибка подключения» в момент
  готовности платить; местами избыточно строго (TRANSFER-вебхук чинит анонимные покупки).
- **Вебхук regex looksLikePremiumSubscription** — `functions/src/revenuecat_shards.ts:135-143, 753-765`:
  широкий `/sub|month|.../` может неверно классифицировать будущие продукты; премиум-ветка приоритетнее shard.

### Навигация
- **Двойной тап → двойная навигация** — системной защиты нет (~380 навигационных onPress); пример
  `daily_tasks_screen.tsx:2133-2152` (два await перед push).
- **Онбординг не перехватывает back** — back посреди онбординга закрывает приложение.
- **Глобальные модалы не взаимоисключаются** — `_layout.tsx:2735, 2780, 2797`: release notes + update modal
  могут показаться одновременно; на iOS два RN Modal конфликтуют.
- **Слепые повторные replace по таймеру** — `_layout.tsx:1296, 1310-1311`: юзера может «телепортировать».

### Аудио / спикинг
- **Тренировка слова без watchdog** — `SpeakingPanel.tsx:583-668`: единственный путь распознавания без
  7-секундного таймера → вечный спиннер «слушаю».
- **Диалоги: микрофон не глушит TTS** — `ai_dialog_session.tsx:370-506`: ни Speech.stop, ни stop() —
  микрофон ловит речь бота.
- **Отказ в микрофоне в диалогах — тупик** — `ai_dialog_session.tsx:1075-1085`: нет «Открыть настройки»
  (в SpeakingPanel и плане кнопка есть).
- **Сигнал старта записи на Android** — `SpeakingPanel.tsx:913, 662`, `ai_dialog_session.tsx:506`,
  `SpeechBeat.tsx:213`: смазывает первое слово; фикс есть только в `personal_plan_exercise.ts:951-953`.
- **Guard свежести озвучки планов** — только build-time через Claude Code hook (`.claude/settings.json:10`);
  рантайм текст не сверяет (`personal_plan_phrase_audio_resolver.ts:41-52`).

### UI / перф
- **Титулы на каждый рендер главной** — `(tabs)/home.tsx:3446-3509`: ~30 объектов + локализация в теле
  рендера без useMemo; главная — самый перерисовываемый экран.
- **Бесконечная анимация карточки Тео** — `components/HomeTheoAdvisorCard.tsx:67-75`: Animated.loop без
  гарда фокуса/AppState → вклад в нагрев (эталон рядом: `quizzes.tsx:333-364`).
- **Лобби арены: друзья без виртуализации** — `arena_lobby.tsx:2419-2420`: ScrollView + map, все чипы с
  аурами монтируются сразу.
- **lesson1: тройное состояние загрузки** — `lesson1.tsx:952-965`: пустой экран → спиннер → урок с другой
  геометрией; самый посещаемый экран.
- **Мелкие кнопки чата лиги** — `LeagueChatPanel.tsx:1210-1298` (~20-24px: ответить/пожаловаться/скрыть/
  удалить), `LeagueChatReactions.tsx:128-169` (реакции); hitSlop = 0 в обоих файлах.
- **top_helpers пустой список при загрузке** — `top_helpers.tsx:98, 322-347`: blank → pop-in, нужен скелетон.

---

## НИЗКИЕ (кратко)
- Restore покупок без празднования — `paywall_purchase.ts:436-458`.
- Пейволы через push без markNextNavigationAsReplace (держится на TRANSIENT_REDIRECT_PATHS) —
  `settings.tsx:829,867`, `quizzes.tsx:973`, `home.tsx:1126,1703`.
- personal_plan restore edge — `paywall_purchase.ts:454-457`.
- Stripe продление: code_missing_manual_needed — `web_checkout.ts:635-683`.
- league_engine пустые catch при записи state/result — `league_engine.ts:571, 598`.
- adminGrantReward без dedupe (только админ) — `functions/src/admin_grant.ts:74`.
- arenaHillDailyRewardCron TOCTOU (крон) — `functions/src/arena_hill_daily_reward.ts:55-67`.
- Гонка hold-попыток спикинга — `SpeakingPanel.tsx:942-1006`.
- Транзиентная ошибка → «Голосовой ввод недоступен на этом устройстве» — `ai_dialog_session.tsx:449-453`.
- Контрольный прогон без iosCategory default — `speaking_recognition_options.ts:196-209`.
- useAudio cleanup глушит чужую озвучку — `hooks/use-audio.ts:83-90`.
- language_welcome activate без catch — `language_welcome.tsx:199-218`.
- Boot-цепочка: незащищённый await — `_layout.tsx:1835`.
- 84 пустых catch в 40 файлах без телеметрии (`logAppWarning` есть, не используется).
- Пейджеры теории на JS-драйвере — `lesson_help_theory_ui.tsx:207`, `lesson_irregular_verbs.tsx:828`.
- diffWords в теле рендера — `quizzes.tsx:2573`.
- Крестики 36px без hitSlop — `ExplainSheet.tsx`, `MistakeEli5Modal.tsx`, `AppMessagesInbox.tsx:588`.
- Warm deep-link гейт без scheduleAfterRootNavigationReady — `_layout.tsx:1284-1305`.
- lingman_videos: renderVideo без memo (некритично).

---

## Что оказалось В ПОРЯДКЕ (проверено, чинить не надо)
- Серверная защита осколков/XP: все клиентские CF — транзакции + идемпотентность; firestore.rules блокируют
  клиентскую запись shards/premium; XP через progressEvent с леджером по eventId.
- Цены: везде из RevenueCat/сервера, хардкодов нет.
- Петля пейвола закрыта в основных местах (markNextNavigationAsReplace в trainer/lesson).
- Картинки: аватары/паки — локальные ресурсы через expo-image с размерами и кэшем.
- Мёртвых роутов нет; крэши от undefined после deep link в арене починены (H9).
- Позиция в уроке пишется на каждом шаге — при kill теряется максимум шаг.
- Watchdog'и распознавания есть везде, кроме одного пути (тренировка слова).
- Cleanup аудио при размонтировании на месте; утечки плееров закрыты реестром livePlayers.
- Обработка ошибок paywall/арена/AI-диалог/компас — образцовая (retry, локализованные алерты, классификация).
- ErrorBoundary глобально подключён (`_layout.tsx:2943`).

## Рекомендуемый порядок починки
1. K1 (смена аккаунта) — маленький фикс: не делать wipe при провале синка + написать restore бэкапа.
2. K4 (награды урока) — убрать пустой catch, добавить retry-очередь + телеметрию.
3. K8 (пуш на холодном старте) — обернуть в scheduleAfterRootNavigationReady, фикс на 10 строк.
4. K10 (микрофон Android) — requestPermissionsAsync в hold-путь.
5. K6+K7 (покупки) — обработка PAYMENT_PENDING + проверка entitlement перед persist.
6. K9 (back в арене/экзамене) — BackHandler + confirm.
7. K12 (обрезание ответов) — adjustsFontSizeToFit, копия фикса флешкарт.
8. K5 (NetInfo) — добавить пакет, глобальный баннер офлайна, различение ошибок.
9. K2+K3 (restore/осколки) — большая работа: версионирование/union-merge, серверная транзакция для shards.
10. K11 (скролл) — переключить экраны на готовый onAnimatedScroll.
