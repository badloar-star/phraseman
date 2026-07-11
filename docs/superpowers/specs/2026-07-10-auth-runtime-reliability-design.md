# Phraseman Auth and Runtime Reliability Design

**Status:** Approved direction from the 2026-07-10 audit; implementation is split into independent release phases.

## Goal

Make provider sign-in, account deletion, cloud restore, deep links, hidden-tab runtime, and cold startup safe and measurably faster without removing existing functionality or weakening identity invariants.

## Constraints

- `auth_links/{providerUid}` remains the server-owned identity anchor.
- The client must not create or update `users/*` or `auth_links/*` through Firestore transactions.
- Full cloud deletion must not block local account exit.
- Account switching continues through `signOutAndWipeForAccountSwitch()`.
- Pending-deletion provider login must not mutate identity links or silently reopen the account.
- Existing clients and deployed Functions require a staged compatibility window.
- Every production change follows red-green-refactor and a narrow regression gate.
- The current worktree is dirty; each phase must preserve unrelated user changes and inspect its exact per-file diff.

## Rejected Approaches

### Patch only the visible waiting states

This would shorten or hide spinners while leaving deletion, restore, and account-isolation races intact.

### Rewrite auth, startup, navigation, and tab runtime together

This would make rollback and causal verification impractical. Several target files already contain unrelated uncommitted work.

### Recommended: isolated release slices

Each phase ships a complete safety boundary, has its own behavioral tests, and can be reviewed or rolled back independently.

## Phase 1: Durable Account-Deletion Dispatch

Split deletion into a short authenticated enqueue and an idempotent background worker. The client waits only for a bounded durable acknowledgement while provider authentication is valid, then performs the existing immediate sign-out and local wipe. If enqueue is unavailable, local exit still succeeds and the pending-deletion guard remains. A same-provider login retries enqueue before signing out again. Legacy `accountDeleteMine` remains available during client adoption.

The deletion job is Admin-only and stores no raw email. It records a deterministic job ID, hashed diagnostic identifiers, stable/auth IDs needed by the trusted worker, stage, attempts, timestamps, and terminal status. The worker resumes safely after partial failure and deletes Firebase Auth only after data cleanup reaches its safe terminal boundary.

## Phase 2: Boot Restore Coordinator

Replace the duplicate `_layout` restore logic with one account-scoped coordinator returning the detailed restore result. `failed` never authorizes upload or a hydration event. `not_found` may authorize an initial upload only when an authoritative shared predicate finds meaningful local account data. `restored` emits hydration once. Boot and provider auth use the same local-data predicate derived from `SYNC_KEYS`; name-only state is insufficient.

## Phase 3: Account-Generation Ownership

Introduce an in-memory `{stableId, generation}` context. Switch, deletion, and canonical stable-ID swap invalidate the generation before wipe/install. Every asynchronous restore applies ownership checks at the mutation boundary, not merely after network completion. Late work may finish reading but cannot write AsyncStorage, patch snapshots, change shards/premium state, schedule sync, or emit hydration for a superseded account.

## Phase 4: Canonical Deep Links

Create one pure parser for HTTPS, custom-scheme, relative, and Expo paths. It preserves custom-scheme host plus pathname and returns typed actions with deterministic idempotency keys. Cold intent, warm URL, referrals, and notification navigation share the parser and an exactly-once coordinator. The immediate patch covers invite, duel, and phrase routes. Apple verified-link/token-exchange migration remains a separate security rollout with old-client fallback.

## Phase 5: Custom-Tab Runtime Visibility

Keep navigation focus semantics unchanged for stack screens. Add a provider to every custom tab pane with active-tab, swipe-preview, and app-foreground state. A new runtime-visibility hook separates visual swipe readiness from permission to run timers, listeners, infinite animations, and expensive refreshes. Hot work migrates incrementally; freeze distance and premount policy do not change in the same patch.

## Phase 6: Cold-Start Scheduling

Prime the local snapshot above account-sensitive providers using the existing startup surface and a strict local-only time budget. Providers reconcile if the budget expires. Coalesce duplicate settings hydration. Separate first-frame hydration, first-content readiness, tab premount, heavy initialization, and cloud work so premount and heavy init do not burst in the same early window without measurement.

## Observability

Provider auth receives a correlation ID and phase durations for native provider UI, Firebase credential, link hint, identity callable, merge, restore dispatch, and completion. Optimization decisions use physical-device p50/p95/p99; static code inspection alone is not treated as proof of latency improvement.

## Verification and Rollout

Each phase must pass its focused unit/behavioral tests, mandated auth guards when applicable, Functions tests, `git diff --check`, exact-diff inspection, and advisor review. Release gates additionally include physical Google/Apple flows, offline/process-kill deletion, old-client compatibility, Android/Fabric navigation, hidden-tab runtime counters, and production deletion-job monitoring.

## Self-Review

- No placeholders or unresolved architecture choices remain for Phase 1.
- Destructive auth, restore, navigation, runtime visibility, and startup remain independently deployable.
- The design preserves existing user-visible capabilities and legacy deletion compatibility.
- Measured latency improvement is explicitly separated from static correctness fixes.
