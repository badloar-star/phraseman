import {
  hydratePlanDayRuntime,
  persistPlanDayRuntimeLoop,
} from '../app/personal_plan_day_runtime_hydration_adapter';
import {
  buildPlanDayRuntimeStorageKey,
  createPlanDayRuntimeStorageAdapter,
  type PlanDayRuntimeStorageLike,
} from '../app/personal_plan_day_runtime_storage_adapter';
import { buildPlanDayRuntimePersistedState } from '../app/personal_plan_day_runtime_persistence_contract';
import {
  applyPlanDayRuntimeLoopAnswer,
  startPlanDayRuntimeLoop,
} from '../app/personal_plan_day_runtime_loop_coordinator';
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

function startLoop() {
  const result = startPlanDayRuntimeLoop({
    bundles: bundles(),
    minutesPerDay: 15,
    planInstanceId: 'instance_hydrate_1',
    sessionIdPrefix: 'hydrate',
  });
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error(`Expected ready loop: ${result.issues.join(', ')}`);
  return result.loop;
}

describe('personal plan day runtime hydration adapter', () => {
  it('starts a fresh loop and screen model when storage is empty', async () => {
    const adapter = createPlanDayRuntimeStorageAdapter(new MemoryStorage());

    await expect(hydratePlanDayRuntime({
      storage: adapter,
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_hydrate_empty',
      planId: 'gavan',
      dayIndex: 1,
      sessionIdPrefix: 'hydrate',
    })).resolves.toEqual(expect.objectContaining({
      status: 'ready',
      source: 'fresh',
      screenModel: expect.objectContaining({
        progress: expect.objectContaining({ label: '0 из 3' }),
      }),
    }));
  });

  it('hydrates a persisted loop and opens the next incomplete block', async () => {
    const storage = new MemoryStorage();
    const adapter = createPlanDayRuntimeStorageAdapter(storage);
    let loop = startLoop();

    while (loop.completedBlockIds.length === 0) {
      const answer = loop.assembly.activeSession?.currentItem?.correctAnswer;
      if (!answer) throw new Error('Expected active answer.');
      const result = applyPlanDayRuntimeLoopAnswer(loop, { selectedAnswer: answer });
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error(`Expected ready answer: ${result.issues.join(', ')}`);
      loop = result.loop;
    }
    await persistPlanDayRuntimeLoop(adapter, loop, {
      updatedAt: '2026-06-03T16:00:00.000Z',
    });

    const hydrated = await hydratePlanDayRuntime({
      storage: adapter,
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_hydrate_1',
      planId: 'gavan',
      dayIndex: 1,
      sessionIdPrefix: 'hydrate',
    });

    expect(hydrated.status).toBe('ready');
    if (hydrated.status !== 'ready') throw new Error(`Expected ready hydration: ${hydrated.issues.join(', ')}`);

    expect(hydrated.source).toBe('persisted');
    expect(hydrated.loop.completedBlockIds).toEqual(['gavan-week1-day1:choose-natural']);
    expect(hydrated.loop.assembly.activeBlockId).toBe('gavan-week1-day1:missing-word');
    expect(hydrated.screenModel.activeExercise?.title).toBe('Вставить слово');
  });

  it('persists a loop through the storage adapter using the safe persistence contract', async () => {
    const storage = new MemoryStorage();
    const adapter = createPlanDayRuntimeStorageAdapter(storage);
    const loop = startLoop();

    await expect(persistPlanDayRuntimeLoop(adapter, loop, {
      updatedAt: '2026-06-03T16:01:00.000Z',
    })).resolves.toEqual({
      status: 'ready',
      key: 'personal_plan_day_runtime_v1:instance_hydrate_1:gavan:1',
    });

    const raw = storage.values.get('personal_plan_day_runtime_v1:instance_hydrate_1:gavan:1');
    expect(raw).toBeDefined();
    expect(raw).not.toContain('selectedAnswer');
    expect(raw).not.toContain("I'm here.");
    expect(raw).not.toContain('Я здесь.');
  });

  it('blocks stale state from another plan instance during hydration', async () => {
    const storage = new MemoryStorage();
    const adapter = createPlanDayRuntimeStorageAdapter(storage);
    const key = buildPlanDayRuntimeStorageKey({
      planInstanceId: 'instance_requested',
      planId: 'gavan',
      dayIndex: 1,
    });
    const staleState = buildPlanDayRuntimePersistedState(startLoop(), {
      updatedAt: '2026-06-03T16:02:00.000Z',
    });

    await storage.setItem(key, JSON.stringify({
      ...staleState,
      planInstanceId: 'instance_other',
    }));

    await expect(hydratePlanDayRuntime({
      storage: adapter,
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_requested',
      planId: 'gavan',
      dayIndex: 1,
    })).resolves.toEqual({
      status: 'blocked',
      issues: ['plan_instance_mismatch'],
    });
  });
});
