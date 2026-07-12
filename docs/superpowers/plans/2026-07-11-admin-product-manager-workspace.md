# Admin Product Manager Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить ручной административный дайджест в доказательного AI Product Manager с подробной статьёй, рекомендациями, экспериментами и памятью решений владельца.

**Architecture:** Product Codex, governed source manifest, bounded evidence layer, deterministic insight engine, strict PM response contract, atomic memory and Workspace UI remain separate modules. The model receives only aggregated evidence and a relevant Codex projection; code owns numbers, coverage and publication decisions.

**Tech Stack:** TypeScript, Firebase Functions v2, Firestore, Firebase Hosting, Jest, vanilla JavaScript admin UI, existing production OpenAI provider.

---

### Task 1: Define strict PM contracts

**Files:**
- Create: `functions/src/admin_pm_contracts.ts`
- Create: `functions/src/admin_pm_contracts.test.ts`

- [ ] Write failing tests for discriminated `mode: 'full' | 'coverage_only'`, evidence/Codex references, confidence `[0,1]` and 700 KiB limits. `full` requires a 1200–2000-word article, 3–5 recommendations and 1–3 experiments; `coverage_only` forbids causal hypotheses, recommendations and experiments.

```ts
expect(validatePmBrief(fullBrief, new Set(['ev-1']), new Set(['screen:/home']))).toEqual({ ok: true });
expect(validatePmBrief(coverageOnlyWithRecommendation, knownEvidence, knownCodex)).toMatchObject({ ok: false });
```

- [ ] Run `npm --prefix functions test -- admin_pm_contracts.test.ts --runInBand`; expect FAIL because the module is absent.
- [ ] Implement `FullPmBrief`, `CoverageOnlyPmBrief`, `PmEvidence`, `PmRecommendation`, `PmIdea`, `PmExperiment`, `PmDecision`, `PmRun`, limits and validators. Validate every significant item's `evidenceIds` and stable `codexEntityIds` against server-side registries.
- [ ] Re-run the test; expect PASS.
- [ ] Commit with `git commit -m "feat: define product manager contracts"`.

### Task 2: Govern Product Codex and admin coverage

**Files:**
- Create: `functions/src/admin_pm_source_manifest.ts`
- Create: `functions/src/admin_pm_source_manifest.test.ts`
- Create: `docs/product-codex/business-overlay.json`
- Modify: `scripts/generate_project_atlas.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/source-quality.yml`

- [ ] Write a failing test that every `ADMIN_TAB_KEYS` value and every discovered analytical backend source appears exactly once with `included`, `excluded` or `unmapped`. Every included backend source must name an existing adapter and metric formula.
- [ ] Write a failing test that the curated overlay contains four balanced goals, guardrails, journeys and metric formulas and is never generator-owned.
- [ ] Run `npm --prefix functions test -- admin_pm_source_manifest.test.ts --runInBand`; expect FAIL.
- [ ] Implement versioned `PM_SOURCE_MANIFEST`, backend adapter registry and curated business overlay; assign stable IDs to screens, journeys, metrics and features.
- [ ] Extend the atlas generator to emit bounded `functions/src/generated/admin_pm_codex.ts` without rewriting the overlay.
- [ ] Make `npm run codex:check` fail on atlas, manifest or overlay drift.
- [ ] Run `npm run codex:generate && npm run codex:check`; expect fresh output.
- [ ] Commit with `git commit -m "feat: add governed product codex manifest"`.

### Task 3: Collect bounded cross-domain evidence

**Files:**
- Create: `functions/src/admin_pm_evidence.ts`
- Create: `functions/src/admin_pm_evidence.test.ts`
- Modify: `functions/src/admin_digest_sources.ts`

- [ ] Write failing tests for exact current/equal previous windows, 7/28-day context, stable evidence IDs, pagination, deduplication and failed-source-not-zero behavior.

```ts
expect(bundle.contextWindows.map(x => x.days)).toEqual([7, 28]);
expect(bundle.metrics.revenue).toBeUndefined();
expect(bundle.coverage.revenue.status).toBe('failed');
```

- [ ] Run `npm --prefix functions test -- admin_pm_evidence.test.ts --runInBand`; expect FAIL.
- [ ] Implement adapters for growth/activation, learning engagement, revenue, quality/support, retention proxies, safety/community and operations using `readPaginatedSource`.
- [ ] Return only aggregates, counts, exact bounds, granularity, caveats and coverage; redact UID/email/free text and never include raw rows in the model package.
- [ ] Mark day-string sources `partial` for arbitrary exact windows and enforce page/cost limits.
- [ ] Run `npm --prefix functions test -- admin_pm_evidence.test.ts admin_digest_sources.test.ts --runInBand`; expect PASS.
- [ ] Commit with `git commit -m "feat: collect product manager evidence"`.

### Task 4: Compute deterministic insights and publication gate

**Files:**
- Create: `functions/src/admin_pm_insights.ts`
- Create: `functions/src/admin_pm_insights.test.ts`
- Create: `functions/src/admin_pm_publication_gate.ts`
- Create: `functions/src/admin_pm_publication_gate.test.ts`

- [ ] Write failing tests for deltas, percentages with zero denominators, trends, anomaly thresholds, confidence, provenance and stable recommendation/idea fingerprints.
- [ ] Write a failing gate test requiring an `ok` current/previous metric in all four domains: `growth_activation`, `learning_engagement`, `revenue`, `quality_support`.
- [ ] Run both suites; expect FAIL.
- [ ] Implement stable insight IDs, fact/anomaly/hypothesis separation and confidence derived from coverage. Fingerprint normalized recommendation/idea intent plus domain and retain its evidence-set hash.
- [ ] Test that a rejected fingerprint with the same evidence is suppressed, materially new evidence permits reconsideration, and publication validation rejects an unsuppressed duplicate.
- [ ] Implement `coverage_only` output when any core domain fails the gate; recommendations and experiments must be empty.
- [ ] Run both suites; expect PASS.
- [ ] Commit with `git commit -m "feat: compute evidence-backed product insights"`.

### Task 5: Persist PM memory and enforce access

**Files:**
- Create: `functions/src/admin_pm_memory.ts`
- Create: `functions/src/admin_pm_memory.test.ts`
- Create: `functions/src/admin_pm_service.ts`
- Create: `functions/src/admin_pm_service.test.ts`
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: `tests/firestore_rules_security.test.ts`

- [ ] Inspect existing admin callable helpers, App Check policy, custom claim/email allowlist and Firestore admin rules. Use their single shared authorization contract; do not create another admin model.
- [ ] Write failing table tests for recommendation and experiment transitions, bounded comments/results, mandatory decision audit and reading experiment outcomes during the next PM run.
- [ ] Write a failing concurrency test proving the same idempotency key creates one brief and returns the same ID on double-click/retry.
- [ ] Write rules tests with the real claim shape: admin read allowed; non-admin/unauthenticated denied; all client writes to briefs/evidence denied.
- [ ] Implement memory reads for unresolved recommendations, decisions, persisted `admin_pm_ideas` bundles and experiment outcomes. Add explicit query plans and only the composite indexes proven necessary.
- [ ] Implement typed server mutations for recommendation status/comment and experiment status/result; each mutation writes its bundle and mandatory `admin_pm_decisions` audit atomically.
- [ ] Implement lease, ownership checks, 700 KiB limits and staged TTL. Store recommendations, ideas and experiments as one bounded bundle document per brief.
- [ ] Add write-accounting tests. `full` is exactly 7 writes: run, cursor, brief, evidence manifest, recommendation bundle, idea bundle, experiment bundle. `coverage_only` is exactly 4: run, cursor, brief, evidence manifest. Fail if budgets grow; decision audit belongs to later mutations.
- [ ] Run `npm --prefix functions test -- admin_pm_memory.test.ts admin_pm_service.test.ts --runInBand` and `npm test -- firestore_rules_security.test.ts --runInBand`; expect PASS.
- [ ] Commit with `git commit -m "feat: persist product manager decisions safely"`.

### Task 6: Generate a validated PM article

**Files:**
- Create: `functions/src/admin_pm_generation.ts`
- Create: `functions/src/admin_pm_generation.test.ts`
- Create: `functions/src/admin_pm_prompt_security.test.ts`

- [ ] Write failing tests that comments/Codex notes remain `UNTRUSTED_DATA`, no tools are available and embedded instructions cannot change the system role.
- [ ] Write failing tests rejecting unknown evidence IDs, executable HTML, event attributes, iframe and `javascript:`/`data:` URLs.
- [ ] Run both suites; expect FAIL.
- [ ] Implement balanced PM prompt with fact/hypothesis separation, evidence IDs, confidence, article length, 3–5 recommendations and 1–3 experiments.
- [ ] For a closed publication gate, request only verified observations and a coverage report.
- [ ] Parse strict JSON, validate evidence and Codex provenance, enforce rejected-fingerprint suppression, sanitize allowlisted Markdown and record model/prompt/Codex versions.
- [ ] Run both suites; expect PASS.
- [ ] Commit with `git commit -m "feat: generate validated product manager briefs"`.

### Task 7: Add admin callables and Product Manager Workspace

**Files:**
- Create: `functions/src/admin_pm_callables.ts`
- Create: `functions/src/admin_pm_callables.test.ts`
- Create: `admin/admin-product-manager.js`
- Modify: `functions/src/index.ts`
- Modify: `admin/index.html`
- Modify: `functions/src/admin_digest_ui_contract.test.ts`

- [ ] Read `docs/design/ADMIN_UI_BIBLE.md` completely before UI edits.
- [ ] Write failing tests for admin-only `adminGenerateProductBrief` and typed `adminMutateProductItem` (recommendation or experiment), idempotency key validation, bounded comments/results and allowed transitions.
- [ ] Add a contract test proving PM exports use `onCall` only, contain no `onSchedule`, create no scheduler and preserve the legacy digest scheduler/history.
- [ ] Write failing UI contracts for `pm-overview`, `pm-metrics`, `pm-opportunities`, `pm-experiments`, `pm-decisions`, `pm-coverage`, one primary generate button and accessible chart tables.
- [ ] Implement callables with the existing admin/App Check policy and export them from `functions/src/index.ts`.
- [ ] Implement six Workspace tabs, readable article, verified charts, evidence drawers, recommendation controls, experiment cards, decision journal and coverage manifest.
- [ ] Preserve legacy digest history and render all model content through escaping/sanitized Markdown.
- [ ] Run `npm --prefix functions test -- admin_pm_callables.test.ts admin_digest_ui_contract.test.ts --runInBand` and `node --check admin/admin-product-manager.js`; expect PASS.
- [ ] Commit with `git commit -m "feat: add product manager workspace"`.

### Task 8: Integrate, review and deploy

**Files:**
- Modify: `AGENTS.md` only if new Codex/manifest maintenance instructions are required.

- [ ] Run focused verification:

```bash
npm --prefix functions test -- admin_pm_contracts.test.ts admin_pm_source_manifest.test.ts admin_pm_evidence.test.ts admin_pm_insights.test.ts admin_pm_publication_gate.test.ts admin_pm_memory.test.ts admin_pm_service.test.ts admin_pm_generation.test.ts admin_pm_prompt_security.test.ts admin_pm_callables.test.ts admin_digest_ui_contract.test.ts project_codex_contract.test.ts firebase_deploy_contract.test.ts --runInBand
npm --prefix functions run build
npm run codex:check
node --check admin/admin-product-manager.js
git diff --check
```

- [ ] Run `npm test -- firestore_rules_security.test.ts --runInBand`; expect admin-only PM access and denied client writes.
- [ ] Verify PM queries against the Firestore emulator. If `firestore.indexes.json` changed, include `firestore:indexes` in deployment; otherwise do not deploy indexes.
- [ ] Configure and verify Firestore TTL on collection group `admin_pm_evidence_chunks`, field `expiresAt`, using `gcloud firestore fields ttls update expiresAt --collection-group=admin_pm_evidence_chunks --enable-ttl --project=phraseman-ea0b3` or the approved console equivalent. This cleanup policy is not a PM scheduler.
- [ ] Run mocked failure-path integration tests: lost lease, invalid model JSON, failed core source, closed gate, retry after timeout and staged chunks invisible to UI. Local tests must never use the project OpenAI key.
- [ ] Give the final diff, spec, verification evidence and unresolved RevenueCat/source limitations to Advisor; do not deploy without `DECISION: APPROVED`.
- [ ] Deploy only `adminGenerateProductBrief`, `adminMutateProductItem`, Firestore rules, conditional indexes and admin Hosting. Production callables bind the existing Firebase secret; local tests do not call it:

```bash
firebase deploy --only "functions:adminGenerateProductBrief,functions:adminMutateProductItem,firestore:rules,hosting:admin" --project phraseman-ea0b3 --non-interactive
```

- [ ] Production smoke test: generate once and confirm exact period/article/evidence/history. Repeat the same request ID and confirm the existing brief returns without another model call. Defer one recommendation, record one experiment result and confirm both audits. Test `coverage_only` with a fixture/non-production provider rather than breaking a production source.
- [ ] Restore build/cache artifacts, verify clean worktree and commit any intentional instruction changes with `git commit -m "docs: finalize product manager rollout"`.

---

## Plan self-review

- Every approved requirement maps to a task.
- Legacy digest history and manual-only behavior remain intact.
- Publication is evidence-gated, bounded, idempotent and ownership-checked.
- Untrusted notes, comments and model output have prompt-injection/XSS tests.
- Client code cannot mutate briefs or evidence.
- Deployment uses the mandatory Functions predeploy build.
