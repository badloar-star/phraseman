# Phraseman Sound Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered UI-sound playback with one semantic sound director that never creates an audio pile-up, respects other apps and silent mode, and exposes exactly two working sound switches in Settings.

**Architecture:** App surfaces request semantic events from a central director. A pure arbiter decides play/drop/preempt/defer, while an Expo adapter owns the single active SFX player and a bounded cache. A separate activity/policy layer coordinates UI effects, educational voice, and microphone capture through the existing serialized audio-session coordinator. Existing `uiSounds` and `voiceOut` settings remain the persisted sources of truth.

**Tech Stack:** React Native 0.81, Expo SDK 54, Expo Router, TypeScript, `expo-audio ~1.1.1`, `expo-speech`, AsyncStorage, Jest.

---

## Execution boundary

- Work only in `C:\appsprojects\phraseman` on `feature/referral-roulette`; do not create a worktree or branch.
- Preserve all unrelated dirty-worktree changes.
- Use source WAV files read-only from `C:\Users\badlo\OneDrive\Desktop\BANK\PHRASEMAN SOUND DESIGN'`.
- Do not call an OpenAI API or generate new audio. Nine events without supplied WAV files remain typed but disabled.
- Use test-first changes and focused Jest runs; do not run the whole repository test suite automatically.

## Task 1: Canonicalize and verify the supplied assets

**Files:**

- Create: `scripts/prepare_phraseman_sfx.mjs`
- Create: `tests/phraseman_sfx_assets.test.ts`
- Create: `assets/audio/sfx/v1/**/pm_*_v1.wav` (39 selected canonical WAVs)

- [ ] Write the failing asset contract first. It must load the event/source table exported by the preparation script and assert: 39 unique enabled destinations, no destination traversal, no duplicate semantic IDs, no enabled arena/VIP-finale entries without files, and exact SHA equality for the two duplicate `reward.small` candidates.
- [ ] Run RED:

  `npx jest --runTestsByPath tests/phraseman_sfx_assets.test.ts --no-cache --runInBand`

- [ ] Implement `prepare_phraseman_sfx.mjs` with explicit source-to-destination mapping, `--check` and `--apply` modes. Selection rules: keep one `reward.small`; select VIP open variation 3; trim the 8-second `exam_pass` container to its clean audible tail; never modify source files.
- [ ] In `--apply`, invoke local `ffmpeg` only for measured trim/fade/true-peak protection and write the final static assets. Preserve 48 kHz stereo PCM WAV. The script must print a compact report with duration, sample rate, channels, peak, and destination.
- [ ] Run `node scripts/prepare_phraseman_sfx.mjs --check`, inspect the report, then run `--apply` and repeat `--check`.
- [ ] Run GREEN with the focused asset test.

## Task 2: Define the semantic event catalog and settings bridge

**Files:**

- Create: `modules/audio/sound_events.ts`
- Create: `modules/audio/sound_settings.ts`
- Create: `tests/sound_events_contract.test.ts`
- Modify: `app/app_snapshot_store.ts`
- Modify: `app/user_settings_store.ts`

- [ ] Write failing tests that assert all 48 IDs are typed, all 39 enabled IDs have a static `require()`, the nine missing events are disabled, family volumes match the approved manifest, priorities/cooldowns are valid, and settings changes are synchronously observable.
- [ ] Run RED:

  `npx jest --runTestsByPath tests/sound_events_contract.test.ts --no-cache --runInBand`

- [ ] Implement the catalog with this public contract:

  ```ts
  export type SoundEventId = keyof typeof SOUND_EVENTS;

  export type SoundEventDefinition = Readonly<{
    source: number | null;
    volume: number;
    priority: number;
    cooldownMs: number;
    durationMs: number;
    family: 'learning' | 'voice' | 'completion' | 'system' | 'reward' | 'arena' | 'league' | 'social';
    deferAfterVoice?: boolean;
  }>;
  ```

- [ ] Add `uiSounds` to `AppSnapshotSettings`; keep `voiceOut` and `uiSounds` defaults `true` for compatibility.
- [ ] Implement a small settings bridge that synchronously peeks current values and subscribes to persisted settings updates without duplicating storage.
- [ ] Run GREEN.

## Task 3: Build the pure arbitration engine

**Files:**

- Create: `modules/audio/sound_clock.ts`
- Create: `modules/audio/sound_arbiter.ts`
- Create: `tests/sound_arbiter.test.ts`

- [ ] Write failing fake-clock tests for: one simultaneous SFX; same-key dedupe; event cooldown; maximum two starts per rolling second; lower/equal priority drop; critical preemption; no SFX during recording; verdict/combo/completion replacement; one deferred toast after voice; 250 ms post-voice gap; higher deferred toast replacement; TTL expiration; and global clearing when effects are disabled.
- [ ] Run RED:

  `npx jest --runTestsByPath tests/sound_arbiter.test.ts --no-cache --runInBand`

- [ ] Implement a deterministic arbiter that returns commands rather than touching native audio:

  ```ts
  export type SoundDecision =
    | { kind: 'play'; eventId: SoundEventId; requestId: number; preempt: boolean }
    | { kind: 'defer'; eventId: SoundEventId; expiresAt: number }
    | { kind: 'drop'; reason: 'disabled' | 'missing' | 'recording' | 'voice' | 'dedupe' | 'cooldown' | 'rate-limit' | 'priority' };
  ```

- [ ] Keep the policy intentionally non-FIFO: stale effects never build a backlog; only one informational/reward request may be deferred after voice.
- [ ] Run GREEN.

## Task 4: Add the Expo player adapter and public Sound Director

**Files:**

- Create: `modules/audio/expo_sfx_backend.ts`
- Create: `modules/audio/sound_director.ts`
- Create: `tests/sound_director.test.ts`

- [ ] Write failing mocked-Expo tests proving: exactly one player is active; preemption pauses/seeks the old player before the new start; volume comes from metadata; ended players become reusable; cache size is bounded; disabled effects stop the current player and clear deferred work; failed native playback is contained.
- [ ] Run RED:

  `npx jest --runTestsByPath tests/sound_director.test.ts --no-cache --runInBand`

- [ ] Implement the public API:

  ```ts
  soundDirector.request(eventId, { scope?, dedupeKey?, deferAfterVoice? });
  soundDirector.requestLearningVerdict({ correct, combo?, completesUnit?, completionEvent? });
  soundDirector.setEffectsEnabled(enabled);
  soundDirector.setVoiceActive(active);
  soundDirector.setRecordingActive(active);
  soundDirector.dispose();
  ```

- [ ] Use one active SFX and a small LRU cache; remove evicted native players. Never instantiate all 39 players at startup.
- [ ] Run GREEN.

## Task 5: Make audio-session intent safe for other apps

**Files:**

- Modify: `app/audio_playback_mode.ts`
- Modify: `app/audio_session_coordinator.ts`
- Modify: `app/_layout.tsx`
- Create: `modules/audio/audio_activity.ts`
- Modify: `tests/audio_session_coordinator.test.ts`
- Modify: `tests/loud_playback_audio_mode_contract.test.ts`

- [ ] Change contract tests first to require three modes:

  ```ts
  UI_SFX_AUDIO_MODE = { playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false };
  SPOKEN_AUDIO_MODE = { playsInSilentMode: true, interruptionMode: 'duckOthers', shouldPlayInBackground: false };
  SPEAKING_RECORDING_AUDIO_MODE = { playsInSilentMode: true, interruptionMode: 'doNotMix', allowsRecording: true };
  ```

- [ ] Run the two tests RED.
- [ ] Add scoped activity leases with precedence `recording > spoken audio > UI/idle`, reference counts, and serialized reconciliation. A late speech release must never overwrite an active recording session.
- [ ] Initialize the app in UI/idle mode, not loud spoken mode. UI effects must mix with Spotify/podcasts and respect silent mode; educational speech may duck and play through silent mode.
- [ ] Run GREEN.

## Task 6: Enforce the global voice switch immediately

**Files:**

- Create: `modules/audio/voice_playback_policy.ts`
- Create: `tests/voice_playback_policy.test.ts`
- Modify: `hooks/use-audio.ts`
- Modify: `hooks/phrase_audio_player.ts`
- Modify: `components/SpeakingPanel.tsx`
- Modify: `tests/use_audio_contract.test.ts`
- Modify: `tests/lesson_result_replay_audio_contract.test.ts`

- [ ] Write failing tests for: blocking new system speech and phrase/reference audio; cancelling a pending start; stopping active `expo-speech`; stopping registered phrase/voice players; preserving playback of the user's own recording; and immediate reaction to `voiceOut=false`.
- [ ] Run RED focused policy and existing contract tests.
- [ ] Implement a generation-token gate plus stop-listener registry. Every app-generated voice start checks the token immediately before native playback and registers a stop callback. User-recording playback opts out explicitly.
- [ ] Wrap speech and phrase/reference playback in spoken-audio activity leases. On disable call `Speech.stop()`, stop registered players, and release the session safely.
- [ ] Remove the old contract exception that allowed result replay to bypass `voiceOut`; the owner explicitly changed that product rule.
- [ ] Run GREEN.

## Task 7: Add exactly two real switches to Settings

**Files:**

- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/settings_edu.tsx`
- Modify: `app/feedback/feedback_i18n.ts`
- Create: `tests/settings_sound_controls_contract.test.ts`

- [ ] Write a failing source/UI contract asserting the main Settings screen has one `Звук` group with exactly `Звуковые эффекты` and `Озвучивание`; approved subtitles; accessible switch labels; no user-visible `TTS`, `OpenAI`, or provider wording; and no duplicate `voiceOut` toggle in education settings.
- [ ] Run RED.
- [ ] Use existing `SettingsSectionTitle`, `SettingsGroup`, `SettingsCustomRow`, `SettingsIconTile`, and `CustomSwitch`. Hydrate synchronously from the settings snapshot so the first frame never flips from defaults.
- [ ] Persist each setting independently. Updating `uiSounds` immediately calls `soundDirector.setEffectsEnabled`; updating `voiceOut` immediately calls `voicePlaybackPolicy.setEnabled`.
- [ ] Keep the speech-rate feature in education settings, but do not play its preview while voice is disabled.
- [ ] Run GREEN.

## Task 8: Migrate existing feedback entry points

**Files:**

- Modify: `app/feedback/sound_bank.ts`
- Modify: `app/feedback/feedback_kit.ts`
- Modify: `hooks/use-correct-sound.ts`
- Modify: `hooks/use-record-start-cue.ts`
- Modify: `components/ActionToast.tsx`
- Modify: relevant completion/result components identified by literal `fk.final`, `fk.milestone`, and reward/league outcome searches
- Modify: `tests/feedback_lightning_scope_contract.test.ts`
- Create: `tests/action_toast_sound_contract.test.ts`

- [ ] Change tests first so legacy APIs are adapters to semantic IDs rather than owners of Expo players. Assert combo 5/10 replaces correct, completion emits one result cue, and ActionToast requests sound only when a deduplicated visual toast actually begins its display cycle.
- [ ] Run RED.
- [ ] Route correct, needs-work, combo, completion/stars, record-ready, system toast, energy/streak, available reward, league and social result surfaces through the director. Do not add sounds to taps, navigation, loading, confetti, paywall appearance, ordinary dismissals, or repeated counters.
- [ ] For events whose supplied audio is missing (`pm.reward.vip_finale` and eight arena cues), keep the semantic request safe and silent; do not synthesize a substitute.
- [ ] Preserve haptics as an independent channel.
- [ ] Run GREEN.

## Task 9: Focused verification and asset audit

**Files:**

- Modify only files required by failures attributable to this feature.

- [ ] Run the complete focused gate:

  `npx jest --runTestsByPath tests/phraseman_sfx_assets.test.ts tests/sound_events_contract.test.ts tests/sound_arbiter.test.ts tests/sound_director.test.ts tests/audio_session_coordinator.test.ts tests/loud_playback_audio_mode_contract.test.ts tests/voice_playback_policy.test.ts tests/use_audio_contract.test.ts tests/lesson_result_replay_audio_contract.test.ts tests/settings_sound_controls_contract.test.ts tests/feedback_lightning_scope_contract.test.ts tests/action_toast_sound_contract.test.ts --no-cache --runInBand`

- [ ] Run targeted TypeScript checking only for touched audio/settings modules using the repository compiler configuration; if the project-wide compiler exposes unrelated pre-existing errors, record them separately and verify touched files with focused imports/tests.
- [ ] Run `node scripts/prepare_phraseman_sfx.mjs --check` and confirm 39 enabled assets, nine explicitly disabled events, no clipping, expected 48 kHz stereo PCM, and no duplicate destinations.
- [ ] Inspect `git diff --check`, `git status --short`, and a path-scoped diff. Confirm unrelated user changes were not modified.
- [ ] Manually exercise on a real iOS/Android build when available: Spotify continues under UI SFX; iPhone silent mode mutes SFX but not requested pronunciation; recording captures no SFX; multiple toasts/modals produce at most one relevant sound; both switches stop active audio immediately and survive restart.
- [ ] Report automated evidence separately from device-only checks; never claim unperformed hardware verification.

## Acceptance criteria

- [ ] Exactly two independent sound switches appear in the main Settings sound group and both persist and work immediately.
- [ ] UI effects never overlap, never exceed two starts per second, and do not accumulate a FIFO backlog.
- [ ] UI effects respect silent mode and mix with other apps; educational voice may duck and play in silent mode; recording is exclusive.
- [ ] No SFX starts while recording; speech/voice outranks SFX; only one fresh low-priority toast can defer after voice.
- [ ] Every supplied canonical sound has its approved runtime volume and static bundle reference; missing sounds fail safely and silently.
- [ ] Existing feedback entry points no longer own independent UI-SFX players.
- [ ] User-recording playback remains available when app pronunciation is disabled.
- [ ] Focused tests, asset checks, and diff hygiene pass.
