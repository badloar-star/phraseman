# Owner-Approved Runtime Change Plan - 2026-06-26

Этот документ фиксирует порядок работы для T0-зон: XP, progress, streak, shards, premium, auth, server authority, cloud sync, live listeners и server writes.

## Главное правило

T0 runtime нельзя менять одним большим проходом. Каждый этап идет отдельно:

1. Аудит текущего поведения.
2. Классификация риска: safe / needs owner decision / blocked.
3. Четкая граница изменения: какие файлы, какие данные, какая свежесть, какие расходы.
4. Guardrail test до или вместе с правкой.
5. Маленькая правка.
6. Узкая проверка.
7. Простой отчет: что изменилось, что не трогали, какие риски остались.

## Что можно делать без отдельного owner approval

- Убирать лишние UI-only таймеры.
- Убирать дублирующие `AsyncStorage` reads, если это не меняет порядок начислений, premium, shards, auth или sync.
- Добавлять guardrail tests.
- Документировать live listeners, writes, queues и polling.
- Улучшать cleanup timers/subscriptions без изменения бизнес-семантики.

## Что требует owner approval перед runtime правкой

- Любая смена XP/progress/streak/shards authority.
- Любая смена premium/auth/server truth.
- Любой переход `forceNow` sync -> delayed sync или наоборот.
- Любой переход Firestore live listener -> cache/SWR для league/friends/arena/premium.
- Любое изменение server write policy для событий с деньгами, доступом, прогрессом, рейтингом или подарками.
- Любой merge/reconciliation, который может сделать локальное значение меньше, чем было у пользователя.

## Минимальный safe pattern для T0

- Local optimistic UI показывает результат сразу.
- Durable local queue сохраняет событие.
- Server mutation имеет idempotency key.
- Server записывает ledger.
- Client получает reconciliation.
- Merge монотонный для счетчиков: XP, streak, shards earned/spent totals, achievements, best scores.
- Никакой late sync не должен уменьшить уже показанный или честно заработанный прогресс.

## Следующий порядок работы

1. Home/startup storage audit: только UI/startup reads, без изменения T0.
2. Firestore listener lifetime audit: классифицировать listeners по freshness/cost.
3. Server write policy audit: какие writes user-action critical, какие можно batched/sampled/local.
4. T0 progress/shards/sync plan: отдельный approval checkpoint до любых runtime изменений.

## Текущий статус

- Safe performance fixes продолжаются без T0-семантики.
- T0 зоны пока только аудируются и документируются.
- Любая T0 runtime правка должна получить отдельную owner-approved границу.

## Linked T0 Checklist

- Detailed checklist: `T0_PROGRESS_SHARDS_SYNC_APPROVAL_CHECKLIST_2026-06-26.md`.
