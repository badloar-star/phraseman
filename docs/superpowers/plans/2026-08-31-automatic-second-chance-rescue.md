# Automatic Second Chance Rescue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically consume one `attempt_restore_all` gift after the third wrong answer, restore all three attempts without forfeiting session runes, and show the approved potion rescue scene in every registered non-Arena learning session.

**Architecture:** Keep the durable composite consume-and-grant in `commitSessionAttemptRecovery({ source: 'gift' })`. Extend the existing auto-reset hook into the single branch selector, return a monotonic presentation sequence, and render one shared modal overlay from the attempts HUD so the ten routes only pass controller state. The no-gift path remains the current `forfeitSessionRunes → restoreAfterSessionRuneForfeit` flow.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript 5.9, React Native Reanimated 4, Expo Image, the existing Phraseman sound director, Jest 29, React Native Testing Library.

---

### Task 1: Make the automatic controller prefer the durable gift recovery

**Files:**
- Modify: `hooks/useSessionAttemptAutoReset.ts`
- Modify: `hooks/useSessionAttempts.ts`
- Create: `tests/use_session_attempt_auto_reset.test.tsx`
- Modify: `tests/use_session_attempts.test.tsx`

- [ ] **Step 1: Write the failing controller tests**

Create `tests/use_session_attempt_auto_reset.test.tsx` with fake callbacks and these exact scenarios:

```tsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';

afterEach(async () => { await cleanup(); });

const base = () => ({
  phase: 'awaiting_recovery' as const,
  hydrated: true,
  giftCount: 1,
  recoverWithGift: jest.fn().mockResolvedValue(undefined),
  forfeitSessionRunes: jest.fn().mockResolvedValue(undefined),
  restoreAttempts: jest.fn(),
  onRestored: jest.fn(),
});

test('automatically consumes a gift and never forfeits session runes', async () => {
  const input = base();
  const hook = await renderHook(() => useSessionAttemptAutoReset(input));
  await waitFor(() => expect(input.recoverWithGift).toHaveBeenCalledTimes(1));
  expect(input.forfeitSessionRunes).not.toHaveBeenCalled();
  expect(input.restoreAttempts).not.toHaveBeenCalled();
  expect(input.onRestored).toHaveBeenCalledTimes(1);
  expect(hook.result.current.giftRescueSequence).toBe(1);
});

test('waits for inventory hydration before choosing a recovery branch', async () => {
  const input = { ...base(), hydrated: false };
  const hook = await renderHook((props) => useSessionAttemptAutoReset(props), {
    initialProps: input,
  });
  expect(input.recoverWithGift).not.toHaveBeenCalled();
  hook.rerender({ ...input, hydrated: true });
  await waitFor(() => expect(input.recoverWithGift).toHaveBeenCalledTimes(1));
});

test('keeps the current rune-forfeit reset when no gift exists', async () => {
  const input = { ...base(), giftCount: 0 };
  await renderHook(() => useSessionAttemptAutoReset(input));
  await waitFor(() => expect(input.restoreAttempts).toHaveBeenCalledTimes(1));
  expect(input.forfeitSessionRunes).toHaveBeenCalledTimes(1);
  expect(input.recoverWithGift).not.toHaveBeenCalled();
  expect(input.onRestored).toHaveBeenCalledTimes(1);
});

test('confirmed concurrent gift unavailability falls back without double recovery', async () => {
  const input = base();
  input.recoverWithGift.mockRejectedValue(new Error('attempt_restore_gift_unavailable'));
  await renderHook(() => useSessionAttemptAutoReset(input));
  await waitFor(() => expect(input.restoreAttempts).toHaveBeenCalledTimes(1));
  expect(input.recoverWithGift).toHaveBeenCalledTimes(1);
  expect(input.forfeitSessionRunes).toHaveBeenCalledTimes(1);
});

test('technical failure preserves runes and retries the same recovery only on request', async () => {
  const input = base();
  input.recoverWithGift
    .mockRejectedValueOnce(new Error('injected_storage_failure'))
    .mockResolvedValueOnce(undefined);
  const hook = await renderHook(() => useSessionAttemptAutoReset(input));
  await waitFor(() => expect(hook.result.current.giftRecoveryError).toBe('injected_storage_failure'));
  expect(input.forfeitSessionRunes).not.toHaveBeenCalled();
  await act(async () => { hook.result.current.retryGiftRecovery(); });
  await waitFor(() => expect(input.recoverWithGift).toHaveBeenCalledTimes(2));
  expect(hook.result.current.giftRescueSequence).toBe(1);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run with a heavy-process slot:

```powershell
bash .claude/semaphore/slot.sh acquire "jest second chance controller"
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/use_session_attempt_auto_reset.test.tsx --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: FAIL because the hook does not accept `hydrated`, `giftCount`, or `recoverWithGift`, and returns `void`.

- [ ] **Step 3: Implement the branch selector**

Change the public contract in `hooks/useSessionAttemptAutoReset.ts` to:

```ts
export type SessionAttemptAutoResetPresentation = Readonly<{
  giftRescueSequence: number;
  giftRecoveryError: string | null;
  retryGiftRecovery: () => void;
}>;

type Input = Readonly<{
  phase: SessionAttemptsPhase;
  hydrated: boolean;
  giftCount: number;
  recoverWithGift: () => Promise<void>;
  forfeitSessionRunes?: () => Promise<void> | void;
  restoreAttempts: () => void;
  onRestored?: () => void;
}>;
```

Use one guarded async `runRecovery` callback. It must wait for `hydrated`, use gift recovery when `giftCount > 0`, increment `giftRescueSequence` only after success, and never call rune forfeiture in that branch. It may run the no-gift branch only for a confirmed zero count or the exact `attempt_restore_gift_unavailable` error. Any other error sets `giftRecoveryError` and stays in `awaiting_recovery` until `retryGiftRecovery` increments a retry token.

The recovery body is:

```ts
const restoreWithoutGift = async (): Promise<void> => {
  await Promise.resolve(callbacksRef.current.forfeitSessionRunes?.()).catch(() => {});
  callbacksRef.current.restoreAttempts();
  callbacksRef.current.onRestored?.();
};

try {
  if (callbacks.giftCount > 0) {
    await callbacks.recoverWithGift();
    if (!cancelled) {
      setGiftRecoveryError(null);
      setGiftRescueSequence((current) => current + 1);
      callbacks.onRestored?.();
    }
  } else {
    await restoreWithoutGift();
  }
} catch (error) {
  const code = error instanceof Error ? error.message : 'session_attempt_recovery_failed';
  if (code === 'attempt_restore_gift_unavailable') await restoreWithoutGift();
  else if (!cancelled) setGiftRecoveryError(code);
} finally {
  handlingRef.current = false;
}
```

- [ ] **Step 4: Make durable success independent of a resource refresh**

In `hooks/useSessionAttempts.ts`, keep `commitSessionAttemptRecovery` as the only authority. After a successful gift receipt, immediately adopt the returned attempts state and decrement the local count defensively:

```ts
if (source === 'gift') setGiftCount((current) => Math.max(0, current - 1));
void refreshResources().catch(() => {
  // Receipt is already durable; a projection refresh cannot undo recovery.
});
```

On `attempt_restore_gift_unavailable`, set local `giftCount` to zero before rethrowing. Preserve the synchronous recovery mutex so remounts and duplicate effects cannot commit twice.

- [ ] **Step 5: Run focused controller tests and verify GREEN**

```powershell
bash .claude/semaphore/slot.sh acquire "jest second chance controller"
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/use_session_attempt_auto_reset.test.tsx tests/use_session_attempts.test.tsx --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: PASS, including one durable call for duplicate same-frame recovery requests.

- [ ] **Step 6: Commit the controller**

```powershell
git add hooks/useSessionAttemptAutoReset.ts hooks/useSessionAttempts.ts tests/use_session_attempt_auto_reset.test.tsx tests/use_session_attempts.test.tsx
git commit -m "feat: auto apply second chance gift"
```

### Task 2: Build the approved potion rescue overlay

**Files:**
- Create: `components/session_attempts/SessionAttemptGiftRescueOverlay.tsx`
- Create: `tests/session_attempt_gift_rescue_overlay.test.tsx`
- Modify: `app/session_attempts/session_attempts_copy.ts`
- Modify: `tests/session_attempts_copy.test.ts`
- Modify: `constants/motionHybrid.ts`
- Modify: `components/session_attempts/SessionAttemptsHud.tsx`

- [ ] **Step 1: Add all nine localized rescue messages**

Extend `SessionAttemptsCopy` with `giftAppliedTitle`, `giftAppliedRunesSaved`, `giftRecoveryFailed`, and `retryGiftRecovery`. Add these exact values:

```ts
ru: { giftAppliedTitle: 'Второй шанс', giftAppliedRunesSaved: 'Руны сохранены', giftRecoveryFailed: 'Не удалось применить подарок', retryGiftRecovery: 'Повторить' },
uk: { giftAppliedTitle: 'Другий шанс', giftAppliedRunesSaved: 'Руни збережено', giftRecoveryFailed: 'Не вдалося застосувати подарунок', retryGiftRecovery: 'Повторити' },
en: { giftAppliedTitle: 'Second chance', giftAppliedRunesSaved: 'Runes saved', giftRecoveryFailed: 'Could not apply the gift', retryGiftRecovery: 'Try again' },
es: { giftAppliedTitle: 'Segunda oportunidad', giftAppliedRunesSaved: 'Runas conservadas', giftRecoveryFailed: 'No se pudo usar el regalo', retryGiftRecovery: 'Reintentar' },
'pt-BR': { giftAppliedTitle: 'Segunda chance', giftAppliedRunesSaved: 'Runas preservadas', giftRecoveryFailed: 'Não foi possível usar o presente', retryGiftRecovery: 'Tentar novamente' },
vi: { giftAppliedTitle: 'Cơ hội thứ hai', giftAppliedRunesSaved: 'Đã giữ rune', giftRecoveryFailed: 'Không thể dùng quà', retryGiftRecovery: 'Thử lại' },
id: { giftAppliedTitle: 'Kesempatan kedua', giftAppliedRunesSaved: 'Rune tersimpan', giftRecoveryFailed: 'Hadiah tidak dapat digunakan', retryGiftRecovery: 'Coba lagi' },
tr: { giftAppliedTitle: 'İkinci şans', giftAppliedRunesSaved: 'Rünler korundu', giftRecoveryFailed: 'Hediye kullanılamadı', retryGiftRecovery: 'Tekrar dene' },
pl: { giftAppliedTitle: 'Druga szansa', giftAppliedRunesSaved: 'Runy zachowane', giftRecoveryFailed: 'Nie udało się użyć prezentu', retryGiftRecovery: 'Spróbuj ponownie' },
```

Update `tests/session_attempts_copy.test.ts` to assert every locale has non-empty values and the unknown-locale fallback returns the Russian strings.

- [ ] **Step 2: Write RED overlay tests**

In `tests/session_attempt_gift_rescue_overlay.test.tsx`, render the component with `sequence={1}` and assert:

```tsx
expect(view.getByTestId('session-attempt-gift-rescue')).toBeTruthy();
expect(view.getByText('Второй шанс')).toBeTruthy();
expect(view.getByText('Руны сохранены')).toBeTruthy();
expect(view.getAllByTestId(/session-attempt-rescue-heart-/)).toHaveLength(3);
```

Mock `useReduceMotion` as `true` in a second test and assert the reduced-motion static shield is present while flight test IDs are absent. Render `errorCode="injected_storage_failure"` in a third test, press `Повторить`, and assert `onRetry` is called once.

- [ ] **Step 3: Implement the animation as one shared modal**

Create `SessionAttemptGiftRescueOverlay.tsx` with this stable API:

```ts
type Props = Readonly<{
  sequence: number;
  locale: string;
  errorCode: string | null;
  onRetry: () => void;
}>;
```

Use `Modal transparent statusBarTranslucent` so the current question remains visible. The success layer is `pointerEvents="none"`; animate only opacity and transforms. Add constants in `constants/motionHybrid.ts` for the 2050 ms lifetime, the 0/110/220 ms heart stagger, and the 1350 ms semantic-completion point. Use the existing `useReduceMotion` hook; reduced motion renders one static full-heart/shield frame and no translated particles. Announce one localized sentence with `AccessibilityInfo.announceForAccessibility` per new sequence.

- [ ] **Step 4: Host the overlay from the attempts HUD**

Extend `SessionAttemptsHud` props:

```ts
giftRescueSequence?: number;
giftRecoveryError?: string | null;
onRetryGiftRecovery?: () => void;
```

Render `SessionAttemptGiftRescueOverlay` once when all three props are supplied. Remove the generic `pm.hearts.restored` request from the HUD increase branch; Task 5 will attach exactly one source-specific recovery cue, avoiding two overlapping sounds.

- [ ] **Step 5: Run overlay, copy, HUD, and motion tests**

```powershell
bash .claude/semaphore/slot.sh acquire "jest second chance overlay"
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/session_attempt_gift_rescue_overlay.test.tsx tests/session_attempts_hud.test.tsx --runInBand
npx jest --runTestsByPath tests/session_attempts_copy.test.ts tests/session_attempts_motion_polish_gate.ts tests/learning_v2_session_attempts_motion_gate.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: PASS with three heart particles, no layout animation, and a static reduced-motion scene.

- [ ] **Step 6: Commit the shared presentation**

```powershell
git add components/session_attempts/SessionAttemptGiftRescueOverlay.tsx components/session_attempts/SessionAttemptsHud.tsx app/session_attempts/session_attempts_copy.ts constants/motionHybrid.ts tests/session_attempt_gift_rescue_overlay.test.tsx tests/session_attempts_copy.test.ts
git commit -m "feat: animate second chance rescue"
```

### Task 3: Wire every registered non-Arena session and strengthen the route guard

**Files:**
- Modify: `app/flashcards_blitz_session.tsx`
- Modify: `app/flashcards_listening_session.tsx`
- Modify: `app/flashcards_speaking_session.tsx`
- Modify: `app/flashcards_swipe.tsx`
- Modify: `app/lesson1.tsx`
- Modify: `app/lesson_irregular_verbs.tsx`
- Modify: `app/lesson_words.tsx`
- Modify: `app/mistake_practice_session.tsx`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `app/learning-v2/session/[id].tsx`
- Modify: `tests/session_attempts_screen_wiring_gate.ts`
- Modify: `tests/learning_v2_session_attempts_runtime_gate.ts`

- [ ] **Step 1: Make the route guard fail before wiring**

For every registered screen, require these source tokens:

```ts
assert.ok(source.includes('giftRescueSequence'), `${relativeFile} has no gift rescue presentation`);
assert.ok(source.includes('giftRecoveryError'), `${relativeFile} has no gift recovery error state`);
assert.ok(source.includes('retryGiftRecovery'), `${relativeFile} has no gift recovery retry`);
```

Keep the existing Arena denylist assertions unchanged.

- [ ] **Step 2: Run the route guard and verify RED**

```powershell
npx tsx tests/session_attempts_screen_wiring_gate.ts
npx tsx tests/learning_v2_session_attempts_runtime_gate.ts
```

Expected: FAIL on the first non-wired session screen.

- [ ] **Step 3: Pass controller resources on all ten routes**

Replace each bare hook call with a captured result. For screens using `attempts`:

```ts
const attemptRecovery = useSessionAttemptAutoReset({
  phase: attempts.state.phase,
  hydrated: attempts.hydrated,
  giftCount: attempts.giftCount,
  recoverWithGift: attempts.recoverWithGift,
  forfeitSessionRunes: practiceRunes.forfeitPendingRunes,
  restoreAttempts: attempts.restoreAfterSessionRuneForfeit,
  onRestored: resetBlitzAfterSessionRuneForfeit,
});
```

Use these existing pairs without changing their activity-specific pause/reset logic:

```text
flashcards_blitz_session: practiceRunes.forfeitPendingRunes / resetBlitzAfterSessionRuneForfeit
flashcards_listening_session: no rune callback / resetListeningAfterSessionRuneForfeit
flashcards_speaking_session: practiceRunes.forfeitPendingRunes / resetSpeakingCardAfterSessionRuneForfeit
flashcards_swipe: practiceRunes.forfeitPendingRunes / resetSwipeAfterSessionRuneForfeit
lesson1: practiceRunes.forfeitPendingRunes / retryCurrentLessonPhraseAfterSessionRuneForfeit
lesson_irregular_verbs: practiceRunes.forfeitPendingRunes / retryCurrentVerbFormAfterSessionRuneForfeit
lesson_words: practiceRunes.forfeitPendingRunes / retryCurrentVocabularyCardAfterSessionRuneForfeit
mistake_practice_session: practiceRunes.forfeitPendingRunes / resetMistakePracticeAfterSessionRuneForfeit
learning_v2_direct_session_player_v1: setSessionRunes(0) / resetLearningV2AfterSessionRuneForfeit
learning-v2/session/[id]: set sessionStarsRef/displayedStars to 0 / resetLearningV2RouteAfterSessionRuneForfeit
```

- [ ] **Step 4: Pass presentation props to the active HUD**

On every non-loading `SessionAttemptsHud`, add:

```tsx
giftRescueSequence={attemptRecovery.giftRescueSequence}
giftRecoveryError={attemptRecovery.giftRecoveryError}
onRetryGiftRecovery={attemptRecovery.retryGiftRecovery}
```

Do not add these props to the Blitz loading placeholder. The two Learning V2 render branches receive identical props because only one branch is mounted at a time.

- [ ] **Step 5: Run every route/integration gate**

```powershell
npx tsx tests/session_attempts_screen_wiring_gate.ts
npx tsx tests/learning_v2_session_attempts_runtime_gate.ts
npx tsx tests/learning_v2_session_attempts_motion_gate.ts
```

Then run the focused integration tests under one heavy slot:

```powershell
bash .claude/semaphore/slot.sh acquire "jest second chance routes"
npx jest --runTestsByPath tests/lesson_session_attempts_integration.test.tsx tests/lesson_words_attempts_integration.test.tsx tests/irregular_verbs_attempts_integration.test.tsx tests/mistake_practice_attempts_integration.test.tsx tests/fc_swipe_attempts_integration.test.tsx tests/fc_blitz_attempts_integration.test.tsx tests/fc_listening_attempts_integration.test.tsx tests/fc_speaking_attempts_integration.test.tsx --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: PASS for ten routes and explicit Arena exclusion.

- [ ] **Step 6: Commit route wiring**

```powershell
git add app/flashcards_blitz_session.tsx app/flashcards_listening_session.tsx app/flashcards_speaking_session.tsx app/flashcards_swipe.tsx app/lesson1.tsx app/lesson_irregular_verbs.tsx app/lesson_words.tsx app/mistake_practice_session.tsx app/learning_v2_direct_session_player_v1.tsx 'app/learning-v2/session/[id].tsx' tests/session_attempts_screen_wiring_gate.ts tests/learning_v2_session_attempts_runtime_gate.ts
git commit -m "feat: wire gift rescue across learning sessions"
```

### Task 4: Replace the rejected shrine with the approved plaque-free potion

**Files:**
- Modify: `assets/images/level-spin-rewards/attempt_restore_all.webp`
- Modify: `app/level_spin_reward_asset_manifest.ts`
- Modify: `tests/level_spin_reward_asset_manifest.test.ts`

- [ ] **Step 1: Inspect the approved transparent source**

Open `.superpowers/brainstorm/538-1788158633/content/icon-selected-potion.png` and verify the cream plaque/gold plaque frame, checkerboard, and black border are absent. The bottle must contain exactly three ruby hearts.

- [ ] **Step 2: Convert only the existing wired slot**

Run this exact Sharp transform to overwrite only the existing wired slot; do not add alternate bundled icons:

```powershell
node -e "const sharp=require('sharp'); sharp('.superpowers/brainstorm/538-1788158633/content/icon-selected-potion.png').resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:76,alphaQuality:90}).toFile('assets/images/level-spin-rewards/attempt_restore_all.webp.tmp').then(()=>require('fs').renameSync('assets/images/level-spin-rewards/attempt_restore_all.webp.tmp','assets/images/level-spin-rewards/attempt_restore_all.webp'))"
```

- [ ] **Step 3: Update the semantic asset receipt**

Change the manifest subject from the rejected shrine wording to:

```ts
'transparent heart-shaped ruby potion with three contained heart cores'
```

Update the focused manifest test to assert `heart-shaped ruby potion` and `three contained heart cores`.

- [ ] **Step 4: Verify alpha, dimensions, bundle wiring, and size**

```powershell
node -e "const sharp=require('sharp'); sharp('assets/images/level-spin-rewards/attempt_restore_all.webp').metadata().then(m=>{if(m.width!==512||m.height!==512||!m.hasAlpha)process.exit(1); console.log(m)})"
npx jest --runTestsByPath tests/level_spin_reward_asset_manifest.test.ts tests/level_spin_reward_assets.test.ts --runInBand
rg -n "attempt_restore_all\.webp" app components constants hooks contexts lib modules
```

Expected: 512×512, alpha true, one existing static `require()`, and no new sibling asset.

- [ ] **Step 5: Commit the selected icon**

```powershell
git add assets/images/level-spin-rewards/attempt_restore_all.webp app/level_spin_reward_asset_manifest.ts tests/level_spin_reward_asset_manifest.test.ts
git commit -m "design: replace second chance gift icon"
```

### Task 5: Generate ten quiet ElevenLabs candidates and wire only the selected SFX

**Blocked prerequisite:** ElevenLabs must stop returning `401 payment_issue`. Do not retry the live batch until the failed/incomplete invoice is resolved.

**Files:**
- Keep previews in: `.codex-tmp/second-chance-sound-design/`
- Modify after owner selection: `modules/audio/sound_events.ts`
- Modify after owner selection: `modules/audio/sound_motion.ts`
- Create after owner selection: `assets/audio/sfx/v1/hearts/pm_second_chance_rescue_v1.m4a`
- Modify after owner selection: `tests/sound_events_contract.test.ts`
- Modify after owner selection: `tests/sound_motion_contract.test.ts`

- [ ] **Step 1: Generate the ten approved concepts after billing recovery**

Run the ignored generator with `OPENAI_TTS_API_KEY` untouched and the existing ElevenLabs credential. Each prompt must enforce 0.65–0.95 s, no speech/voice/melody/bass hit/riser/explosion/casino/metal clang/harsh highs/long tail.

- [ ] **Step 2: Normalize every preview identically**

Apply short fades, integrated loudness approximately -22 LUFS, and true peak at or below -6 dBFS. Write duration, LUFS, peak, SHA-256, and prompt to an ignored JSON manifest. Reject any candidate outside those limits before the owner hears it.

- [ ] **Step 3: Publish a new semantic browser mockup filename**

Create `guardian-runes-selected-potion-ten-sfx-v3.html` in the visual companion content directory. Every A–J button must replay the same approved animation from frame zero at the same gain. Never reuse the rejected five files.

- [ ] **Step 4: Wait for explicit owner selection**

Copy only the selected normalized file to `assets/audio/sfx/v1/hearts/pm_second_chance_rescue_v1.m4a`. The other nine remain ignored and never enter `assets/audio/**`.

- [ ] **Step 5: Register exactly one source-specific event**

Add `pm.hearts.gift_rescue` to `SOUND_EVENTS`, map it to the selected M4A with the measured duration, and request it once after gift recovery success. Request `pm.hearts.restored` once after the no-gift reset. Add the matching motion profile and contract assertions.

- [ ] **Step 6: Verify the audio contract**

```powershell
npx jest --runTestsByPath tests/sound_events_contract.test.ts tests/sound_event_call_sites_contract.test.ts tests/sound_motion_contract.test.ts --runInBand
```

Expected: both recovery events have one call site, valid bundled assets, and no rejected preview in the production tree.

- [ ] **Step 7: Commit only the selected sound**

```powershell
git add assets/audio/sfx/v1/hearts/pm_second_chance_rescue_v1.m4a modules/audio/sound_events.ts modules/audio/sound_motion.ts tests/sound_events_contract.test.ts tests/sound_motion_contract.test.ts
git commit -m "audio: add second chance rescue cue"
```

### Task 6: Run focused economy, Learning V2, accessibility, and asset verification

**Files:**
- Modify only if a focused gate exposes a defect in the files above.

- [ ] **Step 1: Re-read the applicable Learning V2 route and run drift-check**

Re-read `docs/v2/СТАРТ В2.md` and its applicable runtime/motion documents. Continue only with `ON TRACK`.

- [ ] **Step 2: Run deterministic non-heavy guards**

```powershell
npx tsx tests/session_attempts_screen_wiring_gate.ts
npx tsx tests/session_attempts_economy_gate.ts
npx tsx tests/learning_v2_session_attempts_runtime_gate.ts
npx tsx tests/learning_v2_session_attempts_motion_gate.ts
npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts
```

Expected: all PASS and blueprint fingerprint remains `9aa272695d0227856862e8f9be3d68b19907a1ef9bead9b71a4baf62c3105bb7`.

- [ ] **Step 3: Run focused Jest gates under one semaphore slot**

```powershell
bash .claude/semaphore/slot.sh acquire "jest second chance final"
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/use_session_attempt_auto_reset.test.tsx tests/use_session_attempts.test.tsx tests/session_attempt_gift_rescue_overlay.test.tsx tests/session_attempts_hud.test.tsx --runInBand
npx jest --runTestsByPath tests/session_attempt_recovery.test.ts tests/session_attempt_restore_inventory.test.ts tests/session_attempts_domain.test.ts tests/session_attempts_copy.test.ts tests/economy_constitution_contract.test.ts tests/level_spin_reward_asset_manifest.test.ts tests/level_spin_reward_assets.test.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: all PASS; no standalone debit, duplicate consume, rune loss on gift success, or Arena wiring.

- [ ] **Step 4: Inspect the final diff and working-tree ownership**

```powershell
git diff --check
git status --short
git diff -- hooks/useSessionAttemptAutoReset.ts hooks/useSessionAttempts.ts components/session_attempts app/session_attempts/session_attempts_copy.ts app/session_attempts/session_attempts_registry.ts tests/session_attempts_screen_wiring_gate.ts
```

Confirm unrelated pre-existing changes remain untouched and no rejected audio/icon preview is staged.

- [ ] **Step 5: Record the external audio blocker if still unresolved**

If ElevenLabs still returns `401 payment_issue`, mark Tasks 1–4 and the silent visual verification complete, leave Task 5 explicitly blocked, and do not claim the sounded mockup or production SFX is finished.
