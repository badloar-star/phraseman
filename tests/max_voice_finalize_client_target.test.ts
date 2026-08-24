jest.mock('../app/max_call_mint_request', () => ({
  maxVoiceCallable: () => async () => { throw new Error('unexpected_default_callable'); },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  drainOneMaxFinalize,
  readMaxVoiceReviewReceipt,
} from '../app/max_voice_finalize_client';
import {
  listPendingMaxFinalize,
  putMaxFinalizeEnvelope,
} from '../app/max_voice_finalize_outbox';
import type {
  MaxVoiceFinalizeDraftV1,
  MaxVoiceReviewReceiptV1,
} from '../app/max_voice_finalize_types';

describe('MAX review target survives commit/retry read path', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads Spanish from the durable server receipt after deleting the outbox envelope', async () => {
    const draft: MaxVoiceFinalizeDraftV1 = {
      version: 1,
      sessionId: 'session-spanish',
      request: {
        history: [{ role: 'user', text: 'Estoy bien.' }],
        durationSec: 30,
        speechSec: 8,
        format: 'tutor',
        cefr: 'A1',
        interfaceLang: 'ru',
        studyTarget: 'es',
        endReason: 'completed',
        phraseResults: [],
        tutorEvidence: { homeworkItems: [], safetyFlags: [] },
      },
    };
    const receipt: MaxVoiceReviewReceiptV1 = {
      schemaVersion: 'max-voice-review.v1',
      sessionId: draft.sessionId,
      stableUid: 'account-A',
      studyTarget: 'es',
      completedAtMs: 2_000,
      durationSec: 30,
      endReason: 'completed',
      status: 'ready',
      worked: ['Ты ответил по-испански.'],
      correction: null,
      tomorrowActions: ['Повтори Estoy bien.'],
      targetPhrase: 'Estoy bien.',
      nextTopic: null,
      goal: null,
      phraseEvidence: [],
    };
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);

    await expect(drainOneMaxFinalize('account-A', draft.sessionId, {
      call: async () => receipt,
      nowMs: () => 2_000,
    })).resolves.toEqual({ status: 'ready', receipt });

    expect(await listPendingMaxFinalize('account-A', 2_001)).toEqual([]);
    expect(await readMaxVoiceReviewReceipt('account-A', draft.sessionId))
      .toEqual(expect.objectContaining({ studyTarget: 'es' }));
  });

  it('keeps a legacy receipt without studyTarget valid and English-compatible', async () => {
    const legacy = {
      schemaVersion: 'max-voice-review.v1',
      sessionId: 'legacy-session',
      stableUid: 'account-A',
      completedAtMs: 2_000,
      durationSec: 30,
      endReason: 'completed',
      status: 'ready',
      worked: [],
      correction: null,
      tomorrowActions: ['Review one phrase.'],
      targetPhrase: null,
      nextTopic: null,
      goal: null,
      phraseEvidence: [],
    } as const;
    const draft: MaxVoiceFinalizeDraftV1 = {
      version: 1,
      sessionId: legacy.sessionId,
      request: {
        history: [], durationSec: 30, speechSec: 0, format: 'tutor', cefr: 'A1',
        interfaceLang: 'ru', endReason: 'completed', phraseResults: [],
        tutorEvidence: { homeworkItems: [], safetyFlags: [] },
      },
    };
    await putMaxFinalizeEnvelope('account-A', draft, 1_000);
    await drainOneMaxFinalize('account-A', draft.sessionId, { call: async () => legacy, nowMs: () => 2_000 });

    expect(await readMaxVoiceReviewReceipt('account-A', draft.sessionId))
      .toEqual(expect.not.objectContaining({ studyTarget: expect.anything() }));
  });
});
