import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  beginAccountGeneration,
  __resetAccountGenerationForTests,
  withAccountTransitionLock,
} from '../app/account_generation';
import { grantLocalDevSpin, readLocalLevelSpinBalance } from '../app/local_level_spins';
import { enqueueAuthoritativeLevelSpinLevels } from '../app/level_spin_level_up_queue';

describe('local Dev Spin grant', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    __resetAccountGenerationForTests();
  });

  test('writes a Dev Spin into the same local balance read by the Spin screen', async () => {
    const token = beginAccountGeneration('dev-spin-owner');
    await expect(grantLocalDevSpin(token)).resolves.toBe(true);
    await expect(readLocalLevelSpinBalance()).resolves.toBe(1);
  });

  test('reuses a real account-lock lease through the complete level-up Spin pipeline', async () => {
    beginAccountGeneration('level-up-spin-owner');

    const outcome = await Promise.race([
      withAccountTransitionLock((lease) => enqueueAuthoritativeLevelSpinLevels([2], lease)),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ]);

    expect(outcome).toEqual([2]);
    await expect(readLocalLevelSpinBalance()).resolves.toBe(1);
  });
});
