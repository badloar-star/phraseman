# Arena Question Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить управляемый пул вопросов Арены для `en/ru` и быстрый подбор десяти готовых вопросов без недавних повторов.

**Architecture:** Content Factory создаёт и проверяет неизменяемые черновики. Отдельный server-owned runtime-пул публикует только одобренные записи; матч выбирает из него по языковой паре, CEFR-уровню и истории участников.

**Tech Stack:** TypeScript, Firebase Functions/Admin SDK, Firestore, Jest, Admin V2 ES modules.

---

### Task 1: Контракты пула и чистый алгоритм выбора

**Files:** Create `functions/src/arena_question_pool_selection.ts`, `functions/src/arena_question_pool_selection.test.ts`; Modify `functions/src/types.ts`.

- [ ] Написать RED-тесты: `selectArenaPoolQuestions` принимает только активные `en/ru` вопросы нужного A1/A2/B1/B2, исключает объединение недавних ID игроков, возвращает 10 уникальных ID и фиксирует fallback `allow_recent` только при нехватке свежих.
- [ ] Выполнить `cd functions; npm test -- arena_question_pool_selection.test.ts` и получить FAIL.
- [ ] Реализовать `ArenaQuestionPoolRow`, `ArenaPoolFallback = 'none' | 'allow_recent' | 'allow_same_skill'` и чистую функцию выбора; никогда не брать снятые, неверного языка/уровня, дубли или некорректные строки.
- [ ] Повторить тест, получить PASS, закоммитить `feat: define arena question pool selection`.

### Task 2: Публикация и обратимое снятие из пула

**Files:** Create `functions/src/arena_question_pool.ts`, `functions/src/arena_question_pool.test.ts`; Modify `functions/src/content_factory/arena_stage_consumer_adapter.ts`.

- [ ] Написать RED-тесты на публикацию одобренной партии из 10, идемпотентный повтор, отказ для другого hash/state, remove/restore без hard delete.
- [ ] Реализовать publisher через `loadArenaQuestionBatchForReview` и `buildArenaRuntimeDraft`: проверять `arena_questions`, `approved`, hash/generation/fingerprint и `en/ru`; писать детерминированные ID, provenance, `availability`, `rand`, actor/time.
- [ ] Реализовать state transitions по expected revision с обязательной причиной снятия и `admin_log`.
- [ ] Запустить `cd functions; npm test -- arena_question_pool.test.ts`, получить PASS, закоммитить `feat: publish reviewed arena questions to pool`.

### Task 3: Guarded admin API, index и rules

**Files:** Create `functions/src/admin_arena_question_pool.ts`, `functions/src/admin_arena_question_pool.test.ts`; Modify `functions/src/index.ts`, `firestore.indexes.json`, `firestore.rules`, `tests/firestore_rules_security.test.ts`.

- [ ] RED-тесты: read требует `content.read`; publish/remove/restore — `content.publish`; invalid locale/cursor/page size/reason запрещены.
- [ ] Создать `adminListArenaQuestionPool`, `adminPublishArenaQuestionBatch`, `adminRemoveArenaPoolQuestion`, `adminRestoreArenaPoolQuestion`; list максимум 50 и только `en/ru`, A1–B2.
- [ ] Добавить composite index `studyTarget, learnerSourceLocale, level, availability, rand`; подтвердить rules-тестом, что direct client write остаётся `false`.
- [ ] Запустить callable/rules tests и закоммитить `feat: add guarded arena pool administration`.

### Task 4: Матчмейкинг и история повторов

**Files:** Create `functions/src/arena_question_history.ts`, `functions/src/arena_question_history.test.ts`; Modify `functions/src/matchmaking.ts`, `functions/src/matchmaking.test.ts`.

- [ ] RED-тест: два игрока получают 10 `en/ru` вопросов уровня highest rank; union histories исключается; IDs и history записываются только в успешной transaction сессии.
- [ ] Реализовать `arena_question_history/{uid}` с `recentIds` максимум 100 и `updatedAt`; client write не открывать.
- [ ] Заменить `pickQuestions(level,count)` на pool-query + selector, сохранив 10 вопросов/40 секунд/highest rank; при нехватке выбросить до создания сессии и писать diagnostics без ответов игроков.
- [ ] Запустить `cd functions; npm test -- matchmaking.test.ts arena_question_history.test.ts`, получить PASS, закоммитить `feat: select fresh arena pool questions for matches`.

### Task 5: Экран Admin V2

**Files:** Create `admin/v2/scripts/pages/arena-question-pool.js`, `admin/v2/scripts/arena-question-pool-controller.js`, `tests/admin_v2_arena_question_pool_contract.test.ts`; Modify `admin/v2/scripts/admin-core.js`, `admin/v2/scripts/content-factory/controller.js`.

- [ ] RED-контракт: внутри Content/Arena есть `Пул вопросов`, `Создать 10 вопросов`, `Добавить в пул`, `Заменить вопрос`, `Перегенерировать всю партию`, `Убрать из пула`; восьмой root-nav не появляется; remove требует reason.
- [ ] Рендерить статус/счётчики A1–B2, фильтры, пагинацию, loading/empty/error, список карточек и remove/restore; переиспользовать `arena_topic → arena_questions` для создания десятки и уже существующий preview/review.
- [ ] Все mutating requests через callables, plain Russian errors, disabled publish до approval, безопасный HTML escaping и tooltip/focus states.
- [ ] Запустить UI test и `node --check` двух новых JS, получить PASS, закоммитить `feat: add admin v2 arena question pool`.

### Task 6: Замена одного вопроса

**Files:** Modify `functions/src/content_factory/stage_contracts.ts`, `stage_capabilities.ts`, `arena_grounding.ts`, `admin_content_stages.ts`, `admin/v2/scripts/pages/content-generator.js`; extend Arena tests.

- [ ] RED: `arena_question_replacement` содержит ровно один вопрос, требует approved parent batch, сохраняет `en/ru`/CEFR и новый semantic key.
- [ ] Реализовать immutable child stage по модели `quiz_question_replacement`; одобрение не меняет siblings, публикация снимает только прежний runtime row и оставляет provenance/audit.
- [ ] Добавить кнопки `Заменить вопрос N` в preview партии; whole regenerate создаёт новую draft-партию, а не меняет опубликованную.
- [ ] Запустить focused arena/content tests и UI contract; закоммитить `feat: replace individual arena pool questions`.

### Task 7: Финальная проверка

- [ ] Выполнить focused functions tests для pool, admin API, history, matchmaking и arena ledger/runtime; затем `npm test -- tests/admin_v2_arena_question_pool_contract.test.ts tests/firestore_rules_security.test.ts`.
- [ ] Проверить: не открылись client writes; `en/ru` enforced в publish и selection; history bounded; поиск матча не вызывает генератор; каждое admin mutation имеет audit.
- [ ] Выполнить `git diff --check` и `node --check` новых UI-файлов. Исправлять только доказанные этим набором дефекты.

## Self-review

План покрывает ручную генерацию/проверку/публикацию, управление пулом, A1–B2, `en/ru`, быстрый выбор, recent-repeat prevention, audit, access control и UI. Он намеренно не добавляет автогенерацию, автопубликацию, другие языки, изменение наград/рангов/ботов или hard delete.
