import { createOnboardingFunnelRecorder } from '../app/onboarding_funnel';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
  };
}

describe('onboarding funnel client recorder', () => {
  it('reuses one opaque attempt and acknowledges a replayed start locally', async () => {
    const storage = memoryStorage();
    const send = jest.fn(async () => ({ ok: true, duplicate: false }));
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => 'a6aa6a66-2ce7-43c5-baf8-288e02c23b6c',
      platform: 'ios',
      send,
    });

    await Promise.all([recorder.recordStart(), recorder.recordStart()]);
    await recorder.recordStart();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      event: 'started',
      platform: 'ios',
      attemptId: 'a6aa6a66-2ce7-43c5-baf8-288e02c23b6c',
    });
  });

  it('sends start before completion and retries an unacknowledged completion', async () => {
    const storage = memoryStorage();
    const seen: string[] = [];
    let completionCalls = 0;
    const send = jest.fn(async (payload: { event: string }) => {
      seen.push(payload.event);
      if (payload.event === 'completed' && completionCalls++ === 0) throw new Error('offline');
      return { ok: true, duplicate: false };
    });
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => '8b3c1599-c15f-44f5-96af-6250587f330f',
      platform: 'android',
      send,
    });

    await expect(recorder.recordCompletion()).resolves.toBe(false);
    await expect(recorder.recordCompletion()).resolves.toBe(true);

    expect(seen).toEqual(['started', 'completed', 'completed']);
  });

  it('does not acknowledge an event when the callable response is malformed', async () => {
    const storage = memoryStorage();
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => '7b0a47da-9ae2-461a-8515-e3bcdb73b011',
      platform: 'web',
      send: async () => ({ ok: false, duplicate: false }),
    });

    await expect(recorder.recordStart()).resolves.toBe(false);
    expect([...storage.values.keys()].some((key) => key.includes('started_ack'))).toBe(false);
  });
});
