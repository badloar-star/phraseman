# Task packet: PM-229 не глотать ошибки молча + PM-226 контракт диагностики

Governance-ID: TG-7EAA7B63001C
Status: Planned
Owner: субагент Claude (владелец: badloar@gmail.com)
Related epic/enabler: PM-229, PM-226 (Phraseman 2.0)

## Outcome

Ошибки фоновых работ (outbox, sync, уведомления, прогревы) больше не пропадают без следа: каждый намеренно проглоченный сбой пишет причину с префиксом модуля, а запись диагностики несёт code, screen, operation, build, traceId и замаскированный контекст. Успех — ратчет-проба считает немые catch и не даёт им расти; юнит-тест подтверждает маскирование токенов, email, uid, сырого аудио и текста карточек.

## Scope

In scope: app/debug-logger.ts (обёртка reportDiagnosticError, reportSwallowed, swallowError), новый app/diagnostic_mask.ts, точечная замена немых catch в очередях/sync/уведомлениях/прогревах (cloud_sync, notifications, user_notifications, youtube_premiere_notifications, support_report_outbox, preload/prefetch, phone-state), tests/pm229_silent_catch.probe.ts, юнит-тест маскирования.

Out of scope: чужие файлы (home, lessons, flashcards*, community_packs, overlays/Modal/Sheet, EnergyContext, shards_system, economy), PROGRESS.md, registries/tasks.json; остальные ~1000 немых catch в UI-экранах остаются в BASELINE как долг.

## Architecture

No architecture change: поведение вызывающего кода не меняется (ошибка по-прежнему проглатывается там, где так задумано), добавляется только запись причины. Маскирование вынесено в чистый модуль без React Native, чтобы не создавать циклов импорта с debug-logger.

## Security and privacy

Обёртка не пропускает токены, JWT, email, uid целиком, base64/сырое аудио и значения по ключам с пользовательским контентом (пишется только длина). Новых сборов данных нет, политику менять не нужно.

## Technical debt

Contain: остальные немые catch зафиксированы в BASELINE ратчета (может только уменьшаться); выход — постепенная замена по файлам владельцами зон.

## Verification

npx tsx tests/pm229_silent_catch.probe.ts; npm run test:one -- tests/diagnostic_mask.test.ts; tsc по затронутым файлам.

## Rollback

Откат правок файлов; поведение не менялось, данные не затрагиваются.
