# MAX Release Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship MAX as a reliable, private, multilingual English voice tutor whose review and personal teaching continuity survive interruption, while operators see only privacy-safe technical aggregates.

**Architecture:** The client writes an account-scoped, expiring finalization envelope before leaving the call and retries one idempotent `maxVoiceFinalize` operation until it receives a durable review receipt. The server never persists audio or full transcripts: it atomically stores only the review, structured tutor memory, learning evidence, and daily technical aggregates. A first-use consent gate runs before minting or microphone use; the existing MAX orb remains visually identical, and UI state, captions, review, B2 content, accessibility, admin diagnostics, Jarvis, and deletion contracts are completed around these boundaries.

**Tech Stack:** React Native + Expo Router + TypeScript, AsyncStorage, Firebase Auth/Functions/Firestore, WebRTC audio stats, Jest/RNTL, single-file Firebase admin UI (`admin/v2/legacy.html`).

---

## Execution boundaries

- Work in the current checkout. The owner has not authorized a branch, worktree, or delegated coding task.
- Keep one writer. Preserve every unrelated staged and unstaged change in the dirty worktree.
- Do not touch purchases, paywalls, RevenueCat, prices, entitlement packaging, or subscription limits.
- Do not enable Admin App Check.
- Do not retain raw audio or complete transcripts on the server, in logs, analytics, Jarvis, support tools, exports, or the admin panel.
- Use `git commit --only <files...>` only when no active Git process owns `.git/index.lock`; never delete an active lock.
- Every new Firestore collection must be denied to direct clients, included in account deletion when personal, and registered in the Jarvis data-contract guard.
- Lime/green surfaces use dark foreground. New sheets use `HybridSheetShell` and `constants/motionHybrid.ts` only.

## File map

### Client files to create

- `app/max_voice_consent.ts` — local/cloud MAX consent state.
- `app/max_voice_consent_gate.tsx` — blocks personalized preparation, mint, and microphone use until consent.
- `components/MaxVoiceConsentModal.tsx` — eight-language first-use Hybrid sheet.
- `app/max_voice_finalize_types.ts` — shared client envelope/receipt types.
- `app/max_voice_finalize_outbox.ts` — account-scoped, 24-hour local retry envelope.
- `app/max_voice_finalize_client.ts` — idempotent callable client and retry classifier.
- `app/max_voice_finalize_boot.ts` — bounded boot/foreground drain.
- `app/max_memory_client.ts` — own-memory read/edit/delete/clear callables.
- `app/max_memory_settings.tsx` — memory manager in Privacy settings.
- `app/max_voice_copy.ts` — typed eight-language MAX system copy.

### Client files to modify

- `app/(tabs)/home.tsx` — preview-only warmup; no premint before consent.
- `app/max_call_prestart.tsx` — consent gate and preparation handoff.
- `app/max_call_session.tsx` — durable envelope before navigation; immediate reconnect/failure state; one context strip.
- `app/max_call_ui_state.ts` — explicit terminal failure and real audio-owner states.
- `app/max_call_live_caption.ts`, `app/max_call_live_caption_view.tsx` — audio-synchronised stable captions.
- `components/max/MaxCallOrb.tsx`, `app/max_call_audio_level.ts` — remote-audio-only response with unchanged appearance.
- `app/max_voice_review.tsx`, `app/max_voice_review_projection.ts` — durable receipt and compact hierarchy.
- `app/privacy_settings.tsx`, `app/privacy_screen.tsx`, `app/_layout.tsx` — consent, memory manager, lifecycle drain, routes.
- `app/auth_provider.ts`, `app/account_delete_enqueue.ts` — purge temporary MAX envelopes on identity exit.

### Server files to create

- `functions/src/record_ai_voice_consent.ts` — `aiVoiceConsent` callable.
- `functions/src/max_voice_finalize.ts` — authenticated idempotent finalizer.
- `functions/src/max_voice_review_receipt.ts` — strict durable receipt schema/sanitizer.
- `functions/src/max_voice_memory_controls.ts` — own-memory read/update/delete/clear callables.
- `functions/src/max_voice_ops.ts` — content-free daily counters and histograms.
- `functions/src/max_voice_ops_dashboard.ts` — bounded admin aggregate callable.
- `functions/src/jarvis/maxvoice_firestore_fetcher.ts` — bounded aggregate reader.
- `functions/src/jarvis/maxvoice_department.ts` — deterministic reliability findings only.
- `functions/src/jarvis/maxvoice_snapshot.ts` — Jarvis snapshot adapter.

### Server files to modify

- `functions/src/max_voice_tutor_memory.ts` — typed memory V2 and migration.
- `functions/src/max_voice_prompt.ts`, `functions/src/premium_dialog_review.ts` — memory/review boundary and pronunciation exclusion.
- `functions/src/max_voice_can_do_goals.ts`, `functions/src/max_voice_tutor_preview.ts` — B2 and all interface languages.
- `functions/src/max_voice_session_end.ts`, `functions/src/index.ts` — finalization/export wiring.
- `functions/src/account_delete.ts` — delete receipts/memory and identity-scoped MAX data.
- `functions/src/jarvis/decision.ts`, `functions/src/jarvis/index.ts`, `functions/src/jarvis/all_departments_snapshot.ts`, `functions/src/jarvis/all_departments_callables.ts`, `functions/src/jarvis/jarvis_data_contract_guard.test.ts` — MAX reliability department.
- `firestore.rules` — deny direct access to server-owned MAX documents.
- `admin/v2/legacy.html` — one lazy, privacy-safe MAX diagnostics page under System/Diagnostics.

## Milestone A — consent and durable handoff

### Task 1: Add MAX-specific consent before preparation or microphone use

**Files:**
- Create: `app/max_voice_consent.ts`
- Create: `app/max_voice_consent_gate.tsx`
- Create: `components/MaxVoiceConsentModal.tsx`
- Create: `functions/src/record_ai_voice_consent.ts`
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/max_call_prestart.tsx`
- Modify: `app/_layout.tsx`
- Modify: `functions/src/index.ts`
- Test: `tests/max_voice_consent.test.ts`
- Test: `tests/max_call_home_entry_contract.test.ts`
- Test: `tests/max_call_prestart_design_contract.test.ts`
- Test: `tests/max_call_quota_view.test.ts`
- Test: `functions/src/record_ai_consent_factory.test.ts`

- [ ] **Step 1: Write failing consent and entry-order tests**

```ts
it('does not premint from Home before MAX consent', () => {
  const source = read('app/(tabs)/home.tsx');
  expect(source).not.toMatch(/onPress[\s\S]{0,300}beginMaxTutorEntry\(\)/);
  expect(source).toMatch(/pathname:\s*['"]\/max_call_prestart['"]/);
});

it('does not start premint until voice consent is granted', () => {
  const source = read('app/max_call_prestart.tsx');
  expect(source).toMatch(/MaxVoiceConsentGate/);
  expect(source).toMatch(/onGranted[\s\S]{0,500}beginPremint/);
});

it('records MAX consent in its own cloud field', async () => {
  await handleRecordAiConsent(deps, 'aiVoiceConsent', {
    authUid: 'auth-1', data: { state: 'granted' },
  });
  expect(set).toHaveBeenCalledWith(expect.objectContaining({ aiVoiceConsent: 'granted' }), { merge: true });
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `npx jest --runInBand --no-cache tests/max_voice_consent.test.ts tests/max_call_home_entry_contract.test.ts tests/max_call_prestart_design_contract.test.ts tests/max_call_quota_view.test.ts`

Run: `cd functions && npx jest --runInBand --no-cache src/record_ai_consent_factory.test.ts`

Expected: FAIL because MAX consent modules and `aiVoiceConsent` export do not exist and Home still premints.

- [ ] **Step 3: Implement the consent module and Hybrid sheet**

Use `createAiConsentModule('ai_voice_consent_v1', 'recordAiVoiceConsent')`. The sheet copy is exact:

| lang | title | body | accept | decline |
|---|---|---|---|---|
| ru | Разрешить разговоры с MAX? | Голос обрабатывается во время разговора. После него сохраняются только разбор и небольшая учебная память. Аудио и полный текст разговора не сохраняются. | Разрешить и продолжить | Не сейчас |
| uk | Дозволити розмови з MAX? | Голос обробляється під час розмови. Після неї зберігаються лише розбір і невелика навчальна пам’ять. Аудіо й повний текст розмови не зберігаються. | Дозволити й продовжити | Не зараз |
| es | ¿Permitir conversaciones con MAX? | La voz se procesa durante la conversación. Después solo se guardan la revisión y una pequeña memoria de aprendizaje. No guardamos el audio ni la transcripción completa. | Permitir y continuar | Ahora no |
| pt-BR | Permitir conversas com o MAX? | A voz é processada durante a conversa. Depois, salvamos apenas a revisão e uma pequena memória de aprendizagem. Não salvamos o áudio nem a transcrição completa. | Permitir e continuar | Agora não |
| vi | Cho phép trò chuyện với MAX? | Giọng nói được xử lý trong lúc trò chuyện. Sau đó chỉ lưu phần nhận xét và một bộ nhớ học tập nhỏ. Không lưu âm thanh hay toàn bộ bản chép lời. | Cho phép và tiếp tục | Để sau |
| id | Izinkan percakapan dengan MAX? | Suara diproses selama percakapan. Setelahnya, hanya ulasan dan sedikit memori belajar yang disimpan. Audio dan transkrip lengkap tidak disimpan. | Izinkan dan lanjutkan | Nanti saja |
| tr | MAX ile konuşmaya izin verilsin mi? | Ses, konuşma sırasında işlenir. Sonrasında yalnızca değerlendirme ve küçük bir öğrenme hafızası saklanır. Ses ve tam konuşma dökümü saklanmaz. | İzin ver ve devam et | Şimdi değil |
| pl | Zezwolić na rozmowy z MAX-em? | Głos jest przetwarzany podczas rozmowy. Później zapisujemy tylko podsumowanie i małą pamięć nauki. Nie zapisujemy audio ani pełnej transkrypcji. | Zezwól i kontynuuj | Nie teraz |

`MaxVoiceConsentGate` renders no personalized preview and exposes `onGranted`. Decline returns to Home. Accept first persists local consent, best-effort mirrors it to cloud, then permits preview and premint. Home may prefetch only when `isAiVoiceConsentGranted()` is true; otherwise it renders the static MAX entry card.

- [ ] **Step 4: Export and hydrate consent**

```ts
// functions/src/record_ai_voice_consent.ts
import { createRecordAiConsentCallable } from './record_ai_consent_factory';
export const recordAiVoiceConsent = createRecordAiConsentCallable('aiVoiceConsent');

// functions/src/index.ts
export { recordAiVoiceConsent } from './record_ai_voice_consent';
```

Add `hydrateAiVoiceConsentFromStorage()` beside the existing explain/dialog hydration in `app/_layout.tsx`.

- [ ] **Step 5: Keep preparation invisible behind a useful prestart screen**

The cached preview renders the unique lesson title, one large can-do outcome, and one primary `Начать` button immediately. Preparation starts after consent while the learner reads that screen; the session clock and usage accounting do not begin until `Начать`. Disable the button with a calm inline `Готовим разговор…` state only while mint is genuinely unfinished; once ready, pressing it must hand off the existing premint without another network round trip.

Do not render `Ближайшие уроки`, flag/cap decorative icons, or `Целей закрыто`. Render remaining daily time as one simple bar plus `Сегодня осталось N мин`; the filled fraction is `dayRemainingSec / dailyVoiceSecMax` and decreases after settled usage. This is technical quota presentation only and does not change any package, price, purchase, or entitlement rule.

- [ ] **Step 6: Run focused tests and commit only owned files**

Run the two commands from Step 2. Expected: PASS.

Commit: `git commit --only app/max_voice_consent.ts app/max_voice_consent_gate.tsx components/MaxVoiceConsentModal.tsx "app/(tabs)/home.tsx" app/max_call_prestart.tsx app/_layout.tsx functions/src/record_ai_voice_consent.ts functions/src/index.ts tests/max_voice_consent.test.ts tests/max_call_home_entry_contract.test.ts tests/max_call_prestart_design_contract.test.ts tests/max_call_quota_view.test.ts functions/src/record_ai_consent_factory.test.ts -m "feat(max): require voice consent before preparation"`

### Task 2: Persist the finalization envelope before review navigation

**Files:**
- Create: `app/max_voice_finalize_types.ts`
- Create: `app/max_voice_finalize_outbox.ts`
- Modify: `app/max_call_session.tsx`
- Modify: `app/account_delete_enqueue.ts`
- Modify: `app/auth_provider.ts`
- Test: `tests/max_voice_finalize_outbox.test.ts`
- Test: `tests/max_call_lifecycle_e2e.test.ts`
- Test: `tests/account_delete_flow_contract.test.ts`

- [ ] **Step 1: Write failing outbox tests**

```ts
it('writes an account-scoped envelope before review navigation', async () => {
  await putMaxFinalizeEnvelope('account-A', envelope({ sessionId: 's1' }), 1_000);
  expect(await listPendingMaxFinalize('account-A', 1_001)).toEqual([
    expect.objectContaining({ sessionId: 's1', expiresAtMs: 86_401_000 }),
  ]);
});

it('does not leak envelopes between accounts and expires them after 24h', async () => {
  await putMaxFinalizeEnvelope('account-A', envelope({ sessionId: 's1' }), 1_000);
  expect(await listPendingMaxFinalize('account-B', 1_001)).toEqual([]);
  expect(await listPendingMaxFinalize('account-A', 86_401_001)).toEqual([]);
});

it('purges pending transcripts on account exit', async () => {
  await putMaxFinalizeEnvelope('account-A', envelope({ sessionId: 's1' }), 1_000);
  await clearMaxFinalizeOutbox('account-A');
  expect(await listPendingMaxFinalize('account-A', 1_001)).toEqual([]);
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runInBand --no-cache tests/max_voice_finalize_outbox.test.ts tests/max_call_lifecycle_e2e.test.ts tests/account_delete_flow_contract.test.ts`

Expected: FAIL because the outbox API is absent and `max_call_session.tsx` still writes only module memory.

- [ ] **Step 3: Define the exact local envelope**

```ts
export interface MaxVoiceFinalizeEnvelopeV1 {
  readonly version: 1;
  readonly accountKey: string;
  readonly sessionId: string;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  readonly attempts: number;
  readonly nextAttemptAtMs: number;
  readonly request: {
    readonly history: readonly { role: 'user' | 'assistant'; text: string }[];
    readonly durationSec: number;
    readonly speechSec: number;
    readonly format: 'scenario' | 'companion' | 'trial' | 'tutor';
    readonly scenarioId?: string;
    readonly cefr: 'A1' | 'A2' | 'B1' | 'B2';
    readonly interfaceLang: 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
    readonly endReason: 'completed' | 'capped' | 'dropped' | 'background' | 'failed';
    readonly goalId?: string;
    readonly phraseResults: readonly { text: string; result: 'pass' | 'needs_work' | 'uncertain' | 'invalid' }[];
    readonly tutorEvidence: {
      readonly nextTopic?: string;
      readonly homeworkItems: readonly { text: string; meaning: string }[];
      readonly languagePreference?: string;
      readonly safetyFlags: readonly { kind: string; note: string }[];
    };
  };
}
```

Store one JSON map per account under `max_voice_finalize_outbox_v1:<accountKey>`. Validate every parsed field, cap history at 80 turns, each turn at 1,000 characters, homework at 6 items, and total encoded payload at 128 KiB. Reject rather than truncate an oversized transcript silently.

- [ ] **Step 4: Change call end ordering**

In `app/max_call_session.tsx`, build the envelope from the existing buffer, then:

```ts
await putMaxFinalizeEnvelope(accountKey, envelope, Date.now());
setLastMaxCallResult(projectPendingReview(envelope));
if (isTutor) invalidateMaxTutorPreview();
router.replace('/max_voice_review' as never);
void drainOneMaxFinalize(accountKey, envelope.sessionId);
```

If the local write fails, show a terminal receipt with retry/back controls; never navigate to an empty review. Account switch, sign-out wipe, and deletion clear the previous account's envelope.

- [ ] **Step 5: Run focused tests and commit**

Run the Step 2 command. Expected: PASS.

Commit: `git commit --only app/max_voice_finalize_types.ts app/max_voice_finalize_outbox.ts app/max_call_session.tsx app/account_delete_enqueue.ts app/auth_provider.ts tests/max_voice_finalize_outbox.test.ts tests/max_call_lifecycle_e2e.test.ts tests/account_delete_flow_contract.test.ts -m "feat(max): persist review handoff before navigation"`

### Task 3: Add an idempotent server finalizer and durable review receipt

**Files:**
- Create: `functions/src/max_voice_review_receipt.ts`
- Create: `functions/src/max_voice_finalize.ts`
- Create: `app/max_voice_finalize_client.ts`
- Create: `app/max_voice_finalize_boot.ts`
- Modify: `functions/src/index.ts`
- Modify: `app/_layout.tsx`
- Test: `functions/src/max_voice_finalize.test.ts`
- Test: `tests/max_voice_finalize_client.test.ts`

- [ ] **Step 1: Write server RED tests for ownership, idempotency, and non-retention**

```ts
it('returns the same completed receipt on retry without reviewing twice', async () => {
  const first = await finalize(request('session-1'), deps);
  const second = await finalize(request('session-1'), deps);
  expect(second).toEqual(first);
  expect(deps.review).toHaveBeenCalledTimes(1);
});

it('never writes transcript fields to Firestore', async () => {
  await finalize(request('session-1'), deps);
  const writes = JSON.stringify(deps.firestoreWrites());
  expect(writes).not.toMatch(/history|transcript|audio|utterance|userText|assistantText/i);
});

it('rejects a session owned by another stable identity', async () => {
  await expect(finalize(request('foreign-session'), deps)).rejects.toMatchObject({ code: 'permission-denied' });
});
```

- [ ] **Step 2: Run RED**

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_finalize.test.ts`

Expected: FAIL because the finalizer and receipt schema do not exist.

- [ ] **Step 3: Implement the durable receipt contract**

```ts
export interface MaxVoiceReviewReceiptV1 {
  readonly schemaVersion: 'max-voice-review.v1';
  readonly sessionId: string;
  readonly stableUid: string;
  readonly completedAtMs: number;
  readonly durationSec: number;
  readonly endReason: 'completed' | 'capped' | 'dropped' | 'background' | 'failed';
  readonly status: 'ready' | 'limited';
  readonly worked: readonly string[];
  readonly correction: { readonly said: string; readonly target: string; readonly explanation: string } | null;
  readonly tomorrowActions: readonly [string] | readonly [string, string] | readonly [string, string, string];
  readonly targetPhrase: string | null;
  readonly nextTopic: string | null;
  readonly goal: { readonly id: string; readonly masteryBefore: 0 | 1 | 2 | 3; readonly masteryAfter: 0 | 1 | 2 | 3 } | null;
  readonly phraseEvidence: readonly { readonly phraseId: string; readonly result: 'pass' | 'retry' | 'uncertain' }[];
}
```

Sanitize every free-text receipt field to 240 characters, lists to their declared limits, and enums to known values. Pronunciation, accent, phoneme, fluency-score, and audio-quality claims are rejected from the model projection.

- [ ] **Step 4: Implement lease-based finalization**

`maxVoiceFinalize` must:

1. authenticate and resolve the canonical stable UID without repairing links;
2. load the minted session/quota record and verify ownership;
3. return an existing `voice_call_reviews/{sessionId}` receipt owned by the caller;
4. create or take over a `processing` lease after 90 seconds;
5. run review outside the transaction without logging the request body;
6. transactionally write the sanitized receipt and memory projection once;
7. mark the session finalization `ready` and update content-free daily ops;
8. return the receipt.

The stored review document contains the receipt plus `processingLeaseUntilMs` and `updatedAtMs`; it contains no transcript. A retry while a live lease exists returns `{ status: 'processing', retryAfterMs }` instead of starting a second model call.

- [ ] **Step 5: Implement bounded client retry and boot drain**

Retry only `unavailable`, `deadline-exceeded`, `internal`, and `processing`. Use delays `2s, 5s, 15s, 60s, 5m`, stop after envelope expiry, delete the envelope only after a validated receipt, and process at most one envelope per foreground activation. Never retry permission, consent, ownership, or validation failures.

- [ ] **Step 6: Run focused tests and commit**

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_finalize.test.ts`

Run: `npx jest --runInBand --no-cache tests/max_voice_finalize_client.test.ts tests/max_voice_finalize_outbox.test.ts`

Expected: PASS.

Commit only the files listed in this task with message: `feat(max): finalize calls idempotently`.

## Milestone B — personal tutor memory and user control

### Task 4: Migrate tutor memory to a structured, safe V2 schema

**Files:**
- Modify: `functions/src/max_voice_tutor_memory.ts`
- Modify: `functions/src/max_voice_prompt.ts`
- Test: `functions/src/max_voice_tutor_memory.test.ts`
- Test: `functions/src/max_voice_prompt.test.ts`

- [ ] **Step 1: Add failing migration, evidence, and sensitive-data tests**

```ts
it('migrates V1 facts and recurring errors without losing learning state', () => {
  const memory = parseTutorMemory({ facts: ['Likes hiking'], recurringErrors: ['past tense'], phraseQueue: queue });
  expect(memory.schemaVersion).toBe(2);
  expect(memory.conversationHooks).toContainEqual(expect.objectContaining({ text: 'Likes hiking' }));
  expect(memory.activeIssues).toContainEqual(expect.objectContaining({ label: 'past tense' }));
});

it.each(['my password is qwerty', 'card 4111 1111 1111 1111', 'I live at 12 Main Street', 'diagnosed with depression'])(
  'rejects sensitive memory candidate: %s',
  (text) => expect(acceptMemoryCandidate(text, evidence())).toBe(false),
);

it('moves an issue to resolved only with repeated pass evidence', () => {
  const next = mergeTutorMemory(memoryWithIssue('past tense'), delta({ resolvedIssues: ['past tense'] }), evidence({ passCount: 2 }));
  expect(next.resolvedIssues[0].label).toBe('past tense');
  expect(next.activeIssues).toEqual([]);
});
```

- [ ] **Step 2: Run RED**

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_tutor_memory.test.ts src/max_voice_prompt.test.ts`

- [ ] **Step 3: Implement the exact V2 shape and caps**

```ts
export interface TutorMemoryV2 {
  readonly schemaVersion: 2;
  readonly stableUid: string;
  readonly authUid?: string;
  readonly preferredName: string | null;
  readonly learningGoal: string | null;
  readonly languagePreference: string | null;
  readonly pacePreference: 'slower' | 'normal' | 'faster' | null;
  readonly conversationHooks: readonly { id: string; text: string; evidenceSessionId: string; updatedAtMs: number }[];
  readonly activeIssues: readonly { id: string; label: string; evidenceCount: number; lastSeenAtMs: number }[];
  readonly resolvedIssues: readonly { id: string; label: string; resolvedAtMs: number }[];
  readonly homework: readonly string[];
  readonly nextTopic: string;
  readonly phraseQueue: readonly TutorPhraseMemory[];
  readonly goalMastery: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  readonly recentSessionIds: readonly string[];
  readonly callCount: number;
  readonly lastCallAtMs: number;
  readonly lastCefr: 'A1' | 'A2' | 'B1' | 'B2';
}
```

Caps: name 60 chars, goal 160, language preference 80, 8 conversation hooks × 140, 8 active issues × 100, 12 resolved issues × 100, 6 homework items × 140, 20 phrase items, 32 session IDs. Generate item IDs as SHA-256 of normalized type + label; do not use model-provided IDs.

Accept only structured model fields backed by the current session. Reject secrets, payment data, exact addresses, health/diagnosis, sexuality, religion, political affiliation, legal accusations, and data about third parties. Keep broad harmless interests such as profession category, hobby, travel preference, and learning motivation.

- [ ] **Step 4: Render memory as teaching context, not personal surveillance**

The prompt block contains preferred name, goal, pace/language preference, at most two relevant hooks, active learning issues, resolved issues, due phrases, homework, and promised next topic. It explicitly says: use one memory detail naturally when relevant; never announce that a profile is stored; never infer missing facts; never mention rejected/sensitive candidates.

- [ ] **Step 5: Run GREEN and commit**

Run the Step 2 command. Expected: PASS.

Commit only the four task files with message: `feat(max): add structured tutor memory v2`.

### Task 5: Let the learner inspect, edit, delete, or clear MAX memory

**Files:**
- Create: `functions/src/max_voice_memory_controls.ts`
- Create: `app/max_memory_client.ts`
- Create: `app/max_memory_settings.tsx`
- Modify: `functions/src/index.ts`
- Modify: `app/privacy_settings.tsx`
- Modify: `app/_layout.tsx`
- Modify: `functions/src/account_delete.ts`
- Test: `functions/src/max_voice_memory_controls.test.ts`
- Test: `tests/max_memory_settings.test.tsx`
- Test: `functions/src/account_delete.test.ts`

- [ ] **Step 1: Write failing ownership and mutation tests**

```ts
it('returns only the caller own sanitized memory projection', async () => {
  const result = await getMemory(request('auth-A'), deps);
  expect(result).toEqual(expect.objectContaining({ preferredName: 'Mia', activeIssues: expect.any(Array) }));
  expect(JSON.stringify(result)).not.toMatch(/stableUid|authUid|recentSessionIds/);
});

it('edits only user-editable scalar fields and item text', async () => {
  await updateMemory(request('auth-A', { itemId: 'hook-1', text: 'I enjoy hiking' }), deps);
  expect(deps.write).toHaveBeenCalledWith(expect.objectContaining({ text: 'I enjoy hiking' }));
});

it('clear removes the complete tutor memory document', async () => {
  await clearMemory(request('auth-A'), deps);
  expect(deps.delete).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run RED**

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_memory_controls.test.ts src/account_delete.test.ts`

Run: `npx jest --config jest.rntl.config.cjs --runInBand --no-cache tests/max_memory_settings.test.tsx`

- [ ] **Step 3: Implement four authenticated callables**

Export `maxVoiceGetMemory`, `maxVoiceUpdateMemory`, `maxVoiceDeleteMemoryItem`, and `maxVoiceClearMemory`. Resolve stable identity server-side. Permit edits to `preferredName`, `learningGoal`, `languagePreference`, `pacePreference`, and existing hook text only. Re-run the same sensitive-data validator on edits. Reject arbitrary field paths, foreign IDs, oversized text, and attempts to change evidence/counters.

- [ ] **Step 4: Implement the memory manager UI**

The screen has one large title, a short privacy explanation, grouped rows for name/goal/preferences, “MAX remembers” hooks, “Working on” issues, and “Improved” issues. Each row has edit or delete; one destructive “Clear MAX memory” action uses the existing Hybrid confirmation pattern. Empty, loading, offline, and error states are explicit. No separate memory enable switch exists.

In Privacy settings add:

1. a MAX consent switch labeled in all eight languages;
2. a chevron row “MAX memory” opening `/max_memory_settings`;
3. explanatory copy that disabling MAX stops new calls but keeps existing memory until the learner clears it.

- [ ] **Step 5: Extend account deletion**

Add `voice_call_reviews` queries for both `stableUid` and `authUid` if stored, retain `voice_tutor_memory`, and test that every personal MAX collection is deleted. Operational aggregate documents are anonymous and are not per-account deletion targets.

- [ ] **Step 6: Run GREEN and commit**

Run the commands from Step 2. Expected: PASS.

Commit only task files with message: `feat(max): add learner memory controls`.

## Milestone C — call-state truth, captions, orb, and review

### Task 6: Make reconnect and terminal failures explicit; collapse status surfaces

**Files:**
- Modify: `app/max_call_ui_state.ts`
- Modify: `app/max_call_session.tsx`
- Modify: `app/max_call_reconnect.ts`
- Modify: `app/max_call_client.ts`
- Modify: `app/max_call_tutor_tools.ts`
- Modify: `functions/src/max_voice_prompt.ts`
- Create: `app/max_voice_copy.ts`
- Test: `tests/max_call_ui_state.test.ts`
- Test: `tests/max_call_reconnect.test.ts`
- Test: `tests/max_call_client_teardown.test.ts`
- Test: `tests/max_call_tutor_tools.test.ts`
- Test: `tests/max_call_live_board_integration_contract.test.ts`

- [ ] **Step 1: Write failing state-machine tests**

```ts
it('shows reconnecting immediately on transport loss', () => {
  expect(reduceMaxCallUi(listening(), { type: 'transport_lost' }).phase).toBe('reconnecting');
});

it('does not mask reconnecting as thinking', () => {
  const source = read('app/max_call_session.tsx');
  expect(source).not.toMatch(/reconnecting[\s\S]{0,120}thinking/);
});

it('keeps terminal failure on screen until the learner chooses', () => {
  expect(reduceMaxCallUi(listening(), { type: 'fail', code: 'network' })).toMatchObject({ phase: 'failed', failureCode: 'network' });
});

it('requests the next response in the same turn that speech stops', async () => {
  const h = await connectedHarness();
  h.deliver({ type: 'input_audio_buffer.speech_stopped' });
  expect(h.dataChannel.sentOfType('response.create')).toHaveLength(1);
});

it('an explicit learner stop request cannot remain listening', () => {
  const state = reduceMaxCallUi(listening(), { type: 'learner_end_requested' });
  expect(state.phase).toBe('wrapping_up');
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runInBand --no-cache tests/max_call_ui_state.test.ts tests/max_call_reconnect.test.ts tests/max_call_client_teardown.test.ts tests/max_call_tutor_tools.test.ts tests/max_call_live_board_integration_contract.test.ts`

- [ ] **Step 3: Implement truthful visible states**

Use these exact semantic labels. Remove `Собеседник думает…`, the disappearing speaking label, the `reconnectShown` delay/mask, separate `MaxTutorTopicNotice`, and the “Учитель” subtitle. Do not remove the underlying topic/goal capability.

| lang | learner turn | MAX turn | ending | reconnecting | reconnect failed |
|---|---|---|---|---|---|
| ru | Говори | MAX говорит | Завершаем разговор | Восстанавливаем связь | Не удалось восстановить связь |
| uk | Говори | MAX говорить | Завершуємо розмову | Відновлюємо зв’язок | Не вдалося відновити зв’язок |
| es | Habla | MAX está hablando | Finalizando la conversación | Recuperando la conexión | No se pudo recuperar la conexión |
| pt-BR | Fale | MAX está falando | Encerrando a conversa | Restaurando a conexão | Não foi possível restaurar a conexão |
| vi | Hãy nói | MAX đang nói | Đang kết thúc cuộc trò chuyện | Đang khôi phục kết nối | Không thể khôi phục kết nối |
| id | Silakan bicara | MAX sedang berbicara | Mengakhiri percakapan | Memulihkan koneksi | Koneksi tidak dapat dipulihkan |
| tr | Konuş | MAX konuşuyor | Konuşma bitiriliyor | Bağlantı yeniden kuruluyor | Bağlantı yeniden kurulamadı |
| pl | Mów | MAX mówi | Kończymy rozmowę | Przywracanie połączenia | Nie udało się przywrócić połączenia |

Render one context strip only:

```ts
type MaxContextStrip = {
  mode: 'new_material' | 'review_and_scene' | 'free_talk';
  title: string;
  progressLabel?: string;
};
```

It updates in place whenever the tutor tool changes mode/topic/goal, preventing the stale “Свободный разговор” badge. Terminal failure offers `Повторить подключение` and `Завершить и перейти к разбору`; the latter finalizes with `endReason: 'failed'`.

- [ ] **Step 4: Make end-of-turn and explicit finish deterministic**

Keep `semantic_vad` at `medium` for A1/A2 and `high` for B1/B2. On `input_audio_buffer.speech_stopped`, send `response.create` in the same event loop when no response/audio is active; otherwise keep exactly one queued response and flush it immediately on `response.done` plus `output_audio_buffer.stopped`. Do not add a cosmetic “thinking” delay.

Add `learner_end_requested` to the UI reducer. Detect only explicit completed-transcript commands, normalized for punctuation/case, with this bounded intent catalog:

```ts
export const MAX_END_INTENTS = {
  en: ['end the call', 'finish the conversation', 'finish the lesson', "let's stop", 'i want to stop'],
  ru: ['закончи разговор', 'закончить разговор', 'давай закончим', 'закончи урок', 'я хочу закончить'],
  uk: ['закінчи розмову', 'закінчити розмову', 'давай закінчимо', 'закінчи урок', 'я хочу закінчити'],
  es: ['termina la conversación', 'terminar la conversación', 'acabemos', 'termina la lección', 'quiero terminar'],
  'pt-BR': ['encerre a conversa', 'terminar a conversa', 'vamos terminar', 'encerre a aula', 'quero terminar'],
  vi: ['kết thúc cuộc trò chuyện', 'dừng cuộc trò chuyện', 'kết thúc bài học', 'tôi muốn dừng lại'],
  id: ['akhiri percakapan', 'selesaikan percakapan', 'akhiri pelajaran', 'saya ingin berhenti'],
  tr: ['konuşmayı bitir', 'sohbeti bitir', 'dersi bitir', 'bitirelim', 'durmak istiyorum'],
  pl: ['zakończ rozmowę', 'skończ rozmowę', 'zakończ lekcję', 'skończmy', 'chcę zakończyć'],
} as const;
```

Require either exact normalized equality or a polite prefix/suffix around a catalog phrase; do not substring-match ordinary discussion of “finishing work”. On detection: enter `wrapping_up`, cancel listening/hint timers, send one trusted instruction for a single short goodbye plus `end_call()`, and arm a 12-second hard-finalize guard. `end_call` or completed goodbye tears down immediately; the guard guarantees navigation to review if the model/tool stalls.

- [ ] **Step 5: Run GREEN and commit**

Run the Step 2 command. Expected: PASS.

Commit only task files with message: `fix(max): show truthful call states`.

### Task 7: Stabilize captions and keep the sphere visually unchanged

**Files:**
- Modify: `app/max_call_live_caption.ts`
- Modify: `app/max_call_live_caption_view.tsx`
- Modify: `app/max_call_audio_level.ts`
- Modify: `components/max/MaxCallOrb.tsx`
- Test: `tests/max_call_live_caption.test.ts`
- Test: `tests/max_call_live_caption_view.test.ts`
- Test: `tests/max_call_audio_level.test.ts`
- Test: `tests/max_call_orb_visual_contract.test.ts`

- [ ] **Step 1: Add failing behavioural and visual invariants**

```ts
it('advances words only while remote audio is playing', () => {
  const queued = reduceLiveCaption(initial, { type: 'assistant_text', text: 'Nice to meet you today' });
  expect(reduceLiveCaption(queued, { type: 'tick' })).toEqual(queued);
  const playing = reduceLiveCaption(queued, { type: 'audio_started' });
  expect(reduceLiveCaption(playing, { type: 'tick' }).visibleWords.length).toBeGreaterThan(0);
});

it('preserves the approved orb layers and adds no ring or halo', () => {
  const source = read('components/max/MaxCallOrb.tsx');
  expect(source).toContain('MaxHomeOrb');
  expect(source).not.toMatch(/halo|ring|borderWidth|new Image/);
});

it('remote level drives orb scale and microphone level does not', () => {
  expect(orbScale({ remote: 0.7, mic: 0 })).toBeGreaterThan(orbScale({ remote: 0, mic: 0.7 }));
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runInBand --no-cache tests/max_call_live_caption.test.ts tests/max_call_live_caption_view.test.ts tests/max_call_audio_level.test.ts tests/max_call_orb_visual_contract.test.ts`

- [ ] **Step 3: Implement caption and audio rules**

Keep committed caption chunks stable at 2–5 words. Reveal only on `audio_started`/playing ticks, pause on `audio_stopped`, cancel pending ticks on reconnect/end, and show at most two lines in a fixed-height container. Auto-follow the active line without exposing a manual scroll surface. The accessibility live region announces only the completed assistant turn once, never every word.

Poll WebRTC inbound audio stats at the existing cadence. Smooth remote energy with a bounded EMA and map it to the existing orb transform only:

```ts
const smoothed = previous * 0.72 + clamp(remoteAudioLevel, 0, 1) * 0.28;
const scale = reduceMotion ? 1 : 1 + smoothed * 0.055;
```

No new circles, glow, rings, assets, colors, opacity changes, or layout size. When stats are unavailable, scale returns to `1` smoothly.

- [ ] **Step 4: Run GREEN and commit**

Run the Step 2 command. Expected: PASS.

Commit only task files with message: `fix(max): sync captions and orb to remote audio`.

### Task 8: Drive review from the durable receipt and simplify its hierarchy

**Files:**
- Modify: `app/max_voice_review.tsx`
- Modify: `app/max_voice_review_projection.ts`
- Modify: `app/mistake_practice_session.tsx`
- Test: `tests/max_voice_review_projection.test.ts`
- Test: `tests/max_voice_review_server_contract.test.ts`
- Test: `tests/max_call_lifecycle_e2e.test.ts`

- [ ] **Step 1: Write failing durable-review and hierarchy tests**

```ts
it('restores a ready review after module memory is empty', async () => {
  mockStoredReceipt(receipt({ sessionId: 's1' }));
  jest.resetModules();
  const { loadMaxReview } = await import('../../app/max_voice_review');
  expect(await loadMaxReview('s1')).toMatchObject({ state: 'ready', sessionId: 's1' });
});

it('shows no more than three numbered tomorrow actions', () => {
  const view = projectMaxReview(receipt({ tomorrowActions: ['1', '2', '3', '4'] as never }));
  expect(view.tomorrowActions).toEqual(['1', '2', '3']);
});

it('separates target phrase and next conversation from tomorrow actions', () => {
  const view = projectMaxReview(receipt({ targetPhrase: 'Could you repeat that?', nextTopic: 'At a hotel' }));
  expect(view.targetPhrase).toBe('Could you repeat that?');
  expect(view.nextConversation).toBe('At a hotel');
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runInBand --no-cache tests/max_voice_review_projection.test.ts tests/max_voice_review_server_contract.test.ts tests/max_call_lifecycle_e2e.test.ts`

- [ ] **Step 3: Implement four-level review hierarchy**

1. hero result: one sentence and goal progress;
2. `Получилось` — at most two concise wins;
3. `Исправить` — one primary correction with “said → say” and a clear explanation;
4. `Завтра` — at most three numbered actions, followed by a visually separate target phrase and `Следующий разговор` row.

Put all secondary metrics and additional corrections inside collapsed `Детали`. Do not show pronunciation scoring. Loading reads the local pending projection immediately, then replaces it with the durable server receipt. Offline retains the pending result and explicit `Разбор будет готов после подключения`. Returning from correction practice always returns to the same receipt by `sessionId`, never to the flashcards root.

While the outbox envelope still exists, `Детали` may render its transcript locally with a `Временно на этом устройстве` label. Once a durable receipt is validated and the envelope is deleted, the UI does not reconstruct, refetch, or persist that transcript; the transcript section simply disappears.

Replace the standalone `Целей закрыто` counter with defensible evidence: learner speaking time, a can-do goal used with less support, due phrases retrieved, active/resolved issues with later evidence, next planned conversation, and weekly continuity computed from durable receipts. Do not use unique-word totals, correction percentages, time spent, completion, streak, or call count as proof of proficiency, and do not announce a CEFR increase without the separate assessment contract.

- [ ] **Step 4: Run GREEN and commit**

Run the Step 2 command. Expected: PASS.

Commit only task files with message: `fix(max): restore and simplify durable review`.

## Milestone D — curriculum, localization, and accessibility

### Task 9: Complete eight-language MAX system copy and preview localization

**Files:**
- Modify: `app/max_voice_copy.ts`
- Modify: `functions/src/max_voice_can_do_goals.ts`
- Modify: `functions/src/max_voice_tutor_preview.ts`
- Modify: `functions/src/max_voice_prompt.ts`
- Test: `functions/src/max_voice_tutor_preview.test.ts`
- Test: `functions/src/max_voice_client_server_contract.test.ts`
- Test: `tests/max_call_pill_format.test.ts`

- [ ] **Step 1: Write failing locale completeness tests**

```ts
const UI_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

it.each(UI_LANGS)('has native preview and system copy for %s', (lang) => {
  const preview = buildTutorPreview(input({ interfaceLang: lang }));
  if (lang === 'ru') expect(preview.displayTitle).toMatch(/[А-Яа-яЁё]/u);
  else expect(preview.displayTitle).not.toMatch(/[А-Яа-яЁё]/u);
  expect(MAX_COPY[lang].reconnecting).toBeTruthy();
});

it('never falls back from a non-Russian interface to Russian tutor speech', () => {
  expect(buildMaxVoicePrompt(input({ interfaceLang: 'uk' }))).toContain('Never use Russian as fallback');
});
```

- [ ] **Step 2: Run RED**

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_tutor_preview.test.ts src/max_voice_client_server_contract.test.ts`

Run: `npx jest --runInBand --no-cache tests/max_call_pill_format.test.ts`

- [ ] **Step 3: Expand locale types and authored patterns**

Replace `PreviewLanguage = 'ru' | 'uk' | 'en'` with the eight UI languages plus English fallback for server-only contexts. Every goal title has keys `en, ru, uk, es, pt-BR, vi, id, tr, pl`. Add three authored title patterns and three authored outcome patterns per lesson type per UI language. The prompt receives the exact interface language and states that explanations use that language; English is the target language; Russian is never a fallback.

Reject incomplete locale records at module initialization:

```ts
export const MAX_TEXT_LANGS = ['en', 'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type MaxTextLanguage = typeof MAX_TEXT_LANGS[number];
export type LocalizedMaxText = Readonly<Record<MaxTextLanguage, string>>;
```

- [ ] **Step 4: Run GREEN and commit**

Run the Step 2 commands. Expected: PASS with one preview snapshot per UI language.

Commit only task files with message: `feat(max): localize tutor experience in eight languages`.

### Task 10: Add an owned B2 can-do curriculum and remove the B2→B1 fallback

**Files:**
- Create: `functions/src/max_voice_can_do_goals_b2.ts`
- Modify: `functions/src/max_voice_can_do_goals.ts`
- Modify: `functions/src/max_voice_tutor_preview.ts`
- Modify: `functions/src/max_voice_prompt.ts`
- Test: `functions/src/max_voice_can_do_goals.test.ts`
- Test: `functions/src/max_voice_tutor_memory.test.ts`

- [ ] **Step 1: Write failing B2 catalog tests**

```ts
it('contains 18 distinct B2 goals with phrases, grammar, scenes, and every locale', () => {
  const goals = CAN_DO_GOALS.filter((goal) => goal.level === 'B2');
  expect(goals.map((goal) => goal.id)).toEqual(B2_GOAL_IDS);
  expect(new Set(goals.flatMap((goal) => goal.phrases)).size).toBeGreaterThanOrEqual(54);
  goals.forEach((goal) => {
    expect(goal.phrases.length).toBeGreaterThanOrEqual(3);
    expect(goal.sceneIds.length).toBeGreaterThan(0);
    MAX_TEXT_LANGS.forEach((lang) => expect(goal.title[lang].trim()).not.toBe(''));
  });
});

it('selects B2 goals for a B2 learner instead of B1', () => {
  expect(pickNextGoal({}, 'B2')?.level).toBe('B2');
});
```

- [ ] **Step 2: Run RED**

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_can_do_goals.test.ts src/max_voice_tutor_memory.test.ts`

- [ ] **Step 3: Author these exact B2 goal IDs and outcomes**

| ID | Can-do outcome | Core phrases |
|---|---|---|
| b2_qualify_claim | qualify a claim without weakening the point | Generally speaking…; That tends to be true when…; I would not go so far as to say… |
| b2_nuanced_opinion | give and defend a nuanced opinion | From my perspective…; The main reason I see it differently is…; There is some truth in that, but… |
| b2_extended_argument | structure a sustained argument | To begin with…; A further consideration is…; Taken together, these points suggest… |
| b2_concession | concede and counter politely | I take your point; Even so…; Granted, …, but… |
| b2_hypothetical | discuss complex hypothetical outcomes | If that were to happen…; Had we known earlier…; Otherwise, we might have… |
| b2_negotiate | negotiate terms and reach a compromise | What if we met halfway?; I could agree to that provided…; That sounds workable. |
| b2_meeting | lead and contribute to a meeting | Shall we move on to…?; Could you clarify what you mean by…?; Let me summarise what we have agreed. |
| b2_presentation | present and handle follow-up questions | I would like to draw your attention to…; This brings me to…; I will come back to that in a moment. |
| b2_interview_advanced | discuss achievements and trade-offs in an interview | A good example would be…; What I learned from that was…; In hindsight, I would… |
| b2_rephrase_clarify | reformulate a complex idea after misunderstanding | Let me put that another way; What I mean is…; To be more precise… |
| b2_resolve_misunderstanding | identify and repair a misunderstanding | I think we may be talking at cross-purposes; That is not quite what I meant; Are we agreed that…? |
| b2_formality_register | switch between neutral and formal register | I was wondering whether…; Would you mind if…?; I appreciate your taking the time. |
| b2_story_nuanced | tell a detailed story with viewpoint and emphasis | What struck me most was…; Little did I know…; Looking back… |
| b2_problem_solution | analyse causes and compare solutions | The issue seems to stem from…; One way around this would be…; The drawback is… |
| b2_news_discussion | discuss reported events without overclaiming | According to the report…; It remains unclear whether…; The wider implication is… |
| b2_collocation | use high-frequency B2 collocations naturally | reach a conclusion; raise a concern; take responsibility |
| b2_phrasal_nuance | use separable and idiomatic phrasal verbs in context | follow up on; rule out; come up with |
| b2_spontaneous_long_turn | sustain a spontaneous two-minute turn | The way I see it…; To give you an example…; That is why I would argue… |

Each entry includes 3–5 phrases, a grammar/discourse focus, at least one existing compatible scene, and nine authored titles. Add prerequisites by array order; no automatic translation by the model.

- [ ] **Step 4: Remove fallback and update progress totals**

`CanDoLevel` becomes `A1 | A2 | B1 | B2`; `pickNextGoal`, `levelFromMastery`, preview totals, receipt schema, and memory parsing retain B2. Progress copy shows goals completed within the current level and never says pronunciation was assessed.

- [ ] **Step 5: Run GREEN and commit**

Run the Step 2 command. Expected: PASS and exactly 18 B2 goals.

Commit only task files with message: `feat(max): add owned b2 speaking curriculum`.

### Task 11: Complete mobile accessibility and device QA contracts

**Files:**
- Modify: `app/max_call_prestart.tsx`
- Modify: `app/max_call_session.tsx`
- Modify: `app/max_voice_review.tsx`
- Modify: `app/max_memory_settings.tsx`
- Create: `docs/qa/MAX_VOICE_DEVICE_MATRIX.md`
- Test: `tests/max_voice_accessibility.test.tsx`

- [ ] **Step 1: Write failing RNTL accessibility tests**

```tsx
it('has one status live region and decorative orb', () => {
  const screen = render(<MaxCallTestHarness />);
  expect(screen.getAllByA11yRole('text').filter((n) => n.props.accessibilityLiveRegion === 'polite')).toHaveLength(1);
  expect(screen.getByTestId('max-call-orb').props.accessible).toBe(false);
});

it('exposes 44pt actions with labels and hints', () => {
  const screen = render(<MaxVoiceReviewTestHarness />);
  const retry = screen.getByRole('button', { name: /повторить/i });
  expect(retry.props.accessibilityHint).toBeTruthy();
  expect(flattenStyle(retry.props.style).minHeight).toBeGreaterThanOrEqual(44);
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --config jest.rntl.config.cjs --runInBand --no-cache tests/max_voice_accessibility.test.tsx`

- [ ] **Step 3: Implement screen-reader, text-size, motion, and focus rules**

Use one polite status owner; captions are not word-by-word live regions. Mark the orb decorative. Label/hint every close, retry, start, end, edit, delete, details, and clear action. Support 200% text without clipped buttons or overlapping cards. Respect Reduce Motion for orb/audio response and Hybrid entrances. On state transitions, move accessibility focus to consent title, terminal error title, or review hero, not to changing captions.

- [ ] **Step 4: Record and execute the device matrix**

`docs/qa/MAX_VOICE_DEVICE_MATRIX.md` contains checkboxes for iPhone SE/standard iPhone/large iPhone and small/standard Android at default + 200% text, VoiceOver, TalkBack, Reduce Motion, headphones/Bluetooth route, background/foreground, app kill during finalization, offline reopen, reconnect recovery/failure, and eight-language smoke checks. Record date, build, device/OS, pass/fail, and issue link for every row; no release sign-off with blank rows.

- [ ] **Step 5: Run GREEN and commit**

Run the Step 2 command. Expected: PASS.

Commit only task files with message: `fix(max): complete accessible voice tutor flow`.

## Milestone E — privacy lifecycle, operations, admin, and Jarvis

### Task 12: Enforce transcript non-retention and account lifecycle cleanup

**Files:**
- Modify: `functions/src/max_voice_finalize.ts`
- Modify: `functions/src/max_voice_session_end.ts`
- Modify: `functions/src/account_delete.ts`
- Modify: `app/privacy_screen.tsx`
- Create: `scripts/guard_max_voice_privacy.mjs`
- Test: `functions/src/max_voice_privacy_contract.test.ts`
- Test: `tests/max_voice_privacy_guard.test.ts`
- Test: `tests/firestore_rules_security.test.ts`

- [ ] **Step 1: Write a failing repository privacy guard**

The guard scans MAX writers, admin, Jarvis, analytics, error logging, and exports. It fails when any server write near a MAX collection contains `history`, `transcript`, `audio`, `utterance`, `userText`, `assistantText`, `memoryFact`, or `conversationSummary`; when `admin/v2/legacy.html` adds transcript/session search; or when Jarvis reads `voice_tutor_memory`/`voice_call_reviews` instead of aggregate ops.

```ts
it('keeps conversation content out of durable and operator surfaces', () => {
  expect(runGuard()).toEqual({ ok: true, violations: [] });
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runInBand --no-cache tests/max_voice_privacy_guard.test.ts`

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_privacy_contract.test.ts`

- [ ] **Step 3: Enforce lifecycle rules**

- client envelope: account-scoped, encrypted-at-rest only if the platform storage abstraction already provides it, hard expiry 24 hours, deletion immediately after receipt;
- server request: no body logging and no request echo in error details;
- audio: never written by Phraseman;
- receipt/memory: durable until item deletion, clear-memory, or account deletion;
- personal receipts: deleted through account deletion queries;
- aggregate ops: anonymous counts only, no identity or content;
- consent revocation: blocks new MAX processing but does not silently destroy existing learner memory;
- privacy policy: accurately states transient transcript processing, durable review/memory, no retained audio/full transcript, and user memory controls.

- [ ] **Step 4: Run GREEN and commit**

Run the Step 2 commands plus `npx jest --runInBand --no-cache tests/firestore_rules_security.test.ts`. Expected: PASS.

Commit only task files with message: `security(max): enforce conversation non-retention`.

### Task 13: Add content-free MAX daily operations and bounded admin diagnostics

**Files:**
- Create: `functions/src/max_voice_ops.ts`
- Create: `functions/src/max_voice_ops_dashboard.ts`
- Modify: `functions/src/max_voice_finalize.ts`
- Modify: `functions/src/max_voice_mint.ts`
- Modify: `functions/src/max_voice_session_end.ts`
- Modify: `functions/src/index.ts`
- Modify: `admin/v2/legacy.html`
- Test: `functions/src/max_voice_ops.test.ts`
- Test: `functions/src/max_voice_ops_dashboard.test.ts`
- Test: `tests/admin_max_voice_ops_contract.test.ts`

- [ ] **Step 1: Write failing aggregate privacy and admin-access tests**

```ts
it('rejects content and identifiers from an ops delta', () => {
  expect(() => sanitizeMaxOpsDelta({ callsStarted: 1, sessionId: 's1' } as never)).toThrow('max_ops_forbidden_key');
  expect(() => sanitizeMaxOpsDelta({ reviewsReady: 1, transcript: 'hello' } as never)).toThrow('max_ops_forbidden_key');
});

it('requires diagnostics.read and accepts only 1, 7, or 30 days', async () => {
  await expect(getDashboard(request({ role: 'moderator' }, { days: 7 }), deps)).rejects.toMatchObject({ code: 'permission-denied' });
  await expect(getDashboard(request({ role: 'owner' }, { days: 90 }), deps)).rejects.toMatchObject({ code: 'invalid-argument' });
});
```

- [ ] **Step 2: Run RED**

Run: `cd functions && npx jest --runInBand --no-cache src/max_voice_ops.test.ts src/max_voice_ops_dashboard.test.ts`

Run: `npx jest --runInBand --no-cache tests/admin_max_voice_ops_contract.test.ts tests/admin_single_surface_contract.test.ts`

- [ ] **Step 3: Implement the exact daily aggregate schema**

```ts
export interface MaxVoiceOpsDailyV1 {
  readonly schemaVersion: 'max-voice-ops-daily.v1';
  readonly dayKey: string;
  readonly mintsRequested: number;
  readonly mintsSucceeded: number;
  readonly mintsFailed: number;
  readonly callsStarted: number;
  readonly callsConnected: number;
  readonly callsCompleted: number;
  readonly callsFailed: number;
  readonly explicitUserEnds: number;
  readonly watchdogEnds: number;
  readonly reconnectAttempts: number;
  readonly reconnectRecovered: number;
  readonly reconnectFailed: number;
  readonly noRemoteAudio: number;
  readonly emptyTranscript: number;
  readonly finalizationQueued: number;
  readonly finalizationRetryable: number;
  readonly finalizationTerminal: number;
  readonly reviewsReady: number;
  readonly reviewsFailed: number;
  readonly finalizationRetries: number;
  readonly memoryUpdatesSucceeded: number;
  readonly memoryUpdatesFailed: number;
  readonly sensitiveMemoryCandidatesRejected: number;
  readonly quotaReservations: number;
  readonly quotaSettlements: number;
  readonly watchdogSettlements: number;
  readonly impossibleSequences: number;
  readonly endReasons: Readonly<Record<'completed' | 'capped' | 'dropped' | 'background' | 'failed', number>>;
  readonly preparationLatencyBuckets: Readonly<Record<'lt1s' | '1to3s' | '3to8s' | 'gte8s', number>>;
  readonly firstAudioLatencyBuckets: Readonly<Record<'lt1s' | '1to3s' | '3to8s' | 'gte8s', number>>;
  readonly responseLatencyBuckets: Readonly<Record<'lt500ms' | '500msto1s' | '1to3s' | 'gte3s', number>>;
  readonly finalizeLatencyBuckets: Readonly<Record<'lt5s' | '5to15s' | '15to60s' | 'gte60s', number>>;
  readonly reconnectRecoveryBuckets: Readonly<Record<'lt2s' | '2to5s' | '5to15s' | 'gte15s', number>>;
  readonly callDurationBuckets: Readonly<Record<'lt1m' | '1to3m' | '3to10m' | 'gte10m', number>>;
  readonly localeCounts: Readonly<Record<'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', number>>;
  readonly levelCounts: Readonly<Record<'A1' | 'A2' | 'B1' | 'B2', number>>;
  readonly providerUsage: {
    readonly audioInputTokens: number;
    readonly audioOutputTokens: number;
    readonly cachedTokens: number;
    readonly textTokens: number;
    readonly estimatedCostMicros: number;
  };
  readonly updatedAtMs: number;
}
```

Only trusted server lifecycle points increment counters. Each in-process event uses schema `max-voice-ops-event.v1`, a bounded stage enum, numeric durations/usage, locale, level, and end category. In the same transaction, the existing server-owned session/quota record changes its stage marker from absent to recorded and the daily aggregate increments once; no new per-event operations collection is created. Invalid stage transitions increment `impossibleSequences` without accepting their requested counters. Finalization retries cannot double-count terminal outcomes. The aggregate document itself contains no session ID or event key. The dashboard reads at most 30 daily documents and suppresses locale/level cells smaller than 5 as `—`; it does not expose drill-down or cross-filter combinations. `estimatedCostMicros` is derived from the existing server-owned provider cost configuration, never from purchases or user billing.

- [ ] **Step 4: Add the single admin surface**

Read `docs/design/ADMIN_UI_BIBLE.md` again immediately before editing. Modify only `admin/v2/legacy.html`. Add `max-ops` to the System/Diagnostics navigation, `SECTION_META`, access configuration, and lazy tab loader. The page contains:

- range selector 1/7/30 days and one `Обновить` button;
- text-plus-color health status derived from sample-gated reliability thresholds;
- four large KPIs: calls, connection success, review success, reconnect recovery;
- two simple trend charts: starts/completions/failures and ready/failed reviews;
- preparation, first-audio, response, finalization, reconnect, and duration distributions;
- finalization queue/retry/terminal and memory-write health;
- quota reservation/settlement/watchdog health plus aggregated provider usage/cost;
- suppressed locale/level distributions;
- last aggregate timestamp and an explicit `Source: server daily MAX aggregates` label;
- explicit loading, empty, partial, stale, access-denied, and error states.

No UID/name/session search, no transcript viewer, no free text, no conversation summaries, no polling, no realtime listener, no emoji icon, no card-inside-card, and no new admin file.

The callable requires `diagnostics.read` and appends one content-free `admin_log` row per successful load: `{ action: 'max_ops_read', actorUid, days, createdAtMs }`. It never records returned metrics, filters beyond `days`, or any learner/session identity.

- [ ] **Step 5: Run GREEN and responsive contract checks**

Run the Step 2 commands. Expected: PASS.

Manually render at 375, 768, 1024, and 1440 CSS pixels; keyboard-tab every control; verify visible focus and no horizontal overflow.

Commit only task files with message: `feat(max): add privacy-safe operations dashboard`.

### Task 14: Register MAX operational data in Firestore, deletion, and Jarvis contracts

**Files:**
- Create: `functions/src/jarvis/maxvoice_firestore_fetcher.ts`
- Create: `functions/src/jarvis/maxvoice_department.ts`
- Create: `functions/src/jarvis/maxvoice_snapshot.ts`
- Modify: `functions/src/jarvis/decision.ts`
- Modify: `functions/src/jarvis/index.ts`
- Modify: `functions/src/jarvis/all_departments_snapshot.ts`
- Modify: `functions/src/jarvis/all_departments_callables.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Modify: `admin/v2/legacy.html`
- Modify: `firestore.rules`
- Test: `functions/src/jarvis/maxvoice_firestore_fetcher.test.ts`
- Test: `functions/src/jarvis/maxvoice_department.test.ts`
- Test: `functions/src/jarvis/maxvoice_snapshot.test.ts`
- Test: `functions/src/jarvis/all_departments_snapshot.test.ts`
- Test: `tests/firestore_rules_security.test.ts`

- [ ] **Step 1: Write failing rules and Jarvis contract tests**

```ts
it('denies direct client reads and writes to MAX server-owned collections', async () => {
  await assertFails(userDb.doc('voice_call_reviews/session-1').get());
  await assertFails(userDb.doc('max_voice_ops_daily/2026-08-21').get());
  await assertFails(userDb.doc('voice_tutor_memory/hash').set({ preferredName: 'x' }));
});

it('adds MAX reliability to every department snapshot', async () => {
  const result = await buildAllDepartmentsSnapshot(input({ runMaxvoice }));
  expect(runMaxvoice).toHaveBeenCalledTimes(1);
  expect(result.departmentErrors).not.toContain('maxvoice');
});
```

- [ ] **Step 2: Run RED**

Run: `cd functions && npx jest --runInBand --no-cache src/jarvis/maxvoice_firestore_fetcher.test.ts src/jarvis/maxvoice_department.test.ts src/jarvis/maxvoice_snapshot.test.ts src/jarvis/all_departments_snapshot.test.ts src/jarvis/jarvis_data_contract_guard.test.ts`

Run: `npx jest --runInBand --no-cache tests/firestore_rules_security.test.ts`

- [ ] **Step 3: Deny direct collection access**

Add explicit `allow read, write: if false;` matches for `voice_call_reviews`, `voice_tutor_memory`, and `max_voice_ops_daily`. User access to memory/review is callable-only so sanitization and identity resolution cannot be bypassed.

- [ ] **Step 4: Add a deterministic MAX reliability department**

Add department union member `maxvoice`. Its fetcher reads only the last 7 bounded `max_voice_ops_daily` documents. Findings use sample-size gates and deterministic thresholds:

- connection success below 90% with at least 20 starts → high finding;
- ready reviews below 95% with at least 20 completed calls → high finding;
- reconnect recovery below 70% with at least 10 attempts → medium finding;
- `gte8s` first-audio share above 10% with at least 20 connections → medium finding;
- insufficient samples → evidence-only, never a fabricated healthy verdict.

Wire `runMaxvoice` into `BuildAllDepartmentsSnapshotInput`, `DEPARTMENT_RUNNERS`, callables, index exports, and tests. Add `maxvoice: { title: 'MAX', accentRgb: '52,211,153' }` to `JF_DEPARTMENT_META` in `admin/v2/legacy.html`.

- [ ] **Step 5: Update the data-contract guard**

Register `max_voice_ops_daily` with writer `max_voice_ops.ts`, reader `jarvis/maxvoice_firestore_fetcher.ts`, and contract fields `callsStarted`, `callsConnected`, `callsCompleted`, `reviewsReady`, `reconnectAttempts`, `reconnectRecovered`, and `firstAudioLatencyBuckets`. Register `voice_call_reviews` and `voice_tutor_memory` as intentionally unread personal learner data, never Jarvis sources.

- [ ] **Step 6: Run GREEN and commit**

Run the Step 2 commands. Expected: PASS.

Commit only task files with message: `feat(max): add privacy-safe Jarvis reliability checks`.

## Milestone F — build repair and release verification

### Task 15: Repair the full Functions build without weakening unrelated contracts

**Files:**
- Modify: `functions/tsconfig.json`
- Modify: `modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts`
- Modify: `modules/learning-v2/content/source/session_shard_from_source_v1.ts`
- Verify: `modules/learning-v2/content/source/approved_first_ten_candidate_v2.json`
- Test: existing Learning V2 session/source tests named below

- [ ] **Step 1: Capture a fresh baseline build**

Run: `cd functions && npm run build > ../.codex-tmp/max-release-functions-build.log 2>&1`

Expected before repair: nonzero with the recorded baseline diagnostics for the JSON import, ES2020 `replaceAll`, and optional localized strings. Read the exact diagnostics from the log; do not restore, regenerate, or overwrite Learning V2 work from Git history.

- [ ] **Step 2: Make the approved JSON source part of the Functions compilation**

Keep `modules/learning-v2/content/source/approved_first_ten_candidate_v2.json` in its current canonical location. Add the compiler option rather than duplicating the 3.3 MB source:

```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

Preserve every existing `functions/tsconfig.json` option; add only `resolveJsonModule`. Run `cd functions && npx tsc --noEmit` and confirm the JSON diagnostic disappears without adding a second JSON file.

- [ ] **Step 3: Fix the ES2020 and optional-localization diagnostics**

- replace `value.replaceAll('на занятии', 'в классе')` with `value.split('на занятии').join('в классе')`, and the Ukrainian equivalent, to match the configured JS target;
- in `completeAuthoredIntroRuns`, compute `const expandedBody = expandLocalized(page.body)` and a typed three-item tuple of `expandLocalized(page.question.choices[n])`; read `body`, `correctChoice`, and `choices` from those complete records instead of indexing the optional `LocalizedSource` directly;
- return the `Object.fromEntries` locale map through the already intentional boundary cast `as unknown as LearningV2IntroRunsByLocaleV1`, matching `expandLocalizedIntroRuns`; do not loosen `LocalizedSource` optional fields or invent untranslated copy;
- keep `approved_first_ten_candidate_v2.json` at its existing source path; do not create a duplicate under `functions/src`.

Replace `completeAuthoredIntroRuns` with this complete implementation:

```ts
function completeAuthoredIntroRuns(
  page: SessionSourceIntroPage,
  phrases: readonly EpisodeSourcePhrase[],
): LearningV2IntroRunsByLocaleV1 | undefined {
  if (!page.bodyRuns) return undefined;
  const authored = expandLocalizedIntroRuns(page.bodyRuns);
  const expandedBody = expandLocalized(page.body);
  const expandedChoices = [
    expandLocalized(page.question.choices[0]),
    expandLocalized(page.question.choices[1]),
    expandLocalized(page.question.choices[2]),
  ] as const;
  return Object.fromEntries(LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
    const body = expandedBody[locale];
    const semantics = new Map<string, LearningV2IntroTextRunV1['semantic']>();
    for (const run of authored[locale]) {
      if (run.semantic !== 'explanation' && run.semantic !== 'nativeGloss') {
        semantics.set(run.text, run.semantic);
      }
    }
    const correctChoice = expandedChoices[page.question.correctChoiceIndex][locale];
    const choices = expandedChoices.map((choice) => choice[locale]);
    const authoredExamples = [...phrases.map((phrase) => phrase.english), ...choices];
    for (const example of authoredExamples) {
      if (example.length < 4 || !/[\s?!.'’]/u.test(example)) continue;
      semantics.set(
        example,
        example === correctChoice || phrases.some((phrase) => phrase.english === example)
          ? 'targetCorrect'
          : 'targetWrong',
      );
    }
    const terms = [...semantics.keys()]
      .filter(Boolean)
      .sort((left, right) => right.length - left.length || left.localeCompare(right));
    const runs: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    while (cursor < body.length) {
      const term = terms.find(
        (candidate) => body.startsWith(candidate, cursor) && introTermBoundary(body, cursor, candidate),
      );
      if (term) {
        runs.push({ text: term, semantic: semantics.get(term) ?? 'explanation' });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < body.length && !terms.some(
        (candidate) => body.startsWith(candidate, end) && introTermBoundary(body, end, candidate),
      )) end += 1;
      runs.push({ text: body.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LearningV2IntroRunsByLocaleV1;
}
```

Run:

`npx jest --runInBand --no-cache tests/learning_v2_episode_01_session_11_source.test.ts tests/learning_v2_episode_01_session_16_source.test.ts tests/learning_v2_approved_first_ten_source.test.ts tests/learning_v2_generator_session_contract.test.ts`

Expected: PASS. Then run `cd functions && npx tsc --noEmit`; expected exit 0.

- [ ] **Step 4: Re-run the complete Functions build**

Run: `cd functions && npm run build > ../.codex-tmp/max-release-functions-build.log 2>&1`

Expected: exit 0, including support context, clean runtime, TypeScript, generated asset copy, and runtime parity gate.

- [ ] **Step 5: Commit only necessary build repairs**

Use `git diff -- <exact compiler-owned files>` first. Commit only actual repairs with message: `fix(build): restore functions release gate`. If another active task has already resolved a diagnostic, make no edit for it.

### Task 16: Run release gates and produce an evidence-backed sign-off

**Files:**
- Create: `docs/qa/MAX_VOICE_RELEASE_EVIDENCE_2026-08-21.md`
- Verify all files changed in Tasks 1–15

- [ ] **Step 1: Run focused client logic suites**

```powershell
npx jest --runInBand --no-cache `
  tests/max_voice_consent.test.ts `
  tests/max_voice_finalize_outbox.test.ts `
  tests/max_voice_finalize_client.test.ts `
  tests/max_call_ui_state.test.ts `
  tests/max_call_reconnect.test.ts `
  tests/max_call_live_caption.test.ts `
  tests/max_call_audio_level.test.ts `
  tests/max_call_orb_visual_contract.test.ts `
  tests/max_voice_review_projection.test.ts `
  tests/max_voice_privacy_guard.test.ts `
  tests/firestore_rules_security.test.ts
```

Expected: all PASS, zero open handles.

- [ ] **Step 2: Run focused RNTL suites**

Run: `npx jest --config jest.rntl.config.cjs --runInBand --no-cache tests/max_memory_settings.test.tsx tests/max_voice_accessibility.test.tsx tests/max_call_live_caption_view.test.ts`

Expected: all PASS.

- [ ] **Step 3: Run focused server suites**

```powershell
Push-Location functions
npx jest --runInBand --no-cache `
  src/max_voice_finalize.test.ts `
  src/max_voice_tutor_memory.test.ts `
  src/max_voice_prompt.test.ts `
  src/max_voice_memory_controls.test.ts `
  src/max_voice_can_do_goals.test.ts `
  src/max_voice_tutor_preview.test.ts `
  src/max_voice_ops.test.ts `
  src/max_voice_ops_dashboard.test.ts `
  src/max_voice_privacy_contract.test.ts `
  src/jarvis/maxvoice_firestore_fetcher.test.ts `
  src/jarvis/maxvoice_department.test.ts `
  src/jarvis/all_departments_snapshot.test.ts `
  src/jarvis/jarvis_data_contract_guard.test.ts `
  src/account_delete.test.ts
Pop-Location
```

Expected: all PASS.

- [ ] **Step 4: Run static privacy, admin, and build gates**

Run: `node scripts/guard_max_voice_privacy.mjs`

Run: `npx jest --runInBand --no-cache tests/admin_max_voice_ops_contract.test.ts tests/admin_single_surface_contract.test.ts`

Run: `cd functions && npm run build`

Expected: all exit 0. The privacy guard reports zero conversation-content sinks.

- [ ] **Step 5: Complete device evidence**

Execute every row of `docs/qa/MAX_VOICE_DEVICE_MATRIX.md`, including kill/reopen during finalization, offline recovery, immediate reconnect state, MAX audible output, remote-audio orb response, Bluetooth route, VoiceOver/TalkBack, 200% text, Reduce Motion, and all eight UI languages.

- [ ] **Step 6: Write the release evidence document**

Record every command, exit code, test counts, build log path, device/OS result, remaining known limitation, and privacy assertion. The sign-off must explicitly state:

- no raw audio retained;
- no full transcript retained after finalization;
- no conversation content in admin/Jarvis/analytics/logs;
- review survives app kill/reopen;
- memory is viewable/editable/deletable/clearable;
- reconnect and terminal failure are truthful;
- pronunciation is not claimed or assessed;
- purchases were not modified.

- [ ] **Step 7: Final diff audit and commit evidence**

Run: `git diff --check`

Run: `git status --short`

Inspect every MAX/admin/Jarvis/rules diff for unrelated deletion. Commit only the evidence file after all gates pass: `git commit --only docs/qa/MAX_VOICE_RELEASE_EVIDENCE_2026-08-21.md -m "docs(max): record release verification evidence"`.

## Definition of done

- Consent precedes personalized preparation, mint, microphone, and provider processing.
- The goal screen can absorb preparation time; pressing Start after ready begins immediately.
- Call completion writes a recoverable envelope before navigation.
- Server finalization is ownership-checked and idempotent; retry cannot duplicate memory/progress.
- Review survives backgrounding, process death, offline reopen, and return from correction practice.
- No raw audio or full transcript is retained after finalization.
- MAX memory creates continuity, rejects sensitive facts, and is fully user-manageable.
- One context strip owns mode/topic/goal and never remains stale.
- Visible state reflects the real audio/transport owner.
- Captions track remote audio in stable chunks; orb appearance is unchanged.
- Review is concise, tomorrow has at most three actions, and the target phrase is explicit.
- All eight interface languages are complete; B2 has owned content and no B1 fallback.
- VoiceOver, TalkBack, 200% text, Reduce Motion, and device route tests pass.
- Admin/Jarvis expose only bounded, suppressed operational aggregates.
- Firestore rules, account deletion, Jarvis contracts, and full Functions build pass.
- No purchase, paywall, RevenueCat, pricing, or entitlement file changed.
