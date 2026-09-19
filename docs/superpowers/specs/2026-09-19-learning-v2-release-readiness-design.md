# Learning V2 Release Readiness Design

**Status:** owner-approved direction, 2026-09-19  
**Chosen intro:** variant 2, «Пропуск основателя»  
**Owner amendment:** the pass must show the current user's nickname.

## Outcome

Learning V2 becomes reachable in production. Every lesson card can be opened so
the learner can inspect its 56-session map. A lesson whose complete factory-native
material is not available carries the same construction metaphor as an unfinished
session. Only sessions present in the canonical factory-native catalog are playable;
missing sessions remain visible with `construct-outline` and cannot start.

The first production entry per account and intro version presents an animated
Founder Pass. It waits for a non-empty current nickname, displays that nickname on
the pass, explains that the course is still being built, and asks for early feedback.
It also states that every session ends with a star rating and optional comment.
Dismissal (close or CTA) writes the account-scoped seen receipt; merely mounting the
screen does not. Reduced-motion keeps the same content and final state without the
decorative choreography.

## UI contract

- Use the active app theme. Midnight is not hard-coded.
- Modal: dim backdrop, one raised pass, small construction/status badge, nickname,
  concise copy, one primary CTA, one close button.
- Lime/accent fills always use dark foreground.
- Entrance uses only opacity/transform: backdrop fade, pass rise/scale, restrained
  diagonal sheen. No perpetual animation. Target duration 220–320 ms.
- Minimum touch target is 44×44. Screen reader order is close → status → nickname →
  explanation → feedback promise → CTA.
- The modal is shown once per stable account and version `founder-pass-v1`.
- The dictionary becomes a compact 44×44 header control beside runes and energy,
  with a small count badge. There is no floating lower-right dictionary button.
- The DEV unlock-all control remains guarded by both `__DEV__` and
  `ENABLE_DEV_TOOLS` and must be absent from release output.

## Behavior contract

1. Release navigation no longer redirects Learning V2 to Home.
2. The ordinary Lessons entry remains stable; the New Lessons chip and V2 tab open
   the course in production.
3. All 32 lesson cards open their maps. Incomplete lessons show construction state.
4. Unpublished sessions remain construction nodes; published sessions retain the
   existing sequential progress rule.
5. New words enter the lesson dictionary only after the blocking word card has a
   real on-screen layout. Future catalog words never populate the dictionary.
6. Continuing from a new-word encounter animates the entire modal sheet into the
   word pocket; the sheet does not linger after the card.
7. The shared flashcard keeps rounded reverse-side corners during 3D flip.
8. Correct interactions award 3/2/1 runes for first/second/later-or-hinted success.
   Score state settles immediately; the flight retries layout measurement and never
   controls the award. Repeat/preview runs still cannot mint wallet currency.
9. Hold-to-talk remains active until physical release. Android prefers app-owned PCM;
   system-recognizer terminal events during a hold restart capture without resetting
   the visible listening state or finalizing early.
10. Learning V2 feedback uses its own `learning_v2` kind end-to-end and appears as a
    separate source in the single live admin surface.
11. Opening a lesson map uses a one-shot opacity/transform entrance. The final
    choreography remains owner-selectable from the three-variant HTML mockup.
    Scrolling never writes viewability into React state and never runs a per-node
    infinite float; only the current node may keep its existing UI-thread halo.
12. The pre-session outcome modal animates its scene/details after the shell and
    uses the same short exit before close, start, or skip. Reduced motion applies
    the same final state immediately.
13. Every admitted factory-native English session ships published MP3 for each
    required word/phrase coordinate in `ash`, `onyx`, `nova`, and `coral`.
    One voice is selected deterministically per interaction and every selected
    file is hash/size verified locally before intro opens; playback never invokes
    remote TTS or performs a network fetch on tap.

## Data and safety

- Seen receipt is local, account-scoped, versioned, idempotent, and guarded against
  account transitions.
- No new Firestore collection or field is introduced. `feedback_entries.kind` gains
  one allowlisted enum value; Firestore rules remain collection-level deny-client.
- Jarvis fetchers do not read `feedback_entries`, so no Jarvis contract changes are
  required. The alert source gains a Learning V2 category without transmitting the
  free-form comment.
- No App Check settings change.

## Acceptance evidence

- Focused source/behavior tests cover release reachability, lesson construction
  state, one-time account scope, mandatory nickname, dictionary placement and
  provenance, whole-sheet flight, flip clipping, rune ladder/flight retry, hold
  lifecycle, feedback enum, admin source, and release DEV-control exclusion.
- Focused TypeScript/Jest gates pass under the repository semaphore.
- Blueprint gate remains PASS; the known retired course-slot preflight HOLD is
  reported separately and is not weakened.
- Audio audit must cover all admitted factory sessions and report zero missing
  coordinates. Generated files remain within the existing 64 KiB runtime bound.
