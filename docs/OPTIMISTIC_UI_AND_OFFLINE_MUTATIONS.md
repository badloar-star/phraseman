# Optimistic UI and Offline Mutations

This document is the Phraseman source of truth for local-first interaction behavior.

## Product invariant

No user-visible waiting for ordinary local-first actions. Rewards, inventory actions, toggles, reversible edits, and similar interactions update the visible state immediately. They do not show `Applying...`, block modal dismissal, or wait for a server response before presenting success.

The user action has three separate layers:

1. Update the in-memory UI immediately.
2. Persist the local intent/effect and, where available, append an idempotent account-scoped mutation to the durable outbox.
3. Synchronize in the background without owning the visible interaction lifecycle.

Closing a modal or navigating away must not cancel the background mutation.

## Offline and failure behavior

- A transient network failure keeps the optimistic state and uses the existing no-network notification.
- A queued mutation retries at the next supported connectivity, foreground, or sync opportunity.
- Server snapshots must not overwrite a newer local pending mutation.
- Retries must use a stable operation identifier where the backend/outbox supports idempotency.
- Queues, caches, and pending overlays are scoped to the current account generation and must not leak across account switches.
- A failed background operation must remain observable and retryable; it must not silently delete the pending local intent.

## Honest durability

Do not describe a flow as durably retryable unless it writes an outbox or journal record before clearing its source state. AsyncStorage alone across several independent writes is local-first but not a universal write-ahead guarantee: an OS kill or storage error between writes can leave partial state.

Flows without a durable journal should still use immediate optimistic UI, preserve failed inventory/state where possible, and be tracked for migration to the shared mutation journal.

## Exceptions

The optimistic rule does not authorize fabricated success for:

- payments, subscriptions, or entitlement verification;
- authentication, identity linking, or permissions;
- destructive actions that require authoritative confirmation;
- security-sensitive operations;
- competitive results or scarce shared resources whose outcome is genuinely server-authoritative.

These flows may show a focused pending state, but they must preserve stable geometry and explain the wait plainly.

## Review checklist

- Does the first frame after the action already show the intended result?
- Can the user close or navigate without waiting for network work?
- Is local intent persisted before its source item is removed when a durable outbox exists?
- Is retry account-scoped and idempotent?
- Does offline failure use the shared notification instead of a blocking error modal?
- Is any rollback protected from overwriting a newer user action?
- If durability is incomplete, is that limitation stated rather than hidden?
