# Post-Deletion Fresh Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee that account deletion opens the normal onboarding immediately after the local wipe and converges to a verified, unrelated anonymous Firebase/stable identity without ever reusing or writing through a retired identity.

**Architecture:** Preserve server tombstones and permanent denials, add an immutable server-side identity closure to each deletion job, and model client recovery as one durable monotonic state machine. All cloud mutations use a typed readiness gate; a server `identity_retired` response starts or resumes the state machine, while onboarding remains local and non-blocking.

**Owner clarification (2026-08-28):** The same external Google or Apple credential must create the new empty profile in one sign-in attempt, with no second picker. Preserve structured `identity_retired` details. For `details.subject === 'stable'`, the current provider Firebase UID has passed server auth retirement checks and may remain signed in: synthesize a durable `source: 'remote'` transition, wipe old local data, clear the retired stable ID, create a fresh stable ID, authoritatively link that exact pair, and return `created_new` with the current provider email/display name. Do not enqueue deletion or denial for that fresh provider UID. For `subject: 'auth' | 'closure' | unknown`, fail closed through provider sign-out and a fresh anonymous pair. Every identifier in the deleted closure remains denied, and no old data, progress, name, entitlement, avatar, or aura is restored. Remove the user-facing email/code recovery entry: live profiles restore through ordinary provider sign-in; deleted profiles start empty.

**Local first-tap safety clarification (2026-08-28):** The fast UI handoff still never awaits network. The first later provider tap joins the in-flight deletion before opening Google/Apple, waits for an authoritative `credential_safe` receipt, and then continues in that same call with exactly one picker. The enqueue transaction writes closure/tombstones/permanent denials and a `closure_committed` receipt; the server deletes the old Auth UID (`user-not-found` is idempotent success) before advancing the receipt to `credential_safe`. Response loss is repaired by a minimal unauthenticated status callable using an operation ID plus a SecureStore-only high-entropy capability. App Check remains explicitly disabled per the owner seal; constant-time hash comparison, fixed TTL, bounded retry windows, minimal responses, Firestore Rules deny, and Jarvis isolation are mandatory. No receipt proof means no picker and no guard clearance.

**Security hardening clarification (2026-08-28):** `local_data_cleared` requires strict readback after `wipeLocalAccountData`, `AsyncStorage.clear`, and phone-state SQLCipher lineage retirement; read failure, partial residue, timeout, or thrown cleanup keeps `prepared`, emits no deletion-ready event, starts no cloud/fresh generation, and exposes no ordinary onboarding. Server closure is two-phase: atomically fence the root auth/stable IDs, discover the complete alias closure under denial-guarded merge/recovery contracts, then atomically persist sorted `identityClosure`/hash/version/cutoff, every member denial, the worker job, and `closure_committed`. The worker consumes exactly the frozen array and never re-resolves the mutable merge graph. `account_deletion_jobs` and receipt documents remain server-only in Rules and explicitly isolated from Jarvis metrics.

**Writer/TOCTOU clarification (2026-08-28):** Before destructive local clearing, invalidate the old generation and require bounded successful drains of premium, restore, and cloud work. Register phone-state retirement, outbox cleanup, local DB wipe, AsyncStorage clear/mirror/readback as one operation-scoped flight; UI timeout stays `prepared`, and retry joins the same flight so late cleanup cannot touch a new generation. Bound the forward-only `local_data_cleared` CAS. For server deletion, never recursively delete mutable identity-index documents from stale query snapshots: transactionally reread `auth_links`, `name_index`, and `friend_code_index`, and delete only if their current stable owner remains in the frozen closure.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript 5.9, React Native Firebase Auth/Functions/Firestore, Expo SecureStore, AsyncStorage, Firebase Functions v2, Firestore transactions/rules, Jest/ts-jest, Firebase Emulator Suite.

---

## Scope and workspace rules

- Work in the current checkout. Do not create a branch or worktree without a new explicit owner instruction.
- The checkout is dirty. Before every commit run `git diff --cached --name-only`; commit only the files named by the current task and preserve all unrelated changes.
- Do not deploy Functions, Firestore Rules, Hosting, an EAS update, or a store build as part of implementation. Release is a separate owner-authorized action.
- Do not enable admin App Check.
- Do not weaken tombstones, permanent denials, ownership checks, or Firestore Rules to make a test pass.
- Implement each task red → green → focused regression → isolated commit.

## File map

### Server identity and deletion

- Modify `functions/src/auth_identity.ts`: emit structured retired-identity failures.
- Modify `functions/src/auth_identity.test.ts`: prove retired identities return the structured server failure.
- Modify `tests/auth_identity_anon_relink.test.ts`: guard the wiring and prove retired orphan links cannot relink.
- Modify `functions/src/account_delete.ts`: resolve the complete proved deletion identity closure.
- Modify `functions/src/account_delete.test.ts`: replace silent stable-ID substitution expectations with closure/ownership expectations.
- Modify `functions/src/account_delete_job.ts`: persist immutable closure and denials atomically; pass closure to the worker.
- Modify `functions/src/account_delete_job.test.ts`: cover closure idempotency and legacy compatibility.
- Modify `functions/src/account_delete_worker.ts`: execute and retain closure-aware jobs; preserve failed-job denial/retry state.
- Modify `functions/src/account_delete_worker.test.ts`: align retention tests with the permanent-denial policy.
- Modify `functions/src/admin_account_delete.ts` and `functions/src/admin_account_delete.test.ts`: use the closure-aware enqueue API.
- Modify `firestore.rules` and `tests/firestore_rules_security.test.ts`: keep deletion jobs and closure data server-only.

### Client transition and cloud gate

- Modify `app/account_delete_quarantine.ts`: store monotonic post-deletion phases and fresh-identity proofs.
- Modify `tests/account_delete_quarantine_authority.test.ts` and `tests/account_delete_quarantine_behavior.test.ts`: migration, monotonicity, crash recovery.
- Modify `app/cloud_sync.ts`: typed `identity_retired`, strict anonymous-auth proof, authoritative mutation gate.
- Modify `tests/cloud_sync_identity_anchor.test.ts` and `tests/startup_cloud_identity_recovery.test.ts`: classifier and auth proof behavior.
- Modify `app/auth_provider.ts`: own `ensureFreshPostDeletionIdentity()` and route deletion/resume through it.
- Modify `tests/auth_provider_behavior.test.ts`, `tests/auth_provider_stable_link.test.ts`, and `tests/account_delete_flow_contract.test.ts`: state-machine and provider-blocking behavior.
- Modify `app/events.ts` and `app/_layout.tsx`: resume on boot/foreground and react to retired-identity events.
- Create `tests/post_delete_fresh_identity_integration.test.ts`: end-to-end client state-machine behavior.

### Nickname and remaining consumers

- Modify `app/firestore_leaderboard.ts`: return typed pending-identity results and use the common gate.
- Modify `app/nickname_guard.ts`: persist account-generation-bound pending nickname intent.
- Modify `components/account/NicknameEditModal.tsx`: never present identity transition as a network error.
- Modify `tests/nickname_guard_reconcile.test.ts` and `tests/nickname_edit_modal_availability.test.tsx`: pending/resume/taken behavior.
- Modify current direct mutation consumers listed in Task 8.
- Create `scripts/guard_cloud_identity_gate.mjs` and `tests/cloud_identity_gate_contract.test.ts`: stop new low-level callers.
- Create `docs/auth/POST_DELETE_FRESH_IDENTITY_RELEASE_CHECKLIST.md`: physical-device and release evidence checklist.

### Task 1: Structured retired-identity contract

**Files:**
- Modify: `functions/src/auth_identity.ts`
- Modify: `functions/src/auth_identity.test.ts`
- Modify: `tests/auth_identity_anon_relink.test.ts`
- Modify: `app/cloud_sync.ts`
- Modify: `tests/cloud_sync_identity_anchor.test.ts`

- [ ] **Step 1: Write failing server tests for structured retirement**

In `functions/src/auth_identity.test.ts`, add assertions that both auth-marker and stable tombstone/permanent-denial paths throw:

```ts
await expect(run()).rejects.toMatchObject({
  code: 'failed-precondition',
  message: 'identity_retired',
  details: {
    subject: 'stable',
    recovery: 'create_fresh_anonymous',
  },
});
```

Add the corresponding `subject: 'auth'` expectation for a denied Firebase UID. Assert that no raw auth/stable UID appears in `details`. In `tests/auth_identity_anon_relink.test.ts`, replace any expectation that a deleted orphan link may be silently reused with source assertions for `throwIdentityRetired` before relink repair.

On the successful path, assert `authEnsureStableLink` returns `identityReady: true` only after the transaction has ensured both the exact `auth_links/{authUid}.stable_id` pair and the corresponding `users/{stableUid}` identity document.

- [ ] **Step 2: Run the server test and verify RED**

Run:

```bash
npm --prefix functions test -- --runTestsByPath src/auth_identity.test.ts --runInBand
npx jest --runTestsByPath tests/auth_identity_anon_relink.test.ts --no-cache --runInBand
```

Expected: FAIL because the server still throws `account_delete_pending` without structured details.

- [ ] **Step 3: Add one server error helper and route all deletion assertions through it**

Add near the deletion assertion helpers in `functions/src/auth_identity.ts`:

```ts
type RetiredIdentitySubject = 'auth' | 'stable' | 'closure';

function throwIdentityRetired(subject: RetiredIdentitySubject): never {
  throw new HttpsError('failed-precondition', 'identity_retired', {
    subject,
    recovery: 'create_fresh_anonymous',
  });
}
```

Replace every deletion-marker/tombstone/permanent-denial `account_delete_pending` throw in identity selection/linking with `throwIdentityRetired(...)`. Do not replace `stable_id_mismatch`; it represents ownership mismatch, not retirement.

Extend the successful callable response without removing existing fields:

```ts
return {
  ok: true,
  stableUid,
  authUid,
  identityReady: true,
};
```

- [ ] **Step 4: Write the failing client classifier test**

In `tests/cloud_sync_identity_anchor.test.ts`, assert both the new and compatibility message classify as retirement:

```ts
expect(classifyCloudAccessFailure(
  { code: 'functions/failed-precondition', message: 'identity_retired' },
  true,
)).toBe('identity_retired');

expect(classifyCloudAccessFailure(
  { code: 'functions/failed-precondition', message: 'account_delete_pending' },
  true,
)).toBe('identity_retired');
```

- [ ] **Step 5: Preserve retirement in the client failure taxonomy**

Change the client union and classifier in `app/cloud_sync.ts`:

```ts
export type StableAuthLinkFailure =
  | CloudAccessFailureReason
  | 'stable_id_mismatch'
  | 'identity_retired';

if (
  combined.includes('identity_retired')
  || combined.includes('account_delete_pending')
) return 'identity_retired';
```

Keep this branch before generic `failed-precondition`/identity fallback logic.

Extend the `authEnsureStableLink` response type with `identityReady: boolean` and require `res.data.identityReady === true` in the `ok` calculation. A missing flag from an older Function deployment remains `identity_unavailable`; it must not open the new authoritative gate.

- [ ] **Step 6: Run focused tests and commit**

Run:

```bash
npm --prefix functions test -- --runTestsByPath src/auth_identity.test.ts --runInBand
npx jest --runTestsByPath tests/auth_identity_anon_relink.test.ts --no-cache --runInBand
npx jest --runTestsByPath tests/cloud_sync_identity_anchor.test.ts --no-cache --runInBand
```

Expected: both suites PASS.

Commit only these four files:

```bash
git add functions/src/auth_identity.ts functions/src/auth_identity.test.ts tests/auth_identity_anon_relink.test.ts app/cloud_sync.ts tests/cloud_sync_identity_anchor.test.ts
git commit --only -m "fix(auth): expose retired identity recovery state" -- functions/src/auth_identity.ts functions/src/auth_identity.test.ts tests/auth_identity_anon_relink.test.ts app/cloud_sync.ts tests/cloud_sync_identity_anchor.test.ts
```

### Task 2: Immutable complete deletion identity closure

**Files:**
- Modify: `functions/src/account_delete.ts`
- Modify: `functions/src/account_delete.test.ts`
- Modify: `functions/src/account_delete_job.ts`
- Modify: `functions/src/account_delete_job.test.ts`
- Modify: `functions/src/account_delete_worker.ts`
- Modify: `functions/src/account_delete_worker.test.ts`
- Modify: `functions/src/admin_account_delete.ts`
- Modify: `functions/src/admin_account_delete.test.ts`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`

- [ ] **Step 1: Replace silent-substitution tests with ownership-closure tests**

Define the expected closure shape in tests:

```ts
expect(await resolveDeletionIdentityClosure(db as any, 'auth456', 'localStable')).toEqual({
  version: 1,
  primaryAuthUid: 'auth456',
  primaryStableUid: 'serverStable',
  authUids: ['auth456'],
  stableUids: ['localStable', 'serverStable'],
});
```

Add a test where `localStable` has no server ownership proof and expect:

```ts
await expect(
  resolveDeletionIdentityClosure(db as any, 'auth456', 'unprovedStable'),
).rejects.toMatchObject({
  code: 'permission-denied',
  message: 'stable_id_mismatch',
});
```

Delete the test expectation that silently resolves `staleLocalStable` to `serverStable` while dropping the requested identity.

- [ ] **Step 2: Run the closure test and verify RED**

Run:

```bash
npm --prefix functions test -- --runTestsByPath src/account_delete.test.ts --runInBand
```

Expected: FAIL because `resolveDeletionIdentityClosure` and closure-aware enqueue do not exist.

- [ ] **Step 3: Define and resolve the immutable closure**

In `functions/src/account_delete_job.ts` export:

```ts
export type AccountDeleteIdentityClosure = {
  version: 1;
  primaryAuthUid: string;
  primaryStableUid: string;
  authUids: string[];
  stableUids: string[];
};
```

In `functions/src/account_delete.ts`, replace `resolveStableUidForDelete()` at enqueue boundaries with:

```ts
async function resolveDeletionIdentityClosure(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
): Promise<AccountDeleteIdentityClosure> {
  // Collect auth_links anchor, proved requested user ownership,
  // users.firebaseAuthUid matches, owner-map, and completed merge aliases.
  // Sort and deduplicate every ID before returning.
}
```

Rules for the implementation:

- include the requested stable ID only after proof through `users.firebaseAuthUid`, linked-auth ownership, owner-map, or a completed merge alias;
- include the auth-link stable anchor when present;
- select `primaryStableUid` deterministically from the live canonical/auth-link anchor;
- reject an unproved requested ID rather than substituting another ID;
- return sorted, unique arrays for deterministic replay.

- [ ] **Step 4: Make enqueue/job/worker closure-aware**

Change the enqueue signature:

```ts
export async function enqueueAccountDeletionJob(
  db: FirebaseFirestore.Firestore,
  identityClosure: AccountDeleteIdentityClosure,
  nowMs = Date.now(),
): Promise<AccountDeleteEnqueueResult>
```

Keep legacy scalar fields in the job during rollout and add the immutable closure:

```ts
{
  authUid: identityClosure.primaryAuthUid,
  stableUid: identityClosure.primaryStableUid,
  identityClosure,
  identityClosureHash: sha256(JSON.stringify(identityClosure)),
}
```

Within the same Firestore transaction, write auth markers and permanent denials for every `authUids` entry and tombstones/permanent denials for every `stableUids` entry before returning success. On duplicate enqueue, compare `identityClosureHash`; never widen or replace a completed job silently.

Change `AccountDeletionExecutor` to receive the closure:

```ts
export type AccountDeletionExecutor = (
  db: FirebaseFirestore.Firestore,
  identityClosure: AccountDeleteIdentityClosure,
) => Promise<AccountDeletionStats>;
```

For legacy jobs without `identityClosure`, construct the version-1 closure from their existing scalar fields. Execute deletion for the whole persisted closure, not a fresh best-effort lookup after source documents may already be gone.

- [ ] **Step 5: Update user and admin enqueue callers**

In `enqueueForAuthenticatedAccount()`:

```ts
const identityClosure = await resolveDeletionIdentityClosure(db, authUid, requestedStableId);
const result = await enqueue(db, identityClosure);
return { ok: true as const, ...result };
```

Update `admin_account_delete.ts` to pass a one-pair proved closure from its already-authoritative admin identity resolution:

```ts
const closure: AccountDeleteIdentityClosure = {
  version: 1,
  primaryAuthUid: identity.authUid,
  primaryStableUid: identity.stableUid,
  authUids: [identity.authUid],
  stableUids: [identity.stableUid],
};
const queue = await enqueueAccountDeletionJob(db, closure);
```

Preserve admin ownership/audit checks and do not enable admin App Check.

- [ ] **Step 6: Lock closure data in Firestore Rules**

Add an explicit server-only block next to the other deletion collections:

```text
match /account_deletion_jobs/{jobId} {
  allow read, write: if false;
}
```

Keep permanent denials server-only. Keep the existing narrow self-read policy for `account_deletion_auth_markers`; do not put raw closure arrays into marker documents.

- [ ] **Step 7: Align failed-job retention contract**

Change `functions/src/account_delete_worker.test.ts` so expired completed jobs are deleted but expired failed jobs remain available for authenticated requeue. Assert permanent denials are never garbage-collected:

```ts
expect(batch.delete).toHaveBeenCalledWith(completedJob.ref);
expect(batch.delete).not.toHaveBeenCalledWith(failedJob.ref);
expect(ACCOUNT_DELETE_PERMANENT_DENIAL_GC_POLICY.purge).toBe(false);
```

- [ ] **Step 8: Run focused server/security gates and commit**

Run:

```bash
npm --prefix functions test -- --runTestsByPath src/account_delete.test.ts src/account_delete_job.test.ts src/account_delete_worker.test.ts src/admin_account_delete.test.ts --runInBand
npx jest --runTestsByPath tests/firestore_rules_security.test.ts --no-cache --runInBand
npm --prefix functions run build
```

Expected: all focused suites PASS and Functions build exits 0.

Before committing, run:

```bash
rg -n "account_deletion_jobs|identityClosure" functions/src/jarvis
```

Expected: no Jarvis reader currently consumes this collection. If the command finds a reader, update that reader and `functions/src/jarvis/jarvis_data_contract_guard.test.ts` in this same task.

Commit only Task 2 files.

### Task 3: Durable monotonic client transition record

**Files:**
- Modify: `app/account_delete_quarantine.ts`
- Modify: `tests/account_delete_quarantine_authority.test.ts`
- Modify: `tests/account_delete_quarantine_behavior.test.ts`
- Modify: `tests/stable_id.test.ts`

- [ ] **Step 1: Write failing phase/migration tests**

Cover:

```ts
const phases = [
  'prepared',
  'local_data_cleared',
  'server_enqueued',
  'provider_signed_out',
  'old_stable_cleared',
  'anonymous_authenticated',
  'stable_link_verified',
  'ready',
] as const;
```

Assert:

- every phase round-trips through SecureStore;
- `advanceAccountDeleteTransition()` rejects backward and skipped transitions;
- legacy `local_cleared` parses as `old_stable_cleared`;
- `anonymous_authenticated` requires `freshAuthUid`;
- `stable_link_verified` requires both `freshAuthUid` and `freshStableId`;
- `ready` cannot reuse `providerUid` or the deleted `stableId`.

- [ ] **Step 2: Run the quarantine tests and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/account_delete_quarantine_authority.test.ts tests/account_delete_quarantine_behavior.test.ts tests/stable_id.test.ts --no-cache --runInBand
```

Expected: FAIL because the new phases and transition API do not exist.

- [ ] **Step 3: Extend the record without breaking legacy anchors**

Add:

```ts
export type AccountDeleteTransitionPhase =
  | 'prepared'
  | 'local_data_cleared'
  | 'server_enqueued'
  | 'provider_signed_out'
  | 'old_stable_cleared'
  | 'anonymous_authenticated'
  | 'stable_link_verified'
  | 'ready';

export interface AccountDeletePendingAuthLock {
  operationId: string;
  providerUid: string;
  stableId: string | null;
  source: 'local' | 'remote';
  phase: AccountDeleteTransitionPhase;
  freshAuthUid?: string;
  freshStableId?: string;
  createdAt: number;
  expiresAt: number;
}
```

Keep the existing anchor immutable: it records only the deleted identity and operation. Do not add fresh IDs to the anchor.

- [ ] **Step 4: Add a compare-and-advance helper**

Implement and export:

```ts
export async function advanceAccountDeleteTransition(
  current: AccountDeletePendingAuthLock,
  nextPhase: AccountDeleteTransitionPhase,
  proof: Pick<AccountDeletePendingAuthLock, 'freshAuthUid' | 'freshStableId'> = {},
): Promise<AccountDeletePendingAuthLock> {
  // Validate exact next phase, merge proof, validate non-reuse, persist,
  // re-read, and return the verified record.
}
```

Use a fixed phase-rank table. Reject with stable codes:

- `account_delete_transition_non_monotonic`
- `account_delete_transition_proof_missing`
- `account_delete_transition_identity_reused`
- `account_delete_transition_persist_failed`

- [ ] **Step 5: Run focused tests and commit**

Run the Step 2 command again. Expected: all suites PASS.

Commit only the four Task 3 files.

### Task 4: Strict anonymous authentication and authoritative mutation gate

**Files:**
- Modify: `app/cloud_sync.ts`
- Modify: `app/events.ts`
- Modify: `tests/cloud_sync_identity_anchor.test.ts`
- Modify: `tests/startup_cloud_identity_recovery.test.ts`

- [ ] **Step 1: Write failing tests for false anonymous-auth success**

Mock `signInAnonymously()` to reject or resolve without installing `auth.currentUser`. Assert:

```ts
await expect(ensureAnonIdentityDetailed()).resolves.toEqual({
  ok: false,
  authUid: null,
  stableId: null,
  failure: 'transport_unavailable',
});
```

Also assert `ensureAnonUser()` returns `null`, not a stable ID, when Firebase authentication is absent.

- [ ] **Step 2: Run the cloud tests and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/cloud_sync_identity_anchor.test.ts tests/startup_cloud_identity_recovery.test.ts --no-cache --runInBand
```

Expected: FAIL because `ensureAnonUser()` currently returns a stable ID after a swallowed auth failure.

- [ ] **Step 3: Add a strict detailed anonymous-auth result**

Implement:

```ts
export type AnonIdentityResult =
  | { ok: true; authUid: string; stableId: string }
  | { ok: false; authUid: null; stableId: null; failure: CloudAccessFailureReason };

export async function ensureAnonIdentityDetailed(): Promise<AnonIdentityResult> {
  const authFailure = await ensureAnonAuthReadyDetailed();
  const user = getAuth()?.currentUser;
  if (!user?.uid || user.isAnonymous !== true) {
    return {
      ok: false,
      authUid: null,
      stableId: null,
      failure: authFailure ?? 'identity_unavailable',
    };
  }
  const stableId = await getCanonicalUserId();
  return stableId
    ? { ok: true, authUid: user.uid, stableId }
    : { ok: false, authUid: null, stableId: null, failure: 'identity_unavailable' };
}
```

Change the cached anonymous-auth initializer into `ensureAnonAuthReadyDetailed(): Promise<CloudAccessFailureReason | null>`. Return `null` only when an authenticated user exists after the attempt; classify caught timeout/network/App Check errors with `classifyCloudAccessFailure()` and clear the cached promise after failure. Make `ensureAnonUser()` delegate to `ensureAnonIdentityDetailed()` and return a stable ID only on `ok: true`.

- [ ] **Step 4: Add a typed authoritative cloud-mutation gate**

Add:

```ts
export type CloudMutationIdentityResult =
  | { status: 'ready'; authUid: string; stableUid: string }
  | { status: 'pending'; reason: CloudAccessFailureReason }
  | { status: 'retired' };

export async function ensureCloudMutationIdentity(
  stableId: string,
): Promise<CloudMutationIdentityResult> {
  const result = await ensureStableAuthLinkForStableIdDetailed(
    stableId,
    undefined,
    { requireAuthoritative: true },
  );
  if (result.ok && result.authUid && result.stableUid) {
    return { status: 'ready', authUid: result.authUid, stableUid: result.stableUid };
  }
  if (result.failure === 'identity_retired') {
    emitAppEvent('identity_retired', { source: 'cloud_mutation' });
    return { status: 'retired' };
  }
  return { status: 'pending', reason: result.failure ?? 'identity_unavailable' };
}
```

Add event payloads in `app/events.ts`:

```ts
identity_retired: { source: 'cloud_mutation' | 'startup' | 'nickname' };
post_delete_identity_ready: { authUid: string; stableId: string };
```

- [ ] **Step 5: Run focused tests and commit**

Run the Step 2 command again. Expected: both suites PASS.

Commit only Task 4 files.

### Task 5: One post-deletion identity coordinator

**Files:**
- Modify: `app/auth_provider.ts`
- Modify: `app/account_delete_quarantine.ts`
- Modify: `tests/auth_provider_behavior.test.ts`
- Modify: `tests/auth_provider_stable_link.test.ts`
- Modify: `tests/account_delete_flow_contract.test.ts`
- Create: `tests/post_delete_fresh_identity_integration.test.ts`

- [ ] **Step 1: Write the integration state-machine harness**

Create a dependency-controlled test that records calls to enqueue, sign-out, clear stable ID, anonymous auth, authoritative link, and persistence. The happy path must assert this exact order:

```ts
expect(calls).toEqual([
  'wipe_local',
  'persist:local_data_cleared',
  'enqueue_delete',
  'persist:server_enqueued',
  'provider_sign_out',
  'persist:provider_signed_out',
  'clear_old_stable',
  'persist:old_stable_cleared',
  'anonymous_auth',
  'persist:anonymous_authenticated',
  'authoritative_link',
  'persist:stable_link_verified',
  'begin_account_generation',
  'persist:ready',
  'clear_transition',
  'emit:post_delete_identity_ready',
]);
```

Add parameterized crash/restart tests that stop after every persisted phase and assert the next run resumes at the next action without repeating an unsafe earlier action.

- [ ] **Step 2: Add failure tests before implementation**

Cover:

- offline enqueue keeps `local_data_cleared` and normal onboarding available;
- a thrown or partial local wipe never persists `local_data_cleared` and never mounts onboarding over old profile data;
- provider sign-out failure never clears/creates a stable ID;
- SecureStore clear failure never creates a fresh stable ID;
- anonymous auth without `currentUser.isAnonymous` never advances;
- fresh auth UID equal to deleted provider UID is rejected;
- fresh stable ID equal to deleted stable ID is rejected;
- authoritative link failure does not set `ready`;
- `identity_retired` with no local record creates a `source: 'remote'` transition and performs one legacy safety wipe;
- a fresh, non-denied provider UID paired with a retired stable ID stays signed in, receives a fresh stable ID, is linked authoritatively, and returns `created_new` in the same provider attempt without any deletion enqueue;
- `subject: 'auth' | 'closure' | unknown` stays fail-closed through sign-out and fresh anonymous rotation;
- the email/code recovery surface is unreachable; ordinary Google/Apple sign-in is the only live account recovery/creation entry.

- [ ] **Step 3: Run integration tests and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/post_delete_fresh_identity_integration.test.ts tests/auth_provider_stable_link.test.ts tests/account_delete_flow_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the coordinator does not exist.

- [ ] **Step 4: Implement `ensureFreshPostDeletionIdentity()`**

In `app/auth_provider.ts` export:

```ts
export type FreshPostDeletionIdentityResult =
  | { status: 'ready'; authUid: string; stableId: string }
  | { status: 'pending_offline'; phase: AccountDeleteTransitionPhase }
  | { status: 'pending_auth'; phase: AccountDeleteTransitionPhase }
  | { status: 'fatal_local_guard'; phase: AccountDeleteTransitionPhase | null };

export async function ensureFreshPostDeletionIdentity(
  trigger: 'delete' | 'startup' | 'foreground' | 'identity_retired',
): Promise<FreshPostDeletionIdentityResult> {
  // Single-flight by operationId; loop over the next legal phase only.
}
```

Implementation requirements:

- use one in-flight promise per `operationId`;
- when no record exists and trigger is `identity_retired`, persist a remote-source guard before wiping;
- verify the local wipe before persisting `local_data_cleared`: `hasMeaningfulLocalAccountData()` must be false and the literal onboarding keys `onboarding_flow_version_v1`, `onboarding_step`, and `onboarding_done` must all be absent; mount onboarding only after this proof;
- retain provider auth until `server_enqueued` for linked identities;
- call `signOutCurrentProvider()` before `clearStableId()`;
- call `ensureAnonIdentityDetailed()` and verify `isAnonymous` plus UID inequality;
- generate/read the new stable ID only after provider sign-out and old-stable clear;
- require `ensureStableAuthLinkForStableIdDetailed(..., { requireAuthoritative: true })` and exact auth/stable equality;
- call `beginAccountGeneration(freshStableId)` only after authoritative proof;
- emit `post_delete_identity_ready` and clear the local transition only after persisted `ready`;
- never remove server tombstones or permanent denials.

- [ ] **Step 5: Route existing delete and resume paths through the coordinator**

Keep `beginAccountDeletion()` fast. After `prepareAccountDeletion()` completes the local wipe, verify the known account/onboarding keys and persist `local_data_cleared` before returning the UI handoff. If verification fails, keep the durable guard, return `{ ok: false, reason: 'local_wipe_unverified' }`, and do not emit `account_deleted`; the next launch resumes the wipe. Replace duplicate rotation logic in `finishAccountDeletion()` and `resumePendingAccountDeleteLocalExit()` with the coordinator. Preserve the existing exported resume function as a compatibility wrapper:

```ts
export async function resumePendingAccountDeleteLocalExit(): Promise<boolean> {
  const result = await ensureFreshPostDeletionIdentity('startup');
  return result.status !== 'fatal_local_guard';
}
```

- [ ] **Step 6: Run mandated auth gates and commit**

Run:

```bash
npx jest --runTestsByPath tests/post_delete_fresh_identity_integration.test.ts tests/auth_provider_behavior.test.ts tests/auth_provider_stable_link.test.ts tests/account_delete_flow_contract.test.ts tests/account_delete_quarantine_authority.test.ts tests/account_delete_quarantine_behavior.test.ts tests/stable_id.test.ts --no-cache --runInBand
```

Expected: all suites PASS.

Commit only Task 5 files.

### Task 6: Boot, foreground, and retired-event convergence

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/events.ts`
- Modify: `tests/startup_cloud_identity_recovery.test.ts`
- Modify: `tests/account_delete_flow_contract.test.ts`
- Modify: `tests/post_delete_fresh_identity_integration.test.ts`

- [ ] **Step 1: Write failing boot/event tests**

Assert:

- startup calls `ensureFreshPostDeletionIdentity('startup')` before `ensureStableAuthLink()` and before any restore/upload;
- app foreground calls `ensureFreshPostDeletionIdentity('foreground')` when a transition is pending;
- `identity_retired` coalesces repeated events into one coordinator run;
- `account_deleted` still mounts the existing `CleanOnboarding` immediately after local wipe;
- no second modal or app reload is added.

- [ ] **Step 2: Run startup tests and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/startup_cloud_identity_recovery.test.ts tests/account_delete_flow_contract.test.ts tests/post_delete_fresh_identity_integration.test.ts --no-cache --runInBand
```

Expected: FAIL because `_layout` does not yet own the new ordering/listeners.

- [ ] **Step 3: Wire the coordinator at all recovery boundaries**

In the existing bootstrap sequence:

```ts
const freshIdentity = await ensureFreshPostDeletionIdentity('startup');
if (freshIdentity.status === 'ready') {
  await ensureStableAuthLink().catch(() => false);
}
```

Subscribe once:

```ts
const retiredSub = onAppEvent('identity_retired', () => {
  void ensureFreshPostDeletionIdentity('identity_retired');
});
```

Add the equivalent foreground trigger using the existing app-state lifecycle. Clean up subscriptions on unmount. Do not block rendering of `CleanOnboarding` on network phases.

- [ ] **Step 4: Run focused tests and commit**

Run the Step 2 command again. Expected: all suites PASS.

Commit only Task 6 files.

### Task 7: Nickname pending intent and honest UI

**Files:**
- Modify: `app/firestore_leaderboard.ts`
- Modify: `app/nickname_guard.ts`
- Modify: `components/account/NicknameEditModal.tsx`
- Modify: `app/_layout.tsx`
- Modify: `tests/nickname_guard_reconcile.test.ts`
- Modify: `tests/nickname_edit_modal_availability.test.tsx`
- Create: `tests/nickname_post_delete_identity.test.ts`

- [ ] **Step 1: Write failing nickname transition tests**

Extend result types in test expectations:

```ts
type ReserveNameStatus = 'ok' | 'taken' | 'cooldown' | 'pending_identity' | 'error';
```

Test that:

- `identity_retired` returns `pending_identity`, emits recovery, and never calls `nameReserve` again under the retired pair;
- a nickname submitted while pending remains local and is stored with the current account-generation token;
- `post_delete_identity_ready` retries it once;
- a real `taken` response rolls back/asks for another name;
- `pending_identity` does not show “Проверь интернет” and does not discard the entered name.

- [ ] **Step 2: Run nickname tests and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/nickname_post_delete_identity.test.ts tests/nickname_guard_reconcile.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/nickname_edit_modal_availability.test.tsx --no-cache --runInBand
```

Expected: FAIL because identity transition is still collapsed into `error`.

- [ ] **Step 3: Put both nickname operations behind the common gate**

In `reserveNameDetailed()` and `generateAndReserveNickname()`:

```ts
const identity = await ensureCloudMutationIdentity(stableId);
if (identity.status === 'retired') return { status: 'pending_identity' };
if (identity.status === 'pending') return { status: 'error' };
```

Use `identity.stableUid` in the callable request. Remove the direct low-level stable-link call and the direct Firestore identity fallback from nickname identity preparation.

- [ ] **Step 4: Persist and resume the desired nickname**

In `app/nickname_guard.ts` add a versioned record:

```ts
type PendingNicknameReservation = {
  version: 1;
  name: string;
  oldName: string;
  source: 'onboarding' | 'settings';
  accountGeneration: {
    generation: number;
    stableId: string | null;
  };
  createdAt: number;
};
```

Create the persisted snapshot from a live `captureAccountGeneration()` token. After reading JSON, do not pass it to `isCurrentAccountGeneration()` because that API intentionally accepts only live WeakSet-backed tokens. Instead capture a new live token and compare its `phase === 'active'`, `generation`, and `stableId` to the stored scalar snapshot. Delete a stale-generation record without sending it. Clear the record only on `ok`, `taken`, or explicit user replacement; retain it for pending/offline results.

- [ ] **Step 5: Make the modal honest**

Handle `pending_identity` before the generic rollback branch:

```ts
if (reservation.status === 'pending_identity') {
  await rememberPendingNicknameReservation(trimmed, oldName, 'settings');
  onNotice(L(
    'Аккаунт подготавливается. Имя сохранится автоматически.',
    'Обліковий запис готується. Імʼя збережеться автоматично.',
    'La cuenta se está preparando. El nombre se guardará automáticamente.',
    'A conta está sendo preparada. O nome será salvo automaticamente.',
    'Tài khoản đang được chuẩn bị. Tên sẽ tự động được lưu.',
    'Akun sedang disiapkan. Nama akan tersimpan otomatis.',
  ));
  return;
}
```

Do not add a new modal. Keep the normal name-taken and cooldown UX unchanged.

- [ ] **Step 6: Resume on readiness and commit**

In `_layout`, handle `post_delete_identity_ready` by calling the existing nickname reconciliation entry points once for the new account generation.

Run the Step 2 command plus:

```bash
npx jest --runTestsByPath tests/account_delete_flow_contract.test.ts --no-cache --runInBand
```

Expected: all suites PASS.

Commit only Task 7 files.

### Task 8: Migrate all current cloud mutation consumers and add a guard

**Files:**
- Modify: `components/PremiumContext.tsx`
- Modify: `app/daily_analytics_sync.ts`
- Modify: `app/economy/client_shard_operation_sync.ts`
- Modify: `app/economy/external_shard_event_sync.ts`
- Modify: `app/friend_gifts.ts`
- Modify: `app/friend_quests.ts`
- Modify: `app/friends_together/sender_identity.ts`
- Modify: `app/global_broadcast_modal.ts`
- Modify: `app/firestore_friend_requests.ts`
- Modify: `app/referral_system.ts`
- Modify: `app/push_token_registration.ts`
- Modify: `app/vip_survey.ts`
- Create: `scripts/guard_cloud_identity_gate.mjs`
- Create: `tests/cloud_identity_gate_contract.test.ts`
- Modify focused existing tests for each touched consumer.

- [ ] **Step 1: Write the source-contract guard first**

The guard must scan `app/**/*.ts`, `app/**/*.tsx`, `components/**/*.ts`, and `components/**/*.tsx` and reject direct calls to:

```text
ensureStableAuthLinkForStableId(
ensureStableAuthLinkForStableIdDetailed(
```

Allow only these identity infrastructure files:

```js
const ALLOWLIST = new Set([
  'app/auth_provider.ts',
  'app/cloud_sync.ts',
  'app/pending_auth_link.ts',
]);
```

The Jest contract invokes the guard and expects exit code 0. Its first run must fail and list every current caller.

- [ ] **Step 2: Run the guard and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/cloud_identity_gate_contract.test.ts --no-cache --runInBand
```

Expected: FAIL with the direct-call file inventory.

- [ ] **Step 3: Migrate each consumer to the typed gate**

Use this pattern before every cloud mutation:

```ts
const identity = await ensureCloudMutationIdentity(ownerStableId);
if (identity.status !== 'ready') return pendingOrSafeNoopResult;
const stableUid = identity.stableUid;
```

Consumer-specific safe behavior:

- economy journals retain immutable local operations and retry; never roll back a local grant;
- premium reads/listeners remain pending and never revoke cached local entitlement because identity is transitioning;
- gifts, quests, referrals, broadcasts, surveys, and friend requests do not send under an unverified pair;
- push token registration retains its retry marker and sends nothing under a retired pair;
- daily analytics performs a no-op and retries on the next normal schedule.

Do not replace pending behavior with a destructive reset.

- [ ] **Step 4: Add focused behavior tests for money/access and social writes**

For every touched suite, test at least `retired` and `pending`:

```ts
mockEnsureCloudMutationIdentity.mockResolvedValue({ status: 'retired' });
await runMutation();
expect(mockCallable).not.toHaveBeenCalled();
expect(localOperationJournal).toRemainPending();
```

For premium, assert no transition result lowers access. For economy, assert no operation is removed or re-debited.

- [ ] **Step 5: Run focused consumer gates and commit in two slices**

First commit economy/access:

```bash
npx jest --runTestsByPath tests/cloud_identity_gate_contract.test.ts tests/home_shards_balance_live_update_contract.test.ts tests/admin_premium_delivery_contract.test.ts --no-cache --runInBand
```

Then commit social/background consumers with their focused suites and rerun the guard. Each command must exit 0. Keep `scripts/guard_cloud_identity_gate.mjs` in the second commit after all violations are removed.

### Task 9: End-to-end privacy gates, observability, and release checklist

**Files:**
- Modify: `app/auth_provider.ts`
- Modify: `app/analytics.ts`
- Modify: `functions/src/account_delete.ts`
- Modify: `functions/src/account_delete_job.ts`
- Modify: `tests/post_delete_fresh_identity_integration.test.ts`
- Modify: `tests/firestore_rules_security.test.ts`
- Create: `docs/auth/POST_DELETE_FRESH_IDENTITY_RELEASE_CHECKLIST.md`

- [ ] **Step 1: Add privacy-conscious phase telemetry tests**

Assert every phase event contains only:

```ts
{
  event: 'auth_post_delete_transition',
  phase,
  trigger,
  attempt,
  operationHash,
}
```

Reject raw email, nickname, provider UID, stable ID, and fresh auth UID keys in telemetry payloads.

- [ ] **Step 2: Add bounded telemetry**

Hash the operation ID locally/server-side before logging. Emit phase entry, retry class, time in phase, and terminal readiness. Use existing `logAuthEvent`/structured Function logs; do not add a new analytics backend or store deleted profile data.

- [ ] **Step 3: Write the physical release checklist**

The checklist must require recorded PASS evidence for:

- iOS real device: delete → immediate ordinary onboarding → name save; reinstall with Keychain retained; old Apple/Google blocked;
- Android real device: duplicate historical stable IDs; delete → onboarding; provider picker after sign-out;
- offline at `local_data_cleared`, process kill after every phase, network restoration without restart;
- anonymous-auth failure and authoritative-link failure injection;
- old production client against new Functions remains fail-closed;
- no old `users`, `name_index`, leaderboard, progress, entitlement, or economy document recreated;
- support diagnostics show app version/phase but no retired raw identity;
- production monitoring thresholds and rollback criteria.

- [ ] **Step 4: Run the complete narrow auth/privacy gate**

Run client tests:

```bash
npx jest --runTestsByPath tests/auth_provider_stable_link.test.ts tests/account_delete_flow_contract.test.ts tests/account_delete_quarantine_authority.test.ts tests/account_delete_quarantine_behavior.test.ts tests/stable_id.test.ts tests/auth_identity_anon_relink.test.ts tests/firestore_rules_security.test.ts tests/cloud_sync_identity_anchor.test.ts tests/startup_cloud_identity_recovery.test.ts tests/post_delete_fresh_identity_integration.test.ts tests/nickname_post_delete_identity.test.ts tests/nickname_guard_reconcile.test.ts tests/cloud_identity_gate_contract.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/nickname_edit_modal_availability.test.tsx --no-cache --runInBand
```

Run Functions tests/build:

```bash
npm --prefix functions test -- --runTestsByPath src/auth_identity.test.ts src/account_delete.test.ts src/account_delete_job.test.ts src/account_delete_worker.test.ts src/admin_account_delete.test.ts --runInBand
npm --prefix functions run build
```

Run hygiene/security checks:

```bash
node scripts/guard_cloud_identity_gate.mjs
npm run scan:secrets:staged
git diff --check
```

Expected: every command exits 0. Do not claim release readiness from unit tests alone; the physical checklist is mandatory.

- [ ] **Step 5: Run independent critical reviews before release**

Request:

- a fresh read-only auth/privacy contract review;
- a fresh security review of ownership proof, error details, Firestore Rules, and deleted-identity non-resurrection;
- an independent verifier run of the exact commands above.

Any P0/P1 finding blocks release. Fix implementation and rerun the failed deterministic gate; never weaken the test.

- [ ] **Step 6: Commit documentation/telemetry and stop before deployment**

Commit only Task 9 files. Report the commit list, exact test counts, Functions build status, unresolved risks, and physical checklist status. Deployment requires a separate explicit owner instruction.

## Final acceptance checklist

- [ ] Deletion shows the existing clean onboarding only after proven local wipe.
- [ ] Offline onboarding does not generate any old-identity cloud write.
- [ ] The new Firebase user is anonymous and differs from the retired provider UID.
- [ ] The new stable ID differs from the retired stable ID.
- [ ] `ready` requires an authoritative exact auth/stable link.
- [ ] `identity_retired` starts/resumes recovery and is never shown as a network/name error.
- [ ] Pending nickname intent is account-generation-bound and resumes once.
- [ ] All current cloud mutation consumers use the typed gate.
- [ ] The server deletion job contains the full proved immutable identity closure.
- [ ] Unproved requested stable IDs are rejected, never silently substituted.
- [ ] Permanent denials survive job/tombstone retention cleanup.
- [ ] Every retired Firebase provider UID remains blocked; a `subject: 'stable'` sign-in links a fresh stable ID and returns `created_new` in one attempt, restoring no old data or entitlement.
- [ ] No live auth surface offers email/code recovery.
- [ ] Firestore Rules keep deletion closure data server-only.
- [ ] Jarvis readers remain contract-correct or are updated in the same change.
- [ ] Focused automated gates pass.
- [ ] Physical iOS/Android/offline/process-kill checklist passes before release.
- [ ] No deployment occurs without explicit owner authorization.
