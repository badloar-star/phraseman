# Learning V2 Voice Hold And Immediate Word Unlock Design

**Approved by owner:** 2026-08-26

## Scope

This change is limited to the shared Learning V2 runtime. It does not author or
unlock another session and does not change lesson progress, rewards, content,
or the approved session registry.

## Voice mode

`scripted_repeat_compare` keeps one stable hold target in the regular lesson
footer. Press-in starts the local recognizer and press-out ends it. Status
updates must not replace the press target or invalidate its callbacks. The mode
body uses the same large ringed reference-audio control as the approved audio
modes, with a clear hierarchy: task instruction, model audio, target phrase,
then the reserved capture/status area. The report flag is anchored at the
bottom-right above the footer. All controls keep 44px minimum targets, reduced
motion support, and accessible busy/selected states.

## Word unlock lifecycle

A word becomes unlocked when its blocking card is first presented, not when
the learner presses Continue and not when the session finishes. The write is
idempotent and preserves the original `firstEncounteredAt`. The player waits
for the lesson unlock registry to hydrate before deciding whether to present a
card; this prevents a previously seen card from flashing during a retry.

Authoring preview uses a separate durable DEV namespace. The development map
dictionary merges that namespace into its visible unlock list, while release
builds read only learner unlocks. This lets the owner test interrupted/retried
sessions without contaminating production learner progress.

## Acceptance

- Holding the footer microphone keeps capture active until release.
- The reference Play control is prominent and replayable.
- The report flag is bottom-right above the footer.
- A newly presented word appears in the lesson dictionary immediately.
- Leaving before session completion does not remove that word.
- Retrying the session does not show the same word card again.
- Authoring-preview writes never enter the production learner key.

