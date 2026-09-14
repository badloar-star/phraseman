# Task Packet: Incident Response Readiness

## Scope

- Publish severity, command roles, privacy/legal escalation, evidence preservation and alert-to-runbook mapping.
- Record a no-production-mutation tabletop plan for account access or entitlement failure.
- Add a static gate against orphan alert IDs and missing response fields.

## Non-goals

- No live incident, production mutation, notification, deploy or cloud configuration change.
- No invented human names or on-call promises.

## Technical debt

- `PENDING_OWNER` and `PENDING_CONTACT` remain visible blockers until humans adopt the runbook.
- Tabletop lessons must become owned task packets; this packet does not claim rehearsal completion.

## Verification

- `node scripts/verify_incident_readiness.mjs`
- `node --check scripts/verify_incident_readiness.mjs`

## Evidence

- GREEN: `node scripts/verify_incident_readiness.mjs` → `alerts=4 tabletop=not_run`.
- GREEN: `node --check scripts/verify_incident_readiness.mjs`.

## Status

Runbook baseline complete; owner adoption and tabletop execution remain pending.
