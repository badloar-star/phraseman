# Learning V2 remote audio packs

## Goal

Remove the full Learning V2 MP3 library from the application bundle while
keeping a sub-1 MB Session 1 starter pack in the app. Lesson cards and session
modals must always open synchronously and must never expose audio loading UI.
Session playback must never
perform a network request.

## Architecture

1. Keep only immutable audio metadata in TypeScript: transcript, voice,
   object path, SHA-256 and byte size. No static `require()` of MP3 files.
2. Publish the MP3 source set to authenticated Firebase Storage under its
   canonical immutable object path.
3. Store verified audio in `Paths.document`, not the OS-evictable cache.
   Downloads use a temporary file, exact byte-size and SHA-256 readback, then
   an atomic move.
4. Build a static lesson-pack index from every released session in the lesson
   and all four voices. Deduplicate by immutable content hash. Runtime never
   materializes the whole course merely to discover a pack.
5. At Learning V2 entry, prepare the current session first, then the next
   session, the rest of the current lesson, and finally the next released
   lesson. None of these tasks may gate navigation or render a loading notice.
6. Session 1's four-voice starter pack is bundled and seeds the same immutable
   content-addressed durable cache used by downloaded audio. A session preload
   resolves only verified local files and never starts network transport while
   the exercise is running.
7. Exclude the full local authoring/source audio tree from EAS archives and
   explicitly include only the generated starter directory.

## Verification

- Contract test rejects MP3 `require()` calls and any session-time download.
- Pack-policy tests prove all four voices are included, files are deduplicated,
  and current/next lesson priority is deterministic.
- Existing focused Learning V2 runtime and zero-loading-frame gates pass.
- EAS archive inspection shows the Learning V2 MP3 directory is excluded.
- Storage publication audit confirms every metadata object exists with the
  expected byte size and SHA-256 metadata before release.

## Verified 2026-09-19

- `2,814` local Learning V2 source files (`82,524,031` bytes) are excluded by
  the same ignore implementation used by EAS CLI.
- `2,752` factory objects and `64` legacy/Spanish objects were uploaded and
  verified in Firebase Storage against exact byte size and SHA-256 metadata.
- The generated English index contains complete packs for Lessons 1–2 and the
  audio-complete sessions of a partially authored lesson. Ready sessions stay
  available; each session missing any required voice remains fail-closed and
  keeps its work-in-progress state.
- Current audited inventory: Lesson 1 = 56 sessions / 1,120 files / 30,981,840
  bytes; Lesson 2 = 56 / 1,052 / 31,938,786; Lesson 3 = 26 audio-complete
  sessions / 596 / 17,097,600. Lesson 3 sessions 27+ are not admitted by the
  audio gate until all required voices are published.
- Remote-pack, production-audio, runtime-audio, direct-intro,
  zero-loading-frame and Lesson 1 authoring gates pass.
- Focused ESLint reports zero errors. The five warnings in `lessons.tsx`
  predate this audio change.
