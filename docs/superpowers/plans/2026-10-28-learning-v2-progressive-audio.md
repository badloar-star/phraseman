# Learning V2 Progressive Recorded Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. This implementation run defers commit, upload, deploy, and release until fresh root review.

**Goal:** Deliver authenticated Firebase Storage Learning V2 recorded audio as immutable, hash-verified, progressively downloaded clips that survive app restarts and play from disk with zero playback-time networking, while retaining device TTS whenever a valid recorded clip is absent.

**Architecture:** A small authenticated catalog indexes immutable multi-clip binary packs and maps each exact session/text coordinate to a clip hash plus pack offset/length. Foreground preparation computes a durable-progress window, downloads each missing pack once, verifies the whole pack and every indexed clip, and atomically installs individual clips in `Paths.document`; playback only reads installed metadata and a local clip. The builder uses stable base ranges (`1`, `2..8`, `9..16`, `17..32`, `33..56`, then lesson-sized ranges), splits by a byte ceiling, preserves previous assignments, and puts changed/new clips in small immutable delta packs.

**Tech Stack:** TypeScript, React Native/Expo, `expo-file-system` 19, `expo-crypto` 15, `expo-audio` 1.1, Firebase Auth + Storage REST exact GET, NetInfo 11, Jest/ts-jest, Node.js publishing scripts.

---

## Locked boundaries

- Storage remains `allow get: if request.auth != null` only under `learning-v2/voice-audio/**`; list and client writes remain denied.
- No public download URLs, `getDownloadURL`, HEAD, Firestore, Cloudflare, OpenAI generation, ElevenLabs generation, upload, deploy, release, or rollback.
- Recorded playback is cache-only. A miss falls back to existing system TTS and never downloads from the press path.
- ES is publish-ready from `assets/audio/learning-v2/es-professor-v4-2026-10-28`; EN remains explicitly unavailable until generated assets exist.
- Each immutable content-addressed pack contains multiple unique MP3 byte ranges, reducing GET count while preserving exact clip hashes. Repeated phrases reference their earliest-use pack. A changed phrase produces a small delta pack plus a new catalog; unchanged base packs retain identical bytes and paths.
- Progress tiers come from `course_local_progress_v1` completed-session state, never from opening a later route. Replaying older sessions only queues missing chunks.
- The shared checkout is heavily dirty. Only files listed below are owned by this plan; unrelated edits are never reverted.

## File map

- Create `modules/learning-v2/audio/progressive_audio_contract.ts`: strict catalog parser, text normalization, progress-window planning, byte ceilings, object-path checks.
- Create `modules/learning-v2/audio/progressive_audio_runtime.ts`: combined durable store, authenticated transport, serialized/deduplicated bounded downloader, refresh/prepare orchestration, recovery cleanup, and cache-only resolver.
- Create `modules/learning-v2/audio/progressive_audio_player.ts`: local-URI-only Expo player integrated with the spoken-audio arbiter.
- Modify `hooks/use-audio.ts`: add an explicit Learning V2 recorded-audio option, try cache-only local playback, then preserve the existing system-TTS callbacks/ring/stop behavior.
- Modify `app/learning_v2_direct_session_player_v1.tsx`: mount foreground preparation for the exact course coordinates and opt its speech calls into the recorded-audio route.
- Modify `tests/learning_v2_system_tts_only.test.ts`: deliberately replace the retired device-TTS-only invariant with no-playback-network + TTS fallback invariants.
- Create focused tests under `tests/learning_v2_progressive_audio_*.test.ts`.
- Create `scripts/build_learning_v2_progressive_audio_packs.mjs`: validate source map/assets and emit catalog + immutable chunks, optionally reusing a previous catalog assignment.
- Create `scripts/publish_learning_v2_progressive_audio_packs.mjs`: validate the built tree and print an upload plan by default; upload requires an explicit flag and credentials and is not run here.
- Generate the ignored `assets/audio/learning-v2/es-professor-v4-2026-10-28/delivery-v1/` release manifest, three lesson catalogs, seven raw multi-clip packs, and publish plan for the ES upload handoff.

### Phase 1: Contract and progress planning

**Acceptance:** malformed catalogs, traversal paths, overlapping/out-of-bounds clip ranges, oversize packs/clips, duplicate coordinates, invalid hashes, and unsupported languages fail closed; completed progress produces tiers 1, 8, 16, 56, then a sliding 56-session frontier.

- [x] Write `tests/learning_v2_progressive_audio_contract.test.ts` first with valid/invalid catalog fixtures and progress boundary cases.
- [x] Run the focused test and record the expected missing-module failure.
- [x] Implement immutable catalog parsing and planning in `progressive_audio_contract.ts`.
- [x] Rerun the contract suite to green before adding storage behavior.

### Phase 2: Durable cache and negative cache

**Acceptance:** a previously installed current phrase resolves after restart even when refresh fails; playback performs only document-file reads; 403/404 suppression persists; corrupt/partial pack bytes are never exposed; one pack GET installs multiple verified phrases; pruning retains current/next protected clips.

- [x] Cover atomic install, restart hydration, corruption rejection, negative TTL, protected eviction, mutable Expo `File.move`, interrupted-write recovery, and orphan cleanup in the runtime and Expo-IO suites.
- [x] Implement the durable store inside `progressive_audio_runtime.ts` under `Paths.document/learning-v2-audio-v1`, with exact whole-pack/per-slice hashes and strict persisted-state parsing.

### Phase 3: Authenticated transport and bounded queue

**Acceptance:** requests use only the exact Firebase Storage media URL plus `Authorization: Firebase <idToken>`; no list/HEAD/Firestore/public URL exists; response bytes are bounded before installation; same-object concurrent requests coalesce; queue concurrency is capped; transient failures back off finitely; 403/404 become persistent negative entries; cellular/expensive connections permit only a small required head and reject large prefetch.

- [x] Cover URL/header/status/timeout/size, coalescing, serialized pack install, bounded retry, scoped cancellation, byte budget, offline reconnect, and NetInfo gating in `learning_v2_progressive_audio_runtime.test.ts`.
- [x] Implement those transport/queue responsibilities inside the bounded combined runtime.

### Phase 4: Runtime preparation and cache-only playback

**Acceptance:** preparation reads the installed catalog before refresh, refresh failure does not remove playable clips, only missing chunks are queued, no playback call reaches transport/auth/network, recorded playback shares the spoken-audio arbiter and releases on stop/error/end, and any miss/invalid clip follows system TTS without claiming EN generated audio exists.

- [x] Write `tests/learning_v2_progressive_audio_runtime.test.ts` first with injected store/transport/queue adapters for restart, refresh failure, missing-only delta, ES success, EN unavailable, durable progress tiers, and cancellation.
- [x] Run red and implement `progressive_audio_runtime.ts`.
- [x] Write `tests/learning_v2_progressive_audio_player.test.ts` first with an injected Expo player adapter and arbiter assertions.
- [x] Run red and implement `progressive_audio_player.ts`.
- [x] Rerun runtime/player tests and prove the cache-only resolver has no transport dependency.

### Phase 5: App integration

**Acceptance:** the direct player prepares ES audio only while mounted/foreground, cancels on unmount/account change, requests recorded audio with exact lesson/session coordinates, preserves ring/stop callbacks, never blocks lesson entry, and falls back to system TTS for EN or any ES cache miss. The released-session readiness contract describes this accurately.

- [x] Replace old source-only assertions with failing integration contract assertions for `learningV2Recorded`, the foreground hook, no per-play fetch, and explicit TTS fallback.
- [x] Mount focus/account/AppState-scoped preparation directly in `learning_v2_direct_session_player_v1.tsx` with request-scoped cancellation.
- [x] Extend `SpeakOpts` in `hooks/use-audio.ts`, lazy-load the Learning V2 player, attempt only a cache lookup/local play, and route `false` to existing `speakWithSystemTts`.
- [x] Leave the released-session client non-blocking; no readiness-string change was needed for the cache-optional playback bridge.
- [x] Run focused integration tests and existing `use_audio_system_tts_only`/audio replay suites to guard other callers.

### Phase 6: ES builder and publisher handoff

**Acceptance:** all 838 MP3s are length/hash verified; 3,323 rows resolve to indexed clips; base ranges are deterministic and split only by byte ceiling; pack paths are content-addressed under `learning-v2/voice-audio/v1/es/packs/`; previous assignments remain unchanged; changing one synthetic phrase adds one small delta pack without repacking historical bases.

- [x] Write `tests/learning_v2_progressive_audio_builder.test.ts` using a temporary mini corpus and previous-catalog fixture.
- [x] Run red and implement `build_learning_v2_progressive_audio_packs.mjs`.
- [x] Add publisher dry-run tests before implementing `publish_learning_v2_progressive_audio_packs.mjs`.
- [x] Build the real ES delivery tree, run builder verify/reuse mode, and record counts/bytes/hashes without uploading.

### Phase 7: Security and verification gates

**Acceptance:** focused tests, TypeScript, Storage rule tests, and source guards pass; diff contains only owned files; no secret/public URL/deploy command is introduced; no phone/end-to-end claim is made without a device run.

- [x] Run focused Jest suites through the repository semaphore and save full logs outside tracked source.
- [x] Run `tsc --noEmit` through the repository semaphore and distinguish baseline failures from owned-file failures.
- [x] Run Storage rule and audio regression suites.
- [x] Scan owned files for secrets, `getDownloadURL`, `HEAD`, Firestore, public unauthenticated audio, unbounded retries, and playback-time transport calls.
- [x] Inspect `git diff --` only for owned paths and report residual uncertainty, including the lack of a supported Expo API for applying iOS `NSURLIsExcludedFromBackupKey` to `Paths.document`.

## Self-review

As built and published on 2026-10-28: ES produced 838 unique clips in seven immutable packs (18,761,854 pack bytes), three lesson catalogs, and an authenticated 11-object delivery. The guarded publisher created ten immutable objects and atomically updated `current.json` in `phraseman-ea0b3.firebasestorage.app`; a verification rerun matched remote size/SHA metadata and skipped all 11 objects, the remote current pointer resolved release `631503b3fcaababfc07cdf77852738af271756b69ebd7fc496ffef843b1e503f`, and an unauthenticated current GET returned HTTP 403. Final gates passed 43 tests across nine suites, scoped ESLint completed with zero errors (88 warnings), and full `tsc --noEmit` passed. No app deploy/OTA/build, commit, EN publication, TTS generation/spend, or physical-phone run was performed. Native scope is iOS/Android; web retains device speech and does not initialize the document-store adapter.

- Spec coverage: progressive windows, durable restart cache, playback without networking, changed-only downloads, concurrent deduplication, bounded queue/retry/errors, disk cap/protection, cellular gating, exact authenticated GET, ES handoff, EN-not-ready semantics, cancellation, arbiter integration, and no upload/deploy are each mapped to a phase.
- Placeholder scan: no implementation step depends on a TBD/TODO or unspecified behavior.
- Type consistency: catalog coordinates are `studyTarget + lessonOrdinal + sessionOrdinal + normalizedText`; immutable pack identity is `packSha256 + packByteSize + objectPath`, and each clip is `clipSha256 + offset + byteSize`.
