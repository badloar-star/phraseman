# Task packet: D111 — месячный лимит 30 ответов Free в Диалогах

Governance-ID: TG-A799C28458D9
Governance-ID: TG-D7AB7A45A360
Status: In progress
Owner: Claude session (subagent), 2026-09-30
Related epic/enabler: D111 (docs/phraseman-2.0/03_DECISIONS.md), D66 local-first, D91 деплой после релиза

## Outcome

Free-пользователь Диалогов получает 30 ответов в календарный месяц UTC (сервер считает),
на экране видит «N из 30 в этом месяце» и дату сброса; дневного лимита и дневных текстов нет.
При исчерпании — понятная карточка и путь в Plus (существующий пейвол, без новых экранов).

## Scope

In scope: доведение бесхозной цепочки: `app/ai_dialog_daily_quota.ts` (зеркало v3 monthly),
`app/revenue_daily_limits.ts` (REVENUE_MONTHLY_LIMITS), `components/DialogsTabContent.tsx`
(тип квоты, остаток, событие аналитики), `components/DialogQuotaBadge.tsx` (месячный вид),
`app/ai_dialog_session.tsx` (оптимистичное списание, месячные тексты стены), серверный
`functions/src/dialog_quota_contract.ts`, `premium_dialog.ts`, `premium_dialog_stream.ts`,
`openai_dialog_model_config.ts`, `dialog_extra_replies_contract.ts`, `ai_dialog_extra_replies.ts`,
`dialogue_reply_access_contract.ts`, тесты квоты.

Out of scope: деплой функций (D91), стеклянные окна сессии «Дизайн», V2-сессии диалогов
(`dialogue_v2_turn_production_callable.ts`), ревью диалога, MAX.

## Architecture

Сервер — источник истины (`premium_dialog_quotas`, поле quotaPeriod='calendar_month',
periodKey YYYY-MM, resetAtMs = 1-е число следующего месяца UTC). Legacy-поля daily* пишутся
зеркально для отката. Клиент держит AsyncStorage-зеркало v3 и читает legacy v2 один раз.
Экран уменьшает локальный остаток сразу при отправке, ответ сервера сверяет, отказ — откат.

## Security and privacy

Новых данных не собирается; обход клиентского гейта невозможен — сервер отклоняет
`dialog_free_limit`. Privacy Policy не затрагивается.

## Technical debt

- Contain: имена `*Daily*` оставлены как deprecated-алиасы ради rollback-сборок; выход — после
  релиза D111 удалить алиасы.

## Verification

Точечные jest по тестам квоты (клиент и functions), точечный tsc затронутых файлов.

## Rollback

Сервер пишет legacy daily-поля зеркально; вернуть прежнюю версию функций достаточно.
Клиентское зеркало v3 лежит по отдельному ключу и не ломает старую сборку.
