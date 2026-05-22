# GUSTAV Algorithm Audit 11

Status: `HOLD`

Scope: cloud sync mapping automation, storage scanner correction and run validator strengthening.

## 1. What improved

Gustav now has an executable cloud sync mapping pass:

```text
scripts/gustav_cloud_sync_mapping.ts
```

It reads `app/cloud_sync.ts`, extracts `SYNC_KEYS`, classifies each key and writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/cloud_sync_mapping.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/cloud_sync_mapping.md
```

The run validator now understands this mapping and verifies:

- schema version;
- run id;
- status;
- summary count versus entry count;
- valid action names;
- target entries contain `legacyTarget=en` and `targetPath`;
- `block_unknown` entries are real blockers.

## 2. Storage scanner correction

The previous storage scanner counted cloud keys too broadly because it did not stop specifically at:

```text
] as const;
```

That is now fixed. `cloudSyncKeys` now matches the cloud mapping entry count.

Current storage inventory:

```text
Files scanned: 959
Records: 1903
Unique literal keys: 353
Key patterns: 164
Unknown expressions: 141
Cloud sync keys observed: 122
Learning-state records: 351
Target namespace required: 348
Blockers: 116
High risks: 262
Unknown-scope records: 645
```

## 3. Cloud sync mapping result

Command:

```text
npx tsx scripts/gustav_cloud_sync_mapping.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Entries: 122
Literal keys: 116
Key patterns: 6
Keep global: 74
Map to target: 42
Map to source locale: 2
Block unknown: 4
Blockers: 46
High risks: 3
Target bucket required: 42
Target-sensitive local keys missing from cloud: 28
```

## 4. Confirmed cloud blockers

### GVA-051: flat cloud progress contains target-sensitive keys

The following classes must move into `progress/targets/{studyTarget}` before French:

- lesson progress, words, listening, intro and scores;
- `unlocked_lessons`;
- level exams;
- final certificate;
- active recall;
- trainer-related achievement counters;
- flashcards and custom flashcards;
- diagnostic state;
- irregular verbs;
- quiz/lifetime quiz counters.

Legacy flat cloud values may map only to English.

### GVA-052: mixed cloud payloads require field-level audit

These keys are still `block_unknown`:

```text
achievements_state
daily_stats
user_stats_v1
stats_daily_breakdown_v1
```

Reason:

They may mix global account metrics with target-content metrics. Gustav cannot safely map them as global or target without a field-level audit.

### GVA-053: some target-sensitive local keys are not cloud-mapped

The cloud mapping compared itself with storage inventory and found 28 target-sensitive local keys missing from cloud sync.

This may be intentional for local-only state, but each one now needs an explicit decision:

- sync under target;
- keep local-only;
- migrate to global;
- delete/deprecate.

## 5. Validator result

Command:

```text
npx tsx scripts/gustav_validate_run.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
PASS
Checks: 680
Blockers: 0
Warnings: 0
```

This means the Gustav run structure and new cloud mapping artifact are valid. It does not approve French generation.

## 6. Current verdict

French remains blocked.

Allowed next work:

- source graph extraction;
- field-level audit for mixed cloud payloads;
- target key-builder design;
- automated route/surface inventory;
- AST-based storage scan.

Blocked:

- French lesson generation;
- French product apply;
- cloud migration implementation without reviewed apply plan and tests.

## 7. Next recommended improvements

1. Add a field-level audit for `achievements_state`, `daily_stats`, `user_stats_v1` and `stats_daily_breakdown_v1`.
2. Add a target-aware key builder integration design.
3. Generate a local-only versus cloud-synced decision table for the 28 missing target-sensitive local keys.
4. Add route/surface scanner so Gustav can prove every screen is assigned to a target/global/source-locale bucket.
