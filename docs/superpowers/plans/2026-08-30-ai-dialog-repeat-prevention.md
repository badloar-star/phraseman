# AI Dialog Repeat Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve scenario state across turns, stop repeated AI replies before display, and guarantee a bounded scenario ending without contaminating companion history.

**Architecture:** Add one pure server-side quality/state module used by both callable and SSE handlers. Carry the small canonical game state from the existing client UI, keep eight recent messages, buffer the short SSE provider response until it passes the same repeat guard as callable, and expose only privacy-safe quality metadata to client analytics.

**Tech Stack:** TypeScript, React Native/Expo, Firebase Functions v2, Jest, OpenAI Chat Completions transport (mocked in tests; never called by local verification).

---

## File map

- Create `functions/src/premium_dialog_quality.ts`: pure state sanitization, outcome canonicalization, reply normalization/similarity, retry orchestration metadata.
- Create `functions/src/premium_dialog_quality.test.ts`: deterministic state and repeat fixtures.
- Modify `functions/src/premium_dialog.ts`: request/response contract, eight-message history, state-aware prompt, callable retry, shared metadata.
- Modify `functions/src/premium_dialog_stream.ts`: buffer provider output, run shared guard/retry, emit only accepted text.
- Modify `functions/src/premium_dialog_game.test.ts`: state-carrying prompt and deterministic outcome tests.
- Modify `functions/src/premium_dialog_prompt.test.ts`: anti-repeat prompt contract.
- Modify `app/ai_dialog_client.ts`: client request/response types, request-key state.
- Modify `app/ai_dialog_session.tsx`: send accumulated state, process quality metadata, unsupported-model fallback and analytics.
- Modify `app/ai_companion_session.tsx`: keep failures outside `messages`.
- Modify `app/ai_dialog_stream_client.ts`: parse quality metadata and repeated-reply error.
- Modify `tests/ai_dialog_session_flow_contract.test.ts`: preserve manual finish while requiring bounded fallback.
- Create `tests/ai_dialog_companion_history_contract.test.ts`: error/transcript separation.
- Modify `tests/ai_dialog_error_mapping.test.ts`: repeated-reply user-facing classification.

### Task 1: Pure repeat guard

**Files:**
- Create: `functions/src/premium_dialog_quality.ts`
- Create: `functions/src/premium_dialog_quality.test.ts`

- [ ] **Step 1: Write failing normalization and cycle tests**

```ts
import { assessDialogRepeat, normalizeDialogReply } from './premium_dialog_quality';

describe('dialog repeat quality guard', () => {
  it('normalizes markers, case, punctuation and whitespace', () => {
    expect(normalizeDialogReply('  [[What size]] would you like?! '))
      .toBe('what size would you like');
  });

  it('detects exact repeats and A-B-C-A cycles', () => {
    const history = [
      { role: 'assistant' as const, content: 'What size would you like?' },
      { role: 'user' as const, content: 'Large.' },
      { role: 'assistant' as const, content: 'Would you like milk?' },
      { role: 'user' as const, content: 'No.' },
      { role: 'assistant' as const, content: 'Will you pay by card?' },
    ];
    expect(assessDialogRepeat('What size would you like?', history).reason).toBe('exact');
  });

  it('does not reject harmless short acknowledgements', () => {
    expect(assessDialogRepeat('Yes, please.', [
      { role: 'assistant', content: 'Yes, that sounds good.' },
    ])).toMatchObject({ repeated: false });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from repository root while holding the shared heavy-test slot:

```powershell
bash .claude/semaphore/slot.sh acquire "jest premium_dialog_quality RED"
Push-Location functions
npx jest --runInBand src/premium_dialog_quality.test.ts
$code = $LASTEXITCODE
Pop-Location
bash .claude/semaphore/slot.sh release
exit $code
```

Expected: FAIL because `premium_dialog_quality.ts` does not exist.

- [ ] **Step 3: Implement the pure guard**

```ts
export type DialogRepeatReason = 'none' | 'exact' | 'near';

export interface DialogHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DialogRepeatAssessment {
  repeated: boolean;
  reason: DialogRepeatReason;
  score: number;
  bucket: 'none' | 'medium' | 'high' | 'exact';
}

export function normalizeDialogReply(value: unknown): string {
  return String(value ?? '')
    .replace(/\[\[|\]\]/g, '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}'’]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function firstSentence(value: string): string {
  return value.split(/(?<=[.!?])\s+/u)[0] ?? value;
}

function tokenBigrams(value: string): Set<string> {
  const words = normalizeDialogReply(value).split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 1 < words.length; i += 1) out.add(`${words[i]} ${words[i + 1]}`);
  return out;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  left.forEach((item) => { if (right.has(item)) intersection += 1; });
  return intersection / (left.size + right.size - intersection);
}

export function assessDialogRepeat(
  candidate: string,
  history: readonly DialogHistoryMessage[],
): DialogRepeatAssessment {
  const normalized = normalizeDialogReply(candidate);
  if (!normalized) return { repeated: false, reason: 'none', score: 0, bucket: 'none' };
  const comparable = history.filter((item) => item.role === 'assistant').map((item) => item.content);
  let best = 0;
  for (const previous of comparable) {
    const previousNormalized = normalizeDialogReply(previous);
    if (normalized === previousNormalized) {
      return { repeated: true, reason: 'exact', score: 1, bucket: 'exact' };
    }
    const candidateWords = normalized.split(' ').length;
    const previousWords = previousNormalized.split(' ').length;
    if (Math.min(candidateWords, previousWords) < 6) continue;
    best = Math.max(
      best,
      jaccard(tokenBigrams(candidate), tokenBigrams(previous)),
      jaccard(tokenBigrams(firstSentence(candidate)), tokenBigrams(firstSentence(previous))),
    );
  }
  const repeated = best >= 0.82;
  return {
    repeated,
    reason: repeated ? 'near' : 'none',
    score: best,
    bucket: best >= 0.82 ? 'high' : best >= 0.5 ? 'medium' : 'none',
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Use the Step 2 command. Expected: PASS, 0 failures.

- [ ] **Step 5: Commit only Task 1 files**

```powershell
git add -- functions/src/premium_dialog_quality.ts functions/src/premium_dialog_quality.test.ts
git commit -m "feat(dialogs): add deterministic repeat guard"
```

### Task 2: Canonical carried game state

**Files:**
- Modify: `functions/src/premium_dialog_quality.ts`
- Modify: `functions/src/premium_dialog_quality.test.ts`
- Modify: `functions/src/premium_dialog.ts:35-142,342-455,535-594`
- Modify: `functions/src/premium_dialog_game.test.ts`
- Modify: `functions/src/premium_dialog_prompt.test.ts`

- [ ] **Step 1: Write failing state sanitizer and outcome tests**

```ts
it('clamps carried state and removes unknown objectives', () => {
  expect(sanitizeDialogGameState(
    { exchangeIndex: 999, mood: -4, objectivesMet: ['order', 'evil', 'order'], noProgressTurns: 99 },
    ['order', 'pay'],
    80,
  )).toEqual({ exchangeIndex: 32, mood: 0, objectivesMet: ['order'], noProgressTurns: 32 });
});

it('keeps old objectives and deterministically succeeds', () => {
  expect(canonicalizeDialogTurnState(
    { mood: 70, objectivesMet: ['pay'], outcome: 'ongoing' },
    { exchangeIndex: 4, mood: 75, objectivesMet: ['order'], noProgressTurns: 0 },
    ['order', 'pay'],
  )).toMatchObject({ objectivesMet: ['order', 'pay'], outcome: 'success' });
});

it('stalls an unfinished scenario at exchange eight', () => {
  expect(canonicalizeDialogTurnState(
    { mood: 70, objectivesMet: [], outcome: 'ongoing' },
    { exchangeIndex: 8, mood: 70, objectivesMet: [], noProgressTurns: 7 },
    ['order'],
  ).outcome).toBe('stalled');
});
```

Also update `premium_dialog_game.test.ts` to assert the prompt contains the current exchange, current mood, completed and remaining objective lists, and the explicit “do not ask the same question again” rule.

- [ ] **Step 2: Run RED tests**

```powershell
bash .claude/semaphore/slot.sh acquire "jest dialog game state RED"
Push-Location functions
npx jest --runInBand src/premium_dialog_quality.test.ts src/premium_dialog_game.test.ts src/premium_dialog_prompt.test.ts
$code = $LASTEXITCODE
Pop-Location
bash .claude/semaphore/slot.sh release
exit $code
```

Expected: FAIL on missing state helpers and prompt text.

- [ ] **Step 3: Implement state types and canonicalization**

Add to `premium_dialog_quality.ts`:

```ts
export interface SanitizedDialogGameState {
  exchangeIndex: number;
  mood: number;
  objectivesMet: string[];
  noProgressTurns: number;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

export function sanitizeDialogGameState(
  value: unknown,
  objectiveIds: readonly string[],
  seedMood: number,
): SanitizedDialogGameState {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const allowed = new Set(objectiveIds);
  const supplied = Array.isArray(raw.objectivesMet) ? raw.objectivesMet : [];
  return {
    exchangeIndex: clampInt(raw.exchangeIndex, 1, 32, 1),
    mood: clampInt(raw.mood, 0, 100, clampInt(seedMood, 0, 100, 70)),
    objectivesMet: [...new Set(supplied.map(String).filter((id) => allowed.has(id)))].slice(0, 12),
    noProgressTurns: clampInt(raw.noProgressTurns, 0, 32, 0),
  };
}

export interface CanonicalDialogTurnState {
  mood: number;
  objectivesMet: string[];
  outcome: 'ongoing' | 'success' | 'lost_patience' | 'stalled';
  characterReaction?: unknown;
  coachTips?: unknown;
}

export function canonicalizeDialogTurnState(
  raw: Record<string, unknown>,
  prior: SanitizedDialogGameState,
  objectiveIds: readonly string[],
): CanonicalDialogTurnState {
  const allowed = new Set(objectiveIds);
  const current = Array.isArray(raw.objectivesMet) ? raw.objectivesMet.map(String) : [];
  const objectivesMet = [...new Set([...prior.objectivesMet, ...current])]
    .filter((id) => allowed.has(id));
  const mood = clampInt(raw.mood, 0, 100, prior.mood);
  const allMet = objectiveIds.length > 0 && objectiveIds.every((id) => objectivesMet.includes(id));
  const outcome = mood === 0
    ? 'lost_patience'
    : allMet
      ? 'success'
      : prior.exchangeIndex >= 8
        ? 'stalled'
        : 'ongoing';
  return {
    mood,
    objectivesMet,
    outcome,
    characterReaction: raw.characterReaction,
    coachTips: raw.coachTips,
  };
}
```

In `premium_dialog.ts`:

```ts
const MAX_HISTORY_TURNS = 8;

interface PremiumDialogRequest {
  // existing fields
  gameState?: unknown;
}
```

Build a sanitized state once and pass it to `buildScenarioSystemPrompt`. Replace “Start mood” with a current-state block. Extend `parseGameEnvelope` with an optional sanitized prior state and return canonical cumulative state when provided.

- [ ] **Step 4: Run GREEN tests**

Use Step 2 command. Expected: PASS, 0 failures.

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- functions/src/premium_dialog_quality.ts functions/src/premium_dialog_quality.test.ts functions/src/premium_dialog.ts functions/src/premium_dialog_game.test.ts functions/src/premium_dialog_prompt.test.ts
git commit -m "fix(dialogs): carry canonical scenario state"
```

### Task 3: Client state wiring and companion transcript hygiene

**Files:**
- Modify: `app/ai_dialog_client.ts:44-84,261-278`
- Modify: `app/ai_dialog_session.tsx:355-392,774-920,974-1044`
- Modify: `app/ai_companion_session.tsx:95-171,280-390`
- Modify: `tests/ai_dialog_session_flow_contract.test.ts`
- Create: `tests/ai_dialog_companion_history_contract.test.ts`
- Modify: `tests/ai_dialog_error_mapping.test.ts`

- [ ] **Step 1: Write failing client contract tests**

```ts
it('sends cumulative game state on send and retry', () => {
  expect(source).toContain('gameState: {');
  expect(source).toContain('exchangeIndex');
  expect(source).toContain('objectivesMet: Array.from(objectivesMet)');
  expect(source).toContain('noProgressTurns: stuckTurnsRef.current');
});

it('keeps manual finish and adds only unsupported-model fallback at eight', () => {
  expect(source).toContain('finishDialog');
  expect(source).toContain('gameModeAvailable === false');
  expect(source).toContain('exchangeIndex >= RECOMMENDED_EXCHANGES');
});
```

Create `ai_dialog_companion_history_contract.test.ts` asserting the catch block calls `setLastErrorMessage(...)`, does not append `getPremiumDialogErrorMessage` to `messages`, and renders a separate system error surface.

Add `dialog_repeated_reply` to `classifyPremiumDialogError` as `provider_unavailable` with the existing retry copy.

- [ ] **Step 2: Run RED client tests**

```powershell
bash .claude/semaphore/slot.sh acquire "jest dialog client state RED"
npx jest --runTestsByPath tests/ai_dialog_session_flow_contract.test.ts tests/ai_dialog_companion_history_contract.test.ts tests/ai_dialog_error_mapping.test.ts --runInBand --no-cache
$code = $LASTEXITCODE
bash .claude/semaphore/slot.sh release
exit $code
```

Expected: FAIL on missing game state and companion error state.

- [ ] **Step 3: Implement client contract**

Add to `ai_dialog_client.ts`:

```ts
export interface DialogGameStateInput {
  exchangeIndex: number;
  mood: number;
  objectivesMet: string[];
  noProgressTurns: number;
}

export interface DialogQualityMeta {
  repeatDetected: boolean;
  repeatReason: 'none' | 'exact' | 'near';
  similarityBucket: 'none' | 'medium' | 'high' | 'exact';
  regenerationAttempted: boolean;
  regenerationSucceeded: boolean;
  gameModeAvailable: boolean;
}
```

Include `gameState` in `PremiumDialogRequest` and the in-flight request key. Include optional `quality` in both response types.

In scenario send, create `gameState` with the current `exchangeIndex`; on retry use the already-present last user turn count instead of incrementing it. Track `ai_dialog_reply_quality` only with metadata fields. If `quality.gameModeAvailable === false` and the current exchange reaches 8, apply a local `stalled` turn state while retaining the manual finish button before that point.

In companion, add `lastErrorMessage`, clear it before send, set it in catch, and render it outside the `FlatList` transcript with retry-safe system styling.

- [ ] **Step 4: Run GREEN client tests**

Use Step 2 command. Expected: PASS, 0 failures.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- app/ai_dialog_client.ts app/ai_dialog_session.tsx app/ai_companion_session.tsx tests/ai_dialog_session_flow_contract.test.ts tests/ai_dialog_companion_history_contract.test.ts tests/ai_dialog_error_mapping.test.ts
git commit -m "fix(dialogs): preserve client state and clean companion history"
```

### Task 4: Callable repeat retry and metadata

**Files:**
- Modify: `functions/src/premium_dialog_quality.ts`
- Modify: `functions/src/premium_dialog_quality.test.ts`
- Modify: `functions/src/premium_dialog.ts:793-958`
- Modify: `app/ai_dialog_client.ts`

- [ ] **Step 1: Write failing one-retry orchestration tests**

```ts
it('regenerates once and returns the novel candidate', async () => {
  const generate = jest.fn()
    .mockResolvedValueOnce({ reply: 'What size would you like?', value: 1 })
    .mockResolvedValueOnce({ reply: 'Would you prefer a small or large cup?', value: 2 });
  const out = await generateDialogWithRepeatGuard(generate, history);
  expect(generate).toHaveBeenCalledTimes(2);
  expect(out.value.value).toBe(2);
  expect(out.quality).toMatchObject({ repeatDetected: true, regenerationSucceeded: true });
});

it('throws dialog_repeated_reply after the second repeat', async () => {
  const generate = jest.fn().mockResolvedValue({ reply: 'What size would you like?' });
  await expect(generateDialogWithRepeatGuard(generate, history)).rejects.toMatchObject({
    code: 'dialog_repeated_reply',
  });
});
```

- [ ] **Step 2: Run RED quality tests**

Use Task 1 Step 2 command. Expected: FAIL on missing orchestrator.

- [ ] **Step 3: Implement shared one-retry orchestration**

```ts
export class DialogRepeatedReplyError extends Error {
  readonly code = 'dialog_repeated_reply';
}

export async function generateDialogWithRepeatGuard<T extends { reply: string }>(
  generate: (attempt: 0 | 1) => Promise<T>,
  history: readonly DialogHistoryMessage[],
): Promise<{ value: T; quality: DialogQualityMeta }> {
  // attempt 0; assess; attempt 1 only if repeated; throw after repeat 2
}
```

Wrap the callable provider fetch/parse/filter in this helper. On attempt 1, add a dynamic system instruction after the stable prompt prefix and before history. Convert `DialogRepeatedReplyError` to `HttpsError('unavailable', 'dialog_repeated_reply')`; the existing catch must release daily quota. Return privacy-safe `quality` and `gameModeAvailable`.

- [ ] **Step 4: Run focused server tests GREEN**

```powershell
bash .claude/semaphore/slot.sh acquire "jest dialog callable guard GREEN"
Push-Location functions
npx jest --runInBand src/premium_dialog_quality.test.ts src/premium_dialog_game.test.ts src/premium_dialog_prompt.test.ts
$code = $LASTEXITCODE
Pop-Location
bash .claude/semaphore/slot.sh release
exit $code
```

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit Task 4**

```powershell
git add -- functions/src/premium_dialog_quality.ts functions/src/premium_dialog_quality.test.ts functions/src/premium_dialog.ts app/ai_dialog_client.ts
git commit -m "fix(dialogs): regenerate repeated callable replies"
```

### Task 5: Buffered SSE parity

**Files:**
- Modify: `functions/src/premium_dialog_stream.ts:88-143,265-412`
- Modify: `app/ai_dialog_stream_client.ts:25-36,150-215`
- Modify: `tests/ai_dialog_stream_partial_reply.test.ts`
- Create: `functions/src/premium_dialog_stream_quality.test.ts`

- [ ] **Step 1: Write failing buffered-stream tests**

Test an exported `emitAcceptedDialogReply` helper together with the shared retry orchestrator. The rejected first candidate must never be passed to the writer:

```ts
const generated = jest.fn()
  .mockResolvedValueOnce({ reply: 'What size would you like?' })
  .mockResolvedValueOnce({ reply: 'Would you prefer a small or large cup?' });
const accepted = await generateDialogWithRepeatGuard(generated, history);
const events: Array<{ type: string; text?: string }> = [];
emitAcceptedDialogReply(accepted.value.reply, (event) => events.push(event), 12);
expect(events.filter((e) => e.type === 'delta').map((e) => e.text).join(''))
  .toBe('Would you prefer a small or large cup?');
expect(events.some((e) => JSON.stringify(e).includes('What size would you like?'))).toBe(false);
```

- [ ] **Step 2: Run RED stream tests**

```powershell
bash .claude/semaphore/slot.sh acquire "jest dialog stream parity RED"
Push-Location functions
npx jest --runInBand src/premium_dialog_stream_quality.test.ts
$code = $LASTEXITCODE
Pop-Location
bash .claude/semaphore/slot.sh release
exit $code
```

Expected: FAIL because buffered quality helper is missing.

- [ ] **Step 3: Buffer, validate, then emit**

Keep the upstream stream reader, but accumulate provider chunks without calling `sseWrite`. Parse/filter the complete candidate, pass it through `generateDialogWithRepeatGuard`, then emit the accepted reply in bounded chunks followed by `done`. On `DialogRepeatedReplyError`, emit only `{ type: 'error', code: 'dialog_repeated_reply' }` and release quota. Include the same `quality` object in `done` and parse it in `ai_dialog_stream_client.ts`.

Do not delete the existing stream parser or partial JSON extraction tests; they remain provider-boundary protection even though user-facing publication is buffered.

- [ ] **Step 4: Run GREEN stream and client transport tests**

```powershell
bash .claude/semaphore/slot.sh acquire "jest dialog stream parity GREEN"
Push-Location functions
npx jest --runInBand src/premium_dialog_stream_quality.test.ts src/premium_dialog_quality.test.ts
$functionsCode = $LASTEXITCODE
Pop-Location
if ($functionsCode -eq 0) {
  npx jest --runTestsByPath tests/ai_dialog_stream_partial_reply.test.ts --runInBand --no-cache
  $rootCode = $LASTEXITCODE
} else { $rootCode = $functionsCode }
bash .claude/semaphore/slot.sh release
exit $rootCode
```

Expected: PASS, 0 failures.

- [ ] **Step 5: Commit Task 5**

```powershell
git add -- functions/src/premium_dialog_stream.ts functions/src/premium_dialog_stream_quality.test.ts app/ai_dialog_stream_client.ts tests/ai_dialog_stream_partial_reply.test.ts
git commit -m "fix(dialogs): buffer and guard streamed replies"
```

### Task 6: Focused integration verification

**Files:**
- Modify only if a focused test reveals a defect in the files already listed.

- [ ] **Step 1: Run all focused dialog tests with the shared slot**

```powershell
bash .claude/semaphore/slot.sh acquire "jest focused AI dialog verification"
Push-Location functions
npx jest --runInBand src/premium_dialog_quality.test.ts src/premium_dialog_stream_quality.test.ts src/premium_dialog_game.test.ts src/premium_dialog_prompt.test.ts
$functionsCode = $LASTEXITCODE
Pop-Location
if ($functionsCode -eq 0) {
  npx jest --runTestsByPath tests/ai_dialog_session_flow_contract.test.ts tests/ai_dialog_companion_history_contract.test.ts tests/ai_dialog_error_mapping.test.ts tests/ai_dialog_stream_partial_reply.test.ts tests/ai_dialog_session_flow_contract.test.ts --runInBand --no-cache
  $rootCode = $LASTEXITCODE
} else { $rootCode = $functionsCode }
bash .claude/semaphore/slot.sh release
exit $rootCode
```

Expected: all focused suites PASS, 0 failures.

- [ ] **Step 2: Run narrow TypeScript checks if available**

Prefer package-local checks rather than whole-project `tsc`. If the repository exposes no narrow typecheck, compile only `functions` while holding the slot and record that the app-side confidence comes from Jest/source contracts:

```powershell
bash .claude/semaphore/slot.sh acquire "functions tsc dialog verification"
Push-Location functions
npx tsc --noEmit --pretty false
$code = $LASTEXITCODE
Pop-Location
bash .claude/semaphore/slot.sh release
exit $code
```

Expected: exit 0. Do not run root-wide typecheck automatically.

- [ ] **Step 3: Inspect diff and contract boundaries**

```powershell
git diff --check HEAD~4..HEAD
git status --short
git diff --stat HEAD~4..HEAD
rg -n "OPENAI_API_KEY|OPENAI_TTS_API_KEY" functions/src/premium_dialog*.test.ts tests/ai_dialog*.test.ts
```

Expected: no whitespace errors; only intended dialog/spec/plan files changed; tests contain no real API invocation or credential reads.

- [ ] **Step 4: Request independent code review**

Review exact implementation range against `docs/superpowers/specs/2026-08-30-ai-dialog-repeat-prevention-design.md`, focusing on state trust boundaries, quota rollback, stream/callable parity, privacy, and preservation of manual finish.

- [ ] **Step 5: Apply valid review findings and rerun affected focused tests**

Every source correction must be preceded by a failing regression test and followed by the relevant Step 1 subset.

- [ ] **Step 6: Final verification commit if review required changes**

```powershell
git add -- functions/src/premium_dialog_quality.ts functions/src/premium_dialog_quality.test.ts functions/src/premium_dialog.ts functions/src/premium_dialog_stream.ts functions/src/premium_dialog_game.test.ts functions/src/premium_dialog_prompt.test.ts functions/src/premium_dialog_stream_quality.test.ts app/ai_dialog_client.ts app/ai_dialog_stream_client.ts app/ai_dialog_session.tsx app/ai_companion_session.tsx tests/ai_dialog_session_flow_contract.test.ts tests/ai_dialog_companion_history_contract.test.ts tests/ai_dialog_error_mapping.test.ts tests/ai_dialog_stream_partial_reply.test.ts
git commit -m "fix(dialogs): close repeat prevention review gaps"
```

If review required no source changes, do not create an empty commit.
