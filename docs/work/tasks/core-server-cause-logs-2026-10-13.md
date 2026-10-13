# Task packet: причины сбоев в серверных функциях Диалогов и пушей пишутся в журнал (без смены поведения)

Governance-ID: TG-68F39ACBA493
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10 — решение по SERVER_SILENT_CATCH_R1_2026-10-13.md (f964a2e55): до утренней выкладки только строки лога

## Outcome

В 🔴1 (`completion_core:611-613`, readSession → session_not_found) и в ≈16 местах 🟡 исходная ошибка теперь пишется в журнал
функций (`[SERVER-CAUSE] <tag>`): код, имя и сообщение. Длинные идентификаторы замаскированы, текст реплик и ответов модели
не пишется: для разбора JSON — только тип ошибки и длина. Коды ответов и поведение не меняются.

## Scope

In scope: functions/src/swallowed_error.ts (новая функция reportCauseServer, аддитивно), dialogue_v2_session_completion_core.ts,
dialogue_v2_completion_server.ts, dialogue_v2_memory_writer.ts, dialogue_v2_memory_management.ts, dialogue_v2_server_authorization.ts,
re_engage_push.ts, тест помощника. Out of scope: смена кода ответа для 🔴1 (в CORE_AFTER_R1 — с проверкой клиента), выкладка.

## Architecture

No architecture change: одна строка лога в существующих catch.

## Security and privacy

Пишется только код, имя и замаскированное сообщение ошибки (≤ 300 знаков, куски 20+ букв/цифр → «…»).
Для JSON-разбора ответа модели сообщение не пишется (оно содержит фрагмент текста).

## Technical debt

- 🔴1: отделить «сбой чтения» от «не найдено» кодом ответа — после выкладки, с проверкой клиента.

## Verification

Тест помощника (маскировка, без сообщения для JSON) + 19 наборов предполётной проверки + сборка функций из чистого среза.

## Rollback

Откат коммита; строки лога независимы от логики.
