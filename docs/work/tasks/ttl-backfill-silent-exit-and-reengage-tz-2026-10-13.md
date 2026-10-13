# Task packet: немой выход бэкфилла срока обращений; счётчик тихих часов крона пушей по поясам; два красных теста

Governance-ID: TG-22D68BBD6B9E
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~10:20 (Q2 после записи владельцем 09:48; владелец 10:20 «сначала посчитать» по reEngagePushCron)

## Outcome

- scripts/error_reports_ttl_backfill_2026-10-13.mjs: журнал page_fetch (до/после get, размер, мс), обработчики beforeExit/exit/
  unhandledRejection с причиной — «start» без «done/failed» больше невозможен; сухой прогон заново и сводка.
- functions/src/re_engage_push.ts: в сводке крона счётчик quietSkipped с разбивкой по смещению пояса (и сколько из них были бы
  кандидатами). Только счётчик, логика отбора не меняется. Выкладка — в день выхода (шаг 13а).
- Разбор красных тестов phone_state_legacy_inventory и gustav_french_notifications_target_isolation.

## Scope

In scope: скрипт бэкфилла (только логи), re_engage_push.ts + тест, реестр префиксов (если моё). Out of scope: запись в прод, выкладка,
код Codex.

## Architecture

No architecture change.

## Security and privacy

Вход — ADC владельца; ключи не читаются. Сводка крона — только количества, без uid.

## Technical debt

- Почасовой крон — решение после цифр quietSkipped.

## Verification

Сухой прогон бэкфилла; тест re_engage_push; точечные тесты.

## Rollback

Откат коммитов.
