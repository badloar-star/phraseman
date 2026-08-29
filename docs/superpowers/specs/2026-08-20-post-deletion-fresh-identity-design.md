# Phraseman Post-Deletion Fresh Identity Design

**Status:** Approved by the owner on 2026-08-20; one-tap provider re-entry decision clarified by the owner on 2026-08-28.

## Goal

After a person deletes an account, Phraseman must immediately present the normal new-user onboarding and must converge, without manual support or reinstalling the app, on a wholly new anonymous identity. The deleted provider UID, stable IDs, progress, names, and entitlements must never be restored, linked to the new identity, or used for a new cloud write.

This design extends the account-deletion and identity boundaries in `2026-07-10-auth-runtime-reliability-design.md`. It addresses the production failure in which an old Keychain `stable_id` remained retired by a server tombstone, `authEnsureStableLink` returned `account_delete_pending`, and nickname reservation displayed the misleading generic “check your internet” message forever.

## User Experience Contract

- The successful local point of no return opens the existing clean onboarding immediately.
- Onboarding looks and behaves like the ordinary first-install experience. There is no recovery wizard and no technical account-deletion screen.
- Onboarding and local learning remain usable without a network connection.
- Cloud-dependent actions attempted before the fresh identity is ready are retained for the current account generation and retried; they must not execute under the retired identity.
- A nickname entered during onboarding is retained locally. Reservation resumes automatically when the fresh identity is ready. A real name conflict uses the normal “name taken” flow; an identity transition must never be presented as a network or name-availability failure.
- The same external Google or Apple account creates the new empty profile in the same sign-in attempt; the person is never asked to open the provider picker a second time. When the authoritative retired error identifies only the old stable ID (`details.subject === 'stable'`), the freshly authenticated, non-retired provider Firebase UID remains signed in while the client durably wipes old local data, clears the retired stable ID, creates a fresh stable ID, and authoritatively links that exact fresh pair. Local destructive cleanup is one operation-scoped flight after old-generation writer drains; phase writes and terminal cleanup are serialized so a late SecureStore write cannot regress or resurrect the guard.
- For a local deletion, the provider picker must not open until the server has atomically persisted the closure/tombstones/permanent denials, idempotently deleted the old Firebase Auth UID, and published a short-lived `credential_safe` receipt. The server first commits a root denial fence, discovers the alias/merge closure under that fence, then atomically writes every member denial plus the sorted `identityClosure`/hash/version/cutoff job and advances the receipt to `closure_committed`; no worker job exists before that commit. The worker consumes only this frozen array and never rediscovers mutable aliases. Mutable identity indexes are transactionally reread and deleted only while their current stable owner remains in the frozen closure. A lost enqueue response is repaired through an unauthenticated, App-Check-disabled status callable keyed by `operationId` plus a high-entropy capability stored only in SecureStore. The callable returns no identity data, compares the capability hash in constant time, enforces a fixed repair rate window, and never extends the capability lifetime on retry; once fencing is irreversible, a valid sealed capability remains repairable after retention TTL, and terminal `credential_safe` remains observable.
- When retirement identifies the authenticated UID, the full deletion closure, or an unknown legacy subject, the client remains fail-closed: it signs out and rotates through a fresh anonymous identity before any new cloud write.
- Every Firebase UID and stable ID in the deleted identity closure remains permanently retired. A provider credential must never make one of those retired identifiers reusable.
- Email/code recovery is not a user-facing account path. Ordinary Google/Apple sign-in restores a live profile automatically; after deletion it creates the new empty profile. No deleted data, progress, name, entitlement, avatar, or aura is restored.

## Non-Negotiable Identity Invariants

1. A retired provider UID or stable ID is never reusable.
2. A new stable ID is not created until the old provider session is signed out or authoritatively proven absent.
3. The new anonymous Firebase UID differs from every auth UID in the deletion identity closure.
4. The new stable ID differs from every stable ID in the deletion identity closure.
5. Fresh identity state is `ready` only after an authoritative server call confirms the exact pair `auth_links/{newAuthUid}.stable_id == newStableId` and the corresponding server user identity exists.
6. Client success, timeout, a different UUID, or a locally cached auth link is not proof of readiness.
7. Server tombstones and permanent denials survive local transition-record cleanup. They prevent resurrection and are not user progress.
8. A failed or interrupted transition is resumable and idempotent. Repeating a phase cannot restore old data, charge twice, create duplicate identities, or advance without its proof.
9. Every asynchronous write is bound to the current account generation. Work started under a retired generation may finish reading but cannot mutate local or remote state.

## Durable Transition State Machine

One coordinator owns the transition, keyed by the existing deletion `operationId`:

```text
prepared
  -> local_data_cleared
  -> server_enqueued
  -> provider_signed_out
  -> old_stable_cleared
  -> anonymous_authenticated
  -> stable_link_verified
  -> ready
```

The transition record is stored durably in protected local storage and mirrored only as required for crash recovery. Each phase records its proof before advancing. The coordinator runs:

- immediately after the fast deletion handoff;
- while the normal onboarding is visible;
- when authentication or connectivity returns;
- at app foreground;
- at cold start before cloud mutations are enabled.

The local transition record may be deleted only after `ready`. Failure to delete that record is harmless because all phases are idempotent and `ready` is terminal. Server privacy markers are never removed by this cleanup.

### Phase proofs

- `prepared`: a durable local deletion guard exists; old local data and onboarding completion keys are scheduled for immediate wipe.
- `local_data_cleared`: old account data, snapshots, onboarding completion keys, customization/avatar/aura state, phone-state SQLCipher lineage, and account-scoped pending work are absent; a strict storage readback succeeded and found no AsyncStorage key except the non-secret deletion-guard mirror. Any wipe, clear, readback, or phone-state retirement failure keeps `prepared`; only after this proof may clean onboarding mount or a fresh generation begin.
- `server_enqueued`: the server durably acknowledged an immutable deletion job and its identity closure.
- `provider_signed_out`: Firebase has no active non-anonymous provider session belonging to the deleted account.
- `old_stable_cleared`: SecureStore, legacy SecureStore aliases, AsyncStorage, in-memory caches, and pending auth-link caches no longer contain a retired stable ID.
- `anonymous_authenticated`: `auth.currentUser` exists, is anonymous, has a refreshed token, and its UID is not retired.
- `stable_link_verified`: an authoritative `authEnsureStableLink` response confirms the exact new auth/stable pair and the server-side identity document.
- `ready`: the coordinator has installed a new account generation and opened cloud mutation gates for that generation only.

## Client Architecture

### `ensureFreshPostDeletionIdentity()`

Introduce one high-level, idempotent entry point for post-deletion identity convergence. It must:

- resume the durable transition from its last proven phase;
- sign out a denied provider or anonymous Firebase UID;
- clear every retired stable-ID representation;
- create and verify a new anonymous Firebase session;
- create a new stable ID only after provider sign-out;
- require authoritative server-link verification;
- return a typed state such as `ready`, `pending_offline`, `pending_auth`, or `fatal_local_guard`, never a bare boolean;
- invalidate stale name/auth-link caches when account generation changes.

Low-level helpers such as `ensureStableAuthLinkForStableId()` must not independently decide that a post-deletion transition is complete.

### Unified cloud mutation gate

Nickname reservation and generation, sync, leagues, Arena, friends, referrals, and future cloud mutations must enter through a shared identity-readiness gate. The gate has three outcomes:

- `ready`: execute with the verified current pair;
- `pending`: persist or retain the account-generation-bound intent and retry later;
- `retired`: invoke `ensureFreshPostDeletionIdentity()` and do not execute the original operation under the old identity.

Direct Firestore fallbacks that attempt to create identity documents are forbidden. Stable-link creation and repair remain server-owned.

### Onboarding and nickname handling

The existing `CleanOnboarding` remains the only user-facing flow. Showing onboarding does not imply that cloud identity is ready.

When the user submits a nickname before readiness:

1. store the desired nickname locally under the fresh account generation;
2. mark the reservation intent pending;
3. continue the normal onboarding;
4. retry after `post_delete_identity_ready` or connectivity/auth recovery;
5. distinguish `taken` from transition/offline states;
6. if the name is genuinely taken, ask for another name through the existing normal UX.

Manual nickname reservation and generated nickname reservation must use the same readiness gate and retry semantics.

## Server Architecture

### Immutable deletion identity closure

`accountDeleteEnqueue` must not silently replace the client-requested stable ID with the current `auth_links` anchor. Before acknowledging deletion, the server must build and atomically persist the complete set of identities it can prove belong to the authenticated person:

- requested stable ID, when ownership is proven;
- `auth_links/{authUid}` anchor;
- stable IDs whose `users.firebaseAuthUid` or linked-auth ownership matches;
- canonical and alias identities from completed merge/repair records;
- the authenticated provider UID.

The immutable job stores this `identityClosure`. Permanent denials/tombstones are written for the complete proven closure before success is returned. A requested ID whose ownership cannot be proved causes a safe rejection; it is never silently substituted and never used to delete an unrelated account.

Any collection or field changes in this contract require matching Firestore Rules and Jarvis data-contract updates in the same implementation change.

### Structured retired-identity error

Identity callables must return a stable machine-readable failure such as:

```text
failed-precondition / identity_retired
details.subject = auth | stable | closure
details.recovery = create_fresh_anonymous
```

No raw retired identifier is returned in error details. Existing `account_delete_pending` remains accepted during the compatibility window and is normalized by new clients to `identity_retired`.

The client failure classifier must preserve this state instead of collapsing it into `identity_unavailable` or `transport_unavailable`.

## Failure and Recovery Rules

- Offline after `local_data_cleared`: show normal onboarding, perform no old-identity cloud writes, and resume enqueue when connectivity returns.
- Process death after any phase: resume from durable proof; do not rerun earlier destructive work unnecessarily.
- Anonymous sign-in returns no authenticated user: remain pending and retry; never report `ready` from a locally generated stable ID alone.
- Authoritative link call fails: retain the new candidate identity and retry safely; cloud mutations remain closed.
- The current Firebase anonymous UID is itself denied: sign it out, create another anonymous UID, and continue without deleting server privacy markers.
- SecureStore deletion fails: do not create a new stable ID that could coexist with the retired one. Retry the protected-storage phase while allowing only local onboarding state.
- The local transition record is malformed but a deletion anchor exists: fail closed for cloud mutations and present a recoverable local safety state; do not guess identity ownership.
- A stale old client sends `account_delete_pending`: the server remains fail-closed and never relinks or recreates the retired identity.

## Observability and Support

Record privacy-conscious phase telemetry keyed by a deletion-operation correlation hash, not raw email or nickname:

- current transition phase and time in phase;
- retry count by failure class;
- anonymous-auth creation success/failure;
- authoritative stable-link verification success/failure;
- pending nickname age;
- convergence to `ready`.

Support diagnostics should expose app version, transition phase, and a short new-account identifier only after the fresh identity exists. They must not expose retired raw identifiers.

## Required Regression Matrix

### Identity and deletion

- Requested stable ID `A` plus proven auth-link stable ID `B` persists a closure containing `A`, `B`, and the auth UID; the worker handles the complete closure.
- An unproved requested ID is rejected before deletion acknowledgement.
- Permanent denials are written before any deleted identity can be relinked.
- A retired Firebase provider UID remains blocked. If the server proves only the old stable ID is retired, the same sign-in attempt may keep its fresh provider UID and authoritatively attach a new stable ID to the new empty profile.
- A stale Keychain stable ID receiving `account_delete_pending` or `identity_retired` rotates to a new anonymous UID/stable ID pair and verifies it authoritatively.

### State-machine resilience

- Offline immediately after `local_data_cleared` permits normal onboarding and zero old-generation cloud writes.
- Crash and restart after each phase converge to `ready` without identity reuse.
- Failed `signInAnonymously` cannot produce `ready`.
- A created anonymous user with a failed auth-link callable cannot produce `ready`.
- SecureStore clear failure cannot create a second active stable ID.
- Repeated coordinator runs are idempotent.

### Consumers

- Manual and generated nickname paths do not call the low-level stable-link helper directly and do not write `users/*` directly.
- A pending onboarding nickname resumes after `post_delete_identity_ready`.
- A real taken-name response remains distinct from offline and identity-transition responses.
- Sync, leagues, Arena, friends, and referrals cannot execute under a retired account generation.
- No old `users`, `name_index`, leaderboard, progress, entitlement, or economy document is recreated after `prepared`; no old local profile is visible after `local_data_cleared`.

### Mandatory focused gates

- `tests/auth_provider_stable_link.test.ts`
- `tests/account_delete_flow_contract.test.ts`
- `tests/account_delete_quarantine_authority.test.ts`
- `tests/account_delete_quarantine_behavior.test.ts`
- `tests/stable_id.test.ts`
- `tests/auth_identity_anon_relink.test.ts`
- `tests/firestore_rules_security.test.ts`
- nickname behavior and reconciliation suites
- Functions account-deletion enqueue, worker, and auth-identity suites
- Firestore emulator tests for closure ownership, tombstones, and relink denial

The existing account-deletion worker test/policy disagreement over expired failed jobs must be resolved explicitly. A permanent denial may remain, but the worker/job retention rule and its connected test must state the same contract before release.

## Rollout

1. Add failing behavioral tests for the production `account_delete_pending`/nickname incident and deletion-closure substitution.
2. Deploy backward-compatible server error details and complete identity-closure persistence. Keep old-client behavior fail-closed.
3. Ship the durable client coordinator and authoritative readiness proof.
4. Migrate nickname paths, then the remaining cloud mutation consumers, to the unified gate.
5. Enable recovery telemetry and monitor phase age and convergence failures.
6. Release only after physical iOS Keychain, Android provider-switch, offline, process-kill, and old-provider re-entry tests pass.

No App Check admin changes are part of this design. No deleted user progress or entitlement restoration is permitted.

## Acceptance Criteria

- Every successful local deletion enters the ordinary clean onboarding immediately.
- Every reachable post-deletion state either converges automatically to a verified fresh anonymous identity or remains safely local with an explicit retryable transition state.
- No retired auth or stable identity can be linked, written through, or resurrected.
- No identity-transition failure is shown as “check your internet” or “name unavailable.”
- Reinstalling the app is never required for recovery.
- Support can identify the transition phase without access to deleted personal data.

## Rejected Approaches

### Patch nickname only

This leaves the same retired identity active for sync, leagues, Arena, and future cloud consumers.

### Rotate on every generic identity error

This could destroy or detach a valid account during a transient outage. Rotation is permitted only for an authoritative retired-identity response or the durable post-deletion transition.

### Let the server manufacture the new client identity

The server cannot safely clear Keychain or prove which local generation owns unsynced onboarding state. It should authorize and verify identity pairs, while the client owns local identity rotation after provider sign-out.

## Self-Review

- No placeholders or unresolved owner choices remain.
- The normal onboarding requirement is explicit and independent from cloud readiness.
- The design distinguishes local transition state from permanent server privacy denials.
- Readiness requires both anonymous Firebase authentication and authoritative stable-link verification.
- Offline and crash recovery are specified for every destructive boundary.
- The design fixes complete deletion targeting rather than only the visible nickname symptom.
- The rollout preserves old-client fail-closed behavior and does not weaken deletion privacy.
