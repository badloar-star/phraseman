# Task packet: полный аудит Арены — карта слоёв и корень поломки

Governance-ID: TG-34E6FFC4E294
Status: In progress
Owner: сессия Claude Opus 5 (2026-09-20)

## Правило владельца (2026-09-20, дословно)

«Соседняя сессия писала контуры других языков, они не готовы, значит они НЕ
ДОЛЖНЫ НИКАК ВЛИЯТЬ на Арену в английском языке, потому что те контуры
невозможно включить ещё, пока я не дам добро.»

## КАРТА СЛОЁВ АРЕНЫ

```
ЭКРАНЫ (app/)
  arena.tsx (таб) ─┬─> ArenaHubSurface ──> arenaV2Home, arenaExpansionHome
                   │                        arenaFetchMatchHistory, arenaFlushOutbox
                   │                        arenaOutboxBlockedByUpdate
                   ├─> arena_matchmaking ──> arenaBackgroundSearch (синглтон)
                   ├─> arena_match ────────> MatchPlan, SubmitAnswer, MatchFinish
                   ├─> arena_results / arena_review / arena_history
                   ├─> arena_ranks / arena_tops / arena_today
                   └─> arena_invite / arena_friend_duel / arena_season_pass

ЯДРО КЛИЕНТА (modules/arena/)
  background_search ─ очередь, бот, находка, замки
  contract ─ тайминги, типы
  target_registry ─ языковые контуры (клиент)
  hub_view / hub_nav / hub_hydration ─ состояние хаба
  entry_prefetch / duel_plan ─ вход в матч
  outbox_storage / result_outbox ─ отчёты о матчах

КЛИЕНТ-СЕРВЕР (app/arena_client.ts)
  requireArenaTargetIdentity ─ проверка контура в ответе
  withAccountTransitionLock ─ замок аккаунта (231 вызов БЕЗ таймаута)

СЕРВЕР (functions/src/)
  arena_v2.ts ─ 28 callable
    └─ arena_target_registry ─ контуры (сервер)
    └─ arena_target_quality ─ валидация заданий
    └─ arena_config_contract ─ гейт конфига
    └─ arena_v2_core ─ тайминги, константы

FIRESTORE
  arena_v2_config/current ─ конфиг (БЕЗ targetPublications — старый)
  tournamentTasks ─ задания (БЕЗ studyTarget/publicationFingerprint — старые)
  arena_v2_queue / arena_v2_matches / arena_v2_profiles
```

## КОРЕНЬ ПОЛОМКИ

Запрос заданий в `arena_v2.ts` (создание матча):

**Было (работало):**
```
.where('poolVersion', '==', NEW_TOURNAMENT_POOL_VERSION)
.where('mode', ...)  .where('difficulty', ...)
```

**Стало (после моего деплоя):**
```
.where('poolVersion', '==', publication.poolVersion)
.where('studyTarget', '==', publication.studyTarget)          <- НОВОЕ
.where('publicationFingerprint', '==', publication.publicationFingerprint) <- НОВОЕ
.where('mode', ...)  .where('difficulty', ...)
```

Задания в `tournamentTasks` записаны СТАРОЙ схемой: полей `studyTarget` и
`publicationFingerprint` у них НЕТ. Запрос не находит ни одного документа →
`arena_task_pool_insufficient` → очередь не создаётся → Арена мертва во всех
языках, включая английский.

То есть незавершённые контуры влияют на английский ровно так, как владелец
запретил.

## Scope

In scope: `functions/src/arena_v2.ts` — выбор заданий работает и со старым
пулом; `functions/src/arena_target_registry.ts` — legacy-публикация.

Out of scope: чужая работа по контурам (не трогаю), клиент.

## Architecture

**Решение.** Публикация получает признак `legacy` (собрана из старого
конфига без `targetPublications`). При нём запрос заданий идёт СТАРОЙ формой
— по `poolVersion`/`mode`/`difficulty`, без контурных полей, и проверка
`arenaPublication` у задания не требуется.

Контурная публикация (когда владелец её включит) работает как написала
соседняя сессия — полным запросом и полной валидацией.

**Инвариант.** Пока в конфиге нет `targetPublications`, Арена ведёт себя
ровно как до контуров. Незавершённые контуры не могут повлиять на английский.

## Security and privacy

Ослабления нет: старый путь — ровно то, что работало на проде месяцами.
Новый путь с полной валидацией сохранён для включённых контуров.

## Technical debt

- **Contain.** Legacy-ветка живёт, пока владелец не включит контуры. Помечена
  и логируется.

## Verification

1. Типы и тесты сервера.
2. Деплой + проверка владельцем: поиск создаёт очередь, бот приходит.
3. Логи `[ARENA-TASKS]` называют выбранный путь.

## Rollback

Удаление legacy-ветки вернёт неработающую Арену на старых данных.
