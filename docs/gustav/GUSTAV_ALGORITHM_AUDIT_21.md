# GUSTAV Algorithm Audit 21

Status: `HOLD`

Scope: generated source-truth audit for generated runtime files.

## 1. What improved

Gustav now has an audit that separates generated runtime evidence from canonical source truth:

```text
scripts/gustav_generated_source_truth_audit.ts
```

It writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/generated_source_truth_audit.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/generated_source_truth_audit.md
```

## 2. Result

Command:

```text
node /private/tmp/gustav-build/gustav_generated_source_truth_audit.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Artifacts: 7
Phrase runtime artifacts: 2
Support runtime artifacts: 5
Used as phrase source in graph: 1
Generated phrase entries: 400
Canonical source available: 1
Runtime evidence only: 5
Blocked missing canonical source: 1
Blockers: 1
High risks: 1
```

## 3. Important narrowing

Before this audit, the source graph blocker said generated files were present. That was correct, but too broad.

Now Gustav knows the precise source-truth state:

```text
app/lesson_data_1_8_phrases_es.gen.ts
```

has a canonical extracted source:

```text
app/lesson_data_1_8_phrases_source.ts
```

and is not used as phrase source by the current graph.

But:

```text
app/lesson_data_9_16_phrases_es.gen.ts
```

is used as phrase source for:

```text
400 phrase entries
```

and its candidate source path:

```text
app/lesson_data_9_16.ts
```

imports the generated runtime phrase file. That means lessons 9-16 still lack a proven non-generated canonical source.

## 4. New blocker

### GVA-063: lesson 9-16 generated phrase source lacks canonical source-truth decision

French generation remains blocked until one of these happens:

- canonical non-generated source for lessons 9-16 is restored or created;
- an explicit approval artifact marks the generated file as read-only English evidence for this run;
- lessons 9-16 are excluded from French generation until target-specific source is built.

## 5. Readiness integration

The readiness gate now has:

```text
RDY-072: Generated source-truth policy is resolved
```

Current readiness:

```text
Decision: HOLD
Checks: 15
Passed: 2
Failed: 13
Generation blockers: 11
Apply blockers: 13
```

## 6. Validator integration

The run validator now checks:

- schema version;
- run id;
- status;
- summary numbers;
- artifact decisions;
- generated phrase entry counts;
- policy arrays;
- no `PASS` while generated source-truth blockers/high risks remain.

Validator result:

```text
PASS
Checks: 14200
Blockers: 0
Warnings: 0
```

## 7. Current stage

Gustav stage:

```text
architecture work: allowed
source graph extraction: created
source graph quality audit: created
generated source-truth audit: created
French generation: blocked
production apply: blocked
```

Next concrete work:

```text
resolve lesson 9-16 source truth
```

Reason:

The remaining generated phrase-source blocker is now exact. Gustav should not start French until lessons 9-16 are backed by canonical source or explicitly approved as read-only evidence.
