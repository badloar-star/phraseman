# №45 шаг 2 — функции в проде, которых нет в коде 2.0 (21.10, Ревизор)

Метод (только чтение): `gcloud functions list` (470 в проде) минус имена из `functions/src/index.ts` → 41 сирота.
Для каждой: есть ли `export const <имя>` в `functions/src`, ссылки в `app/ components/ hooks/ modules/ constants/ admin/`
(без тестов и архива), запросы за 7 дней (Cloud Run `request_count`) и версии вызывающих (логи 18–21.10, user-agent).
Ничего не удалено. Удаление — только по команде координатора после сверки с 1 · Ядро и «да» владельца.

## Удаляем — 27 (кода нет, клиент 2.0 не зовёт; трафик только 1.6.x и Android okhttp)

| Функция | Запросов за 7 дн. | Кто зовёт | Заметка |
|---|---|---|---|
| arenaV2Home | 2690 | 1.6.19/1.6.24/Android | Арена старых клиентов |
| arenaExpansionHome | 2666 | 1.6.19/1.6.24/Android | Арена старых клиентов |
| welcomeGiftClaim | 439 | 1.6.17–1.6.24/Android | |
| levelRewardSpinStatus | 359 | 1.6.19/Android | |
| arenaV2CleanupHourly | 336 | Scheduler (раз в час) | удаление функции снимает и задание Scheduler |
| levelRewardSpinEnrollV1 | 318 | 1.6.19/Android | |
| friendGetActiveQuest | 254 | 1.6.19/1.6.24/Android | |
| leaderboardUpdateDailyAnalytics | 167 | 1.6.19/Android | |
| computeLeaderboardStatsCron | 14 | Scheduler 03:00 UTC | весь users+leaderboard каждую ночь; в админке остаётся мёртвая ссылка (legacy.html) |
| friendSendGift | 8 | старые | |
| seasonRedeemConsumable | 4 | Android | |
| arenaV2InviteStatus | 2 | старые | |
| resetWeeklyXpCron | 2 | Scheduler пн 00:00 | Ядру: проверить, что 2.0 не читает weekly_xp |
| levelGiftReserve | 1 | старые | |
| adminGetMaxVoiceOpsDashboard, adminListMaxVoiceFeedback, adminRefundCommunityPackPurchase, adminSetShardBalance, arenaStarStore, arenaV2DevFriendBotCreate, communityPurchasePack, friendThankGift, levelSpinActivatePackGift, maxVoiceConfigAdmin, statsInsightsGenerate, submitMaxVoiceFeedback, weeklyReviewGenerate | 0 | — | `arenaStarStore` в `app/runes_system.ts:9` — только комментарий; `communityPurchasePack` в админке — только текст подсказки |

## Оставляем — 14

- `englishTestApi` — 1952 запроса за 7 дн. от живого сайта английского теста (браузер, knowlyapps.com); деплоится своим workflow.
- `adminEnglishTestAnalytics` — аналитика того же теста в админке (`admin/v2/legacy.html`).
- 12 функций есть в коде (`functions/src/content_factory/*`, `learning_v2_course_unlock.ts`, `ai_dialog_sync_purchase.ts`, `league_groups.ts`),
  но не подключены в `index.ts` напрямую: `adminConfirmV2OwnerEpisode`, `adminGetV2OwnerGeneratorSetupCatalog`,
  `adminImportV2OwnerEpisodeStage`, `aiDialogSyncPurchase`, `authorizeLearningV2CourseUnlock`, `leagueActivateGroupBoost`,
  `learningV2ActivityAuxiliarySessionGetV1`, `learningV2ActivityReleasedSessionGetV1`, `learningV2CourseActiveCatalogGetV1`,
  `learningV2CourseReleasedSessionGetV2`, `learningV2CourseReleasedSessionGetV3`, `resolveLearningV2CourseUnlockReceipt`.
  Пять `learningV2*` и `resolveLearningV2CourseUnlockReceipt` упоминаются в клиенте 2.0 — решает 1 · Ядро / Codex (Learning V2).

## Не покрыто этим списком (шаг 2б, нужна сверка Ядра)

Функции, которые ЕСТЬ в `index.ts`, но нужны только старым клиентам (лига `league*`, `leagueFinalizeCron`, турнирные кроны
при `TOURNAMENTS_RELEASED = false`, `spire*` старой лиги и т.п.). Их удаление = правка `index.ts` + деплой, иначе следующий
полный деплой вернёт их обратно.

## Откат

Архивы всех 41 сироты лежат в `gs://gcf-v2-sources-1047658658799-us-central1/_revizor_backup_fulldeploy_2026-10-17/<имя>/`
(63 архива). Поэтому эту резервную папку удалять ПОСЛЕ удаления функций и недели тишины, не раньше.
Команда удаления (по команде): `firebase functions:delete <имена…> --region us-central1 --force`.
