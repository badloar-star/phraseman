import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import {
  clearMaxVoiceReviewReceipts,
  drainOneMaxFinalize,
  readLastMaxVoiceReviewReceipt,
  readMaxVoiceReviewReceipt,
  type MaxVoiceFinalizeClientDependencies,
} from '../app/max_voice_finalize_client';
import {
  listPendingMaxFinalize,
  putMaxFinalizeEnvelope,
} from '../app/max_voice_finalize_outbox';
import type {
  MaxVoiceFinalizeDraftV1,
  MaxVoiceReviewReceiptV1,
} from '../app/max_voice_finalize_types';

const draft: MaxVoiceFinalizeDraftV1 = {
  version: 1,
  sessionId: 'session-1',
  request: {
    history: [{ role: 'user', text: 'I went to the park.' }],
    durationSec: 30,
    speechSec: 8,
    format: 'tutor',
    cefr: 'A1',
    interfaceLang: 'ru',
    endReason: 'completed',
    phraseResults: [],
    tutorEvidence: { homeworkItems: [], safetyFlags: [] },
  },
};

const receipt: MaxVoiceReviewReceiptV1 = {
  schemaVersion: 'max-voice-review.v1',
  sessionId: 'session-1',
  stableUid: 'account-A',
  completedAtMs: 2_000,
  durationSec: 30,
  endReason: 'completed',
  status: 'ready',
  worked: ['Ты поддержал разговор.'],
  correction: null,
  tomorrowActions: ['Повтори одну фразу.'],
  targetPhrase: null,
  nextTopic: null,
  goal: null,
  phraseEvidence: [],
};

describe('MAX finalization client', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('deletes the transcript envelope only after persisting a validated receipt', async () => {
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);
    const call = jest.fn(async () => receipt);
    const deps: MaxVoiceFinalizeClientDependencies = { call, nowMs: () => 2_000 };

    await expect(drainOneMaxFinalize('account-A', 'session-1', deps)).resolves.toEqual({
      status: 'ready',
      receipt,
    });
    expect(call).toHaveBeenCalledWith({ version: 1, sessionId: 'session-1', request: draft.request });
    expect(await listPendingMaxFinalize('account-A', 2_001)).toEqual([]);
    expect(await readLastMaxVoiceReviewReceipt('account-A')).toEqual(receipt);
    expect(await readMaxVoiceReviewReceipt('account-A', 'session-1')).toEqual(receipt);
    expect(await readMaxVoiceReviewReceipt('account-A', 'another-session')).toBeNull();
  });

  it('clears both latest and per-session receipt caches for an account transition', async () => {
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);
    await drainOneMaxFinalize('account-A', 'session-1', { call: async () => receipt, nowMs: () => 2_000 });
    expect(await readMaxVoiceReviewReceipt('account-A', 'session-1')).toEqual(receipt);

    await clearMaxVoiceReviewReceipts('account-A');

    expect(await readLastMaxVoiceReviewReceipt('account-A')).toBeNull();
    expect(await readMaxVoiceReviewReceipt('account-A', 'session-1')).toBeNull();
  });

  it('keeps the envelope and honors a bounded server processing delay', async () => {
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);
    const deps: MaxVoiceFinalizeClientDependencies = {
      call: async () => ({ status: 'processing', retryAfterMs: 15_000 }),
      nowMs: () => 2_000,
    };

    await expect(drainOneMaxFinalize('account-A', 'session-1', deps)).resolves.toEqual({
      status: 'retry_scheduled',
      retryAtMs: 17_000,
    });
    expect(await listPendingMaxFinalize('account-A', 2_001)).toEqual([
      expect.objectContaining({ attempts: 1, nextAttemptAtMs: 17_000 }),
    ]);
  });

  it.each([
    ['functions/unavailable', 2_000],
    ['deadline-exceeded', 2_000],
    ['internal', 2_000],
  ])('retries transient %s failures without deleting private pending data', async (code, delayMs) => {
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);
    const deps: MaxVoiceFinalizeClientDependencies = {
      call: async () => { throw Object.assign(new Error(code), { code }); },
      nowMs: () => 2_000,
    };

    await expect(drainOneMaxFinalize('account-A', 'session-1', deps)).resolves.toEqual({
      status: 'retry_scheduled',
      retryAtMs: 2_000 + delayMs,
    });
    expect(await listPendingMaxFinalize('account-A', 2_001)).toHaveLength(1);
  });

  it('does not retry ownership or validation failures and purges the transcript', async () => {
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);
    const deps: MaxVoiceFinalizeClientDependencies = {
      call: async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); },
      nowMs: () => 2_000,
    };

    await expect(drainOneMaxFinalize('account-A', 'session-1', deps)).resolves.toEqual({
      status: 'terminal',
      code: 'permission-denied',
    });
    expect(await listPendingMaxFinalize('account-A', 2_001)).toEqual([]);
  });

  it('keeps the envelope when a malformed success response cannot be validated', async () => {
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);
    const deps: MaxVoiceFinalizeClientDependencies = {
      call: async () => ({ ok: true, history: draft.request.history }),
      nowMs: () => 2_000,
    };

    await expect(drainOneMaxFinalize('account-A', 'session-1', deps)).resolves.toEqual({
      status: 'retry_scheduled',
      retryAtMs: 4_000,
    });
    expect(await listPendingMaxFinalize('account-A', 2_001)).toHaveLength(1);
  });

  it('drains once after a call and at most once per boot or foreground activation', () => {
    const root = process.cwd();
    const session = fs.readFileSync(path.join(root, 'app', 'max_call_session.tsx'), 'utf8');
    const boot = fs.readFileSync(path.join(root, 'app', 'max_voice_finalize_boot.ts'), 'utf8');
    const layout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');

    expect(session).toContain('void drainOneMaxFinalize(accountKey, sessionId)');
    expect(boot).toContain("AppState.addEventListener('change'");
    expect(boot).toContain("state !== 'active'");
    expect(boot).toContain('if (drainInFlight) return drainInFlight');
    expect(layout).toContain('installMaxVoiceFinalizeBootDrain()');
  });
});
