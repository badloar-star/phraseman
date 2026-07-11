# Production XP Integrity Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a privacy-safe, production-wide, strictly read-only audit that separates confirmed XP inflation from probable, indeterminate, consistent, and mirror-drift cases.

**Architecture:** Keep all classification in pure TypeScript modules, reconstruct historical achievement catalogs from Git snapshots, and isolate Firebase access behind a read-only repository whose public API exposes no mutation methods. The CLI runs sample calibration before a full scan, emits aggregate-only reports under `.codex-tmp/`, and fails closed whenever historical evidence is incomplete.

**Tech Stack:** TypeScript 5.9, `tsx`, Jest 29, Firebase Admin 13, Node `crypto`/`fs`, Git history.

---

## Worktree and file map

Implementation work happens in `C:\appsprojects\phraseman\.worktrees\xp-integrity-audit` on branch `codex/xp-integrity-audit`.

Create:

- `scripts/xp_integrity/types.ts` — stable input/output contracts and confidence/reason enums.
- `scripts/xp_integrity/catalog_history.ts` — Git-backed versioned achievement catalog reconstruction and event-to-catalog matching.
- `scripts/xp_integrity/analyze_account.ts` — pure ledger, achievement, alias, migration, and mirror analysis.
- `scripts/xp_integrity/firestore_reader.ts` — bounded read-only Firebase pagination and control-account lookup.
- `scripts/xp_integrity/report.ts` — aggregate-only JSON and Russian Markdown report construction.
- `scripts/audit_production_xp_integrity.ts` — guarded CLI orchestration; no Firestore writes.
- `tests/xp_integrity_catalog_history.test.ts` — historical catalog matching and fail-closed tests.
- `tests/xp_integrity_analyze_account.test.ts` — classification and exact-subtraction tests.
- `tests/xp_integrity_read_only_contract.test.ts` — mutation/API/privacy/output-path guards.
- `tests/xp_integrity_report.test.ts` — aggregate report privacy and coverage tests.

Modify:

- `package.json` — add one explicit audit command.

Runtime-only ignored output:

- `.codex-tmp/xp-integrity-audit/<run-id>/aggregate.json`
- `.codex-tmp/xp-integrity-audit/<run-id>/decision.ru.md`

Do not modify `users`, `progress_events`, `leaderboard`, `arena_profiles`, `league_groups`, authentication links, notifications, or existing ledger documents.

### Task 1: Bootstrap the isolated worktree and lock read-only contracts

**Files:**

- Create: `scripts/xp_integrity/types.ts`
- Create: `tests/xp_integrity_read_only_contract.test.ts`

- [ ] **Step 1: Install the locked dependency tree without lifecycle scripts**

Run:

```powershell
npm ci --ignore-scripts
```

Expected: exit `0`; `package-lock.json` remains unchanged.

- [ ] **Step 2: Run a narrow unchanged baseline**

Run:

```powershell
npx jest --runTestsByPath tests/xp_levels.test.ts tests/xp_level_restore.test.ts --runInBand --no-cache
```

Expected: both suites pass. If either fails before audit code exists, stop and report the baseline failure.

- [ ] **Step 3: Write the failing read-only contract test**

Create `tests/xp_integrity_read_only_contract.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('production XP audit read-only contract', () => {
  it('contains no Firestore mutation API and rejects apply mode', () => {
    const files = [
      'scripts/xp_integrity/firestore_reader.ts',
      'scripts/audit_production_xp_integrity.ts',
    ];
    const source = files.filter((file) => fs.existsSync(path.join(root, file))).map(read).join('\n');
    expect(source).not.toMatch(/\.(set|update|delete|create|add|batch|bulkWriter|runTransaction)\s*\(/);
    expect(source).toContain("forbiddenFlags = new Set(['--apply', '--write', '--repair', '--send'])");
    expect(source).toContain("throw new Error('xp_audit_read_only_flag_rejected')");
  });

  it('writes reports only below the ignored audit directory', () => {
    const source = read('scripts/audit_production_xp_integrity.ts');
    expect(source).toContain("path.join(root, '.codex-tmp', 'xp-integrity-audit', runId)");
    expect(source).not.toMatch(/docs[\\/]reports|assets[\\/]|admin[\\/]/);
  });
});
```

- [ ] **Step 4: Run the contract test and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/xp_integrity_read_only_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because the audit files do not exist.

- [ ] **Step 5: Add stable audit types**

Create `scripts/xp_integrity/types.ts`:

```ts
export type IntegrityClass = 'confirmed_damaged' | 'probable_damaged' | 'indeterminate' | 'consistent';

export type ReasonCode =
  | 'ledger_gap_exact'
  | 'achievement_wrong_reward_exact'
  | 'achievement_impossible_threshold_exact'
  | 'achievement_alias_duplicate_exact'
  | 'migration_exact'
  | 'migration_pattern_only'
  | 'catalog_unmapped'
  | 'threshold_state_missing'
  | 'history_incomplete'
  | 'projection_drift';

export type AuditEvent = {
  ownerUid: string;
  eventId: string;
  type: string;
  xpDelta: number;
  totalXpBefore: number | null;
  totalXpAfter: number | null;
  clientCreatedAt: number | null;
  serverCreatedAt: number | null;
  appVersion: string | null;
  payload: Record<string, unknown>;
};

export type CatalogReward = {
  achievementId: string;
  xp: number;
  thresholdKind: 'lifetime_xp' | 'weekly_xp' | 'other';
  thresholdValue: number | null;
};

export type CatalogSnapshot = {
  commit: string;
  committedAtMs: number;
  appVersion: string | null;
  rewards: ReadonlyMap<string, CatalogReward>;
};

export type MigrationEvidence = {
  beforeXp: number | null;
  afterXp: number | null;
  formulaVersion: string | null;
  markerPresent: boolean;
  exactTransformDelta: number | null;
  patternMatches: boolean;
};

export type MirrorValues = {
  leaderboardXp: number | null;
  arenaXp: number | null;
  leagueXp: number | null;
};

export type RawUser = {
  uid: string;
  firebaseAuthUid: string | null;
  canonicalStableId: string | null;
  mergedInto: string | null;
  identityHidden: boolean;
  progress: Record<string, unknown>;
};

export type RawAlias = {
  uid: string;
  linkage: 'canonical_pointer' | 'merged_into' | 'provider_identity';
};

export type AccountAuditInput = {
  uid: string;
  currentXp: number;
  canonicalEvents: readonly AuditEvent[];
  aliasEvents: readonly AuditEvent[];
  migration: MigrationEvidence;
  mirrors: MirrorValues;
  historyComplete: boolean;
};

export type AccountAuditResult = {
  classification: IntegrityClass;
  reasons: ReasonCode[];
  exactInvalidXp: number;
  proposedXp: number | null;
  projectionDrift: boolean;
};
```

- [ ] **Step 6: Commit the contract and types**

```powershell
git add scripts/xp_integrity/types.ts tests/xp_integrity_read_only_contract.test.ts
git commit -m "test: lock XP audit read-only contracts"
```

### Task 2: Reconstruct versioned achievement catalogs from Git

**Files:**

- Create: `scripts/xp_integrity/catalog_history.ts`
- Create: `tests/xp_integrity_catalog_history.test.ts`

- [ ] **Step 1: Write failing catalog tests**

Create `tests/xp_integrity_catalog_history.test.ts` with fixtures that prove exact app-version matching and fail-closed behavior:

```ts
import { matchCatalogForEvent, parseAchievementCatalog } from '../scripts/xp_integrity/catalog_history';
import type { CatalogSnapshot } from '../scripts/xp_integrity/types';

const snapshot = (commit: string, appVersion: string | null, committedAtMs: number, xp: number): CatalogSnapshot => ({
  commit,
  appVersion,
  committedAtMs,
  rewards: new Map([['xp_5000', { achievementId: 'xp_5000', xp, thresholdKind: 'lifetime_xp', thresholdValue: 5000 }]]),
});

describe('historical XP achievement catalogs', () => {
  it('extracts literal id/xp pairs and threshold semantics', () => {
    const source = "const defs = [{ id:'xp_5000', category:'xp', xp:150 }, { id:'weekly_xp_10000', xp:900 }];";
    const rewards = parseAchievementCatalog(source, 'fixture.ts');
    expect(rewards.get('xp_5000')).toEqual({ achievementId: 'xp_5000', xp: 150, thresholdKind: 'lifetime_xp', thresholdValue: 5000 });
    expect(rewards.get('weekly_xp_10000')?.thresholdValue).toBe(10000);
  });

  it('uses exact app version before timestamp inference', () => {
    const catalogs = [snapshot('old', '1.5.40', 1000, 100), snapshot('new', '1.5.41', 2000, 150)];
    expect(matchCatalogForEvent(catalogs, { appVersion: '1.5.40', createdAtMs: 9999 })?.commit).toBe('old');
  });

  it('returns null when timestamp windows overlap or history is unmapped', () => {
    const catalogs = [snapshot('a', null, 1000, 100), snapshot('b', null, 1000, 150)];
    expect(matchCatalogForEvent(catalogs, { appVersion: null, createdAtMs: 1000 })).toBeNull();
    expect(matchCatalogForEvent([], { appVersion: 'unknown', createdAtMs: 1000 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the catalog tests and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/xp_integrity_catalog_history.test.ts --runInBand --no-cache
```

Expected: FAIL because `catalog_history.ts` is missing.

- [ ] **Step 3: Implement AST-based catalog parsing and deterministic matching**

Create `scripts/xp_integrity/catalog_history.ts`. Use the TypeScript compiler API to accept only literal object properties; skip computed rewards rather than evaluating application code. Export:

```ts
export function parseAchievementCatalog(source: string, fileName: string): Map<string, CatalogReward>;
export function matchCatalogForEvent(
  catalogs: readonly CatalogSnapshot[],
  event: { appVersion: string | null; createdAtMs: number | null },
): CatalogSnapshot | null;
export function loadCatalogHistory(repoRoot: string): CatalogSnapshot[];
```

`loadCatalogHistory` must:

```ts
const commits = git(repoRoot, ['log', '--format=%H|%cI', '--', 'app/achievements.ts'])
  .split(/\r?\n/)
  .filter(Boolean);
for (const row of commits) {
  const [commit, committedAt] = row.split('|');
  const achievementsSource = git(repoRoot, ['show', `${commit}:app/achievements.ts`]);
  const appConfig = gitOptional(repoRoot, ['show', `${commit}:app.json`]);
  snapshots.push({
    commit,
    committedAtMs: Date.parse(committedAt),
    appVersion: readExpoVersion(appConfig),
    rewards: parseAchievementCatalog(achievementsSource, `${commit}:app/achievements.ts`),
  });
}
```

Matching rules:

1. A unique exact `appVersion` match wins.
2. Timestamp matching is allowed only between non-overlapping snapshots with explicit release provenance.
3. Multiple candidates or no candidate returns `null` and later produces `catalog_unmapped`.

- [ ] **Step 4: Run catalog tests GREEN**

Run the same Jest command. Expected: PASS.

- [ ] **Step 5: Generate a local catalog summary without user data**

Run:

```powershell
npx tsx -e "import {loadCatalogHistory} from './scripts/xp_integrity/catalog_history'; const x=loadCatalogHistory(process.cwd()); console.log(JSON.stringify(x.map(v=>({commit:v.commit.slice(0,12),appVersion:v.appVersion,rewards:v.rewards.size})),null,2))"
```

Expected: JSON with commit prefixes, versions, and reward counts only. If any relevant snapshot has zero parsed rewards, stop and fix parsing before production reads.

- [ ] **Step 6: Commit catalog reconstruction**

```powershell
git add scripts/xp_integrity/catalog_history.ts tests/xp_integrity_catalog_history.test.ts
git commit -m "feat: reconstruct historical XP reward catalogs"
```

### Task 3: Implement fail-closed account analysis

**Files:**

- Create: `scripts/xp_integrity/analyze_account.ts`
- Create: `tests/xp_integrity_analyze_account.test.ts`

- [ ] **Step 1: Write RED fixtures for every classification**

Tests must cover:

- wrong canonical reward with a mapped historical catalog;
- impossible `xp_N` using exact `totalXpBefore`;
- non-XP threshold with missing chronological state → indeterminate;
- same semantic achievement on a proven alias → exact duplicate only when catalog and identity linkage are mapped;
- exact migration transform with retained before/version/delta;
- migration formula pattern without retained before/version → probable only;
- mirror mismatch only → `consistent` plus `projectionDrift`;
- incomplete history → never propose XP.

Use this exact assertion shape:

```ts
expect(analyzeAccount(input, catalogs)).toEqual({
  classification: 'confirmed_damaged',
  reasons: ['achievement_impossible_threshold_exact'],
  exactInvalidXp: 3000,
  proposedXp: 12034,
  projectionDrift: false,
});
```

- [ ] **Step 2: Run the analyzer tests RED**

```powershell
npx jest --runTestsByPath tests/xp_integrity_analyze_account.test.ts --runInBand --no-cache
```

Expected: FAIL because `analyzeAccount` is missing.

- [ ] **Step 3: Implement the analyzer**

Create `scripts/xp_integrity/analyze_account.ts` with these fail-closed helpers:

```ts
function exactLifetimeThresholdViolation(event: AuditEvent, reward: CatalogReward): boolean {
  return reward.thresholdKind === 'lifetime_xp'
    && event.totalXpBefore !== null
    && reward.thresholdValue !== null
    && event.totalXpBefore < reward.thresholdValue;
}

function exactMigrationDelta(evidence: MigrationEvidence): number {
  if (!evidence.markerPresent) return 0;
  if (evidence.beforeXp === null || evidence.afterXp === null) return 0;
  if (!evidence.formulaVersion || evidence.exactTransformDelta === null) return 0;
  return evidence.afterXp - evidence.beforeXp === evidence.exactTransformDelta
    ? Math.max(0, evidence.exactTransformDelta)
    : 0;
}
```

`analyzeAccount(input, catalogs)` must sort all events chronologically, map each event to exactly one historical catalog, deduplicate exact invalid semantic claims, sum only proven invalid XP, and return `proposedXp = currentXp - exactInvalidXp` only when `historyComplete === true` and every subtraction has exact evidence. Probable or indeterminate signals must force `proposedXp: null` unless they coexist with a separately proven exact subset; in that case report the exact subset but keep the overall classification indeterminate and still emit `proposedXp: null`.

- [ ] **Step 4: Run analyzer tests GREEN**

Run the same Jest command. Expected: PASS.

- [ ] **Step 5: Commit pure analysis**

```powershell
git add scripts/xp_integrity/analyze_account.ts tests/xp_integrity_analyze_account.test.ts
git commit -m "feat: classify historical XP integrity evidence"
```

### Task 4: Add the bounded read-only Firebase repository

**Files:**

- Create: `scripts/xp_integrity/firestore_reader.ts`
- Update: `tests/xp_integrity_read_only_contract.test.ts`

- [ ] **Step 1: Extend RED contract checks**

Add assertions that `firestore_reader.ts` exports only:

```ts
export type XpAuditReader = {
  pageUsers(afterUid: string | null, limit: number): Promise<ReadonlyArray<RawUser>>;
  readProgressEvents(uid: string): Promise<ReadonlyArray<AuditEvent>>;
  readAliases(user: RawUser): Promise<ReadonlyArray<RawAlias>>;
  readMirrors(user: RawUser): Promise<MirrorValues>;
  resolveControlEmail(email: string): Promise<string | null>;
  getReadCount(): number;
};
```

Also assert that the source contains no methods named `set`, `update`, `delete`, `create`, `add`, `batch`, `bulkWriter`, or `runTransaction`.

- [ ] **Step 2: Run the contract RED**

Expected: FAIL until the reader exists.

- [ ] **Step 3: Implement paginated reads with a budget**

The repository must:

- initialize Firebase Admin from `GOOGLE_APPLICATION_CREDENTIALS` or application default credentials without printing values;
- resolve the project from `--project`, `GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, or `.firebaserc`;
- page `users` ordered by document ID in batches of at most 250;
- read per-user `progress_events` in pages and sort by server/client creation time;
- follow only explicit canonical/merge pointers and authenticated identity links for aliases;
- read leaderboard/arena/current-league mirrors without treating them as canonical;
- increment and enforce `maxReads`, throwing `xp_audit_read_budget_exceeded` before the next query;
- expose no database object to callers.

Use bounded concurrency in the caller with a default of `4`; do not call `Promise.all` across the entire user population.

- [ ] **Step 4: Run contract GREEN and TypeScript check for the new files only**

```powershell
npx jest --runTestsByPath tests/xp_integrity_read_only_contract.test.ts --runInBand --no-cache
npx tsc --noEmit --pretty false --skipLibCheck --esModuleInterop --module commonjs --moduleResolution node --target es2022 scripts/xp_integrity/types.ts scripts/xp_integrity/firestore_reader.ts
```

Expected: both exit `0`.

- [ ] **Step 5: Commit the reader**

```powershell
git add scripts/xp_integrity/firestore_reader.ts tests/xp_integrity_read_only_contract.test.ts
git commit -m "feat: add bounded read-only XP audit reader"
```

### Task 5: Build aggregate-only reports and guarded CLI

**Files:**

- Create: `scripts/xp_integrity/report.ts`
- Create: `scripts/audit_production_xp_integrity.ts`
- Create: `tests/xp_integrity_report.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write RED privacy/report tests**

Create fixtures containing obvious email, nickname, UID, auth UID, event ID, and free-form payload strings. Assert that serialized JSON and Markdown contain none of them and expose only:

```ts
type AggregateReport = {
  mode: 'sample' | 'full';
  startedAt: string;
  finishedAt: string;
  coverageComplete: boolean;
  scannedUsers: number;
  skippedUsers: number;
  failedUsers: number;
  readCount: number;
  classes: Record<IntegrityClass, number>;
  reasons: Partial<Record<ReasonCode, number>>;
  exactInvalidXpTotal: number;
  projectionDriftUsers: number;
  calibration: { ran: boolean; matchedExpectedLevelNeighborhood: boolean | null };
};
```

- [ ] **Step 2: Run report and contract tests RED**

```powershell
npx jest --runTestsByPath tests/xp_integrity_report.test.ts tests/xp_integrity_read_only_contract.test.ts --runInBand --no-cache
```

Expected: FAIL because report/CLI files do not exist.

- [ ] **Step 3: Implement aggregation and privacy validation**

`report.ts` must accept only `AccountAuditResult[]` plus numeric coverage metadata. It must not accept raw user or event objects. Before writing, recursively reject strings matching email syntax, raw UID/auth-ID keys, or known control values supplied through a private denylist.

The Markdown must clearly state:

- no Firestore writes occurred;
- whether coverage is complete;
- counts for confirmed/probable/indeterminate/consistent;
- exact invalid XP only for evidence-backed cases;
- no correction was applied;
- any correction needs separate authorization and review.

- [ ] **Step 4: Implement CLI safety and modes**

At the top of `scripts/audit_production_xp_integrity.ts`:

```ts
const forbiddenFlags = new Set(['--apply', '--write', '--repair', '--send']);
if (process.argv.slice(2).some((arg) => forbiddenFlags.has(arg.split('=')[0]))) {
  throw new Error('xp_audit_read_only_flag_rejected');
}
```

Supported modes:

- default `--sample=25`;
- `--full` for every reachable user;
- `--max-reads=<positive integer>`;
- `--concurrency=1..8`;
- `--project=<firebase project id>`.

Control-account email comes only from `XP_AUDIT_CONTROL_EMAIL`; never accept or print it as a command-line flag. Output directory is exactly:

```ts
const outputDir = path.join(root, '.codex-tmp', 'xp-integrity-audit', runId);
```

Set `coverageComplete` to `false` for any failed/skipped user, exhausted read budget, interrupted page, missing catalog window, or incomplete alias history. Exit non-zero after writing the partial report when infrastructure coverage is incomplete.

- [ ] **Step 5: Add the package command**

Add:

```json
"audit:production-xp-integrity": "tsx scripts/audit_production_xp_integrity.ts"
```

- [ ] **Step 6: Run all new unit/contract tests GREEN**

```powershell
npx jest --runTestsByPath tests/xp_integrity_catalog_history.test.ts tests/xp_integrity_analyze_account.test.ts tests/xp_integrity_read_only_contract.test.ts tests/xp_integrity_report.test.ts --runInBand --no-cache
```

Expected: 4 suites pass, 0 failures, and no write-guard violation.

- [ ] **Step 7: Commit CLI and reports**

```powershell
git add package.json scripts/audit_production_xp_integrity.ts scripts/xp_integrity/report.ts tests/xp_integrity_report.test.ts
git commit -m "feat: add privacy-safe production XP audit CLI"
```

### Task 6: Private calibration and bounded sample audit

**Files:**

- Runtime output only: `.codex-tmp/xp-integrity-audit/<run-id>/...`

- [ ] **Step 1: Verify credentials and project without printing secrets**

Run a read-only Firebase initialization probe that prints only project ID and `credential=available`. Do not print service-account paths, JSON, tokens, email, UID, or document payloads.

- [ ] **Step 2: Run the known-account calibration plus 25-user sample**

Set `XP_AUDIT_CONTROL_EMAIL` only in the process environment and run:

```powershell
npm run audit:production-xp-integrity -- --sample=25 --max-reads=5000 --concurrency=2
```

Expected:

- mode reports `DRY-RUN READ-ONLY`;
- calibration runs privately and resolves current level near 8;
- known historical migration/achievement indicators are detected without identity output;
- aggregate files contain no email, nickname, UID, auth UID, or event ID;
- `readCount <= 5000`;
- no Firestore writes.

- [ ] **Step 3: Inspect the aggregate report and stop on ambiguity**

Stop before a full scan if:

- calibration does not resolve;
- calibration current XP/level is materially different from the established case;
- a known invalid event is classified consistent;
- any personal identifier appears;
- catalog mapping for the vulnerable period is incomplete;
- any mutation method is invoked or attempted;
- estimated full-scan reads exceed the agreed budget by more than 20%.

- [ ] **Step 4: Re-run focused tests after calibration**

Run the four-suite command from Task 5. Expected: PASS.

- [ ] **Step 5: Commit only code changes, never runtime reports**

Confirm `.codex-tmp/xp-integrity-audit/` remains ignored and `git status --short` contains no report files.

### Task 7: Full production read-only scan and decision report

**Files:**

- Runtime output only: `.codex-tmp/xp-integrity-audit/<run-id>/aggregate.json`
- Runtime output only: `.codex-tmp/xp-integrity-audit/<run-id>/decision.ru.md`

- [ ] **Step 1: Estimate and set a bounded full-scan read budget**

Calculate `sampleReadCount / sampleScannedUsers * totalUserCount * 1.2`, round up, and pass it as `--max-reads`. If the estimate is unexpectedly high, stop and report cost before running.

- [ ] **Step 2: Run the full audit**

```powershell
$budget = [Math]::Ceiling(($sampleReadCount / $sampleScannedUsers) * $totalUserCount * 1.2)
npm run audit:production-xp-integrity -- --full --max-reads=$budget --concurrency=4
```

Expected: exit `0` only when all reachable user pages completed and infrastructure coverage is complete. Indeterminate evidence is a valid audit result and does not itself make infrastructure coverage incomplete.

- [ ] **Step 3: Validate output privacy and invariants**

Run a local validator that confirms:

- no email-like strings;
- no raw identity fields or event IDs;
- class counts sum to `scannedUsers`;
- `confirmed + probable + indeterminate + consistent === scannedUsers`;
- exact proposed XP totals come only from confirmed cases;
- failed/skipped counts are zero for a complete claim;
- no production write log exists.

- [ ] **Step 4: Run final focused verification**

```powershell
npx jest --runTestsByPath tests/xp_integrity_catalog_history.test.ts tests/xp_integrity_analyze_account.test.ts tests/xp_integrity_read_only_contract.test.ts tests/xp_integrity_report.test.ts --runInBand --no-cache
git diff --check
git status --short
```

Expected: all suites pass; diff check clean; only intended source/test/package changes are tracked.

- [ ] **Step 5: Request final Advisor review**

Send the objective, approved spec, actual final diff, focused test evidence, aggregate report, read count, coverage, privacy validation, and unresolved indeterminate categories. Completion requires `DECISION: APPROVED`; apply changes and resubmit after `CHANGES_REQUIRED`.

- [ ] **Step 6: Deliver the Russian decision report**

Report:

- whether exact mass correction is possible;
- counts of confirmed, probable, indeterminate, consistent, and mirror-drift accounts;
- total proven excess XP without user identifiers;
- complete/partial coverage and read count;
- that zero Firestore writes occurred;
- that no account was corrected;
- the separate approval required for any future correction run.

End with `Находки и предложения` and keep possible future corrections explicitly separate from completed audit work.
