# Automatic SOC 2 readiness evidence collection

## Decision

Build a server-owned, admin-only evidence collector around the existing SOC 2 readiness workbench. The collector runs on Firebase Scheduler, writes immutable machine manifests and a separate server-owned automated projection. The existing `soc2_control_evidence` collection remains the manual journal. The admin UI remains the review surface; it never receives service credentials and never writes product data outside its existing manual journal.

This is an internal Security + Availability readiness program. It must never label a control “SOC 2 compliant” or turn a scheduler heartbeat into operating effectiveness without a valid population, result, exceptions and review decision.

## Scope for the first slice

1. Add one weekly scheduled collector with a deterministic run id and bounded runtime.
2. Collect only evidence that can be truthfully produced from existing server-side sources:
   - admin authorization/access population as a redacted count plus stable hash;
   - admin audit/change events for the collection window;
   - collector health and freshness metadata;
   - explicit “not collected” results for sources that still require an approved external integration (dependency scan, restore test, incident tabletop, vendor review).
3. Store a sanitized manifest under `soc2_evidence_manifests/{runId}` and append a run event under `soc2_evidence_runs/{runId}/events/{eventId}`.
4. Update `soc2_automated_control_projection/{controlId}` with status, freshness, evidence id and run reference; never overwrite the existing manual journal's notes or history.
5. Add an admin-only panel summary: last run, fresh/stale/blocked counts, and the exact reason a control is not automatically collected.
6. Add a monthly digest record and notification-ready status, but do not send email/Telegram until an explicit notification channel is approved.

## Out of scope until separately approved

- Reading secrets, raw user records, voice content, support messages or database dumps.
- Direct GitHub access, third-party GRC integrations, App Check changes or new admin privileges.
- Claiming a clean operating cycle, approving risk, or auto-closing a human control.
- Running `npm audit`, full TypeScript builds or restore tests inside a Cloud Function.

## Data flow

```text
Cloud Scheduler
  -> soc2ReadinessCollectorCron
  -> bounded source adapters
  -> redacted manifest + SHA-256 fingerprint
  -> immutable Firestore manifest/run records
  -> server-owned automated projection (fresh / stale / blocked)
  -> admin workbench + export
```

Each manifest records `schemaVersion`, `runId`, `collectedAt`, `windowStart`, `windowEnd`, `source`, `controlId`, `evidenceId`, `populationSummary`, `result`, `exceptions`, `sourceRevision`, `checksum`, and ordered timestamps. Values are bounded; identifiers are hashed or counted. Failed adapters produce a visible failed result, never a green fallback.

## Human checkpoint

The owner receives one monthly review item in the admin panel. The owner must confirm the population and exceptions for access/change evidence and manually attach results for restore, incident, dependency and vendor controls. A “confirmed” decision is a separate append-only event with actor uid and timestamp; the collector cannot self-approve.

## Security and retention

- Firestore rules allow reads only to admins; clients cannot create, update or delete automated projections/manifests/runs.
- The existing manual journal remains separately writable by admins under its current schema; it is never treated as automatic evidence.
- Only the scheduled server identity can create manifests and projections; updates are rejected after creation.
- Evidence contains no secrets or raw PII. Original artifacts stay in an approved restricted store.
- Retention follows the draft evidence guide until owner/CPA approval; deletion/redaction is a separately audited operation.

## Acceptance criteria

- A scheduler run is idempotent for the same `runId` and writes no duplicate manifest.
- A source failure is visible as `failed`/`blocked` with a reason and does not increment completed controls.
- A fresh browser session sees the latest server projection without a manual sync.
- Firestore emulator/rules tests prove admin-only reads, server-only writes and immutable manifests/events.
- Unit tests cover source redaction, bounded limits, checksum determinism, stale calculation and retry behavior.
- The admin UI clearly distinguishes automatic evidence, manual evidence and “not collected”.

## Rollout

1. Implement pure adapters and tests.
2. Add the scheduled function and Firestore rules/indexes.
3. Add admin read-only summary and explicit review action.
4. Deploy functions/rules/admin hosting together, run one production canary, then enable the weekly schedule.
5. Keep the first two runs as internal dry-run evidence; do not count them as clean operating cycles.

## Technical-debt management

Every adapter has an owner, source contract, maximum population, freshness rule, failure mode and deprecation note. Unsupported sources remain visible as gaps. New integrations require a task packet, rules update, test fixture and evidence-manifest contract update in the same change.
