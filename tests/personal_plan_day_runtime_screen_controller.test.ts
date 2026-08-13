import {
  createPlanDayRuntimeScreenController,
} from '../app/personal_plan_day_runtime_screen_controller';
import {
  createPlanDayRuntimeStorageAdapter,
  type PlanDayRuntimeStorageLike,
} from '../app/personal_plan_day_runtime_storage_adapter';
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

function controller(storage = new MemoryStorage()) {
  return {
    storage,
    controller: createPlanDayRuntimeScreenController({
      storage: createPlanDayRuntimeStorageAdapter(storage),
      bundles: bundles(),
      minutesPerDay: 15,
      planInstanceId: 'instance_screen_controller',
      planId: 'gavan',
      dayIndex: 1,
      sessionIdPrefix: 'screen-controller',
    }),
  };
}

describe('personal plan day runtime screen controller', () => {
  it('hydrates a fresh screen state for the future React Native screen', async () => {
    const { controller: screenController } = controller();

    const result = await screenController.hydrate();

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(`Expected ready hydrate: ${result.issues.join(', ')}`);
    expect(result.source).toBe('fresh');
    expect(result.screenModel.header.title).toBe('Задания дня');
    expect(result.screenModel.progress.label).toBe('0 из 3');
    expect(result.loop.assembly.activeBlockId).toBe('gavan-week1-day1:choose-natural');
  });

  it('applies an answer and returns updated loop plus screen model without auto-persisting', async () => {
    const { storage, controller: screenController } = controller();
    const hydrated = await screenController.hydrate();
    if (hydrated.status !== 'ready') throw new Error('Expected ready hydrate.');

    const answered = await screenController.answer(hydrated.loop, {
      selectedAnswer: "I'm here.",
    });

    expect(answered.status).toBe('ready');
    if (answered.status !== 'ready') throw new Error(`Expected ready answer: ${answered.issues.join(', ')}`);
    expect(answered.answer.submission.isCorrect).toBe(true);
    expect(answered.screenModel.activeExercise?.progress.label).toBe('1 из 5');
    expect(answered.loop.assembly.activeSession?.progress.completed).toBe(1);
    expect(storage.values.size).toBe(0);
  });

  it('persists and hydrates the same loop state through the safe storage adapter', async () => {
    const { controller: screenController } = controller();
    const hydrated = await screenController.hydrate();
    if (hydrated.status !== 'ready') throw new Error('Expected ready hydrate.');

    const answered = await screenController.answer(hydrated.loop, {
      selectedAnswer: 'I here.',
    });
    if (answered.status !== 'ready') throw new Error('Expected ready answer.');

    await expect(screenController.persist(answered.loop, {
      updatedAt: '2026-06-03T17:00:00.000Z',
    })).resolves.toEqual({
      status: 'ready',
      key: 'personal_plan_day_runtime_v1:instance_screen_controller:gavan:1',
    });

    const restored = await screenController.hydrate();
    expect(restored.status).toBe('ready');
    if (restored.status !== 'ready') throw new Error(`Expected ready restore: ${restored.issues.join(', ')}`);
    expect(restored.source).toBe('persisted');
    expect(restored.loop.carryoverPhraseIds).toEqual([content.phrases[0].id]);
    expect(restored.screenModel.carryover.visible).toBe(true);
  });

  it('resets only the current day runtime key', async () => {
    const { storage, controller: screenController } = controller();
    const hydrated = await screenController.hydrate();
    if (hydrated.status !== 'ready') throw new Error('Expected ready hydrate.');

    await screenController.persist(hydrated.loop, {
      updatedAt: '2026-06-03T17:01:00.000Z',
    });
    expect(storage.values.size).toBe(1);

    await expect(screenController.reset()).resolves.toEqual({
      status: 'ready',
      key: 'personal_plan_day_runtime_v1:instance_screen_controller:gavan:1',
    });
    expect(storage.values.size).toBe(0);
  });

  it('blocks invalid answers and returns controller-level issues', async () => {
    const { controller: screenController } = controller();
    const hydrated = await screenController.hydrate();
    if (hydrated.status !== 'ready') throw new Error('Expected ready hydrate.');

    await expect(screenController.answer(hydrated.loop, {
      selectedAnswer: ' ',
    })).resolves.toEqual({
      status: 'blocked',
      issues: ['missing_selected_answer'],
    });
  });
});
