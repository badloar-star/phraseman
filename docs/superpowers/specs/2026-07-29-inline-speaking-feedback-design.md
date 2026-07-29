# Inline Speaking Feedback Design

## Goal

Replace the unfinished absolute speaking overlay in lesson phrase-building and trainer phrase practice with a stable inline push-to-talk surface. Holding the existing `Устно` button records speech and shows live volume plus word settlement; releasing it scores the saved attempt in the same reserved area.

## Scope

- `app/lesson1.tsx`, phrase-building while the `Устно` footer action is available.
- `app/trainer_phrases_session.tsx`, `WordBankMode` phrase practice.
- The shared recording, recognition, scoring, playback, lifecycle, and modal behavior in `components/SpeakingPanel.tsx` remains the source of truth.
- Personal-plan pronunciation and the existing modal presentation are out of scope and must retain their current behavior.

## Chosen visual structure

Each host renders a `SpeakingInlineSlot` with a fixed height from the first frame. The slot is transparent while unused. Once a premium learner presses and holds `Устно`, a dark theme-aware card fades into that slot. The card is normal-flow content inside the slot: it has no absolute positioning, host-specific `bottom` offset, modal backdrop, or second microphone button.

The same slot dimensions are used for requesting, listening, scoring, result, permission, no-speech, stalled, and unavailable states. State changes therefore cannot move the prompt, answer area, word bank, check button, progress strip, or footer.

## Interaction and state machine

1. `pressIn` gates premium access, opens the inline surface, and starts a system speech-recognition session.
2. `requesting` displays the masked target and a neutral preparation status.
3. Native `start` or the first partial result changes the state to `listening`, starts the recording cue, and activates the live equalizer.
4. Interim results accumulate across replacing fragments. Target tokens matched by the accumulated transcript replace their underscore masks immediately and never regress during the attempt.
5. `pressOut` stops recognition. The surface enters `scoring` without changing size.
6. The persisted recording URI is retained for `Моя запись` and the neutral control pass. The best accumulated transcript is scored against the scripted target.
7. A valid scored attempt enters `passed` or `failed` and persists until another hold begins or the host advances to another phrase.
8. Another `pressIn` clears the previous transcript, score, recording, and feedback, then starts a new attempt in the same slot.
9. Permission denial, no speech, recognizer stall, or service unavailability produces a neutral recovery state in the same card. These states award no stars and do not penalize progress.
10. Backgrounding, screen blur, unmount, or a superseding capture invalidates asynchronous callbacks, aborts capture, stops playback, restores the loud playback audio mode, and never auto-resumes the microphone.

For the inline presentation, the system recognizer is mandatory because its interim events are the evidence for live word settlement. The Android PCM/Whisper path remains available to the existing modal presentation but is not selected for inline capture because it produces a transcript only after release. Inline system capture persists the recording so final scoring and replay still operate on the actual attempt.

## Result semantics

The full target phrase uses one semantic result color:

- `90–100`: excellent, theme green;
- `75–89`: good, accessible yellow;
- `50–74`: needs improvement, orange;
- `0–49`: retry, theme red.

Five stars provide ordinal feedback without displaying the model score as objective pronunciation truth:

- `0`: no valid scored attempt;
- `1`: score `1–24`;
- `2`: score `25–49`;
- `3`: score `50–74`;
- `4`: score `75–89`;
- `5`: score `90–100`.

The actions appear in this order: `Эталон`, then `Моя запись`. Both have icons, 44-point minimum touch targets, accessibility roles and labels, and token-safe audio playback. Color is reinforced by stars and localized status text, so it is not the only result signal.

## Learning and evidence boundaries

This is a scripted read-aloud task targeting intelligible production and formulaic recall. ASR transcript coverage, saved audio availability, the pronunciation score, and the pedagogical result remain separate evidence layers. `no_speech`, permission failures, interruptions, and infrastructure failures are `INVALID_AUDIO_OR_SYSTEM`; ambiguous or incomplete technical evidence is a neutral retry rather than a zero-score failure. The feature does not remove rewards or block progression from one uncertain recording.

Audio remains temporary: only the current attempt is kept for replay and control scoring, and it is deleted on replacement or unmount. No transcript or raw recording is added to analytics or durable storage by this change.

## Host integration

- Lesson owns the footer hold gesture and renders the shared slot inside the expandable lesson content area below the answer line. A phrase change closes the old surface.
- Trainer owns the result/autofill behavior and renders the shared slot between the word bank and check button. Its existing keyed card lifecycle clears the surface on advance.
- A controlled inline mode is added to `SpeakingButton` so the trainer can keep its existing button visuals and premium gate while the host renders `SpeakingPanel` inside the reserved slot.
- Successful speaking keeps the current lesson/trainer autofill and completion behavior; no existing capability is removed.

## Verification

- Pure unit tests cover four score-color bands and five-star mapping boundary values.
- Source/integration contracts prove both hosts mount a fixed `SpeakingInlineSlot`, use `pressIn`/`pressOut`, and contain no host-specific overlay offsets.
- Contracts prove partial result events update `transcript`, inline capture uses system hold-to-talk with persisted recording, and PCM/Whisper remains available to the modal path.
- Contracts verify result action order, recording replay, reference playback, semantic color plus non-color status, and accessibility labels.
- Existing focused speaking lifecycle, Android availability, recognition options, transcript accumulator, volume, score-band, scoring, audio-mode, layout stability, and runtime lifecycle tests must remain green.

