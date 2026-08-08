# Inline Speaking Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a stable inline push-to-talk card with live word settlement, live equalizer, four-color phrase feedback, five stars, and reference/recording playback in lesson phrase-building and trainer phrase practice.

**Architecture:** Keep capture and scoring in `SpeakingPanel`, add a normal-flow `inline` presentation, and reserve geometry through one shared `SpeakingInlineSlot` mounted by both hosts from the first frame. Inline capture always uses system interim recognition and persisted audio; the modal presentation retains its Android PCM/Whisper path.

**Tech Stack:** React Native, Expo Router, expo-speech-recognition, expo-audio, TypeScript, Jest source contracts and pure unit tests.

---

### Task 1: Lock score bands, five-star mapping, and stable-slot contracts

**Files:**
- Modify: `app/speaking_score_stars.ts`
- Create: `components/SpeakingInlineSlot.tsx`
- Modify: `tests/speaking_score_stars_mapping.test.ts`
- Replace: `tests/speaking_inline_overlay_contract.test.ts`

- [ ] **Step 1: Write failing boundary and structure tests**

Add assertions that `inlineStarsForScore` maps `0, 1, 25, 50, 75, 90, 100` to `0, 1, 2, 3, 4, 5, 5`. Replace the overlay contract with assertions for `presentation="inline"`, `SpeakingInlineSlot` in both hosts, no `overlayStyle`, no host `bottom` offset, partial transcript updates, persisted recording, action order, accessibility labels, and system capture for inline mode.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx jest tests/speaking_score_stars_mapping.test.ts tests/speaking_inline_overlay_contract.test.ts --runInBand`

Expected: FAIL because `inlineStarsForScore`, `SpeakingInlineSlot`, and the inline presentation contract do not exist.

- [ ] **Step 3: Add the pure mapping and shared slot**

Implement:

```ts
export const INLINE_STAR_COUNT = 5;
export function inlineStarsForScore(score: number): number {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  if (value <= 0) return 0;
  if (value < 25) return 1;
  if (value < 50) return 2;
  if (value < 75) return 3;
  if (value < 90) return 4;
  return 5;
}
```

`SpeakingInlineSlot` must always render a fixed-height normal-flow `View`, accept children and host style, and expose `testID="speaking-inline-slot"`.

- [ ] **Step 4: Run tests and keep failures limited to unimplemented panel/host wiring**

Run the same focused Jest command and confirm mapping tests pass while integration assertions remain red for the expected missing wiring.

### Task 2: Replace the absolute overlay with the approved inline card

**Files:**
- Modify: `components/SpeakingPanel.tsx`
- Test: `tests/speaking_inline_overlay_contract.test.ts`

- [ ] **Step 1: Implement the normal-flow presentation**

Change the presentation type to `'modal' | 'inline'`, remove `overlayStyle`, and render a fixed-card interior with no absolute positioning. Render masked/revealed tokens and `VoiceEqualizer` during requesting/listening; render the semantic-band phrase, five stars, localized status, `Эталон`, and `Моя запись` during a valid result. Keep all error/recovery states inside the same card.

- [ ] **Step 2: Force interim-capable capture only for inline mode**

In the controlled-hold effect, inline `pressIn` must set `systemHoldPressActiveRef` and call `startListening`; `pressOut` must call `stopListening`. Pass `holdToTalk: presentation === 'inline' || !pcmHoldModeRef.current` and keep `persistRecording: true`.

- [ ] **Step 3: Preserve modal behavior**

Do not change modal microphone handlers, word drill, PCM/Whisper recording, control scoring, or modal star semantics. Confirm the modal branch still selects PCM on supported Android devices.

- [ ] **Step 4: Run focused panel tests**

Run: `npx jest tests/speaking_inline_overlay_contract.test.ts tests/speaking_panel_hold_mode_contract.test.ts tests/speaking_recognition_options.test.ts tests/speaking_transcript_accumulator.test.ts tests/speaking_volume.test.ts --runInBand`

Expected: PASS.

### Task 3: Mount the stable slot in trainer practice

**Files:**
- Modify: `components/SpeakingButton.tsx`
- Modify: `app/trainer_phrases_session.tsx`
- Test: `tests/speaking_inline_overlay_contract.test.ts`
- Test: `tests/trainer_phrases_speaking_autofill_contract.test.ts`

- [ ] **Step 1: Add controlled inline hold to `SpeakingButton`**

Add an `inlineHold` prop with `onStart` and `onEnd`. When present, `pressIn` performs the premium gate then calls `onStart`; `pressOut` calls `onEnd`; the button does not mount its own panel and does not also fire modal `onPress` on release.

- [ ] **Step 2: Render trainer panel in the reserved slot**

Add trainer-owned `speakingOpen` and `speakingHoldActive`. Place `SpeakingInlineSlot` between the word bank and check button, mount `SpeakingPanel presentation="inline"` inside it, and wire the existing success callback without changing autofill, result recording, haptics, sound, or learner-controlled advance.

- [ ] **Step 3: Run trainer contracts**

Run: `npx jest tests/speaking_inline_overlay_contract.test.ts tests/trainer_phrases_speaking_autofill_contract.test.ts --runInBand`

Expected: PASS.

### Task 4: Mount the stable slot in lesson phrase-building

**Files:**
- Modify: `app/lesson1.tsx`
- Test: `tests/speaking_inline_overlay_contract.test.ts`

- [ ] **Step 1: Move the panel into lesson content flow**

Mount `SpeakingInlineSlot` after the question/answer content and before the scroll view closes. Render it while the speaking feature and target exist, keeping the slot itself mounted for both idle and active states. Remove the root-level absolute panel and all offset props.

- [ ] **Step 2: Preserve footer and success behavior**

Keep the existing footer `onPressIn`/`onPressOut`, premium paywall gate, speaking analytics, answer autofill, and auto-advance suspension. Reset/close speaking state when the phrase target changes.

- [ ] **Step 3: Run lesson and layout contracts**

Run: `npx jest tests/speaking_inline_overlay_contract.test.ts tests/layout_stability_contract.test.ts tests/lesson_complete_single_finish_surface.test.ts --runInBand`

Expected: PASS.

### Task 5: Verify the complete focused speech surface

**Files:**
- Verify only; no source changes unless a deterministic gate identifies a regression.

- [ ] **Step 1: Run focused behavioral and lifecycle gates**

Run: `npx jest tests/speaking_inline_overlay_contract.test.ts tests/speaking_score_stars_mapping.test.ts tests/speaking_score_bands.test.ts tests/speaking_hold_ui_contract.test.ts tests/speaking_panel_hold_mode_contract.test.ts tests/speaking_android_availability_contract.test.ts tests/speaking_recognition_options.test.ts tests/speaking_transcript_accumulator.test.ts tests/speaking_volume.test.ts tests/speech_capture_runtime_lifecycle_contract.test.ts tests/speech_capture_session_token_contract.test.ts tests/loud_playback_audio_mode_contract.test.ts tests/trainer_phrases_speaking_autofill_contract.test.ts tests/layout_stability_contract.test.ts --runInBand`

Expected: all suites and tests PASS with zero failures.

- [ ] **Step 2: Run TypeScript checking for changed files through the project compiler**

Run the repository's narrow supported typecheck command if present; otherwise run `npx tsc --noEmit --pretty false` and report only errors attributable to changed files, because unrelated pre-existing project errors must not be hidden or rewritten.

- [ ] **Step 3: Inspect final diff and whitespace**

Run: `git diff --check -- app/speaking_score_stars.ts components/SpeakingInlineSlot.tsx components/SpeakingButton.tsx components/SpeakingPanel.tsx app/trainer_phrases_session.tsx app/lesson1.tsx tests/speaking_score_stars_mapping.test.ts tests/speaking_inline_overlay_contract.test.ts`

Expected: no whitespace errors. Review the scoped diff to confirm no unrelated behavior was removed.

