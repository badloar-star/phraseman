# GUSTAV Algorithm Audit 05

Date: 2026-05-19

Scope:

- all Gustav docs through Audit 04;
- `GUSTAV_VALIDATOR_PLAN.md`;
- `GUSTAV_SOURCE_GRAPH_EXTRACTOR_PLAN.md`;
- schema files under `docs/gustav/schemas/`.

Verdict: HOLD, enforcement design improved.

French generation remains blocked.

## 1. Improvements made after Audit 04

### IMP-011. Validator plan added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_VALIDATOR_PLAN.md`

What improved:

- future validator commands are reserved;
- run validation, source graph validation, surface inventory, storage inventory and gate validation are separated;
- hard-fail rules are explicit;
- dirty worktree protection and French early-generation detection are defined.

Remaining weakness:

- scripts do not exist yet;
- package scripts are not added yet;
- no validator output has been produced.

Decision:

GVA-031 moves from `BLOCKER: no validator plan` to `HIGH: plan exists, scripts missing`.

### IMP-012. Source Graph extractor plan added

Status: PARTIAL PASS.

New file:

- `docs/gustav/GUSTAV_SOURCE_GRAPH_EXTRACTOR_PLAN.md`

What improved:

- extraction order is now fixed;
- generated/source provenance has a dedicated step;
- personal practice, trainer, storage and runtime surfaces are included;
- first graph minimum acceptance criteria are defined.

Remaining weakness:

- extractor script does not exist;
- no English Source Graph dump exists;
- no unresolved nodes have been generated from real extraction.

Decision:

GVA-019 moves from `HIGH: extraction order missing` to `MEDIUM-HIGH: extraction order exists, implementation missing`.

### IMP-013. JSON Schema files added

Status: PARTIAL PASS.

New files:

- `docs/gustav/schemas/run_manifest.schema.json`;
- `docs/gustav/schemas/run_verdict.schema.json`;
- `docs/gustav/schemas/agent_verdict.schema.json`;
- `docs/gustav/schemas/evidence_ledger.schema.json`;
- `docs/gustav/schemas/apply_file_changes.schema.json`;
- `docs/gustav/schemas/source_graph.schema.json`.

What improved:

- templates now have schema counterparts;
- first validator implementation has a concrete target;
- malformed run artifacts will be easier to reject.

Remaining weakness:

- schemas are not yet used by scripts;
- `source_graph.schema.json` is intentionally minimal and needs deeper node validation later;
- no schema conformance tests exist.

Decision:

GVA-035 moves from `MEDIUM-HIGH: schemas missing` to `MEDIUM: schemas exist, validation/tests missing`.

## 2. Current blocker map

Still blocking French generation:

- no actual validator scripts;
- no package scripts;
- no first isolated inventory run;
- no actual English Source Graph;
- no storage key inventory artifact;
- no generated/source drift report;
- no English Base audit run;
- no French research evidence ledger;
- no French curriculum transfer matrix;
- no target personal practice transfer matrix;
- no runtime target isolation tests.

## 3. New findings from Audit 05

### GVA-036. First isolated run is now required

Severity: BLOCKER.

Problem:

Contracts, templates and schemas exist, but Gustav has not yet created a real run folder with manifest and verdict.

Risk:

- run protocol can look good but fail in practice;
- missing fields may only appear when a real run is attempted.

Required improvement:

Create a read-only inventory run:

```text
docs/gustav/runs/<runId>/
  manifest.json
  verdict.json
  README.md
  inputs/command_log.md
```

No generated target content.

### GVA-037. Schema templates need consistency checks

Severity: HIGH.

Problem:

Templates and schemas exist separately. They can drift.

Required improvement:

Future `gustav:validate-run` must validate every template against its schema.

Before scripts, manual JSON parse is enough only for syntax, not schema conformance.

### GVA-038. Source Graph schema needs node-level schemas later

Severity: MEDIUM-HIGH.

Problem:

Current `source_graph.schema.json` validates top-level shape but not every node type.

Reason:

This was deliberate to avoid freezing incorrect node shape before first extractor.

Required improvement:

After first graph dump, add definitions for:

- lesson nodes;
- phrase nodes;
- intro screen nodes;
- quiz nodes;
- personal practice nodes;
- surface nodes;
- file nodes;
- unresolved nodes.

### GVA-039. Validator implementation must stay read-only

Severity: HIGH.

Problem:

Validator scripts will write reports. They must not mutate app files.

Required improvement:

Add a write-zone guard in the first validator implementation.

### GVA-040. French detection rule must distinguish docs from content

Severity: MEDIUM.

Problem:

Many docs mention `fr` by design. A naive scan would create false positives.

Required improvement:

French early-generation detector must classify matches:

- architecture mention;
- template placeholder;
- run manifest target;
- generated content;
- product integration.

Only generated content and product integration are blocking outside allowed modes.

## 4. Updated status table

| Area | Status |
|---|---|
| Old Gustav reset | PASS |
| PhraseMan grounding | PASS |
| Source Graph schema | PARTIAL PASS |
| Run isolation | PARTIAL PASS |
| Target architecture | PARTIAL PASS |
| Apply gate | PARTIAL PASS |
| Evidence policy | PARTIAL PASS |
| Agent contracts | PARTIAL PASS |
| Target storage plan | PARTIAL PASS |
| Personal practice target plan | PARTIAL PASS |
| Surface inventory | PARTIAL PASS |
| JSON templates | PARTIAL PASS |
| Validator plan | PARTIAL PASS |
| Source Graph extractor plan | PARTIAL PASS |
| JSON schemas | PARTIAL PASS |
| Actual validators | BLOCKED |
| First isolated run | BLOCKED |
| Actual source graph | BLOCKED |
| French generation | BLOCKED |

## 5. Next improvement order

Do next:

1. create first isolated inventory run folder;
2. add manifest/verdict/command log for that run;
3. manually validate all JSON syntax;
4. create `GUSTAV_STORAGE_KEY_INVENTORY_PLAN.md` or produce first inventory artifact;
5. implement first read-only validator script only after run shape is tested;
6. Audit 06.

Do not do:

- no French lessons;
- no French quizzes;
- no French words;
- no app code edits;
- no storage migrations;
- no Heisenberg edits.

