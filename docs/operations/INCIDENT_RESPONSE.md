# Incident Response

## Severity

- **P0:** active compromise, destructive data loss, or broad entitlement/access outage.
- **P1:** material security/privacy exposure or Tier 0 journey failure with no safe workaround.
- **P2:** degraded Tier 1 journey or bounded control failure with workaround.
- **P3:** low-impact defect or evidence gap.

## Roles

Incident commander: `PENDING_OWNER`  
Technical lead: `PENDING_OWNER`  
Communications lead: `PENDING_OWNER`  
Privacy/legal escalation: `PENDING_CONTACT`

## First response

1. Create an incident record and preserve timestamps, request IDs, logs and relevant revisions.
2. Contain only through an approved reversible action; do not delete evidence.
3. Confirm user impact, security/privacy scope and affected Tier 0 journey.
4. Escalate P0/P1 to privacy/legal and the owner; communicate only verified facts.

## Alert-to-runbook map

| Alert ID | Trigger | Runbook section | Owner | Evidence retained |
| --- | --- | --- | --- | --- |
| `auth.recovery.failure` | recovery success rate below target | Auth/recovery | `PENDING_OWNER` | auth event aggregate + revision |
| `entitlement.confirmation.failure` | confirmed purchase lacks entitlement | Purchase/entitlement | `PENDING_OWNER` | receipt/operation IDs, redacted |
| `account.deletion.stall` | deletion queue exceeds target | Account deletion | `PENDING_OWNER` | job IDs + status |
| `progress.sync.conflict` | convergence errors exceed budget | Progress sync | `PENDING_OWNER` | operation IDs, no content |

Every alert above maps to a named runbook section and preserves evidence without raw credentials or user content.
