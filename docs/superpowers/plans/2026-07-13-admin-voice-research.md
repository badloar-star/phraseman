# Admin Voice & Research Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести пять feedback/research-возможностей из legacy в единый безопасный native-раздел Admin v2 без потери редактора, аналитики, CSV и решений по идеям.

**Architecture:** Чистое ядро формирует безопасные проекции и вычисления; callable-слой отвечает за bounded queries, immutable snapshots и preview/apply. Frontend разделён на state/view/controller, а `admin-core.js` остаётся тонким оркестратором.

**Tech Stack:** TypeScript, Firebase Functions v2, Firestore transactions/indexes/rules, Firebase Web SDK, vanilla ES modules, Jest.

---

### Task 1: Core contracts and tests

**Files:**
- Create: `functions/src/admin_voice_research_core.ts`
- Create: `functions/src/admin_voice_research_core.test.ts`

- [ ] Написать failing tests для idea projections/filters, cancellation summaries/trends, onboarding latest-per-UID, survey projections, CSV injection и Plus reward preservation.
- [ ] Запустить `cd functions && npm test -- --runInBand src/admin_voice_research_core.test.ts` и подтвердить RED.
- [ ] Реализовать типы и чистые функции с bounded text/arrays и field allowlists.
- [ ] Повторить тест и получить PASS.

### Task 2: Read model and immutable snapshots

**Files:**
- Create: `functions/src/admin_voice_research.ts`
- Create: `functions/src/admin_voice_research.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.indexes.json`

- [ ] Написать failing tests для caps 501/201/5001/50001, actor/scope cursor, page mutation, snapshot CSV и partial source states.
- [ ] Реализовать `adminGetVoiceResearchWorkspace` со строгим App Check и `users.research.read/export`.
- [ ] Добавить требуемые composite indexes без удаления существующих.
- [ ] Запустить focused tests и Functions build.

### Task 3: Protected idea decisions and AI draft

**Files:**
- Modify: `functions/src/admin_voice_research.ts`
- Modify: `functions/src/user_ideas.ts`
- Modify: `functions/src/admin/permissions.ts`
- Modify: `functions/src/admin_application_controls_callable.test.ts`

- [ ] Написать transaction tests для approve/reject, stale preview, idempotent replay, exactly-one inbox/audit/operation и stronger/lifetime VIP preservation.
- [ ] Реализовать preview/apply action `idea_decide` с deterministic inbox ID.
- [ ] Сделать старый `adminDecideUserIdea` compatibility adapter, принимающий только валидный preview/apply packet.
- [ ] Ужесточить `adminDraftIdeaDecision`: strict App Check, research permission, requestId и краткоживущая идемпотентность; provider мокается в тестах.
- [ ] Запустить focused tests.

### Task 4: Protected survey lifecycle and rollback

**Files:**
- Modify: `functions/src/admin_voice_research.ts`
- Modify: `functions/src/shard_survey.ts`
- Modify: `functions/src/admin_application_controls_callable.test.ts`
- Modify: `firestore.rules`

- [ ] Написать tests для create/update/toggle/delete/restore, schema validation, stale fingerprints и сохранения responses/stats.
- [ ] Реализовать полные before/after snapshots, immutable history и rollback preview.
- [ ] Перевести legacy `adminWriteShardSurvey/adminDeleteShardSurvey` в fail-closed compatibility adapters.
- [ ] Закрыть browser access к новым snapshot/preview/history collections.
- [ ] Запустить focused tests и rules contracts.

### Task 5: Native frontend modules

**Files:**
- Create: `admin/v2/scripts/admin-voice-research-state.js`
- Create: `admin/v2/scripts/admin-voice-research-view.js`
- Create: `admin/v2/scripts/admin-voice-research-controller.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/styles/admin.css`
- Create: `tests/admin_v2_voice_research_contract.test.ts`

- [ ] Написать failing frontend contract для пяти views/deep links, snapshots, loading/empty/partial/error, profile links, preview/apply и отсутствия direct Firestore.
- [ ] Реализовать state/view/controller и callable wrappers.
- [ ] Подключить тонкий route lifecycle и event delegation.
- [ ] Проверить keyboard/focus/tooltips, lime contrast и responsive cards.
- [ ] Запустить contract и JS syntax tests.

### Task 6: Legacy compatibility and coverage

**Files:**
- Modify: `admin/index.html`
- Modify: `admin/v2/scripts/admin-capabilities.js`
- Modify: `admin/v2/data/ADMIN_V2_MIGRATION_COVERAGE.json`
- Modify: `docs/admin/ADMIN_V2_MIGRATION_COVERAGE.json`
- Modify: `scripts/admin-v2-smoke.mjs`
- Modify: `tests/admin_v2_native_capability_routing.test.ts`
- Modify: `tests/admin_v2_migration_coverage.test.ts`

- [ ] Перенаправить пять default legacy deep links в native route и сохранить явный callable-fed read-only archive mode.
- [ ] Обновить capability grouping и route resolution.
- [ ] Перегенерировать board через `node scripts/admin-v2-build-migration-board.mjs`.
- [ ] Проверить ровно 59 total / 31 native / 28 fallback.

### Task 7: Verification, review and deployment

- [ ] Запустить focused Functions suites и `npm run build`.
- [ ] Запустить root contracts, rules tests, smoke/control-plane, migration-board check, language/visible/runtime audits и `git diff --check`.
- [ ] Проверить 375/768/1024/1440 screenshots.
- [ ] Передать actual diff/evidence advisor и получить `DECISION: APPROVED`.
- [ ] Закоммитить пакет.
- [ ] Deploy indexes и дождаться READY.
- [ ] Deploy только affected functions и Hosting.
- [ ] Выполнить authenticated read-only production smoke; mutations и AI не запускать.
- [ ] Deploy dedicated collection rule lockdown и повторить smoke.

