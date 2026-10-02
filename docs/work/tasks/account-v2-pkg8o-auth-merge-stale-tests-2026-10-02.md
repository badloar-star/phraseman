# Task packet: Account V2 — Пакет 8O: 9 давних падений functions/src/auth_merge.test.ts

Governance-ID: TG-B67D4C8B5ED1
Status: In progress
Owner: Claude session (Account V2, /loop); поручение координатора §91

## Outcome

`functions/src/auth_merge.test.ts`: 87 PASS / 9 FAIL (прогон 2026-10-02, `npx jest --no-coverage --no-watchman`). Диагноз (по коду и PROGRESS.md):
- **3 Spin-теста** («Level Spin merge integration contract …», «durably unions Spin ledgers …», «retains both merge markers … Spin results collide») — Spin-слияние удалено намеренно (PM-068 2026-09-27: retirement, `level_spin_merge.ts` физически удалён; D147). → снять тесты с комментарием `// зачем:` (ссылка на PM-068/D147); убедиться, что есть/остаётся тест «исторические level_spin_* при слиянии закрываются и не копируются» (если нет — заменить снятые одним таким тестом).
- **6 тестов выбора победителя/истории ошибок** («merges two stable ids into the higher-XP one …», «chooses the winner and merge payload from transaction snapshots», «absorbs an unowned anonymous LOSER …», «copies both immutable mistake histories … right wins over left», «publishes right over left only after a complete 51-event paged union», «does not publish or hide … right-over-left mistake union times out») — ждут прежнее правило «победитель = больше XP». Правило сменено НАМЕРЕННО (PM-067 2026-09-27, PROGRESS.md: XP удалён из выбора, выбор owner/link → updatedAt → id; в `mergeStableAccounts` winner = resolvedA, либо сторона из `publication.winnerStableId`). → переписать ожидания под текущее правило, СОХРАНИВ смысл проверок (union истории ошибок с пагинацией 51, таймаут → ни публикации, ни скрытия; поглощение анонимного проигравшего; payload из снимков транзакции). Сценарии «right wins» строить через путь, где победитель действительно правый по текущему правилу (publication/winnerStableId или порядок аргументов), а не удалять.
- Перед правкой: убедиться, что это не регрессия кода — сверить с PM-067 (`functions/src/auth_identity.ts`, `auth_merge.ts`) и с клиентским вызовом (кто передаёт A/B). Если найдётся реальная ошибка в коде — остановиться и описать в итоге (не чинить молча).

## Scope

Только `functions/src/auth_merge.test.ts`. Код функций не менять (кроме случая явной регрессии — тогда стоп и отчёт).

## Architecture

Тесты = контракт текущего правила выбора победителя и retirement Spin.

## Security and privacy

Без изменений кода.

## Technical debt

Нет.

## Verification

`cd functions && npx jest --no-coverage --no-watchman src/auth_merge.test.ts` → 0 FAIL; блок «8M» и остальные 87 не ломаются; мутация правила победителя в auth_merge.ts (временно) роняет переписанные тесты, затем восстановить байт-в-байт.

## Rollback

git revert.
