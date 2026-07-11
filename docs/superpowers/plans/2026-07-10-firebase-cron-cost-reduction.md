# Firebase Cron Cost Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the unused Constellations scheduler, make account-deletion retry scanning cheap without weakening deletion execution, and reduce idle administrative push recovery runs.

**Architecture:** Remove only the scheduled Constellations export while preserving its event trigger and implementation. Split account-deletion retry dispatch from heavy execution: the small cron only touches due job documents, causing the existing 1 GiB Firestore worker to claim and execute them. Keep immediate admin push handling and make only its recovery scheduler less frequent.

**Tech Stack:** TypeScript, Firebase Functions v2, Cloud Scheduler, Firestore triggers, Jest, Firebase CLI.

---

## File map and workspace constraint

- Modify `tests/firebase_cost_controls_contract.test.ts`: deployment and schedule contracts.
- Modify `functions/src/account_delete_worker.test.ts`: retry dispatch and resource contracts.
- Modify `functions/src/account_delete_worker.ts`: lightweight retry wake-up plus unchanged heavy worker.
- Modify `functions/src/admin_push_jobs.ts`: six-hour recovery schedule.
- Modify `functions/src/index.ts`: remove only the scheduled Constellations export.
- Modify `functions/package.json`: remove `constellationCron` from `deploy:safe`.
- Do not manually edit `functions/lib/**`; `npm run build` regenerates it.

These files already contain unrelated working-tree edits. Inspect the local diff before every patch, change only named lines, and do not stage whole overlapping files. Implementation commits are optional in this dirty workspace and must never absorb unrelated work.

### Task 1: Add failing cost-control contracts

**Files:**
- Modify: `tests/firebase_cost_controls_contract.test.ts`

- [ ] **Step 1: Update the admin push schedule assertion**

In the existing background cost test replace the old assertions with:

```ts
expect(adminPushSource).toContain("schedule: 'every 6 hours'");
expect(adminPushSource).not.toContain("schedule: '*/30 * * * *'");
```

- [ ] **Step 2: Add the dormant Constellations deployment contract**

```ts
it('does not deploy the dormant Constellations minute cron', () => {
  const indexSource = read('functions/src/index.ts');
  const packageJson = read('functions/package.json');

  expect(indexSource).not.toContain('export const constellationCron');
  expect(packageJson).not.toContain('functions:constellationCron');
  expect(indexSource).toContain('onConstellationQueueWrite');
  expect(indexSource).toContain('constellationSubmitAction');
});
```

- [ ] **Step 3: Verify RED**

Run from the repository root:

```powershell
npx jest tests/firebase_cost_controls_contract.test.ts --runInBand
```

Expected: FAIL because the 30-minute push schedule and `constellationCron` still exist.

### Task 2: Add failing account-deletion dispatch contracts

**Files:**
- Modify: `functions/src/account_delete_worker.test.ts`

- [ ] **Step 1: Require the lightweight cron and unchanged worker**

```ts
it('uses a lightweight retry dispatcher and preserves the heavy worker', () => {
  expect(ACCOUNT_DELETE_RETRY_OPTIONS).toMatchObject({
    schedule: 'every 30 minutes',
    region: 'us-central1',
    retryCount: 3,
    timeoutSeconds: 60,
    memory: '256MiB',
  });
  expect(ACCOUNT_DELETE_WORKER_OPTIONS).toMatchObject({
    retry: true,
    timeoutSeconds: 540,
    memory: '1GiB',
  });
  expect(accountDeleteWorker).toBeDefined();
  expect(accountDeleteRetryCron).toBeDefined();
});
```

- [ ] **Step 2: Require wake-up writes instead of synchronous deletion**

Replace the existing sweep test with fixtures for due, stranded, expired-job, and expired-tombstone documents. Mock `db.batch()` with `set`, `delete`, and `commit` spies. Call `sweepAccountDeletionJobs(db, 10_000)` and assert:

```ts
expect(batchSet).toHaveBeenCalledWith(dueRef, expect.objectContaining({
  retryRequestedAtMs: 10_000,
  updatedAtMs: 10_000,
}), { merge: true });
expect(batchSet).toHaveBeenCalledWith(strandedRef, expect.objectContaining({
  retryRequestedAtMs: 10_000,
  updatedAtMs: 10_000,
}), { merge: true });
expect(batchDelete).toHaveBeenCalledWith(expiredJobRef);
expect(batchDelete).toHaveBeenCalledWith(expiredTombstoneRef);
expect(batchCommit).toHaveBeenCalledTimes(1);
```

Build the mock as:

```ts
const batchSet = jest.fn();
const batchDelete = jest.fn();
const batchCommit = jest.fn(async () => undefined);
const dueRef = { path: 'account_deletion_jobs/due' };
const strandedRef = { path: 'account_deletion_jobs/stranded' };
const expiredJobRef = { path: 'account_deletion_jobs/expired' };
const expiredTombstoneRef = { path: 'account_deletion_tombstones/expired' };
const docsFor = (collection: string, field: string) => {
  if (collection === 'account_deletion_tombstones') {
    return [{ id: 'expired-tombstone', ref: expiredTombstoneRef }];
  }
  if (field === 'nextAttemptAtMs') return [{ id: 'due', ref: dueRef }];
  if (field === 'leaseUntilMs') return [{ id: 'stranded', ref: strandedRef }];
  return [{ id: 'expired-job', ref: expiredJobRef }];
};
const db = {
  collection: (collection: string) => ({
    where: (field: string) => ({
      limit: () => ({
        get: async () => {
          const docs = docsFor(collection, field);
          return { docs, size: docs.length };
        },
      }),
    }),
  }),
  batch: () => ({ set: batchSet, delete: batchDelete, commit: batchCommit }),
} as unknown as FirebaseFirestore.Firestore;
```

Do not expect changes to `status`, `attempts`, `leaseUntilMs`, or `nextAttemptAtMs`: only `processAccountDeletionJob` owns claim and backoff state. Add a case where the same reference appears in both due and stranded results and verify `batchSet` receives that reference once.

- [ ] **Step 3: Verify RED**

Run from `functions/`:

```powershell
npx jest src/account_delete_worker.test.ts --runInBand
```

Expected: FAIL because the old cron is five minutes/1 GiB/540 seconds and executes deletion synchronously.

### Task 3: Implement lightweight account-deletion wake-up

**Files:**
- Modify: `functions/src/account_delete_worker.ts`

- [ ] **Step 1: Change only retry-cron resources**

```ts
export const ACCOUNT_DELETE_RETRY_OPTIONS = {
  schedule: 'every 30 minutes',
  region: 'us-central1',
  retryCount: 3,
  timeoutSeconds: 60,
  memory: '256MiB' as const,
} as const;
```

Keep `ACCOUNT_DELETE_WORKER_OPTIONS` at retry enabled, 1 GiB, and 540 seconds.

- [ ] **Step 2: Replace synchronous processing with deduplicated wake-up writes**

Keep all four bounded queries. Remove the injected `process` argument and the call to `processAccountDeletionJob` inside the sweep. Use:

```ts
const recoverable = new Map<string, FirebaseFirestore.DocumentReference>();
for (const doc of [...due.docs, ...stranded.docs]) recoverable.set(doc.id, doc.ref);

const batch = db.batch();
for (const ref of recoverable.values()) {
  batch.set(ref, {
    retryRequestedAtMs: nowMs,
    updatedAtMs: nowMs,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}
for (const doc of expired.docs) batch.delete(doc.ref);
for (const doc of expiredTombstones.docs) batch.delete(doc.ref);
if (recoverable.size + expired.size + expiredTombstones.size > 0) await batch.commit();
```

The maximum is 140 batch operations, below Firestore's 500-operation limit. The merge write triggers `accountDeleteWorker`, whose transaction decides whether the job is truly due and performs heavy deletion. Do not mutate claim, lease, attempts, or backoff fields in the scanner.

- [ ] **Step 3: Verify GREEN**

Run from `functions/`:

```powershell
npx jest src/account_delete_worker.test.ts --runInBand
```

Expected: PASS.

### Task 4: Slow push recovery and remove the dormant scheduler

**Files:**
- Modify: `functions/src/admin_push_jobs.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/package.json`

- [ ] **Step 1: Change only the push schedule**

Use Firebase's existing natural-language scheduler form:

```ts
{ region: REGION, schedule: 'every 6 hours', timeZone: 'UTC', timeoutSeconds: 540, memory: '512MiB' }
```

Keep `adminPushJobCreated` and `processAdminPushJob` unchanged.

- [ ] **Step 2: Remove only `constellationCron`**

Delete the `export const constellationCron = functions.scheduler.onSchedule(...)` block from `functions/src/index.ts`. If `constellationQueueCron` becomes an unused import, remove only that imported name. Preserve `onConstellationQueueWrite`, queue implementation, watchdog code, callables, UI, configuration, and data.

- [ ] **Step 3: Remove only `functions:constellationCron` from `deploy:safe`**

Do not reformat the long script or modify adjacent function names.

- [ ] **Step 4: Verify the cost contracts are GREEN**

```powershell
npx jest tests/firebase_cost_controls_contract.test.ts --runInBand
```

Expected: PASS.

### Task 5: Focused regression and build verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused account-deletion tests**

From `functions/`:

```powershell
npx jest src/account_delete_worker.test.ts src/account_delete_job.test.ts src/account_delete.test.ts --runInBand
```

Expected: all selected suites PASS.

- [ ] **Step 2: Run admin push tests**

```powershell
npx jest src/admin_push_jobs.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 3: Build Functions**

```powershell
npm run build
```

Expected: TypeScript exits 0. Do not treat unrelated generated drift as part of this task.

- [ ] **Step 4: Inspect exact source diffs**

```powershell
git diff --check -- functions/src/account_delete_worker.ts functions/src/account_delete_worker.test.ts functions/src/admin_push_jobs.ts functions/src/index.ts functions/package.json tests/firebase_cost_controls_contract.test.ts
git diff -- functions/src/account_delete_worker.ts functions/src/account_delete_worker.test.ts functions/src/admin_push_jobs.ts functions/src/index.ts functions/package.json tests/firebase_cost_controls_contract.test.ts
```

Expected: no whitespace errors and every new hunk belongs to this design. Separate pre-existing edits before staging anything.

### Task 6: Advisor review gate

**Files:**
- Review final diff and evidence.

- [ ] **Step 1: Submit the exact final diff, tests, build result, and proposed production commands to Advisor.**
- [ ] **Step 2: If changes are required, add a failing regression test first, apply the minimal correction, and repeat Task 5.**
- [ ] **Step 3: Deploy only after `DECISION: APPROVED`.**

### Task 7: Narrow production rollout

**Files:**
- Production configuration only.

- [ ] **Step 1: Confirm project and run the deployment lock guard**

```powershell
npx firebase-tools use
node scripts/deploy_lock_guard.mjs
```

Expected project: `phraseman-ea0b3`; guard exits 0. Do not bypass a lock.

- [ ] **Step 2: Deploy only the two updated live functions**

From `functions/`:

```powershell
npx firebase-tools deploy --project phraseman-ea0b3 --only "functions:accountDeleteRetryCron,functions:adminPushJobsCron"
```

Do not use the broad `deploy` or `deploy:safe` scripts.

- [ ] **Step 3: Verify the deletion target, then remove the old scheduler**

Use a safe parsed `functions:list --json` check that prints only function ID, project, region, memory, and timeout. Confirm exactly `phraseman-ea0b3/us-central1/constellationCron`, then run:

```powershell
npx firebase-tools functions:delete constellationCron --region us-central1 --project phraseman-ea0b3 --force
```

This explicit deletion is necessary; removing the source export alone does not stop the deployed scheduler.

- [ ] **Step 4: Verify safe production fields only**

Assert from parsed output without printing environment variables:

- `constellationCron` is absent;
- `accountDeleteRetryCron` is 256 MiB/60 seconds;
- `accountDeleteWorker` remains active at 1 GiB/540 seconds;
- `adminPushJobsCron` remains 512 MiB/540 seconds;
- `adminPushJobCreated` remains active.

Check the first scheduled executions for retry/error storms. Do not manually invoke production functions.

- [ ] **Step 5: Measure after 24 hours**

Compare Cloud Functions billed duration/invocations and Firestore operations by SKU. Do not claim monetary savings before billing data arrives. Invalid App Check callable traffic remains a separate unresolved cost source.

## Rollback

- Account deletion: restore five minutes/1 GiB/540 seconds and synchronous processing, then deploy only `accountDeleteRetryCron`.
- Push recovery: restore `*/30 * * * *`, then deploy only `adminPushJobsCron`.
- Constellations launch: restore and deploy only `constellationCron` after validating its cost controls.
