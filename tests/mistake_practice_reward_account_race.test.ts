const mockCommitComposite = jest.fn(async (_candidate?: unknown, _dependencies?: unknown) => ({ status: 'applied' }));
const mockLoadJournal = jest.fn();

jest.mock('../app/learning_v2_owner_repository_runtime', () => ({
  commitMistakeCorrectionWalletComposite: (candidate: unknown, dependencies?: unknown) =>
    mockCommitComposite(candidate, dependencies),
}));
jest.mock('../app/mistake_practice_store', () => ({
  loadMistakeEventJournal: (...args: unknown[]) => mockLoadJournal(...args),
  appendMistakeEvent: jest.fn(async () => ({ appended: true })),
}));
jest.mock('../modules/mistake-practice/projection', () => ({
  projectMistakes: () => ({ items: new Map([[`mistake:v1:${'a'.repeat(64)}`, {
    mistakeId: `mistake:v1:${'a'.repeat(64)}`,
    cycleId: `mistake-cycle:v1:${'b'.repeat(64)}`,
    status: 'corrected',
  }]]) }),
}));

import { beginAccountGeneration } from '../app/account_generation';
import {
  buildMistakeCorrectionRewardKey,
  flushPendingMistakeCorrectionRewards,
  settleMistakePracticeAnswerRewards,
} from '../app/mistake_practice_rewards';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';

test('account switch between correction evidence load and commit cannot credit the new owner', async () => {
  const mistakeId = `mistake:v1:${'a'.repeat(64)}`;
  const cycleId = `mistake-cycle:v1:${'b'.repeat(64)}`;
  const attemptId = 'session-1:position:2';
  const eventId = `mistake-practice:v1:${sha256Utf8(canonicalJsonV1({ attemptId, type: 'practice_answered' }))}`;
  mockCommitComposite.mockClear();
  beginAccountGeneration('owner-a');
  mockLoadJournal.mockImplementationOnce(async () => {
    beginAccountGeneration('owner-b');
    return {
      version: 1, accountScope: 'owner-a', studyTarget: 'en',
      events: [{
        eventId, mistakeId, cycleId, type: 'practice_answered', occurredAtMs: 1,
        studyTarget: 'en', payload: { correct: true, independent: true },
      }],
    };
  });
  await expect(settleMistakePracticeAnswerRewards({
    accountScope: 'owner-a', studyTarget: 'en', mistakeId, cycleId, attemptId,
    correct: true, independent: true, support: 'production',
    beforeStatus: 'active', afterStatus: 'corrected',
  }, {
    registerXP: jest.fn(async () => ({ finalDelta: 5, multiplier: 1, isBonus: false })),
  })).rejects.toThrow('mistake_correction_account_generation_stale');
  expect(mockCommitComposite).not.toHaveBeenCalled();
});

test('an owner-rematerialized owner-A reward marker materializes only under current owner-B scope', async () => {
  const mistakeId = `mistake:v1:${'a'.repeat(64)}`;
  const cycleId = `mistake-cycle:v1:${'b'.repeat(64)}`;
  const correctionEventId = `mistake-practice:v1:${'c'.repeat(64)}`;
  const rewardKey = buildMistakeCorrectionRewardKey({ mistakeId, cycleId, studyTarget: 'en' });
  const correctionEvent = {
    eventId: correctionEventId, mistakeId, cycleId, type: 'practice_answered',
    occurredAtMs: 1, studyTarget: 'en', payload: { correct: true, independent: true },
  };
  mockCommitComposite.mockClear();
  beginAccountGeneration('owner-b');
  mockLoadJournal.mockResolvedValue({
    version: 1, accountScope: 'owner-b', studyTarget: 'en',
    events: [correctionEvent, {
      eventId: 'reward-marker', mistakeId, cycleId, type: 'correction_rewarded',
      occurredAtMs: 2, studyTarget: 'en', payload: {
        rewardKey, stars: 1, rewardVersion: 1,
        replayReceipt: {
          schemaVersion: 'mistake-correction-wallet-composite.v1',
          accountScopeHash: deriveLearningV2EconomicAccountScopeHash('owner-a'),
          rewardKey, mistakeId, cycleId, studyTarget: 'en', correctionEventId,
          correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)), rewardVersion: 1,
        },
      },
    }],
  });
  await expect(flushPendingMistakeCorrectionRewards({
    accountScope: 'owner-b', studyTarget: 'en',
  })).resolves.toEqual({ attempted: 0, delivered: 0, pending: 0 });
  expect(mockCommitComposite).toHaveBeenCalledTimes(1);
  expect(mockCommitComposite).toHaveBeenCalledWith(expect.objectContaining({
    accountScopeHash: deriveLearningV2EconomicAccountScopeHash('owner-b'),
    correctionEventId,
    correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)),
  }), expect.objectContaining({
    accountToken: expect.objectContaining({ stableId: 'owner-b' }),
  }));
});
