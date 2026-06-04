import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createPlanDayRuntimeStorageAdapter,
  type PlanDayRuntimeStorageAdapter,
} from './personal_plan_day_runtime_storage_adapter';

export function createAsyncStoragePlanDayRuntimeStorageAdapter(): PlanDayRuntimeStorageAdapter {
  return createPlanDayRuntimeStorageAdapter(AsyncStorage);
}
