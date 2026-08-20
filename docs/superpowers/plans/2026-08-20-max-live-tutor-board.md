# MAX Live Tutor Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved MAX live lesson visible during the call with the exact two-ring central aura, a stable goal strip, one transient tutor board, explicit topic switching, and a concise actionable review.

**Architecture:** Keep the current Realtime transport, tutor memory, lesson plan, settlement, transcript, and SRS pipeline unchanged. Add one pure client reducer for transient UI, two strictly validated tutor tools, small presentational components, and narrow orchestration in `max_call_session.tsx`; reorder existing review data instead of creating a second review service.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native Reanimated, Firebase callable backend, OpenAI Realtime function tools, Jest, React Native Testing Library.

---

## Constraints

- Work in the current checkout and branch. Project rules forbid a new worktree,
  branch, or delegated coding task without a separate explicit owner request.
- Preserve all unrelated dirty-worktree changes.
- `constants/motionHybrid.ts`, `app/max_call_session.tsx`, and
  `app/analytics.ts` already contain owner changes before this plan. For those
  three files, stage only the hunks introduced by this plan with `git add -p`;
  never stage the whole file.
- Do not change MAX transport, billing, quota, settlement, privacy retention, or
  economy contracts.
- Do not add a Firestore collection or field.
- Do not use a project OpenAI API key from Codex. Runtime production Realtime
  use remains unchanged.
- Every new motion number must live in `constants/motionHybrid.ts`.
- Lime-filled controls use dark foreground.

## File map

**Create**

- `app/max_tutor_live_board_state.ts` — types, validation, and reducer for the
  temporary board/topic/notice UI.
- `components/max/MaxTutorGoalStrip.tsx` — stable current goal or free-talk
  label.
- `components/max/MaxTutorLiveBoard.tsx` — one validated phrase card.
- `components/max/MaxTutorTopicNotice.tsx` — short inline topic confirmation.
- `tests/max_tutor_live_board_state.test.ts` — reducer and validation tests.
- `tests/max_call_halo_visual_contract.test.ts` — exact aura geometry and motion
  token contract.
- `tests/max_tutor_live_components.test.tsx` — accessibility and rendering.
- `tests/max_call_live_board_integration_contract.test.ts` — session wiring and
  teardown guards.

**Modify**

- `constants/motionHybrid.ts` — `MAX_CALL_HYBRID` geometry/motion tokens.
- `app/max_call_halo.tsx` — approved two rings, 106 dp core support, feather and
  reduce-motion behavior.
- `app/max_call_tutor_tools.ts` — validated `show_tutor_board` and
  `set_live_topic` tool handling.
- `tests/max_call_tutor_tools.test.ts` — tool validation and callbacks.
- `functions/src/max_voice_prompt.ts` — tutor behavior and Realtime tool schemas.
- `functions/src/max_voice_prompt.test.ts` — prompt/tool contract.
- `app/max_call_session.tsx` — goal strip, board, topic notice, lifecycle and
  safe telemetry.
- `app/analytics.ts` — governed MAX UI event names.
- `app/max_voice_review.tsx` — victory/focus-first hierarchy and practice CTA.
- `tests/max_voice_review_server_contract.test.ts` — review hierarchy/fallback.

## Task 1: Pure live-board state machine

**Files:**

- Create: `app/max_tutor_live_board_state.ts`
- Create: `tests/max_tutor_live_board_state.test.ts`

- [ ] **Step 1: Write the failing reducer tests**

```ts
import {
  initialTutorLiveUiState,
  normalizeTutorBoard,
  reduceTutorLiveUi,
} from '../app/max_tutor_live_board_state';

describe('MAX tutor live board', () => {
  it('accepts one bounded hint and replaces the previous board', () => {
    const first = normalizeTutorBoard({
      kind: 'hint',
      targetText: 'Could we move it to Friday?',
      meaning: 'Можем перенести это на пятницу?',
      source: 'learner_request',
    }, 1000);
    expect(first?.expiresAtMs).toBe(13_000);
    const a = reduceTutorLiveUi(initialTutorLiveUiState('Встреча'), { type: 'show_board', board: first! });
    const b = reduceTutorLiveUi(a, {
      type: 'show_board',
      board: { ...first!, targetText: 'Could we do Sunday instead?' },
    });
    expect(b.board?.targetText).toBe('Could we do Sunday instead?');
  });

  it.each(['speech_started', 'reconnecting', 'background', 'ended'] as const)(
    '%s clears transient help',
    (type) => {
      const board = normalizeTutorBoard({ kind: 'hint', targetText: 'Try this', source: 'silence' }, 1000)!;
      const shown = reduceTutorLiveUi(initialTutorLiveUiState('Work'), { type: 'show_board', board });
      expect(reduceTutorLiveUi(shown, { type }).board).toBeNull();
    },
  );

  it('changes topic, clears the board, and can enter free talk without deleting the planned goal', () => {
    const board = normalizeTutorBoard({ kind: 'translation', targetText: 'weekend', source: 'learner_request' }, 1000)!;
    const shown = reduceTutorLiveUi(initialTutorLiveUiState('Work'), { type: 'show_board', board });
    const changed = reduceTutorLiveUi(shown, {
      type: 'set_topic', topic: 'Планы на выходные', mode: 'free_talk', nowMs: 2000,
    });
    expect(changed).toMatchObject({ board: null, currentTopic: 'Планы на выходные', mode: 'free_talk' });
    expect(changed.notice?.expiresAtMs).toBe(4000);
  });

  it('rejects unknown enums, blank text, and oversized payloads', () => {
    expect(normalizeTutorBoard({ kind: 'grade', targetText: 'x', source: 'silence' }, 0)).toBeNull();
    expect(normalizeTutorBoard({ kind: 'hint', targetText: ' ', source: 'silence' }, 0)).toBeNull();
    expect(normalizeTutorBoard({ kind: 'hint', targetText: 'x'.repeat(101), source: 'silence' }, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx jest tests/max_tutor_live_board_state.test.ts --runInBand`

Expected: FAIL because `app/max_tutor_live_board_state.ts` does not exist.

- [ ] **Step 3: Implement the bounded types and reducer**

```ts
export type TutorBoardKind = 'hint' | 'recast' | 'translation';
export type TutorBoardSource = 'learner_request' | 'silence' | 'confident_correction';
export type TutorConversationMode = 'guided' | 'free_talk';

export interface TutorBoardPayload {
  kind: TutorBoardKind;
  targetText: string;
  meaning: string;
  source: TutorBoardSource;
  shownAtMs: number;
  expiresAtMs: number;
}

export interface TutorLiveUiState {
  board: TutorBoardPayload | null;
  currentTopic: string;
  mode: TutorConversationMode;
  notice: { text: string; expiresAtMs: number } | null;
}

export const TUTOR_BOARD_TTL_MS = 12_000;
export const TUTOR_TOPIC_NOTICE_MS = 2_000;

export function normalizeTutorBoard(raw: Record<string, unknown>, nowMs: number): TutorBoardPayload | null {
  const kind = String(raw.kind ?? '') as TutorBoardKind;
  const source = String(raw.source ?? '') as TutorBoardSource;
  const targetText = String(raw.targetText ?? '').replace(/\s+/g, ' ').trim();
  const meaning = String(raw.meaning ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
  if (!['hint', 'recast', 'translation'].includes(kind)) return null;
  if (!['learner_request', 'silence', 'confident_correction'].includes(source)) return null;
  if (!targetText || targetText.length > 100) return null;
  if (kind === 'recast' && source !== 'confident_correction') return null;
  return { kind, source, targetText, meaning, shownAtMs: nowMs, expiresAtMs: nowMs + TUTOR_BOARD_TTL_MS };
}
```

Implement `initialTutorLiveUiState(topic)` and exhaustive
`reduceTutorLiveUi(state, event)` for `show_board`, `dismiss_board`,
`speech_started`, `set_topic`, `expire`, `reconnecting`, `background`, and
`ended`. `expire` clears expired board/notice only; all transport lifecycle
events clear both transient elements.

- [ ] **Step 4: Run the reducer test and verify GREEN**

Run: `npx jest tests/max_tutor_live_board_state.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- app/max_tutor_live_board_state.ts tests/max_tutor_live_board_state.test.ts
git commit -m "feat(max): add live tutor board state"
```

## Task 2: Tutor tools and server prompt contract

**Files:**

- Modify: `app/max_call_tutor_tools.ts`
- Modify: `tests/max_call_tutor_tools.test.ts`
- Modify: `functions/src/max_voice_prompt.ts`
- Modify: `functions/src/max_voice_prompt.test.ts`

- [ ] **Step 1: Add failing client tool-runner tests**

Extend the existing `makeRunner()` dependencies with `onLiveBoard` and
`onLiveTopic`, then add:

```ts
it('show_tutor_board validates and emits one safe payload', () => {
  const { runner, liveBoards } = makeRunner();
  const result = runner.handle('show_tutor_board', {
    kind: 'hint',
    target_text: 'Could we move it to Friday?',
    meaning: 'Можем перенести это на пятницу?',
    source: 'learner_request',
  });
  expect(result).toEqual({ output: 'Tutor board shown.', respond: false });
  expect(liveBoards).toEqual([{
    kind: 'hint', targetText: 'Could we move it to Friday?',
    meaning: 'Можем перенести это на пятницу?', source: 'learner_request',
  }]);
});

it('set_live_topic emits guided/free-talk mode and rejects blank topics', () => {
  const { runner, liveTopics } = makeRunner();
  expect(runner.handle('set_live_topic', { topic: 'Weekend plans', mode: 'guided' }).respond).toBe(false);
  expect(liveTopics).toEqual([{ topic: 'Weekend plans', mode: 'guided' }]);
  expect(runner.handle('set_live_topic', { topic: ' ', mode: 'free_talk' }).output).toContain('Topic is empty');
});
```

- [ ] **Step 2: Run client tests and verify RED**

Run: `npx jest tests/max_call_tutor_tools.test.ts --runInBand`

Expected: FAIL because the callbacks and tool cases do not exist.

- [ ] **Step 3: Implement client tool handling**

Add dependency callbacks:

```ts
onLiveBoard?(payload: {
  kind: 'hint' | 'recast' | 'translation';
  targetText: string;
  meaning: string;
  source: 'learner_request' | 'silence' | 'confident_correction';
}): void;
onLiveTopic?(payload: { topic: string; mode: 'guided' | 'free_talk' }): void;
```

Implement `show_tutor_board` and `set_live_topic` using the same whitespace
normalization style as the existing homework tools. Enforce target 100 chars,
meaning 140 chars, topic 80 chars, enum validation, and
`recast → confident_correction`. Return `respond:false` because the teacher has
already spoken or is speaking the associated help.

- [ ] **Step 4: Add failing server prompt/tool-schema tests**

```ts
it('exposes bounded live-board and topic tools only in tutor sessions', () => {
  const names = TUTOR_TOOLS.map((tool) => tool.name);
  expect(names).toContain('show_tutor_board');
  expect(names).toContain('set_live_topic');
  expect(JSON.stringify(TUTOR_TOOLS)).toContain('confident_correction');
  expect(VOICE_TUTOR_PREFIX).toContain('The learning goal and conversation topic are separate');
  expect(VOICE_TUTOR_PREFIX).toContain('Never show a recast when recognition is uncertain');
});
```

Run from `functions`: `npx jest src/max_voice_prompt.test.ts --runInBand`

Expected: FAIL on missing tools/instructions.

- [ ] **Step 5: Implement server prompt and exact tool schemas**

Add instructions that:

- call `show_tutor_board` only after a learner request, configured silence hint,
  or one confident correction;
- call `set_live_topic` after verbally accepting an explicit topic change;
- retain the planned goal when it transfers naturally;
- use `free_talk` when the learner declines the planned goal;
- never claim goal mastery in free talk without evidence.

Add JSON schemas with enum and `maxLength` bounds matching the client.

- [ ] **Step 6: Run both focused suites and verify GREEN**

Run:

```powershell
npx jest tests/max_call_tutor_tools.test.ts --runInBand
Push-Location functions
npx jest src/max_voice_prompt.test.ts --runInBand
Pop-Location
```

Expected: both PASS.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -- app/max_call_tutor_tools.ts tests/max_call_tutor_tools.test.ts functions/src/max_voice_prompt.ts functions/src/max_voice_prompt.test.ts
git commit -m "feat(max): add live board realtime tools"
```

## Task 3: Exact approved central aura

**Files:**

- Modify: `constants/motionHybrid.ts`
- Modify: `app/max_call_halo.tsx`
- Modify: `app/max_call_session.tsx`
- Create: `tests/max_call_halo_visual_contract.test.ts`

- [ ] **Step 1: Write the failing visual contract**

```ts
import fs from 'node:fs';

describe('MAX approved call halo', () => {
  const motion = fs.readFileSync('constants/motionHybrid.ts', 'utf8');
  const halo = fs.readFileSync('app/max_call_halo.tsx', 'utf8');
  const session = fs.readFileSync('app/max_call_session.tsx', 'utf8');

  it('locks the 178/170/138/106 geometry in shared tokens', () => {
    expect(motion).toContain('export const MAX_CALL_HYBRID');
    expect(motion).toMatch(/containerSize:\s*178/);
    expect(motion).toMatch(/outerRingSize:\s*170/);
    expect(motion).toMatch(/innerRingSize:\s*138/);
    expect(motion).toMatch(/coreSize:\s*106/);
  });

  it('renders two stroked rings and keeps reduce-motion support', () => {
    expect(halo).toContain('MAX_CALL_HYBRID.outerRingSize');
    expect(halo).toContain('MAX_CALL_HYBRID.innerRingSize');
    expect(halo).toContain('borderWidth: MAX_CALL_HYBRID.ringStrokePx');
    expect(halo).toContain('useReduceMotion()');
    expect(session).toContain('size={MAX_CALL_HYBRID.coreSize}');
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npx jest tests/max_call_halo_visual_contract.test.ts --runInBand`

Expected: FAIL on missing `MAX_CALL_HYBRID`.

- [ ] **Step 3: Add shared geometry and motion tokens**

```ts
export const MAX_CALL_HYBRID = {
  containerSize: 178,
  outerRingSize: 170,
  innerRingSize: 138,
  coreSize: 106,
  iconSize: 44,
  ringStrokePx: 1,
  outerRingOpacity: 0.17,
  innerRingOpacity: 0.14,
  coreOpacity: 0.11,
  breathScale: 1.055,
  breathHalfMs: 1500,
  micPulseMax: 0.18,
  micAttackMs: 110,
  micReleaseMs: 260,
} as const;
```

- [ ] **Step 4: Rebuild `MaxCallHalo` to match the mockup**

Keep the existing imperative `setMicLevel` API and feather layers. Render the
feather first, then two absolute transparent `Animated.View` rings, then the
core child. Add a small top-left translucent highlight layer inside the core in
`max_call_session.tsx`. The rings share breath/mic transforms; the core uses the
existing damped 22% response. Under Reduce Motion, cancel all cyclic and
mic-driven transforms.

- [ ] **Step 5: Run focused aura/motion tests**

Run:

```powershell
npx jest tests/max_call_halo_visual_contract.test.ts tests/max_call_audio_level.test.ts tests/motion_hybrid_contract.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- app/max_call_halo.tsx tests/max_call_halo_visual_contract.test.ts
git add -p -- constants/motionHybrid.ts app/max_call_session.tsx
git commit -m "feat(max): match approved call halo"
```

## Task 4: Goal strip, live board, and topic notice components

**Files:**

- Create: `components/max/MaxTutorGoalStrip.tsx`
- Create: `components/max/MaxTutorLiveBoard.tsx`
- Create: `components/max/MaxTutorTopicNotice.tsx`
- Create: `tests/max_tutor_live_components.test.tsx`

- [ ] **Step 1: Write failing component tests**

Test with the RNTL config that:

```tsx
render(<MaxTutorGoalStrip mode="guided" title="Вежливо предложить другое время" mastery={2} />);
expect(screen.getByText('Вежливо предложить другое время')).toBeTruthy();

render(<MaxTutorGoalStrip mode="free_talk" title="hidden" mastery={0} />);
expect(screen.getByText('Свободный разговор')).toBeTruthy();
expect(screen.queryByText('hidden')).toBeNull();

render(<MaxTutorLiveBoard board={board} onListen={onListen} onDismiss={onDismiss} />);
fireEvent.press(screen.getByRole('button', { name: 'Прослушать фразу' }));
expect(onListen).toHaveBeenCalledTimes(1);
expect(screen.getByRole('button', { name: 'Скрыть подсказку' })).toBeTruthy();
```

- [ ] **Step 2: Run and verify RED**

Run:

```powershell
npx jest --config jest.rntl.config.cjs tests/max_tutor_live_components.test.tsx --runInBand
```

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement the three presentational components**

Use `useTheme()` and `fontSizes()`. The goal strip accepts only plain props and
contains no tool logic. The board uses a single card with type-specific label,
dark text on any lime-filled action, 44 dp controls, and accessibility labels.
The topic notice is inline, not a `Modal`, and announces its text with
`accessibilityLiveRegion="polite"`.

Use `LUM.resolveMs`/`LUM.exitMs` for board opacity/translate animation and
instant static rendering under `useReduceMotion()`.

- [ ] **Step 4: Run and verify GREEN**

Run:

```powershell
npx jest --config jest.rntl.config.cjs tests/max_tutor_live_components.test.tsx --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```powershell
git add -- components/max/MaxTutorGoalStrip.tsx components/max/MaxTutorLiveBoard.tsx components/max/MaxTutorTopicNotice.tsx tests/max_tutor_live_components.test.tsx
git commit -m "feat(max): add live tutor board components"
```

## Task 5: Wire the live lesson into the call screen

**Files:**

- Modify: `app/max_call_session.tsx`
- Modify: `app/analytics.ts`
- Create: `tests/max_call_live_board_integration_contract.test.ts`

- [ ] **Step 1: Write failing integration guards**

```ts
const source = fs.readFileSync('app/max_call_session.tsx', 'utf8');

expect(source).toContain('MaxTutorGoalStrip');
expect(source).toContain('MaxTutorLiveBoard');
expect(source).toContain('MaxTutorTopicNotice');
expect(source).toContain("case 'show_tutor_board'");
expect(source).toContain("type: 'speech_started'");
expect(source).toContain("type: 'reconnecting'");
expect(source).toContain("type: 'background'");
expect(source).toContain('max_tutor_topic_changed');
expect(source).not.toMatch(/targetText.*trackEvent|meaning.*trackEvent/);
```

Also assert that the tutor components render only for `format === 'tutor'` and
the existing scenario/companion formats retain their old caption/control path.

- [ ] **Step 2: Run and verify RED**

Run: `npx jest tests/max_call_live_board_integration_contract.test.ts --runInBand`

Expected: FAIL on missing imports/wiring.

- [ ] **Step 3: Add session state and callbacks**

Initialize the reducer after mint activation using the existing tutor plan and
topic. Add runner callbacks:

```ts
onLiveBoard: (raw) => {
  const board = normalizeTutorBoard(raw, Date.now());
  if (!board) return;
  dispatchTutorUi({ type: 'show_board', board });
  void trackEvent('max_tutor_board_shown', {
    kind: board.kind,
    source: board.source,
    cefr: cefr ?? 'unknown',
  });
},
onLiveTopic: ({ topic, mode }) => {
  dispatchTutorUi({ type: 'set_topic', topic, mode, nowMs: Date.now() });
  void trackEvent('max_tutor_topic_changed', { mode, cefr: cefr ?? 'unknown' });
},
```

Never send topic text, board text, meaning, transcript, or audio through these
telemetry calls.

- [ ] **Step 4: Connect lifecycle events**

- `speech_started` → clear the board before reducing the existing call UI;
- visible reconnect → clear board/notice;
- AppState non-active → clear board/notice;
- end/fail/unmount → clear board/notice;
- one lightweight interval while board/notice exists dispatches `expire`;
- manual close tracks only kind and dismissal reason;
- `Прослушать` uses the existing data-channel response path with a bounded
  instruction to repeat `targetText` exactly, microphone temporarily protected
  by the existing assistant-output phase; it does not alter mastery.

- [ ] **Step 5: Render the approved hierarchy**

For tutor format, render goal strip below the header, keep the exact aura in the
center, render topic notice above the goal strip, and render the live board
above controls. Captions remain user-controlled and must not be covered by the
board. Scenario/companion/trial paths remain unchanged.

- [ ] **Step 6: Add governed analytics names**

Add these literal members to `AnalyticsEvent`:

```ts
| 'max_tutor_board_shown'
| 'max_tutor_board_listened'
| 'max_tutor_board_dismissed'
| 'max_tutor_topic_changed'
| 'max_tutor_review_practice_started'
```

- [ ] **Step 7: Run session-focused tests**

Run:

```powershell
npx jest tests/max_call_live_board_integration_contract.test.ts tests/max_call_ui_state.test.ts tests/max_call_hint_timer.test.ts tests/max_call_reconnect.test.ts tests/max_call_client_teardown.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```powershell
git add -- tests/max_call_live_board_integration_contract.test.ts
git add -p -- app/max_call_session.tsx app/analytics.ts
git commit -m "feat(max): wire live tutor board into calls"
```

## Task 6: Victory-first review and immediate practice

**Files:**

- Modify: `app/max_voice_review.tsx`
- Modify: `tests/max_voice_review_server_contract.test.ts`

- [ ] **Step 1: Add failing review hierarchy tests**

Extend the source contract to require:

```ts
expect(source).toContain('Главная победа');
expect(source).toContain('Один фокус на завтра');
expect(source).toContain('Потренировать эту фразу');
expect(source.indexOf('Главная победа')).toBeLessThan(source.indexOf('Разбор твоих фраз'));
expect(source).toContain("trackEvent('max_tutor_review_practice_started'");
expect(source).toContain("corrections[0]");
```

Add a fallback assertion that the practice CTA is conditional on a non-empty
validated corrected phrase.

- [ ] **Step 2: Run and verify RED**

Run: `npx jest tests/max_voice_review_server_contract.test.ts --runInBand`

Expected: FAIL on missing hierarchy/copy.

- [ ] **Step 3: Reorder existing review data**

Derive:

```ts
const topFocus = corrections.find((item) =>
  item.kind === 'fix' && item.corrected.trim().length > 0 && item.corrected.length <= 100
) ?? null;
const victory = praise.trim() || (
  reachedMastery >= 3
    ? triLang(lang, {
        ru: 'Цель урока выполнена', uk: 'Мету уроку виконано', es: 'Objetivo completado',
        'pt-BR': 'Objetivo concluído', vi: 'Đã hoàn thành mục tiêu', id: 'Tujuan selesai',
        tr: 'Hedef tamamlandı', pl: 'Cel ukończony',
      })
    : triLang(lang, {
        ru: 'Разговор завершён', uk: 'Розмову завершено', es: 'Conversación completada',
        'pt-BR': 'Conversa concluída', vi: 'Cuộc trò chuyện đã hoàn thành', id: 'Percakapan selesai',
        tr: 'Konuşma tamamlandı', pl: 'Rozmowa zakończona',
      })
);
```

Place victory and top focus before the metrics grid. Keep all existing
corrections, homework, transcript, call-again, failure and locale behavior
below as expandable/detail content; do not remove functionality.

- [ ] **Step 4: Wire `Потренировать эту фразу`**

Reuse `recordPhraseMistake` with the same account-safe/local SRS path already
used for homework, then route to the existing phrase trainer entry. Hide the
CTA when `topFocus` is null. Track only that practice started, not phrase text.

- [ ] **Step 5: Run review tests and verify GREEN**

Run:

```powershell
npx jest tests/max_voice_review_server_contract.test.ts tests/max_call_transcript.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```powershell
git add -- app/max_voice_review.tsx tests/max_voice_review_server_contract.test.ts
git commit -m "feat(max): prioritize actionable call review"
```

## Task 7: Focused integration and regression gate

**Files:**

- Modify only files needed to fix failures introduced by Tasks 1–6.

- [ ] **Step 1: Run all narrow client MAX gates**

```powershell
npx jest tests/max_tutor_live_board_state.test.ts tests/max_call_tutor_tools.test.ts tests/max_call_halo_visual_contract.test.ts tests/max_call_live_board_integration_contract.test.ts tests/max_voice_review_server_contract.test.ts tests/max_call_audio_level.test.ts tests/max_call_hint_timer.test.ts tests/max_call_ui_state.test.ts tests/max_call_reconnect.test.ts tests/max_call_client_teardown.test.ts tests/max_call_transcript.test.ts tests/motion_hybrid_contract.test.ts --runInBand
```

Expected: all PASS.

- [ ] **Step 2: Run the RNTL component gate**

```powershell
npx jest --config jest.rntl.config.cjs tests/max_tutor_live_components.test.tsx --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run server prompt and MAX contract gates**

```powershell
Push-Location functions
npx jest src/max_voice_prompt.test.ts src/max_voice_client_server_contract.test.ts src/max_voice_mint.test.ts --runInBand
Pop-Location
```

Expected: all PASS.

- [ ] **Step 4: Run a scoped TypeScript check**

Use the repository's existing TypeScript command only if it supports file
scoping. Otherwise rely on the focused Jest transforms above and do not run the
whole-project typecheck automatically, per project context-budget rules.

- [ ] **Step 5: Inspect the final diff for scope and secrets**

```powershell
git diff --check
git diff --name-only
git diff -- app/max_call_session.tsx app/max_call_halo.tsx app/max_call_tutor_tools.ts app/max_voice_review.tsx functions/src/max_voice_prompt.ts constants/motionHybrid.ts
```

Expected:

- no unrelated files added to commits;
- no raw transcript/topic/phrase in analytics;
- no OpenAI credential or local spend path;
- no Firestore schema/rules change;
- no feature removed from scenario/companion/trial calls.

- [ ] **Step 6: Commit any focused verification fixes**

If verification required a source fix, stage the exact clean file or use
`git add -p -- constants/motionHybrid.ts app/max_call_session.tsx app/analytics.ts`
for the three pre-dirty files, confirm `git diff --cached --name-only`, then run
`git commit -m "fix(max): close live tutor board regressions"`. If no source fix
was required, do not create an empty verification commit.

- [ ] **Step 7: Final evidence summary**

Report the exact commands, PASS counts, any intentionally unrun broad gates,
the commit list, and the absolute links to the design and implementation plan.
