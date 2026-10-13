# Task packet: предполётная проверка утренней выкладки (DEPLOY_MORNING_2026-10-13, блоки А, Б, Д, Е) — БЕЗ выкладки

Governance-ID: TG-3DE19DB6CD14
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~03:00)

## Outcome

Раздел «Предполётная проверка 03:xx» в docs/phraseman-2.0/DEPLOY_MORNING_2026-10-13.md:
1. сборка функций из чистого среза HEAD (как в документе; рабочая папка содержит чужую незакоммиченную ошибку TS) — rc и шаги;
2. каждая функция блоков А (dialogueV2TextTurn, dialogueV2SessionComplete, reEngagePushCron), Б (premiumExpiryReminderCron),
   Д (submitClientReport), Е (accountDeleteMine, accountDeleteWorker) есть в собранном functions/lib и экспортируется под именем
   из команды `--only functions:<имя>`; заодно В (4 admin-функции);
3. firestore.indexes.json (TTL error_reports.expireAt) — синтаксис и наличие правила локально, без эмуляторов;
4. тесты функций этих блоков.

## Scope

In scope: срез во временной папке, сборка, чтение lib, тесты functions, документ. Out of scope: firebase deploy, чтение ключей и
.env (в срез не копируются — сборке не нужны), эмуляторы, правки кода.

## Architecture

Срез `git -c core.autocrlf=false archive HEAD` в C:/Temp/phraseman_preflight/<hash> + переходы node_modules (как в документе);
сборка `npm --prefix functions run build` с PHRASEMAN_SUPPORT_RELEASE_ARCHIVE=1 и полным id. Уборка: сначала rmdir переходов, потом папка.

## Security and privacy

Ничего не выкладывается; ключи и .env не читаются и не копируются.

## Technical debt

- Contain: нет.

## Verification

rc сборки; список exports из lib/index.js против имён команд; JSON.parse индексов + наличие fieldOverrides error_reports.expireAt ttl;
тесты functions (точечно по файлам блоков).

## Rollback

Удалить раздел из документа; удалить папку среза.
