# MAX Voice Reliability and Prestart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a preloaded MAX lesson that starts instantly and repair animation, turn latency, verbal hangup, topic-mode synchronization, correction prompting, and return navigation.

**Architecture:** Restore `max_call_prestart` as the only normal MAX entry and keep it limited to server premint/plan data; WebRTC, microphone access, heartbeat, and elapsed time remain owned by `max_call_session`. Repair conversational behavior at the Realtime prompt/config boundary, while keeping ephemeral topic state in the existing pure reducer and correction navigation explicit through a route parameter.

**Tech Stack:** React Native, Expo Router, TypeScript, OpenAI Realtime session configuration, Jest, Reanimated 4.

---

## File map

- `constants/motionHybrid.ts`: shared MAX aura motion tokens.
- `app/max_call_halo.tsx`: Reanimated aura implementation.
- `functions/src/max_voice_config.ts`: per-CEFR Realtime VAD defaults.
- `functions/src/max_voice_mint.ts`: server-pinned Realtime turn-detection payload.
- `functions/src/max_voice_prompt.ts`: tutor rules and tool descriptions.
- `app/max_tutor_live_board_state.ts`: pure live topic/mode reducer; no new state owner is introduced.
- `app/max_voice_review.tsx`: builds the focused correction and selects its return route.
- `app/mistake_practice_session.tsx`: honors an optional explicit return route while preserving the cards fallback.
- `app/max_call_prestart.tsx`: premint-only preparation surface and lesson-plan UI.
- `app/(tabs)/home.tsx`: normal MAX entry route.
- `tests/max_call_halo_visual_contract.test.ts`: aura regression contract.
- `functions/src/max_voice_config.test.ts`, `functions/src/max_voice_mint.test.ts`: VAD contracts.
- `functions/src/max_voice_prompt.test.ts`: hangup and free-talk return contracts.
- `tests/max_voice_review_server_contract.test.ts`: focused correction prompt/return wiring.
- `tests/max_call_home_entry_contract.test.ts`: prestart routing and no-early-call lifecycle contract.
- `tests/max_call_premint.test.ts`: premint ownership/handoff/release contract.

### Task 1: Smooth the aura and shorten semantic endpointing

**Files:**
- Modify: `constants/motionHybrid.ts:104-128`
- Modify: `app/max_call_halo.tsx:108-130`
- Modify: `functions/src/max_voice_config.ts:124-142`
- Verify: `functions/src/max_voice_mint.ts:473-503`
- Test: `tests/max_call_halo_visual_contract.test.ts`
- Test: `functions/src/max_voice_config.test.ts`
- Test: `functions/src/max_voice_mint.test.ts`

- [ ] **Step 1: Keep the failing aura contract**

```ts
expect(MAX_CALL_HYBRID).toMatchObject({
  micPulseMax: 0.08,
  micAttackMs: 480,
  micReleaseMs: 720,
});
expect(source).toContain('easing: Easing.inOut(Easing.quad)');
```

- [ ] **Step 2: Keep the failing VAD contract**

```ts
expect(MAX_VOICE_CONFIG_DEFAULTS.vadEagerness).toEqual({
  A1: 'medium',
  A2: 'medium',
  B1: 'high',
  B2: 'high',
});
```

- [ ] **Step 3: Confirm both contracts fail for the old behavior**

Run:

```powershell
npx jest --runTestsByPath tests/max_call_halo_visual_contract.test.ts --no-cache --runInBand
cd functions; npx jest --runTestsByPath src/max_voice_config.test.ts src/max_voice_mint.test.ts --no-cache --runInBand
```

Expected: old `0.18/110/260` motion and `low/low/medium/medium` VAD values fail.

- [ ] **Step 4: Apply the minimal motion and VAD implementation**

```ts
export const MAX_CALL_HYBRID = {
  // existing geometry
  micPulseMax: 0.08,
  micAttackMs: 480,
  micReleaseMs: 720,
  micResetMs: 160,
} as const;

micPulse.value = withTiming(target, {
  duration: target > micPulse.value
    ? MAX_CALL_HYBRID.micAttackMs
    : MAX_CALL_HYBRID.micReleaseMs,
  easing: Easing.inOut(Easing.quad),
});

vadEagerness: { A1: 'medium', A2: 'medium', B1: 'high', B2: 'high' },
```

Keep `create_response: false` and `interrupt_response: false` in `max_voice_mint.ts`; do not re-enable provider auto-response or auto-interrupt.

- [ ] **Step 5: Run the focused tests**

Expected: all selected suites pass with zero failed tests.

### Task 2: Make verbal hangup and free-talk return explicit

**Files:**
- Modify: `functions/src/max_voice_prompt.ts:205-281,378-426`
- Test: `functions/src/max_voice_prompt.test.ts:239-270`
- Verify: `tests/max_tutor_live_board_state.test.ts`

- [ ] **Step 1: Keep the failing prompt assertions**

```ts
expect(instr).toContain('If the learner asks to stop, finish, end, or hang up');
expect(instr).toContain('If the learner asks to return to the lesson plan, current goal, or guided topic');
expect(JSON.stringify(TUTOR_TOOLS)).toContain('learner asks to stop or end');
expect(JSON.stringify(TUTOR_TOOLS)).toContain('switch back from free talk to the lesson');
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
cd functions; npx jest --runTestsByPath src/max_voice_prompt.test.ts --no-cache --runInBand
```

Expected: the four new text contracts fail while all existing prompt tests pass.

- [ ] **Step 3: Remove the contradictory learner-hangup rule**

Replace “Wrap-up (started by a TIME NOTE, never by the learner)” with:

```text
Wrap-up normally starts from a TIME NOTE. If the learner asks to stop, finish, end, or hang up, their request wins immediately: do not continue the lesson plan, do not force homework, give one short warm goodbye, then call end_call() in the same turn.
```

Keep the full timed wrap-up for ordinary timer-driven endings.

- [ ] **Step 4: Add the symmetric guided-mode instruction**

Append to the topic rule:

```text
If the learner asks to return to the lesson plan, current goal, or guided topic, agree immediately and call set_live_topic with a short current-goal topic and mode "guided", even if this lesson previously entered "free_talk".
```

Update tool descriptions so `set_live_topic` explicitly says it can switch back from free talk, and `end_call` explicitly says it is required after a learner asks to stop or end and the brief goodbye is spoken.

- [ ] **Step 5: Verify GREEN**

Run the prompt test plus `tests/max_tutor_live_board_state.test.ts`. Expected: both pass; the reducer already supports `free_talk → guided` without deleting the stored goal.

### Task 3: Repair the focused correction prompt and return path

**Files:**
- Modify: `app/max_voice_review.tsx:335-393`
- Modify: `app/mistake_practice_session.tsx:104-157,499-540`
- Test: `tests/max_voice_review_server_contract.test.ts`
- Test: `tests/mistake_practice_screen_contract.test.ts`

- [ ] **Step 1: Keep the failing correction prompt contract**

```ts
expect(screen).toContain('const practicePrompt = triLang(lang, {');
expect(screen).toContain('topFocus.original');
expect(screen).toContain('sourceMeaning: practicePrompt');
expect(screen).not.toContain('sourceMeaning: topFocus.note');
```

- [ ] **Step 2: Add the failing explicit-return contract**

```ts
expect(screen).toContain("returnTo: 'max_voice_review'");
expect(practice).toContain('returnTo?: string');
expect(practice).toContain("params.returnTo === 'max_voice_review'");
expect(practice).toContain("router.replace('/max_voice_review' as any)");
```

- [ ] **Step 3: Verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/max_voice_review_server_contract.test.ts tests/mistake_practice_screen_contract.test.ts --no-cache --runInBand
```

Expected: prompt and explicit-return assertions fail; unrelated mistake-practice contracts pass.

- [ ] **Step 4: Build a localized correction instruction from the original phrase**

Inside `practiceTopFocus`, create:

```ts
const practicePrompt = triLang(lang, {
  ru: `Исправь фразу: “${topFocus.original}”.${topFocus.note ? ` Подсказка: ${topFocus.note}` : ''}`,
  uk: `Виправ фразу: “${topFocus.original}”.${topFocus.note ? ` Підказка: ${topFocus.note}` : ''}`,
  es: `Corrige la frase: “${topFocus.original}”.${topFocus.note ? ` Pista: ${topFocus.note}` : ''}`,
  'pt-BR': `Corrija a frase: “${topFocus.original}”.${topFocus.note ? ` Dica: ${topFocus.note}` : ''}`,
  vi: `Sửa câu: “${topFocus.original}”.${topFocus.note ? ` Gợi ý: ${topFocus.note}` : ''}`,
  id: `Perbaiki kalimat: “${topFocus.original}”.${topFocus.note ? ` Petunjuk: ${topFocus.note}` : ''}`,
  tr: `Cümleyi düzelt: “${topFocus.original}”.${topFocus.note ? ` İpucu: ${topFocus.note}` : ''}`,
  pl: `Popraw zdanie: „${topFocus.original}”.${topFocus.note ? ` Wskazówka: ${topFocus.note}` : ''}`,
});
```

Pass `sourceMeaning: practicePrompt` and route params `{ focusMistakeId, returnTo: 'max_voice_review' }`.

- [ ] **Step 5: Centralize practice exit without changing generic behavior**

Parse `returnTo?: string`, then add:

```ts
const returnToMaxReview = params.returnTo === 'max_voice_review';
const leavePractice = () => {
  if (returnToMaxReview) {
    router.replace('/max_voice_review' as any);
    return;
  }
  safeRouterBack(router, '/flashcards' as never);
};
```

Use `leavePractice` for the error-return button, completed-session button, and header close button. Do not change generic card entry behavior.

- [ ] **Step 6: Verify GREEN**

Run the two focused suites. Expected: all pass and the generic `/flashcards` fallback remains present exactly once inside `leavePractice`.

### Task 4: Restore a premint-only preparation screen

**Files:**
- Modify: `app/max_call_prestart.tsx`
- Modify: `app/(tabs)/home.tsx:2400-2425`
- Modify: `app/max_voice_review.tsx:246-263`
- Modify: `tests/max_call_home_entry_contract.test.ts`
- Modify: `tests/max_voice_review_server_contract.test.ts`
- Verify: `app/max_call_premint.ts`
- Verify: `tests/max_call_premint.test.ts`

- [ ] **Step 1: Rewrite route contracts for the approved flow**

```ts
expect(maxEntry).toContain("pathname: '/max_call_prestart'");
expect(maxEntry).not.toContain("pathname: '/max_call_session'");
expect(prestart).toContain('beginPremint(');
expect(prestart).toContain('markPremintHandoff(key)');
expect(prestart).toContain("pathname: '/max_call_session'");
expect(session).toContain('claimPremint(key)');
expect(review).toContain("pathname: '/max_call_prestart'");
```

Add contracts that the prestart source does not call `getUserMedia`, `RTCPeerConnection`, `sendHeartbeat`, or `client.start`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/max_call_home_entry_contract.test.ts tests/max_voice_review_server_contract.test.ts tests/max_call_premint.test.ts --no-cache --runInBand
```

Expected: current alias/direct-session assertions fail; premint unit tests remain green.

- [ ] **Step 3: Restore the existing prestart implementation without overwriting unrelated work**

Use the current `HEAD` version of `app/max_call_prestart.tsx` as the source pattern, applying it through a reviewed patch rather than a destructive checkout. Preserve:

```ts
const entry = beginPremint(
  key,
  () => performMaxVoiceMint(callParams, initialMintRequest(callParams)),
  Date.now(),
  releaseUnusedMint,
);

markPremintHandoff(key);
router.replace({ pathname: '/max_call_session', params: {/* same call params */} } as any);
```

The prestart module may import mint/premint helpers, but must not import or invoke WebRTC client startup.

- [ ] **Step 4: Add explicit preparation readiness**

Track `preparing | ready | failed`. A successful mint sets plan/preflight data before `ready`. While not ready, render reserved card geometry and disable the primary button:

```tsx
const startReady = prepState === 'ready';

<TouchableOpacity
  accessibilityRole="button"
  accessibilityState={{ disabled: !startReady, busy: prepState === 'preparing' }}
  disabled={!startReady}
  onPress={startCall}
  style={{ minHeight: 56, backgroundColor: startReady ? t.accent : t.bgSurface2 }}
>
  <Text style={{ color: startReady ? t.correctText : t.textGhost }}>
    {startReady ? startLabel : preparingLabel}
  </Text>
</TouchableOpacity>
```

Use existing theme tokens, Ionicons, 44px minimum touch targets, dark foreground on lime, stable space for async content, and no new decorative motion.

- [ ] **Step 5: Preserve failure and cleanup semantics**

On failure show `maxVoiceFailureMessage` and a retry action that increments a local attempt key and starts a fresh `beginPremint`. On unmount before handoff call `abandonPremint(key, releaseUnusedMint)`. A successful start calls `markPremintHandoff(key)` before navigation.

- [ ] **Step 6: Route normal entry and “call again” through prestart**

Change the Home MAX tile and review “call again” route to `/max_call_prestart` with unchanged `format/scenarioId/cefr/devMode` params. Keep internal failure retry and DEV Hub direct-session routes unchanged because they are diagnostic/recovery paths, not normal lesson entry.

- [ ] **Step 7: Verify GREEN**

Run the route, premint, and review contract suites. Expected: the normal entry is prestart, the start handoff is session, and no early microphone/WebRTC/heartbeat token appears in prestart.

### Task 5: Focused final verification

**Files:**
- Verify only; no source edits unless a selected gate exposes a regression.

- [ ] **Step 1: Run root MAX and navigation suites**

```powershell
npx jest --runTestsByPath tests/max_call_halo_visual_contract.test.ts tests/max_call_ui_state.test.ts tests/max_call_premint.test.ts tests/max_call_home_entry_contract.test.ts tests/max_voice_review_server_contract.test.ts tests/max_tutor_live_board_state.test.ts tests/mistake_practice_screen_contract.test.ts --no-cache --runInBand
```

Expected: 7 suites pass, zero failed tests.

- [ ] **Step 2: Run functions MAX suites**

```powershell
cd functions
npx jest --runTestsByPath src/max_voice_config.test.ts src/max_voice_mint.test.ts src/max_voice_prompt.test.ts src/max_voice_client_server_contract.test.ts --no-cache --runInBand
```

Expected: 4 suites pass, zero failed tests.

- [ ] **Step 3: Run targeted TypeScript checks**

Use the repository TypeScript command if a narrow project target exists. If only whole-project `tsc` exists and unrelated dirty-tree failures occur, record the exact command and decisive errors without modifying unrelated files.

- [ ] **Step 4: Inspect the final scoped diff**

```powershell
git diff --check -- constants/motionHybrid.ts app/max_call_halo.tsx app/max_call_prestart.tsx app/max_call_session.tsx app/max_voice_review.tsx app/mistake_practice_session.tsx app/(tabs)/home.tsx functions/src/max_voice_config.ts functions/src/max_voice_mint.ts functions/src/max_voice_prompt.ts tests/max_call_halo_visual_contract.test.ts tests/max_call_home_entry_contract.test.ts tests/max_voice_review_server_contract.test.ts functions/src/max_voice_config.test.ts functions/src/max_voice_mint.test.ts functions/src/max_voice_prompt.test.ts
```

Expected: no whitespace errors. Review the diff to confirm no Arena files, admin files, balance writers, App Check settings, or unrelated user changes were touched.

- [ ] **Step 5: Report evidence**

Report changed behavior, exact passing test counts, any environmental verification limitation, and note that deployment was not performed.
