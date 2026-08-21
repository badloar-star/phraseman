# MAX Live Captions and Review Hierarchy Design

**Date:** 2026-08-21  
**Status:** Approved in visual brainstorming; pending written-spec review

## Goal

Make the MAX call and post-call review calm, readable, and action-oriented:

- live text must not appear before MAX starts speaking;
- the live screen must not depend on a growing transcript or fragile autoscroll;
- MAX text should reveal in short readable chunks while audio is playing;
- the review should read as a three-step story instead of a stack of equal-weight cards;
- all existing information and actions must remain available.

## Confirmed root causes

### Live call

Realtime assistant transcript deltas currently flow directly from
`max_call_client.ts` into the transcript buffer and then into React state every
250 ms. Transcript generation may lead remote audio playback, so the UI can show
the completed text before the learner hears it.

The call screen renders the last two growing turns inside a bounded `ScrollView`
without a ref, `scrollToEnd`, or an `onContentSizeChange` policy. When the active
turn grows beyond the viewport, the visible position is not guaranteed to follow
the spoken text.

### Review

The review currently gives similar card weight to the victory, correction,
duration, four speech metrics, goal, homework, detailed corrections, transcript,
and call-again action. The content is valid, but the hierarchy does not tell the
learner what matters first or what to do next.

## Selected live-call design

The approved layout is **one active utterance**:

1. Keep the existing header, goal strip, aura, state hint, controls, tutor board,
   and full-transcript sheet.
2. Replace the growing last-two-turn transcript card with one fixed caption card.
3. Show the latest completed learner turn as small secondary context.
4. Show only the current MAX utterance as the primary caption.
5. Tapping the caption card opens the existing full-transcript sheet.
6. Reserve a stable caption area so the aura and controls do not jump as text
   appears or disappears.
7. The tutor board remains a separate learning aid below the active caption. It
   must not be merged into the subtitle text or removed.

The live screen no longer relies on transcript autoscroll. Long MAX utterances
may wrap inside the fixed caption area, but only the newest readable portion is
shown; the complete utterance remains in transcript history and in the sheet.

## Caption timing and pacing

Realtime does not provide dependable per-word audio timestamps. The product must
therefore promise smooth approximate pacing, not karaoke-grade word alignment.

### Data ownership

- The existing transcript buffer remains the canonical complete history used by
  reconnect, settlement, review, and the transcript sheet.
- A new pure live-caption pacer owns only presentation state. It never edits,
  truncates, or delays canonical transcript history.
- Assistant deltas are copied into the pacer's pending buffer as they arrive.
- Learner final transcripts update the secondary context immediately.

### Playback gates

1. Before `audio_out_started`, assistant text remains pending and invisible.
2. On `audio_out_started`, the pacer begins releasing buffered text.
3. Text is split on whitespace and punctuation into readable chunks of two to
   five words. Strong punctuation may end a chunk earlier.
4. Chunks appear at a calm interval derived from their word count, bounded so a
   short phrase does not flash and a long phrase does not stall.
5. New transcript deltas may extend the pending queue while audio is playing.
6. On `audio_out_stopped`, the remaining text is revealed and the utterance is
   marked complete.
7. On `audio_out_cleared`, barge-in, reconnect, end, or failure, pacing timers are
   cancelled. An interrupted visible utterance keeps its interruption marker;
   unrevealed stale text must never continue appearing.
8. Turning captions off hides the active card without stopping canonical
   transcript capture. Turning captions back on restores the current paced state.

The first visible chunk must never precede `audio_out_started`. This is the main
acceptance boundary.

## Selected post-call review design

The approved review is a three-step narrative:

### 1. What worked

Show one concise victory. Prefer server praise when available; otherwise use the
existing goal/result fallback. This is the first and strongest block.

### 2. What to fix

Show one validated top correction:

- original learner phrase;
- corrected phrase;
- one short explanation when available;
- the existing focused-practice action.

While server review is loading, reserve this step's geometry and show one quiet
loading line. If review fails, show a concise unavailable state without claiming
that no errors occurred. If there is no validated correction, explicitly say
that no confirmed correction was found and omit the practice button.

### 3. What to do tomorrow

For tutor calls, show assigned homework phrases and the promised next topic. For
non-tutor calls or missing homework, show the existing server tip when available;
otherwise show a short neutral next-step message.

### Details disclosure

One collapsed **Lesson details** section preserves:

- call duration and remaining daily time;
- the four local speech metrics;
- tutor goal and mastery progress;
- all additional corrections and polish suggestions;
- full transcript disclosure.

The full transcript remains collapsed by default. No existing information,
tracking, homework persistence, focused-practice capture, or call-again behavior
is removed.

### Navigation

- Keep the visible header back action to Home.
- Keep **Home** and **Another lesson** actions after the narrative.
- Keep focused-practice return routing back to MAX review.
- Keep the normal call-again route through MAX prestart.

## Accessibility and visual rules

- Minimum touch target: 44 by 44 points.
- Primary lime actions use `t.correctText`, never white.
- Body copy uses readable line height and avoids uppercase paragraphs.
- Color is not the only distinction between original and corrected text.
- Loading content reserves space to avoid content jumps.
- Caption pacing uses no bounce or decorative motion and respects captions being
  disabled. It does not require a visual animation when reduced motion is on.
- Existing theme tokens and icon system are reused; no new palette or font is
  introduced.

## Components and boundaries

### Pure caption pacing module

A small pure TypeScript module exposes events for assistant delta, assistant
completion, audio start, timer tick, audio stop/clear, interruption, and reset.
Its output is the currently visible assistant text. Timing is driven by the
screen so the pure state transitions remain deterministic in tests.

### Live caption component

A focused React Native component renders:

- latest completed learner text;
- paced current MAX text;
- stable empty/pre-speaking state;
- press action for the full transcript.

It does not own Realtime transport, transcript history, or navigation.

### Review sections

The review screen derives the three narrative steps from existing result,
correction, homework, goal, metric, and review-loading state. The details
disclosure may be extracted into a local component if needed for readability,
but no new data owner is introduced.

## Testing strategy

1. Pure pacer tests prove that text is invisible before audio start, reveals in
   bounded chunks during playback, flushes on stop, and cancels on clear,
   interruption, reconnect, end, and failure.
2. Transcript buffer tests prove canonical history still receives complete
   deltas immediately and remains independent from display pacing.
3. Client/session contracts prove audio boundary events drive the pacer and that
   the live surface renders one active caption instead of a last-two-turn feed.
4. Review contracts prove the order: worked, fix, tomorrow, then collapsed
   details; they also prove original/corrected text and practice routing remain.
5. Existing MAX state, premint, tutor-board, review, and mistake-practice suites
   remain green.
6. Targeted lint, TypeScript diagnostics, and scoped `git diff --check` complete
   verification. Known unrelated whole-project TypeScript failures are reported
   without modifying unrelated files.

## Acceptance criteria

- No assistant caption is visible before remote audio starts.
- MAX text reveals in chunks of two to five words while audio is active.
- The active caption does not require scrolling to remain readable.
- The latest learner phrase remains visible as secondary context.
- The full canonical transcript remains complete and accessible.
- The review's first visible sequence is: worked, fix, tomorrow.
- Statistics, goal, detailed corrections, homework, and transcript remain
  accessible without dominating the initial screen.
- Focused practice returns to MAX review and another lesson routes through
  prestart.
- No microphone, WebRTC, timer, economy, schema, admin, or deployment behavior is
  changed by this work.
