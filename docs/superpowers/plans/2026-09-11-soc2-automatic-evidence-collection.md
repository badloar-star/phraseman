# Automatic SOC 2 readiness evidence collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a bounded weekly Firebase collector that produces sanitized SOC 2 readiness manifests, keeps an admin-only automated projection, and shows fresh/stale/blocked status in the existing admin workbench.

**Architecture:** A scheduled Functions v2 job owns manifests, run events, the latest-run pointer and automated control projections. The existing `soc2_control_evidence` collection remains the human journal. The admin page reads both projections and the human journal, while Firestore rules prevent browser writes to automated collections.

**Tech Stack:** TypeScript, Firebase Functions v2 Scheduler, Firebase Admin SDK, Firestore Rules, SHA-256 via Node `crypto`, existing `admin/v2/legacy.html` inline runtime, Node test runner and Jest rules tests.

---

### Task 1: Define the collector contract with failing tests

**Files:**
- Create: `functions/src/soc2_readiness_collector.test.ts`
- Create: `tests/admin_soc2_automation_contract.test.mjs`
- Modify: `docs/security/SOC2_READINESS_HUB.md` only after the implementation passes

- [ ] **Step 1: Write pure adapter tests first**

Cover these exact cases in `soc2_readiness_collector.test.ts`:

```ts
expect(buildWeeklyRunId(new Date('2026-09-11T04:00:00.000Z'))).toBe('weekly-2026-09-07');
expect(redactAdminIds(['uid-b', 'uid-a'])).toEqual({ count: 2, sha256: expect.any(String) });
expect(redactAdminIds(['uid-a', 'uid-a']).count).toBe(1);
expect(boundText('x'.repeat(3000), 2000)).toHaveLength(2000);
expect(classifyFreshness(new Date('2026-09-11T00:00:00.000Z'), 2, new Date('2026-09-11T12:00:00.000Z'))).toBe('fresh');
expect(classifyFreshness(new Date('2026-09-08T00:00:00.000Z'), 2, new Date('2026-09-11T12:00:00.000Z'))).toBe('stale');
```

Also assert that a truncated source result is `blocked`, never `fresh`, and that a failed source preserves its error code without raw identifiers.

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `functions`:

```text
npx jest --runInBand src/soc2_readiness_collector.test.ts --no-cache
```

Expected: FAIL because the pure collector helpers do not exist.

- [ ] **Step 3: Add the source contract test**

`tests/admin_soc2_automation_contract.test.mjs` must assert that the function source contains the exact schema strings `soc2_evidence_manifests`, `soc2_automated_control_projection`, `soc2_automation_state`, `soc2_evidence_runs`, `schemaVersion: 'soc2-evidence-manifest-v1'`, `onSchedule`, and `runId`, and that the admin source contains `soc2-automation-status` and `loadAutomatedProjection`.

- [ ] **Step 4: Run the contract test and verify it fails**

```text
node --test tests/admin_soc2_automation_contract.test.mjs
```

Expected: FAIL with missing collector and admin summary markers.

### Task 2: Implement deterministic, redacted collector logic

**Files:**
- Create: `functions/src/soc2_readiness_collector.ts`
- Test: `functions/src/soc2_readiness_collector.test.ts`

- [ ] **Step 1: Implement bounded pure helpers**

Export `buildDailyRunId`, `redactAdminIds`, `boundText`, `classifyFreshness`, `sha256Text`, and the typed result unions. Keep all limits/constants in this file: 1,000 auth users per page, 500 audit rows, 2,000-character reasons, and 20 controls.

- [ ] **Step 2: Implement source adapters**

Implement:

```ts
collectAdminAccessSummary(auth): Promise<SourceResult>
collectAdminAuditSummary(db, windowStartIso, windowEndIso): Promise<SourceResult>
buildUnsupportedSourceResult(controlId, reason): SourceResult
```

The access adapter must hash sorted unique auth UIDs and report `truncated` when `listUsers` returns a page token. The audit adapter must only retain count, action-name counts, first/last timestamps and a stable hash of bounded action/timestamp tuples. Never write raw email, uid, token, document payload or message content into the manifest.

- [ ] **Step 3: Implement manifest and projection builders**

`buildDailyCollection(runContext)` must produce:

```ts
type EvidenceManifest = {
  schemaVersion: 'soc2-evidence-manifest-v1'; runId: string;
  collectedAt: string; windowStart: string; windowEnd: string;
  controlId: string; evidenceId: string; source: string;
  populationSummary: Record<string, number | string | boolean>;
  result: 'pass' | 'failed' | 'blocked'; exceptions: string[];
  sourceRevision: string; checksum: string; startedAt: string; completedAt: string;
};
```

Map automatic sources only to `access-review` and `change-release`; create explicit blocked results for dependency, backup, incident, vendor, privacy and availability controls. `buildWeeklyCollection` must be deterministic for the same run context and must not claim that a scheduler heartbeat proves availability.

- [ ] **Step 4: Run the focused Jest test**

```text
npx jest --runInBand src/soc2_readiness_collector.test.ts --no-cache
```

Expected: PASS.

### Task 3: Add the scheduled Functions v2 job and exports

**Files:**
- Modify: `functions/src/soc2_readiness_collector.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/soc2_readiness_collector.test.ts`

- [ ] **Step 1: Write the idempotency test**

Mock the Admin SDK batch writes and assert that two calls with `runId = weekly-2026-09-07` write the same manifest document IDs and do not call `create` twice for the same run. Assert that an adapter failure writes a failed manifest and leaves the projection blocked.

- [ ] **Step 2: Implement `soc2ReadinessCollectorCron`**

Use `onSchedule({ schedule: '0 4 * * 1', timeZone: 'UTC', retryCount: 3, maxInstances: 1 }, handler)`. The handler must:

1. Build the previous UTC 24-hour window and deterministic `runId`.
2. Transactionally claim `soc2_evidence_runs/{runId}`; return early if `status === 'completed'`.
3. Collect the bounded source results.
4. Write `soc2_evidence_manifests/{runId}-{controlId}` with `create` semantics.
5. Write `soc2_automated_control_projection/{controlId}` with server-owned freshness/result fields.
6. Write `soc2_automation_state/latest` with `lastRunId`, `collectedAt`, counts and `status`.
7. Append one event to `soc2_evidence_runs/{runId}/events` and mark the run completed.

On error, mark the run failed with a bounded error code and rethrow so Scheduler retry remains visible. Do not send email/Telegram in this task.

- [ ] **Step 3: Export the cron from `functions/src/index.ts`**

Add one named export next to existing scheduler exports:

```ts
export { soc2ReadinessCollectorCron } from './soc2_readiness_collector';
```

- [ ] **Step 4: Run Functions tests and the source coverage gate**

```text
npx jest --runInBand src/soc2_readiness_collector.test.ts --no-cache
npm run build
```

Expected: focused tests PASS and TypeScript build completes. Acquire the repository semaphore before `npm run build`.

### Task 4: Lock down automated collections with Firestore Rules

**Files:**
- Modify: `firestore.rules`
- Create: `tests/soc2_automation_rules_contract.test.mjs`

- [ ] **Step 1: Write the rules contract test**

Assert the rules contain admin-only reads and `allow create, update, delete: if false` for `soc2_evidence_manifests`, `soc2_automated_control_projection`, `soc2_automation_state`, `soc2_evidence_runs` and nested events. Assert the existing manual `soc2_control_evidence` rule remains separate.

- [ ] **Step 2: Add explicit read-only rules**

Add matches for the four automated collections before the generic browser-admin catch-all. Allow admin reads only. Deny all client writes and deletes. Keep the existing manual journal rules unchanged except for the already-required catch-all exclusion.

- [ ] **Step 3: Run the focused rules contract**

```text
node --test tests/soc2_automation_rules_contract.test.mjs
```

Expected: PASS.

### Task 5: Show automatic status in the existing admin surface

**Files:**
- Modify: `admin/v2/legacy.html`
- Modify: `tests/admin_soc2_readiness_contract.test.mjs`
- Modify: `tests/admin_soc2_readiness_persistence_contract.test.mjs`

- [ ] **Step 1: Add failing UI assertions**

Require `soc2-automation-status`, `soc2-automation-last-run`, `soc2-automation-summary`, `loadAutomatedProjection` and visible labels for `Автоматически`, `Вручную`, `Заблокировано`.

- [ ] **Step 2: Add read-only backend methods**

Inside the existing Firebase module, add `loadAutomatedProjection()` that reads the bounded projection collection and `soc2_automation_state/latest`. Do not add client writes to any automated collection. Dispatch the existing `pm:soc2-backend-ready` event only after admin auth is confirmed.

- [ ] **Step 3: Add the summary card and merge logic**

Add a compact summary above the manual queue. Render last run time, fresh/stale/blocked counts and the reason for blocked controls. Preserve the existing manual queue and show automatic status as a separate badge on each matching card. If the server read fails, show `Автоматический сбор недоступен` and keep the manual journal usable.

- [ ] **Step 4: Run focused admin tests and parse the inline runtime**

```text
node --test tests/admin_session_shell_contract.test.mjs tests/admin_soc2_readiness_contract.test.mjs tests/admin_soc2_readiness_persistence_contract.test.mjs tests/admin_soc2_automation_contract.test.mjs
node -e 'const fs=require("fs"),vm=require("vm"); const s=fs.readFileSync("admin/v2/legacy.html","utf8"); const m="<script id=\"pm-soc2-readiness-runtime\">"; const a=s.indexOf(m),b=s.indexOf("</script>",a); new vm.Script(s.slice(a+m.length,b)); console.log("soc2 runtime syntax: OK")'
```

Expected: all tests PASS and syntax is valid.

### Task 6: Deploy and live-canary the automatic path

**Files:**
- Modify: `docs/security/SOC2_READINESS_HUB.md`
- Modify: `docs/work/tasks/2026-09-11-admin-soc2-readiness.md`

- [x] **Step 1: Run the complete bounded verification set**

Run Tasks 2–5 focused tests, `git diff --check`, the repository evidence verifier in dry-run mode, and the Functions build with the semaphore. Do not run the full Jest suite.

- [x] **Step 2: Deploy rules and Functions**

Run `node scripts/deploy_lock_guard.mjs`, then `firebase deploy --only firestore:rules,functions:soc2ReadinessCollectorCron --non-interactive`. Record the deployment result; do not deploy unrelated functions.

- [x] **Step 3: Deploy the admin Hosting target**

Run `npm run hosting:admin` and verify the guard reports `admin/v2 -> admin\\v2\\legacy.html`.

- [x] **Step 4: Perform one live canary**

Open the live admin as an authenticated administrator, open `SOC 2 / Готовность`, verify the automatic summary, click the manual sync/read view, and confirm that a fresh tab reads the same manual journal. The first scheduled `lastRunId` is intentionally not fabricated; until 04:00 UTC it displays “Нет запуска”. Do not mark blocked controls as complete.

- [x] **Step 5: Update the hub truthfully**

Document the first collector run as internal dry-run evidence, keep operating cycles at zero, and list unsupported sources as gaps. Do not claim SOC 2 readiness or certification.

### Task 7: Review and handoff

**Files:**
- Review: all files from Tasks 1–6

- [x] **Step 1: Run `git diff --check` and inspect only the owned diff**
- [x] **Step 2: Verify no App Check, auth, product write or secret access was added**
- [ ] **Step 3: Confirm the first two scheduled runs remain marked internal dry-run**
- [x] **Step 4: Report the exact automatic coverage and the remaining human checkpoints**
