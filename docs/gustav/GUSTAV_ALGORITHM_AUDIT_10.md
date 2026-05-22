# GUSTAV Algorithm Audit 10

Status: `HOLD`

Scope: deeper audit of target progress migration, cloud sync impact and the automated storage inventory scanner.

## 1. What improved

Gustav now has two additional PhraseMan-native contracts:

- `docs/gustav/GUSTAV_TARGET_PROGRESS_MIGRATION_PLAN.md`
- `docs/gustav/GUSTAV_CLOUD_SYNC_IMPACT_PLAN.md`

The storage inventory scanner was strengthened:

- resolves simple local string key variables like `totalKey`;
- resolves local arrays passed to `AsyncStorage.multiGet`;
- resolves `Array.from(... => \`lesson${...}\`)` key templates;
- resolves `.push(...)` populated key arrays;
- resolves selected storage helper wrappers such as `readStoredCounter`, `bumpStoredCounter`, `bumpConsecutiveDayStreak`, `bumpMonthlyActivityDays` and `addStoredSetValue`;
- detects cloud sync template patterns from `SYNC_KEYS`, not only literal keys.

This makes the report stricter. The number of blockers increased because hidden target-sensitive keys became visible.

## 2. Current automated inventory result

Run:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Command:

```text
npx tsx scripts/gustav_storage_inventory.ts --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Files scanned: 958
Records: 1913
Unique literal keys: 357
Key patterns: 165
Unknown expressions: 141
Cloud sync keys observed: 132
Learning-state records: 351
Target namespace required: 348
Blockers: 116
High risks: 262
Unknown-scope records: 655
```

Important change from the previous scan:

- unknown expressions went from 272 to 141;
- unknown-scope records went from 748 to 655;
- blockers went from 54 to 116 because lesson arrays, achievement lesson arrays and helper-wrapped counters are now detected as real target-sensitive storage.

## 3. Newly confirmed blockers

### GVA-050: target progress migration is required

French cannot reuse current unscoped English progress keys.

Affected surfaces:

- lessons;
- lesson unlock;
- level exams;
- trainer;
- active recall;
- quizzes;
- flashcards;
- achievements;
- My Practice;
- cloud restore.

Required fix:

- introduce a target-aware key builder;
- migrate legacy v1 English state to `v2::en`;
- make French read only `v2::fr`;
- block raw unscoped learning keys outside migration modules.

### GVA-051: cloud sync is flat and target-sensitive

`app/cloud_sync.ts` syncs target-sensitive progress in a flat `SYNC_KEYS` list.

Required fix:

- classify every sync key as global, source locale, study target, source plus target, drop, or unknown;
- map legacy flat progress to English only;
- block French if any target-sensitive sync key has no target bucket.

### GVA-052: achievements contain hidden target state

Achievement counters are not just cosmetic. Some count target-content work:

- lesson perfect passes;
- quiz total/hard/perfect;
- trainer correct/perfect;
- active recall;
- flashcards;
- daily phrase reads/saves.

Required fix:

- split product-global achievements from target-content achievements;
- target-content achievements must be scoped or recalculated per target.

## 4. Weak spots still open

### Scanner is still heuristic

The scanner now catches more real patterns, but it is still not a TypeScript AST evaluator.

Remaining blind spots:

- nested async calls with complex expressions;
- helper functions called through aliases;
- imported storage key builders;
- object maps that become storage keys later;
- dead code versus active code distinction.

Required improvement:

- add an AST-based pass or a TypeScript compiler API pass before Gustav can claim full coverage.

### Cloud mapping table does not exist yet

The cloud sync impact plan defines the contract, but Gustav still needs a generated table for every `SYNC_KEYS` entry.

Required artifact:

```text
docs/gustav/runs/<runId>/audits/cloud_sync_mapping.json
```

### Product migration API does not exist yet

The migration plan defines the required key builder, but PhraseMan runtime has not been changed.

This is correct for now because the current work is audit/design only.

### No French content may be generated yet

The French curriculum is still blocked because storage and cloud gates are not ready.

## 5. Current verdict

Gustav is stronger than the previous audit round, but still not ready for French generation.

Verdict:

```text
HOLD
```

Allowed next work:

- inventory;
- source graph;
- English audit;
- architecture;
- research.

Blocked:

- French content generation;
- product apply;
- cloud migration implementation without a reviewed apply plan.

## 6. Next recommended improvements

1. Add a cloud sync mapping generator.
2. Add an automated route/surface inventory scanner.
3. Add an AST-based storage scanner pass.
4. Create the target-aware key builder design with exact app integration points.
5. Create a test matrix for target switching, cloud restore and My Practice separation.

