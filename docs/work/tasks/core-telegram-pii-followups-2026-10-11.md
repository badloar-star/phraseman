# Task packet: Telegram — хвосты аудита приватности (§CORE-0160)

Governance-ID: TG-328EC41619CB
Status: In progress
Owner: 1 · ЯДРО (решения координатора 02:42 по §CORE-0159)
Related epic/enabler: §CORE-0158, §CORE-0159

## Outcome

Правило «в Telegram — ни почты, ни телефона, ни uid; публичный ник можно, кроме сбоев» записано
в стороже и выполняется во всех найденных местах:
- текст пользователя в `safetyFlag` — не длиннее ~300 знаков (полный — в админке);
- восстановление входа — «вход восстановлен, старых uid: N» без фрагментов id;
- дайджест Джарвиса — через общий фильтр (почта, телефон, секреты);
- мёртвые форматтеры `formatCriticalErrorAlert`, `formatContentReportAlert(Safe)` удалены.

## Scope

In scope: `functions/src/admin_alert_privacy.ts` (лимит детали), `functions/src/auth_recovery.ts`,
`functions/src/jarvis/telegram_digest.ts`, `functions/src/admin_alerts.ts` (+ тесты),
`functions/src/telegram_pii_guard.test.ts` (текст правила и новые проверки), `DEPLOY_NOW.md`.

Out of scope: рабочие каналы поддержки (`support_inbox`, `telegram_support`, `/orders`) — решение
координатора: оставить; ник в 44 несбойных типах — оставить (дизайн 07796c0d0).

## Architecture

Нет новой архитектуры: лимит по метке детали в существующем белом списке; дайджест Джарвиса
переиспользует `redactAdminAlertText`.

## Security and privacy

Сокращение персональных данных во внешнем канале. Политика не меняется (Telegram — внутренний
канал оператора).

## Technical debt

- Pay now: мёртвые форматтеры удалены вместе с тестами.

## Verification

functions jest: telegram_pii_guard, admin_alerts, admin_alert_privacy, admin_alert_context,
auth_recovery, тесты Джарвиса по дайджесту; точечная проверка типов.

## Rollback

Откатить коммит и выложить затронутые функции заново. Данные не меняются.
