# Learning V2 Offline Audio Prefetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefetch the three-session urgent window on any connection and every fully published Learning V2 lesson sequentially on unmetered Wi-Fi, without learner-visible loading.

**Architecture:** Pure policy helpers decide urgent coordinates and Wi-Fi eligibility. A single deduplicated coordinator reuses the existing verified durable session/lesson pack APIs in foreground and from a supplemental Expo background task.

**Tech Stack:** React Native, TypeScript, `@react-native-community/netinfo`, Expo BackgroundTask/TaskManager, existing immutable audio cache, focused `tsx` contracts.

---

### Task 1: Lock network and priority policy

**Files:**
- Create: `app/learning_v2_audio_prefetch_policy_v1.ts`
- Create: `tests/learning_v2_audio_prefetch_policy_v1.test.ts`

- [x] Write a failing test for current + next two coordinates, lesson-boundary rollover, unpublished exclusion, and unmetered Wi-Fi classification.
- [x] Run `npx tsx tests/learning_v2_audio_prefetch_policy_v1.test.ts` and confirm RED because the policy module does not exist.
- [x] Implement pure `learningV2UrgentAudioCoordinatesV1` and `isLearningV2BulkAudioNetworkEligibleV1` helpers.
- [x] Re-run the focused test and confirm PASS.

### Task 2: Build the sequential coordinator

**Files:**
- Create: `app/learning_v2_audio_prefetch_coordinator_v1.ts`
- Create: `app/learning_v2_audio_prefetch_coordinator_core_v1.ts`
- Modify: `app/learning_v2_lesson_audio_pack_v1.ts`
- Create: `tests/learning_v2_audio_prefetch_coordinator_contract.test.ts`

- [x] Write a failing contract requiring urgent session order, sequential lesson awaits, published-index ownership, one in-flight run, and no UI copy.
- [x] Run the contract and confirm RED.
- [x] Export published lesson ordinals from the lesson-pack module.
- [x] Implement a dependency-injected coordinator core plus production NetInfo/AsyncStorage adapter. Persist only the latest target/locale/current coordinate so the supplemental task can replay the deterministic queue.
- [x] Re-run the contract and confirm PASS.

### Task 3: Wire foreground and background execution

**Files:**
- Modify: `app/(tabs)/lessons.tsx`
- Create: `app/learning_v2_audio_prefetch_background_v1.ts`
- Modify: `app/_layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `ios/Phraseman/Info.plist` if native iOS configuration is not generated automatically
- Modify: `tests/learning_v2_audio_prefetch_coordinator_contract.test.ts`

- [x] Add failing assertions for Learning V2 activation, network-change resume, background task definition/registration, and absence of UI state/copy.
- [x] Run the contract and confirm RED.
- [x] Replace the old current/next/current-lesson chain with coordinator activation.
- [x] Register the supplemental background task globally and at app bootstrap.
- [x] Install SDK-compatible Expo background packages and add required iOS processing mode only if absent.
- [x] Re-run the contract and confirm PASS.

### Task 4: Verify boundaries and document the result

**Files:**
- Modify: `docs/v2/HANDOVER.md`

- [x] Run policy/coordinator contracts, bootstrap/index checks, session-preparation gate, direct-intro gate, production runtime audio gate, scoped TypeScript, and scoped ESLint.
- [x] Inspect EAS ignore: full factory audio excluded, bootstrap included.
- [x] Confirm no learner-facing audio-loading strings exist.
- [x] Record exact evidence and any unrelated blockers in `docs/v2/HANDOVER.md`.
