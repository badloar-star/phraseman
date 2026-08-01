# Tournament Pool 4000 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, validate, expose, and safely publish exactly 4000 semantically unique tournament tasks as `tpool_20260801_v7`.

**Architecture:** The factory selects explicit quality-first cell quotas and assigns every task to a bounded generation-scoped exposure bucket. Runtime reads one bucket per mode instead of the full catalog, while the migration stages and verifies 4000 documents in Firestore-safe chunks behind the existing generation barrier.

**Tech Stack:** TypeScript, Jest, Firebase Admin/Firestore, Firebase Functions v2, Node.js CommonJS migration scripts.

---

### Task 1: Lock the v7 factory contract with RED tests

**Files:**
- Modify: `functions/src/tournament_pool_v2_factory.test.ts`
- Modify: `functions/src/tournament_pool_v2_factory.ts`

- [ ] **Step 1: Write failing exact-quota and semantic-uniqueness tests**

Add assertions against the production-sized fixture:

```ts
expect(pool.tasks).toHaveLength(4000);
expect(pool.manifest.counts).toEqual({
  'guess_phrase:1': 400, 'guess_phrase:2': 400, 'guess_phrase:3': 400,
  'fill_gap:1': 160, 'fill_gap:2': 180, 'fill_gap:3': 160,
  'find_oddity:1': 200, 'find_oddity:2': 200,
  'translate_build:1': 400, 'translate_build:2': 700, 'translate_build:3': 400,
  'speed_match:1': 98, 'speed_match:2': 202, 'speed_match:3': 100,
});
expect(new Set(pool.tasks.map(taskSemanticSignature)).size).toBe(4000);
```

Assert one normalized source phrase per `translate_build`, no reused selected speed pair,
`I <= 10%` of fill answers, at least six fill grammar roles, and at least 60% advanced D3 gaps.

- [ ] **Step 2: Run the factory test and verify RED**

Run:

```powershell
npx jest --runInBand --runTestsByPath src/tournament_pool_v2_factory.test.ts
```

Expected: FAIL because v6 returns 180 tasks and has no v7 bucket metadata.

- [ ] **Step 3: Introduce the explicit quota and bucket types**

In `tournament_pool_v2_factory.ts`, replace the uniform per-mode constant with:

```ts
export const NEW_TOURNAMENT_POOL_VERSION = 'tpool_20260801_v7' as const;
export const NEW_TOURNAMENT_POOL_CELL_QUOTAS = Object.freeze({
  'guess_phrase:1': 400, 'guess_phrase:2': 400, 'guess_phrase:3': 400,
  'fill_gap:1': 160, 'fill_gap:2': 180, 'fill_gap:3': 160,
  'find_oddity:1': 200, 'find_oddity:2': 200,
  'translate_build:1': 400, 'translate_build:2': 700, 'translate_build:3': 400,
  'speed_match:1': 98, 'speed_match:2': 202, 'speed_match:3': 100,
} as const);
```

Extend generated task documents with `poolVersion` and `exposureBucket`. Extend the manifest
with per-mode bucket counts and bucket sizes.

- [ ] **Step 4: Implement clone-resistant selection**

Add a normalized semantic-signature helper used before selection. Track normalized primary
phrase keys for phrase-builder and normalized EN/RU pair keys for speed-match. Reject candidates
that would violate the approved clone rules instead of relaxing the target.

- [ ] **Step 5: Assign balanced buckets**

Create buckets of at most 40 tasks per mode. Distribute each difficulty round-robin so every
bucket for a mode contains enough tasks for its supported difficulties. Use the exact value:

```ts
`${NEW_TOURNAMENT_POOL_VERSION}:${mode}:${String(bucketIndex).padStart(3, '0')}`
```

- [ ] **Step 6: Run the factory test and keep iterating to GREEN**

Run the Step 2 command. Expected: PASS with exactly 4000 tasks and no diversity shortfall.

- [ ] **Step 7: Commit only factory files**

```powershell
git add -- functions/src/tournament_pool_v2_factory.ts functions/src/tournament_pool_v2_factory.test.ts
git commit -m "feat: generate 4000 unique tournament tasks"
```

### Task 2: Lock bounded runtime exposure with RED tests

**Files:**
- Modify: `functions/src/tournament_core.ts`
- Modify: `functions/src/tournament_core.test.ts`
- Modify: `functions/src/tournaments.ts`
- Create: `functions/src/tournament_pool_exposure_v7.test.ts`

- [ ] **Step 1: Add RED tests for v6/v7 barrier compatibility**

Test that v6 ready tokens remain valid without layout metadata and v7 tokens require exact mode
bucket counts. Test rejection of missing modes, zero/oversized counts, wrong generation, and
malformed bucket identifiers.

- [ ] **Step 2: Add RED tests for deterministic bucket choice and bounded reads**

Define the desired pure API:

```ts
expect(tournamentExposureBucketId(token, 'fill_gap', dayOrdinal))
  .toBe('tpool_20260801_v7:fill_gap:007');
```

Use fake query adapters to prove v7 performs one query per mode, never fetches more than 40
documents per mode, validates generation/bucket parity, and rechecks the barrier after load.

- [ ] **Step 3: Run focused runtime tests and verify RED**

```powershell
npx jest --runInBand --runTestsByPath src/tournament_core.test.ts src/tournament_pool_exposure_v7.test.ts
```

Expected: FAIL because v7 layout parsing and exposure-bucket loading do not exist.

- [ ] **Step 4: Implement compatible token parsing and bucket selection**

Extend `TournamentPoolBarrierToken` with optional validated layout data. Keep the v6 fallback
query unchanged. For v7, query only:

```ts
db.collection(TOURNAMENT_TASKS_COLLECTION)
  .where('exposureBucket', '==', expectedBucket)
  .limit(TASKS_PER_MODE_SLICE)
```

Reject any returned task whose stored generation or bucket differs from the ready token.

- [ ] **Step 5: Extend deterministic exposure tags**

Allow v5, v6, and v7 tags only for transition compatibility. Seed the exposure deck with the
exact generation tag so v7 rotation cannot collide with v6 ordering.

- [ ] **Step 6: Add the 730-day reachability test**

Simulate representative scheduled/start-now room IDs and shards over 730 dates. Assert that no
room repeats an ID and the union reaches all 4000 production fixture IDs.

- [ ] **Step 7: Run runtime tests and typecheck to GREEN**

```powershell
npx jest --runInBand --runTestsByPath src/tournament_core.test.ts src/tournament_pool_exposure_v7.test.ts
npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 8: Commit only runtime files**

```powershell
git add -- functions/src/tournament_core.ts functions/src/tournament_core.test.ts functions/src/tournaments.ts functions/src/tournament_pool_exposure_v7.test.ts
git commit -m "feat: expose tournament v7 through bounded buckets"
```

### Task 3: Make the v6-to-v7 migration safe for 4000 documents

**Files:**
- Modify: `scripts/apply-tournament-pool-v2.cjs`
- Modify: `scripts/rollback-tournament-pool-v2.cjs`
- Modify: `tests/tournament_pool_migration_scripts.test.ts`

- [ ] **Step 1: Add RED tests for v7 pins and chunk plans**

Require source `tpool_20260801_v6`, target `tpool_20260801_v7`, count 4000, and new apply/rollback
environment guards. Add pure chunk-plan assertions:

```ts
expect(apply.chunkItems(Array.from({ length: 4000 }), 400).map(chunk => chunk.length))
  .toEqual([400, 400, 400, 400, 400, 400, 400, 400, 400, 400]);
```

Test bounded create, read-back, and delete planning plus exact v7 barrier layout release data.

- [ ] **Step 2: Run the migration test and verify RED**

```powershell
npx jest --runInBand --runTestsByPath tests/tournament_pool_migration_scripts.test.ts
```

Expected: FAIL on v6 target/count and missing chunk helpers.

- [ ] **Step 3: Implement v7 pins and bounded operations**

Set `EXPECTED_NEW_COUNT = 4000`, source v6, target v7, and v7 guard names. Use batches of at
most 400 creates/deletes and `getAll` chunks of at most 300 references. Validate every staged
row exactly against frozen NDJSON before deleting any v6 document.

- [ ] **Step 4: Persist and validate barrier layout metadata**

The release transaction must include the factory manifest's exact mode bucket counts and layout
hash. Rollback must restore the frozen v6 barrier shape and refuse unknown migration owners.

- [ ] **Step 5: Run migration tests and syntax checks to GREEN**

```powershell
npx jest --runInBand --runTestsByPath tests/tournament_pool_migration_scripts.test.ts
node --check scripts/apply-tournament-pool-v2.cjs
node --check scripts/rollback-tournament-pool-v2.cjs
```

- [ ] **Step 6: Commit only migration files**

```powershell
git add -- scripts/apply-tournament-pool-v2.cjs scripts/rollback-tournament-pool-v2.cjs tests/tournament_pool_migration_scripts.test.ts
git commit -m "feat: guard tournament pool v7 migration"
```

### Task 4: Generate and audit the frozen 4000-task bundle

**Files:**
- Modify: `functions/src/tournament_pool_v2_dry_run.ts`
- Modify: `functions/src/tournament_pool_v2_factory.test.ts`
- Create ignored artifacts under: `.codex-tmp/tournament-pool-v7-4000/`

- [ ] **Step 1: Add RED dry-run manifest assertions**

Require exact quotas, bucket integrity, semantic signature count, source reuse metrics, fill role
metrics, oddity POS metrics, 2400 non-reused speed pairs, 730-day reachability, and
`productionWrites: 0`.

- [ ] **Step 2: Run focused tests and verify RED**

Run the factory test. Expected: FAIL until the dry-run manifest contains every required field.

- [ ] **Step 3: Extend the dry-run audit without adding production writes**

Emit `manifest.json`, `old-pool-backup.ndjson`, `new-pool.ndjson`, and a compact human-readable
quality report. Keep large n-gram/source-reuse tables only in the ignored output directory.

- [ ] **Step 4: Generate the production-sized bundle**

Compile to an ignored directory, then run the compiled dry-run with `service-account.json` only
for read-only backup/preflight access. Do not use any OpenAI credential.

- [ ] **Step 5: Inspect decisive audit metrics**

Require 4000/4000 IDs and signatures, zero invalid/quarantine findings, exact cell counts, exact
bucket coverage, one-trap parity for all 1500 builders, 2400 unique speed pairs, and full
exposure reachability. Any failure returns to the relevant RED test.

- [ ] **Step 6: Run the complete focused verification set**

```powershell
npx jest --runInBand --runTestsByPath src/tournament_pool_v2_factory.test.ts src/tournament_core.test.ts src/tournament_pool_exposure_v7.test.ts
npx tsc --noEmit -p tsconfig.json
```

From repository root:

```powershell
npx jest --runInBand --runTestsByPath tests/tournament_pool_migration_scripts.test.ts
git diff --check
```

- [ ] **Step 7: Commit only source/test changes from the dry-run task**

Do not commit `.codex-tmp` artifacts.

### Task 5: Fresh review, targeted deploy, and guarded production migration

**Files:**
- No source edits unless review finds a tested defect.
- Production evidence: `.codex-tmp/tournament-pool-v7-4000/`

- [ ] **Step 1: Review the complete task commit range**

Compare against `docs/superpowers/specs/2026-08-01-tournament-pool-4000-design.md`. Critical or
important findings require a new RED test and fix before release.

- [ ] **Step 2: Run hash-pinned zero-write production preflight**

Verify exact live v6 backup, exact frozen v7 artifact, all room/task-secret references, complete
bucket layout, 730-day exposure, and `productionWrites: 0`.

- [ ] **Step 3: Build and deploy only tournament runtime functions**

Run the canonical/deploy guards, build Functions, then deploy the explicit tournament export
list only. Verify all targeted functions are `ACTIVE` with one new source hash.

- [ ] **Step 4: Repeat preflight after deploy**

Wait until every room referencing removable v6 tasks is `closed` or `cancelled`. Do not bypass
the protected-room gate.

- [ ] **Step 5: Apply the guarded v6-to-v7 migration**

Set only the v7 apply guard for the command, pass manifest/backup/new-pool SHA pins, and use
`--apply`. Do not interrupt the barrier-owned operation.

- [ ] **Step 6: Independently verify live production**

Read all live tasks without writing. Require exactly 4000 v7 and zero v6 documents, exact deep
equality to frozen NDJSON, zero validator failures, exact bucket layout, ready v7 barrier, and
active compatible runtime.

- [ ] **Step 7: Verify final git ownership**

Confirm every task commit is an ancestor of the shared branch and task files are clean. Preserve
all unrelated workspace edits.
