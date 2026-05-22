# GUSTAV Algorithm Audit 03

Date: 2026-05-19

Scope:

- `docs/gustav/GUSTAV_PHRASEMAN_MAP_AND_REBUILD_PLAN.md`
- `docs/gustav/GUSTAV_ALGORITHM_AUDIT_01.md`
- `docs/gustav/GUSTAV_ALGORITHM_AUDIT_02.md`
- `docs/gustav/GUSTAV_SOURCE_GRAPH_SCHEMA.md`
- `docs/gustav/GUSTAV_RUN_ISOLATION_PROTOCOL.md`
- `docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`
- `docs/gustav/GUSTAV_APPLY_GATE.md`
- `docs/gustav/GUSTAV_RESEARCH_EVIDENCE_POLICY.md`
- `docs/gustav/GUSTAV_AGENT_CONTRACTS.md`

Verdict: HOLD, materially improved.

French generation remains blocked.

## 1. Improvements made after Audit 02

### IMP-003. Target-language architecture contract added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`

What improved:

- Gustav now has a written separation between `sourceLocale` and `studyTarget`;
- French is explicitly defined as `studyTarget=fr`, not interface locale;
- future `LearningContext` and registry concepts are defined;
- current dev-only `StudyTargetLang` is marked insufficient for production;
- French from Russian and Ukrainian is stated as a two-source-locale requirement.

Remaining weakness:

- no app code contract exists yet;
- no TypeScript enforcement exists yet;
- storage plan still missing.

Decision:

GVA-002 moves from `BLOCKER: undefined contract` to `HIGH: design contract exists, implementation missing`.

### IMP-004. Apply gate added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_APPLY_GATE.md`

What improved:

- product writes now require explicit apply approval;
- exact file list, dirty-worktree handling, migration, rollback and test requirements are defined;
- generation approval and product apply approval are separated.

Remaining weakness:

- no apply-plan templates exist yet;
- no validator exists yet;
- no real apply workflow has been tested.

Decision:

GVA-004 moves from `BLOCKER: missing apply gate` to `HIGH: apply gate exists, enforcement missing`.

### IMP-005. Research evidence policy added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_RESEARCH_EVIDENCE_POLICY.md`

What improved:

- vague references like "Cambridge/Oxford says" are now forbidden without evidence ledger;
- evidence claim schema exists;
- copyright-safe summary rules exist;
- app-source evidence is limited to app behavior, not universal language truth.

Remaining weakness:

- no actual evidence ledger exists yet;
- no current external research has been performed;
- no evidence validator exists yet.

Decision:

GVA-005 moves from `BLOCKER: no policy` to `HIGH: policy exists, evidence not collected`.

### IMP-006. Agent contracts added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_AGENT_CONTRACTS.md`

What improved:

- universal stale-memory guard exists;
- JSON output schema exists;
- self-approval ban exists;
- required agents and blocking powers are defined;
- agent chains by mode are defined.

Remaining weakness:

- no per-agent files in `docs/gustav/agents/*` yet;
- no JSON schema validator exists;
- no real agent verdict artifacts exist.

Decision:

GVA-006 moves from `BLOCKER: no contracts` to `HIGH: contracts exist, validators missing`.

## 2. Current blocker map

### Still blocking French generation

- no actual English Source Graph has been extracted;
- no source graph validator exists;
- no surface inventory artifact exists;
- no target storage plan exists;
- no personal practice target plan exists;
- no templates exist;
- no run manifest/verdict examples exist;
- no evidence ledger has been produced;
- no external research has been done for French;
- no target curriculum transfer matrix exists;
- no runtime isolation tests exist.

### Reduced but not closed

- Source Graph schema exists but is not executable.
- Run isolation protocol exists but is not executable.
- Target architecture exists but is not implemented.
- Apply gate exists but is not enforced.
- Evidence policy exists but no evidence is collected.
- Agent contracts exist but no agent verdicts or schema validation exists.

## 3. New findings from Audit 03

### GVA-025. Storage plan is now the highest safety gap

Severity: BLOCKER.

Problem:

Target architecture states that learning state must be target-scoped, but there is no storage key matrix yet.

Risk:

- English progress can be mixed with French progress;
- trainer queues can leak targets;
- cloud sync can persist corrupted multi-target state.

Required improvement:

Create:

- `docs/gustav/GUSTAV_TARGET_STORAGE_PLAN.md`

It must classify every known learning-state storage key as:

- global;
- source-locale-specific;
- study-target-specific;
- source+target-specific;
- legacy;
- unknown.

### GVA-026. Personal Practice needs its own transfer architecture

Severity: BLOCKER.

Problem:

Agent contracts mention My Practice, but there is no target-specific taxonomy transfer plan.

Risk:

- English diagnosis ids will be reused for French;
- French mistakes will be trained with English logic;
- source-locale feedback will be missing or mixed.

Required improvement:

Create:

- `docs/gustav/GUSTAV_PERSONAL_PRACTICE_TARGET_PLAN.md`

It must define:

- target diagnosis namespace;
- transfer decisions from English taxonomy;
- French-specific diagnosis additions;
- RU/UK feedback shape;
- trainer integration;
- QA gates.

### GVA-027. Templates are now needed before scripts

Severity: HIGH.

Problem:

Docs define schemas, but first script implementation can drift unless templates exist.

Required templates:

- `docs/gustav/templates/run_manifest.template.json`;
- `docs/gustav/templates/run_verdict.template.json`;
- `docs/gustav/templates/source_graph_minimal.template.json`;
- `docs/gustav/templates/agent_verdict.template.json`;
- `docs/gustav/templates/evidence_ledger.template.json`;
- `docs/gustav/templates/apply_file_changes.template.json`.

### GVA-028. Surface inventory should come before source graph extraction

Severity: HIGH.

Problem:

The source graph schema is broad, but without surface inventory the extractor can miss hidden surfaces.

Required improvement:

Create:

- `docs/gustav/GUSTAV_SURFACE_INVENTORY.md`

before writing extractor scripts.

### GVA-029. Research policy requires browsing later, but not during architecture-only work

Severity: MEDIUM.

Problem:

Policy is written, but actual French curriculum research will require up-to-date external source checks.

Decision:

No browsing required for this architecture audit. Browsing/research becomes mandatory when building evidence ledger for French curriculum.

### GVA-030. Apply gate depends on product-file ownership map

Severity: MEDIUM-HIGH.

Problem:

Apply gate requires owner areas, but surface inventory has not mapped owners yet.

Risk:

- `ownerArea='unknown'` will block apply for many files.

Required improvement:

Surface inventory must include owner mapping.

## 4. Updated status table

| Finding | Audit 02 status | Audit 03 status |
|---|---:|---:|
| GVA-001 Source Graph schema | HIGH | HIGH, unchanged |
| GVA-002 Runtime target/source contract | BLOCKER | HIGH, design exists |
| GVA-003 Run isolation | HIGH | HIGH, unchanged |
| GVA-004 Apply gate | BLOCKER | HIGH, gate exists |
| GVA-005 Evidence policy | BLOCKER | HIGH, policy exists |
| GVA-006 Agent contracts | BLOCKER | HIGH, contracts exist |
| GVA-007 My Practice plan | BLOCKER | BLOCKER |
| GVA-008 Storage plan | BLOCKER | BLOCKER |
| GVA-009 Surface inventory | HIGH | HIGH |
| GVA-010 Generated/source drift | HIGH | HIGH |
| GVA-019 Extraction order | HIGH | HIGH |
| GVA-021 Templates | HIGH | HIGH |

## 5. Next improvement order

Do next:

1. `GUSTAV_TARGET_STORAGE_PLAN.md`
2. `GUSTAV_PERSONAL_PRACTICE_TARGET_PLAN.md`
3. `GUSTAV_SURFACE_INVENTORY.md`
4. JSON templates under `docs/gustav/templates/`
5. `GUSTAV_SOURCE_GRAPH_EXTRACTOR_PLAN.md`
6. `GUSTAV_ALGORITHM_AUDIT_04.md`

Do not do:

- no French lessons;
- no French words;
- no French quizzes;
- no app code edits;
- no storage migrations;
- no Heisenberg edits.

## 6. Updated verdict

Gustav is now significantly more controlled.

But it is still a controlled design system, not a ready generation pipeline.

Current status:

- reset from old Gustav: PASS;
- PhraseMan grounding: PASS;
- source graph schema: PARTIAL PASS;
- run isolation: PARTIAL PASS;
- target architecture: PARTIAL PASS;
- apply gate: PARTIAL PASS;
- evidence policy: PARTIAL PASS;
- agent contracts: PARTIAL PASS;
- storage plan: BLOCKED;
- My Practice target plan: BLOCKED;
- surface inventory: BLOCKED;
- validators/templates: BLOCKED;
- French generation: BLOCKED.

