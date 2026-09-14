# Admin commands domain contract

## Owner

Operations owns command use; Platform owns callable implementation; Security approves authorization changes; Compliance owns audit evidence requirements.

## Source of truth

The only live admin UI is [admin/v2/legacy.html](../../../admin/v2/legacy.html). Authorization is defined by [admin_access_controls.ts](../../../functions/src/admin_access_controls.ts), audit evidence by [admin_audit_log.ts](../../../functions/src/admin_audit_log.ts), and callable options by [callable_options.ts](../../../functions/src/callable_options.ts).

## Authority

Server callables are authoritative for privileged mutations and require an authenticated `admin: true` claim. The browser UI may request and display an action but cannot authorize it. Admin App Check remains disabled until an explicit owner decision and completed provider setup.

## Invariants

Every sensitive action validates actor and target server-side, emits durable audit evidence, and exposes an honest result. Preview publishing cannot mutate Firestore or send user notifications. The retired white admin and frozen admin files are not implementation surfaces.

## Idempotency

Commands that can be retried require stable operation IDs or an equivalent duplicate guard. Retrying must not double-grant, double-ban, double-send, or duplicate an audit event while reporting success accurately.

## Offline behavior

Privileged commands are unavailable offline. The UI must not optimistically claim completion; it may preserve a draft, but execution and resulting state require a server receipt.

## Security and privacy

Apply least privilege, avoid exposing secrets and unrelated user fields, record actor/reason/result, and protect audit evidence from ordinary users. App Check must not be enabled by implementation inference.

## Recovery

Use audited compensating commands where supported; do not edit production state ad hoc. Failed or ambiguous calls remain visible for reconciliation. RTO/RPO and break-glass ownership remain unapproved.

## Owning tests

[admin_access_controls.test.ts](../../../functions/src/admin_access_controls.test.ts), [admin_audit_log.test.ts](../../../functions/src/admin_audit_log.test.ts), [admin_single_surface_contract.test.ts](../../../tests/admin_single_surface_contract.test.ts), and [admin_final_sensitive_writes_contract.test.ts](../../../tests/admin_final_sensitive_writes_contract.test.ts).
