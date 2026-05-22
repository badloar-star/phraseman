# GUSTAV Algorithm Audit 20

Status: `HOLD`

Scope: source graph quality audit and generated-file source-truth policy.

## 1. What improved

Gustav now has a source graph quality audit:

```text
scripts/gustav_source_graph_quality_audit.ts
```

It reads:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/source_graph.json
```

It writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/source_graph_quality_audit.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/source_graph_quality_audit.md
```

Gustav also now has a generated-file source-truth policy:

```text
docs/gustav/GUSTAV_SOURCE_GRAPH_SOURCE_TRUTH_POLICY.md
```

## 2. Quality audit result

Command:

```text
node /private/tmp/gustav-build/gustav_source_graph_quality_audit.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Checks: 11143
Blockers: 2
High risks: 1
Lessons: 32
Phrases: 1600
Intro screens: 147
Quizzes: 829
System flashcards: 155
Daily phrases: 176
My Practice nodes: 56
Generated files: 7
Generated phrase entries: 400
```

Coverage checks passed:

```text
Lessons without intro: 0
Lessons with non-standard phrase count: 0
Empty phrase targets: 0
Phrase RU/UK prompt gaps: 0
Quiz shape gaps: 0
Flashcard prompt gaps: 0
Daily phrase prompt gaps: 0
My Practice source gaps: 0
```

## 3. Remaining quality blockers

### SGQ-001: source graph is not approved

The graph is extracted and structurally valid, but still `HOLD`.

### SGQ-002: generated runtime phrase entries require source-truth policy

The audit found:

```text
400 generated phrase entries
```

They come from:

```text
app/lesson_data_9_16_phrases_es.gen.ts
```

Gustav may use this as runtime evidence, but French generation cannot treat it as canonical source truth until a decision is recorded.

### SGQ-003: generated ES support files are present near the source base

The audit found:

```text
7 generated files
```

These must not define French lesson order, grammar scope, quiz design or preposition packs unless the target-language architecture explicitly maps them.

## 4. Readiness integration

The readiness gate now has an additional blocker:

```text
RDY-071: Source graph quality audit approves generation input
```

Current readiness:

```text
Decision: HOLD
Checks: 14
Passed: 2
Failed: 12
Generation blockers: 10
Apply blockers: 12
```

## 5. Validator integration

The run validator now checks the source graph quality audit structurally:

- schema version;
- run id;
- status;
- summary numbers;
- approval boolean;
- findings array;
- 32 lesson coverage entries;
- lesson coverage shape;
- source-truth policy booleans;
- no `PASS` while blockers/high risks remain.

Validator result:

```text
PASS
Checks: 14058
Blockers: 0
Warnings: 0
```

## 6. Current stage

Gustav stage:

```text
architecture work: allowed
source graph extraction: created
source graph quality audit: created
source graph approval: blocked
French generation: blocked
production apply: blocked
```

Progress state:

```text
source discovery: machine-readable
source quality audit: machine-readable
generated-file policy: drafted
storage/cloud risk map: created
surface risk map: created
readiness gate: created
migration adapter strategy: created
adapter implementation: not started
```

Next concrete work:

```text
resolve source-truth policy for generated runtime phrase files
```

Reason:

The English graph has strong coverage, including My Practice, but French still cannot begin until Gustav knows whether generated runtime phrase files are approved evidence, replaced by canonical source, or excluded from French source truth.
