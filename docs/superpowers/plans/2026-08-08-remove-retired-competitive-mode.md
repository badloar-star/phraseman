# Retired Competitive Mode Full Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely remove the retired Arena product from client, backend, admin tooling, assets, scripts, and tests while preserving the independent tournament product.

**Architecture:** Treat Arena as a deleted product boundary rather than hiding individual entry points. Remove its owned modules and exports, replace legacy reward handling with catalog-based unknown-reward fallbacks, and retain only generic fail-closed security/account-cleanup behavior needed for historical remote data. Tournament routes, functions, storage, and UI remain intact and receive explicit regression guards.

**Tech Stack:** React Native/Expo, TypeScript, Firebase Cloud Functions/Firestore, Jest, ESLint.

---

### Task 1: Define the removal boundary

**Files:**
- Create: `tests/retired_competitive_mode_full_removal_contract.test.ts`
- Preserve: `app/tournament_round.tsx`, `app/tournament_results.tsx`, `functions/src/tournaments.ts`

- [ ] Add a contract rejecting Arena-owned routes, modules, callables, reward IDs, question pools, assets, and scripts.
- [ ] Assert tournament client/server modules still exist and retain their public exports.
- [ ] Run the contract and confirm RED because live Flashcards Arena modules and backend pools still exist.

### Task 2: Remove client runtime and rewards

**Files:**
- Delete: `app/flashcards_arena.tsx`, `app/flashcards/arenaQuiz.ts`, `app/flashcards/arenaProgress.ts`
- Modify: client navigation, tasks, achievements, stats, sync, gifts, admin tester surfaces, and asset registries discovered by the contract.

- [ ] Back up the dirty Arena screen before deletion.
- [ ] Delete screens/helpers and every route, preload, and navigation registration.
- [ ] Remove Arena achievements, daily tasks, shard reasons, statistics, flags, and profile fields.
- [ ] Remove the Arena gift ID and use a generic catalog fallback for historical unknown gifts.
- [ ] Run focused client tests and the removal contract.

### Task 3: Remove backend and admin implementation

**Files:**
- Delete: Arena-owned modules under `functions/src` and `functions/src/content_factory`.
- Modify: `functions/src/index.ts`, `functions/package.json`, admin registries, content-factory contracts.

- [ ] Delete Arena callables, pools, generators, cron/admin exports, and deploy entries.
- [ ] Remove Arena-specific request/response fields and reward mutations.
- [ ] Preserve only generic fail-closed security and account cleanup needed for historical remote data.
- [ ] Run Functions TypeScript and focused backend tests.

### Task 4: Remove owned assets, scripts, and historical feature artifacts

**Files:**
- Delete: Arena-owned tracked paths under assets, asset sources, scripts, function scripts, SSIU, specs, and feature docs.
- Modify: bundle manifests and audit/generator registries referencing deleted assets.

- [ ] Resolve and verify every deletion target remains inside the project.
- [ ] Exclude tournaments and independent lesson vocabulary/content.
- [ ] Remove obsolete build/audit/upload scripts and generated question sources.
- [ ] Re-run path/token inventory and resolve every remaining active-code reference.

### Task 5: Verify product boundary

**Files:**
- Test: `tests/retired_competitive_mode_full_removal_contract.test.ts`
- Test: tournament contract suites.

- [ ] Run the removal contract and confirm GREEN.
- [ ] Run tournament tests and confirm no tournament file/export was removed.
- [ ] Run relevant Jest, Functions TypeScript, targeted ESLint, and `git diff --check`.
- [ ] Request independent read-only review and resolve every P0/P1 issue.

