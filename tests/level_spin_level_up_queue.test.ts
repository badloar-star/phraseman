import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, phase: 'active', stableId: 'stable-a' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (operation: () => Promise<unknown>) => operation(),
}));

import {
  crossedSpinLevels,
  enqueueAuthoritativeLevelSpinLevels,
  enqueueLevelSpinLevelUps,
  loadPendingLevelSpinLevelUps,
} from '../app/level_spin_level_up_queue';

describe('level spin level-up queue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('queues every crossed level once without creating a legacy gift', async () => {
    expect(crossedSpinLevels(3, 6)).toEqual([4, 5, 6]);
    await enqueueLevelSpinLevelUps(3, 6);
    await enqueueLevelSpinLevelUps(5, 7);
    expect(await loadPendingLevelSpinLevelUps()).toEqual([4, 5, 6, 7]);
    expect(await AsyncStorage.getItem('unclaimed_level_gifts')).toBeNull();
  });

  test('never queues unsupported levels above MAX_LEVEL=60', () => {
    expect(crossedSpinLevels(59, 80)).toEqual([60]);
  });

  test('queues sparse authoritative server levels without inventing gaps', async () => {
    await enqueueAuthoritativeLevelSpinLevels([4, 6, 6, 61, 1]);
    expect(await loadPendingLevelSpinLevelUps()).toEqual([4, 6]);
  });
});
