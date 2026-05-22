# GUSTAV Algorithm Audit 02

Date: 2026-05-19

Scope:

- `docs/gustav/GUSTAV_PHRASEMAN_MAP_AND_REBUILD_PLAN.md`
- `docs/gustav/GUSTAV_ALGORITHM_AUDIT_01.md`
- `docs/gustav/GUSTAV_SOURCE_GRAPH_SCHEMA.md`
- `docs/gustav/GUSTAV_RUN_ISOLATION_PROTOCOL.md`

Verdict: HOLD, improved.

French generation remains blocked.

## 1. Improvements made after Audit 01

### IMP-001. Source Graph Schema created

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_SOURCE_GRAPH_SCHEMA.md`

What it improves:

- Gustav now has a concrete graph shape for lessons, phrases, words, intro screens, quizzes, prepositions, flashcards, daily phrases, personal practice, surfaces, source files and generated files.
- It explicitly separates `SourceLocaleId` from `StudyTargetId`.
- It adds provenance, generated-file status, audit status, confidence and unresolved nodes.
- It adds hard fail rules against target/source confusion.

Remaining weakness:

- schema is still a document, not an executable validator;
- no source graph dump script exists yet;
- no actual graph has been generated.

Decision:

GVA-001 moves from `BLOCKER: missing schema` to `HIGH: schema exists, validator missing`.

### IMP-002. Run Isolation Protocol created

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_RUN_ISOLATION_PROTOCOL.md`

What it improves:

- Gustav now has a required run folder under `docs/gustav/runs/<runId>/`;
- generation mode is forbidden from writing into `app/*`, `constants/*`, `scripts/*`, `tests/*`;
- product writes require separate `apply` mode;
- every run requires `manifest.json` and `verdict.json`;
- `productWritePermission` defaults to false;
- explicit gates before generation and apply are now written.

Remaining weakness:

- no validator script enforces this yet;
- no manifest template file exists yet;
- no first real run folder exists.

Decision:

GVA-003 moves from `BLOCKER: no run isolation` to `HIGH: protocol exists, enforcement missing`.

## 2. Current blockers after improvement

### GVA-002. Runtime type contract still missing

Severity: BLOCKER.

Problem:

The schema names `SourceLocaleId` and `StudyTargetId`, but PhraseMan still has no production-ready target-language contract. Current `app/study_target_lang_dev.ts` is dev-only and supports `'en' | 'es'`.

Risk:

- French can be added as a locale instead of target;
- app can display French course under wrong source-language assumptions;
- storage and progress can mix targets.

Next improvement required:

- create `docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`;
- define future production TypeScript contracts;
- define migration away from dev-only `StudyTargetLang`.

### GVA-004. Apply gate still needs dedicated document

Severity: BLOCKER.

Problem:

Run isolation says apply needs approval, but the detailed apply gate is not a standalone contract.

Risk:

- integration diff may become too large;
- app files could be changed without exact review list;
- rollback may be incomplete.

Next improvement required:

- create `docs/gustav/GUSTAV_APPLY_GATE.md`;
- include approval record, file list, migration list, tests, rollback and Heisenberg impact.

### GVA-005. Evidence policy still missing

Severity: BLOCKER.

Problem:

The run protocol reserves `research/evidence_ledger.json`, but no evidence policy exists.

Risk:

- curriculum decisions can cite Cambridge/Oxford vaguely;
- agents may invent "best practice" without source trace;
- French lesson order may become unverifiable.

Next improvement required:

- create `docs/gustav/GUSTAV_RESEARCH_EVIDENCE_POLICY.md`;
- define acceptable source types, citation fields, access dates and copyright-safe summaries.

Note:

When this moves from local architecture into actual reference research, use current official/primary sources where possible and record dates.

### GVA-006. Agent contracts still missing

Severity: BLOCKER.

Problem:

Agent roles exist, but exact prompts and JSON output contracts are still not written.

Risk:

- agents cannot be audited automatically;
- one agent can silently approve its own work;
- blockers cannot be merged reliably.

Next improvement required:

- create `docs/gustav/GUSTAV_AGENT_CONTRACTS.md`;
- then split into `docs/gustav/agents/*.md` if needed.

### GVA-007. My Practice target plan still missing

Severity: BLOCKER.

Problem:

The plan says My Practice must be target-aware, but no concrete storage, taxonomy or diagnosis transfer plan exists.

Risk:

- English weakness taxonomy leaks into French;
- `trainer_store_v1` can mix targets;
- personalized lessons can become wrong for French.

Next improvement required:

- create `docs/gustav/GUSTAV_PERSONAL_PRACTICE_TARGET_PLAN.md`;
- define target-specific diagnosis ids, source-locale feedback, storage and migration.

### GVA-008. Storage isolation still missing

Severity: BLOCKER.

Problem:

Run isolation protects files, not user data. Target-aware storage and progress keys are still not designed.

Risk:

- users can lose or mix progress;
- cloud sync can store cross-target data;
- trainer queues can leak between targets.

Next improvement required:

- create `docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md`;
- define global vs target-specific storage and migration.

## 3. New findings from Audit 02

### GVA-019. Source Graph schema is broad enough, but extraction order is missing

Severity: HIGH.

Problem:

The schema says what the graph should contain, but not the order of extraction.

Risk:

- extractor starts from phrase files and misses lesson spine;
- extractor reads generated files first;
- graph links become unstable.

Required improvement:

Create extractor order:

1. app atlas;
2. source-locale and study-target files;
3. lesson spine;
4. lesson type definitions;
5. canonical lesson content;
6. generated derivatives;
7. quizzes;
8. personal practice;
9. runtime surfaces;
10. tests and audit scripts.

### GVA-020. Unknown handling needs a budget

Severity: MEDIUM-HIGH.

Problem:

Schema allows `unknown`, but no threshold says how many unknowns block progress.

Risk:

- graph can be "complete enough" with too many unknowns;
- hidden product surfaces stay outside Gustav.

Required improvement:

Set thresholds:

- any unknown `targetSensitive` surface = HOLD;
- any unknown provenance for generated lesson/quiz/practice file = HOLD;
- more than 0 unknown storage-sensitive surfaces = HOLD;
- more than 5 medium unknowns = manual review.

### GVA-021. Human-readable docs need machine-readable templates

Severity: HIGH.

Problem:

The new docs define schemas in TypeScript-like blocks, but actual JSON templates are not created.

Risk:

- first real run may invent its own manifest and verdict shape;
- validator implementation will drift from docs.

Required improvement:

Create template files:

- `docs/gustav/templates/run_manifest.template.json`;
- `docs/gustav/templates/run_verdict.template.json`;
- `docs/gustav/templates/source_graph_minimal.template.json`;
- `docs/gustav/templates/agent_verdict.template.json`.

### GVA-022. No script names in package plan yet

Severity: MEDIUM.

Problem:

Audit 01 listed future scripts, but the protocol does not define exact command names or package scripts.

Risk:

- checks are hard to run consistently;
- agents may bypass validation.

Required improvement:

Reserve command names:

- `gustav:inventory`;
- `gustav:source-graph`;
- `gustav:validate-run`;
- `gustav:validate-source-graph`;
- `gustav:audit-target-isolation`;
- `gustav:gate`.

No implementation yet. Just reserve names in docs before coding.

### GVA-023. Current dirty worktree raises attribution risk

Severity: MEDIUM.

Problem:

The repository already has many modified files unrelated to Gustav docs.

Risk:

- future apply plans may accidentally attribute existing user changes to Gustav;
- audits can compare against a moving base.

Required improvement:

Every run manifest must include:

- `gitStatusSummary`;
- `gustavTouchedFiles`;
- `preExistingDirtyFiles`;
- note that Gustav must not revert or normalize unrelated files.

### GVA-024. "No French generation" should become a detectable check

Severity: HIGH.

Problem:

The docs say no French generation, but there is no scan rule.

Risk:

- accidental French files can appear outside run folder;
- generated content can be mistaken for approved content.

Required improvement:

Add future validator check:

- scan for `fr`, `french`, `français`, and target registry additions outside approved run folders;
- if found during non-apply mode, return BLOCK unless explicitly listed as pre-existing.

## 4. Updated status of Audit 01 findings

| Finding | Old status | New status |
|---|---:|---:|
| GVA-001 Source Graph schema missing | BLOCKER | HIGH, schema exists but validator missing |
| GVA-002 Runtime type contract missing | BLOCKER | BLOCKER |
| GVA-003 Run isolation missing | BLOCKER | HIGH, protocol exists but validator missing |
| GVA-004 Apply gate missing | BLOCKER | BLOCKER |
| GVA-005 Evidence policy missing | BLOCKER | BLOCKER |
| GVA-006 Agent prompts/contracts missing | HIGH | BLOCKER |
| GVA-007 My Practice isolation under-specified | HIGH | BLOCKER |
| GVA-008 Storage key strategy missing | HIGH | BLOCKER |
| GVA-009 Surface inventory manual | HIGH | HIGH |
| GVA-010 Generated/source drift check missing | HIGH | HIGH |
| GVA-011 Quiz ambiguity formal audit missing | MEDIUM-HIGH | MEDIUM-HIGH |
| GVA-012 Transfer matrix artifact missing | MEDIUM-HIGH | MEDIUM-HIGH |

## 5. Next improvement order

Do next in this order:

1. `GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`
2. `GUSTAV_APPLY_GATE.md`
3. `GUSTAV_RESEARCH_EVIDENCE_POLICY.md`
4. `GUSTAV_AGENT_CONTRACTS.md`
5. `GUSTAV_TARGET_STORAGE_PLAN.md`
6. `GUSTAV_PERSONAL_PRACTICE_TARGET_PLAN.md`
7. templates under `docs/gustav/templates/`
8. first read-only source graph extractor plan

Do not do yet:

- no French content;
- no app runtime changes;
- no package script changes;
- no Heisenberg changes;
- no storage migrations.

## 6. Updated verdict

Gustav is safer than after Audit 01.

But Gustav is still not ready.

Current status:

- architecture reset: PASS;
- PhraseMan grounding: PASS;
- Source Graph schema: PARTIAL PASS;
- run isolation protocol: PARTIAL PASS;
- target architecture: BLOCKED;
- apply gate: BLOCKED;
- evidence policy: BLOCKED;
- agent contracts: BLOCKED;
- My Practice multi-target plan: BLOCKED;
- French generation: BLOCKED.

