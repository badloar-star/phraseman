# Task packet: harden native-call error logging in D47/D48 audio changes

Governance-ID: TG-96FF2E4299C6
Status: Planned
Owner: session 4d383908 (PhraseMan 2.0 audio cleanup)
Related epic/enabler: docs/phraseman-2.0/PROGRESS.md D47, D48 (see also
docs/work/tasks/2026-09-24_d47_d48_audio_download_removal.md, the main packet
for this session's audio work)

## Outcome

Every native call (`File`/`Directory` construction and access, and any other
Android/iOS bridge call) touched by this session's D47/D48 changes fails
loud, not silent: a caught native exception always logs which file/path and
the error text under the `[V1-AUDIO-AHEAD]` / `[V2-AUDIO-TTS]` prefixes
already used elsewhere in this work, per the owner's standing "no mute catch"
rule. This is a defensive hardening pass triggered by a false-alarm
`InvocationTargetException` report during manual emulator verification
(root-caused to unrelated `expo-image` activity-recreation churn, not this
session's code — confirmed via `adb logcat`), not a response to an actual bug
in this session's code.

## Scope

In scope: `hooks/phrase_audio_player.ts` (the new `isPhraseAudioCached` export
— its `catch {}` becomes a named, logged catch), `hooks/phrase_audio_ahead_prefetch.ts`
(review only, no behavior change expected — already logs every catch it
introduced). No functional change to what gets downloaded or when.

Out of scope: any other native-call site in the codebase; this is scoped to
the two files this session actually authored.

## Architecture

No architecture change — this is strictly a logging-hygiene pass on already
-added code paths, matching the pattern already used throughout this
session's D47/D48 work (`console.warn`/`DebugLogger` with a named context
string, no bare `catch {}`).

## Security and privacy

None. No new data, no new permission, purely diagnostic logging of error
messages (no PII — file paths are content-hash-derived, text is public lesson
copy).

## Technical debt

None introduced.

## Verification

- Manual: `adb logcat -d | grep InvocationTargetException` — confirmed the
  reported crash trace belongs to `expo.modules.image.ExpoImageViewWrapper`
  / `Exceptions$MissingActivity`, unrelated to any file this session touched.
- `npm run test:one -- tests/phrase_audio_ahead_prefetch.test.ts` after the
  hardening edit, to confirm the added try/catch does not change observable
  behavior (same pass/fail set as before).

## Rollback

Revert the two files to their pre-hardening state from git history; purely
additive logging, safe to drop without any data or entitlement impact.
