# Admin v2 Content Generation Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each release is a separate completion gate and must not be silently merged with the next release.

**Goal:** Turn Admin v2's failing monolithic content factory into a reliable, observable platform of independent generators for lessons, derived lesson sections, quizzes, challenges, flashcard packs, and arena content.

**Architecture:** Replace checkbox-count orchestration with a versioned stage plan: `GenerationRequest -> planned units/DAG -> immutable draft artifacts -> QA receipts -> human approval -> existing release pipeline`. Preserve the current endpoints and stored artifacts through compatibility adapters. A successful upstream artifact may be reused by downstream stages, so retrying vocabulary or a ten-question batch never regenerates an approved lesson.

**Tech Stack:** Admin v2 vanilla HTML/CSS/JavaScript, Firebase callable functions, Firestore, Cloud Storage immutable artifacts, TypeScript/Jest, production LLM provider behind the existing Cloud Function secret.

---

## Non-negotiable execution rules

- The Codex session must never read, call, or indirectly trigger content generation through the project's `OPENAI_API_KEY`, including through a deployed callable. Runtime automation uses deterministic fake providers and recorded fixtures. Language-quality samples are generated through Codex model routing from the exact versioned prompt/context packet, then reviewed in a separate sequential Advisor turn; this uses no project API key and requires no Firebase staging project.
- No generated content is auto-published. Every pipeline ends in draft, preview, QA receipt, human approval, then the existing publish/rollback flow.
- Existing read paths, jobs, artifacts, release sealing, runtime delivery, and controls remain operational through adapters.
- Every coding task follows red test -> focused implementation -> focused test. One mandatory Advisor review occurs at each release gate; extra Advisor calls happen only after rejection or material scope change.
- Generated language quality is a release criterion, not an informal impression. To respect the two-thread cap, one Codex-routed turn generates a sample from the exact prompt packet, that turn ends, and a sequential Advisor follow-up performs blind language review. Failures require prompt revision and a new routed sample.
- Never weaken a test to accept faulty generation. Never hide, disable, or delete an existing control to make a release pass.

## Confirmed baseline defects

1. `createGenerationJob()` counts six selected UI surfaces, while `splitGenerationJob()` collapses lesson, vocabulary, and drills into one canonical lesson unit. The job can expect `6N` while only `4N` units exist.
2. The UI accepts up to 100 lesson IDs but the only selected registry is `english-core-32:v1`; lessons 33+ fail with `blueprint_lesson_not_found`.
3. `runAllFactoryUnits()` discards individual exceptions with `catch { failed += 1 }`, leaving the administrator without the real cause or retry decision.
4. Lesson generation requests phrases, vocabulary, and drills in one response, while theory is explicitly prohibited. Vocabulary, irregular verbs, prepositions, and theory cannot be regenerated independently.
5. Quiz/arena/card generation has one generic prompt, no explicit batch size, weak linguistic validation, and no explanation contract.

## Quality gates used after every task

### Executor gate

- Run the exact failing test first and record the expected failure.
- Make the smallest scoped change.
- Run the focused test, TypeScript compile for Functions when relevant, and `node --check` for changed Admin JavaScript.
- Inspect `git diff --check` and the exact changed paths. Do not include unrelated dirty-worktree files.
- After each task, run a task-level contract review against that task's checklist and attach the result to the release packet. This is deterministic/self-review or a sequential reviewer after the executor stops; it is not a parallel third agent.

### Advisor gate

- At the end of every release, send the objective, constraints, actual diff, focused test output, smoke evidence, unresolved risks, and prompt/sample hashes to the configured Sol/xhigh `advisor`.
- A release advances only on `DECISION: APPROVED`. Apply `CHANGES_REQUIRED` and resubmit the actual final state.

### Sequential language-review gate

- After the executor turn ends, give the Advisor reviewer only the rubric, target/source languages, level, source blueprint evidence, sanitized generated artifact, and anonymized IDs. Do not run a third or parallel agent.
- It scores: grammatical correctness, translation fidelity, CEFR fit, naturalness, uniqueness, distractor quality, explanation correctness, coverage, and safety from 0–5.
- Hard failures: factual grammar error, wrong correct answer, two valid answers, fabricated rule, wrong language field, source contradiction, or duplicate beyond the allowed threshold.
- Passing threshold: no hard failures; every category >=4; mean >=4.5. The reviewer returns structured JSON plus short evidence for every score below 5.
- A failed sample creates a prompt-regression fixture, increments `promptVersion`, and triggers a fresh smoke run. Do not hand-edit the sample and call it fixed.
- Codex reruns fixture/fake-provider smoke and routed language samples itself. Firebase deployment or a live callable invocation is a separate operational rollout check and does not block implementation releases R1–R6.

Reviewer input is versioned JSON and deliberately omits the authoring prompt:

```json
{"rubricVersion":"content-quality-v1","reviewerModelId":"codex-routed-model","studyTarget":"fr","sourceLocale":"ru","cefr":"A1","artifactType":"quiz_questions","blueprintEvidence":[],"items":[]}
```

Reviewer output must validate against this shape before it is accepted:

```json
{"status":"pass|fail|disputed","scores":{"grammar":0,"translationFidelity":0,"cefrFit":0,"naturalness":0,"uniqueness":0,"distractors":0,"explanations":0,"coverage":0,"safety":0},"grammarErrors":[],"translationErrors":[],"ambiguousAnswers":[],"explanationErrors":[],"safetyFindings":[],"hardFailures":[],"findings":[{"itemId":"id","severity":"low|medium|high|critical","evidence":"concise evidence"}]}
```

- The prompt author cannot self-assign the final quality score. The sequential Advisor reviewer uses Codex model routing only, never a local API script or Firebase secret.
- Reviewer schema validation rejects any missing rubric score, including `safety`; every safety hard failure must also appear in `hardFailures` and `safetyFindings`.
- A `disputed` result is re-reviewed in a fresh Advisor context after the executor turn; disagreement blocks promotion until a human adjudicates it.
- Compare prompt versions on one fixed baseline set plus an unseen set containing at least one boundary and one adversarial case per generator. A new version must keep all passing fixtures green.
- Stop after three failed prompt revisions or the operator's declared spend limit, whichever comes first, and set `quality_blocked`. No mean score can override a hard failure.

## Release 0 — Baseline, contracts, and safe diagnostics

### Task 0.1: Freeze the current failure as tests

**Files:**
- Modify: `functions/src/content_factory/contracts.test.ts`
- Modify: `functions/src/content_factory/job_service.test.ts`
- Modify: `tests/admin_v2_content_factory_jobs_contract.test.ts`

- [ ] Add a contract test proving that every persisted unit is represented exactly once in `progress.total` for all six legacy checkbox combinations.
- [ ] Add a test for a request containing lessons 32 and 33 against a 32-lesson registry; expect an explicit coverage failure listing lesson 33.
- [ ] Add an Admin contract asserting that unit errors are retained with unit, attempt, code, message, and retryability.
- [ ] Run only these tests and confirm the new assertions fail for the diagnosed reasons.

### Task 0.2: Define the error and evidence vocabulary

**Files:**
- Create: `functions/src/content_factory/generation_errors.ts`
- Create: `functions/src/content_factory/generation_errors.test.ts`

- [ ] Define stable error categories: `source_missing`, `source_coverage`, `provider_rate_limit`, `provider_schema`, `qa_failed`, `budget_exhausted`, `storage_failed`, `permission_denied`, `cancelled`, and `unknown`.
- [ ] Mark only transient provider/storage errors retryable; validation, coverage, permission, and QA failures require changed input or review.
- [ ] Sanitize provider details before storage and cap administrator-facing detail length.
- [ ] Test taxonomy, sanitization, and retry decisions.
- [ ] Keep this module unreferenced until Release 1 and prove no production bundle/runtime path imports it in Release 0.

### Task 0.3: Record a read-only baseline

**Files:**
- Create: `docs/reports/admin-content-factory-baseline-2026-07-12.md`

- [ ] Record current unit math, registry coverage, callable names, job/artifact collections, and narrow test commands.
- [ ] Run no production generation in this task.
- [ ] Complete Executor, Advisor, and document self-review gates for Release 0.

**Release 0 acceptance:** the known faults reproduce deterministically, terminology is stable, and no runtime behavior has changed.

## Release 1 — Make the existing generator honest and recoverable

### Task 1.1: Use one generation plan as the source of truth

**Files:**
- Create: `functions/src/content_factory/generation_plan.ts`
- Create: `functions/src/content_factory/generation_plan.test.ts`
- Modify: `functions/src/content_factory/contracts.ts`
- Modify: `functions/src/content_factory/job_service.ts`
- Modify: `functions/src/admin_content_factory.ts`

- [ ] Build legacy units first and derive `progress.total` from `units.length`; never calculate total separately from checkboxes.
- [ ] Persist requested legacy surfaces and planned canonical units so the UI can explain the mapping.
- [ ] Preserve idempotent unit IDs and reject a replay whose plan identity differs.
- [ ] Retry an unchanged transient failure under the same unit identity. Any changed input, prompt version, count, or upstream artifact creates a new revision/unit identity linked through `supersedesUnitId`; immutable accepted artifacts are never mutated.
- [ ] Test single surface, all six legacy surfaces, duplicate surfaces, multiple lessons, and idempotent replay.

### Task 1.2: Preflight real registry coverage

**Files:**
- Modify: `functions/src/admin_content_factory.ts`
- Modify: `functions/src/content_factory/source_registry.ts`
- Modify: `functions/src/admin_content_factory_read.ts`
- Modify corresponding focused tests.

- [ ] Load and validate the selected source registry before creating the job.
- [ ] Reject missing lessons with `source_coverage` and the exact missing IDs.
- [ ] Return registry version, covered range/IDs, evidence state, and maximum selectable lesson to Admin v2.
- [ ] Test sparse registries as well as the current 1–32 registry; do not assume coverage is always contiguous.

### Task 1.3: Surface per-unit errors and selective retry

**Files:**
- Modify: `functions/src/content_factory_worker.ts`
- Modify: `functions/src/admin_content_factory_read.ts`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify corresponding worker/read/Admin contract tests.

- [ ] Persist attempt history with normalized code, safe message, timestamp, and retryability.
- [ ] Replace the swallowed UI catch with a visible row for every failed unit.
- [ ] Add `Повторить` and `Повторить ошибки` for unchanged retryable failures. For corrected inputs, expose `Создать новую ревизию`, which creates a new unit linked to the superseded attempt; successful units remain untouched.
- [ ] Provide loading, empty, partial, terminal, and stale-lease states with text plus status color.
- [ ] Keep two-worker concurrency configurable and default it to a conservative value of 1–2.

### Task 1.4: Admin preflight and batch preview

**Files:**
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `tests/admin_v2_language_factory_workflow_contract.test.ts`
- Run Admin UI Bible tooltip, language, route, and accessibility audits.

- [ ] Before creation, show language direction, registry, lesson IDs, canonical unit count, selected content, and known blockers.
- [ ] Disable launch outside registry coverage with a human-readable explanation.
- [ ] Ensure one primary CTA, labelled fields, tooltips, keyboard focus, 44px important controls, and dark foreground on lime surfaces.
- [ ] Verify responsive layouts at 375, 768, 1024, and 1440 widths.

### Task 1.5: Legacy smoke test

- [ ] Run automated one-lesson/one-surface, all legacy selections, three-lesson, injected partial-failure, retry, and idempotent-replay scenarios with a deterministic fake provider.
- [ ] Exercise the current legacy lesson/quiz/flashcard/arena prompt shapes through deterministic fixture/fake-provider smoke; realistic Codex-routed language samples begin in Release 3 after versioned stage prompts exist.
- [ ] Confirm terminal progress equals persisted units and every error is actionable.
- [ ] Complete Executor, independent operational review, and Advisor gates.

**Release 1 acceptance:** existing generation no longer silently runs through a doomed batch; all jobs either complete or name the exact failing units and corrective action.

## Release 2 — Versioned stage engine and prompt infrastructure

### Task 2.1: Introduce stage contracts without breaking legacy jobs

**Files:**
- Create: `functions/src/content_factory/stage_contracts.ts`
- Create: `functions/src/content_factory/stage_contracts.test.ts`
- Create: `functions/src/content_factory/dependency_graph.ts`
- Create: `functions/src/content_factory/dependency_graph.test.ts`
- Modify: `functions/src/content_factory/job_service.ts`

- [ ] Define independent stage kinds for lesson outline/phrases/vocabulary/irregular verbs/prepositions/theory and topic/item stages for quiz/challenge/flashcards/arena.
- [ ] Give every unit `schemaVersion`, `promptVersion`, `count`, prerequisites, artifact ID, idempotency key, and QA policy.
- [ ] Validate acyclic dependencies and block a downstream stage until prerequisites are approved.
- [ ] Map legacy jobs through a compatibility adapter and prove old stored jobs still deserialize.

### Task 2.2: Create a versioned prompt registry

**Files:**
- Create: `functions/src/content_factory/prompt_registry.ts`
- Create: `functions/src/content_factory/prompt_registry.test.ts`
- Create: `functions/src/content_factory/prompt_context.ts`
- Create: `functions/src/content_factory/prompt_context.test.ts`

- [ ] Build typed context containing language direction, CEFR, objective, approved upstream artifact IDs, exemplar IDs, prior-content fingerprints, and exact requested count.
- [ ] Separate system rules, stage task, JSON schema, and QA rubric. Never reuse one universal surface prompt.
- [ ] State source/target language semantics for every field and reject instruction-like text from content evidence.
- [ ] Persist prompt/model/schema/context hashes in each receipt.

### Task 2.3: Structured output, repair, pause/resume/cancel

**Files:**
- Modify: `functions/src/content_factory/generation_provider.ts`
- Modify: `functions/src/content_factory_worker.ts`
- Create: `functions/src/content_factory/stage_runner.ts`
- Create focused tests for provider and runner.

- [ ] Validate structured JSON before storage.
- [ ] Permit at most two targeted repair attempts using the previous JSON plus validation errors; do not regenerate a whole valid artifact for a local defect.
- [ ] Add safe pause, resume, and cancel transitions plus lease recovery.
- [ ] Test transient retry, permanent failure, checkpoint resume, cancellation, and duplicate execution.

### Task 2.3a: Secure new collections and actions before UI exposure

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json` only when a tested query requires an index.
- Modify: callable authorization and focused security tests.

- [ ] Enforce separate permissions for draft generation, retry/revision, artifact review, approval, publish, cancel, and rollback.
- [ ] Reject client attempts to set provider model, trusted prompt version, QA receipt, approval identity, immutable artifact hash, or server timestamps.
- [ ] Test unauthorized, read-only, content-manager, and publisher roles before exposing each new Admin action.

### Task 2.4: Stage-oriented Admin shell

**Files:**
- Create: `admin/v2/scripts/pages/content-generator.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-router.js`
- Modify: `admin/v2/scripts/admin-capabilities.js`
- Modify Admin v2 styles and focused contracts.

- [ ] Add one categorized `Контент -> Генератор контента` page with tiles for Lessons, Quizzes, Challenges, Flashcards, and Arena.
- [ ] Each tile supports `Один` and `Диапазон`; lesson derived-stage buttons remain visibly locked until phrases pass approval.
- [ ] Add progress table, filters, artifact preview, pause/resume, and retry actions without nested-card clutter.
- [ ] Complete Admin UI Bible audits and Advisor gate.

**Release 2 acceptance:** independent stages can be planned, paused, resumed, retried, and audited while legacy jobs remain readable.

## Release 3 — High-quality lesson pipeline

### Task 3.1: Lesson outline and exactly 50 phrases

- [ ] Implement `lesson_outline` and `lesson_phrases` schemas and prompts using the selected English blueprint as sequencing evidence.
- [ ] Validate identity, exact count, uniqueness, language direction, CEFR, coverage, and source meaning.
- [ ] Store phrases as a standalone approved artifact that downstream stages reference by immutable ID.

### Task 3.2: Deterministic candidate extraction and cumulative ledger

**Files:**
- Create: `functions/src/content_factory/lesson_extractors.ts`
- Create: `functions/src/content_factory/dedupe_ledger.ts`
- Create corresponding tests.

- [ ] Extract vocabulary, irregular-verb, and preposition candidates locally from approved phrases.
- [ ] Deduplicate against lessons 1..N-1 by normalized lemma plus part of speech, retaining explicit homonym exceptions.
- [ ] Persist a receipt with extracted, excluded-previous, rejected, and accepted candidates.
- [ ] Specify and test missing prior lessons, regeneration of lesson N after N-1 changes, homonyms across parts of speech, phrasal verbs, multi-word prepositions, and languages without a supported local lemmatizer.
- [ ] For unsupported lemmatization, stop with a visible review-required state rather than claiming a reliable dedupe.
- [ ] Update the cumulative ledger atomically on approval and rollback; downstream artifacts whose prior fingerprint changed become stale, not silently valid.

### Task 3.3: Independent derived lesson generators

- [ ] Implement separate vocabulary, irregular-verbs, and prepositions stages that may be run or rerun individually.
- [ ] Constrain the model to normalize, translate, classify, and explain extracted candidates; it must not invent unrelated entries.
- [ ] Add preview showing source phrase references and previous-lesson exclusions.

### Task 3.4: Theory from gold English exemplars

**Files:**
- Create: `functions/src/content_factory/theory_generation.ts`
- Create: `functions/src/content_factory/theory_generation.test.ts`
- Extend source registry/evidence contracts and Admin preview.

- [ ] Version and validate the English theory exemplar registry.
- [ ] Retrieve 2–4 relevant exemplars using lesson objective and approved phrases.
- [ ] Require rule, examples, common mistakes, mini-check, and exemplar provenance.
- [ ] Add deterministic claim checks and mandatory human review; theory never auto-publishes.
- [ ] Require every rule and example to reference a concrete exemplar fragment or approved lesson phrase; unsupported claims are a hard failure.
- [ ] Stop for human adjudication when exemplars conflict. English exemplars define sequencing and quality but must never mechanically impose English grammar on another target language.

### Task 3.5: Lesson smoke and prompt iteration

- [ ] Run fake-provider smoke for lesson 1, one middle lesson, and lesson 32 across at least two registry-supported language directions.
- [ ] Generate realistic samples from the exact versioned prompt packets through Codex model routing, then run sequential Advisor language review on outlines, 50 phrases, derived sections, and theory.
- [ ] For every failed rubric item, add a fixture, revise the smallest prompt section, increment prompt version, and rerun the same cases plus one unseen lesson.
- [ ] Require two consecutive passing runs before Advisor approval.
- [ ] Verify each stage separately: phrases, vocabulary, irregular verbs, prepositions, and theory can each start and rerun alone; derived stages remain locked before phrase approval; rerunning one stage preserves every other successful immutable artifact.

**Release 3 acceptance:** an administrator can generate phrases first, then any derived section independently; cumulative duplicates are explainable and theory is evidence-backed.

## Release 4 — Quiz and challenge studios

### Task 4.1: Independent topic/idea generation

- [ ] Add `quiz_topic` and `challenge_topic` generators using language, CEFR, direction, novelty constraints, and optional administrator guidance.
- [ ] Return editable title, learning promise, skill tags, inclusion/exclusion rules, and intended difficulty distribution.
- [ ] Require administrator acceptance before question generation.

### Task 4.2: Questions in batches of exactly 10

- [ ] Generate exactly ten questions per batch with prompt, one correct answer, three unique plausible distractors, explanation, skill tag, difficulty, and source phrase IDs where applicable.
- [ ] Permit regeneration of one question or one batch without changing successful batches.
- [ ] Maintain a coverage/dedup ledger across all batches in the topic.
- [ ] Trace the actual app consumer and decide the explanation contract from evidence: either one general explanation or a correct-answer explanation plus a reason for each distractor. Test the selected serializer and visible runtime rendering.

### Task 4.3: Quiz/challenge QA and smoke

- [ ] Add deterministic checks for count, unique IDs, exactly one correct option, language fields, duplicates, and source references.
- [ ] Give the sequential Advisor reviewer all 10 sanitized items together so it can detect repeated templates and weak distractors.
- [ ] Run the complete workflow with fake-provider fixtures, then generate a realistic random-topic and two-batch sample through Codex model routing for blind review.
- [ ] Iterate prompt versions until two consecutive unseen batches pass; complete Advisor review.

### Task 4.4: Locate and integrate the existing Challenge consumer

**Files:**
- Inspect first: existing challenge/daily-challenge app screens, loaders, Firestore rules/indexes, serializers, and tests discovered by targeted `rg`.
- Create or modify only after the actual consumer contract and storage destination are documented in the release evidence.

- [ ] Trace challenge input from published artifact or Firestore document through its loader to the app UI and record the real schema/path.
- [ ] Add a stage-to-consumer adapter, preview contract, publish/read test, security-rule test, and backward-compatible fixture for that destination.
- [ ] If no production consumer exists, keep Challenge artifacts draft-only, label the Admin preview `Не подключено к приложению`, and move runtime publication into a separately approved future scope.
- [ ] Record concrete destination adapters for quiz, flashcard, and arena in the same evidence packet instead of deferring every seam check to Release 7.

**Release 4 acceptance:** accepted topics can produce review-ready, independently retryable ten-question batches with reliable explanations; Challenge either has a tested real consumer adapter or is explicitly draft-only and cannot be published.

## Release 5 — Flashcard pack studio

### Task 5.1: Pack idea and contract

- [ ] Generate an editable random pack proposal: title, promise, audience, CEFR, tags, inclusion/exclusion, and uniqueness fingerprint.
- [ ] Allow administrator direction without requiring a full prompt.

### Task 5.2: Card batches and deduplication

- [ ] Generate cards separately with front, back, example, note, source reference, and language-direction contract.
- [ ] Deduplicate against the current pack, selected lesson, and published catalog.
- [ ] Support batch retry and single-card replacement without altering accepted cards.
- [ ] Accept an explicit card count within a tested safe range, generate exactly that count, and validate single-card, normal-batch, maximum-boundary, and partial-retry cases.

### Task 5.3: Smoke, language QA, and integration

- [ ] Run automated fake-provider smoke for random idea, edited idea, two card batches, duplicate rejection, one-card repair, preview, and draft save; generate realistic samples through Codex model routing for review.
- [ ] Pass two consecutive sequential Advisor language reviews and release approval.

**Release 5 acceptance:** pack ideation and card creation are separate, flexible, deduplicated workflows.

## Release 6 — Arena studio

### Task 6.1: Arena-specific topic and runtime contract

- [ ] Define arena topic, short prompt limits, timing metadata, difficulty bands, and exactly four unique options.
- [ ] Do not blindly reuse quiz prompts; validate answer speed, ambiguity, and competitive fairness.
- [ ] Trace the app's real arena loader and test text limits, timer metadata, correct-answer index/identity, locale fields, serialization, and backward-compatible fixtures.

### Task 6.2: Arena batches, QA, and smoke

- [ ] Generate arena questions in batches of ten with coverage and dedup ledgers.
- [ ] Validate runtime compatibility against existing arena release/runtime contracts.
- [ ] Run fake-provider smoke for topic -> 20 questions -> one failed-batch retry -> preview -> draft seal; generate realistic language samples through Codex model routing for review.
- [ ] Require two consecutive quality-review passes and Advisor approval.

**Release 6 acceptance:** arena content is generated independently and is both linguistically sound and runtime-compatible.

## Release 7 — Operational hardening and controlled rollout

### Task 7.1: Regression and migration safety

- [ ] Test legacy stored jobs/artifacts, new staged jobs, release sealing, preview, approval, publish, activation, and rollback.
- [ ] Add read adapters or migrations only where a real fixture proves they are needed.
- [ ] Verify account permissions and audit records for create, generate, retry, approve, publish, cancel, and rollback.

### Task 7.2: Full smoke matrix

- [ ] Run single, range, partial failure, rate limit, schema repair, pause/resume, cancellation, idempotent replay, and stale lease recovery.
- [ ] Run supported-language and boundary-lesson automation with fake providers; review routed realistic samples from exact prompt packets.
- [ ] Confirm Codex neither used nor indirectly triggered the project API key and production spend remains governed by existing job caps.
- [ ] Preserve evidence that local tests injected the fake provider and routed language review used Codex model access without project secrets.

### Task 7.2a: Browser E2E for Admin v2

- [ ] In a local/staging Admin DOM with fake backend responses, create one lesson, create a range, choose stages independently, observe batch progress, inspect an error, retry, pause/resume, and open preview.
- [ ] Verify keyboard order, visible focus, labels/tooltips, error announcements, and responsive widths 375/768/1024/1440.
- [ ] Save screenshots/traces in an ignored QA directory and record only concise results in the release packet.

### Task 7.3: Canary rollout

- [ ] If deployment is explicitly requested, release to a confirmed internal/staging project first, then one lesson/topic, then three, then a bounded batch. Otherwise produce a rollout-readiness/canary plan and do not deploy.
- [ ] Monitor failure categories, attempts per accepted artifact, QA score, operator correction rate, latency, and spend.
- [ ] Define stop conditions: any hard linguistic error, wrong answer, unexplained source drift, error-rate regression, or budget anomaly.
- [ ] Obtain final Advisor `APPROVED` decision before declaring the platform complete.

**Release 7 acceptance:** old and new content flows coexist safely, quality metrics are visible, and rollout can be stopped or rolled back without losing accepted drafts.

## Focused verification commands

Commands are separated because root Jest only discovers `tests/**`, while Functions has its own Jest configuration.

```powershell
Push-Location functions
npx jest --runTestsByPath src/content_factory/contracts.test.ts src/content_factory/job_service.test.ts --runInBand
npx jest --runTestsByPath src/content_factory/generation_errors.test.ts src/content_factory/generation_plan.test.ts --runInBand
npx jest --runTestsByPath src/content_factory/stage_contracts.test.ts src/content_factory/dependency_graph.test.ts --runInBand
npx jest --runTestsByPath src/content_factory/generation_provider.test.ts src/content_factory_worker.test.ts --runInBand
Pop-Location
npm --prefix functions run build
npx jest --runTestsByPath tests/admin_v2_content_factory_jobs_contract.test.ts tests/admin_v2_language_factory_workflow_contract.test.ts --runInBand
node --check admin/v2/scripts/admin-core.js
node --check admin/v2/scripts/admin-firebase.js
node --check admin/v2/scripts/pages/content-generator.js
node scripts/admin-v2-tooltip-audit.mjs
node scripts/admin-v2-language-audit.mjs
npm run text-integrity:audit
git diff --check
```

## Environment and deployment gate

- Implementation and fake-provider smoke do not require deployment.
- Implementation, fake-provider smoke, and routed language-quality review do not require Firebase deployment.
- Deployment is performed only when explicitly included in the user's requested delivery scope. Before deployment, record the selected project, callable allowlist, prior versions, and rollback commands; never infer that the default Firebase project is staging.
- Absence of a staging alias does not block local implementation or Codex-routed language QA.

## Required release evidence packet

Each release stores or links:

- exact changed paths and diff summary;
- focused red/green test evidence;
- smoke scenario IDs and sanitized outcomes;
- prompt, schema, model, context, and artifact hashes;
- independent review JSON and any prompt-regression fixtures;
- known limitations and rollback instructions;
- Advisor decision.

## Implementation order

Execute strictly in order: `R0 -> R1 -> R2 -> R3 -> R4 -> R5 -> R6 -> R7`. R1 is the minimum useful repair. Do not begin prompt-quality tuning while orchestration still loses errors or miscounts units. Do not begin theory until phrase artifacts and provenance are stable. Do not publish any generated sample merely because smoke generation succeeded.
