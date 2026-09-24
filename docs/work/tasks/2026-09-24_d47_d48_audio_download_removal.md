# Task packet: D47 remove V2 audio downloading (TTS fallback) + D48 ahead-of-time V1 audio prefetch

Governance-ID: TG-63EFB63FC983
Status: Planned
Owner: session 4d383908 (PhraseMan 2.0 audio cleanup)
Related epic/enabler: docs/phraseman-2.0/PROGRESS.md decisions D47, D48

## Outcome

D47: Learning V2 lessons no longer download voice-over audio over the network
by any code path. Missing local clips fall back to the phone's TTS
(expo-speech) for every learner, not just the dev authoring preview. A
session never rejects itself for missing audio ("Подготавливаем занятие...",
`production_audio_missing`). Bundled bootstrap audio and previously-downloaded
files on disk continue to play as before.

D48: Regular V1 lessons (English only) quietly prefetch the audio clips of the
learner's current and next lesson ~20s after app launch (once per process
start, never at the very first frame), so entering the lesson finds a warm
cache instead of hitting expo-speech fallback on cold clips.

## Scope

In scope:
- D47: `app/learning_v2_audio_prefetch_coordinator_v1.ts` (+`_core_v1`,
  `_policy_v1`), `app/learning_v2_audio_prefetch_background_v1.ts` (deleted —
  all were network-downloading/scheduling code with no other callers).
  `app/learning_v2_lesson_audio_pack_v1.ts` (network fetch path removed, kept
  as a local-only/bootstrap-only preparer — its sync lookup export is still
  used by the session player). `app/learning_v2_direct_session_player_v1.tsx`
  (`allowsDeviceSpeech` widened from dev-preview-only to always-on, with
  `[V2-AUDIO-TTS]` tracing). `app/_layout.tsx` (point removal of the deleted
  module's import/call). `app/(tabs)/lessons.tsx` and
  `app/learning-v2/lesson/[id].tsx` (point edits only — both carry unrelated
  uncommitted changes from other sessions and are NOT committed by this
  session; edits keep them import-clean after the coordinator's deletion).
  Contract tests: `tests/learning_v2_remote_audio_pack_contract.test.ts`,
  `tests/learning_v2_continuous_map_perf_contract.test.ts`,
  `tests/learning_v2_factory_production_audio_contract.test.ts` rewritten for
  the new policy; three coordinator-only tests deleted with their targets.
- D48: new `hooks/phrase_audio_ahead_prefetch.ts` (scheduling, lesson
  resolution, byte/clip caps, cancel-on-background/account-switch). Small
  export addition `isPhraseAudioCached` in `hooks/phrase_audio_player.ts` to
  distinguish "already cached" from "freshly downloaded" in the trace log.
  Wiring call added in `app/_layout.tsx` (dynamic import inside the delayed
  timer, not a static import).

Out of scope: content/course authoring, PROGRESS.md/tasks.json edits, the
legacy "activity" ES-authored session screen's own TTS wiring (its network
audio preload call is disabled, but it already degrades gracefully without a
TTS rewrite — that screen is owned by another in-flight session), native
package removal (`expo-task-manager`/`expo-background-task` left installed
but unused), deleting already-downloaded V2 audio files on disk.

## Architecture

Current boundary (before this task): Learning V2 audio was fetchable through
three independent network paths (lesson/session pack downloader, activity
audio preload, both funneled through a shared Firebase Storage transport) plus
a 15-minute background task re-running the same download. TTS fallback
existed in code but was gated to `__DEV__` authoring preview only.

Intended boundary (after this task): V2 audio is exclusively "what's already
on the device" (bootstrap bundle + anything downloaded by a previous app
version) — the session player is the single decision point: local file present
→ play it; absent → `expo-speech` via the existing `useAudio()` hook, for every
learner. No code path may open a network connection to fetch V2 voice-over
mp3s. V1 regular lessons gain a second, best-effort local-cache warmer
(D48) that sits entirely below the existing `hooks/phrase_audio_prefetch.ts`
queue/lease primitives — it does not introduce a new transport or a new
retry/backoff policy, only a different trigger (~20s post-launch, current +
next lesson) and its own byte/clip budget.

No new OS-level background task is introduced by either D47 or D48 — D47
removes the existing one, D48 explicitly avoids adding one (in-process timer
only, no `expo-background-task` registration).

## Security and privacy

No new data collection, no new third-party service, no new permission. Both
changes only affect how many/which audio bytes are fetched from an existing,
already-authorized Firebase Storage bucket, and reduce that surface (D47) or
shift its timing (D48). No PII involved — file requests are content-hash
addressed, not user-identified beyond the existing Firebase Auth token already
required by the transport layer being removed (D47) or reused unchanged (D48).

## Technical debt

- `learning_v2_activity_audio_preload_v1.ts` / `_transport_v1.ts` (the
  ES-authored "activity" session's own audio downloader) are left in place but
  now unreachable dead code, since their only caller
  (`preloadCurrentLearningV2ActivityAudioSessionV1` in
  `app/learning-v2/lesson/[id].tsx`) was disabled. Disposition: Contain — the
  consuming screen (`app/learning-v2/session/[id].tsx`) already degrades
  gracefully without a prefetched handle; removing the dead files outright
  would require rewriting a 2772-line screen owned by another in-flight
  session. Exit condition: whoever next touches that screen's audio path
  either wires TTS fallback into it (matching D47's spirit) or deletes the
  dead preload/transport files: same disposition already flagged inline in
  `app/learning-v2/lesson/[id].tsx`'s comment.
- `expo-task-manager` / `expo-background-task` remain listed in `package.json`
  unused after D47's deletion of the only caller. Disposition: Accept
  temporarily — owner: next session touching native dependencies; review
  date: next native rebuild; impact ceiling: dead weight in the native binary,
  no runtime cost; removing them is a native-config change outside a
  code-only audio task's blast radius.
- `learning_v2_lesson_audio_pack_v1.ts` still exports lookup helpers
  (`isLearningV2LessonAudioPackReadyV1`, `learningV2PublishedAudioLessonOrdinalsV1`,
  `isLearningV2SessionAudioPublishedV1`, `retainLearningV2LessonAudioPacksV1`)
  that lost their only caller when the coordinator was deleted. Disposition:
  Accept temporarily — they are metadata lookups, not download code, so they
  do not violate D47; owner: refactor-cleaner pass; review date: next dead-code
  audit; impact ceiling: a few dozen harmless lines.

## Verification

- `npx tsx tests/learning_v2_remote_audio_pack_contract.test.ts` — passes
  except a pre-existing, unrelated bootstrap-entry-count assertion (28 vs 140
  actual files on disk) that already failed on HEAD before this task touched
  the file; confirmed by diffing the untouched assertion block against
  `git show HEAD:...`.
- `npx tsx tests/learning_v2_factory_production_audio_contract.test.ts` —
  PASS.
- `npm run test:one -- tests/learning_v2_continuous_map_perf_contract.test.ts`
  — the one test this task's changes touch
  ("тяжёлые модули данных не висят на открытии раздела") passes; six other
  failures in the same suite are pre-existing and target
  `components/learning-v2/LearningV2PulseCourse.tsx`, a file this task never
  edited.
- Manual/observability: `[V2-AUDIO-TTS]` and `[V1-AUDIO-AHEAD]` log lines are
  the intended evidence trail on-device (owner already requires "logs first").

## Rollback

D47: restore the four deleted files and the pre-edit versions of
`learning_v2_lesson_audio_pack_v1.ts`, `_layout.tsx`,
`learning_v2_direct_session_player_v1.tsx` from git history; no data migration
involved, purely code. D48: delete
`hooks/phrase_audio_ahead_prefetch.ts` and its single call site in
`_layout.tsx`; `isPhraseAudioCached` export in `phrase_audio_player.ts` is
additive and harmless to leave. Neither change touches persisted user data or
grants/revokes any entitlement.
