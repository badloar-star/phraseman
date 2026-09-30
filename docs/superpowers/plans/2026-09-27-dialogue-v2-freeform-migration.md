# Dialogue V2 Freeform Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `test-driven-development` for each source change. Work task-by-task; do not activate a release, deploy, call a provider, or create production data.

**Goal:** Replace the legacy Compass route behind Dialogue V2’s Plus-only “Free conversation” control with a Design 2.0 freeform thread that uses the V2 safety, quota, local-voice and memory boundaries.

**Architecture:** A freeform thread is not a 77th catalogue scenario and has no objectives or rank. It gets a dedicated server-owned selection type and callable boundary, therefore it cannot claim a scenario’s content, rank or completion. The client reuses the existing V2 chat surface and local learner-voice hook, but only a short structured V2 memory summary may be read/written. No raw transcript, local audio URI, catalog path, provider choice or persona authority crosses the client boundary.

**Tech Stack:** Expo Router, React Native, Firebase callable functions/Admin Firestore transactions, existing V2 Design tokens, Jest and Firestore Rules emulator.

---

### Task 1: Define the freeform authority contract

**Files:**

- Create: `shared/dialogue_v2_freeform_contract.ts`
- Create: `tests/dialogue_v2_freeform_contract.test.ts`
- Modify: `components/dialogs/DialogueV2CatalogueContainer.tsx`
- Test: `tests/dialogue_v2_catalogue_container.test.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
expect(parseDialogueV2FreeformSelection({ studyTarget: 'de' })).toEqual({ studyTarget: 'de' });
expect(parseDialogueV2FreeformSelection({ studyTarget: 'de', scenarioId: 'work_01' })).toBeNull();
expect(parseDialogueV2FreeformSelection({ studyTarget: 'ru' })).toBeNull();
```

- [ ] **Step 2: Verify RED**

Run: `node --max-old-space-size=8192 .\\node_modules\\jest\\bin\\jest.js --runInBand --no-cache --watchman=false tests/dialogue_v2_freeform_contract.test.ts`

Expected: the missing parser/module causes a failing test.

- [ ] **Step 3: Implement the minimal shared contract**

```ts
export type DialogueV2FreeformSelection = Readonly<{ studyTarget: DialogueV2FreeformStudyTarget }>;

export function parseDialogueV2FreeformSelection(value: unknown): DialogueV2FreeformSelection | null {
  // Accept exactly the one user-selectable language field; reject every authority field.
}
```

- [ ] **Step 4: Route Plus users only to a V2 route**

```ts
router.push({ pathname: '/dialogue_v2_freeform' } as never);
```

The Free path continues to open the existing Plus paywall. Remove the `/ai_companion_session` routing dependency from this V2 container; do not alter other legacy entry points in this task.

- [ ] **Step 5: Verify GREEN**

Run the two tests above. Expected: PASS.

### Task 2: Build a server-only Freeform V2 turn boundary

**Files:**

- Create: `functions/src/dialogue_v2_freeform_callable.ts`
- Create: `functions/src/dialogue_v2_freeform_callable.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.rules`
- Create: `functions/src/dialogue_v2_freeform_rules.emulator.test.ts`

- [ ] **Step 1: Write failing callable tests**

```ts
await expect(handler({ auth: { uid: 'auth-a' }, data: { studyTarget: 'de' } }))
  .rejects.toMatchObject({ code: 'permission-denied', message: 'dialogue_v2_freeform_plus_required' });
await expect(handler({ auth: { uid: 'auth-a' }, data: { studyTarget: 'de', scenarioId: 'forged' } }))
  .rejects.toMatchObject({ code: 'invalid-argument' });
```

- [ ] **Step 2: Verify RED**

Run: `node --max-old-space-size=8192 .\\node_modules\\jest\\bin\\jest.js --config jest.config.js --runInBand --no-cache --watchman=false --runTestsByPath src/dialogue_v2_freeform_callable.test.ts`

Expected: missing callable fails.

- [ ] **Step 3: Implement minimal authority**

```ts
// Resolve stable account id and Plus entitlement server-side.
// Accept only `studyTarget`; use server-selected locale/default persona policy.
// Reuse the monthly 30-reply transaction for Free only when the product later permits it;
// current freeform contract rejects non-Plus before a provider reservation.
// Persist only a bounded V2 memory command after a completed server response.
```

The callable must fail closed if the release/memory contract is unavailable. It must not accept rank, scenario, transcript history, audio URI, model, persona or storage paths. Do not expose direct Firestore read/write; add an explicit deny rule and emulator proof before export.

- [ ] **Step 4: Verify GREEN**

Run callable unit tests and the Firestore emulator rule test. Expected: PASS with owner and browser-admin direct read/write denied.

### Task 3: Reuse the V2 session surface without a scenario briefing or completion

**Files:**

- Create: `app/dialogue_v2_freeform.tsx`
- Create: `app/dialogue_v2_freeform_client.ts`
- Create: `tests/dialogue_v2_freeform_route.test.ts`
- Create: `tests/dialogue_v2_freeform_client.test.ts`
- Reuse: `components/dialogs/DialogueV2SessionScreen.tsx`
- Reuse: `hooks/use_dialogue_v2_voice_message.ts`

- [ ] **Step 1: Write failing route/client tests**

```ts
expect(routeSource).toContain('DialogueV2SessionScreen');
expect(routeSource).toContain('useDialogueV2VoiceMessage');
expect(routeSource).not.toContain('ai_companion_session');
expect(routeSource).not.toContain('Compass');
expect(callPayload).toEqual({ studyTarget: 'de', sessionId, turnId, userMessage: 'Guten Tag' });
```

- [ ] **Step 2: Verify RED**

Run the two new client tests. Expected: missing route/client fails.

- [ ] **Step 3: Implement minimal V2 freeform screen**

```tsx
<DialogueV2SessionScreen
  title={copy.freeformTitle}
  messages={messages}
  draft={draft}
  onStartVoice={voice.start}
  onSend={() => void send()}
  // no tasks, rank, briefing or completion action
/>
```

Use only `V2`, `V2_TYPE` and `useV2Palette`. The user’s voice attachment remains local/replayable and only its transcript becomes `userMessage`. Do not offer a bot-voice control unless the separately reviewed prepared-voice catalog is available.

- [ ] **Step 4: Verify GREEN**

Run route/client tests plus `tests/dialogue_v2_voice_message_lifecycle.test.ts`. Expected: PASS.

### Task 4: Memory and final regression gates

**Files:**

- Modify: `functions/src/dialogue_v2_memory_contract.ts` only if a separate opaque freeform thread ID is needed
- Modify: `functions/src/dialogue_v2_memory_writer.ts` only if Task 2 cannot use an existing bounded command
- Test: `functions/src/dialogue_v2_memory_writer.test.ts`
- Test: `functions/src/dialogue_v2_memory_rules.emulator.test.ts`
- Test: `tests/dialogue_v2_memory_client.test.ts`

- [ ] **Step 1: Write a failing memory boundary test**

```ts
expect(JSON.stringify(stored)).not.toContain('learner raw sentence');
expect(JSON.stringify(stored)).not.toContain('file://');
expect(resumeForFreeUser).toRejectWith('dialogue_v2_memory_plus_required');
```

- [ ] **Step 2: Verify RED, implement the smallest safe extension, then verify GREEN**

Do not add a generic path parameter. The server derives all account/language/thread identifiers. Keep delete-only availability after downgrade and preserve account-deletion cleanup.

- [ ] **Step 3: Run final scoped gates**

Run all Dialogue V2 functions tests, client freeform tests, memory tests, group-turn planner, voice lifecycle and the relevant rules emulator tests. Record any existing unrelated root type errors separately; do not call them a V2 pass.

### Coverage check

- Plus-only freeform: Tasks 1–3.
- No Compass/legacy route in V2: Tasks 1 and 3.
- Existing Design 2.0 visual system: Task 3.
- All-language language selection: Tasks 1–2.
- V2 memory and deletion boundaries: Tasks 2 and 4.
- Local user voice, no transcript/audio leakage beyond the already-authorized text turn: Task 3.
- No rank/purchase gate on freeform and no scenario/completion fabrication: Tasks 1–3.
- No deploy/release/provider invocation: every task.
