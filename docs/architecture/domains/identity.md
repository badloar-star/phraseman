# Identity domain contract

## Owner

Account & Identity engineering owns implementation; Security approves boundary changes; Support operates documented recovery flows.

## Source of truth

Runtime identity linking is defined by [auth_identity.ts](../../../functions/src/auth_identity.ts), client session state by [auth_provider.ts](../../../app/auth_provider.ts), deletion by [account_delete.ts](../../../functions/src/account_delete.ts), and access policy by [firestore.rules](../../../firestore.rules).

## Authority

Firebase Auth UID is the account principal. Server code is authoritative for privileged identity linking and deletion orchestration; the client may cache session state but cannot mint claims or authorize protected writes.

## Invariants

One durable account maps to one canonical UID; anonymous upgrade/relink preserves owned progress; privileged actions re-check authenticated identity; deletion quarantine and tombstone state cannot be bypassed by a stale client.

## Idempotency

Link/recovery and deletion jobs must tolerate retries and converge on the same identity or terminal deletion state. Replays must not create a second account, duplicate cleanup, or resurrect quarantined data.

## Offline behavior

Cached local progress may remain usable where product policy allows, but offline state cannot grant a new server identity, custom claim, or completed deletion. Reconnection must reconcile against canonical identity state.

## Security and privacy

Tokens, provider identifiers, recovery hints and deletion evidence are sensitive. Log identifiers minimally, never credentials; apply least privilege and retain deletion evidence only for its documented purpose.

## Recovery

Use canonical relink/recovery hints for recoverable provider failures. Account deletion uses the quarantine/job path and its retry controls; manual repair requires an audited admin action. RTO/RPO are not yet owner-approved.

## Owning tests

[auth_identity.test.ts](../../../functions/src/auth_identity.test.ts), [auth_identity_anon_relink.test.ts](../../../tests/auth_identity_anon_relink.test.ts), [account_delete.test.ts](../../../functions/src/account_delete.test.ts), and [account_delete_quarantine_authority.test.ts](../../../tests/account_delete_quarantine_authority.test.ts).
