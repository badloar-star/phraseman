# Firebase: карта затрат и план сокращения — 2026-10-17 (Ревизор)

Поручение владельца 17.10: «в месяц 60–70 € — очень дохрена… на 10 000 юзеров онлайн — 30 центов максимум в день… выключить всё ненужное, Джарвис и т. п., удалить код».
Статус: **только чтение**. Ничего не удалено, не задеплоено, не выключено. Удаление и деплой — после одного «да» владельца (шаг 4).

Источники цифр — прод `phraseman-ea0b3`, последние 7 суток, только чтение:
- `gcloud functions list` / `run services list` — 548 развёрнутых функций, все Gen2, **все с 1 vCPU**, 488 по 256 МБ, minInstances = 0 везде;
- `gcloud scheduler jobs list` — 27 заданий;
- Cloud Monitoring: `run.googleapis.com/request_count`, `container/billable_instance_time`, `firestore.googleapis.com/document/*_count`, `storage …/sent_bytes_count`, `logging …/bytes_ingested`;
- Firestore: `(default)` в **eur3** (Европа), функции — в **us-central1** (США).
- Выгрузки биллинга в BigQuery нет. Суммы ниже — расчёт по публичным тарифам, ±20 %.

## 1. Куда уходят деньги сейчас (≈ 55 $/мес ≈ 52 € + НДС ≈ 62 € — сходится с 60–70 €)

| Статья | Факт за 7 суток | ≈ в месяц |
|---|---|---|
| **Время работы функций (CPU)** | 381 813 оплачиваемых секунд × **1 vCPU** = 106 ч/нед | **≈ 35 $** (1,65 млн vCPU-с − 180 тыс. бесплатных) |
| **Чтения Firestore** | 6,04 млн, из них LOOKUP 3,61 млн, QUERY 1,19 млн, **NOT_FOUND 1,23 млн** | **≈ 15 $** (≈ 860 тыс./сутки) |
| Cloud Scheduler | 27 заданий (3 бесплатных) | ≈ 2,4 $ |
| Записи / удаления Firestore | 265 тыс. / 68 тыс. | ≈ 1 $ |
| Storage, исходящий трафик | 3,7 ГБ (firebasestorage) | ≈ 0–2 $ |
| Логи | 1,2 ГБ (< 50 ГБ бесплатно) | 0 |
| OpenAI (не Firebase, но деньги) | Джарвис: потолок 50 $/мес в коде (`jarvis/llm_budget.ts:19`) | до 50 $ |

**Главное:** 2/3 счёта — это CPU функций. Причина двойная:
(а) каждой функции выдано **целое ядро** (по умолчанию Gen2), хотя хватает 1/6;
(б) три горячих вызова занимают 65 % всего времени:

| Функция | Вызовов/нед | Оплачено с/нед | Сред. с на вызов |
|---|---|---|---|
| `authEnsureStableLink` | 35 715 | 113 207 | 3,2 |
| `mistakePracticeSyncEvents` | 103 775 | 92 654 | 0,9 |
| `publicProfileProjectMine` | 27 267 | 38 010 | 1,4 |
| `getActiveShardSurvey` | 5 243 | 14 736 | 2,8 |
| `explainMistake` | 3 023 | 9 957 | 3,3 |
| `videoWatchRunesClaim` | 6 697 | 9 625 | 1,4 |
| `practiceRuneGrant` | 4 294 | 9 260 | 2,2 |

Секунды на вызов большие из-за холодного старта: один бандл в ~430 экспортов поднимается целиком в каждом экземпляре, и старт оплачивается.

Из 548 функций за неделю вызывались только **171**. **377 — ноль вызовов** (admin 206, arena 47, jarvis 11, community 7, auth 7, friend/friends 10 …; список — `docs/work/tasks/firebase-zero-traffic-functions-2026-10-17.txt`). Сверка PM-221 (04.10): в облаке 548, в коде ~402 → **~150 устаревших функций всё ещё развёрнуты**.

## 2. План: что сделать (по эффекту)

### A. Переделать дешевле — главная экономия (≈ 40 $/мес из 55)

| # | Что | Где | Экономия/мес | Риск для клиента |
|---|---|---|---|---|
| A1 | **Доля ядра вместо целого**: `setGlobalOptions({ cpu: 'gcf_gen1' })` (256 МБ → 0,167 vCPU, concurrency 1). Целое ядро оставить только в белом списке тяжёлых (стриминг диалога, генерация курса, 1–2 ГБ воркеры) | `functions/src/index.ts:27` | **≈ 25–30 $** | Низкий: чуть дольше холодный старт; на нашем трафике конкуренция 1 не мешает. Проверить p95 горячих callable после деплоя |
| A2 | `authEnsureStableLink` — не звать на каждом такте синка и каждом старте: память ответа на сессию/24 ч; в `cloud_sync.doSyncToCloud` проверять «есть что отправить» ДО `ensureAuthoritativeIdentityForCloudMutation` | `app/cloud_sync.ts:3470`, `app/_layout.tsx:2619` → `public_profile_snapshot.ts:233` | ≈ 8 $ CPU + чтения | Низкий: идентичность всё равно проверяется при реальной мутации |
| A3 | `mistakePracticeSyncEvents` (104 тыс./нед — №1 по вызовам): «полная» выгрузка раз в сутки на КАЖДЫЙ язык гонит весь журнал пачками, сервер в транзакции перечитывает каждое событие. Полную выгрузку — только при отметке «сервер пуст»/раз в 7 дней; на сервере — `getAll` по id одним чтением пачки, а не по событию | `app/mistake_practice_cloud_transport.ts:150–215` (`FULL_UPLOAD_MIN_INTERVAL_MS`), `app/cloud_sync.ts:3472` | ≈ 6 $ CPU + ≈ 3–5 $ чтений | Средний: сторож восстановления «Ошибок» (не потерять журнал) |
| A4 | `publicProfileProjectMine` — на старте при `entitlement_change` дедуп не работает: пропускать, если хэш профиля и premium/vip не менялись и < 24 ч | `app/public_profile_snapshot.ts:233`, `app/_layout.tsx:2619` | ≈ 3 $ | Низкий |
| A5 | `getActiveShardSurvey` (5 тыс./нед, 2,8 с) — кэш 6–12 ч на клиенте или id активного опроса в remote_config | клиент — найти вызов | ≈ 1,5 $ | Низкий |
| A6 | Частоты кронов: `adminAlertRecoveryCron` 1 мин → 15 мин (10 тыс. вызовов/нед), `accountMergeOutboxRetryCron` 5 → 30 мин, `supportOpsCron` 10 → 60 мин, `youtubeCatalogSyncCron` 15 → 360 мин, `accountDeleteRetryCron` 30 мин → 6 ч; heartbeat кронов писать только при смене состояния (сейчас триггер `adminAlertOnCronHeartbeat` — 6,5 тыс. вызовов/нед) | `admin_alert_dispatcher.ts:390`, `auth_merge.ts:1454`, `index.ts:520`, `youtube_catalog.ts:447`, `account_delete_worker.ts:95`, `cron_heartbeat.ts:30` | ≈ 2–3 $ | Низкий: задержка алертов/ретраев до 15–60 мин |
| A7 | Чтения клиента: каталоги карточек/видео (`video_phrase_sets` limit 200, community 6×40+80, видеонаборы 60) при каждом заходе в хаб → один JSON-дайджест (1 doc с версией/Storage), кэш 24 ч | `app/video_phrase_set_packs.ts:162`, `app/community_packs/communityFirestore.ts:403,477` | ≈ 3–6 $ (растёт с аудиторией) | Средний: новый набор виден до 24 ч позже |
| A8 | «Друзья»: TTL 60 с → 30 мин, уведомления на вкладке 30 с → 12 ч, профили 5 → 30 мин | `app/firestore_friend_requests.ts:37,758,826`, `friends.tsx:850` | ≈ 1–3 $ | Низкий: новая заявка видна позже (сброс по локальному действию сохраняем) |
| A9 | **NOT_FOUND 1,23 млн/нед** (каждое — платное чтение): найти пробы несуществующих документов (Query Insights / журнал) и заменить на флаг в уже прочитанном документе | — нужен замер | ≈ 3 $ | — |
| A10 | Сканы всех `users`: `premiumExpiryCron` (ежедневно, весь `users`), `reEngagePushCron` ×2/сутки, `premiumExpiryReminderCron` → запрос `where` по индексируемому сроку / `last_active_at` | `premium_expiry_cron.ts:212`, `index.ts:458,481` | сейчас ≈ 1 $, при 10k+ растёт линейно | Средний: проекция доступа пишется кроном |
| A11 | Функции в США ↔ база в Европе: каждый запрос функции к Firestore идёт через океан (задержка + межконтинентальный трафик). На будущее — новые/горячие функции в `europe-west1` | — | мало $, много мс | Высокий для переноса (смена URL callable) — не сейчас |

### B. Удалить / выключить (≈ 5 $ Firebase + до 50 $ OpenAI; главное — порядок)

| # | Что | Экономия | Риск |
|---|---|---|---|
| B1 | **Джарвис целиком**: 3 крона (`jarvisDailyDepartmentsCron`, `jarvisDailyBusinessHistoryCron`, `jarvisProductKnowledgeReviewCron`), вебхук, 12 callable, триггер `adminAlertOnJarvisPlanWritten`, вкладка в `legacy.html`. Немедленно без деплоя: `jarvis_control/global.mode='off'` | до 50 $ OpenAI + чтения кронов + 3 задания Scheduler | Нет для клиента |
| B2 | **~150 устаревших функций в облаке, которых нет в коде** (кроны лиг/Арены: `leagueResidentsTickCron` ежечасно, `arenaV2CleanupHourly` ежечасно, `computeLeaderboardStatsCron`, `resetWeeklyXpCron`, `leagueFinalizeCron`, триггер `arenaV2OnQueueWrite` …) — `firebase functions:delete` поимённо | ≈ 1–2 $ CPU + 4–6 заданий Scheduler | Нет: в коде их уже нет |
| B3 | `soc2ReadinessCollectorCron` + триггер `adminAlertOnComplianceControlWritten` | мелочь | Нет |
| B4 | User Ideas (9 callable, 3 триггера), остатки голосового MAX (`voiceMinuteWalletMine`, `recordAiVoiceConsent`), `grantMistakeCorrectionReward`, `vipRevokeMine`, `giftsToCoinsMigrationReport` — в клиенте не вызываются | 0 $ (простой бесплатен), минус код | Нет |
| B5 | 62 admin-callable без кнопок в админке (список — в разборе Cloud Functions) после проверки скриптов | 0 $, минус код и время деплоя | Нет |
| B6 | Дубли триггеров на одних коллекциях: `app_errors` ×2, `subscription_cancel_surveys` ×2, `community_pack_purchases` ×2, `support_inbox` ×2 — оставить по одному | мелочь | Нет |
| B7 | Мёртвая кодовая база `functions-admin/` (не в firebase.json) | 0 $ | Нет |
| B8 | ИИ-разбор ошибок: на клиенте выключен флагом (7a40c6921, проверено: `explainMistake` и прогрев закрыты `active = MISTAKE_EXPLAIN_ENABLED && …`). Серверные `explainMistake` — удалить после выключения плитки в lesson1; `mistakeHubAdvice` — после правки Тем | ≈ 1,5 $ CPU + OpenAI | Нет после клиентских правок и выхода сборки (старые версии приложения получат отказ — нужен мягкий ответ) |
| B9 | Воронка пейвола пишет в Firestore на каждый шаг → `logEvent` аналитики | ≈ 0,5 $ | Низкий: отчёт воронки в админке переключить на аналитику |
| B10 | Прогрев диалогов (2 callable раз в 10 мин на Главной) | мелочь | Низкий: первый ответ диалога медленнее на холодном старте |

### C. Оставить (ядро)
Авторизация и аккаунты (`authEnsureStableLink` — после A2), покупки и доступ (`revenueCat*`, `stripeWebhook`, `telegramPremiumWebhook`, `promoCodeRedeem`), диалоги V2 и голос, прогресс/руны/Шпиль/друзья/рефералы, сайт (`webCheckout*`, `paypal*`, `englishTestApi`, `siteStatsTrack`), `usersWriteRouter` (с ранними выходами).

## 3. Что получится

| Шаг | Было ≈ $/мес | Станет ≈ $/мес |
|---|---|---|
| A1 (доля ядра) | 35 | 6–9 |
| A2–A6 (меньше вызовов) | — | ещё −2–4 |
| A7–A9 (чтения) | 15 | 6–8 |
| B1–B2 (Джарвис, устаревшие кроны, Scheduler) | 2,4 + OpenAI | ≈ 1 |
| **Итого Firebase** | **≈ 55 $ (≈ 62 € с НДС)** | **≈ 12–18 $ (≈ 0,40–0,55 €/день)** |

Цель владельца «≤ 0,30 €/день на 10 000 онлайн» — это ≈ 9 €/мес при росте аудитории. После A+B мы примерно у цели на ТЕКУЩЕЙ аудитории; на 10 000 активных в день нужен бюджет ≈ 40 чтений, ≤ 3 записей и ≤ 8 вызовов функций на пользователя в сутки (сейчас по коду 300–400 чтений у активного пользователя карточек/друзей). Значит A7–A8 (каталоги и друзья через один дайджест) обязательны до роста, а не «потом».

## 4. Порядок после «да» (шаг 4 поручения)
1. **Без деплоя, мгновенно**: `jarvis_control/global.mode='off'`.
2. **Деплой 1 (только функции, адресно, без `--force`)**: A1 (`cpu: 'gcf_gen1'` + белый список), A6 (частоты), B6 (дубли) — одним коммитом Ядра, деплой поимённо изменённых функций.
3. **Удаление в облаке поимённо** (`firebase functions:delete <name> --region us-central1`): B2 (устаревшие), B1 (Джарвис), B3, B4, B5 — список имён в отдельном файле, сверенный с кодом и с 7-дневным нулём вызовов.
4. **Клиент (выйдет со сборкой)**: A2, A3, A4, A5, A7, A8, B9, B10.
5. Через 7 суток — повторить замеры этим же способом и сравнить.

## 5. Риски и решения владельца
- 🔴 Нет: денег пользователей и доступа к Plus план не трогает (покупки, вебхуки, проекция доступа — в «оставить»).
- 🟡 A3 (журнал «Ошибок») и A10 (кроны срока Plus) — менять с тестами восстановления/проекции.
- 🟡 Удалённая callable, которую зовёт старая версия приложения, вернёт `not-found`: перед удалением B8 — убедиться, что версия без вызова раскатана.
- Решение владельца: «да» на шаги 1–3 (без клиента) даёт ≈ −35 $/мес сразу; шаг 4 — со следующей сборкой.


## 6. Исполнение 17.10 (владелец: «ДА — все 3 шага», подтверждено и лично в сессии Ревизора)

### Шаг 1 — Джарвис ✅
- `jarvis_control/global.mode = 'off'` (changedBy `revizor-cost-cut-2026-10-17`; снимок до — в рабочих файлах Ревизора).
- `canRun` проверяет только `jarvisDailyDepartmentsCron` → все три задания Scheduler Джарвиса поставлены на **PAUSED** (обратимо).

### Шаг 2 — доля ядра и кроны ✅ (с откатом части)
- Прямой `gcloud run services update` невозможен: образы `gcf-artifacts` удалены политикой очистки. Новая ревизия создаётся только сборкой.
- Деплой с HEAD **не делали**: код функций в проде от 12.09–11.10, HEAD увёз бы неотпущенные серверные изменения (D91). Каждая функция **пересобрана из её же прод-архива** (`gs://gcf-v2-sources-…/<name>/function-source.zip`, сверка generation) с другими только `cpu` / `concurrency` / `max-instances`. Метки, переменные, IAM и триггер сохранены.
- Переведено на долю ядра (22): фоновые callable, кроны и наименее чувствительные к задержке.
- **Откат на полное ядро** после замера и жалобы владельца на Пик (p95 Пика 3–5 с → 7–9,5 с; старт +30–50 %): `arenaV2Home`, `arenaExpansionHome`, `leagueJoinOrUpdateGroup`, `authEnsureStableLink`, `publicProfileProjectMine`, `getActiveShardSurvey`, `globalBroadcastListActive`, `revenueCatPremiumReconcileMine`.
- Код: `setGlobalOptions({ maxInstances: 30, cpu: 'gcf_gen1' })` + **белый список полного ядра** (fef378a62): `HOT_CALLABLE_OPTIONS` (все горячие пользовательские, включая `spire*`, `authEnsureStableLink`), `globalBroadcastListActive`, `revenueCatPremiumReconcileMine`, `dialogueV2SessionStart`, `dialogueV2TextTurn`, `premiumDialogStream`.
- Кроны в Scheduler и в коде: `adminAlertRecoveryCron` 1 → 15 мин, `accountMergeOutboxRetryCron` 5 → 30 мин, `accountDeleteRetryCron` 30 → 120 мин. `supportOpsCron` (обещание «3 ч ± 10 мин») и YouTube (15 мин) не трогали.
- Проверка Сверки (501558120): первый кадр Главной 867 мс, вход ok ~3,8 с, Пик 1,55 с, синк «Ошибок» без ошибок.

### НЕ УДАЛЯТЬ до ухода старых версий из сторов
Функции **есть в проде с живым трафиком, но их НЕТ в коде HEAD** (их зовёт сборка в сторах). Полный деплой с HEAD предложит их удалить — Пик, награды и подарки старой сборки сломаются.

| Функция | вызовов за 7 сут |
|---|---|
| `videoWatchRunesClaim` | 6697 |
| `arenaV2Home` | 1495 |
| `arenaExpansionHome` | 1490 |
| `collectiblesClaimDrop` | 1086 |
| `cosmeticAssetCatalogGet` | 738 |
| `leagueJoinOrUpdateGroup` | 620 |
| `welcomeGiftClaim` | 263 |
| `levelRewardSpinStatus` | 187 |
| `levelRewardSpinEnrollV1` | 171 |
| `arenaV2CleanupHourly` | 168 |
| `leagueResidentsTickCron` | 168 |
| `friendGetActiveQuest` | 151 |
| `leaderboardUpdateDailyAnalytics` | 100 |
| `questGetActive` | 28 |
| `friendSendGift` | 8 |
| `computeLeaderboardStatsCron` | 7 |
| `recalcCoinExchangeRate` | 7 |
| `arenaV2InviteStatus` | 2 |
| `leagueActivateGroupBoost` | 2 |
| `leagueUpdateMyMember` | 2 |
| `leagueFinalizeCron` | 1 |
| `levelGiftReserve` | 1 |
| `resetWeeklyXpCron` | 1 |
| `seasonRedeemConsumable` | 1 |
| `shardsApplyDelta` | 1 |

### Правило выкладки функций (и для релиза 18.10)
1. **Только адресный деплой**: `firebase deploy --only functions:имя1,functions:имя2`. **Без `--force`.** Полный деплой `--only functions` с HEAD **запрещён**, пока таблица выше не пуста.
2. Перед деплоем — `gcloud functions list` в лог; после — сверка списка и ошибок (Cloud Monitoring `request_count` 5xx).
3. Пересборка без смены логики — из прод-архива функции (как в шаге 2), а не с HEAD.
4. На запрос CLI «удалить функции, которых нет в коде?» — всегда **No**.

### Шаг 3 — удаление ✅ (17.10, ~19:15 UTC)
- Удалено **82 функции**: 66 «вне кода и без вызовов за 7 суток» (старая Арена/лиги/сезоны/репетитор/квесты, `arenaV2OnQueueWrite`) + **Джарвис целиком** (16 функций по прямому слову владельца; 5 из них вызывались только своими кронами на паузе и вкладкой админки). Функций в облаке: **548 → 466**. Заданий Scheduler: **27 → 24** (3 Джарвиса удалены).
- Перед удалением каждой функции её прод-архив скопирован: `gs://gcf-v2-sources-1047658658799-us-central1/_revizor_backup_2026-10-17/<имя>/function-source.zip`. Полный список с исходным путём, generation и копией — `docs/work/tasks/firebase-deleted-functions-2026-10-17.tsv`.
- **Как вернуть одну функцию:** `gcloud functions deploy <имя> --gen2 --region us-central1 --runtime nodejs22 --entry-point <имя> --source gs://…/_revizor_backup_2026-10-17/<имя>/function-source.zip --trigger-http --memory 256Mi` (callable; для `arenaV2OnQueueWrite` — триггер Firestore, восстанавливать через Ядро).
- Код: экспорты Джарвиса сняты (4d53d8c52), модули `functions/src/jarvis/*` остаются (общие части).
- **НЕ удалялись**: 19 функций-триггеров «в коде без вызовов» (`accountMergeOutboxWorker` и т. п.: ноль вызовов = не было событий), 44 callable «в коде без вызовов» (среди них V2 — `learningV2CourseReleasedSessionGetV3`, `authorizeLearningV2CourseUnlock`; нужен разбор с Ядром), 25 живых функций вне HEAD (таблица выше), платёжные и всё, что зовёт клиент.
- Осталось: вкладка «Джарвис» в `admin/v2/legacy.html` (её кнопки теперь получают not-found) — Сайту; `explainPhrase`/`explainMistake` — после коммита Тем и выхода сборки.

### Оценка после шагов 1–3
| Статья | было $/мес | стало $/мес |
|---|---|---|
| CPU функций | ≈ 35 | ≈ 24–26 (22 фоновые на доле ядра ≈ −30 % их времени; вход/старт/Пик — полное ядро) |
| Scheduler | 2,4 | 2,1 |
| OpenAI Джарвиса | до 50 | 0 |
| Кроны (вызовы/чтения) | — | −~55 тыс. запусков/мес (alert recovery, merge retry, delete retry) |
| **Firebase итого** | **≈ 55 $ (≈ 62 €)** | **≈ 43–46 $ (≈ 48–52 €)** — дальше см. раздел «99 %» |
