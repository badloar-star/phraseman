# Phraseman Economy Constitution

Owner decision: 2026-08-13. This contract supersedes every earlier shard or
star implementation note that calls an ordinary-gameplay server balance
"authoritative".

## 1. Non-negotiable invariant

An economic debit cannot exist without its exact result in the same immutable
operation. The system must make an orphan debit structurally impossible, not
merely compensate it later.

```text
prepare exact result
  -> persist durable intent
  -> commit { debit + grant + receipt } together
  -> expose result to UI
  -> append the same operation to cloud storage in background
```

The network is not part of the ordinary local commit boundary. A failed or
delayed cloud write never reverses a committed local operation.

## 2. Authority boundary

### Client-authored operations

The client owns personal progress and ordinary gameplay spending, including
energy, streak protection/revival, personal boosts, local wagers, official
packs, customization and equivalent future features.

The server is persistence-only for these operations. It may enforce account
ownership, immutable document shape and bounded document size. It must not:

- decide whether the client's local balance is sufficient;
- replace the operation's amount, reason, grant or result;
- return a lower balance and reconcile the device down to it;
- delete, rewrite or revoke a committed result;
- require a server receipt before the local result can exist.

### External confirmed events

Real-money purchases/refunds, transfers between people, community marketplace
settlement, admin commands and competitive outcomes are external facts. A
trusted server adapter may verify and append those facts. Each event remains
immutable, exactly-once and composite: a debit must be paired with its transfer,
entitlement or result in the same transaction.

An external adapter cannot rewrite client-authored history. Its output is a new
event.

## 3. Source of truth

The append-only operation journal is the source of truth. A displayed balance
is a projection/cache. Snapshot timestamps, last-write-wins merges and blind
`users/{uid}.shards` replacements are not authority.

Every client operation contains at least:

- schema version;
- stable `operationId`;
- owner stable id and account generation;
- direction and integer amount;
- reason;
- exact semantic grant/result;
- local revision and balance before/after for audit;
- creation time;
- immutable payload fingerprint.

## 4. Crash and retry contract

Before changing balance or entitlement storage, the client writes a durable
prepared intent. The commit stores operation receipt, balance projection and
all local grant writes together. Startup recovery replays any remaining intent
with the same operation id.

Replaying an identical operation is success with no second economic effect.
Reusing an operation id for different bytes is corruption and fails closed.

Cloud synchronization has an independent pending/synced marker. Removing a
pending marker never removes the operation.

## 5. Multi-device rule

Client-authored journals merge by immutable operation id, never by balance
snapshot timestamp. Once a result was committed on one device it is not taken
away. A concurrent overspend may create a user-favouring negative merged
projection; future ordinary spending is blocked locally until credits cover it,
but previous results remain owned.

Raw local storage writes are never uploaded and never executed from cloud data.
Only closed, validated semantic grants may materialize permanent entitlements on
another device, and their reducer runs inside the same account/storage lock as
the journal commit. A device-scoped or expiring result that cannot be restored
without duplication is retained as an audit fact but its debit is not applied to
another device's projection. Therefore no remote debit may exist without an
observable result on that device.

External confirmed events use their own globally idempotent source ids.

## 6. Forbidden implementation patterns

- standalone shard/star debit APIs;
- debit followed by a separate best-effort grant;
- any server write to `users/{uid}.shards` or its freshness metadata;
- `FieldValue.increment(-cost)` without an entitlement/transfer receipt in the
  same transaction;
- timestamp-based balance arbitration;
- cloud reconciliation that lowers a client operation projection;
- deleting a pending operation after permanent server rejection;
- claiming a refund before its reversal event is durable;
- generating a new operation id when retrying an ambiguous result.
- uploading or replaying arbitrary storage keys/values;
- applying a remote debit for an unknown, malformed, device-scoped or expired
  grant;
- computing a semantic entitlement snapshot outside the journal storage lock;
- using legacy `users.shards` to choose an external-event amount.

## 7. Required enforcement

- one economy module owns operation persistence and projection;
- Firestore Rules allow only owner-scoped immutable client operation writes;
- external event collections are server-write-only;
- source-contract tests reject new direct writers and standalone spend calls;
- fault-injection tests cover failure before commit, during commit, after
  commit/before response, retry, restart and account switch;
- schema changes update Jarvis contracts and explicit Firestore rules;
- telemetry reports orphan debit count, idempotency conflicts and unsynced
  operation age. The valid orphan debit count is always zero.

## 8. Migration rule

The legacy balance is imported once as an immutable opening-balance event per
account. Migration is idempotent and never interprets an older cloud snapshot
as newer economic history. Old setters/callables are removed only after all
their callers use client operations or external confirmed events.
