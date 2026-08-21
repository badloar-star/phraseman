# MAX Live Captions and Review Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chaotic live transcript with one audio-gated paced caption and restructure the post-call review into the approved three-step narrative without removing any existing information or actions.

**Architecture:** Keep `max_call_transcript` as the immediate canonical history and add a separate pure reducer for display-only caption pacing. The session drives that reducer from existing Realtime transcript and audio-boundary events, while a focused caption component renders one active utterance. The review continues to use its existing data owners but changes presentation order and collapses secondary details.

**Tech Stack:** React Native, Expo Router, TypeScript, Jest, OpenAI Realtime event stream.

---

## File map

- Create `app/max_call_live_caption.ts`: pure display-only caption state, chunking, and pacing transitions.
- Create `app/max_call_live_caption_view.tsx`: stable one-utterance caption card.
- Modify `app/max_call_session.tsx`: feed deltas into both canonical history and the caption pacer; drive pacing from audio events; replace the last-two-turn `ScrollView`.
- Modify `app/max_voice_review.tsx`: render the approved worked → fix → tomorrow sequence and collapse secondary details.
- Create `tests/max_call_live_caption.test.ts`: deterministic chunking and lifecycle coverage.
- Modify `tests/max_call_home_entry_contract.test.ts`: live-surface source contract for one active caption and preserved controls.
- Modify `tests/max_voice_review_server_contract.test.ts`: review hierarchy, loading, details, practice, and routing contracts.
- Verify existing `tests/max_call_transcript.test.ts`, `tests/max_call_ui_state.test.ts`, `tests/max_tutor_live_board_state.test.ts`, and `tests/mistake_practice_screen_contract.test.ts`.

### Task 1: Pure audio-gated caption pacer

**Files:**
- Create: `app/max_call_live_caption.ts`
- Create: `tests/max_call_live_caption.test.ts`

- [ ] **Step 1: Write failing lifecycle tests**

Create tests around this public API:

```ts
import {
  LIVE_CAPTION_INITIAL,
  liveCaptionChunkDelayMs,
  reduceLiveCaption,
} from '../app/max_call_live_caption';

test('assistant text remains invisible until remote audio starts', () => {
  const buffered = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
    type: 'assistant_delta', itemId: 'a1', delta: 'Where is the station?',
  });
  expect(buffered.visibleText).toBe('');
  expect(reduceLiveCaption(buffered, { type: 'tick' }).visibleText).toBe('');
});

test('audio start releases two-to-five-word chunks without losing full text', () => {
  let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
    type: 'assistant_delta', itemId: 'a1', delta: 'Where is the train station near here?',
  });
  state = reduceLiveCaption(state, { type: 'audio_started' });
  state = reduceLiveCaption(state, { type: 'tick' });
  const words = state.visibleText.trim().split(/\s+/u);
  expect(words.length).toBeGreaterThanOrEqual(2);
  expect(words.length).toBeLessThanOrEqual(5);
  expect(state.fullText).toBe('Where is the train station near here?');
});

test('audio stop flushes the remaining caption', () => {
  let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
    type: 'assistant_delta', itemId: 'a1', delta: 'This is the complete answer.',
  });
  state = reduceLiveCaption(state, { type: 'audio_started' });
  state = reduceLiveCaption(state, { type: 'audio_stopped' });
  expect(state.visibleText).toBe('This is the complete answer.');
});

test.each(['audio_cleared', 'reconnect', 'end', 'fail'] as const)(
  '%s cancels pending stale caption text',
  (type) => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta', itemId: 'a1', delta: 'Do not reveal this later',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type });
    expect(state.playing).toBe(false);
    expect(reduceLiveCaption(state, { type: 'tick' })).toEqual(state);
  },
);

test('chunk delay is bounded and grows with word count', () => {
  expect(liveCaptionChunkDelayMs('two words')).toBeGreaterThanOrEqual(420);
  expect(liveCaptionChunkDelayMs('one two three four five')).toBeLessThanOrEqual(1_100);
  expect(liveCaptionChunkDelayMs('one two three four five')).toBeGreaterThan(liveCaptionChunkDelayMs('two words'));
});
```

- [ ] **Step 2: Run the new suite and verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/max_call_live_caption.test.ts --no-cache --runInBand
```

Expected: FAIL because `app/max_call_live_caption.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure reducer**

Define:

```ts
export interface LiveCaptionState {
  itemId: string | null;
  fullText: string;
  visibleText: string;
  playing: boolean;
  complete: boolean;
  cancelled: boolean;
}

export type LiveCaptionEvent =
  | { type: 'assistant_delta'; itemId: string; delta: string }
  | { type: 'assistant_done'; itemId: string }
  | { type: 'audio_started' }
  | { type: 'tick' }
  | { type: 'audio_stopped' }
  | { type: 'audio_cleared' | 'reconnect' | 'end' | 'fail' }
  | { type: 'reset' };
```

Rules:

- a new assistant `itemId` replaces only display state, never transcript history;
- delta events append to `fullText` without changing `visibleText`;
- `tick` is a no-op until `playing` is true;
- `tick` appends the next two-to-five-word chunk, preferring punctuation as an earlier boundary;
- incomplete trailing word text is held until more delta text or `assistant_done`;
- `audio_stopped` reveals all `fullText` and stops pacing;
- clear/reconnect/end/fail stop pacing and prevent later ticks from revealing queued text;
- `liveCaptionChunkDelayMs` returns `Math.min(1_100, Math.max(420, wordCount * 210))`.

Use a boundary helper with this concrete shape:

```ts
function nextChunkEnd(text: string, from: number, complete: boolean): number {
  const tail = text.slice(from);
  const matches = [...tail.matchAll(/\S+\s*/gu)];
  const stable = complete || /[\s.!?…,:;]$/u.test(tail);
  if (!stable || matches.length < 2) return from;
  const limit = Math.min(5, matches.length);
  for (let count = 2; count <= limit; count += 1) {
    const token = matches[count - 1]?.[0] ?? '';
    if (/[.!?…,:;]\s*$/u.test(token)) {
      return from + (matches[count - 1]?.index ?? 0) + token.length;
    }
  }
  const token = matches[limit - 1]?.[0] ?? '';
  return from + (matches[limit - 1]?.index ?? 0) + token.length;
}
```

The reducer's `tick` branch calls this helper, trims only the visible rendering,
and retains `fullText` byte-for-byte.

- [ ] **Step 4: Run RED→GREEN verification**

Run the new suite plus canonical transcript tests. Expected: both pass; canonical history behavior is unchanged.

### Task 2: One active live caption surface

**Files:**
- Create: `app/max_call_live_caption_view.tsx`
- Modify: `app/max_call_session.tsx`
- Modify: `tests/max_call_home_entry_contract.test.ts`
- Test: `tests/max_call_ui_state.test.ts`
- Test: `tests/max_tutor_live_board_state.test.ts`

- [ ] **Step 1: Add failing source contracts**

Add assertions that the session:

```ts
expect(session).toContain('MaxCallLiveCaptionView');
expect(session).toContain("case 'audio_out_started'");
expect(session).toContain("type: 'audio_started'");
expect(session).toContain('liveCaptionChunkDelayMs');
expect(session).not.toContain('const lastTwo = turns.slice(-2)');
expect(session).not.toContain('{lastTwo.map((turn, i) => (');
expect(captionView).toContain('latestUserText');
expect(captionView).toContain('visibleAssistantText');
expect(captionView).toContain('minHeight:');
expect(captionView).toContain('onOpenTranscript');
```

Keep existing assertions for `max-call-dynamic-content`, bounded dynamic content,
the tutor board, full transcript sheet, and controls.

- [ ] **Step 2: Verify RED**

Run the Home/live source contract. Expected: new component and pacing assertions fail.

- [ ] **Step 3: Create the caption view**

Create `MaxCallLiveCaptionView` with props:

```ts
interface MaxCallLiveCaptionViewProps {
  latestUserText: string;
  visibleAssistantText: string;
  onOpenTranscript(): void;
  lang: Lang;
}
```

Render a single `TouchableOpacity` with a stable minimum height, secondary learner
context, primary MAX text, accessible button label, existing glass/theme tokens,
and no internal scroll. If both strings are empty, render reserved space without
inventing content.

- [ ] **Step 4: Integrate presentation state without increasing delta renders**

In `max_call_session.tsx`:

- keep every event flowing immediately into `bufferRef`;
- keep pacer state in a ref so transcript deltas do not call React `setState`;
- store only `visibleAssistantText` in React when a pacing tick changes it;
- derive `latestUserText` from the latest canonical completed user turn;
- on `audio_out_started`, dispatch `audio_started`, publish the first tick, and
  schedule recursive timeouts using `liveCaptionChunkDelayMs`;
- on `audio_out_stopped`, reveal the remaining text and cancel the timer;
- on clear/reconnect/end/fail, cancel the timer and dispatch the matching event;
- on `assistant_done`, mark the display item complete while canonical history is
  completed as before;
- clear the timer in the effect cleanup.

Use one recursive timeout rather than an always-running interval:

```ts
const liveCaptionRef = useRef(LIVE_CAPTION_INITIAL);
const liveCaptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [visibleAssistantText, setVisibleAssistantText] = useState('');

const publishCaption = () => {
  setVisibleAssistantText(liveCaptionRef.current.visibleText);
};

const stopCaptionTimer = () => {
  if (liveCaptionTimerRef.current !== null) clearTimeout(liveCaptionTimerRef.current);
  liveCaptionTimerRef.current = null;
};

const scheduleCaptionTick = () => {
  stopCaptionTimer();
  const before = liveCaptionRef.current.visibleText;
  liveCaptionRef.current = reduceLiveCaption(liveCaptionRef.current, { type: 'tick' });
  const after = liveCaptionRef.current.visibleText;
  if (after !== before) publishCaption();
  if (!liveCaptionRef.current.playing) return;
  const added = after.slice(before.length);
  liveCaptionTimerRef.current = setTimeout(scheduleCaptionTick, liveCaptionChunkDelayMs(added));
};
```

`handleUiEvent` maps `audio_out_started`, `audio_out_stopped`,
`audio_out_cleared`, `reconnect_started`, `end`, and `fail` to the matching pacer
events before calling `reduceMaxCallUi`.

Replace the last-two-turn transcript card with `MaxCallLiveCaptionView`. Keep the
tutor board inside the existing bounded dynamic region and preserve the full
transcript sheet opened by the caption.

- [ ] **Step 5: Verify GREEN**

Run the live source contract, pacer tests, UI-state tests, transcript tests, and
tutor-board tests. Expected: all pass.

### Task 3: Three-step review hierarchy

**Files:**
- Modify: `app/max_voice_review.tsx`
- Modify: `tests/max_voice_review_server_contract.test.ts`
- Test: `tests/mistake_practice_screen_contract.test.ts`

- [ ] **Step 1: Write failing hierarchy contracts**

Require stable test IDs and order:

```ts
expect(screen).toContain('testID="max-voice-review-worked"');
expect(screen).toContain('testID="max-voice-review-fix"');
expect(screen).toContain('testID="max-voice-review-tomorrow"');
expect(screen).toContain('testID="max-voice-review-details-toggle"');
expect(screen).toContain('const [detailsOpen, setDetailsOpen] = useState(false)');
expect(screen.indexOf('max-voice-review-worked')).toBeLessThan(screen.indexOf('max-voice-review-fix'));
expect(screen.indexOf('max-voice-review-fix')).toBeLessThan(screen.indexOf('max-voice-review-tomorrow'));
expect(screen.indexOf('max-voice-review-tomorrow')).toBeLessThan(screen.indexOf('max-voice-review-details-toggle'));
expect(screen).toContain('{topFocus.original}');
expect(screen).toContain('{topFocus.corrected}');
expect(screen).toContain("reviewState === 'loading'");
expect(screen).toContain("returnTo: 'max_voice_review'");
expect(screen).toContain("pathname: '/max_call_prestart'");
```

Also keep contracts proving metrics, tutor goal, homework, detailed corrections,
and full transcript still exist in the source.

- [ ] **Step 2: Verify RED**

Run the review contract. Expected: the new hierarchy IDs and details state fail.

- [ ] **Step 3: Implement the approved narrative**

Reorder the visible review body:

1. `max-voice-review-worked`: one victory/praise.
2. `max-voice-review-fix`: original phrase, corrected phrase, short note, and the
   existing focused-practice action. During loading, show only the localized
   analysis line in reserved geometry. On error, show a concise unavailable
   message. With no confirmed correction, show a no-confirmed-correction message
   and no practice button.
3. `max-voice-review-tomorrow`: tutor homework and next topic; otherwise server
   tip; otherwise a localized neutral next-step message.

Add `detailsOpen` and a 44-point `max-voice-review-details-toggle`. When open,
render existing duration/remaining-time, four metrics, tutor goal/mastery,
additional corrections, and the existing nested full-transcript disclosure.
Do not remove homework persistence effects, correction capture, analytics, or
routing.

Render visible Home and Another lesson actions after the narrative/details. Lime
actions retain `t.correctText`.

The top-level JSX order must follow this concrete structure:

```tsx
<View testID="max-voice-review-worked">{/* victory */}</View>
<View testID="max-voice-review-fix">
  {reviewState === 'loading' ? loadingCopy : topFocus ? correctionAndPractice : emptyOrErrorCopy}
</View>
<View testID="max-voice-review-tomorrow">{/* homework/topic or tip */}</View>
<TouchableOpacity
  testID="max-voice-review-details-toggle"
  accessibilityRole="button"
  accessibilityState={{ expanded: detailsOpen }}
  onPress={() => setDetailsOpen((open) => !open)}
  style={{ minHeight: 44 }}
>
  {/* localized title + chevron */}
</TouchableOpacity>
{detailsOpen ? <View testID="max-voice-review-details">{/* preserved secondary data */}</View> : null}
```

- [ ] **Step 4: Verify GREEN**

Run the review and mistake-practice contracts. Expected: hierarchy passes and
focused practice still returns to review.

### Task 4: Focused final verification

**Files:** Verify only.

- [ ] **Step 1: Run all selected root tests**

```powershell
npx jest --runTestsByPath tests/max_call_live_caption.test.ts tests/max_call_transcript.test.ts tests/max_call_ui_state.test.ts tests/max_call_home_entry_contract.test.ts tests/max_tutor_live_board_state.test.ts tests/max_voice_review_server_contract.test.ts tests/mistake_practice_screen_contract.test.ts --no-cache --runInBand
```

Expected: seven suites pass with zero failed tests.

- [ ] **Step 2: Run focused lint**

```powershell
npx eslint app/max_call_live_caption.ts app/max_call_live_caption_view.tsx app/max_call_session.tsx app/max_voice_review.tsx
```

Expected: zero errors. Existing unrelated warnings, if any, are reported without
editing unrelated code.

- [ ] **Step 3: Run TypeScript diagnostics**

Run the repository TypeScript command with the repository's 12 GB Node heap. If
whole-project errors remain outside the four MAX files, report the decisive
errors and do not modify those unrelated files. No error may point to a changed
MAX file.

- [ ] **Step 4: Inspect the scoped diff**

```powershell
git diff --check -- app/max_call_live_caption.ts app/max_call_live_caption_view.tsx app/max_call_session.tsx app/max_voice_review.tsx tests/max_call_live_caption.test.ts tests/max_call_home_entry_contract.test.ts tests/max_voice_review_server_contract.test.ts
```

Confirm that no admin, Arena, economy, Firestore, auth, schema, microphone,
WebRTC, timer-accounting, or deployment behavior changed.

- [ ] **Step 5: Report evidence**

Report the chosen UI behavior, exact passing suite/test counts, lint/typecheck
status, any unrelated TypeScript limitation, and that no deployment was run.
