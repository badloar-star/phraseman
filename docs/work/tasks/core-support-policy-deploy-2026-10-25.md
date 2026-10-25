# Ядро · выкладка функций поддержки с политикой автоответа (25.10)

Governance-ID: TG-419BDE8DB30A
Governance-ID: TG-8CE1340BD9C5

## Outcome
Владелец сказал «да» (через координатора) на выкладку 29c5c251a: functions/src/support_auto_reply_policy.ts — «как купить Plus» и «Plus из России»
→ ответ через Telegram-бот. Выкладываем ТОЛЬКО функции, которые этот модуль тянут (транзитивно), и только если в них между боем и HEAD
нет чужих невыложенных правок без «да» владельца.

## Scope
- Карта зависимостей functions/src (только чтение): кто импортирует support_auto_reply_policy → какие экспорты index.ts.
- Сверка «бой против HEAD» по этим функциям (scripts/check_live_functions_vs_head.mjs) + git log изменений их замыкания после прошлой выкладки.
- Выкладка из чистого снимка HEAD: scripts/deploy_from_clean_head.sh --only functions:default:<имена> --execute.

## Architecture
Тот же путь, что утренний пакет: git archive HEAD → сборка → firebase deploy --only адресно → check_callable_invoker.

## Security and privacy
Данных пользователей не касается; тексты ответа поддержки. Ключи и токены не печатаются. App Check не трогаем.

## Technical debt
Новой не добавляется. Если в замыкании функций найдутся чужие невыложенные правки — не выкладываем, пока координатор и владелец не решат.

## Verification
Сухой прогон (PASS) → --execute → журнал выкладки + [INVOKER-CHECK].

## Rollback
Revert 29c5c251a + та же команда --only.

## Дополнение: ложный СТОП сверки
check_live_functions_vs_head.mjs (b538d5d2a) не вырезал комментарии внутри export { … } — supportInboxOnNewMail с комментарием перед именем считался «не экспортируется». Починено: комментарии вырезаются до разбора имён.
