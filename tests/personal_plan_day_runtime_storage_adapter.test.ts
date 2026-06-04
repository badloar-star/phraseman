import {
  buildPlanDayRuntimeStorageKey,
  createPlanDayRuntimeStorageAdapter,
  type PlanDayRuntimeStorageLike,
} from '../app/personal_plan_day_runtime_storage_adapter';
import { buildPlanDayRuntimePersistedState } from '../app/personal_plan_day_runtime_persistence_contract';
import { startPlanDayRuntimeLoop } from '../app/personal_plan_day_runtime_loop_coordinator';
import { buildGavanDay1RuntimeBlockBundles } from '../app/personal_plan_runtime_block_factory';
import { buildGavanDay1ContentCandidate } from '../app/personal_plan_gavan_day1_content_candidate';

const content = buildGavanDay1ContentCandidate();
const bundlesResult = buildGavanDay1RuntimeBlockBundles(content);

class MemoryStorage implements PlanDayRuntimeStorageLike {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function bundles() {
  expect(bundlesResult.status).toBe('ready');
  if (bundlesResult.status !== 'ready') {
    throw new Error(`Expected ready bundles: ${bundlesResult.issues.join(', ')}`);
  }
  return bundlesResult.bundles;
}

function persistedState(planInstanceId = 'instance_storage_1') {
  const loop = startPlanDayRuntimeLoop({
    bundles: bundles(),
    minutesPerDay: 15,
    planInstanceId,
    sessionIdPrefix: 'storage',
  });
  expect(loop.status).toBe('ready');
  if (loop.status !== 'ready') throw new Error(`Expected ready loop: ${loop.issues.join(', ')}`);

  return buildPlanDayRuntimePersistedState(loop.loop, {
    updatedAt: '2026-06-03T15:00:00.000Z',
  });
}

describe('personal plan day runtime storage adapter', () => {
  it('builds stable keys scoped by plan instance, plan, and day', () => {
    expect(buildPlanDayRuntimeStorageKey({
      planInstanceId: 'instance_storage_1',
      planId: 'gavan',
      dayIndex: 1,
    })).toBe('personal_plan_day_runtime_v1:instance_storage_1:gavan:1');
  });

  it('saves and loads persisted state through an injected storage interface', async () => {
    const storage = new MemoryStorage();
    const adapter = createPlanDayRuntimeStorageAdapter(storage);
    const state = persistedState();

    await expect(adapter.save(state)).resolves.toEqual({
      status: 'ready',
      key: 'personal_plan_day_runtime_v1:instance_storage_1:gavan:1',
    });

    await expect(adapter.load({
      planInstanceId: 'instance_storage_1',
      planId: 'gavan',
      dayIndex: 1,
    })).resolves.toEqual({
      status: 'ready',
      state,
    });
  });

  it('returns empty when no state exists and resets only the requested key', async () => {
    const storage = new MemoryStorage();
    const adapter = createPlanDayRuntimeStorageAdapter(storage);

    await expect(adapter.load({
      planInstanceId: 'missing_instance',
      planId: 'gavan',
      dayIndex: 1,
    })).resolves.toEqual({
      status: 'empty',
    });

    const state = persistedState('instance_storage_reset');
    await adapter.save(state);
    expect(storage.values.size).toBe(1);

    await expect(adapter.reset({
      planInstanceId: 'instance_storage_reset',
      planId: 'gavan',
      dayIndex: 1,
    })).resolves.toEqual({
      status: 'ready',
      key: 'personal_plan_day_runtime_v1:instance_storage_reset:gavan:1',
    });
    expect(storage.values.size).toBe(0);
  });

  it('blocks stale state from a different planInstanceId even if it is placed under the requested key', async () => {
    const storage = new MemoryStorage();
    const adapter = createPlanDayRuntimeStorageAdapter(storage);
    const requested = {
      planInstanceId: 'instance_requested',
      planId: 'gavan' as const,
      dayIndex: 1,
    };
    const key = buildPlanDayRuntimeStorageKey(requested);
    const stale = persistedState('instance_other');

    await storage.setItem(key, JSON.stringify(stale));

    await expect(adapter.load(requested)).resolves.toEqual({
      status: 'blocked',
      issues: ['plan_instance_mismatch'],
    });
  });

  it('blocks invalid and private payload states before returning them to runtime', async () => {
    const storage = new MemoryStorage();
    const adapter = createPlanDayRuntimeStorageAdapter(storage);
    const requested = {
      planInstanceId: 'instance_private',
      planId: 'gavan' as const,
      dayIndex: 1,
    };
    const key = buildPlanDayRuntimeStorageKey(requested);

    await storage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      planInstanceId: 'instance_private',
      planId: 'gavan',
      dayIndex: 1,
      minutesPerDay: 15,
      activeBlockId: 'block',
      completedBlockIds: [],
      carryoverPhraseIds: [],
      updatedAt: '2026-06-03T15:01:00.000Z',
      selectedAnswer: "I'm here.",
    }));

    await expect(adapter.load(requested)).resolves.toEqual({
      status: 'blocked',
      issues: ['private_payload_field'],
    });
  });
});
