# Durable Account-Deletion Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee that an authenticated deletion request is durably accepted before provider sign-out while preserving immediate local exit and legacy-client compatibility.

**Architecture:** Add an authenticated `accountDeleteEnqueue` callable that writes an idempotent Admin-only job, and a retryable Firestore worker that runs the existing deletion stages from stored trusted identifiers. The client waits only for a bounded enqueue acknowledgement, then signs out and wipes locally; pending-provider login retries the same enqueue before signing out.

**Tech Stack:** React Native/TypeScript, Firebase Auth, Firestore Admin SDK, Firebase Functions v2 callable and Firestore triggers, Jest/ts-jest.

---

### Task 1: Preserve and prove the baseline

**Files:**
- Verify: `app/auth_provider.ts`
- Verify: `app/cloud_sync.ts`
- Verify: `functions/src/account_delete.ts`
- Verify: `tests/account_delete_flow_contract.test.ts`

- [ ] **Step 1: Record the exact inherited diff**

Run:

```powershell
git status --short
git diff --stat -- app/auth_provider.ts app/cloud_sync.ts functions/src/index.ts tests/auth_provider_stable_link.test.ts
```

Expected: only the previously approved auth baseline is modified among Phase 1 runtime files.

- [ ] **Step 2: Run root baseline guards**

```powershell
npx jest tests/auth_provider_stable_link.test.ts tests/account_delete_flow_contract.test.ts tests/firestore_rules_security.test.ts tests/stable_id.test.ts tests/auth_identity_anon_relink.test.ts --runInBand --silent
```

Expected: 96 tests pass.

- [ ] **Step 3: Run Functions baseline guards**

```powershell
cd functions
npx jest src/auth_identity.test.ts src/auth_merge.test.ts src/account_delete.test.ts --runInBand --silent
```

Expected: 72 tests pass in the isolated baseline.

### Task 2: Define server enqueue and job behavior with failing tests

**Files:**
- Create: `functions/src/account_delete_job.test.ts`
- Create: `functions/src/account_delete_job.ts`
- Modify: `functions/src/account_delete.ts`

- [ ] **Step 1: Write failing tests for deterministic enqueue**

The tests must assert:

```ts
expect(accountDeleteJobId('auth-456')).toBe(accountDeleteJobId('auth-456'));
expect(accountDeleteJobId('auth-456')).not.toContain('auth-456');

const first = await enqueueAccountDeletionJob(db, 'auth-456', 'stable-123', 1000);
const duplicate = await enqueueAccountDeletionJob(db, 'auth-456', 'stable-123', 2000);
expect(duplicate.jobId).toBe(first.jobId);
expect(duplicate.created).toBe(false);
expect(stored.status).toBe('queued');
```

Also cover a mismatched stable UID and a completed duplicate.

- [ ] **Step 2: Verify RED**

```powershell
npx jest src/account_delete_job.test.ts --runInBand
```

Expected: FAIL because `account_delete_job` does not exist.

- [ ] **Step 3: Implement the minimal job module**

Create `account_delete_job.ts` with these public boundaries:

```ts
export const ACCOUNT_DELETE_JOBS = 'account_deletion_jobs';
export type AccountDeleteJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export function accountDeleteJobId(authUid: string): string;

export async function enqueueAccountDeletionJob(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  stableUid: string,
  nowMs?: number,
): Promise<{ jobId: string; status: AccountDeleteJobStatus; created: boolean }>;
```

Use SHA-256 for the deterministic document ID and a Firestore transaction with `create` semantics. Store trusted `authUid`/`stableUid` only in the Admin-only collection, plus hashed diagnostic IDs, `status`, `attempts`, and timestamps. Never store email.

- [ ] **Step 4: Verify GREEN**

```powershell
npx jest src/account_delete_job.test.ts --runInBand
```

Expected: PASS.

### Task 3: Extract the idempotent deletion executor and add the worker

**Files:**
- Modify: `functions/src/account_delete.ts`
- Modify: `functions/src/account_delete_job.ts`
- Modify: `functions/src/account_delete_job.test.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Write failing worker tests**

Use a deferred executor and an in-memory job stub to prove:

```ts
await processAccountDeletionJob(db, 'job-1', execute);
expect(execute).toHaveBeenCalledWith('stable-123', 'auth-456');
expect(job.status).toBe('completed');

await expect(processAccountDeletionJob(db, 'job-1', failingExecute)).rejects.toThrow('boom');
expect(job.status).toBe('queued');
expect(job.attempts).toBe(1);

await processAccountDeletionJob(db, 'job-1', execute);
expect(execute).toHaveBeenCalledTimes(1);
```

Also assert that `running` with a live lease and `completed` do not execute again.

- [ ] **Step 2: Verify RED**

```powershell
npx jest src/account_delete_job.test.ts --runInBand
```

Expected: FAIL because worker processing is missing.

- [ ] **Step 3: Extract the existing deletion body**

Expose this server-only function from `account_delete.ts`:

```ts
export async function executeAccountDeletion(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string,
): Promise<DeleteStats>;
```

`accountDeleteMine` continues resolving the authenticated stable UID, then delegates to this function. Do not remove or rename the legacy callable.

- [ ] **Step 4: Implement worker claiming and retries**

Add:

```ts
export async function processAccountDeletionJob(
  db: FirebaseFirestore.Firestore,
  jobId: string,
  execute?: typeof executeAccountDeletion,
): Promise<void>;

export const accountDeleteWorker = onDocumentWritten(
  {
    document: `${ACCOUNT_DELETE_JOBS}/{jobId}`,
    region: 'us-central1',
    retry: true,
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (event) => processAccountDeletionJob(admin.firestore(), event.params.jobId),
);
```

Claim through a transaction, increment attempts, set a lease, and fail closed. On executor failure return the job to `queued`, record a bounded error, and rethrow so the platform retry remains active. Treat deletion operations and `auth/user-not-found` as idempotent.

- [ ] **Step 5: Export new Functions**

Add `accountDeleteEnqueue` and `accountDeleteWorker` to `functions/src/index.ts` while preserving `accountDeleteMine`.

- [ ] **Step 6: Verify Functions GREEN**

```powershell
npx jest src/account_delete_job.test.ts src/account_delete.test.ts --runInBand
npm run build
```

Expected: tests and TypeScript build pass.

### Task 4: Add the authenticated enqueue callable

**Files:**
- Modify: `functions/src/account_delete.ts`
- Modify: `functions/src/account_delete.test.ts`
- Modify: `functions/src/account_delete_job.test.ts`

- [ ] **Step 1: Write a failing callable/helper test**

Prove that enqueue resolves the stable UID using server state and returns only job metadata:

```ts
const result = await enqueueForAuthenticatedAccount(db, 'auth-456', 'stable-123');
expect(result).toMatchObject({ ok: true, status: 'queued' });
expect(result).not.toHaveProperty('authUid');
expect(result).not.toHaveProperty('stableUid');
```

- [ ] **Step 2: Verify RED**

```powershell
npx jest src/account_delete.test.ts src/account_delete_job.test.ts --runInBand
```

Expected: FAIL because the enqueue helper/callable is missing.

- [ ] **Step 3: Implement callable with sensitive App Check**

```ts
export const accountDeleteEnqueue = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 80,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    return enqueueForAuthenticatedAccount(
      admin.firestore(),
      request.auth.uid,
      request.data?.stableId,
    );
  },
);
```

The helper must call the existing `resolveStableUidForDelete` before enqueueing. Never trust the client stable ID directly.

- [ ] **Step 4: Verify GREEN**

Run the Phase 1 Functions suite and build again.

### Task 5: Move the client to bounded enqueue-before-sign-out

**Files:**
- Modify: `app/account_delete_timeout.ts`
- Modify: `app/cloud_sync.ts`
- Modify: `app/auth_provider.ts`
- Modify: `tests/account_delete_flow_contract.test.ts`
- Modify: `tests/auth_provider_stable_link.test.ts`

- [ ] **Step 1: Write failing client contract tests**

Assert the new ordering:

```ts
expect(enqueueCall).toBeGreaterThan(captureStableId);
expect(enqueueCall).toBeLessThan(signOut);
expect(signOut).toBeLessThan(localWipe);
expect(sourceAfterSignOut).not.toContain('await enqueueCloudDeletion');
```

For pending-provider login assert `enqueueCloudDeletion(pendingDelete.stableId)` occurs before `signOutCurrentProvider()` and before any `auth_links` lookup.

- [ ] **Step 2: Verify RED**

```powershell
npx jest tests/account_delete_flow_contract.test.ts tests/auth_provider_stable_link.test.ts --runInBand
```

Expected: FAIL on the old background `deleteCloudData()` ordering.

- [ ] **Step 3: Add the bounded enqueue client**

Add `ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS = 8_000`. Implement:

```ts
export async function enqueueCloudDeletion(stableId: string | null): Promise<{
  ok: true;
  jobId: string;
  status: 'queued' | 'running' | 'completed';
}>;
```

It may warm App Check, but the caller awaits it before sign-out. It must not call `ensureAnonUser()` or re-resolve the canonical ID. Keep `deleteCloudData()` and the legacy server callable available for compatibility, but stop using it in the new deletion flow.

- [ ] **Step 4: Change local deletion flow**

Capture provider UID and stable ID, then await the enqueue with the short bound. Whether enqueue succeeds or fails, continue to sign-out and wipe. Write the pending-deletion lock after local storage clearing. Do not clear the lock merely because enqueue acknowledged; the worker has not necessarily completed.

- [ ] **Step 5: Retry pending deletion on same-provider login**

Immediately after Firebase credential completion and pending-lock read, retry enqueue with the stored stable ID while provider auth is still current. Then sign out, best-effort create anonymous auth, and return `account_delete_pending`. Do not read or mutate `auth_links` on this path.

- [ ] **Step 6: Verify GREEN**

Run the two focused client tests, then all five mandated auth guards.

### Task 6: Phase gate and advisor review

**Files:** all Phase 1 files.

- [ ] **Step 1: Run verification**

```powershell
npx jest tests/auth_provider_stable_link.test.ts tests/account_delete_flow_contract.test.ts tests/firestore_rules_security.test.ts tests/stable_id.test.ts tests/auth_identity_anon_relink.test.ts --runInBand --silent
cd functions
npx jest src/account_delete_job.test.ts src/account_delete.test.ts src/auth_identity.test.ts src/auth_merge.test.ts --runInBand --silent
npm run build
git diff --check
```

- [ ] **Step 2: Inspect security boundaries**

Confirm no client rules allow `account_deletion_jobs`, no raw email is stored, `auth_links` remains server-owned, legacy callable remains exported, and the new client cannot dispatch after sign-out.

- [ ] **Step 3: Submit exact diff and evidence to advisor**

Proceed to Phase 2 only after `DECISION: APPROVED`.

## Plan Self-Review

- The plan preserves the immediate-local-exit invariant while adding only a bounded enqueue acknowledgement.
- Old clients retain `accountDeleteMine`; new clients use `accountDeleteEnqueue`.
- Server stable identity is resolved before a job is written.
- Job processing is idempotent and retryable; no client access to job documents is required.
- Parser, restore, tab visibility, and startup work are intentionally excluded from Phase 1.
