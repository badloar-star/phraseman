# Learning V2: zero visible audio loading

## Decision

Learning V2 navigation is never gated by remote audio readiness. A bundled
bootstrap pack contains every four-voice audio coordinate used by English
Lesson 1 Session 1. The remaining course audio stays outside the application
bundle and is downloaded to durable verified storage in the background.

## User contract

- Opening Learning V2, a lesson, the lesson map, and a session modal is
  synchronous and never displays an audio loading state.
- Pressing Start never initiates a network request and never waits for a
  lesson-wide pack.
- Session 1 works on a clean install from bundled local audio.
- Released later sessions keep their repair/material availability semantics;
  audio readiness is not a UI availability state.
- Remote audio downloads are invisible, resumable, content-addressed, and
  verified by exact byte size and SHA-256 before use.

## Bootstrap pack

The bootstrap source is the canonical English `l01/s01` learner release and
the four production voices `ash`, `onyx`, `nova`, and `coral`. The generated
inventory contains 28 MP3 files (7 transcripts x 4 voices), 863,232 bytes.
Only those files are copied to `assets/audio/learning-v2-bootstrap-v1/` and
statically required. The large `assets/audio/learning-v2/` authoring tree
remains excluded from EAS.

## Runtime flow

1. At application boot, the bootstrap seeder materializes bundled Session 1
   files into the existing immutable durable audio store.
2. Learning V2 entry starts current-session preparation immediately. This no
   longer waits for the whole lesson pack.
3. Background scheduling downloads in this order: current session, next
   unlocked session, rest of current lesson, next published lesson.
4. Lesson cards and session nodes read only progress, release/material status,
   and repair state. They never read download state.
5. Session playback remains local-only. There is no session-time transport.

## Failure policy

Download, App Check, authentication, interruption, and connectivity failures
are logged and retried in the background. They never create a toast, loader,
disabled lesson, or intermediate screen. A missing remote file cannot corrupt
local progress. Session 1 remains playable from the bundled pack.

## Verification

- A contract gate rejects the forbidden loading copy and any audio-readiness
  branch in lesson/session press handlers.
- A bootstrap gate recomputes the exact Session 1 four-voice inventory and
  checks the generated static requires, hashes, sizes, and EAS inclusion.
- Runtime tests prove bootstrap cache seeding and local-only session playback.
- Cold-start tests prove map/modal navigation without a ready lesson pack.
- EAS archive inspection proves only the sub-1-MB bootstrap audio is bundled.

