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


## 7. План «−99 %» (слово владельца 17.10: «сократить на 99 %», цель ≤ 0,30 €/день при 10 000 онлайн)

Честная рамка. −99 % от 62 € — это ≈ 0,6 €/мес, то есть почти весь трафик должен уложиться в бесплатные квоты: 180 тыс. vCPU-с и 2 млн вызовов функций в месяц, 50 тыс. чтений и 20 тыс. записей Firestore в сутки. На текущей аудитории это достижимо только если старт приложения перестанет ходить в функции и Firestore каждый раз. Реалистичная цель этого плана — **≈ 3–6 €/мес сейчас и ≤ 9 €/мес (≈ 0,30 €/день) при 10 000 активных**. Остаток до 99 % — это фичи с ИИ (диалоги), их стоимость не Firebase.

Факты прода (7 суток, после шагов 1–3): функций 466, Scheduler 24, Firestore 4,7 ГБ данных, **резервные копии 69 ГБ** (14 ежедневных полных копий + включён PITR), логи 1,2 ГБ/нед (бесплатно), Artifact Registry 0 (политика очистки), Storage 3,7 ГБ/нед исходящего.

| # | Статья | сейчас $/мес | после $/мес | Что делаем | Риск | Кто / когда |
|---|---|---|---|---|---|---|
| 1 | **CPU горячих callable** (вход/старт/Пик на полном ядре) | ≈ 20 | ≈ 3–5 | **Регион**: горячие функции в `europe-west1` рядом с базой `eur3` — каждый запрос сейчас ходит через океан, 1–3 с из 3,4 с — ожидание. Время ↓ в 3–4 раза = счёт ↓ в 3–4 раза и быстрее для людей. Плюс **меньше вызовов на старте** (п. 2) | Средний: смена региона = смена URL callable → только вместе со сборкой; старые сборки — двойной деплой (US+EU) до ухода старых версий | Ядро + клиент, **со сборкой**, не ночью |
| 2 | Вызовы на каждом старте: `authEnsureStableLink` (35 тыс./нед), `publicProfileProjectMine` (27 тыс.), `getActiveShardSurvey` (5 тыс.), `globalBroadcastListActive` (1,5 тыс.), `revenueCatPremiumReconcileMine` | входит в п. 1 | — | `authEnsureStableLink` — раз за вход/установку + память; проекция профиля — только при смене имени/аватара/доступа; опрос и рассылки — **Remote Config** (бесплатно) или 1 doc с кэшем 6–12 ч; reconcile RevenueCat — только когда `customerInfo` изменился | Низкий | Вход (auth), Ядро (профиль), Сайт/Моменты (опрос, рассылки) — сборка 18.10 |
| 3 | `mistakePracticeSyncEvents` (104 тыс./нед, №1 по вызовам) | ≈ 4 | ≈ 0,3 | Полная выгрузка журнала — только при «сервер пуст»/раз в 7 дней, а не раз в сутки на каждый язык; сервер — `getAll` по id одним чтением пачки | Средний: не потерять журнал «Ошибок» — нужны тесты восстановления | Ядро |
| 4 | Триггер `usersWriteRouter` на КАЖДУЮ запись `users/{uid}` (43 тыс./нед) + записи cloud_sync | ≈ 1–2 | ≈ 0,3 | Ранний выход без чтений, если изменённые поля не интересны роутеру; cloud_sync: debounce некритичных ключей 5 → 30 мин | Низкий | Ядро |
| 5 | **Чтения Firestore** ≈ 860 тыс./сут (из них NOT_FOUND ≈ 176 тыс./сут) | ≈ 15 | ≈ 1–2 | Каталоги карточек/видео — один дайджест (JSON в Storage/Hosting CDN или 1 doc с версией), кэш 24 ч; «Друзья» TTL 60 с → 30 мин; уведомления на вкладке 12 ч; `app_messages` с `where updatedAtMs > last`; пробы несуществующих документов → флаг в уже прочитанном документе; лидерборды Пика — один агрегат-документ на комнату, а не чтение участников | Средний: свежесть каталога до 24 ч | Темы (каталоги), Моменты/Вход (друзья), Ядро (агрегаты, NOT_FOUND) |
| 6 | **Резервные копии** 69 ГБ (14 ежедневных копий; PITR уже покрывает 7 дней) | ≈ 2–3 | ≈ 0,3 | Расписание: **еженедельно**, хранение 14 дней (2 копии ≈ 10 ГБ). PITR (7 дней) остаётся для «откатить вчера» | Низкий: точки восстановления старше 7 дней — раз в неделю вместо каждого дня | Решение координатора; команда в п. 8 |
| 7 | **Cloud Scheduler** 24 задания (3 бесплатных) | 2,1 | ≈ 0,3 | Слить кроны-повторы в один диспетчер (как `supportOpsCron`): alert recovery + merge retry + delete retry + cleanup + push jobs → 1 задание; убрать кроны Арены/лиг после ухода старых сборок | Низкий | Ядро |
| 8 | Оставшиеся кроны с полными сканами `users` (`premiumExpiryCron`, `reEngagePushCron`×2, `premiumExpiryReminderCron`) | < 1 сейчас, растёт линейно с базой | ≈ 0 | `where` по индексируемому сроку / `last_active_at` вместо скана всей коллекции. **A10 (`reEngagePushCron`, после релиза):** сейчас скан идёт по всем `users` с токеном (`orderBy('expoPushToken')`): в проде 447–453 чтения за прогон (журнал 15–17.10). После адресного деплоя прогонов станет 2 в сутки, при 10 000 активных ≈ 2 × (все с токеном). Кандидаты бывают только с `last_active_at` в окне от ~20 ч до 30 дней (`INACTIVE_EXTENDED_MAX_DAYS=30`, functions/src/re_engage_push.ts). Значит: диапазон `where('last_active_at', '>=', now−30д)` и `'<=', now−20ч` вместо `orderBy('expoPushToken')`, токен проверять в памяти — активные сегодня и ушедшие больше месяца назад не читаются. Проверить тип поля (число мс или Timestamp) и индекс | Средний: проекция доступа | Ядро |
| 9 | 44 callable «в коде без вызовов», 19 триггеров без событий | 0 (простой бесплатен) | 0 | Разбор с Ядром: мёртвые — удалить код и функции; это скорость деплоя и холодного старта (меньше бандл), а не деньги | Низкий | Ядро |
| 10 | Storage egress 3,7 ГБ/нед | ≈ 0–1 | ≈ 0 | `Cache-Control: public, max-age=31536000, immutable` на неизменяемых ассетах (аудио, арт), предзагрузка головы пачки | Низкий | Ядро/Темы |
| 11 | Логи, Artifact Registry | 0 | 0 | Не трогаем (в бесплатных пределах) | — | — |

**Итого Firebase:** сейчас ≈ 43–46 $ → после п. 1–8 ≈ **5–8 $/мес (≈ 0,15–0,25 €/день)** на текущей аудитории; при 10 000 активных — укладывается в 0,30 €/день только при выполнении п. 2 и п. 5 (≤ 40 чтений и ≤ 8 вызовов на пользователя в сутки).

Порядок: (а) сборка 18.10 — п. 2, 5 (клиент), 3–4 (клиентская часть); (б) после выхода сборки — п. 1 (EU-регион, двойной деплой), п. 7, 8; (в) п. 6 — по решению координатора сразу (обратимо).

Команда для п. 6 (обратимо): `gcloud firestore backups schedules delete <id> --database='(default)'` + `gcloud firestore backups schedules create --database='(default)' --recurrence=weekly --day-of-week=SUN --retention=14d`.

(Клиентский аудит — `docs/work/tasks/firebase-client-cost-audit-2026-10-17.md` — сведу сюда, когда файл появится.)


## 8. Полный деплой functions — ОТЛОЖЕН до выхода релиза (владелец 17.10, вечер)
- Владелец (прямо в сессии Ревизора): «подожди с полным деплоем… после того, как выпустим версию в релиз, тогда сделаем полную выкатку всего. Пока не ломаем то, что в продакшене. Только аккуратно.»
- До этого действует прежнее правило: **только адресный деплой без `--force`**, список «НЕ УДАЛЯТЬ» выше в силе.
- Подготовлено к полному деплою после релиза:
  - сборка functions зелёная (`npm --prefix functions run build`, починка `__DEV__` — 0f25d0ca5);
  - полный деплой удалит **63 функции** вне HEAD (список с gs-путём и generation — `docs/work/tasks/firebase-fulldeploy-would-delete-2026-10-17.tsv`), их архивы уже скопированы в `gs://gcf-v2-sources-1047658658799-us-central1/_revizor_backup_fulldeploy_2026-10-17/<имя>/`;
  - внимание при деплое: 9 функций с меткой кодовой базы `content` (`learningV2CourseReleasedSessionGetV3` и др.) теперь экспортируются из `default` — возможен конфликт кодовых баз, план: сначала удалить content-копию, затем выложить default.


## 9. Сведение с клиентским аудитом (`docs/work/tasks/firebase-client-cost-audit-2026-10-17.md`)
Клиент сейчас: ≈ 22 вызова функций + 5 прогревов + ≈ 600 чтений + ≈ 35 записей за сессию → ≈ 265 €/мес при 10 000 активных. Топ-15 → ≈ 41 €; «один вызов на сессию» + бесплатные квоты → ≈ 8–12 €/мес (≈ 0,27–0,40 €/день).

Единая очередь (серверное — Ревизор/Ядро, клиентское — по раздаче координатора):
| Порядок | Пункт аудита | Пункт раздела 7 | Суть | Зона |
|---|---|---|---|---|
| 1 | п. 5 прогревы | B10 | греть по намерению, ≤ 1 раз/30 мин, флаг `dialogue_warmup_enabled` | клиент, сборка 18.10 |
| 1 | п. 6 сообщения/уведомления | — | дайджест ленты + `updatedAt > last` | сервер (дайджест) + клиент |
| 1 | п. 3 каталоги | 5 | JSON-дайджест на CDN, версия в `remote_config/app` | сервер + клиент |
| 1 | п. 9 рассылки, п. 15 опрос | 2 | в `remote_config/app` | сервер + клиент |
| 1 | п. 8, 11 друзья | 5 | лайки на диске, TTL 30 мин, без `force` | клиент (+ сервер для п. 11) |
| 1 | п. 14 воронка пейвола | B9 | в аналитику | клиент + админка |
| 2 | п. 4 `authEnsureStableLink` 🔒 | 2 (A2) | память на диске 7 дней + проверка после «патч не пуст» | Вход, с тестами |
| 2 | п. 7 профиль | 2 (A4) | пропуск без изменений < 7 дней | Вход/Ядро |
| 2 | п. 13 Пик | — | без 5-мин интервала, отправка при уходе | клиент |
| 3 | п. 1 журнал «Ошибок» 🔒 | 3 (A3) | серверный счётчик, листать при расхождении | после релиза, сперва логи |
| 3 | п. 2 конец урока 🔒, п. 10 награды 🔒 | — | пакет «итог сессии» | после релиза |
| — | регион EU | 1 | горячие функции в `europe-west1` | после релиза, двойной деплой |

Старые сборки (1.6.24): прод-цифры сейчас в основном от них. После полного деплоя удалённая функция (например, `videoWatchRunesClaim`) отвечает быстрым 404 от Cloud Run без запуска контейнера — оплачиваемого времени нет; клиентские повторы старой сборки — это лишь сетевые запросы. Ускорить уход старых версий — `min_app_version` после релиза.


## 10. Сборка 18.10 против ТЕКУЩЕГО прода (без полного деплоя) — проверка вызовов
Метод: все имена функций, которые клиент HEAD упоминает строкой (app/ components/ hooks/ modules/ constants/), против `gcloud functions list` (466). Клиент упоминает **111** функций (из них 1 ложное — слово `less`).

### В проде НЕТ (12) → «нужен адресный деплой до релиза»
| Функция | Кто зовёт в сборке | Достижимо? | Что будет без неё | Риск адресного деплоя |
|---|---|---|---|---|
| `legacyBonusConvertMine` | `app/legacy_bonus_client.ts:165` ← `LegacyBonusWelcomeHost` на Главной (`home.tsx:2836`), D195 | **да, на Главной** | обмен старых бонусов в монеты (D195) не произойдёт, окно приветствия получит ошибку | средний: деньги (монеты) — новая функция, в проде её не было; нужен прогон сторожей кошелька |
| `onboardingLevelRecord` | `app/onboarding_level_stats.ts:34` ← `CleanOnboarding.tsx`, `home.tsx` | **да** | статистика уровня онбординга не пишется (раз на человека); экран не ломается, если ошибка проглатывается с логом | низкий: только счётчик |
| `communityAuthorRemoveCard` | `app/community_packs/publishedPackCardRemoval.ts:165` (очередь на диске) | да, автор удаляет карточку из опубликованного набора | карточка не удалится на сервере; очередь будет повторять | низкий/средний: правка опубликованных наборов |
| `submitLearningV2ActivityReleasedSessionV2` | `app/learning_v2_activity_released_submission_sync_v2.ts` | **нет** (модуль никто не импортирует) | — | не нужен |
| `accountAuthority*` (4), `accountsV2MigrateMine/PullMine/SyncApply` | `modules/account-authority-v2`, `modules/account-session-v2` | **нет**: `accounts_v2_client_enabled=false`, аренды зашиты в `false` | — | не нужен (не включать флаги без деплоя) |

Адресный деплой этих трёх — `firebase deploy --only functions:legacyBonusConvertMine,functions:onboardingLevelRecord,functions:communityAuthorRemoveCard` (новые функции, существующие не трогает; без `--force`). Предусловие — зелёная сборка functions (есть, 0f25d0ca5). Решение — владельцу утром.

### R103 — `reEngagePushCron`: в проде старая версия (проверено 17.10, только чтение)
- Прод: Scheduler `0 10 * * *` UTC, функция выложена 13.10 06:32 UTC (исходник `reEngagePushCron/function-source.zip`, generation 1791873084543420), то есть ДО e8315d20a (13.10 18:02) и 6de07c0b9.
- В проде тихие часы 22:00–09:00 есть, но только по поясу устройства (`pushTokenTimezone`). Если пояса нет — берётся UTC, запасного пояса по языку нет, журнала `[REENGAGE-TZ]` и счётчиков `quietSkipped` нет.
- Последствие: в 10:00 UTC в Америке (UTC−5…−8) 02:00–05:00 — тихие часы. Пуши «вернись / серия ждёт» туда не уходят никогда; в UTC+12+ тоже.
- HEAD: `0 10,22 * * *` UTC + пояс устройства → по языку → UTC (functions/src/index.ts:464).
- Адресный деплой: `firebase deploy --only functions:reEngagePushCron` (обновит и функцию, и расписание Scheduler; без `--force`). Риск низкий: повтор в пересечении прогонов гасит cooldown 2 дня; деньги не трогает. Стоимость: +1 прогон ≈ +450 чтений/сут сейчас. Удешевление — A10 в §7 п. 8, после релиза. Решение владельцу утром.

### В проде ЕСТЬ, но код изменился после выкладки (45 из 99 по файлам)
Разбор совместимости (17.10, вечер). Метод: исходники каждой функции скачаны из прода и сравнены с HEAD и с тем, что шлёт и ждёт клиент HEAD. Пп. 1–3 Ревизор перепроверил сам по скомпилированному коду прода, пп. 4–6 — по отчёту помощника, не перепроверены.

| # | Функция | Что не сходится | Что будет у человека со сборкой 18.10 | Лечение | Риск лечения |
|---|---|---|---|---|---|
| 1 | `levelSpinStarGrant` (прод 02.09) | прод требует точный набор ключей без `promotionEligibility` (`lib/functions/src/level_spin_star_grant.js:83-95`), клиент с 20.09 шлёт его всегда (app/level_spin_star_grants.ts:2173) → `invalid-argument level_spin_star_composite_invalid` | **монеты за репорты и «Дневной путь» не зачисляются на сервере**, операции висят в очереди | адресный деплой `functions:levelSpinStarGrant` (HEAD принимает поле как необязательное — старые сборки тоже проходят) | средний: деньги — прогнать сторожей кошелька |
| 2 | `authRequestRecoveryCode`, `authConfirmRecoveryCode`, `authRequestCleanInstallRecoveryCode`, `authConfirmCleanInstallRecoveryCode`, `authIssueRecoveryHandoffToken`, `authCompleteRecoveryHandoff` | `if (!request.app) throw 'app_check_required'` — и в проде, и **в HEAD** (functions/src/auth_recovery.ts:133, :1677); клиент без App Check с 4a1c787b4 (01.10) | **восстановление аккаунта по коду не работает** в сборке 2.0 (старые сборки с App Check — работают) | правка кода как в auth_identity.ts:2448 (не голое снятие проверки) + адресный деплой; ревью безопасности | высокий: вход/захват аккаунта — только владелец Входа + security-review |
| 3 | `submitLearningV2CourseSessionCompletedV1` (прод 04.09) | прод: 10…22 ответа (`course_session_device_run_v1.js:330-331`), HEAD: до 35. В выпуске 1..205 — **23 занятия > 22** (L01 s01–s27, макс. 28 у s08) | итог занятия отвергается навсегда; очередь (app/learning_v2_course_session_completed_sync_v1.ts:132-159) встаёт на первом отказе → **ни одно следующее занятие не уходит на сервер**; каждый прогон пишет `critical` в Firestore | адресный деплой `functions:submitLearningV2CourseSessionCompletedV1` (зовёт только V2 = только 2.0) | низкий |
| 4 | `submitFeedbackEntry` | в проде нет `kind="learning_v2"` → `kind_invalid` | отзыв с итога занятия V2 не отправляется | адресный деплой | низкий |
| 5 | `premiumDialogSend` | клиент требует `resetAtMs`, `quotaVersion`; прод их не отдаёт; прод знает только en/fr | режим «компаньон» падает всегда; для es/de ответы по-английски | адресный деплой вместе с `premiumDialogStream`/`Translate` — проверить старые сборки | средний: ИИ-диалоги и квоты, их зовут и старые сборки |
| 6 | `premiumDialogTranslate` | прод игнорирует `direction`, не отдаёт `variants` | «Как сказать…» не работает | как п. 5 | средний |
| 7 | `legacyBonusConvertMine`, `onboardingLevelRecord`, `communityAuthorRemoveCard` | нет в проде | см. таблицу ниже — переживает мягко | адресный деплой (R103) | см. выше |

Под вопросом (не ломает сразу): `premiumDialogStream` — es/de по-английски; `mistakePracticeSyncEvents` — в проде нет `'it'`; Пик W43 (с 19.10 рейтинг по монетам) — старый крон не пишет `ladder`/`promotionLineCoins`, нужен деплой или откат через конфиг до 19.10; кошелёк required-session — прод строже (только старый путь).
Совместимы (проверено): имена, друзья, удаление аккаунта, вход и склейка, `spireJoinRoom`/`spireReportSteps`, рефералы, опросы, сообщество (кроме п. 7), `dialogueV2*`, `premiumDialogReview`, `explain*`, согласия, отчёты, `progress*`, промокоды, `coinReconcileV1`, `practiceRuneGrant`.

**Предложение владельцу на утро (R103, адресно, без `--force`, по одной функции, с проверкой журнала после каждой):** `levelSpinStarGrant`, `submitLearningV2CourseSessionCompletedV1`, `submitFeedbackEntry`, `reEngagePushCron`, `legacyBonusConvertMine`, `onboardingLevelRecord`, `communityAuthorRemoveCard`. Отдельно и не ночью: ИИ-диалоги (пп. 5–6) и восстановление аккаунта (п. 2, сперва правка кода).

### R103 — ОБЯЗАТЕЛЬНЫЙ способ выкладки: только из `git archive HEAD` (координатор 17.10; пробная сборка Ревизора 17.10 — зелёная)
Всегда, даже если рабочее дерево чистое: в общем дереве лежит чужая незакоммиченная работа (Codex, Вход и др.), её не трогаем и в прод не везём.
1. Зафиксировать коммит: `C=$(git -C /c/appsprojects/phraseman rev-parse HEAD)`; записать `$C` в журнал выкладки.
2. Чистая копия в отдельную папку (это не worktree и не ветка):
   `D=/c/Temp/claude/deploy_${C:0:9}; mkdir -p $D && git -C /c/appsprojects/phraseman archive $C -- . ':(exclude)docs' ':(exclude)assets' ':(exclude)ART_STYLE_FOR_CODEX' ':(exclude)asset_sources' ':(exclude).dev-screens' ':(exclude).codex-tmp-local-inventory.txt' | tar -x -C $D`
   (`content/` и `knowly-www/` нужны сборке: проверка пулов Пика и контекст поддержки.)
3. Зависимости — ссылками на установленные, только если файлы блокировки в HEAD совпадают с рабочими (`git -C /c/appsprojects/phraseman diff --quiet HEAD -- package-lock.json functions/package-lock.json`), иначе `npm ci --prefix functions` в `$D`:
   `cmd //c "mklink /J <D>\node_modules C:\appsprojects\phraseman\node_modules"` и то же для `functions\node_modules`.
4. Выкладка из `$D` с режимом архива (иначе сборка контекста поддержки требует `.git` и падает — проверено):
   `cd $D && PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 PHRASEMAN_SUPPORT_RELEASE_COMMIT=$C firebase deploy --only functions:<имя>[,functions:<имя>] --project phraseman-ea0b3` — без `--force`.
   `node_modules` в выгрузку не попадает (правило игнора firebase по умолчанию).
5. Уборка: СНАЧАЛА снять ссылки `cmd //c "rmdir <D>\node_modules"` и `cmd //c "rmdir <D>\functions\node_modules"`, ПОТОМ `rm -rf $D`. Обратный порядок удалит node_modules самого репозитория.
Пробная сборка (17.10, 0cb2d532c, без выкладки): `npm --prefix functions run build` в такой копии — зелёная, `functions-runtime-parity` совпал.

### R103-0 — ПЕРВЫМ: ИИ-диалоги `premiumDialogSend` + `premiumDialogStream` + `premiumDialogTranslate` (чинит текущий прод)
- Что сломано сейчас у людей: в сторе 1.6.24 (с 22.09) и в 2.0 сценарные диалоги и компаньон не показывают ответ — клиент требует `resetAtMs`/`quotaVersion` с 1.6.22, а прод их не отдаёт. «Как сказать…» всегда ошибка. es/de отвечают по-английски. Квота списывается, OpenAI оплачен. Перепроверено Ревизором: af76518ac ai_dialog_daily_quota.ts:46-56 и ai_dialog_stream_client.ts:56-61; в прод-исходниках Send и Stream `quotaVersion` 0 вхождений.
- Совместимость HEAD со старыми сборками — таблица Моментов выше. Ревизор выборочно проверил: 1.6.24 шлёт `studyTarget` только en/es/de/fr, а при `unknown` экраны диалогов закрыты — строгий `resolveDialogueStudyTarget` HEAD её не отвергнет.
- Меняется для старых сборок, решает владелец: Free 30 ответов в месяц вместо 10 в день (D111); потолок Plus с кодом `plus_daily_cap` старые покажут общим текстом. `premiumDialogReview` НЕ трогаем.
- Команда (по способу выше, три вместе — у них общий контракт квоты): `firebase deploy --only functions:premiumDialogSend,functions:premiumDialogStream,functions:premiumDialogTranslate --project phraseman-ea0b3`.
- Проверка после:
  1. `gcloud functions describe` → у всех трёх ACTIVE и свежий `updateTime`;
  2. журнал ERROR за 15 мин пуст;
  3. Сверка на эмуляторе 2.0: один ответ en и один es в сценарии, «Как сказать…» отдаёт варианты, ответ es по-испански;
  4. по возможности один ответ на телефоне с 1.6.24.
- Откат — пересборка из прежних исходников: Send `gs://gcf-v2-sources-1047658658799-us-central1/premiumDialogSend/function-source.zip#1789672329852868` (callable, 512Mi), Translate `…/premiumDialogTranslate/function-source.zip#1789376455876702` (callable, 256Mi), Stream `…/premiumDialogStream/function-source.zip#1792260767122293` (onRequest, 512Mi, 60 с). Команда: `gcloud functions deploy <имя> --gen2 --region us-central1 --runtime nodejs22 --entry-point <имя> --source <gs-путь> --trigger-http --memory <…> --quiet`. Откат вернёт и поломку — только при новой, худшей ошибке.

### R103 — утренний порядок адресной выкладки (готовит Ревизор; выкладка только после «да» владельца в чате Ревизора)

Общее для каждой строки:
- Перед первой: `git pull` не нужен — общее дерево. `npm --prefix functions run build` идёт сам (predeploy вместе со сторожем `functions_runtime_parity_gate`).
- Команда: `firebase deploy --only functions:<имя> --project phraseman-ea0b3` — без `--force`, по одной.
- ⚠️ **Предусловие — чистый код функций.** `firebase deploy` собирает и выгружает весь `functions/` (и общий `modules/`) из РАБОЧЕГО дерева, а оно общее для всех сессий: 17.10 вечером там чужие незакоммиченные правки `functions/src/auth_recovery.ts`, `content_factory/*`, `modules/learning-v2/.../factory_native_*.generated.ts`. Перед выкладкой: `git status --short functions/ modules/` пусто. Если не пусто — собрать из `git archive HEAD functions modules firebase.json …` в отдельную папку в C:\Temp и выкладывать оттуда (это не worktree и не ветка), чтобы в прод не уехал чужой недоделанный код.
- После каждой: `gcloud functions describe <имя> --gen2 --region us-central1 --project phraseman-ea0b3 --format="value(state,updateTime,serviceConfig.availableCpu)"` → ACTIVE и свежее время. Плюс `gcloud logging read 'resource.labels.service_name="<имя в нижнем регистре>" AND severity>=ERROR' --freshness=15m --project phraseman-ea0b3` — пусто.
- Откат: исходник прежней версии лежит в `gs://gcf-v2-sources-…/<имя>/function-source.zip` (generation в §10 и tsv) — пересборка как в шаге 2 (`gcloud functions deploy … --source gs://…`).

| # | Функция | Что сломано без неё у людей (сборка 2.0) | Особая проверка после | Риск |
|---|---|---|---|---|
| 1 | `submitLearningV2CourseSessionCompletedV1` | итоги 23 занятий урока 1 (> 22 ответов) отвергаются навсегда; очередь встаёт, итоги ВСЕХ следующих занятий не доходят до сервера | в журнале нет `invalid-argument`; на тестовом телефоне пройти L01 s08 (28 ответов) → `[V2-…session_completed_sync]` drained | низкий: зовёт только 2.0 |
| 2 | `levelSpinStarGrant` | монеты за жалобы и «Дневной путь» не зачисляются (`level_spin_star_composite_invalid`) | `[COIN-WALLET]` source=report_reward/daily_journey без reject | средний (деньги). **Только после выхода 2.0:** в HEAD белый список (coin_wallet_policy.ts:44-45, D148) — старые сборки из стора получат отказ на спины, квесты и компенсацию подарков. Это решение D148, но выкладывать не раньше релиза |
| 3 | `submitFeedbackEntry` | отзыв с итога занятия V2 не отправляется (`kind_invalid`) | журнал без ошибок; отзыв с итога V2 доходит | низкий |
| 4 | `reEngagePushCron` | пуши «вернись / серия ждёт» не доходят до Америки и UTC+12+ (один прогон 10:00 UTC) | `gcloud scheduler jobs describe firebase-schedule-reEngagePushCron-us-central1 --location us-central1` → `0 10,22 * * *`; в 22:00 UTC — строка `reEngagePushCron {…}` | низкий; +≈450 чтений/сут |
| 5 | `legacyBonusConvertMine` | старые бонусы 1.x не превращаются в монеты, окна «Встречайте 2.0» нет (сейчас 404 на старте) | ⚠️ выключатель `remote_config/app.bools.legacy_bonus_enabled` в проде **не задан** → после выкладки функция отвечает `disabled`, ничего не начисляет. Включение — отдельное «да» владельца (деньги) | низкий при выключенном флаге |
| 6 | `onboardingLevelRecord` | статистика экрана уровня не пишется, ответ висит в pending | журнал без ошибок | низкий |
| 7 | `communityAuthorRemoveCard` | автор удаляет карточку из опубликованного набора → через 6 неудач она возвращается с тостом «нет связи» | журнал без ошибок | низкий/средний (правка опубликованного) |

Не в этом списке (отдельно, не ночью): восстановление аккаунта по коду (п. 2 таблицы выше — сначала правка кода Входа и security-review Ревизора); ИИ-диалоги — ниже.

### R103-TTL — выкладка `firestore:indexes` (проверено 18.10 Ревизором, прод только на чтение)

- `firebase firestore:indexes` (прод) против `firestore.indexes.json` @ 63cc84ceb:
  - составные индексы совпадают 77 = 77;
  - у 80 общих fieldOverrides расхождений 0;
  - в файле лишние только 2 новые TTL `auth_recovery_rate_limits.expireAt` и `auth_recovery_clean_rate_limits.expireAt`.
- ⚠ **В проде есть 6 TTL-политик, которых нет в файле:** `english_test_attempts`, `english_test_clients`, `english_test_completion_rate_limits`, `english_test_daily`, `english_test_rate_limits`, `english_test_report_rate_limits` (поле `expiresAt`, ttl:true). Выкладка `--only firestore:indexes` спросит, удалить ли их. Ответ «Y» выключит TTL у данных теста английского.
- Безопасный путь до релиза: две новые TTL включить в Console (Firestore → TTL) и индексы не выкладывать.
- Перед любой выкладкой индексов: дописать эти 6 переопределений в файл, скопировав из прода (`firebase firestore:indexes` → `fieldOverrides`), чтобы файл совпадал с продом и вопроса не было.

### R103-Пик — неделя W43 с 19.10 (проверено 17.10, только чтение)
- `config/spire_v1` в проде: поля `rankBy` нет (ключи: coins, enabled, integrity, residents, schemaVersion, timer, updatedAtMs, updatedByUid; обновлён 11.10). Правило `spireEffectiveRankBy` (functions/src/spire_config_contract.ts:174-175, клиент modules/spire/config_contract.ts) даёт «монеты» только при `rankBy==='coins'` и неделе ≥ W43. Значит и клиент 2.0, и прод-крон считают **по ступеням** — расхождения нет.
- **Решение: ничего не делать — ни деплоя, ни отката.** Откатывать нечего. Главное — НЕ ставить `rankBy='coins'`, пока не выложены из HEAD `spireFinalizeCron`, `spireJoinRoom`, `spireReportSteps`, `adminSpireConfigSet` (прод от 11.10, кода `rankBy` в нём нет). Иначе игрок увидит места по монетам, а итог и награды (300/200/150 монет за места, 100 за повышение) посчитаются по ступеням.
- ⚠️ Прод `adminSpireConfigSet` перезаписывает документ целиком: тумблер Пика в админке сотрёт `rankBy`, если его поставить скриптом до выкладки.
- Режим монет включать после выкладки этих четырёх, с ещё не начатой недели.

### R103-AI — `premiumDialogSend` / `premiumDialogTranslate` / `premiumDialogStream` (перепроверено Ревизором)
- Прод: Send выложен 17.09, Translate 14.09, Stream — код того же времени (17.10 только пересборка доли ядра из своего архива).
- `premiumDialogSend`: прод не отдаёт `resetAtMs`/`quotaVersion` (src/premium_dialog.ts:1143, `quotaVersion` 0 вхождений), а клиент с 30.09 (1e2f77929, D111 месячный лимит) без них отбрасывает ответ — `dialog_response_invalid` (app/ai_dialog_client.ts:128-139, :431; app/ai_dialog_daily_quota.ts:68-79). **Компаньон «Тео»** (только Plus, app/ai_companion_session.tsx:232) — ни одного ответа в 2.0, при этом сервер уже списал квоту и заплатил OpenAI.
- `premiumDialogTranslate`: прод не знает `direction` и не отдаёт `variants` → «Как сказать…» (DialogHowToSaySheet `direction: 'to_study'`) всегда в ошибке (`[DIALOG-HOWTO] empty variants`).
- Язык: прод разрешает только en/fr (`resolveStudyTarget`: `fr ? fr : en`), а 2.0 открывает диалоги на es/de (`DIALOGUE_OWNER_RELEASED_TARGETS = ['es','fr','de']`) → испанский и немецкий диалог отвечает по-английски (и Send, и Stream). В HEAD — `resolveDialogueStudyTarget` с es/de.
- Кого касается: только сборки ≥ 30.09 (2.0). Старые из стора разбирают прежний ответ.
- Лечение: адресный деплой трёх вместе. Риск средний: их зовут и старые сборки, а в HEAD квота месячная (D111) — нужна проверка владельца Диалогов, что старые сборки не ломаются (лишние поля в ответе и новая квота). Решение утром; без этого в 2.0 нерабочие компаньон, «Как сказать…» и es/de.

#### R103-AI: совместимость со старыми сборками (Моменты 17.10, только чтение кода)
**Сборки.** В сторе 1.6.24 (сборка 130, af76518ac, с 22.09; runtimeVersion 1.6.24 — OTA 2.0 туда не приходят). Выборочно 1.6.15 (0d1d9c80d). «Прод» = код на дату выкладки: Send eafbc2f87 (17.09), Stream dadd1990f (15.09), Translate 2cca4a291 (14.09; `direction` появился только 15.09 в 026697d6c).

**Главная поправка к пункту «Кого касается».** Требование `resetAtMs`/`quotaVersion` появилось в клиенте **не 30.09, а 20.09** (6c02e4088, 1.6.22): `parsePremiumDialogResponse` (af76518ac app/ai_dialog_client.ts:128-139) и `parseAiDialogQuotaObservation` (app/ai_dialog_daily_quota.ts:46-56). В 1.6.24 кадр `done` стрима проверяется так же и без текста-спасения → `dialog_quota_observation_invalid` (app/ai_dialog_stream_client.ts:56-75). Прод (Send :1135, Stream done :501-510) этих полей не отдаёт. **Значит, у пользователей 1.6.24 из стора сценарные диалоги и компаньон не получают ни одного ответа с 22.09, а квота списана и OpenAI оплачен** (резерв квоты до вызова модели и в проде, и в HEAD; возврата после успешного ответа нет). «Как сказать…» (DialogHowToSaySheet, `direction: 'to_study'`) есть и в 1.6.24 → тоже всегда ошибка. Деплой HEAD **чинит и 1.6.24**, а не только 2.0.

| Поле / поведение | Старая 1.6.24 (стор) | 1.6.15 | 2.0 (HEAD-клиент) | Прод-сервер | HEAD-сервер | Риск при деплое HEAD для старых |
|---|---|---|---|---|---|---|
| `studyTarget` в запросе Send/Stream/Translate | шлёт всегда (en/es/fr/de) | шлёт, по умолчанию `'en'` | шлёт всегда | мягко: fr→fr, остальное→en | строго en/es/fr/de, иначе `invalid-argument` | 🟢 нет: обе старые шлют допустимый код |
| `studyTarget` в прогреве (`warmupPing`) | шлёт | **не шлёт** | шлёт | прогрев без проверок | проверка до прогрева → `invalid-argument` | 🟢 у 1.6.15 падает только прогрев (холодный старт, без квоты и без экрана ошибки) |
| Поля привязки пака (`packVersion`…) | не шлёт | не шлёт | не шлёт | нет | любое присланное → отказ (манифест пуст) | 🟢 нет |
| Ответ Send: `ok, assistantMessage, model, remainingQuota` | обязательны | читает свободно | обязательны | отдаёт | отдаёт (ничего не удалено/не переименовано) | 🟢 |
| Ответ Send: `resetAtMs`, `quotaVersion` | **обязательны** (иначе ответ выброшен) | не читает | обязательны, `resetAtMs` = 1-е число месяца 00:00 UTC | **нет** | есть: Free — следующий месяц UTC; Plus — `remainingQuota: 0` + следующий месяц | 🟢 **чинит** 1.6.24 и 2.0; лишние поля старые терпят |
| Стрим `done`: `resetAtMs`, `quotaVersion` | обязательны, без спасения текста | не читает | обязательны, но текст спасается | **нет** | есть (H616-618) | 🟢 **чинит** |
| Стрим, не-en (es/fr/de) | печать по дельтам | — | — | всё как en | текст приходит целиком после проверки языка, без живой печати | 🟡 UX: у es/fr/de нет «печатает…», но ответ на нужном языке |
| `quotaVersion` монотонность | зеркало пишется только при строго большем | — | так же | — | `+1` на каждый ответ, при смене месяца не сбрасывается | 🟢 зеркало не залипает |
| Квота Free | зеркало «на день», экран лимита дня (константа 10) | — | месячная 30 | 10 в день | **30 в месяц** (миграция дневного счётчика при первом касании) | 🟡 смысл: исчерпав 30, человек со старой сборкой видит «лимит дня» до 1-го числа (зеркало держит `resetAtMs` следующего месяца). Это политика D111, не поломка |
| Квота Plus | `remainingQuota` не пишется в зеркало | — | без месячной квоты | `premiumCap − used` (200 в день) | `remainingQuota: 0` + тихий потолок 300 в день | 🟢 зеркало для Plus не пишется; 0 не закрывает доступ |
| Ошибка исчерпания Free | `resource-exhausted` + `dialog_free_limit` → стена дня | так же | → «Диалоги — часть Plus» + месяц | без `details` | с `details {remainingQuota, resetAtMs, quotaVersion}` | 🟢 старая сборка ещё и пишет зеркало из `details` |
| Ошибка потолка Plus | знает только `dialog_premium_cap` | так же | знает `plus_daily_cap` | `dialog_premium_cap` | **`plus_daily_cap`** (старого кода больше нет) | 🟡 старые покажут «слишком много сообщений подряд» вместо «лимит на сегодня», только после 300 ответов в день |
| Компаньон без Plus | сервер пускал по дневной квоте | — | только Plus | пускает | `dialog_plus_required` (callable `permission-denied`, стрим 403) до списания квоты | 🟢 старые классифицируют как стену Plus; квоту не тратит |
| Translate `direction` / `variants` («Как сказать…») | шлёт `to_study`, ждёт `variants` | нет функции | так же | **не знает** → всегда ошибка | знает, отдаёт `variants` | 🟢 **чинит** 1.6.24 и 2.0 |
| Translate обычный | `translation` | так же | так же | отдаёт | отдаёт + проверка языка (при сбое `dialog_provider_failed`) | 🟢 |
| Стрим: клиент закрыл посреди ответа | — | — | — | квота возвращается | **квота не возвращается** (H447-450) | 💸 мелко: оплаченный ответ не вернёт квоту; на старые не влияет |
| `premiumDialogReview` (не в пакете деплоя) | — | — | — | — | убрано `tutorMemory`, строгий `studyTarget` | ⚪ не выкладывается этим пакетом; если выкладывать — отдельная проверка |

**Вывод.** Ломающих изменений HEAD для старых сборок не найдено: ни одно поле ответа не удалено и не переименовано, все старые клиенты шлют допустимый `studyTarget`, лишние поля терпят. Отличия — смысловые (месячная квота Free, текст при потолке Plus, без живой печати на es/fr/de). Риск деплоя для 1.6.x — **низкий**, а польза больше, чем считалось: деплой возвращает ответы ИИ и «Как сказать…» пользователям 1.6.24 из стора, которые с 22.09 платят квотой за выброшенные ответы. Тестами-контрактами не подтверждалось (только чтение кода); перед деплоем — один вызов Send/Stream/Translate эмулятором на 1.6.24 и на 2.0 (en и es).

### Как клиент 18.10 переживает отсутствие трёх функций (проверено по коду)
| Функция | Что видит человек | Нагрузка |
|---|---|---|
| `legacyBonusConvertMine` | **ничего**: окно «Встречайте 2.0» показывается только после успешного начисления (`useLegacyBonusWelcome` → `visibleWelcome`). Отказ — лог `failed`, `ranThisProcess=false` (app/legacy_bonus_client.ts:233-236) | 1 быстрый 404 на старт, пока функции нет; монеты старых бонусов начислятся после её выкладки |
| `onboardingLevelRecord` | **ничего**: ответ кладётся в `PENDING_KEY`, повтор на Главной после первого кадра (app/onboarding_level_stats.ts, `home.tsx:1243`) | 1 быстрый 404 на старт до выкладки |
| `communityAuthorRemoveCard` | автор удаляет карточку → она скрывается сразу (оптимистично), запрос ждёт в очереди на диске; после **6 неудачных попыток** (по одной на вход/следующее удаление) карточка возвращается и показывается переведённый тост «нет связи» (app/flashcards_collection.tsx:1288-1293). 🟡 Причина в тексте неточная («сеть», а не «функция ещё не выложена») — но системного текста нет | очередь на диске, без опроса |
Вывод: системных ошибок пользователь не увидит; пострадает только смысл фич (бонус, статистика, удаление карточки) до адресной выкладки.
