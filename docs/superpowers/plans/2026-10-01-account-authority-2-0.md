# PhraseMan Account Authority 2.0 Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with TDD and an independent review after every critical boundary. No task authorizes production deploy, Firestore mutation, real-user deletion, or device/EAS runs.

**Goal:** Replace the patchwork account/auth/session system with one serialized account authority that owns identity, device sessions, local account state, cross-device handoff, deletion, and migration while preserving only accounts, saved cards/SRS, and lesson progress required by PhraseMan 2.0.

**Architecture:** The app uses a server-owned `accountId` as the only domain owner; Firebase Auth UID, provider subject, local installation ID, device session ID, and operation ID are separate typed identifiers and are never interchangeable. A single client authority serializes boot, sign-in, sign-out, device takeover, deletion, hydration, and local commits. A server lease makes the newest authenticated device authoritative and revokes the previous device without making the UI wait for background cleanup. Local deletion is immediate and idempotent; remote purge is an independent server job that releases the provider identity immediately and retains only a tombstone/receipt for the defined retention window.

**Tech Stack:** TypeScript, React Native/Expo, Firebase Auth/Firestore/Callable Functions, SQLCipher-backed Account V2 scope storage, Jest, ESLint, existing migration inventory.

---

## Non-negotiable invariants

1. No screen, hook, or feature calls Firebase Auth, AsyncStorage account keys, `stable_id`, or `cloud_sync` directly to decide account ownership.
2. `accountId` is the only owner key for preserved domains: `lesson_progress` and `flashcards_srs` (including saved-card membership/tombstones).
3. `firebaseAuthUid`, provider subject, `deviceId`, `sessionId`, `operationId`, and `accountId` have distinct branded types and explicit conversion ports.
4. At most one authenticated device lease is active for an account. A successful login on device B revokes device A; A must close its local scope and become signed out on its next auth/session event.
5. A provider failure never destroys the last valid local account session. A successful sign-out closes local scope before Firebase sign-out completes.
6. Delete-account clears local account data synchronously before any network wait, releases the provider identity immediately, and makes retries idempotent. Remote purge is not part of the UI critical path.
7. Every local write captures an authority generation and is rejected if the generation, accountId, or session lease changed before commit.
8. Legacy auth/session/cloud-sync paths remain present only behind an explicit migration adapter until all runtime gates pass; they are not allowed to remain an untracked second authority.

## Source map and ownership

- Create `modules/account-authority-v2/account_authority_ids.ts`: branded identifiers and validation.
- Create `modules/account-authority-v2/account_authority_contract.ts`: authority state, commands, outcomes, and server/local ports.
- Create `modules/account-authority-v2/account_authority_reducer.ts`: pure serialized state machine; no Firebase/React imports.
- Create `modules/account-authority-v2/account_authority_runtime.ts`: one FIFO coordinator that binds the reducer to local scope, Firebase provider, and server lease ports.
- Create `modules/account-authority-v2/account_authority_local_store.ts`: only preserved local domains plus session metadata; no feature-specific account ownership.
- Modify `app/auth_provider.ts`: delegate provider login/logout/delete orchestration to the runtime; retain provider UI adapters only.
- Modify `app/cloud_sync.ts`: remove ownership decisions from cloud sync and expose migration-only adapters with explicit accountId/generation arguments.
- Modify `app/stable_id.ts`: treat the current installation identity as `deviceId` only; never use it as the domain account owner.
- Modify `app/accounts_v2_client_flag.ts` and `modules/account-session-v2/accounts_v2_client_runtime.ts`: expose the authority runtime and stop presenting Account V2 as an optional dual-write mirror once cutover gates pass.
- Create `functions/src/account_authority/`: lease start/revoke, identity release, delete job enqueue/status, and preserved-domain migration callables.
- Create `tests/account_authority_*`: reducer, runtime, local-store, device takeover, deletion, migration, and legacy-callsite guards.
- Update `docs/phraseman-2.0/HANDOVER_FOR_CLAUDE_2026-10-01.md` and `docs/phraseman-2.0/PROGRESS.md` after each bounded package with exact gates and NOT_RUN surfaces.

## Task 1: Establish the typed authority contract

**Files:**
- Create: `modules/account-authority-v2/account_authority_ids.ts`
- Create: `modules/account-authority-v2/account_authority_contract.ts`
- Test: `tests/account_authority_contract.test.ts`

- [x] Write failing tests for valid/invalid branded IDs, explicit Firebase-UID/provider-subject separation, and command/result discriminants.
- [x] Implement runtime validators and frozen contract types. Reject empty IDs, path traversal, and cross-kind assignment at the boundary.
- [x] Run the focused Jest suite and ESLint; independent read-only review PASS, no P1/P2.

## Task 2: Implement the pure authority reducer

**Files:**
- Create: `modules/account-authority-v2/account_authority_reducer.ts`
- Test: `tests/account_authority_reducer.test.ts`

- [x] Write RED tests for boot, authenticated session, provider cancellation, same-device resume, device takeover, sign-out, delete-local-first, and stale-generation commit rejection.
- [x] Implement a pure reducer/transition function. It must never perform I/O or silently invent an accountId.
- [x] Prove deterministic fenced transitions and that invalid/stale transitions leave the prior safe state unchanged; independent read-only review PASS.

## Task 3: Bind one FIFO runtime to local scope and lease ports

**Files:**
- Create: `modules/account-authority-v2/account_authority_runtime.ts`
- Create: `modules/account-authority-v2/account_authority_local_store.ts`
- Test: `tests/account_authority_runtime.test.ts`

- [x] Define ports for provider authentication, server lease, preserved-domain scope open/close, synchronous local clear, and operation idempotency.
- [x] Write RED race tests: A→B switch, queued sign-out/sign-in, same-UID resume, revoked lease, offline retry, and write-after-switch.
- [x] Implement one FIFO queue with generation/fence checks. Close A before opening B; never run two account scopes concurrently.
- [x] Make local clear synchronous from the caller’s perspective (before the first awaited remote operation); make remote operations retry-safe by operationId. Final focused gate 3 suites / 82 tests PASS; scoped ESLint PASS; fresh independent review PASS with no P1/P2. Includes durable monotonic generation, restart-safe destructive tails, boot-time fail-closed fencing, deferred-owner atomic bind, and bounded admission without evicting live work.

## Task 4: Implement server lease and identity-release contracts

**Files:**
- Create: `functions/src/account_authority/lease_contract.ts`
- Create: `functions/src/account_authority/lease_handlers.ts`
- Create: `functions/src/account_authority/delete_contract.ts`
- Test: `functions/src/account_authority/lease_contract.test.ts`
- Test: `functions/src/account_authority/delete_contract.test.ts`
- Modify: `functions/src/index.ts` only after source gates pass

- [x] Write tests for one active device lease, idempotent same-device renewal, newest-device revocation, stale lease rejection, immediate provider-identity release, and delete-job idempotency. Final focused gate: 2 suites / 30 tests PASS; scoped ESLint and Functions TypeScript PASS; fresh independent critical review PASS with no P1/P2.
- [x] Implement pure handlers first; then add Firebase adapters with rules/index requirements recorded in the same package. Pure contracts/handlers now enforce trusted auth-derived device identity, server-issued sessions, tenant/lifecycle tombstones, keyed retired-session reads, and durable idempotency claims.
- [x] Keep remote purge asynchronous and bounded; never block UI sign-out/delete on purge completion. Provider-release retry claims, expiry redaction schedule, purge claim/idempotency/cursor/liveness guards are contract-enforced.

## Task 5: Integrate provider auth through the authority

**Files:**
- Modify: `app/auth_provider.ts`
- Modify: `app/accounts_v2_client_flag.ts`
- Modify: `modules/account-session-v2/accounts_v2_client_runtime.ts`
- Test: `tests/account_authority_auth_provider_wiring.test.ts`

- [x] Add RED guards proving provider callbacks cannot open/close account scope outside the authority runtime. Focused auth-provider wiring/bridge/runtime coverage is green; provider failure identity correlation and cleanup precedence are covered.
- [x] Route sign-in, sign-out, account switch, and startup reauth through the authority runtime. Focused aggregate: 7 suites / 200 tests PASS; fresh critical review PASS with no P0/P1/P2.
- [x] Keep Google/Apple UI credential acquisition as a thin adapter; accountId/session/lease decisions stay in the authority. Changed/unknown provider identity fails closed; only explicitly preserved identity may restore the previous scope.
- [x] Keep the global cutover flag off until Tasks 1–4 and migration evidence are green. The flag remains hardcoded OFF; production bootstrap/adapters and migration evidence remain open.

## Task 6: Migrate only preserved domains

**Files:**
- Modify: `functions/src/accounts_v2_migration/*`
- Modify: `modules/account-session-v2/account_v2_hydration.ts`
- Modify: `app/cloud_sync.ts`
- Test: `tests/account_authority_preserved_domains.test.ts`
- Test: `functions/src/account_authority/preserved_domains.test.ts`

- [x] Make migration carry only lesson progress, saved cards/SRS, and card membership/tombstones; keep existing 2.0 account/coin/streak domains via explicit adapters; drop XP/leagues/season/arena/retired systems. Bounded policy contract is green.
- [x] Require accountId mapping and verified hydration before marking migration complete. Completion and preserved writes require mapped accountId + verified hydration + zero compatibility blockers.
- [x] Add old-client/version compatibility guard so an old writer cannot silently recreate legacy state after cutover. Unknown protocol/phase/operation and malformed rollback flags fail closed.

## Task 7: Retire legacy account authority

**Files:**
- Modify: `app/cloud_sync.ts`, `app/stable_id.ts`, `app/account_generation.ts`, legacy account screens/hooks
- Test: `tests/account_authority_legacy_callsite_guard.test.ts`
- Docs: `docs/phraseman-2.0/HANDOVER_FOR_CLAUDE_2026-10-01.md`, `docs/phraseman-2.0/PROGRESS.md`

- [x] Run a source census and make every account owner decision pass through the authority. A test-only ratcheting guard now covers 8 legacy ownership files, 210 classified occurrences/42 categories, 326 ownership callsites and 17 imports, plus 11 authority/cutover clean-zone files; aliases and deep-relative imports are binding-resolved.
- [ ] Remove direct legacy ownership calls only after emulator/device gates and migration rollback evidence are green.
- [ ] Keep a time-bounded read-only compatibility layer for preserved data, never a second writer.

## Task 8: Release gates

- [x] Unit/source gates: reducer/runtime/functions/migration tests, strict TypeScript, scoped ESLint, legacy-callsite guard. Bounded integrated slice is green; full release acceptance remains open.
- [ ] Emulator gates: first login, second-device takeover, offline reconnect, interrupted migration, deletion retry, old-client rejection.
- [ ] Device gates: Android SQLCipher scope, iOS native storage, background/foreground resume, revoked-device sign-out.
- [ ] Release gates: backup/restore evidence, rules/indexes/functions deployed together, 3 owner test accounts, rollback window, then owner-authorized 2.0 rollout.

## Current checkpoint

The repository currently has an Account V2 dual-write/hydration implementation and reviewed authority/migration source contracts, but legacy auth/session/cloud-sync remains authoritative. Therefore the overall goal is **not complete**. Tasks 1–7 and the bounded Task 8 source gate are green. Real adapter/callable wiring, emulator/device, backup/restore, rollback and owner-authorized release gates remain open. No production or device mutation is implied by this plan.
