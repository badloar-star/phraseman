# Task packet: выкладка блоков А, Б, В, Д, Е по DEPLOY_MORNING_2026-10-13.md

Governance-ID: TG-078F2ADCE50A
Status: Done
Owner: Ядро (сессия 1)
Related: решение владельца 13.10 ~07:05 («Да, всё одним заходом», передал координатор) и прямое подтверждение владельца в сессии Ядра
(«Да, выкладывай А Б В Д Е»).

## Outcome

Прицельная выкладка из чистого среза HEAD: А — dialogueV2TextTurn, dialogueV2SessionComplete, reEngagePushCron;
Б — premiumExpiryReminderCron; В — adminTranslateMessage, adminCreateAppMessage, adminUpdateAppMessage, adminLaunchVipSurveyCampaign
и hosting:admin; Д — submitClientReport и firestore:indexes (TTL error_reports.expireAt); Е — accountDeleteMine, accountDeleteWorker.
После каждого блока — журнал функций и строка [DEPLOY-MORNING] (что ушло, rc, время) в документ выкладки.

## Scope

In scope: скрипт выкладки в scratchpad, раздел журнала в DEPLOY_MORNING_2026-10-13.md. Out of scope: блок Г (сайт),
backfill старых обращений (владелец не разрешал), опрос осколков (в день публикации, шаг 13а), полный deploy functions, --force.

## Architecture

No architecture change.

## Security and privacy

Ключи и functions/.env* не читаются — только копируются в срез. TTL обращений 30 дней уже описан в политике (98ff91799).

## Technical debt

- Старые обращения без expireAt TTL не тронет (backfill — отдельное решение владельца).

## Verification

firebase functions:log по каждой функции блока; describe updateTime; для Д — TTL-правило в индексах.

## Rollback

Предыдущая ревизия функции в Cloud Run; hosting:admin — Release history → Rollback; TTL — выключить в консоли Firestore.
