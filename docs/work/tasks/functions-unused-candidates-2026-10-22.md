# Кандидаты на удаление: функции без вызовов 30 дней (22.10, Ревизор)

Только чтение, ничего не удалено. Удаление — только по «да» владельца.

## Как считалось

- В проде 447 функций, все gen2 (`gcloud functions list`, 22.10).
- Вызовы за 30 дней: большее из Cloud Run `request_count` (по service_name) и `cloudfunctions execution_count` (по function_name).
- «Есть в коде»: `export const <имя>` в `functions/src` или `functions-*/src`, либо имя есть в `functions/src/index.ts`.
- Ссылки: `git grep -w <имя>` по `app/ components/ hooks/ modules/ constants/ admin/ knowly-www/ web/ src/` (без тестов и архива).
- ⚠️ Версия 2.0 вышла 21.10. Ноль вызовов за 30 дней у функции, которую зовёт 2.0, ничего не значит, поэтому всё со ссылками в клиенте оставлено.
- ⚠️ Все кандидаты подключены в `functions/src/index.ts`. Удаление только в проде без правки index.ts откатит следующий полный деплой. Порядок: убрать экспорт в index.ts → коммит → `firebase functions:delete`.

## Итог

| Группа | Число | Решение |
|---|---|---|
| Нет в коде HEAD | 2 | `englishTestApi` ОСТАВИТЬ (6560 вызовов, живой сайт теста); `adminEnglishTestAnalytics` — 0 вызовов, кнопка в админке, спросить владельца |
| A. Пользовательские, 0 вызовов, нигде не вызываются | 6 | кандидаты на удаление |
| B. Админка, 0 вызовов, в админке ссылок нет | 35 | кандидаты; сначала подтвердить, что владелец не зовёт их из другого инструмента |
| C. Learning V2 / фабрика курса, 0 вызовов | 13 | НЕ трогать без Codex/Ядра — возможно, ещё не включённые части 2.0 |
| D. Похожие на внешние входы или фабрику контента | 20 | оставить до сверки с Codex (фабрика контента) |
| Оставить: триггеры и кроны | 16 | реагируют на редкие события |
| Оставить: есть ссылки в клиенте, админке или сайте | 126 | редкие действия или новые для 2.0 |
| Оставить: выложены < 30 дней назад | 1 | `emailUnsubscribe` — ссылка из писем |
| Остальные (были вызовы за 30 дней) | 228 | живые |

## A. Пользовательские — кандидаты

- `accountClaimMine`
- `exchangeCoinsForStars`
- `questClaimReward`
- `reportUserIdea`
- `updateUserIdea`
- `vipRevokeMine`

Скорее всего, это возможности 1.6, которых нет в 2.0 (квесты, обмен монет, идеи, отзыв VIP, захват аккаунта). Перед удалением Ядро подтверждает, что в 2.0 их нет.

## B. Админка — кандидаты

- `adminActivateQuest`
- `adminArchiveQuest`
- `adminCreateAssetJob`
- `adminCreatePlan`
- `adminDeactivateGlobalBroadcasts`
- `adminDeleteQuest`
- `adminDeleteShardSurvey`
- `adminExportReportDocuments`
- `adminExportUnresolvedReports`
- `adminGenerateDirectorDigestAudio`
- `adminGetCoinExchangeCenter`
- `adminGetCosmeticAssetArchive`
- `adminGetDailyBriefing`
- `adminGetDirectorDigest`
- `adminGetPlan`
- `adminListAppMessages`
- `adminListAssetJobs`
- `adminListAuditLog`
- `adminListOpsLog`
- `adminListPlans`
- `adminListReferrals`
- `adminListReportQueue`
- `adminListUserIdeas`
- `adminRelinkProvider`
- `adminRepairAuthLink`
- `adminRunAssetJob`
- `adminSearchUsers`
- `adminSetCoinExchangeRate`
- `adminSetCosmeticAssetSaleStatus`
- `adminSpinLogs`
- `adminSpinStats`
- `adminSupportSendReply`
- `adminUpdateGiftCertificateRecipient`
- `adminUpdateReportStatus`
- `adminWriteQuest`

В `admin/` (включая `admin/v2/legacy.html`) на эти имена нет ни одной ссылки. Это экраны старой админки или инструменты, вызываемые вручную. `adminSupportSendReply` и `adminRelinkProvider`/`adminRepairAuthLink` — ручные инструменты поддержки: спросить владельца отдельно.

## C. Learning V2 — не трогать без Codex/Ядра

- `adminActivateCourseRelease`
- `adminGetLearningV2CourseWorkspaceProjection`
- `adminGetV2OwnerGeneratorSetupCatalog`
- `adminGetV2OwnerGeneratorWorkspace`
- `adminImportV2OwnerEpisodeStage`
- `adminPrepareV2OwnerEpisodeDraft`
- `adminReviewCourseGeneration`
- `adminRollbackCourseRelease`
- `adminSaveV2EpisodeDraft`
- `adminSealCourseRelease`
- `authorizeLearningV2CourseUnlock`
- `finalizeLearningV2AccessPurchase`
- `finalizeLearningV2DelayedCandidate`

## D. Фабрика контента и похожие на внешние входы — оставить до сверки

- `adminConfirmV2OwnerEpisode`
- `adminControlContentStage`
- `adminCreateContentGenerationJob`
- `adminCreateContentStageBulkPlan`
- `adminCreateV2GenerationPlan`
- `adminEditContentStageArtifact`
- `adminGetContentFactoryJobDetail`
- `adminGetContentFactoryRolloutMetrics`
- `adminGetContentFactoryUnitPreview`
- `adminGetContentFactoryWorkspace`
- `adminGetContentStageCapabilities`
- `adminListContentFactoryJobs`
- `adminListContentStageDependencies`
- `adminMonthlyDecisionPack`
- `adminQueueV2GenerationPlan`
- `adminReferralHealth`
- `adminRunContentGenerationUnit`
- `adminSaveV2SeasonDraft`
- `adminSendPersonalAppMessage`
- `grantMistakeCorrectionReward`

## Откат

Перед удалением скопировать прод-архив каждой функции (`gs://gcf-v2-sources-…/<имя>/function-source.zip`) в отдельную резервную папку, как 17.10. Учесть, что на бакете теперь правило: старые версии старше 14 дней удаляются.
