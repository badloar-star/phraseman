import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  beginAccountGeneration,
  __resetAccountGenerationForTests,
  withAccountTransitionLock,
} from '../app/account_generation';
import { grantLocalDevSpin, readLocalLevelSpinBalance } from '../app/local_level_spins';
import { enqueueAuthoritativeLevelSpinLevels } from '../app/level_spin_level_up_queue';

// зачем (PM-047, аудит 2026-09-25): спин убран как механика — grantLocalDevSpin
// и вся цепочка level-up спина теперь намеренно no-op (см. комментарии в
// app/local_level_spins.ts, "все ниже — точки выдачи спинов... возвращаем
// ничего не выдано"). Этот тест раньше проверял СТАРОЕ поведение (реальную
// выдачу спина) и падал 2/2 после отключения механики — обновлён под текущий
// контракт, не откатывает саму механику.
describe('local Dev Spin grant (retired, PM-047)', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    __resetAccountGenerationForTests();
  });

  test('Dev Spin button no longer credits the local balance', async () => {
    const token = beginAccountGeneration('dev-spin-owner');
    await expect(grantLocalDevSpin(token)).resolves.toBe(false);
    await expect(readLocalLevelSpinBalance()).resolves.toBe(0);
  });

  test('level-up Spin pipeline still processes levels but no longer credits a balance', async () => {
    beginAccountGeneration('level-up-spin-owner');

    const outcome = await Promise.race([
      withAccountTransitionLock((lease) => enqueueAuthoritativeLevelSpinLevels([2], lease)),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ]);

    expect(outcome).toEqual([2]);
    await expect(readLocalLevelSpinBalance()).resolves.toBe(0);
  });
});
