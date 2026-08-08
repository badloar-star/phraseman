import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

import {
  createPlanDayRuntimeStorageAdapter,
  type PlanDayRuntimeStorageAdapter,
} from './personal_plan_day_runtime_storage_adapter';

export function createAsyncStoragePlanDayRuntimeStorageAdapter(): PlanDayRuntimeStorageAdapter {
  return createPlanDayRuntimeStorageAdapter({
    async getItem(key) {
      const generation = captureAccountGeneration();
      return withAccountTransitionLock(async () => {
        if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
        const value = await AsyncStorage.getItem(key);
        if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
        return value;
      });
    },
    async setItem(key, value) {
      const generation = captureAccountGeneration();
      await withAccountTransitionLock(async () => {
        if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
        await AsyncStorage.setItem(key, value);
      });
    },
    async removeItem(key) {
      const generation = captureAccountGeneration();
      await withAccountTransitionLock(async () => {
        if (!isCurrentAccountGeneration(generation)) throw new Error('stale_account_generation');
        await AsyncStorage.removeItem(key);
      });
    },
  });
}
