# Task packet: ошибка уходит из счётчика — правило «2 режима» только где 2 режима возможны

Governance-ID: TG-052C0CAC8347
Governance-ID: TG-998FBDED5D0C
Status: Done — «да» координатора §130
Owner: Ядро (находка «Дизайна», «17 не уменьшается», §126)

## Outcome
corrected = ≥3 разных дня верных ответов в независимых режимах И ≥N разных независимых режимов, где N = min(2, число независимых режимов, совместимых с аспектом и возможностями этой ошибки на стадии production). Раньше N всегда = 2, и для meaning / listening / missing_token (и form/word_order без аудио) условие было недостижимо — ошибка навсегда в счётчике. Пересчёт задним числом — сам: проекция пересобирается из журнала.

## Scope
modules/mistake-practice/capabilities.ts (новый: capabilities из записи, вынесено из session.ts без изменений), exercise_mode_registry.ts (independentProductionModeCount), projection.ts (порог), session.ts (импорт), тест.

## Architecture
Без циклов: projection → registry/capabilities; session → capabilities. Данные — поля самой записи (facet, audioRef, distractors, tokens).

## Security and privacy
Без изменений данных и сервера.

## Technical debt
Режим в день записывается по первому ответу дня (projection) — не трогаю, он не мешает при N=1.

## Verification
Новый тест: meaning-ошибка уходит после 3 дней печати; pronunciation с аудио всё ещё требует 2 режима; неверный ответ сбрасывает дни. Тесты mistake-practice, typecheck.

## Rollback
Откат коммита; проекция пересоберётся по старому правилу.
