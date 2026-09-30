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
