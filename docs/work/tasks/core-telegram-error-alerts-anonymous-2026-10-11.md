# Task packet: оповещения о сбоях в Telegram — без ника и без uid

Governance-ID: TG-1F33FB5D5454
Status: In progress
Owner: 1 · ЯДРО (решение координатора 02:28 по §CORE-0158)
Related epic/enabler: §AUTH-0230, §CORE-0158

## Outcome

Оповещения о сбоях в Telegram (`criticalError`, `appErrorDigest`, `paymentWebhookFailure`) не показывают
ни ник, ни хвост uid — только что сломалось, где и в какой версии. Правило «в Telegram ни имён, ни uid»
для сбоев закреплено на уровне белого списка приватности, а не только в отдельных отправителях.

## Scope

In scope:
- `functions/src/admin_alert_privacy.ts`: для сбойных типов белый список не пропускает `nickname`,
  `relatedNickname`, `relatedRole`, `uidLast4` и деталь «Ник в событии»;
- `functions/src/admin_alert_context.ts`: для сбойных типов ник по uid из профиля не ищется (минус чтения);
- `functions/src/admin_alert_legacy.ts`: критический сбой не переносит `userName` в `nickname`;
- `functions/src/admin_alerts.ts`: дайджест `appErrorDigest` без `nickname`/`uidLast4`;
  `formatCriticalErrorAlert` без строки «User:»;
- тесты: admin_alerts, admin_alert_legacy, admin_alert_privacy, admin_alert_context;
- `docs/phraseman-2.0/DEPLOY_NOW.md`: строка выкладки.

Out of scope:
- ник в остальных 44 типах оповещений (новый пользователь, жалобы, деньги…). Это одобренный владельцем
  дизайн 07796c0d0 (публичный ник из профиля + последние 4 символа uid). Конфликт с правилом CLAUDE.md
  передан координатору с рекомендацией (§CORE-0159).

## Architecture

Нет новой архитектуры: расширен уже существующий механизм `customCardMilestone` — типы без личности.

## Security and privacy

Сокращение персональных данных во внешнем канале (Telegram). Полный uid в Telegram и раньше не уходил.
Политика не меняется: Telegram — внутренний канал оператора.

## Technical debt

- Contain: правило CLAUDE.md «в Telegram ни имён, ни uid» и дизайн 07796c0d0 расходятся для 44 типов —
  выход: решение координатора/владельца по §CORE-0159.

## Verification

- functions jest: admin_alerts, admin_alert_legacy, admin_alert_privacy, admin_alert_context,
  admin_alert_dispatcher.
- Новый тест: каждый сбойный тип при любом входе не содержит ника и хвоста uid в тексте Telegram.

## Rollback

Откатить коммит и выложить те же функции заново. Данные не меняются.
