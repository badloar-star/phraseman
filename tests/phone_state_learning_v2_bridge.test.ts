import {
  commitPhoneStateLearningV2Completion,
  configurePhoneStateLearningV2Bridge,
} from '../modules/phone-state/learning_v2_runtime_bridge';

describe('PhoneState Learning V2 runtime bridge', () => {
  afterEach(() => configurePhoneStateLearningV2Bridge(null));

  test('commits required completion once with mutation identity', async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    const triggerSync = jest.fn();
    configurePhoneStateLearningV2Bridge({
      scope: { stableUid: 'account-a', accountGeneration: 5 }, deviceId: 'device-a',
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never, triggerSync,
    });
    const envelope = {
      canonicalSessionId: 'session-1', sessionSetId: 'course-1', completionFingerprint: 'f'.repeat(64),
    };
    await expect(commitPhoneStateLearningV2Completion({
      stableId: 'account-a', generation: 5, mutationId: 'mutation-1', envelope,
    })).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      domain: 'learning_v2', kind: 'required_session_completion', entityId: 'mutation-1',
      payload: {
        mutationId: 'mutation-1', requiredSessionId: 'session-1', courseId: 'course-1', exactResult: envelope,
      },
    }), { idempotencyKey: 'learning_v2:mutation-1' });
  });

  test('returns false for a stale account so legacy crash recovery can continue', async () => {
    configurePhoneStateLearningV2Bridge({
      scope: { stableUid: 'account-b', accountGeneration: 5 }, deviceId: 'device-b',
      store: { commit: jest.fn(), readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    await expect(commitPhoneStateLearningV2Completion({
      stableId: 'account-a', generation: 5, mutationId: 'mutation-1',
      envelope: { canonicalSessionId: 'session-1', sessionSetId: 'course-1' },
    })).resolves.toBe(false);
  });
});
