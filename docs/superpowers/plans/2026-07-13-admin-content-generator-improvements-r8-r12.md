# Admin Content Generator — Improvement Plan R8–R12

**Дата:** 2026-07-13  
**Статус:** implementation plan, deployment не разрешён  
**Основание:** post-R7 аудит генератора и `2026-07-12-admin-v2-content-generation-platform.md`

## Цель

Довести Content Generator от функционально завершённой R0–R7 платформы до production-grade системы: исключить конкурентные записи устаревших worker, сделать операции и метрики доказуемо достоверными, усилить provider/QA-контракты, добавить настоящий bulk/edit workflow, завершить runtime consumers и только после этого оптимизировать качество промптов, телеметрию и поддержку новых языков.

## Неподвижные правила

- Codex не использует project `OPENAI_API_KEY` для локальной генерации, проверки или judging.
- Никакого deployment без отдельного явного запроса, точного Firebase project ID и rollout packet.
- Generated content не публикуется и не активируется автоматически.
- Accepted drafts, immutable artifacts, audit и rollback history не удаляются при исправлениях.
- Старые jobs/releases остаются читаемыми до завершения отдельной поэтапной миграции.
- Tests read-only: source/config/baseline не переписываются тестовым запуском.
- Каждый релиз: Executor red/green → focused verification → fake/emulator smoke → Advisor `APPROVED`.

---

## Phase 0 — Documentation discovery и разрешённые API

### Прочитать перед реализацией

- Worker/lease/audit: `functions/src/content_factory_worker.ts`, `content_stage_worker.ts`, `content_factory/stage_lease.ts`, `generation_checkpoint.ts`, `generation_audit.ts`.
- Immutable Storage: `content_factory/artifact_storage.ts` и тесты.
- Provider/repair: `generation_provider.ts`, `stage_runner.ts`, `prompt_registry.ts`, `prompt_context.ts`.
- Budget/config: `content_factory_budget.ts`, `openai_jobs_config.ts`.
- Admin workflow: `admin_content_stages.ts`, `admin_content_factory_read.ts`, `admin/v2/scripts/pages/content-generator.js`, `admin-core.js`, `admin-firebase.js`.
- Publication/runtime: `admin_content_release.ts`, `language_release.ts`, `release_sealing.ts`, `release_surface_delivery.ts`, consumer adapters.
- UI source of truth: `docs/design/ADMIN_UI_BIBLE.md`.
- Existing patterns:
  - terminal lease/audit transaction — `content_stage_worker.ts`;
  - cursor pagination — audit/report flows in `admin-core.js`;
  - locked preview-before-mutation — remote-config flow in `admin-core.js`;
  - partial checkpoint — `flashcard_partial_checkpoint.ts`;
  - emulator invocation — `docs/release_gates/progress_premium_server_authoritative_2026-06-13.md`.

### Allowed APIs/patterns

- `acquireStageLease(...)`, `canCommitStageLease(...)`.
- `chooseGenerationCheckpointAction(...)`, `assertGenerationCheckpointIdentity(...)`.
- `buildGenerationTerminalAudit(...)`, deterministic operation IDs.
- Firestore `runTransaction`, `tx.create`, CAS revision/lease checks.
- Storage generation preconditions and SHA-256 receipts.
- Stage prompt/context/schema/grounding hashes.
- Cursor contract `{cursor} -> {items,nextCursor,isPartial}`.
- Playwright loopback-only fake backend and Firebase Emulator with isolated project IDs.

### Запрещённые анти-паттерны

- Запись checkpoint/state/audit вне lease+attempt CAS.
- `.catch(console.error)` на обязательной persistence transaction.
- Client loop вместо серверного bulk plan.
- Изменение байтов существующего immutable artifact.
- Снятие publication block без реального consumer/runtime fixture.
- Расширение языка простым добавлением locale code.
- AI judge как автоматический approval.
- Выдача capped metrics за полную выборку.

**Phase 0 acceptance:** в evidence каждого релиза перечислены прочитанные reference paths, реально используемые API и отсутствующие/неприменимые API.

---

## Release 8A — Concurrency correctness и общие orchestration-примитивы

### Task 8A.1 — Общий guarded execution kernel

**Создать:**

- `functions/src/content_factory/generation_execution.ts`
- `functions/src/content_factory/generation_execution.test.ts`

**Реализовать:**

1. Общий контракт lease-owned checkpoint commit.
2. Общий terminal commit: state + job progress + audit в одной транзакции.
3. Provider-call reservation hook, не привязанный к конкретному provider.
4. Immutable-write finalization interface без изменения payload contracts.
5. Адаптировать оба worker к kernel, не объединяя сами engines.

**Reference:** копировать CAS-паттерн из terminal transaction `content_stage_worker.ts`, audit identity из `generation_audit.ts`.

### Task 8A.2 — Исправить stale checkpoint и persistence masking

1. Убрать безусловный `unitRef.set(state='generated')` без lease CAS.
2. Любой checkpoint сохранять только при совпадении `leaseToken + attempt`.
3. Не подавлять ошибку failure/audit transaction.
4. Возвращать отдельную нормализованную persistence error, если terminal state не записан.
5. Replay/busy/blocked/superseded не создают state mutation и audit.

### Task 8A.3 — Firestore Emulator race suite

**Создать:**

- `functions/src/content_factory/emulator/generation_races.emulator.test.ts`
- isolated emulator runner/script и package command.

**Сценарии:**

- cancel во время provider call;
- stale worker после retry;
- expired lease takeover;
- duplicate terminal callback;
- audit `tx.create` collision;
- failed persistence transaction;
- stage и legacy unit проходят одинаковую матрицу.

**Acceptance R8A:**

- ни один worker не пишет checkpoint, terminal state, progress или audit без matching lease+attempt;
- stale result не меняет документ и не создаёт audit;
- terminal audit exactly-once и атомарен;
- legacy fixtures и runtime schemas неизменны;
- Functions unit + emulator suite + build + Advisor `APPROVED`.

---

## Release 8B — Storage finalization и операционная достоверность

### Task 8B.1 — Reference state и безопасный orphan retention

**Изменить/создать:**

- `artifact_storage.ts`
- `artifact_retention.ts` + tests
- dry-run cleanup command; scheduled mutation только при отдельном разрешении.

**Требования:**

1. Object receipt получает deterministic reference/finalization state.
2. Orphan candidate появляется только после проигранной lease/transaction race.
3. Cleanup по умолчанию dry-run, bounded и age-gated.
4. Перед удалением проверять ссылки из stages, units, releases, ledgers, previews и audit evidence.
5. Referenced immutable object никогда не удаляется.

### Task 8B.2 — Query-before-limit и pagination

1. Workspace фильтрует `studyTarget/sourceLocale` до `limit`.
2. Stage list получает stable ordering, cursor, filters и `nextCursor`.
3. Добавить необходимые `firestore.indexes.json` только после фиксации query shape.
4. Emulator test доказывает отсутствие gaps/duplicates.

### Task 8B.3 — Truthful rollout metrics

1. Возвращать `isPartial`, sampled window и truncation отдельно для stages/units/jobs.
2. Readiness UI не показывает capped sample как complete.
3. Threshold/rollout решения блокируются при неизвестной полноте.
4. Сохранять staged/legacy populations отдельно и вместе.

**Acceptance R8B:** orphan dry-run manifest воспроизводим; query filters применены до limit; cursor tests зелёные; partial-state виден в Admin; index preflight и Advisor `APPROVED`.

---

## Release 9A — Provider, deterministic QA и budget integrity

### Task 9A.1 — Provider-call budget

1. Определить cap как provider requests, а не logical artifacts.
2. Каждый initial/repair call резервирует unit либо stage заранее резервирует максимум и возвращает unused units.
3. Cap exhaustion останавливает вызов до provider request.
4. Receipt содержит requested/used/refunded units.
5. Не называть units токенами или деньгами без actual provider usage.

### Task 9A.2 — Context-bound repair

1. Repair сохраняет immutable system/task/context/grounding/schema identity.
2. Передавать исходный JSON Schema и только необходимые grounding fields.
3. Previous JSON остаётся untrusted data, не инструкцией.
4. Receipt сохраняет те же hashes и отдельный repair attempt hash.
5. Max repairs остаётся bounded.

### Task 9A.3 — Structured output capability negotiation

1. Расширить provider interface возможностью `json_schema`.
2. Использовать schema-constrained output только для поддерживаемой model/provider capability.
3. Fallback — JSON mode плюс тот же server validator.
4. Никогда не считать provider enforcement заменой серверной проверки.

### Task 9A.4 — Единый surface QA

1. Lesson, Quiz, Flashcard и Arena получают deterministic QA receipts.
2. Проверять locale direction, exact answer/index, dedup, source/grounding, runtime compatibility.
3. Legacy surface flow либо использует тот же dispatcher, либо остаётся blocked при QA mismatch.
4. QA failure не записывает publishable artifact.

### Task 9A.5 — Per-stage model policy

1. Versioned policy: provider/model/maxTokens/temperature/capabilities по stage kind.
2. Theory/50 phrases не используют слепо общий `maxTokens=8000`.
3. Evidence содержит policy version и фактические параметры.
4. `operatorCorrected` до R10 показывается как unavailable/not collected, не 0%.

**Acceptance R9A:** fake provider доказывает call accounting и cap; repair содержит context/schema; structured-output fallback тестируется; все surfaces имеют QA receipt; no project API calls from Codex; Advisor `APPROVED`.

---

## Release 9B — 50-phrase checkpoint и assembly

### Task 9B.1 — Chunk contract

**Создать:** `lesson_phrase_checkpoint.ts` + tests.

1. Разбить 50 фраз на детерминированные chunks, например 5×10.
2. Checkpoint принимает только полностью валидный chunk.
3. Accepted chunks immutable внутри revision.
4. Retry запрашивает только missing chunks.

### Task 9B.2 — Final whole-artifact gate

1. Assembly всегда даёт ровно 50.
2. Whole-artifact dedup, ordering, coverage/exclusions и source meaning.
3. Частичные chunks не видны downstream stages и не могут быть approved.
4. Cancellation/stale lease сохраняет recoverable, но непубликуемый checkpoint.

### Task 9B.3 — Preview/retry evidence

1. Admin показывает accepted/missing chunks.
2. Smoke: 30/50 → malformed refill → retry 20 → final 50.
3. Hash manifest доказывает, что accepted chunks не изменились.

**Acceptance R9B:** chunk/emulator races проходят; downstream открывается только после final 50; rollback/revision compatibility; real-language sample review и Advisor `APPROVED`.

---

## Release 10A — Operator workflow backend APIs

### Task 10A.1 — Server bulk/range plan

1. Один bounded/idempotent server command создаёт план стадий.
2. Вход: range/scopes, selected stage kinds, language/CEFR, dependency policy.
3. Ответ: plan ID, per-stage IDs, progress and conflicts.
4. Не использовать client loop.
5. Partial create/replay не дублирует stages.

### Task 10A.2 — Approved dependency query

1. Server-filtered picker API по request/language/scope/kind/state.
2. Возвращать title/revision/artifact hash/createdAt, cursor и partial state.
3. Raw ID остаётся техническим payload, не основным UX.

### Task 10A.3 — Immutable artifact edit/revision

1. Edit создаёт новый artifact revision и новый object path.
2. Хранить base artifact/hash, actor, reason, patch, revision fingerprint.
3. Повторно валидировать schema, grounding, dedup и runtime contract.
4. Original bytes не изменяются.
5. Persist correction event; только после этого активировать `operatorCorrectionRate`.

### Task 10A.4 — Review fingerprint и semantic diff model

1. Approval привязан к exact artifact revision/hash/generation/grounding receipt.
2. Stale preview не может approved новую revision.
3. Stage-aware diff для topic, phrases, derived sections, questions, cards и Arena.

### Task 10A.5 — Shared capability matrix

1. Server-authoritative kind/language/CEFR/count/prerequisite rules.
2. Admin получает эту матрицу, но server остаётся trust boundary.
3. Unsupported combinations не создают plan.

**Acceptance R10A:** API contract tests, idempotent bulk smoke, edit revision/rollback tests, stable pagination/index tests, audit matrix и Advisor `APPROVED`.

---

## Release 10B — Modular Admin Content Studio UX

### Task 10B.1 — Декомпозиция Admin

**Извлечь из `admin-core.js`:**

- `admin/v2/scripts/content-factory/state.js`
- `controller.js`
- `renderers.js`
- дополнительные stage-specific renderer modules по необходимости.

Сохранить router, permissions и localhost-only E2E seam.

### Task 10B.2 — Bulk и dependency UX

1. One/range mode для независимых stages.
2. Multi-select stage types только из capability matrix.
3. Searchable dependency picker вместо копирования IDs.
4. Per-stage progress, conflict и retry controls.

### Task 10B.3 — Review/edit/diff UX

1. Stage-specific tables/cards вместо raw JSON.
2. Highlight correct answers, distractors, source refs, duplicates, coverage.
3. Edit → immutable preview → semantic diff → reason → new revision.
4. Raw JSON доступен вторичным disclosure.

### Task 10B.4 — Filters/pagination/accessibility

1. Filters: request, kind, state, scope, language.
2. Cursor “Показать ещё”, no DOM map over unbounded list.
3. Loading/empty/error/partial states.
4. Keyboard order, focus, tooltips, live regions.
5. Playwright widths 375/768/1024/1440.

**Acceptance R10B:** Admin UI Bible audit; full visible-controls E2E for bulk/dependency/edit/diff/pagination; unexpected network 0; screenshots/traces ignored; Advisor `APPROVED`.

---

## Release 11A — Flashcard scale и rich runtime completion

### Task 11A.1 — Semantic-key registry

1. Incremental idempotent backfill с dry-run manifest.
2. Collision/conflict detection и locale/surface partition.
3. Shadow comparison с текущим <=500 scan.
4. Cutover только при полном совпадении.

### Task 11A.2 — Rich Flashcard consumer

1. Сохранить examples/notes/sourceReferences через seal/runtime/rollback.
2. Определить old-client compatibility/fallback.
3. Runtime fixtures и app loader tests.
4. Снять publication block только после consumer gate.

**Acceptance R11A:** registry shadow parity, backfill rollback, rich runtime E2E, old-client policy, Advisor `APPROVED`.

---

## Release 11B — Challenge runtime consumer (optional decision gate)

### Product gate

До реализации требуется явное решение: Challenge должен публиковаться в приложение или остаётся редакторским draft-only инструментом.

Если publish одобрен:

1. Определить app runtime contract и loader seam.
2. Реализовать consumer adapter, seal/activation/rollback fixtures.
3. Проверить old-client behavior.
4. Снять warning/publication block только после реального consumer E2E.

Если решение не принято — сохранить draft-only, не считать это дефектом и не блокировать остальные релизы.

---

## Release 11C — Постепенное сближение двух engines

### Task 11C.1 — Migration telemetry и readiness

1. Сравнивать legacy/stage outcomes по surface.
2. Определить parity thresholds и kill switch.
3. Compatibility fixtures для old jobs/releases.

### Task 11C.2 — Surface-by-surface migration

1. Не делать big-bang rewrite.
2. Один surface за релизную волну.
3. Dual-read/shadow comparison до cutover.
4. Old-path fallback и rollback после каждой волны.
5. Accepted drafts/catalog pointers сохраняются.

### Task 11C.3 — Retirement gate

Legacy worker удаляется/блокируется только после доказанной нулевой активности, complete parity, compatibility window и явного approval. Этот релиз не добавляет новые features/languages.

**Acceptance R11C:** dual-read parity, canary evidence, kill switch, rollback and Advisor `APPROVED` на каждой surface-wave.

---

## Release 12 — Quality optimization и empirical observability

### Task 12.1 — Resume и uniform review semantics

1. `unit.resume` — отдельное audit event, не новый provider attempt.
2. Review fingerprints покрывают все stage kinds.
3. Admin объясняет generate/retry/resume раздельно.

### Task 12.2 — Prompt regression corpus

1. Включить все отклонённые R3–R6 examples.
2. Golden valid + red-team invalid fixtures.
3. Offline score по grammar, ambiguity, CEFR, locale, dedup, runtime.
4. Prompt promotion vN→vN+1 только после regression gate.

### Task 12.3 — Shadow judge

1. Independently prompted/model-routed judge в shadow режиме.
2. Judge никогда не auto-approves.
3. Disagreement/low confidence → human review.
4. Privacy, cost cap и evidence hashes обязательны.

### Task 12.4 — Arena empirical timing

1. Privacy-safe telemetry: item/difficulty/device class.
2. p50/p95, timeout rate, wrong-answer rate.
3. Minimum sample thresholds до изменения expected time.
4. Authoritative 40s policy сохраняет rollback.

### Task 12.5 — Optional resilience и language expansion

1. Provider fallback/circuit breaker — отдельный decision gate.
2. Новый язык — только по одному за canary.
3. Обязательны blueprint/source registry, runtime fixtures, native review и regression corpus.
4. Добавление locale code без этих evidence запрещено.

**Acceptance R12:** corpus gate reproducible; judge shadow-only; empirical timing thresholds; no automatic language rollout; final Advisor `APPROVED`.

---

## Verification после каждого task

1. Точный failing test до изменения.
2. Минимальная scoped реализация.
3. Focused Jest + Functions TypeScript build.
4. Emulator test для transaction/query/index задач.
5. `node --check` для Admin JS.
6. Playwright для пользовательских workflow.
7. `git diff --check`, tooltip/language audits при Admin изменениях.
8. Fake-provider smoke и independently recomputed SHA-256 manifest.
9. Реалистичный language sample только через Codex model routing без project key; отдельный Advisor review.
10. Final Advisor release gate; `CHANGES_REQUIRED` исправляется и пересматривается.

## Deployment/canary gate для каждого релиза

- Implementation не означает deployment.
- До deployment записать project ID/environment, callable/index/Hosting allowlist, prior versions и rollback commands.
- Functions, indexes и Hosting выпускать отдельно.
- Волны: local/emulator → один объект → три → bounded batch.
- Между волнами observation window.
- Stop: stale write, missing/duplicate audit, wrong answer, hash drift, partial-data mislabel, budget mismatch, unsafe orphan deletion, compatibility regression или потеря accepted draft.
- Rollback сохраняет immutable candidate artifacts и drafts.

## Порядок выполнения

`R8A → R8B → R9A → R9B → R10A → R10B → R11A → optional R11B → R11C surface waves → R12`.

Нельзя начинать новый релиз без `APPROVED` предыдущего обязательного gate. R11B не блокирует R11C/R12, если продукт явно оставляет Challenge draft-only.
