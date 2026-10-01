# PM-222 — план отключения серверных кронов (dependency plan)

Дата: 2026-09-30. Основание: D91 (сервер деплоим после релиза 2.0), D90 (чистка прода сразу после
релиза), D74/D78/D83 (Арена и лиги удалены), MAX запломбирован.

## 1. Кроны, код которых уже удалён, но которые крутятся на проде до пост-релизного деплоя

Получено сравнением `export`-ов расписаний в `functions/src/index.ts` на `0b9b33a4e` (до удаления)
и в текущем HEAD. Все они исчезнут одним деплоем кодбазы `default` — Firebase предложит удалить
функции, которых больше нет в исходниках.

| Крон | Домен | Кто производит данные (producer) | Что он потребляет (consumer) |
|---|---|---|---|
| `leagueFinalizeCron` | лиги | клиенты 1.6.x пишут недельные очки | итоги недели, повышение/понижение |
| `leagueResidentsTickCron` | лиги | — (сам генерирует ботов) | комнаты лиг |
| `computeLeaderboardStatsCron` | лиги/XP | клиенты 1.6.x (XP) | агрегаты таблиц |
| `resetWeeklyXpCron` | XP | клиенты 1.6.x (weekly XP) | обнуление недельного XP |
| `arenaV2CleanupHourly` | Арена | клиенты 1.6.x (матчи) | чистка зависших матчей |
| `recalcCoinExchangeRate` | обмен монет | — | курс обмена (удалён) |
| `maxLessonReminderCron` | MAX | — (раздел запломбирован 2026-09-04) | напоминания MAX |

## 2. Порядок (PM-222-A1: сначала producers/drain, потом consumers)

1. **Producers останавливает сам релиз 2.0.** Клиент 2.0 больше не пишет недельные очки, XP,
   матчи Арены (код удалён: D74/D78/D83, PM-055). Сервер в этот момент не трогаем (D91).
2. **Drain-окно.** Старые клиенты 1.6.x продолжают писать, пока не обновятся. Consumers в это время
   должны жить, иначе у них зависнут лига/Арена: `leagueFinalizeCron` должен ещё раз закрыть
   текущую неделю, `arenaV2CleanupHourly` — дочистить висящие матчи.
   Критерий конца окна: доля активных пользователей на 2.0 ≥ целевой (решает владелец,
   D90 «сразу после релиза»), и прошёл хотя бы один понедельничный `leagueFinalizeCron`
   после релиза.
3. **Отключение consumers** — один деплой кодбазы `default` без флага `--force` на ручном
   подтверждении списка удаляемых функций: в списке должны быть ТОЛЬКО функции из таблицы §1
   плюс callable Арены/лиг/подарков из D74/D78. Любая неожиданная функция в списке — стоп.
4. **Данные** (коллекции лиг/Арены/недельного XP) — не удаляются этим шагом; чистка по D90
   отдельной задачей после подтверждения, что ни один живой код их не читает.

`maxLessonReminderCron` и `recalcCoinExchangeRate` не имеют producers — их можно убрать тем же
деплоем без drain-окна.

## 3. Что обязано продолжить работать (PM-222-A2)

Проверено в текущем `functions/src/index.ts` — живые экспорты, в плане удаления их нет:

| Функция | Назначение |
|---|---|
| `accountDeleteWorker` (trigger), `accountDeleteRetryCron` (каждые 30 мин) | удаление аккаунта |
| `accountDeleteMine`, `accountDeleteEnqueue`, `accountDeleteCredentialStatus` | запрос удаления |
| `premiumExpiryCron` (сутки), `premiumExpiryReminderCron` (09:00) | истечение/напоминание Plus |
| `revenueCatShardsWebhook` (единственный вебхук RevenueCat — несмотря на имя, не удалять вместе с жемчугом D70), `revenueCatPremiumReconcileMine`, `adminAlertOnRevenueCatReceipt` | покупки и «Восстановить покупки» |
| `accountMergeOutboxRetryCron` (каждые 5 мин) | слияние аккаунтов |

Перед деплоем: сверить список удаляемых функций с этой таблицей — ни одна строка отсюда не
должна в него попасть.

## 4. Живые кроны после 2.0 и их такт (для PM-223)

| Крон | Такт | Запусков/мес | Чтений на пустой прогон |
|---|---|---|---|
| `adminAlertRecoveryCron` | 1 мин | ~43 200 | 3 (пустые запросы; терминальные события обнуляют `nextAttemptAtMs`/`leaseUntilMs`, в выборку не попадают — проверено 2026-09-30) |
| `youtubeCatalogSyncCron` | 5 мин | ~8 640 | зависит от `runYoutubeCatalogSync` + квота YouTube API |
| `accountMergeOutboxRetryCron` | 5 мин | ~8 640 | 2 |
| `supportOpsCron` | 10 мин | ~4 320 | диспетчер задач поддержки (почта, OpenAI) |
| `adminPushJobsCron` | 6 ч | ~120 | — |
| `webLeadNudgeCron` | 6 ч | ~120 | — |
| `accountDeleteRetryCron` | 30 мин | ~1 440 | — |
| суточные (digest, reEngage, premiumExpiry×2, userNotificationsCleanup, cleanupExpiredAppMessages, webActivationReminder, jarvis×2) | 1/сут | ~30 каждый | — |
| недельные (soc2, spirePack, spireZoneWarning, spireFinalize, jarvisKnowledgeReview) | 1/нед | ~4 каждый | — |

Кандидаты на удешевление (решение владельца, не делалось): `youtubeCatalogSyncCron` 5 мин →
15–30 мин (каталог видео не требует минутной свежести); `supportOpsCron` — проверить, что пустой
такт не вызывает OpenAI.

## 5. Код-проверка 2026-10-01 (без прода)

- `npx tsx tests/pm222_cron_dependency_plan.probe.ts` → PASS: 15 кронов удалённых фич (§1 + MAX,
  турниры, Help Board) не экспортируются из `functions/src/index.ts`; 11 функций §3 экспортируются.
- В коде снимать больше нечего: все живые расписания (`adminAlertRecoveryCron`, `youtubeCatalogSyncCron`,
  `supportOpsCron`, премиум, удаление аккаунта, Шпиль, уведомления, Jarvis) принадлежат сохраняемым
  возможностям (карта PM-221). Код турниров/MAX остаётся неэкспортированным (CLAUDE.md: модули
  `tournament_core`/`tournament_pool_publication` — зависимость Шпиля; MAX законсервирован).
- Не выполнено и делает владелец: drain-окно после релиза 2.0 и деплой кодбазы `default` со сверкой
  списка удаляемых функций с §3 (D91). Проба не заменяет `firebase functions:list` на проде.

## 6. Сверка с облаком (PM-007, 3f63c244d) — 2026-10-01

Облачный список снят ядром (только чтение): code 438 / cloud 516. Кроны и триггеры, которые
**крутятся в облаке, но кода в этой ветке нет** (полная выкладка `default` предложит их удалить):

| Функция | Тип | Почему кода нет | Что делать |
|---|---|---|---|
| `leagueFinalizeCron`, `leagueResidentsTickCron`, `resetWeeklyXpCron`, `computeLeaderboardStatsCron`, `leaderboardUpdateDailyAnalytics` | schedule | удалены намеренно: лиги/XP (D02, D78), снимок efe19ae9d | снять ПОСЛЕ drain-окна §2 — владелец |
| `arenaV2CleanupHourly`, `arenaV2OnQueueWrite` (триггер) | schedule / trigger | удалены намеренно: Арена (D74/D78), снимок efe19ae9d | снять после drain — владелец; до снятия триггер очереди Арены продолжает сводить матчи клиентам 1.6.x |
| **`activationEmailRetryCron`, `resendKeyHealthCron`** | schedule | **НЕ удалены намеренно.** Их код (`functions/src/email_delivery_watchdog.ts`, коммиты 3d3f7a824 + bcfbd5836, 21.09 — инцидент «почта умерла молча 3 недели») живёт ТОЛЬКО в ветке `claude/sad-cannon-876ae9` и в эту ветку не переносился. В облаке они есть, потому что деплой шёл из той ветки. | **🔴 СТОП перед полной выкладкой:** сначала перенести оба коммита в эту ветку (новый файл + 5 строк в `index.ts` + алерт в `web_checkout.ts` + чтение ключа Resend из Secret Manager в 5 файлах). Иначе деплой молча удалит сторожа почты активации — ровно тот класс бага, который он закрывал. |

`recalcCoinExchangeRate` и `maxLessonReminderCron` из §1 в облачном списке уже отсутствуют.

### 6.1 Три функции, удалённые из кода, но вызываемые клиентом

| Функция | Где вызов | Удалена | Жив ли путь клиента | Решение |
|---|---|---|---|---|
| `shardsApplyDelta` | `app/shards_system.ts:701` | efe19ae9d, намеренно: D70/D78 (жемчуг удалён; в коде это уже была отключённая заглушка) | Основной путь — локальный журнал (`client_shard_operation_ledger`); облачная ветка `addShards` помечена «retired, kept for archaeology». Живой остаток — только досылка СТАРОЙ очереди 1.6.x (`resumePendingShardDeltas` из `cloud_sync` и перед сменой аккаунта). Код `not-found` входит в `PERMANENT_SHARD_DELTA_REJECTIONS` → строка снимается, баланс сверяется, `pearl_retire_d70` обнуляет. Выход из аккаунта не блокируется. | Не возвращать. Удаление мёртвого клиента — отдельная задача (D78), не в этой пачке: `shards_system.ts` 2500 строк, завязан на вход/выход. |
| `aiDialogSyncPurchase` | `app/ai_dialog_ownership.ts:292` | efe19ae9d, намеренно: D124 (покупки диалогов за руны не учитываются) | **Мёртв:** `syncDialogPurchases` не вызывается нигде и первой строкой выходит по `DIRECT_RUNE_PURCHASE_RETIRED = true`. | Не возвращать. Хвост: `tests/runes_dialog_purchase_contract.test.ts:93` всё ещё ждёт экспорт в `index.ts` (красный со снимка) — убрать вместе с мёртвым клиентом отдельной задачей. |
| `resolveLearningV2CourseUnlockReceipt` (+ `authorizeLearningV2CourseUnlock`) | `app/learning_v2_owner_repository_runtime.ts:423` | efe19ae9d; в 03_DECISIONS прямой записи нет (по смыслу — открытие курса за звёзды, звёзды → монеты D03) | **Мёртв:** единственный вход `commitLearningV2AuthorizedCourseUnlock` нигде не вызывается; резолвер подключается к репозиторию, но срабатывает только из этого входа. | Не возвращать; вопрос координатору — подтвердить, что открытие курса за звёзды в 2.0 не нужно (тогда удалить клиентский хвост и `functions/src/learning_v2_course_unlock.ts`). |
