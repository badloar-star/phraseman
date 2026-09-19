# Learning V2 Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release Learning V2 with transparent work-in-progress states, a personalized one-time Founder Pass, reliable rewards/voice/card motion, and a dedicated admin feedback source.

**Architecture:** Keep the factory-native catalog as the sole session-material authority. Add small pure owners for the intro receipt and runtime transition decisions, then integrate them into the existing Lessons/Pulse/direct-player surfaces. Extend the existing feedback enum and live legacy admin dashboard instead of creating a parallel store or admin page.

**Tech Stack:** React Native, Expo Router, React Native Animated/Reanimated, AsyncStorage, TypeScript, Firebase Functions, static admin HTML, Jest/tsx focused gates.

---

### Task 1: Release access and WIP lesson maps

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/learning-v2/course.tsx`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `components/learning-v2/LearningV2PulseCourse.tsx`
- Modify: `components/learning-v2/learningV2PulseGeometry.ts`
- Test: `tests/learning_v2_release_access_contract.test.ts`

- [ ] Write a failing source/logic test proving production routes do not redirect,
  the V2 entry is visible, every lesson map opens, incomplete lessons expose a
  construction state, unpublished sessions remain non-playable, and unlock-all is
  still double DEV-guarded.
- [ ] Run the focused test and confirm it fails on the current release guards.
- [ ] Remove only the Learning V2 production route guards; preserve dev utility guards.
- [ ] Separate lesson-map visibility from session playability and pass an explicit
  `inProgress` state to the shared lesson card.
- [ ] Run the focused test to GREEN.

### Task 2: Personalized one-time Founder Pass

**Files:**
- Create: `app/learning_v2_release_intro_seen_v1.ts`
- Create: `components/learning-v2/LearningV2FounderPassModal.tsx`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `docs/v2/mockups/2026-09-19-learning-v2-release-modal/index.html`
- Test: `tests/learning_v2_founder_pass_v1.test.ts`

- [ ] Write failing tests for account/version key isolation, account-transition
  fail-closed behavior, dismissal-only persistence, mandatory trimmed nickname,
  localized copy, one CTA, reduced motion, and active-theme contrast.
- [ ] Run the focused test and confirm the missing owner/component failures.
- [ ] Implement the account-scoped AsyncStorage receipt and animated modal.
- [ ] Hydrate nickname from the app snapshot with `user_name` storage fallback; wait
  rather than showing a generic pass when the nickname is unavailable.
- [ ] Mark seen only after close/CTA and update the selected HTML mockup.
- [ ] Run the focused test to GREEN.

### Task 3: Dictionary placement and encounter provenance

**Files:**
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `components/learning-v2/LearningV2PulseCourse.tsx`
- Modify: `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`
- Test: `tests/learning_v2_dictionary_release_contract.test.ts`

- [ ] Write a failing test proving the dictionary control is a compact header action,
  no floating dictionary exists, and unlock still occurs only from `onPresented`
  after a real card layout.
- [ ] Run RED.
- [ ] Move the control into `learningV2ResourceHud`, render a compact count badge,
  remove the bottom-right owner, and keep dictionary data sourced only from the
  persisted unlocked-word hook.
- [ ] Run GREEN.

### Task 4: Whole-modal word flight and reverse corners

**Files:**
- Modify: `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`
- Modify: `app/flashcards/FlashcardListItem.tsx`
- Test: `tests/learning_v2_new_word_modal_motion_contract.test.ts`

- [ ] Write a failing test proving flight transform/opacity belongs to the sheet,
  not only `cardWrap`, and both flip faces carry their own rounded clipping chrome.
- [ ] Run RED.
- [ ] Measure the sheet origin, animate the entire sheet to the pocket, and remove
  the card-only flight transform.
- [ ] Make face radius/clipping explicit so the reverse face survives Android 3D
  transforms without cut corners.
- [ ] Run GREEN.

### Task 5: Dedicated Learning V2 ratings in admin

**Files:**
- Modify: `app/feedback_client.ts`
- Modify: `components/learning-v2/horizons/HorizonSessionResult.tsx`
- Modify: `functions/src/feedback_entries.ts`
- Modify: `functions/src/admin_alert_sources_ratings.ts`
- Modify: `admin/v2/legacy.html`
- Modify: `functions/src/feedback_entries.test.ts`
- Modify: `functions/src/admin_alert_sources_ratings.test.ts`
- Modify: `tests/admin_ratings_dashboard_contract.test.ts`

- [ ] Extend tests first to require `learning_v2` in client/server allowlists, result
  submission, admin filter/label, stats, and privacy-safe alert metadata.
- [ ] Run RED.
- [ ] Add the enum value and map the result card/admin UI/alert category.
- [ ] Confirm Firestore rules remain unchanged and Jarvis has no feedback fetcher.
- [ ] Run focused client/function/admin tests to GREEN.

### Task 6: Rune award visibility and resilient flight

**Files:**
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Create: `app/learning_v2_rune_flight_measurement_v1.ts`
- Test: `tests/learning_v2_rune_award_visibility_v1.test.ts`
- Test: `tests/learning_v2_session1_rune_award_2026_08_26_gate.ts`

- [ ] Write failing tests for the 3/2/1 ladder, immediate score settlement,
  non-minting repeat/preview behavior, and bounded next-frame measurement retries.
- [ ] Run RED.
- [ ] Extract a bounded measurement scheduler and use it for the flight; never roll
  back the already-settled award when coordinates are temporarily unavailable.
- [ ] Run GREEN.

### Task 7: Physical hold owns microphone lifecycle

**Files:**
- Modify: `modules/learning-v2/runtime/hold_capture_route_v1.ts`
- Modify: `hooks/use_learning_v2_local_hold_to_talk_v1.ts`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `tests/learning_v2_hold_capture_route_v1.test.ts`
- Modify: `tests/learning_v2_local_hold_to_talk_v1.test.ts`

- [ ] Add failing tests that a recognizer end/error while the finger is down selects
  restart and preserves visible listening, that release selects finish exactly once,
  and that the footer has stable callbacks plus generous retention/hit slop.
- [ ] Run RED.
- [ ] Preserve listening state during fallback restarts, reset it only on a new hold,
  and harden the press target without adding a second microphone.
- [ ] Run GREEN.

### Task 8: Focused verification and release audit

**Files:**
- Review all files above; do not edit unrelated dirty files.

- [ ] Run every focused gate from Tasks 1–7 under the shared heavy-process semaphore.
- [ ] Run focused TypeScript checks for changed modules and admin HTML contracts.
- [ ] Run `learning_v2_curriculum_blueprint_gate_v2.ts` and record PASS.
- [ ] Inspect `git diff --check`, `git diff --stat`, and the exact changed-file diff.
- [ ] Re-read this plan and the owner request line by line; report any remaining gap.

### Task 9: Map/session motion and scroll performance

**Files:**
- Modify: `components/learning-v2/LearningV2PulseCourse.tsx`
- Modify: `components/LearningV2SessionOutcomeSheet.tsx`
- Create: `docs/v2/mockups/2026-09-19-learning-v2-map-entry/index.html`
- Test: `tests/learning_v2_motion_performance_contract.test.ts`

- [x] Remove viewability-driven React state and per-visible-node infinite motion.
- [x] Keep virtualized clipping/batching and the current-node native halo.
- [x] Add a staged one-shot pre-session entrance and a shared animated exit.
- [x] Produce three owner-selectable map-entry variants without prematurely
  choosing one in production.

### Task 10: Complete four-voice production audio

**Files:**
- Create: `scripts/audit_learning_v2_factory_audio.mjs`
- Create: `scripts/generate_learning_v2_factory_production_audio.mjs`
- Create: `scripts/build_learning_v2_factory_audio_module.mjs`
- Create: `app/learning_v2_factory_production_audio_v1.ts`
- Generate: `app/learning_v2_factory_production_audio_entries_v1.generated.ts`
- Modify: `app/learning_v2_course_released_session_client_v3.ts`
- Modify: `app/learning_v2_course_session_audio_preload_v1.ts`

- [x] Audit the exact admitted factory-native inventory: 137 sessions, 1,188
  audio interactions, 667 unique transcripts, 2,668 four-voice files.
- [x] Generate/reuse every file through `/v1/audio/speech` with resumable
  checkpoints and the explicit spend guard.
- [x] Materialize one valid audio child per session and statically bind every MP3.
- [x] Require all selected local bytes before intro and prove zero playback-time
  network/TTS requests.
- [x] Run the final zero-missing audit and focused audio contract.

### Completion receipt — 2026-09-19

- [x] Founder Pass variant 2 uses the real normalized nickname, has no `0001`,
  appears before the lesson list, persists once per account in production and
  replays on every DEV entry without writing the production receipt.
- [x] Available-but-unfinished lessons use a distinct derived shade; every
  unfinished session keeps its construction marker and remains non-playable.
- [x] Session text and all selected local MP3 bytes are prepared on the map and
  transferred by a one-shot ready handle; the direct-player preparing screen
  and its localized copy were removed.
- [x] Speed Match uses equal full-width/equal-height tiles in both columns.
- [x] Learning V2 voice follows the working SpeakingPanel route: live system
  recognition until the neural PCM model is actually ready, with transcript
  delivered directly into the existing local evaluator.
- [x] The map-entry mockup contains three app-shaped Pulse maps, not a straight
  line, and every variant has separate replay controls for map entry and session
  modal motion.
- [x] Final audio inventory was refreshed after L3 S26–S29 arrived: **141/141
  sessions, 2,752/2,752 files, four voices, 0 missing**.
- [x] Focused contracts, changed-source visible-loading audit, scoped ESLint,
  scoped whitespace check and the 1,792-packet curriculum gate pass.
- [ ] Physical-device smoke is intentionally outstanding because no emulator or
  device launch was authorized in this task. Whole-project `tsc` is also not a
  PASS: the process reached its 4 GB heap limit; see
  `.codex-tmp/learning-v2-release-typecheck.log`.
