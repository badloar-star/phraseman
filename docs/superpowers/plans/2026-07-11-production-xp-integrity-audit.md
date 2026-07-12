# Production XP Integrity Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a privacy-safe, production-wide, strictly read-only audit that distinguishes proven XP inflation from probable, indeterminate, consistent, and projection-only cases.

**Architecture:** Normalize the actual Firestore ledger shape into pure evidence types, reconstruct historical catalogs only when a verified release window exists, and classify accounts with independent completeness dimensions. Firebase access is isolated behind a paginated read-only repository and a mandatory IAM preflight that aborts unless the runtime principal is proven to lack write permissions.

**Tech Stack:** TypeScript 5.9, `tsx`, Jest 29, Firebase Admin 13, Google IAM `testIamPermissions`, Node `crypto`/`fs`, Git history.

---

## Worktree and file map

Implementation runs in `C:\appsprojects\phraseman\.worktrees\xp-integrity-audit` on branch `codex/xp-integrity-audit`.

Create:

- `scripts/xp_integrity/types.ts` — normalized stored-data and evidence contracts.
- `scripts/xp_integrity/catalog_history.ts` — literal catalog extraction plus verified effective-window matching.
- `scripts/xp_integrity/analyze_account.ts` — pure account analysis and classification.
- `scripts/xp_integrity/read_budget.ts` — atomic query-budget reservation.
- `scripts/xp_integrity/firestore_reader.ts` — IAM-gated, paginated reads only.
- `scripts/xp_integrity/report.ts` — aggregate-only report and privacy validation.
- `scripts/audit_production_xp_integrity.ts` — guarded sample/full CLI.
- `tests/xp_integrity_catalog_history.test.ts`
- `tests/xp_integrity_analyze_account.test.ts`
- `tests/xp_integrity_reader.test.ts`
- `tests/xp_integrity_read_only_contract.test.ts`
- `tests/xp_integrity_report.test.ts`
- `tests/xp_integrity_cli.test.ts`

Modify:

- `package.json` — add `audit:production-xp-integrity`.

Runtime output remains ignored:

- `.codex-tmp/xp-integrity-audit/YYYYMMDDTHHMMSSZ/aggregate.json`
- `.codex-tmp/xp-integrity-audit/YYYYMMDDTHHMMSSZ/decision.ru.md`

No task may write Firebase, edit existing ledger documents, notify users, award currency, repair XP, or deploy.

### Task 1: Bootstrap dependencies and define evidence types matching Firestore

**Files:**

- Create: `scripts/xp_integrity/types.ts`
- Create: `tests/xp_integrity_read_only_contract.test.ts`

- [ ] **Step 1: Install the locked dependency tree without lifecycle scripts**

```powershell
npm ci --ignore-scripts
```

Expected: exit `0`; `package-lock.json` unchanged.

- [ ] **Step 2: Run an unchanged narrow baseline**

```powershell
npx jest --runTestsByPath tests/xp_levels.test.ts tests/xp_level_restore.test.ts --runInBand --no-cache
```

Expected: both suites pass. Stop if the isolated baseline is not green.

- [ ] **Step 3: Create exact normalized evidence contracts**

Create `scripts/xp_integrity/types.ts`:

```ts
export type IntegrityClass = 'confirmed_damaged' | 'probable_damaged' | 'indeterminate' | 'consistent';
export type EvidenceState = 'complete' | 'incomplete' | 'not_applicable';
export type EvidenceCompleteness = {
  ledger: EvidenceState;
  catalog: EvidenceState;
  alias: EvidenceState;
  migration: EvidenceState;
  prerequisites: EvidenceState;
};
export type ReasonCode =
  | 'ledger_discontinuity_exact'
  | 'achievement_overpayment_exact'
  | 'achievement_impossible_prerequisite_exact'
  | 'achievement_alias_replay_exact'
  | 'migration_exact'
  | 'migration_pattern_only'
  | 'catalog_unmapped'
  | 'prerequisite_unmapped'
  | 'alias_history_incomplete'
  | 'ledger_history_incomplete'
  | 'projection_drift';
export type NormalizedAuditEvent = {
  ownerUid: string;
  eventId: string;
  type: string;
  xpDelta: number;
  totalXpAfter: number;
  totalXpBefore: number | null;
  serverCreatedAtMs: number | null;
  clientCreatedAtMs: number | null;
  appVersion: string | null;
  activeDate: string | null;
  weekKey: string | null;
  weekXpAfter: number | null;
  payload: Readonly<Record<string, unknown>>;
};
export type LedgerBaselineEvidence =
  | { kind: 'exact'; xp: number; derivedFrom: 'first_ledger_result' | 'retained_cutover'; atMs: number }
  | { kind: 'unknown'; reason: 'pre_cutover_unretained' | 'ambiguous_chain' | 'missing_timestamp' };
export type MigrationEvidence =
  | { kind: 'exact'; source: 'retained_provenance' | 'deterministic_ledger_discontinuity'; beforeXp: number; afterXp: number; formulaVersion: string; exactInvalidDelta: number; occurredAtMs: number }
  | { kind: 'pattern_only'; pattern: '250_to_400' | 'repeated_startup_migration'; markerPresent: boolean }
  | { kind: 'none' | 'incomplete' };
export type EffectiveWindow = { fromMsInclusive: number; toMsExclusive: number | null; provenance: 'release_tag' | 'build_manifest' | 'verified_release_commit' };
export type LevelFormulaSnapshot = { sourceCommit: string; formulaId: string; effective: EffectiveWindow; totalXpThresholds: readonly number[]; maxLevel: number };
export type AchievementPrerequisite =
  | { kind: 'lifetime_xp'; minimum: number }
  | { kind: 'weekly_xp'; minimum: number }
  | { kind: 'counter'; counterKey: string; minimum: number }
  | { kind: 'unsupported'; ruleId: string };
export type CatalogReward = { achievementId: string; xp: number; prerequisite: AchievementPrerequisite };
export type CatalogSnapshot = { commit: string; appVersion: string | null; effective: EffectiveWindow; rewards: ReadonlyMap<string, CatalogReward>; levelFormula: LevelFormulaSnapshot; complete: boolean };
export type CatalogMatch =
  | { kind: 'exact'; snapshot: CatalogSnapshot; basis: 'verified_server_window' }
  | { kind: 'consensus'; candidates: readonly CatalogSnapshot[] }
  | { kind: 'unmapped'; reason: 'gap' | 'overlap' | 'provenance_conflict' | 'missing_server_time' | 'unknown_version' };
export type PrerequisiteEvidence =
  | { eventId: string; prerequisite: AchievementPrerequisite; state: 'exact'; valueBefore: number; source: 'server_result' | 'immutable_event_chain' }
  | { eventId: string; prerequisite: AchievementPrerequisite; state: 'missing' | 'ambiguous' };
export type UserCutoverEvidence = {
  progressServerAuthoritative: boolean;
  progressServerCutoverAtMs: number | null;
  progressMigratedAtMs: number | null;
  xpLevelRestoreAtMs: number | null;
  progressServerStateXp: number | null;
  migrationDocument: { exists: boolean; createdAtMs: number | null; keys: readonly string[] };
};
export type AliasEvidence = { uid: string; canonicalUid: string; linkage: 'canonical_pointer' | 'duplicate_pointer' | 'shared_auth_uid'; identityMergedAtMs: number | null; events: readonly NormalizedAuditEvent[]; complete: boolean };
export type RawUser = { uid: string; firebaseAuthUid: string | null; canonicalStableId: string | null; duplicateOfStableId: string | null; identityHidden: boolean; identityMergedAtMs: number | null; progress: Readonly<Record<string, unknown>>; cutover: UserCutoverEvidence };
export type MirrorValues = { leaderboardXp: number | null; arenaXp: number | null; leagueXp: number | null };
export type AccountAuditInput = { uid: string; currentXp: number; canonicalEvents: readonly NormalizedAuditEvent[]; aliases: readonly AliasEvidence[]; baseline: LedgerBaselineEvidence; migration: MigrationEvidence; prerequisites: readonly PrerequisiteEvidence[]; mirrors: MirrorValues; completeness: EvidenceCompleteness };
export type AccountAuditResult = { classification: IntegrityClass; reasons: readonly ReasonCode[]; completeness: EvidenceCompleteness; exactInvalidXp: number; proposedXp: number | null; exactReductionIsComplete: boolean; projectionDrift: boolean };
```

The normalizer must use stored ledger fields `data.result.xpDelta`, `data.result.totalXp`, and `data.createdAt`. Derive `totalXpBefore = totalXpAfter - xpDelta` only when both are finite, non-negative, and `xpDelta <= totalXpAfter`; otherwise use `null`. Never assume top-level XP fields.

`progress_migrations/client_snapshot_v1` contains only `migrated`, `keys`, and `createdAt`; it cannot create exact migration evidence by itself.

- [ ] **Step 4: Write the first read-only contract RED**

Create `tests/xp_integrity_read_only_contract.test.ts` to assert that the future CLI rejects `--apply`, `--write`, `--repair`, and `--send`, output remains below `.codex-tmp/xp-integrity-audit`, and every new audit source imports Firebase only through `firestore_reader.ts`.

- [ ] **Step 5: Run RED and commit types/contracts**

```powershell
npx jest --runTestsByPath tests/xp_integrity_read_only_contract.test.ts --runInBand --no-cache
git add scripts/xp_integrity/types.ts tests/xp_integrity_read_only_contract.test.ts
git commit -m "test: define XP audit evidence contracts"
```

Expected: test fails because reader/CLI do not exist; the commit intentionally records RED.

### Task 2: Reconstruct only verified historical catalogs and formulas

**Files:**

- Create: `scripts/xp_integrity/catalog_history.ts`
- Create: `tests/xp_integrity_catalog_history.test.ts`

- [ ] **Step 1: Write catalog tests RED**

Test literal `id`/`xp` extraction, lifetime/weekly prerequisites, an explicit non-XP counter rule, unsupported rules, unknown IDs, duplicate app versions, gaps, overlaps, formula changes, and missing release provenance. Add forged client time, forged app version, offline-delayed submission, client/server window disagreement, missing server time, and identical-rule consensus across multiple candidates.

```ts
expect(matchCatalogForEvent(catalogs, event, 'xp_5000')).toEqual({
  kind: 'unmapped',
  reason: 'provenance_conflict',
});
```

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/xp_integrity_catalog_history.test.ts --runInBand --no-cache
```

- [ ] **Step 3: Implement literal AST parsing and release provenance**

Export:

```ts
export function parseAchievementCatalog(source: string, fileName: string): Map<string, CatalogReward>;
export function loadVerifiedCatalogHistory(repoRoot: string): CatalogSnapshot[];
export function matchCatalogForEvent(
  catalogs: readonly CatalogSnapshot[],
  event: Pick<NormalizedAuditEvent, 'appVersion' | 'serverCreatedAtMs' | 'clientCreatedAtMs'>,
  achievementId: string,
): CatalogMatch;
```

Use the TypeScript compiler API and never execute historical app code. Accept provenance only from release tags `vX.Y.Z`/`release/vX.Y.Z`, tracked build manifests with version+SHA+activation time, or commits explicitly listed in a tracked verified-release manifest. Checkpoint tags, commit time, and `app.json` version alone are insufficient.

Catalog matching is fail-closed:

1. `serverCreatedAtMs` is the authoritative time boundary.
2. Client-authored `appVersion` and `clientCreatedAtMs` may only narrow candidates already consistent with the verified server-time window; they cannot override it.
3. Missing server time, forged/stale disagreement, duplicated version ambiguity, offline-delay ambiguity, gaps, and overlaps return `unmapped`.
4. Multiple plausible snapshots may return `consensus` only when the claimed achievement has identical reward, prerequisite semantics, and all relevant level thresholds in every candidate. Never select an arbitrary snapshot.
5. Exact subtraction may use `exact` or rule-identical `consensus`; any `unmapped` result makes catalog evidence incomplete.

Load client and server level formulas from the same verified commit, calculate every threshold from level 1 through `maxLevel`, and store the threshold array. Mark the snapshot incomplete if client/server arrays or maximum levels differ. Compare formulas by thresholds, not labels. Missing provenance leaves events unmapped; the audit may complete infrastructurally but must exit `2` for incomplete evidence and make no correction claim.

- [ ] **Step 4: Run GREEN and print metadata only**

```powershell
npx jest --runTestsByPath tests/xp_integrity_catalog_history.test.ts --runInBand --no-cache
npx tsx -e "import {loadVerifiedCatalogHistory} from './scripts/xp_integrity/catalog_history'; const x=loadVerifiedCatalogHistory(process.cwd()); console.log(JSON.stringify(x.map(v=>({commit:v.commit.slice(0,12),appVersion:v.appVersion,complete:v.complete,rewards:v.rewards.size})),null,2))"
```

Zero verified windows is allowed and must be reported rather than inferred.

- [ ] **Step 5: Commit**

```powershell
git add scripts/xp_integrity/catalog_history.ts tests/xp_integrity_catalog_history.test.ts
git commit -m "feat: map verified historical XP catalogs"
```

### Task 3: Implement exact, non-overlapping account analysis

**Files:**

- Create: `scripts/xp_integrity/analyze_account.ts`
- Create: `tests/xp_integrity_analyze_account.test.ts`

- [ ] **Step 1: Write classification tests RED**

Cover reconstructible lifetime and weekly XP, authoritative counter evidence present/missing, unknown rules/IDs, wrong reward overpayment, impossible and alias-replayed rewards, one event with multiple reasons, multiple distinct invalid events, migration pattern alone, two independent probable signals, exact migration, exact damage plus incomplete evidence, and mirror-only drift. Also test exact first-event baseline derivation, unknown pre-cutover baseline, a continuous before/after chain, discontinuity with an exact retained cutover baseline, tied/ambiguous timestamps, current XP versus final ledger state, and restore/migration markers that remain non-exact.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/xp_integrity_analyze_account.test.ts --runInBand --no-cache
```

- [ ] **Step 3: Implement fail-closed classification**

Wrong reward subtracts only:

```ts
const overpayment = Math.max(0, event.xpDelta - historicalReward.xp);
```

Alias replay is exact only with a proven merge edge/time, alias claim before merge, canonical claim after merge, exact canonical before/after totals, and identical mapped semantic achievement. The higher-XP merge winner does not add loser XP, so alias presence alone is never subtracted.

Build ledger continuity only from exact event before/after values plus `UserCutoverEvidence`. Tied timestamps or a broken chain make ledger evidence incomplete unless an independently retained cutover baseline resolves the ordering. A migration document or restore timestamp without retained before/after values is never exact migration evidence.

Use `PrerequisiteEvidence` for non-XP counters. Never promote a client payload counter to exact evidence. Lifetime/weekly evidence may be derived from exact server result fields; unsupported or missing prerequisite evidence remains unmapped.

Track invalid amounts once per canonical event:

```ts
const invalidByEvent = new Map<string, number>();
invalidByEvent.set(event.eventId, Math.max(invalidByEvent.get(event.eventId) ?? 0, provenInvalidAmount));
```

Any exact invalid amount yields `confirmed_damaged`. At least two independent non-exact anomaly families yield `probable_damaged`. One non-exact anomaly or relevant incomplete evidence yields `indeterminate`. No anomaly yields `consistent`.

Emit `proposedXp` only when the exact reduction is complete and relevant evidence is complete. Otherwise expose `exactInvalidXp` as a proven lower bound with `proposedXp: null`.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npx jest --runTestsByPath tests/xp_integrity_analyze_account.test.ts --runInBand --no-cache
git add scripts/xp_integrity/analyze_account.ts tests/xp_integrity_analyze_account.test.ts
git commit -m "feat: classify XP integrity evidence safely"
```

### Task 4: Implement atomic read budgets, pagination, and IAM read-only proof

**Files:**

- Create: `scripts/xp_integrity/read_budget.ts`
- Create: `scripts/xp_integrity/firestore_reader.ts`
- Create: `tests/xp_integrity_reader.test.ts`
- Update: `tests/xp_integrity_read_only_contract.test.ts`

- [ ] **Step 1: Write reader tests RED with mocked Firebase**

Test users and event pagination across three pages, reservation before query, invalid/over-reservation settlement rejection, unused reservation return, conservative failed-query accounting, empty-page minimum billing, concurrent budget safety, paginated count billing, canonical/hidden-alias reconciliation, mirror paths, interruption/partial pages, Firestore/Auth write-capable IAM rejection, unavailable IAM rejection, and verified read-only IAM success.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/xp_integrity_reader.test.ts tests/xp_integrity_read_only_contract.test.ts --runInBand --no-cache
```

- [ ] **Step 3: Implement atomic budget and page types**

```ts
export type UserPage = { users: readonly RawUser[]; nextAfterUid: string | null; done: boolean };
export type EventPage = { events: readonly NormalizedAuditEvent[]; nextAfterEventId: string | null; done: boolean };

export class ReadBudget {
  private reserved = 0;
  private consumed = 0;
  constructor(readonly maximum: number) {}
  reserve(count: number): (actual?: number) => void {
    if (!Number.isInteger(count) || count < 1 || this.consumed + this.reserved + count > this.maximum) {
      throw new Error('xp_audit_read_budget_exceeded');
    }
    this.reserved += count;
    let settled = false;
    return (actual = count) => {
      if (settled) throw new Error('xp_audit_budget_reservation_reused');
      if (!Number.isInteger(actual) || actual < 0 || actual > count) {
        throw new Error('xp_audit_invalid_billed_read_settlement');
      }
      settled = true;
      this.reserved -= count;
      this.consumed += actual;
    };
  }
  get count(): number { return this.consumed; }
}
```

On query failure settle the full reservation. For a successful Firestore page, settle `Math.max(1, returnedDocuments)` because an empty query still has a minimum charge. Check abort signals before reservation and after every page.

- [ ] **Step 4: Implement IAM preflight and the reader**

Public API:

```ts
export type XpAuditReader = {
  countUserDocuments(pageSize: number): Promise<number>;
  pageUsers(afterUid: string | null, limit: number): Promise<UserPage>;
  pageProgressEvents(uid: string, afterEventId: string | null, limit: number): Promise<EventPage>;
  readAliases(user: RawUser): Promise<readonly AliasEvidence[]>;
  readMirrors(user: RawUser): Promise<MirrorValues>;
  resolveControlEmail(email: string): Promise<string | null>;
  getReadCount(): number;
};
```

Before constructing it, call project `testIamPermissions` for:

```ts
const WRITE_PERMISSIONS = [
  'datastore.entities.create',
  'datastore.entities.update',
  'datastore.entities.delete',
  'firebaseauth.users.create',
  'firebaseauth.users.update',
  'firebaseauth.users.delete',
];
const REQUIRED_READ_PERMISSIONS = [
  'datastore.entities.get',
  'datastore.entities.list',
  'firebaseauth.users.get',
];
```

Abort with `xp_audit_principal_has_write_permissions` if any are returned. Abort with `xp_audit_cannot_prove_read_only_principal` when the check is unavailable, ambiguous, or required read permissions are absent. There is no override flag.

Only `firestore_reader.ts` imports Firebase Admin. It exposes no database object and contains no mutations. `countUserDocuments()` must use budgeted document-ID pagination rather than an unbounded aggregation query, so maximum cost is reserved before every page. Concurrency defaults to 4 and never fans out over the full population.

- [ ] **Step 5: Strengthen static defense-in-depth**

Use the TypeScript AST in the contract test to allow Firebase imports only in the reader, detect dot/bracket Firestore mutation calls without flagging `Set.add()`, and forbid Firebase Auth mutations `createUser`, `updateUser`, `deleteUser`, `deleteUsers`, `importUsers`, `setCustomUserClaims`, and `revokeRefreshTokens`. Verify IAM preflight precedes the first Firestore/Auth read and require later CLI unknown-flag rejection. IAM proof remains the primary runtime gate.

- [ ] **Step 6: Run GREEN and commit**

```powershell
npx jest --runTestsByPath tests/xp_integrity_reader.test.ts tests/xp_integrity_read_only_contract.test.ts --runInBand --no-cache
git add scripts/xp_integrity/read_budget.ts scripts/xp_integrity/firestore_reader.ts tests/xp_integrity_reader.test.ts tests/xp_integrity_read_only_contract.test.ts
git commit -m "feat: add IAM-gated XP audit reads"
```

### Task 5: Build aggregate reports and strict CLI

**Files:**

- Create: `scripts/xp_integrity/report.ts`
- Create: `scripts/audit_production_xp_integrity.ts`
- Create: `tests/xp_integrity_report.test.ts`
- Create: `tests/xp_integrity_cli.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write report and CLI tests RED**

Test privacy against obvious email/nickname/UID/auth UID/event ID fixtures; infrastructure/evidence separation; class and user-document reconciliation; exact-XP bucket totals; coverage dates; unknown/conflicting flags; full mode without budget; partial exit `1`; evidence-incomplete exit `2`; complete exit `0`; and identifier-free calibration booleans.

Use:

```ts
export type AggregateReport = {
  mode: 'sample' | 'full';
  startedAt: string;
  finishedAt: string;
  coverage: {
    infrastructureComplete: boolean;
    evidenceComplete: boolean;
    userDocumentsSeen: number;
    canonicalAccountsScanned: number;
    aliasDocumentsCovered: number;
    skippedAccounts: number;
    failedAccounts: number;
    earliestEventAt: string | null;
    latestEventAt: string | null;
  };
  readCount: number;
  classes: Record<IntegrityClass, number>;
  reasons: Partial<Record<ReasonCode, number>>;
  exactInvalidXpTotal: number;
  exactInvalidXpBuckets: Record<string, number>;
  projectionDriftUsers: number;
  calibration: {
    ran: boolean;
    resolved: boolean;
    matchedExpectedLevelNeighborhood: boolean | null;
    migrationIndicatorDetected: boolean | null;
    achievementIndicatorDetected: boolean | null;
  };
};
```

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/xp_integrity_report.test.ts tests/xp_integrity_cli.test.ts --runInBand --no-cache
```

- [ ] **Step 3: Implement aggregate-only reporting**

`report.ts` accepts only `AccountAuditResult[]` plus numeric/date coverage metadata, never raw users/events. Recursively reject email syntax, identity-key names, event IDs, and a private runtime denylist.

The Russian Markdown contains the literal heading `Находки и предложения` and says no Firestore writes or corrections occurred, shows separate coverage flags and cohort counts, labels exact invalid XP as a lower bound where needed, and requires separate authorization for correction.

- [ ] **Step 4: Implement strict CLI and accounting**

Allow only `--sample=1..250` (default 25), `--full`, `--max-reads=positive integer`, `--concurrency=1..8`, and `--project=project-id`. Reject unknown and forbidden flags, reject sample/full conflict, and require explicit budget for full mode.

Read control email only from `XP_AUDIT_CONTROL_EMAIL`; never print it. Count each user document exactly once as canonical, alias-covered, skipped, or failed. Hidden aliases are not class entries. Define `--sample=N` as N canonical accounts: continue paging past hidden alias documents until N canonical accounts are analyzed or the users collection ends. Paginate to `done`; interruption/partial page makes infrastructure incomplete.

Write only to:

```ts
const outputDir = path.join(root, '.codex-tmp', 'xp-integrity-audit', runId);
```

- [ ] **Step 5: Add package command and run all gates**

Add:

```json
"audit:production-xp-integrity": "tsx scripts/audit_production_xp_integrity.ts"
```

Run:

```powershell
npx jest --runTestsByPath tests/xp_integrity_catalog_history.test.ts tests/xp_integrity_analyze_account.test.ts tests/xp_integrity_reader.test.ts tests/xp_integrity_read_only_contract.test.ts tests/xp_integrity_report.test.ts tests/xp_integrity_cli.test.ts --runInBand --no-cache
npx tsc --noEmit --pretty false --skipLibCheck --esModuleInterop --module commonjs --moduleResolution node --target es2022 scripts/xp_integrity/types.ts scripts/xp_integrity/catalog_history.ts scripts/xp_integrity/analyze_account.ts scripts/xp_integrity/read_budget.ts scripts/xp_integrity/firestore_reader.ts scripts/xp_integrity/report.ts scripts/audit_production_xp_integrity.ts
```

Expected: 6 suites pass and all audit sources type-check.

- [ ] **Step 6: Commit**

```powershell
git add package.json scripts/audit_production_xp_integrity.ts scripts/xp_integrity/report.ts tests/xp_integrity_report.test.ts tests/xp_integrity_cli.test.ts
git commit -m "feat: add privacy-safe XP audit reports"
```

### Task 6: Run IAM preflight, private calibration, and bounded sample

**Files:** runtime output only under `.codex-tmp/xp-integrity-audit/`.

- [ ] **Step 1: Verify a read-only principal**

Run the CLI with `--sample=1 --max-reads=100`. It may print only project ID, mode, and `principal=read-only-verified`. If credentials have any write permission or proof cannot complete, stop; provisioning a read-only credential is external setup and cannot be bypassed.

- [ ] **Step 2: Run private control plus 25-account sample**

Set `XP_AUDIT_CONTROL_EMAIL` only in the process environment:

```powershell
npm run audit:production-xp-integrity -- --sample=25 --max-reads=5000 --concurrency=2
```

Expected: control resolves with current level near 8; calibration contains booleans only; actual stored events normalize without invented fields; no identifier reaches output; budget holds; no mutation call occurs.

- [ ] **Step 3: Enforce sample stop conditions**

Do not run full mode if IAM proof fails, control does not resolve, normalization is ambiguous, privacy fails, a known anomaly is called consistent, alias accounting does not reconcile, or projected reads exceed the approved budget.

- [ ] **Step 4: Re-run all 6 suites and type-check**

Use Task 5 commands. Expected: PASS.

### Task 7: Count documents, run full audit, and obtain final review

**Files:** runtime output only plus any code corrections required by sample evidence.

- [ ] **Step 1: Obtain bounded user-document count**

Call `countUserDocuments(250)` through the IAM-gated reader. It must count through budgeted document-ID pages, bill every page at `Math.max(1, returnedDocuments)`, and retain only the number.

- [ ] **Step 2: Calculate and review full budget**

```powershell
$budget = [Math]::Ceiling(($sampleReadCount / $sampleCanonicalAccounts) * $totalUserDocuments * 1.2)
```

Stop and report cost if unexpectedly high. Pass the numeric budget explicitly.

- [ ] **Step 3: Run full read-only audit**

```powershell
npm run audit:production-xp-integrity -- --full --max-reads=$budget --concurrency=4
```

Exit `0` means both coverages complete; `1` means infrastructure partial; `2` means infrastructure complete but evidence incomplete and no exact mass-correction claim is allowed.

- [ ] **Step 4: Validate final invariants and privacy**

Confirm no email/identity/event fields, class totals equal canonical accounts, all user documents reconcile, exact buckets sum to total, event coverage dates are present, calibration contains booleans only, IAM was verified before reads, and no write attempt occurred.

- [ ] **Step 5: Run final verification**

```powershell
npx jest --runTestsByPath tests/xp_integrity_catalog_history.test.ts tests/xp_integrity_analyze_account.test.ts tests/xp_integrity_reader.test.ts tests/xp_integrity_read_only_contract.test.ts tests/xp_integrity_report.test.ts tests/xp_integrity_cli.test.ts --runInBand --no-cache
npx tsc --noEmit --pretty false --skipLibCheck --esModuleInterop --module commonjs --moduleResolution node --target es2022 scripts/xp_integrity/types.ts scripts/xp_integrity/catalog_history.ts scripts/xp_integrity/analyze_account.ts scripts/xp_integrity/read_budget.ts scripts/xp_integrity/firestore_reader.ts scripts/xp_integrity/report.ts scripts/audit_production_xp_integrity.ts
git diff --check
git status --short
```

- [ ] **Step 6: Request final Advisor review**

Provide approved spec, actual diff, tests/type-check, IAM proof, aggregate report, read count, both coverage flags, and uncertainty. Completion requires `DECISION: APPROVED`; fix and resubmit after `CHANGES_REQUIRED`.

- [ ] **Step 7: Deliver Russian decision report**

Report whether exact mass correction is possible, privacy-safe cohort counts, proven excess XP, coverage dates/read count, and explicitly state that zero Firestore writes and zero corrections occurred. End with `Находки и предложения`.
