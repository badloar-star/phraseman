# Task packet: §142 — explainMistake: логи на немых выходах (pending 503, invalid-argument 400)

Governance-ID: TG-A94759F3DC37
Status: Logs (шаг 1) — выкладка у координатора
Owner: Ядро; найдено при разборе логов выкладки 04.10 (ревизия explainmistake-00050, 05:10Z)

## Outcome
За 06:00–08:00Z: 29 вызовов, 22×200, 5×400, 2×503. Отказов валидатора НЕТ (лог из 11c2df028 молчит) — прежние «21% 503 от валидатора» в этом окне не повторились. Но оба 503 и все 400 прошли без единой строки функции: 503 — четыре выхода `mistake_explanation_pending` (генерация уже идёт/лок), 400 — проверка входа `sanitizePayload`. Без лога нельзя сказать, что именно сработало.

## Scope
functions/src/mistake_explain.ts — только логи:
- `sanitizePayload`: [EXPLAIN-MISTAKE] invalid_input {reason, lessonId числом, длины полей} — без текста ответов;
- 4 выхода `mistake_explanation_pending`: [EXPLAIN-MISTAKE] pending {site, variant}.

## Architecture
Поведение не меняется.

## Security and privacy
Тексты ответов ученика в лог не пишутся — только длины и коды.

## Technical debt
Логи выходов остаются навсегда (правило «логи на ранних выходах»); после диагноза pending — решить, нужен ли клиенту повтор вместо ошибки.

## Verification
tsc functions; тесты mistake_explain.

## Rollback
Откат коммита.
