# Remove Constellations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Constellations game from the repository while preserving the existing Arena, duels, rankings, shared rewards, and unrelated in-progress work.

**Architecture:** Remove entry points first, then delete isolated client/server modules, and finally remove configuration and ratchet references. A read-only contract test guards against reintroducing routes, exports, Firestore contracts, or deploy entries. Production Cloud Functions and stored Firestore data are inventoried but are not destructively deleted by this repository-only change.

**Tech Stack:** React Native/Expo Router, TypeScript, Firebase Functions, Firestore rules/indexes, Jest.

---

### Task 1: Add the removal contract

**Files:**
- Create: `tests/constellations_removed_contract.test.ts`

- [ ] Write a test that reads the Arena lobby, root layout, remote flags, Functions index/package, Firestore rules/indexes, and OpenAI job config and rejects active Constellations identifiers.
- [ ] Run `npm test -- --runInBand tests/constellations_removed_contract.test.ts` and confirm it fails on the existing implementation.

### Task 2: Remove client entry points and modules

**Files:**
- Modify: `app/arena_lobby.tsx`, `app/_layout.tsx`, `app/remote_flags.ts`, `app/premium_context.ts`, `app/paywall_copy.ts`, `app/product_analytics_screen_registry.ts`
- Delete: `app/constellation_*`, `app/constellations_hex.ts`, `app/services/constellations_db.ts`, `app/types/constellations.ts`

- [ ] Remove only Constellations imports, routes, flags, paywall context, and analytics screen IDs.
- [ ] Delete the isolated client implementation files.
- [ ] Preserve ordinary Arena/duel navigation and ranking stars.

### Task 3: Remove server implementation and deployment entries

**Files:**
- Modify: `functions/src/index.ts`, `functions/src/openai_jobs_config.ts`, `functions/package.json`
- Delete: `functions/src/constellations/`

- [ ] Remove the callable, admin handler, queue trigger, and deploy allowlist entries.
- [ ] Remove only the Constellations OpenAI job key; preserve the shared OpenAI jobs framework.
- [ ] Delete the isolated server implementation and its tests.

### Task 4: Remove Firestore and test contracts

**Files:**
- Modify: `firestore.rules`, `firestore.indexes.json`, `tests/firebase_cost_controls_contract.test.ts`, `tests/owner_direction_runtime_contract.test.ts`, `tests/perf_freeze_contract.test.ts`, `tests/product_analytics_screen_registry.test.ts`, `tests/runtime_lifecycle_ratchet.test.ts`

- [ ] Remove Constellations-only rules, indexes, and ratchet entries.
- [ ] Keep all shared security rules and ordinary Arena assertions intact.

### Task 5: Verify the final repository state

- [ ] Run the removal contract and focused affected tests.
- [ ] Build Functions so generated output no longer contains deleted modules.
- [ ] Search active app, Functions, rules, indexes, package scripts, and tests for remaining identifiers; classify historical documentation separately.
- [ ] Inspect the final diff and obtain Advisor approval.

### Production follow-up (not executed here)

- [ ] Confirm the production feature flag is disabled and no matches are active.
- [ ] Separately authorize and execute deletion of already deployed functions and any retained Firestore data according to a retention decision.
