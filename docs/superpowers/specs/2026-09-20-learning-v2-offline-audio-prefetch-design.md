# Learning V2 Offline Audio Prefetch Design

## Goal

Make every normally reachable Learning V2 session playable without a network
by warming nearby sessions immediately and then downloading every fully
published lesson sequentially on unmetered Wi-Fi. Prefetch remains invisible
and never gates the map, modal, Start button, or session runtime.

## Product policy

- Session 1 remains the embedded four-voice bootstrap guarantee.
- On any reachable connection, prepare the current session plus the next two
  published session coordinates. Crossing a 56-session lesson boundary is
  supported.
- On connected, non-expensive Wi-Fi, prepare every fully published lesson in
  ordinal order. A lesson pack is completed before the next lesson begins.
- Draft/repair sessions are excluded because they are not in the published
  audio index.
- Cellular bulk download is forbidden. Cellular may download only the
  three-session urgent window.
- No progress, loading, unavailable, retry, or waiting UI is added.

## Architecture

`learning_v2_audio_prefetch_policy_v1.ts` owns pure network classification and
the three-session coordinate window. `learning_v2_audio_prefetch_coordinator_v1.ts`
owns one deduplicated foreground queue, listens for network changes, and invokes
existing verified session/lesson pack preparation. The durable content-hash
cache itself is the resume journal: after restart the coordinator recomputes
the same deterministic queue and verified files become cache hits.

Foreground execution starts as soon as Learning V2 is active and resumes when
Wi-Fi becomes eligible. A supplemental Expo BackgroundTask replays the same
idempotent bulk coordinator when the operating system grants time; correctness
does not depend on that task running. The task returns success when the queue
finishes or has nothing eligible to do and failed only for a real unexpected
runtime error.

## Data and storage

- Files remain under the existing durable documents cache.
- Exact byte size and SHA-256 verification remain mandatory.
- Cache keys remain content-addressed and independent of `sessionRunId`.
- No second audio store or mutable balance-like snapshot is introduced.
- Existing account-generation cancellation and pack in-flight deduplication
  remain authoritative.

## Failure behavior

Network loss pauses new work naturally. Completed verified files remain usable.
The next foreground activation or eligible Wi-Fi transition recomputes the
queue and continues from cache misses. Errors are diagnostic logs only and
never alter learner navigation.

## Acceptance criteria

1. Pure tests prove current + next two coordinate ordering, including the
   lesson boundary.
2. Pure tests prove bulk is allowed only on connected, internet-reachable,
   non-expensive Wi-Fi.
3. Contract tests prove published lessons are processed sequentially and the
   urgent window precedes bulk.
4. The coordinator has no learner-facing copy or React state.
5. Existing bootstrap, no-loader, session preparation, audio hash, EAS ignore,
   and production runtime gates stay green.

