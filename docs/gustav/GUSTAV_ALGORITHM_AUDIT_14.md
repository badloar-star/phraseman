# GUSTAV Algorithm Audit 14

Status: `HOLD`

Scope: local-only versus cloud-synced decisions for target-sensitive local keys missing from cloud mapping.

## 1. What improved

Gustav now has an executable local/cloud decision table generator:

```text
scripts/gustav_local_cloud_decision_table.ts
```

It reads:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/inputs/storage_key_inventory.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/cloud_sync_mapping.json
```

It writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/local_cloud_decision_table.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/local_cloud_decision_table.md
```

The run validator now checks this artifact structurally:

- schema version;
- run id;
- entry count;
- duplicate keys;
- valid decision actions;
- required target/local key fields;
- required before-French gates;
- evidence array;
- no `PASS` while blocker decisions remain.

## 2. Decision table result

Command:

```text
npx tsx scripts/gustav_local_cloud_decision_table.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Entries: 28
Sync under target: 15
Keep local target-scoped: 7
Covered by existing cloud pattern: 6
Block unknown: 0
Blockers: 22
High risks: 6
```

Important improvement:

```text
block_unknown: 0
```

The 28 previously unresolved local/cloud keys now have explicit decisions.

## 3. Decision groups

### 3.1 Sync under target: 15 keys

These must be synced or made server-idempotent under `studyTarget`:

- daily phrase achievement counters;
- quiz achievement counters;
- lesson perfect pass counters;
- trainer perfect session counter;
- lesson reward idempotency keys;
- irregular verb shard idempotency;
- preposition drill progress/perfect state;
- `mistake_log_v1`;
- `trainer_store_v1`;
- `quiz_hard_count`.

Reason:

They affect target-language learning progress, practice queues, rewards or achievement continuity.

### 3.2 Keep local target-scoped: 7 keys

These should stay out of cloud, but must be target-scoped locally:

- `lesson${...}_cellIndex`;
- `lesson${...}_phraseOrder`;
- `lesson${...}_errorReplayQueue`;
- `lesson${...}_errorReplaySince`;
- `lesson${...}_errorReplayOverride`;
- `quiz_nav_level`;
- `open_diagnostic`.

Reason:

They are session/navigation/replay state. They should not roam across devices, but French must not resume English session state.

### 3.3 Covered by existing cloud pattern: 6 keys

These are not truly missing; they are represented by broader cloud families:

- `lesson1_progress` -> `lesson${...}_progress`;
- `lesson1_words` -> `lesson${...}_words`;
- dynamic `level_exam_${...}_*` -> explicit A1/A2/B1/B2 cloud keys.

Reason:

The comparison was intentionally conservative and does not expand all patterns. Gustav now records the coverage decision.

## 4. Confirmed blockers

### GVA-054: target-sensitive local-only keys need target namespace

Even keys that remain local-only must become target-scoped before French.

Example future local shapes:

```text
lesson${...}_cellIndex_v2::{studyTarget}
quiz_nav_level_v2::{studyTarget}
open_diagnostic_v2::{studyTarget}
```

### GVA-055: reward/idempotency keys cannot remain flat

Keys like:

```text
lesson${...}_bonus_granted
lesson${...}_irregular_shards_granted
prep_drill_perfect_${...}
```

must either:

- sync under `studyTarget`; or
- move to a server-side idempotency ledger.

Flat local-only reward keys can cause repeat or missing rewards after target switch / device restore.

### GVA-056: trainer and mistake log need target buckets

`trainer_store_v1` and `mistake_log_v1` contain target-language phrases, words, grammar categories and lesson ids.

They must move to:

```text
progress/targets/{studyTarget}/trainer_store
progress/targets/{studyTarget}/mistake_log
```

Legacy values map to English only.

## 5. Validator result

Command:

```text
npx tsx scripts/gustav_validate_run.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
PASS
Checks: 2664
Blockers: 0
Warnings: 0
```

This validates Gustav artifacts only. It does not approve French generation.

## 6. Current verdict

French remains blocked.

Reason:

- 22 local/cloud decision blockers remain;
- storage namespace implementation does not exist;
- cloud target buckets do not exist;
- local-only target session tests do not exist;
- reward idempotency policy is unresolved.

Allowed next work:

- target key-builder integration design;
- route/surface inventory scanner;
- achievement split migration plan;
- trainer/mistake-log target bucket plan;
- source graph extraction.

Blocked:

- French content generation;
- product apply;
- storage/cloud migration implementation without reviewed tests.

## 7. Next recommended improvements

1. Create target key-builder integration design with exact modules and API.
2. Add route/surface inventory scanner.
3. Draft trainer/mistake-log migration plan.
4. Draft achievement split migration plan and tests.
