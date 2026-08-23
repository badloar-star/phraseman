import {
  finalizeMaxVoiceRequest,
  type MaxVoiceFinalizeCoreInput,
  type MaxVoiceFinalizeDependencies,
  type MaxVoiceFinalizeLeaseResult,
} from './max_voice_finalize';
import type { MaxVoiceReviewReceiptV1 } from './max_voice_review_receipt';

function input(sessionId: string): MaxVoiceFinalizeCoreInput {
  return {
    authUid: 'auth-owner',
    stableUid: 'stable-owner',
    data: {
      version: 1,
      sessionId,
      request: {
        history: [
          { role: 'assistant', text: 'Tell me about your weekend.' },
          { role: 'user', text: 'I go to the park yesterday.' },
        ],
        durationSec: 64,
        speechSec: 18,
        format: 'tutor',
        cefr: 'A2',
        interfaceLang: 'ru',
        endReason: 'completed',
        goalId: 'past-events',
        phraseResults: [{ text: 'I went to the park yesterday.', result: 'needs_work' }],
        tutorEvidence: {
          nextTopic: 'Past weekend',
          homeworkItems: [{ text: 'I went to the park yesterday.', meaning: 'Я ходил в парк вчера.' }],
          safetyFlags: [],
        },
      },
    },
  };
}

function harness(options: { foreign?: boolean; processing?: boolean } = {}) {
  const writes: unknown[] = [];
  const memoryUpdates: unknown[] = [];
  const ready = new Map<string, MaxVoiceReviewReceiptV1>();
  const review = jest.fn<
    ReturnType<MaxVoiceFinalizeDependencies['review']>,
    Parameters<MaxVoiceFinalizeDependencies['review']>
  >(async (_input) => ({
    worked: ['Ты поддержал разговор и ответил полным предложением.'],
    correction: {
      said: 'I go to the park yesterday.',
      target: 'I went to the park yesterday.',
      explanation: 'Для завершённого события нужен past simple.',
    },
    tomorrowActions: ['Скажи целевую фразу три раза.', 'Расскажи о другом прошедшем дне.'],
    targetPhrase: 'I went to the park yesterday.',
    nextTopic: 'Past weekend',
    memory: {
      facts: ['Likes walking in parks'],
      recurringErrors: ['Past tense of irregular verbs'],
      resolvedErrors: [],
    },
  }));
  const reviewSafety = jest.fn<
    ReturnType<MaxVoiceFinalizeDependencies['reviewSafety']>,
    Parameters<MaxVoiceFinalizeDependencies['reviewSafety']>
  >(async () => undefined);
  const deps: MaxVoiceFinalizeDependencies = {
    nowMs: () => 10_000,
    verifySessionOwner: async ({ sessionId, stableUid }) => {
      if (options.foreign || stableUid !== 'stable-owner' || sessionId === 'foreign-session') {
        throw Object.assign(new Error('session_owner_mismatch'), { code: 'permission-denied' });
      }
      return { durationSec: 61 };
    },
    claimLease: async ({ sessionId, stableUid, leaseToken, leaseUntilMs }): Promise<MaxVoiceFinalizeLeaseResult> => {
      const existing = ready.get(sessionId);
      if (existing) return { kind: 'ready', receipt: existing };
      if (options.processing) return { kind: 'processing', retryAfterMs: 30_000 };
      writes.push({ status: 'processing', sessionId, stableUid, leaseToken, leaseUntilMs });
      return { kind: 'claimed', leaseToken };
    },
    review,
    reviewSafety,
    commitReady: async ({ receipt, memoryProjection, memoryUpdate }) => {
      const existing = ready.get(receipt.sessionId);
      if (existing) return existing;
      ready.set(receipt.sessionId, receipt);
      writes.push({ ...receipt, memoryProjection });
      memoryUpdates.push(memoryUpdate);
      return receipt;
    },
  };
  return { deps, review, reviewSafety, writes, memoryUpdates };
}

describe('MAX durable finalizer', () => {
  it('returns the same completed receipt on retry without reviewing twice', async () => {
    const h = harness();
    const first = await finalizeMaxVoiceRequest(input('session-1'), h.deps);
    const second = await finalizeMaxVoiceRequest(input('session-1'), h.deps);

    expect(second).toEqual(first);
    expect(h.review).toHaveBeenCalledTimes(1);
    expect(first).toEqual(expect.objectContaining({
      schemaVersion: 'max-voice-review.v1',
      sessionId: 'session-1',
      stableUid: 'stable-owner',
      durationSec: 61,
      status: 'ready',
    }));
  });

  it('never writes transcript or audio fields to Firestore projections', async () => {
    const h = harness();
    await finalizeMaxVoiceRequest(input('session-1'), h.deps);

    expect(JSON.stringify(h.writes)).not.toMatch(/history|transcript|audio|utterance|userText|assistantText/i);
  });

  it('rejects a session owned by another stable identity', async () => {
    const h = harness({ foreign: true });
    await expect(finalizeMaxVoiceRequest(input('foreign-session'), h.deps))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(h.review).not.toHaveBeenCalled();
  });

  it('returns a bounded processing response while another live lease exists', async () => {
    const h = harness({ processing: true });
    await expect(finalizeMaxVoiceRequest(input('session-1'), h.deps)).resolves.toEqual({
      status: 'processing',
      retryAfterMs: 30_000,
    });
    expect(h.review).not.toHaveBeenCalled();
  });

  it('runs the post-call safety review once per attempt, even when the AI review fails', async () => {
    const h = harness();
    h.review.mockRejectedValueOnce(Object.assign(new Error('review down'), { code: 'unavailable' }));
    await expect(finalizeMaxVoiceRequest(input('session-safety'), h.deps)).rejects.toMatchObject({ code: 'unavailable' });
    // Safety обязан отработать параллельно, несмотря на падение разбора.
    expect(h.reviewSafety).toHaveBeenCalledTimes(1);
    expect(h.reviewSafety.mock.calls[0][0]).toMatchObject({
      sessionId: 'session-safety',
      authUid: 'auth-owner',
      stableUid: 'stable-owner',
    });

    await finalizeMaxVoiceRequest(input('session-safety'), h.deps);
    expect(h.reviewSafety).toHaveBeenCalledTimes(2);
    // Уже готовый чек не перезапускает ни разбор, ни safety.
    await finalizeMaxVoiceRequest(input('session-safety'), h.deps);
    expect(h.reviewSafety).toHaveBeenCalledTimes(2);
  });

  it('a safety failure never breaks finalization', async () => {
    const h = harness();
    h.reviewSafety.mockRejectedValueOnce(new Error('telegram down'));
    const receipt = await finalizeMaxVoiceRequest(input('session-safety-broken'), h.deps);
    expect(receipt).toEqual(expect.objectContaining({ status: 'ready' }));
  });

  it('forwards tutor safety flags to the safety review', async () => {
    const h = harness();
    const payload = input('session-flags');
    const request = (payload.data as { request: { tutorEvidence: { safetyFlags: unknown[] } } }).request;
    request.tutorEvidence.safetyFlags = [{ kind: 'harassment', note: 'insulted the tutor twice' }];
    await finalizeMaxVoiceRequest(payload, h.deps);
    expect(h.reviewSafety.mock.calls[0][0].request.tutorEvidence.safetyFlags).toEqual([
      { kind: 'harassment', note: 'insulted the tutor twice' },
    ]);
  });

  it('passes goal progress and scene outcome through to the memory update', async () => {
    const h = harness();
    const payload = input('session-goal');
    const request = (payload.data as { request: Record<string, unknown> }).request;
    request.goalProgress = { goalId: 'a1_greet', mastery: 2 };
    request.sceneOutcome = 'done';
    await finalizeMaxVoiceRequest(payload, h.deps);
    expect(h.memoryUpdates[0]).toMatchObject({
      goalId: 'past-events',
      goalProgress: { goalId: 'a1_greet', mastery: 2 },
      sceneOutcome: 'done',
    });
  });

  it('carries tutor discipline telemetry flags into the memory update', async () => {
    const h = harness();
    const payload = input('session-telemetry');
    const request = (payload.data as { request: { tutorEvidence: Record<string, unknown> } }).request;
    request.tutorEvidence.endedByTutor = true;
    request.tutorEvidence.safetyFlags = [{ kind: 'harassment', note: 'rude twice' }];
    await finalizeMaxVoiceRequest(payload, h.deps);
    expect(h.memoryUpdates[0]).toMatchObject({ endedByTutor: true, tutorSafetyFlagged: true });

    const plain = await finalizeMaxVoiceRequest(input('session-telemetry-2'), h.deps);
    expect(plain).toEqual(expect.objectContaining({ status: 'ready' }));
    expect(h.memoryUpdates[1]).toMatchObject({ endedByTutor: false, tutorSafetyFlagged: false });

    const bad = input('session-telemetry-3');
    (bad.data as { request: { tutorEvidence: Record<string, unknown> } }).request.tutorEvidence.endedByTutor = 'yes';
    await expect(finalizeMaxVoiceRequest(bad, h.deps)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rejects malformed goal progress and scene outcome', async () => {
    const h = harness();
    const badMastery = input('session-bad-goal');
    (badMastery.data as { request: Record<string, unknown> }).request.goalProgress = { goalId: 'a1_greet', mastery: 7 };
    await expect(finalizeMaxVoiceRequest(badMastery, h.deps)).rejects.toMatchObject({ code: 'invalid-argument' });

    const badOutcome = input('session-bad-outcome');
    (badOutcome.data as { request: Record<string, unknown> }).request.sceneOutcome = 'victory';
    await expect(finalizeMaxVoiceRequest(badOutcome, h.deps)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(h.review).not.toHaveBeenCalled();
    expect(h.reviewSafety).not.toHaveBeenCalled();
  });

  it('removes unsupported pronunciation claims and caps every public list', async () => {
    const h = harness();
    h.review.mockResolvedValueOnce({
      worked: ['Good answer', 'Clear idea', 'Kept going', 'extra'],
      correction: {
        said: 'word',
        target: 'word',
        explanation: 'Your accent and phoneme score were weak.',
      },
      tomorrowActions: ['one', 'two', 'three', 'four'],
      pronunciationScore: 42,
      targetPhrase: 'x'.repeat(400),
    });

    const receipt = await finalizeMaxVoiceRequest(input('session-2'), h.deps);
    expect(receipt).toEqual(expect.objectContaining({ status: 'ready' }));
    if ('status' in receipt && receipt.status !== 'processing') {
      expect(receipt.worked).toHaveLength(3);
      expect(receipt.correction).toBeNull();
      expect(receipt.tomorrowActions).toEqual(['one', 'two', 'three']);
      expect(receipt.targetPhrase).toHaveLength(240);
      expect(receipt).not.toHaveProperty('pronunciationScore');
    }
  });
});
