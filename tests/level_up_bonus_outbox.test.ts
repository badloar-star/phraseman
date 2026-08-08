import AsyncStorage from '@react-native-async-storage/async-storage';

const accountState = {
  generation: 1,
  phase: 'active' as const,
  stableId: 'stable-a' as string | null,
};

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ ...accountState }),
  isCurrentAccountGeneration: (token: typeof accountState, stableId?: string | null) => (
    token.generation === accountState.generation
    && token.stableId === accountState.stableId
    && accountState.phase === 'active'
    && (stableId === undefined || stableId === accountState.stableId)
  ),
  withAccountTransitionLock: async (operation: () => Promise<unknown>) => operation(),
}));

import {
  drainPendingLevelUpBonusIntents,
  loadPendingLevelUpBonusIntents,
  persistLevelUpBonusIntent,
} from '../app/level_up_bonus_outbox';

describe('level-up +100 XP durable intent outbox', () => {
  beforeEach(async () => {
    accountState.generation = 1;
    accountState.stableId = 'stable-a';
    await AsyncStorage.clear();
  });

  test('persists each level once for the active account', async () => {
    await persistLevelUpBonusIntent(5, 'ru');
    await persistLevelUpBonusIntent(5, 'ru');
    await persistLevelUpBonusIntent(6, 'es');

    expect(await loadPendingLevelUpBonusIntents()).toMatchObject([
      { ownerStableId: 'stable-a', level: 5, lang: 'ru' },
      { ownerStableId: 'stable-a', level: 6, lang: 'es' },
    ]);
  });

  test('removes an intent only after the deterministic award commits', async () => {
    await persistLevelUpBonusIntent(5, 'ru');
    const award = jest.fn().mockRejectedValueOnce(new Error('local commit failed'));

    await expect(drainPendingLevelUpBonusIntents(award)).rejects.toThrow('local commit failed');
    expect(await loadPendingLevelUpBonusIntents()).toHaveLength(1);

    award.mockResolvedValueOnce(undefined);
    await expect(drainPendingLevelUpBonusIntents(award)).resolves.toBe(1);
    expect(await loadPendingLevelUpBonusIntents()).toEqual([]);
  });

  test('never drains another account after an account switch', async () => {
    await persistLevelUpBonusIntent(5, 'ru');
    accountState.generation = 2;
    accountState.stableId = 'stable-b';
    const award = jest.fn();

    await expect(drainPendingLevelUpBonusIntents(award)).resolves.toBe(0);
    expect(award).not.toHaveBeenCalled();
  });
});
