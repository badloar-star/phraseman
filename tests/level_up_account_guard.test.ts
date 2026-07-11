import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  canAcknowledgeLevelUpForAccount,
  isLevelUpAccountTokenCurrent,
} from '../app/level_up_account_guard';

describe('level-up account guard', () => {
  beforeEach(() => __resetAccountGenerationForTests());

  it('rejects stale flush results after account A changes to B', () => {
    beginAccountGeneration('stable-a');
    const flushA = captureAccountGeneration();
    beginAccountGeneration('stable-b');

    expect(isLevelUpAccountTokenCurrent(flushA)).toBe(false);
  });

  it('rejects stale onShow from A even when B has the same pending level', () => {
    beginAccountGeneration('stable-a');
    const modalA = captureAccountGeneration();
    beginAccountGeneration('stable-b');
    const queueB = captureAccountGeneration();

    expect(canAcknowledgeLevelUpForAccount(modalA, queueB)).toBe(false);
    expect(canAcknowledgeLevelUpForAccount(queueB, queueB)).toBe(true);
  });
});
