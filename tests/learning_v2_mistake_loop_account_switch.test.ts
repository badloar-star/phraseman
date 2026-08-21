import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { loadLearningV2MistakeLoopCount } from '../app/learning_v2_mistake_loop_runtime';

describe('Learning V2 mistake loop account fence', () => {
  afterEach(() => __resetAccountGenerationForTests());

  test('a deferred account-A journal cannot publish count or telemetry into account B', async () => {
    beginAccountGeneration('account-a');
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const onReady = jest.fn();
    const pending = loadLearningV2MistakeLoopCount({
      studyTarget: 'en', lessonId: 'lesson-01', onReady,
    }, {
      getStableId: async () => 'account-a',
      loadJournal: async () => {
        await blocked;
        return { version: 1, accountScope: 'account-a', studyTarget: 'en', events: [] };
      },
      reconcile: jest.fn(),
    });

    await Promise.resolve();
    beginAccountGeneration('account-b');
    release();

    await expect(pending).resolves.toBeNull();
    expect(onReady).not.toHaveBeenCalled();
  });
});
