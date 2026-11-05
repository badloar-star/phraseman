# Task packet: widen transfer scope (all 04.11 mockups approved) — UX round-2 tasks, matrix update, owner-questions cleanup

Governance-ID: TG-1BFF1316105C
Status: In progress
Owner: 3 · МАКЕТЫ session
Related epic/enabler: owner word relayed by coordinator 05.11 ("все вчерашние макеты одобрены")

## Outcome
UX_ROUND2_TASKS_2026-11-05.md gives Дизайн/Темы/Моменты/Эмулятор concrete zone tasks (Статистика 6, Настройки 7, Главная 6 + 1 declined, ТОП-20 приятностей, шторка ступени Пика, ярлыки на значке); MOCKUP_TRANSFER_MATRIX shows the new "к переносу" number; OWNER_QUESTIONS keeps only truly open questions.

## Scope
In scope: docs only (release folder, OWNER_QUESTIONS). Out of scope: app code, registry rows for new items (they have no registry id yet — Сверка adds on frame).

## Architecture
No architecture change.

## Security and privacy
Docs only. Note for executors: round-2 items that touch data (reminder time hint from smart_reminder_store, support template) stay on-device; no new collection.

## Technical debt
Contain: zone assignment for ТОП-20 is my proposal; executors may reassign (exit: they reply).

## Verification
Counts computed by script from registry (not typed by hand); item lists extracted from demo ux_conveniences_round2_demo.html.

## Rollback
git revert; no data touched.
