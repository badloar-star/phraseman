# Learning V2 Device Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven-development and execute this plan task-by-task. No delegated worker or worktree is permitted without an explicit owner request.

**Goal:** Let the owner play every authorized Learning V2 authoring session in the real mobile player on a physical phone from the DEV build.

**Architecture:** Add a DEV-only authoring-preview selector backed by the English authoring registry. Project the selected real source through the existing shard/package builders into a preview envelope consumed by `LearningV2DirectSessionPlayerV1`; preview mode reuses the real mode renderers while suppressing every learner-side mutation and telemetry path.

**Tech Stack:** Expo Router, React Native, TypeScript, existing Learning V2 source/shard/package/runtime contracts, Node contract tests.

---

### Task 1: Preview allowlist and real-source envelope

**Files:**
- Create: `modules/learning-v2/preview/authoring_device_preview_v1.ts`
- Test: `tests/learning_v2_authoring_device_preview_v1.test.ts`

- [ ] Write a RED test proving the selector exposes locked sessions plus the one current session, rejects forbidden ordinals, and projects session 1 into three intro pages plus the real mode-native learner interactions.
- [ ] Run the focused test and confirm failure because the preview module does not exist.
- [ ] Implement the smallest pure selector/envelope builder using `LESSON1_AUTHORING_REGISTRY_V1`, `authoredLearningV2SessionSource`, `buildSessionShardFromSource`, and `buildSessionChildBodiesFromShard`.
- [ ] Run the focused test and confirm GREEN.

### Task 2: Side-effect-free player preview mode

**Files:**
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `app/learning-v2/session/[id].tsx`
- Test: `tests/learning_v2_authoring_device_preview_player_contract.test.ts`

- [ ] Write a RED contract test for the exact `authoring_v1` route flag, registry-backed preview material, energy bypass, no completion/progress/star/mistake/card writes, and no learner telemetry.
- [ ] Run the focused test and confirm the expected missing-contract failures.
- [ ] Add the DEV-only preview branch, preserve the real run/evaluator/mode renderer, represent unpublished audio as explicitly unavailable, and keep recording local.
- [ ] Make completion show the local finale without persistent writes.
- [ ] Run the focused test and the existing direct-player runtime gates to GREEN.

### Task 3: DEV Hub session selector

**Files:**
- Create: `app/_learning_v2_authoring_preview.tsx`
- Create: `app/learning_v2_authoring_preview.tsx`
- Modify: `constants/devRoutes.ts`
- Modify: `components/dev/devToolRegistry.ts`
- Modify: `components/dev/DevHubSheet.tsx`
- Test: `tests/learning_v2_authoring_device_preview_route.test.ts`

- [ ] Write a RED route test proving the route is DEV-only, registered in DEV Hub, and opens only a registry-authorized session with `previewMode=authoring_v1`.
- [ ] Run it and confirm RED.
- [ ] Implement the guarded route and accessible session list with current/locked status, blocked future count, stable safe area, theme tokens, Ionicons and at least 44px touch targets.
- [ ] Run the route and DEV Hub contract tests to GREEN.

### Task 4: Focused verification and handover

**Files:**
- Modify: `docs/v2/HANDOVER.md`

- [ ] Run the authoring preflight for session 1.
- [ ] Run the new focused tests and applicable existing mode-native/runtime gates under the repository traffic-light rules.
- [ ] Open the DEV route on a connected physical phone, traverse intro, first-word card, each represented mode, wrong/retry/success and finish, and record what could and could not be verified.
- [ ] Update the handover with exact files, commands, results and remaining audio blockers. Do not mark session 1 `LOCKED` without owner approval.

