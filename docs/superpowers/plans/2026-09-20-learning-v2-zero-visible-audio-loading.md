# Learning V2 Zero Visible Audio Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Learning V2 navigation action immediate while shipping only the four-voice Session 1 bootstrap audio in the application.

**Architecture:** UI availability is independent of audio readiness. A generated 28-file bootstrap module seeds the immutable durable cache, while a background coordinator downloads current-session-first and then lesson packs without exposing progress to React UI.

**Tech Stack:** React Native, Expo Asset/FileSystem, TypeScript, Firebase Storage, Node generation scripts, focused Jest/tsx contract gates.

---

### Task 1: Lock the no-loader UI contract

**Files:**
- Modify: `tests/learning_v2_remote_audio_pack_contract.test.ts`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `components/learning-v2/LearningV2PulseCourse.tsx`

- [x] Add a failing contract that rejects every localized “preparing lesson audio” string, `isLessonAudioReady`, `onLessonAudioPendingPress`, and audio-ready early returns in lesson/session press paths.
- [x] Run the focused contract and confirm RED on the currently visible blocker.
- [x] Remove audio readiness from lesson-card, session-node, modal, and prewarm navigation gates while preserving release/material repair states.
- [x] Run the focused contract and confirm GREEN.

### Task 2: Generate the exact bundled bootstrap pack

**Files:**
- Create: `scripts/build_learning_v2_bootstrap_audio_pack.mjs`
- Create: `app/learning_v2_bootstrap_audio_assets_v1.generated.ts`
- Create: `assets/audio/learning-v2-bootstrap-v1/*.mp3`
- Modify: `.easignore`
- Modify: `tests/learning_v2_remote_audio_pack_contract.test.ts`

- [x] Add a failing inventory assertion for 28 exact `l01/s01` files, four voices, 863,232 bytes, static literal requires, and EAS inclusion.
- [x] Run the contract and confirm RED because the bootstrap module is absent.
- [x] Implement the deterministic generator: read canonical learner JSON and production manifest, copy only exact Session 1 assets, and emit literal static requires plus immutable metadata.
- [x] Add a narrow `.easignore` exception for the bootstrap directory without admitting the large authoring audio tree.
- [x] Generate the assets/module and run `--check` plus the focused contract to GREEN.

### Task 3: Seed and resolve bootstrap audio locally

**Files:**
- Create: `app/learning_v2_bootstrap_audio_seed_v1.ts`
- Modify: `modules/learning-v2/runtime/voice_audio_offline_cache_v1.ts`
- Modify: `app/learning_v2_course_session_audio_preload_v1.ts`
- Create: `tests/learning_v2_bootstrap_audio_seed_v1.test.ts`

- [x] Write tests proving a bootstrap content hash resolves without transport and retains exact hash/size evidence.
- [x] Run the focused test and confirm RED.
- [x] Add a bundled-source cache seam that copies/reads the static asset once, verifies SHA-256 and size, and reuses the ordinary immutable content-hash file thereafter.
- [x] Make course-session preload consult the bundled Session 1 resolver before declaring a local miss; do not add network transport to the session path.
- [ ] Run focused cache/preload Jest tests to GREEN (deferred: shared machine currently has a 5.4 GB foreign Node process; static/runtime contracts and scoped TypeScript are GREEN).

### Task 4: Start preparation early without gating UI

**Files:**
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/learning_v2_lesson_audio_pack_v1.ts`
- Modify: `tests/learning_v2_session_preparation_architecture_contract.test.ts`

- [x] Add failing assertions that bootstrap/current-session preparation begins at app/section entry and that current-session preparation does not depend on whole-lesson readiness.
- [x] Run the architecture gate and confirm RED.
- [x] Start bootstrap seeding during app startup and current-session preparation during Founder Pass/map entry.
- [x] Keep lesson downloads invisible and ordered: current session, next session, current lesson remainder, next lesson.
- [x] Run the architecture gate to GREEN.

### Task 5: Verify cold start, bundle boundary, and regressions

**Files:**
- Modify: `tests/learning_v2_remote_audio_pack_contract.test.ts`
- Modify: `docs/v2/HANDOVER.md`

- [x] Run the bootstrap generator check and exact inventory/hash verification.
- [x] Run remote audio, direct intro, zero-loading-frame, and session-preparation focused gates; offline-cache Jest remains deferred as noted above.
- [x] Run scoped TypeScript and ESLint for modified runtime files.
- [x] Inspect the EAS ignore result: bootstrap included, large Learning V2 tree excluded.
- [x] Record exact evidence and any remaining unrelated blockers in `docs/v2/HANDOVER.md`.
