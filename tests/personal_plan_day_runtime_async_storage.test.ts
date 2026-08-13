jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncStoragePlanDayRuntimeStorageAdapter } from '../app/personal_plan_day_runtime_async_storage';
import { buildPlanDayRuntimeStorageKey } from '../app/personal_plan_day_runtime_storage_adapter';
import type { PlanDayRuntimePersistedStateV1 } from '../app/personal_plan_day_runtime_persistence_contract';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

const mockedStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('personal plan day runtime async storage adapter', () => {
  beforeEach(() => {
    mockedStorage.getItem.mockReset();
    mockedStorage.setItem.mockReset();
    mockedStorage.removeItem.mockReset();
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-a');
  });

  it('saves and loads runtime state through the scoped storage key', async () => {
    const state: PlanDayRuntimePersistedStateV1 = {
      schemaVersion: 1,
      planInstanceId: 'instance_async',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 15,
      activeBlockId: 'block-1',
      completedBlockIds: ['block-1'],
      carryoverPhraseIds: ['phrase-1'],
      updatedAt: '2026-06-03T10:00:00.000Z',
    };
    const adapter = createAsyncStoragePlanDayRuntimeStorageAdapter();
    const key = buildPlanDayRuntimeStorageKey(state);

    mockedStorage.getItem.mockResolvedValueOnce(JSON.stringify(state));

    await expect(adapter.save(state)).resolves.toEqual({
      status: 'ready',
      key,
    });
    expect(mockedStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify(state));

    await expect(adapter.load({
      planInstanceId: state.planInstanceId,
      planId: state.planId,
      dayIndex: state.dayIndex,
    })).resolves.toEqual({
      status: 'ready',
      state,
    });
    expect(mockedStorage.getItem).toHaveBeenCalledWith(key);
  });

  it('resets only the scoped runtime state key', async () => {
    const adapter = createAsyncStoragePlanDayRuntimeStorageAdapter();
    const key = buildPlanDayRuntimeStorageKey({
      planInstanceId: 'instance_async',
      planId: 'gavan',
      dayIndex: 1,
    });

    await expect(adapter.reset({
      planInstanceId: 'instance_async',
      planId: 'gavan',
      dayIndex: 1,
    })).resolves.toEqual({
      status: 'ready',
      key,
    });
    expect(mockedStorage.removeItem).toHaveBeenCalledWith(key);
  });

  it('rejects a queued account-A runtime save after account generation changes', async () => {
    const state: PlanDayRuntimePersistedStateV1 = {
      schemaVersion: 1,
      planInstanceId: 'instance_async',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 15,
      activeBlockId: 'block-1',
      completedBlockIds: [],
      carryoverPhraseIds: [],
      updatedAt: '2026-06-03T10:00:00.000Z',
    };
    let release!: () => void;
    const blocker = withAccountTransitionLock(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    await Promise.resolve();

    const save = createAsyncStoragePlanDayRuntimeStorageAdapter().save(state);
    invalidateAccountGeneration();
    beginAccountGeneration('stable-b');
    release();
    await blocker;

    await expect(save).rejects.toThrow('stale_account_generation');
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });
});
