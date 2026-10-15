# Task packet: цикл lesson1 ↔ lesson_menu на запертом уроке

Governance-ID: TG-7F2D4A9B1C63
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: 🔴 Моменты 15.10 (`phraseman://dev_state?next=/lesson1?id=2` → `[LESSON-LOCK] menu:bounce_back` ≥50 раз в минуту).

## Outcome
Запертый урок не вызывает бесконечной навигации: ОДИН `replace` на список с тостом причины; меню не ходит «назад по стеку» (под ним оказывался тот же lesson1, чей охранник снова делал replace на меню); предохранитель — не больше одного bounce на id за 5 с, с логом `menu:bounce_suppressed`.

## Scope
`app/lesson_menu.tsx` (эффект bounce, константа предохранителя), `app/lesson_premium_gate.ts` (журнал звена), тесты.

## Architecture
Звенья цепочки: охранник lesson1 (`withLessonRuntimeAccessBoundary`) → `openLessonAccessGate` = replace на меню → меню при замке по прогрессу: прежде `safeRouterBack`, теперь `router.replace('/(tabs)/lessons')`. Любой вход в запертый lesson1 (dev-ссылка, «Следующий урок», глубокая ссылка, push, «Продолжить») сходится в эту точку.

## Security and privacy
Данные не собираются; замок доступа не ослаблен (урок остаётся закрытым).

## Technical debt
Нет.

## Verification
Тесты `lessons_overlays_audit_r58` (цикл), fail-closed и защитные контракты меню; повтор Моментами на 5554.

## Rollback
`git revert`.
