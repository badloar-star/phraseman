# Карта восстановления: живые функции прода без исходников

Дата замера: 2026-07-25. Проект `phraseman-ea0b3`.
Относится к гейту **F** плана [CODEX-HANDOFF-UNIFICATION-20260721.md](CODEX-HANDOFF-UNIFICATION-20260721.md).

> **Шаг D плана (порт фич в новую админку) ОТМЕНЁН.** Решение владельца 2026-07-25:
> вернуться на старую админку (`admin/legacy.html`), новая `admin/v2` будет удалена.
> Проверено: из 94 несведённых функций старая админка зовёт **2**
> (редактор «Опросы за осколки»), и владелец решил старую админку не трогать.
> Переносить в новую админку нечего и незачем.

## Суть проблемы

Прод собран частичными деплоями из 4–5 разных worktree. Поэтому в нём живут функции,
исходников которых в текущем рабочем дереве **нет**. Обычный
`firebase deploy --only functions` предложит **удалить каждую такую функцию** — то есть
снести работающий прод.

## Две разные категории (важно не путать)

Разбор по истории git показал, что «нет исходников» — это два непохожих случая:

**1. Удалено намеренно (15 функций).** Коммит `9af87817d` от 2026-07-16
«remove legacy user chat surfaces» — владелец удалил Help Board (9 функций) и
Compass-чат (2), вместе с клиентскими экранами и правками политики конфиденциальности.
Восстанавливать НЕ нужно. Погашены надгробиями — см. ниже.

**2. Никогда не было в основной линии (90 функций).** Ноль коммитов в истории `HEAD`.
Написаны в ветке `admin-language-factory`, отколовшейся 2026-07-10 (сейчас +145/−358
относительно нашей линии), и выложены на прод частичным деплоем. Это **не потеря, а
незавершённое слияние**. Интерфейса к ним нет нигде — ни в старой админке, ни в новой.

## Цифры (после гашения Help Board надгробиями)

| Показатель | Значение |
|---|---|
| Живых функций в проде | **389** |
| Покрыто исходниками | 313 (основной codebase 309 + english-test 4) |
| Осознанно удалено (чаты) | 4 |
| Принято как несведённое (решение владельца) | 94 |
| **Неожиданных сирот** | **0** ✅ |

Безвозвратно не потеряно **ничего**: все 94 найдены в снапшот-ветках.

## Надгробия Help Board и Compass-чата

`functions/src/help_board_decommission.ts` — 11 функций остаются задеплоенными,
но вежливо отказывают (`failed-precondition`), кроны и триггеры не делают ничего.
Приём тот же, что применён к Арене (`quiz_arena_decommission.ts`).

зачем: просто удалить их с прода нельзя — у пользователей со старой версией
приложения экран доски помощи начал бы падать с ошибкой соединения. Надгробия
снимаются вместе с функциями, когда старые версии клиента вымрут.

## Проверка

```bash
cd functions && npm run gate:functions-coverage
```

Гейт [scripts/functions_source_coverage_gate.mjs](../../scripts/functions_source_coverage_gate.mjs)
встроен в `npm run deploy` и падает раньше, чем CLI дойдёт до удаления функций.
Флаги: `--offline` (без сети, по кэшу), `--refresh` (обновить кэш), `--json`.

**Арена** удалена через tombstone-экспорты (`functions/src/quiz_arena_decommission.ts`) —
функции остаются задеплоенными и fail-closed, поэтому сиротами не считаются. Это правильно.

## Откуда восстанавливать, ЕСЛИ раздел когда-нибудь понадобится

Сейчас восстанавливать ничего не нужно — таблицы ниже справочные. Забирать точечно
(`git checkout <ветка> -- <файл>`) вместе с интерфейсом, когда конкретный раздел
реально потребуется.

### 1. `prod-snapshot/admin-language-factory-20260721` — 76 функций

Вся линия «операций» админки: превью → запрос апрува → апрув → применение.

| Файл | Функции |
|---|---|
| `admin_safety_moderation.ts` | adminApplySafetyModerationMutation, adminApproveSafetyModerationMutation, adminGetSafetyModerationSensitiveDetail, adminGetSafetyModerationWorkspace, adminPreviewSafetyModerationMutation, adminRequestSafetyModerationApproval, adminResumeSafetyModerationBulk |
| `admin_community_operations.ts` | adminApplyCommunityMutation, adminApproveCommunityMutation, adminGetCommunityOperationDetail, adminGetCommunityOperationsWorkspace, adminPreviewCommunityMutation, adminRequestCommunityApproval, adminResumeCommunityBulk |
| `admin_money_operations.ts` | adminApplyMoneyMutation, adminApproveMoneyMutation, adminGetMoneyOperationDetail, adminGetMoneyOperationsWorkspace, adminPreviewMoneyMutation, adminRequestMoneyApproval |
| `admin_content_operations.ts` | adminApplyContentMutation, adminApproveContentMutation, adminGetContentOperationDetail, adminGetContentOperationsWorkspace, adminPreviewContentMutation, adminRequestContentApproval |
| `admin_compass_control.ts` | adminApplyCompassChange, adminApproveCompassChange, adminGetCompassWorkspace, adminPreviewCompassChange, adminRequestCompassApproval |
| `admin_alerts_control.ts` | adminApplyAlertsConfig, adminGetAlertsWorkspace, adminPreviewAlertTest, adminPreviewAlertsConfig, adminQueueAlertTest |
| `admin_vip_survey_control.ts` | adminApplyVipSurveyCampaign, adminGetVipSurveyWorkspace, adminListVipSurveyResponses, adminPreviewVipSurveyCampaign |
| `admin_cache_control.ts` | adminExportCacheEntries, adminListCacheEntries, adminPreviewCacheReset, adminResetCacheEntry |
| `admin_app_health.ts` | adminExportAppHealth, adminGetAppHealthDetail, adminListAppActivity, adminListAppHealth |
| `admin_push_control.ts` + `.test.ts` | adminApprovePushCampaign, adminCancelPushJob, adminCreatePushJob, adminRequestPushApproval, adminListPushJobs, adminPreviewPushAudience |
| `admin_email_campaign_control.ts` + `.test.ts` | adminApproveEmailCampaign, adminCancelEmailCampaign, adminCreateEmailCampaign, adminRequestEmailCampaignApproval, adminListEmailCampaigns, adminPreviewEmailCampaign |
| `admin_email_campaign_worker.ts` | adminEmailCampaignCreated, adminEmailCampaignsCron |
| `admin_email_control.ts` | adminExportEmailContacts, adminListEmailContacts |
| `admin_voice_research.ts` | adminApplyVoiceResearchMutation, adminGetVoiceResearchWorkspace, adminPreviewVoiceResearchMutation |
| `admin_plus_control.ts` | adminApplyLegacyPlusMigration, adminGetPlusControlWorkspace, adminPreviewLegacyPlusMigration |
| `admin_manual_access.ts` | adminApplyManualAccess, adminPreviewManualAccess |
| `admin_diagnostics_archive.ts` | adminGetDiagnosticsArchiveDetail, adminListDiagnosticsArchive |
| `admin_safety_moderation.test.ts` | adminListSafetyModerationApprovals, adminListSafetyModerationHistory |

⚠️ План (§4 шаг D) требует брать отсюда **cherry-pick, а не полный мердж** — ветка на 294 коммита позади.

### 2. `prod-snapshot/all-development-integration-20260721` — 26 функций

| Файл | Функции |
|---|---|
| `help_board.ts` | helpBoardAddComment, helpBoardAdminModerate, helpBoardCompassRetryCron, helpBoardCreateTopic, helpBoardDeleteCompassAnswer, helpBoardDeleteMyTopic, helpBoardGenerateCompassForTopic, helpBoardReport, helpBoardVote |
| `index.ts` (вынести в модуль) | adminWebsiteInboxList, adminWebsiteInboxMarkRead, supportReplyDispatchSweeperCron |
| `language_release_content.ts` | getPublishedCourseSurfaceBundle, getPublishedCourseSurfaceEntry |
| `language_release.ts` | ~~getPublishedCourseRelease~~ — **УДАЛЕНА С ПРОДА 2026-08-27** по решению владельца: клиент потерян при графте, замена — `learningV2CourseActiveCatalogGetV1`. Исходник оставлен с надгробием, из allowlist гейта убрана. |
| `language_content.ts` | getPublishedLessonArtifact |
| `language_catalog.ts` | getActiveLanguageCatalog |
| `compass_chat_cron.ts` | compassChatDailyCron, compassChatRunNow |
| `admin_pm_callables.ts` | adminGenerateProductBrief, adminMutateProductItem |
| `admin_content_publish.ts` | adminPublishContentPack, adminRollbackContentPack |
| `admin_beta_testers.ts` | adminListBetaTesters, adminUpdateBetaTester |
| `admin_youtube_analytics.ts` | adminYoutubeAnalytics |

### 3. `prod-snapshot/admin-integrated-20260716-20260721` — 2 функции

| Файл | Функции |
|---|---|
| `admin_landing_experiment.ts` | adminGetLandingExperimentReport |
| `agent_office/telegram_publication_trigger.ts` | agentOfficeTelegramPublishRecommendation |

### 4. `prod-snapshot/agent-manager-digest-integration-20260721` — 1 функция

| Файл | Функции |
|---|---|
| `agent_manager/daily_digest_recommendation.ts` | agentManagerRecommendCriticalDigest |

## Осознанно удалено — НЕ восстанавливать

`leagueChatAuthorizeRoom`, `leagueChatDeleteMessage`, `leagueChatReportMessage`,
`leagueChatSendMessage` — чаты удалены намеренно (коммит `e6351db4e`, решение владельца §3.2).
Зафиксированы в списке `INTENTIONALLY_REMOVED` внутри гейта.

## Как восстановить один файл

```bash
git checkout prod-snapshot/all-development-integration-20260721 -- functions/src/help_board.ts
```

Затем добавить экспорт в `functions/src/index.ts`, собрать и проверить гейтом:

```bash
cd functions && npm run gate:functions-coverage
```

## До завершения восстановления

**Полный `firebase deploy --only functions` запрещён.** Только явные списки:

```bash
firebase deploy --only functions:имя1,functions:имя2
```
