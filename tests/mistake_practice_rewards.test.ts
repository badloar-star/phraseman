import {
  buildMistakeCorrectionRewardKey,
  flushPendingMistakeCorrectionRewards,
  settleMistakePracticeCompletionReward,
  shouldRewardMistakeCorrection,
  settleMistakePracticeAnswerRewards,
} from '../app/mistake_practice_rewards';
import { appendMistakeEvent, type MistakePracticeStorage } from '../app/mistake_practice_store';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';

describe('mistake practice rewards', () => {
  const base = {
    accountScope: 'stable-user',
    studyTarget: 'en' as const,
    mistakeId: `mistake:v1:${'a'.repeat(64)}`,
    cycleId: `mistake-cycle:v1:${'b'.repeat(64)}`,
    attemptId: 'session-1:position:2',
    correct: true,
    independent: true,
    support: 'production' as const,
    beforeStatus: 'active' as const,
    afterStatus: 'corrected' as const,
  };

  test('correction reward identity is stable per mistake cycle and version', () => {
    const first = buildMistakeCorrectionRewardKey(base);
    const replay = buildMistakeCorrectionRewardKey({ ...base });
    const revived = buildMistakeCorrectionRewardKey({
      ...base,
      cycleId: `mistake-cycle:v1:${'c'.repeat(64)}`,
    });

    expect(first).toBe(replay);
    expect(first).not.toBe(revived);
    expect(first).toMatch(/^mistake-correction:v1:[a-f0-9]{64}$/);
  });

  test('star is eligible only for a real active to corrected transition', () => {
    expect(shouldRewardMistakeCorrection(base)).toBe(true);
    expect(shouldRewardMistakeCorrection({ ...base, beforeStatus: 'corrected' })).toBe(false);
    expect(shouldRewardMistakeCorrection({ ...base, afterStatus: 'active' })).toBe(false);
    expect(shouldRewardMistakeCorrection({ ...base, correct: false })).toBe(false);
    expect(shouldRewardMistakeCorrection({ ...base, independent: false })).toBe(false);
  });

  test('independent correct answer gets idempotent XP and correction gets one wallet claim', async () => {
    const registerXP = jest.fn(async () => ({ finalDelta: 5, multiplier: 1, isBonus: false }));
    const claimCorrectionStar = jest.fn(async () => ({ granted: true as const }));
    const appendRewardEvent = jest.fn(async () => undefined);

    await expect(settleMistakePracticeAnswerRewards(base, {
      registerXP,
      claimCorrectionStar,
      appendRewardEvent,
    })).resolves.toEqual({ xp: 5, starGranted: true });

    expect(registerXP).toHaveBeenCalledTimes(1);
    expect((registerXP.mock.calls[0] as unknown[])[5]).toMatchObject({
      eventId: expect.stringMatching(/^mistake-practice-xp:v1:[a-f0-9]{64}$/),
    });
    expect(claimCorrectionStar).toHaveBeenCalledWith(expect.objectContaining({
      rewardKey: buildMistakeCorrectionRewardKey(base),
    }));
    expect(appendRewardEvent).toHaveBeenCalledTimes(1);
  });

  test('wrong or recognition-only answer cannot mint XP or a star', async () => {
    const registerXP = jest.fn();
    const claimCorrectionStar = jest.fn();
    const appendRewardEvent = jest.fn();

    await expect(settleMistakePracticeAnswerRewards({
      ...base,
      correct: false,
      afterStatus: 'active',
    }, { registerXP, claimCorrectionStar, appendRewardEvent }))
      .resolves.toEqual({ xp: 0, starGranted: false });

    await expect(settleMistakePracticeAnswerRewards({
      ...base,
      support: 'recognition',
      afterStatus: 'active',
    }, { registerXP, claimCorrectionStar, appendRewardEvent }))
      .resolves.toEqual({ xp: 0, starGranted: false });

    expect(registerXP).not.toHaveBeenCalled();
    expect(claimCorrectionStar).not.toHaveBeenCalled();
    expect(appendRewardEvent).not.toHaveBeenCalled();
  });

  test('completion bonus uses one stable XP event per session', async () => {
    const registerXP = jest.fn(async () => ({ finalDelta: 10, multiplier: 1, isBonus: false }));

    await expect(settleMistakePracticeCompletionReward({
      sessionId: 'mistake-session:v1:abc',
      initialCount: 5,
      studyTarget: 'en',
    }, { registerXP })).resolves.toBe(10);

    expect((registerXP.mock.calls[0] as unknown[])[5]).toMatchObject({
      eventId: expect.stringMatching(/^mistake-practice-complete-xp:v1:[a-f0-9]{64}$/),
    });
  });

  test('offline reward failure stays pending and replays the same correction safely', async () => {
    const values = new Map<string, string>();
    const storage: MistakePracticeStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    };
    const common = { mistakeId: base.mistakeId, cycleId: base.cycleId, studyTarget: 'en' as const };
    await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: {
      ...common, eventId: 'capture', type: 'captured', occurredAtMs: 1,
      payload: { canonicalTarget: 'give up', facet: 'form', sourceId: 'x', sourceKind: 'lesson_phrase' },
    } });
    for (const [index, day, mode, support] of [
      [1, '2026-08-18', 'lesson_typing', 'production'],
      [2, '2026-08-19', 'lesson_scripted_speech', 'production'],
      [3, '2026-08-20', 'lesson_typing', 'production'],
    ] as const) {
      await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: {
        ...common, eventId: `mistake-practice:v1:${String(index).repeat(64)}`, type: 'practice_answered', occurredAtMs: index + 1,
        payload: { correct: true, independent: true, localDay: day, mode, support },
      } });
    }
    const claim = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ granted: true });

    await expect(flushPendingMistakeCorrectionRewards({
      accountScope: base.accountScope, studyTarget: 'en',
    }, { storage, claimCorrectionStar: claim })).resolves.toEqual({ attempted: 1, delivered: 0, pending: 1 });
    await expect(flushPendingMistakeCorrectionRewards({
      accountScope: base.accountScope, studyTarget: 'en',
    }, { storage, claimCorrectionStar: claim })).resolves.toEqual({ attempted: 1, delivered: 1, pending: 0 });
    await expect(flushPendingMistakeCorrectionRewards({
      accountScope: base.accountScope, studyTarget: 'en',
    }, { storage, claimCorrectionStar: claim })).resolves.toEqual({ attempted: 0, delivered: 0, pending: 0 });
    expect(claim.mock.calls[0]?.[0].rewardKey).toBe(claim.mock.calls[1]?.[0].rewardKey);
  });

  test('reconciles every restored reward marker before filtering corrected cycles', async () => {
    const values = new Map<string, string>();
    const storage: MistakePracticeStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    };
    const common = { mistakeId: base.mistakeId, cycleId: base.cycleId, studyTarget: 'en' as const };
    await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: {
      ...common, eventId: 'capture', type: 'captured', occurredAtMs: 1,
      payload: { canonicalTarget: 'give up', facet: 'form', sourceId: 'x', sourceKind: 'lesson_phrase' },
    } });
    let correctionEvent: any;
    for (const [index, day, mode] of [
      [1, '2026-08-18', 'lesson_typing'],
      [2, '2026-08-19', 'lesson_scripted_speech'],
      [3, '2026-08-20', 'lesson_typing'],
    ] as const) {
      correctionEvent = {
        ...common, eventId: `mistake-practice:v1:${String(index).repeat(64)}`, type: 'practice_answered' as const, occurredAtMs: index + 1,
        payload: { correct: true, independent: true, localDay: day, mode, support: 'production' },
      };
      await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: correctionEvent });
    }
    const rewardKey = buildMistakeCorrectionRewardKey(base);
    const replayReceipt = {
      schemaVersion: 'mistake-correction-wallet-composite.v1',
      accountScopeHash: deriveLearningV2EconomicAccountScopeHash(base.accountScope),
      rewardKey, mistakeId: base.mistakeId, cycleId: base.cycleId, studyTarget: 'en',
      correctionEventId: correctionEvent.eventId,
      correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)),
      rewardVersion: 1,
    };
    await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: {
      ...common, eventId: 'reward-marker', type: 'correction_rewarded', occurredAtMs: 9,
      payload: { rewardKey, stars: 1, rewardVersion: 1, replayReceipt },
    } });
    const claim = jest.fn(async () => ({ granted: true as const }));
    await expect(flushPendingMistakeCorrectionRewards({
      accountScope: base.accountScope, studyTarget: 'en',
    }, { storage, claimCorrectionStar: claim })).resolves.toEqual({ attempted: 0, delivered: 0, pending: 0 });
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith(expect.objectContaining({
      correctionEventId: correctionEvent.eventId,
      correctionEventFingerprint: replayReceipt.correctionEventFingerprint,
    }));
  });

  test.each([
    ['stable-a', 'stable-b'],
    ['stable-b', 'stable-a'],
  ])('rebinds a merged %s reward marker to canonical owner %s from exact semantic evidence', async (
    sourceOwner,
    canonicalOwner,
  ) => {
    const values = new Map<string, string>();
    const storage: MistakePracticeStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    };
    const common = { mistakeId: base.mistakeId, cycleId: base.cycleId, studyTarget: 'en' as const };
    await appendMistakeEvent({ accountScope: canonicalOwner, studyTarget: 'en', storage, event: {
      ...common, eventId: 'capture', type: 'captured', occurredAtMs: 1,
      payload: { canonicalTarget: 'give up', facet: 'form', sourceId: 'x', sourceKind: 'lesson_phrase' },
    } });
    let correctionEvent: any;
    for (const [index, day, mode] of [
      [1, '2026-08-18', 'lesson_typing'],
      [2, '2026-08-19', 'lesson_scripted_speech'],
      [3, '2026-08-20', 'lesson_typing'],
    ] as const) {
      correctionEvent = {
        ...common, eventId: `mistake-practice:v1:${String(index).repeat(64)}`,
        type: 'practice_answered' as const, occurredAtMs: index + 1,
        payload: { correct: true, independent: true, localDay: day, mode, support: 'production' },
      };
      await appendMistakeEvent({ accountScope: canonicalOwner, studyTarget: 'en', storage, event: correctionEvent });
    }
    const rewardKey = buildMistakeCorrectionRewardKey(base);
    await appendMistakeEvent({ accountScope: canonicalOwner, studyTarget: 'en', storage, event: {
      ...common, eventId: 'reward-marker', type: 'correction_rewarded', occurredAtMs: 9,
      payload: {
        rewardKey, stars: 1, rewardVersion: 1,
        replayReceipt: {
          schemaVersion: 'mistake-correction-wallet-composite.v1',
          accountScopeHash: deriveLearningV2EconomicAccountScopeHash(sourceOwner),
          rewardKey, mistakeId: base.mistakeId, cycleId: base.cycleId, studyTarget: 'en',
          correctionEventId: correctionEvent.eventId,
          correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)),
          rewardVersion: 1,
        },
      },
    } });
    const claim = jest.fn(async () => ({ granted: true as const }));

    await expect(flushPendingMistakeCorrectionRewards({
      accountScope: canonicalOwner, studyTarget: 'en',
    }, { storage, claimCorrectionStar: claim })).resolves.toEqual({ attempted: 0, delivered: 0, pending: 0 });
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith(expect.objectContaining({
      accountScope: canonicalOwner,
      correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)),
    }));
  });

  test('fails closed for a restored reward marker whose semantic evidence fingerprint is foreign', async () => {
    const values = new Map<string, string>();
    const storage: MistakePracticeStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    };
    const common = { mistakeId: base.mistakeId, cycleId: base.cycleId, studyTarget: 'en' as const };
    await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: {
      ...common, eventId: 'capture', type: 'captured', occurredAtMs: 1,
      payload: { canonicalTarget: 'give up', facet: 'form', sourceId: 'x', sourceKind: 'lesson_phrase' },
    } });
    let correctionEvent: any;
    for (const [index, day, mode] of [
      [1, '2026-08-18', 'lesson_typing'],
      [2, '2026-08-19', 'lesson_scripted_speech'],
      [3, '2026-08-20', 'lesson_typing'],
    ] as const) {
      correctionEvent = {
        ...common, eventId: `mistake-practice:v1:${String(index).repeat(64)}`,
        type: 'practice_answered' as const, occurredAtMs: index + 1,
        payload: { correct: true, independent: true, localDay: day, mode, support: 'production' },
      };
      await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: correctionEvent });
    }
    const rewardKey = buildMistakeCorrectionRewardKey(base);
    await appendMistakeEvent({ accountScope: base.accountScope, studyTarget: 'en', storage, event: {
      ...common, eventId: 'foreign-reward-marker', type: 'correction_rewarded', occurredAtMs: 9,
      payload: { rewardKey, stars: 1, rewardVersion: 1, replayReceipt: {
        schemaVersion: 'mistake-correction-wallet-composite.v1',
        accountScopeHash: deriveLearningV2EconomicAccountScopeHash('foreign-owner'),
        rewardKey, mistakeId: base.mistakeId, cycleId: base.cycleId, studyTarget: 'en',
        correctionEventId: correctionEvent.eventId,
        correctionEventFingerprint: 'f'.repeat(64), rewardVersion: 1,
      } },
    } });
    const claim = jest.fn(async () => ({ granted: true as const }));

    await flushPendingMistakeCorrectionRewards({ accountScope: base.accountScope, studyTarget: 'en' }, {
      storage, claimCorrectionStar: claim,
    });
    expect(claim).not.toHaveBeenCalled();
  });
});
