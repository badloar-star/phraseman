# Arena language contours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Arena a fully target-isolated English, Spanish, French and German learning surface with target-specific generation, review and publication gates.

**Architecture:** Introduce one explicit Arena target registry and bind it to task documents, queues, match plans and pool selection. Preserve the five Arena modes and the retired Tournament boundary, while adding a target-aware admin workflow and fail-closed deterministic plus reviewer quality receipts.

**Tech Stack:** Expo/React Native, TypeScript, Firebase Functions/Firestore, Jest, `admin/v2/legacy.html`.

---

### Task 1: Establish the target contract

**Files:**
- Create: `modules/arena/target_registry.ts`
- Create: `functions/src/arena_target_registry.ts`
- Create: `tests/arena_target_registry.test.ts`
- Create: `functions/src/arena_target_registry.test.ts`
- Modify: `app/arena_target_gate.ts`

- [ ] Define `ArenaStudyTarget` as `en | es | fr | de`, exact target metadata, source locale, speech locale and supported modes.
- [ ] Write tests that reject every other code and prove every registered target has five modes, a locale and a profile.
- [ ] Replace the dead English-only availability helper with a registry-backed helper that requires explicit readiness, never an English fallback.

### Task 2: Make task content target-addressable and validate it

**Files:**
- Modify: `functions/src/tournament_core.ts`
- Modify: `functions/src/tournament_pool_v11_candidates.ts`
- Modify: `functions/src/tournament_pool_v11_factory.ts`
- Create: `functions/src/arena_target_quality.ts`
- Create: `functions/src/arena_target_quality.test.ts`
- Modify: `functions/src/tournament_core.test.ts`

- [ ] Add required immutable `studyTarget` to candidate/task/provenance/publication models and include it in canonical hashes and semantic duplicate keys.
- [ ] Extend new-room validation to fail for missing/unknown target, duplicate normalised choices, duplicated correct option, invalid target tokenisation and missing per-distractor reason.
- [ ] Implement profile validators for Spanish, French and German morphology/grammar distractors; return stable error codes rather than guessing corrections.
- [ ] Prove in unit tests that a valid English task cannot validate as Spanish/French/German and that every invalid distractor family is rejected.

### Task 3: Target-isolate Arena runtime

**Files:**
- Modify: `functions/src/arena_v2.ts`
- Modify: `functions/src/arena_v2_core.ts`
- Modify: `functions/src/arena_config_contract.ts`
- Modify: `functions/src/admin_arena_config.ts`
- Modify: `firestore.indexes.json`
- Modify: `firestore.rules`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts` if a new server-read field/collection is introduced
- Modify: `functions/src/arena_v2_core.test.ts`
- Modify: `functions/src/arena_v2_backend_contract.test.ts`
- Modify: `functions/src/arena_v2_rules.emulator.test.ts`

- [ ] Require target at Arena home, queue, bot, friend, today, plan and finish boundaries; write it to immutable queue/match/private-plan documents.
- [ ] Filter pool queries by target and require the pool’s target-specific publication fingerprint.
- [ ] Reject mismatches before a match mutation; preserve legacy completed-match read compatibility but prohibit untagged tasks in new matches.
- [ ] Add the `tournamentTasks:poolVersion,studyTarget,mode,difficulty,__name__` index and Rules/Jarvis evidence where applicable.
- [ ] Test quick, ranked, friend, bot and today paths for cross-target rejection plus same-target success.

### Task 4: Wire the app and prevent stale UI data

**Files:**
- Modify: `app/arena_client.ts`
- Modify: `app/(tabs)/arena.tsx`
- Modify: `components/arena/ArenaHubSurface.tsx`
- Modify: `app/arena_matchmaking.tsx`
- Modify: `app/arena_match.tsx`
- Modify: `app/arena_today.tsx`
- Modify: `modules/arena/contract.ts`
- Modify: `modules/arena/duel_plan.ts`
- Modify: `modules/arena/task_adapter.ts`
- Create: `tests/arena_language_isolation.test.ts`

- [ ] Resolve the active study target once per entry and pass it to every Arena callable.
- [ ] Display a localized unavailable state when that target’s pool is not ready; do not mount a match search.
- [ ] Require plan/task target equality before rendering; fail closed to the recovery state when a stale response belongs to another target.
- [ ] Add tests proving all client entry points carry target and the UI cannot adapt an English payload inside a non-English plan.

### Task 5: Build target-specific generation and quality receipts

**Files:**
- Create: `functions/src/arena_content_generation.ts`
- Create: `functions/src/arena_content_generation.test.ts`
- Create: `functions/src/arena_content_review.ts`
- Create: `functions/src/arena_content_review.test.ts`
- Modify: `functions/src/admin_tournament_tasks.ts`
- Modify: `functions/src/index.ts`

- [ ] Create target profiles whose prompt packet specifies target language, source language, CEFR envelope, task-mode grammar rules, distractor taxonomy and required explanation format.
- [ ] Keep generated material draft-only; make deterministic failures and four reviewer receipts (`pedagogy`, `nonsense`, `distractors`, `target_isolation`) block publication.
- [ ] Scope draft ledgers, repair attempts, semantic keys, task ids and publication manifests by target.
- [ ] Export only the new Arena content callables; do not export/re-enable the retired Tournament callable surface.
- [ ] Test that editing a draft invalidates receipts, any non-PASS receipt blocks publish, and equivalent content may exist across targets but not duplicate within one target.

### Task 6: Add the live admin workspace

**Files:**
- Modify: `admin/v2/legacy.html`
- Modify: `tests/admin_single_surface_contract.test.ts`
- Create: `tests/arena_admin_language_generator_contract.test.ts`
- Modify: `tests/e2e/r7/admin_content_factory.spec.ts` when a stable admin journey exists

- [ ] Add an Arena Content panel inside the existing Content category with a labelled target selector (`English`, `Spanish`, `French`, `German`), readiness badge, dry-run preview, generate, review and publish controls.
- [ ] Render target-specific counts, deterministic findings and all four reviewer receipts; disable publish with an exact reason.
- [ ] Preserve English controls and add no surface outside `legacy.html` or scripts directly loaded from it.
- [ ] Test the selector payload, disabled state, tooltips/labels, and absence of any fallback-to-English action.

### Task 7: Backfill, audit and verify

**Files:**
- Create: `scripts/audit_arena_language_contours.mjs`
- Create: `scripts/backfill_arena_english_target.mjs`
- Create: `tests/arena_language_contours_audit.test.mjs`
- Modify: `docs/superpowers/specs/2026-09-19-arena-language-contours-design.md`

- [ ] Implement a dry-run-first English task backfill with immutable report, no overwrites and no publication change.
- [ ] Implement an audit that verifies no active new-match task/pool/queue/plan is unscoped, no cross-target selection exists, each target has five modes and all receipts are PASS before readiness.
- [ ] Run focused unit contracts, backend contracts, target-isolation tests, admin contract, then the audit twice: once before remediation and once after remediation.
- [ ] Record evidence and any remaining external deployment prerequisite in the design document.
