# Task packet: §126 п.9 — progressSubmitEvent 400: причина отказа в журнале

Governance-ID: TG-94EA8E61CB15
Status: Logs first (no behaviour change)
Owner: Ядро

## Outcome
Три отказа invalid-argument в normalizeProgressEvent (bad_progress_event_id / _type / bad_plan_completion_identity) пишут [PROGRESS-EVENT] rejected с причиной, длиной/префиксом id и типом (не более 64 знаков). Четыре немых catch разбора JSON пишут причину. Ответы клиенту те же.

## Scope
functions/src/progress_events.ts — только логи.

## Architecture
Один помощник rejectProgressEvent(reason, detail): never.

## Security and privacy
Без uid; id события — только длина и первые 24 знака (это технический id, не персональные данные).

## Technical debt
Правка допустимых форматов — после диагноза; plan_task_complete относится к выведенному персональному плану (старые клиенты).

## Verification
Тесты progress_events (functions), проверка типов функций.

## Rollback
Откат коммита.
