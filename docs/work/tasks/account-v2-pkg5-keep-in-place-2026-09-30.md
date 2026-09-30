# Task packet: Account V2 — Пакет 5, ремонт №2: keep_in_place (решение Fable за владельца)

Governance-ID: TG-29D525D1B798
Status: Done (SPEC+SECURITY APPROVE после 3 ревью)
Owner: Claude session (Account V2, /loop)

## Outcome
Dry-run миграции перестаёт вечно блокировать чистку из-за данных, которые остаются в действующих хранилищах 2.0 (решение в статусе «РЕШЕНО ЗА ВЛАДЕЛЬЦА (Fable): домены вне ядра V2»):
1. Новая судьба `keep_in_place` + счётчик `keptInPlaceCount` (в `pendingDomainCount` не входит): stars.balance/руны (reason `coins_ledger_authoritative`, D03/OD10), серия/активные дни, экзамены/сертификаты, достижения/статистика (OD8), `unlocked_lessons` (D121). `runesToCoins` оставить информационно (1:1, без операций).
2. `carry_pending_domain` — только где нет домена И нет решения (community-карточки остаются informational).
3. `assertLegacyCleanupAllowed` + новая функция `legacyCleanupPaths(report)`: удаляются ТОЛЬКО carried/derived/dropped; keep_in_place — allowlist; сторож-тест: ни один keep_in_place путь не попадает в удаляемые.
4. Хвост P3 ревью: ES/DE — оценка 40–59% без списка `unlocked_lessons` для этой цели → HOLD (нельзя доказать, что урок был открыт).
5. Схема отчёта, CLI обновить.

## Scope
functions/src/accounts_v2_migration/*, scripts/accounts-v2-migration-dry-run.mjs, docs/reports/accounts-v2-migration-dry-run.schema.json. Не трогать ядро, клиент, 03_DECISIONS.md (его правит другая сессия).

## Architecture
Чистые функции, без сети; allowlist — единый источник для dry-run и будущего исполнителя чистки.

## Security and privacy
Чистка не может удалить валюту/серию/достижения (сторож). Отчёт без значений.

## Technical debt
Accept temporarily: исполнитель чистки (реальное удаление полей) — отдельный шаг, только по команде владельца.

## Verification
RED→GREEN, мутации (keep_in_place попадает в удаляемые; счётчик учитывает keep_in_place), functions src/accounts_v2_, tsc, eslint, независимое ревью.

## Rollback
Копия `.tmp_pkg5_backup2/`.

## Ремонт после ревью (SPEC HOLD + SECURITY HOLD)
- P1 report.ts:201-213: белый список удаляемого, а не чёрный. Путь допустим ТОЛЬКО если заново классифицируется правилом инвентаря как carry|derive|drop, без лишней точки внутри ключа, без пробелов/управляющих символов, и это не корень (`progress`, `subcollections`, `stars`, ``). Тесты на пять путей ревьюера: `progress`, `stars.balance`, `subcollections`, `progress.streak_count.x`, `progress.active_days_v1 ` (пробел).
- P2 (безопасный вариант по умолчанию): оценки уроков `progress.lesson{N}_best_score` (и прочие поля, которые читают app/lesson_star_scale.ts, app/lesson_lock_system.ts, экзамены) — перенос ДА, чистка НЕТ: disposition carry + keep (новая пометка `carried_and_kept`, в legacyCleanupPaths не попадает). Причина: 2.0 читает их из старого места; удаление закрыло бы уроки/экзамены на новом устройстве.
- P3: basePath не обрезать по `[` (неоднозначный ключ → HOLD); EN/FR 40–59% без unlocked_lessons — записать как informational `lesson_unlock_list_absent` (не молча); dry_run.test.ts разделить до ≤800.

## Ремонт №2 после повторного ревью (подделки отсекаются; HOLD из-за живых читателей)
- P1: `r.login_service` (OD11 = «не переносить», НЕ «удалить») — пометить удержанием; firebaseAuthUid/linkedAuth/canonicalStableId/identityHidden/duplicateOfStableId/anon_merge_claim читает действующий вход, слияние, удаление, друзья, лидерборд.
- P2 (системно): «отброшено» допускается к чистке ТОЛЬКО если ключ не читает живой код. Сторож-тест: для каждого ключа, который legacyCleanupPaths может вернуть, поиск по app/, components/, hooks/, modules/, functions/src (кроме accounts_v2_migration и тестов) — нашёлся читатель → тест красный, пока правило не помечено удержанием. Пройти по всем dropped поштучно (streak_freeze, XP, спины, ауры, арена, лиги, …) и расставить удержание там, где читают.
- P3: пути с «…»/`<uid>`/маскировкой — не допускать к чистке.
- P3 (ревью №3, APPROVE): убрать реэкспорт *ForLookup из dry_run.ts (только report.ts + тесты).
