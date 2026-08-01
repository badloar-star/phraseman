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
    const send = jest.fn(async (_payload: { event: string }) => ({ ok: true, duplicate: false }));
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => 'a6aa6a66-2ce7-43c5-baf8-288e02c23b6c',
      platform: 'ios',
      prepareDelivery: async () => true,
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
      prepareDelivery: async () => true,
      send,
    });

    await expect(recorder.recordCompletion()).resolves.toBe(false);
    await expect(recorder.recordCompletion()).resolves.toBe(true);

    expect(seen).toEqual(['started', 'completed', 'completed']);
    expect([...storage.values.entries()].find(([key]) => key.includes('completed_pending'))?.[1]).toBe('');
  });

  it('does not acknowledge an event when the callable response is malformed', async () => {
    const storage = memoryStorage();
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => '7b0a47da-9ae2-461a-8515-e3bcdb73b011',
      platform: 'web',
      prepareDelivery: async () => true,
      send: async () => ({ ok: false, duplicate: false }),
    });

    await expect(recorder.recordStart()).resolves.toBe(false);
    expect([...storage.values.keys()].some((key) => key.includes('started_ack'))).toBe(false);
  });

  it('persists start intent before readiness, then sends and acknowledges it when ready', async () => {
    const storage = memoryStorage();
    const order: string[] = [];
    let ready = false;
    storage.setItem.mockImplementation(async (key: string, value: string) => {
      storage.values.set(key, value);
      if (key.includes('started_pending')) order.push('pending');
    });
    const prepareDelivery = jest.fn(async () => {
      order.push('ready');
      return ready;
    });
    const send = jest.fn(async () => {
      order.push('send');
      return { ok: true, duplicate: false };
    });
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => '9c1170ca-ed09-4635-a38d-c1bf27208628',
      platform: 'android',
      prepareDelivery,
      send,
    });

    await expect(recorder.recordStart()).resolves.toBe(false);

    expect(order).toEqual(['pending', 'ready']);
    expect(send).not.toHaveBeenCalled();
    expect([...storage.values.entries()].find(([key]) => key.includes('started_pending'))?.[1])
      .toBe('9c1170ca-ed09-4635-a38d-c1bf27208628');

    ready = true;
    await expect(recorder.recordStart()).resolves.toBe(true);

    expect(send).toHaveBeenCalledTimes(1);
    expect([...storage.values.entries()].find(([key]) => key.includes('started_pending'))?.[1]).toBe('');
    expect([...storage.values.entries()].find(([key]) => key.includes('started_ack'))?.[1])
      .toBe('9c1170ca-ed09-4635-a38d-c1bf27208628');
  });

  it('keeps failed intent durable for a later recorder instance', async () => {
    const storage = memoryStorage();
    const first = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => '5bd18288-beb9-49e3-a0a2-da8030c6ee28',
      platform: 'ios',
      prepareDelivery: async () => true,
      send: async () => { throw new Error('offline'); },
    });
    await expect(first.recordStart()).resolves.toBe(false);

    const send = jest.fn(async (_payload: { event: string }) => ({ ok: true, duplicate: false }));
    const restarted = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => 'must-not-create-a-new-attempt',
      platform: 'ios',
      prepareDelivery: async () => true,
      send,
    });

    await expect(restarted.recordStart()).resolves.toBe(true);
    await expect(restarted.recordStart()).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toEqual({
      event: 'started',
      platform: 'ios',
      attemptId: '5bd18288-beb9-49e3-a0a2-da8030c6ee28',
    });
  });

  it('persists completion before its required start, then replays start before completion', async () => {
    const storage = memoryStorage();
    const order: string[] = [];
    let ready = false;
    storage.setItem.mockImplementation(async (key: string, value: string) => {
      storage.values.set(key, value);
      if (key.includes('completed_pending')) order.push('completion-pending');
      if (key.includes('started_pending')) order.push('start-pending');
    });
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId: () => '756af681-38eb-4b38-b0cd-6b98319842d8',
      platform: 'web',
      prepareDelivery: async () => ready,
      send: async (payload) => {
        order.push(`send-${payload.event}`);
        return { ok: true, duplicate: false };
      },
    });

    await expect(recorder.recordCompletion()).resolves.toBe(false);

    expect(order.slice(0, 2)).toEqual(['completion-pending', 'start-pending']);
    expect([...storage.values.entries()].find(([key]) => key.includes('completed_pending'))?.[1])
      .toBe('756af681-38eb-4b38-b0cd-6b98319842d8');

    ready = true;
    await expect(recorder.recordCompletion()).resolves.toBe(true);

    expect(order.filter((entry) => entry.startsWith('send-'))).toEqual([
      'send-started',
      'send-completed',
    ]);
    expect([...storage.values.entries()].find(([key]) => key.includes('completed_ack'))?.[1])
      .toBe('756af681-38eb-4b38-b0cd-6b98319842d8');
    expect([...storage.values.entries()].find(([key]) => key.includes('completed_pending'))?.[1]).toBe('');
  });

  it('resume reads no intent without creating or writing an attempt', async () => {
    const storage = memoryStorage();
    const createAttemptId = jest.fn(() => '11111111-1111-4111-8111-111111111111');
    const prepareDelivery = jest.fn(async () => true);
    const send = jest.fn(async (_payload: { event: string }) => ({ ok: true, duplicate: false }));
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId,
      platform: 'ios',
      prepareDelivery,
      send,
    }) as ReturnType<typeof createOnboardingFunnelRecorder> & {
      resumePending?: () => Promise<{ attempted: number; pending: number }>;
    };

    expect(typeof recorder.resumePending).toBe('function');
    if (!recorder.resumePending) return;
    await expect(recorder.resumePending()).resolves.toEqual({ attempted: 0, pending: 0 });

    expect(createAttemptId).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(prepareDelivery).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('resume replays a pending completion as start then completion', async () => {
    const attemptId = '22222222-2222-4222-8222-222222222222';
    const storage = memoryStorage();
    storage.values.set('onboarding_funnel_attempt_v1', attemptId);
    storage.values.set('onboarding_funnel_completed_pending_v1', attemptId);
    const createAttemptId = jest.fn(() => 'must-not-create-a-new-attempt');
    const sent: string[] = [];
    const recorder = createOnboardingFunnelRecorder({
      storage,
      createAttemptId,
      platform: 'android',
      prepareDelivery: async () => true,
      send: async (payload) => {
        sent.push(payload.event);
        return { ok: true, duplicate: false };
      },
    }) as ReturnType<typeof createOnboardingFunnelRecorder> & {
      resumePending?: () => Promise<{ attempted: number; pending: number }>;
    };

    expect(typeof recorder.resumePending).toBe('function');
    if (!recorder.resumePending) return;
    await expect(recorder.resumePending()).resolves.toEqual({ attempted: 1, pending: 0 });

    expect(createAttemptId).not.toHaveBeenCalled();
    expect(sent).toEqual(['started', 'completed']);
  });

  it('delivery readiness requires current auth and App Check, including a final auth check', async () => {
    type ReadinessFactory = (dependencies: {
      ensureAuthenticated(): Promise<unknown>;
      waitForCurrentAuth(): Promise<boolean>;
      hasCurrentAuth(): boolean;
      initAppCheck(): Promise<boolean>;
    }) => () => Promise<boolean>;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('../app/onboarding_funnel') as {
      createOnboardingFunnelDeliveryReadiness?: ReadinessFactory;
    };
    const createReadiness = module.createOnboardingFunnelDeliveryReadiness;

    expect(typeof createReadiness).toBe('function');
    if (!createReadiness) return;

    const missingAuthAppCheck = jest.fn(async () => true);
    const missingAuth = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => false,
      hasCurrentAuth: () => false,
      initAppCheck: missingAuthAppCheck,
    });
    await expect(missingAuth()).resolves.toBe(false);
    expect(missingAuthAppCheck).not.toHaveBeenCalled();

    const rejectedAppCheck = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => true,
      hasCurrentAuth: () => true,
      initAppCheck: async () => false,
    });
    await expect(rejectedAppCheck()).resolves.toBe(false);

    const authStates = [true, false];
    const losesAuth = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => true,
      hasCurrentAuth: () => authStates.shift() ?? false,
      initAppCheck: async () => true,
    });
    await expect(losesAuth()).resolves.toBe(false);

    const ready = createReadiness({
      ensureAuthenticated: async () => {},
      waitForCurrentAuth: async () => true,
      hasCurrentAuth: () => true,
      initAppCheck: async () => true,
    });
    await expect(ready()).resolves.toBe(true);
  });
});
