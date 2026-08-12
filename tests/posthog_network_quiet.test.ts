const mockPostHogInstances: {
  lastRequest: Promise<unknown> | null;
  fetch(url: string, options: RequestInit): Promise<unknown>;
}[] = [];

jest.mock('../app/analytics_consent', () => ({
  isAnalyticsConsentGranted: () => true,
}));

jest.mock('posthog-react-native', () => {
  class MockPostHog {
    lastRequest: Promise<unknown> | null = null;

    constructor() {
      mockPostHogInstances.push(this);
    }

    fetch(url: string, options: RequestInit): Promise<unknown> {
      return fetch(url, options);
    }

    capture(): void {
      this.lastRequest = this.fetch('https://posthog.test/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      void this.lastRequest.catch(() => {});
    }

    identify(): void {}
    reset(): void {}
  }

  return { PostHog: MockPostHog };
});

const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

beforeEach(() => {
  jest.resetModules();
  mockPostHogInstances.length = 0;
  process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
  else process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
});

test('queues analytics locally but starts no PostHog HTTP while a session is quiet', async () => {
  const networkFetch = jest.fn(async () => ({
    status: 200,
    text: async () => '',
    json: async () => ({}),
  }));
  global.fetch = networkFetch as unknown as typeof fetch;

  const quietModule = await import('../app/interactive_network_quiet');
  const posthog = await import('../app/posthog_client');
  const quiet = quietModule.beginInteractiveNetworkQuiet();
  await quietModule.waitForInteractiveNetworkQuiet(quiet);

  posthog.capturePostHog('during_session');
  await Promise.resolve();
  expect(mockPostHogInstances).toHaveLength(1);
  expect(networkFetch).not.toHaveBeenCalled();

  quietModule.releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
  posthog.capturePostHog('after_session');
  await mockPostHogInstances[0]!.lastRequest;
  expect(networkFetch).toHaveBeenCalledTimes(1);
});

test('aborts an active PostHog fetch and waits for its real settlement', async () => {
  let seenSignal: AbortSignal | undefined;
  let streamController!: ReadableStreamDefaultController<Uint8Array>;
  const cancelBody = jest.fn(() => {
    throw new Error('underlying_cancel_rejected');
  });
  const body = new ReadableStream<Uint8Array>({
    start(controller) { streamController = controller; },
    cancel: cancelBody,
  });
  global.fetch = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    seenSignal = init?.signal ?? undefined;
    return {
      status: 200,
      headers: { get: () => null },
      body,
      text: async () => '',
      json: async () => ({}),
    } as unknown as Response;
  }) as unknown as typeof fetch;

  const quietModule = await import('../app/interactive_network_quiet');
  const posthog = await import('../app/posthog_client');
  posthog.capturePostHog('before_session');
  await Promise.resolve();
  await Promise.resolve();
  expect(seenSignal?.aborted).toBe(false);

  const quiet = quietModule.beginInteractiveNetworkQuiet();
  expect(seenSignal?.aborted).toBe(true);
  let ready = false;
  const waiting = quietModule.waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });
  await Promise.resolve();
  expect(ready).toBe(false);

  streamController.enqueue(new Uint8Array([123]));
  await Promise.resolve();
  await Promise.resolve();
  expect(cancelBody).not.toHaveBeenCalled();
  expect(ready).toBe(false);
  streamController.close();
  await mockPostHogInstances[0]!.lastRequest?.catch(() => {});
  await waiting;
  expect(ready).toBe(true);
});

test('rejects adversarial zero-length chunk floods with bounded read work', async () => {
  let reads = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      reads += 1;
      if (reads <= 8_193) controller.enqueue(new Uint8Array(0));
      else controller.close();
    },
  });
  global.fetch = jest.fn(async () => ({
    status: 200,
    headers: { get: () => null },
    body,
    text: async () => '',
    json: async () => ({}),
  } as unknown as Response)) as unknown as typeof fetch;

  const posthog = await import('../app/posthog_client');
  posthog.capturePostHog('chunk_flood');
  await expect(mockPostHogInstances[0]!.lastRequest).rejects.toThrow(
    'posthog_response_too_many_chunks',
  );
  expect(reads).toBeLessThanOrEqual(8_194);
});

test('preserves the PostHog SDK upstream abort signal', async () => {
  let call = 0;
  let transportSignal: AbortSignal | undefined;
  global.fetch = jest.fn((_url: string | URL | Request, init?: RequestInit) => {
    call += 1;
    if (call === 1) {
      return Promise.resolve({
        status: 200,
        headers: { get: () => null },
        body: { cancel: async () => undefined },
        text: async () => '',
      } as unknown as Response);
    }
    transportSignal = init?.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => {
      transportSignal?.addEventListener('abort', () => reject(new Error('upstream_aborted')), {
        once: true,
      });
    });
  }) as unknown as typeof fetch;

  const posthog = await import('../app/posthog_client');
  posthog.capturePostHog('initialize');
  await mockPostHogInstances[0]!.lastRequest;

  const upstream = new AbortController();
  const request = mockPostHogInstances[0]!.fetch('https://posthog.test/flags', {
    method: 'POST',
    headers: {},
    signal: upstream.signal,
  });
  await Promise.resolve();
  expect(transportSignal?.aborted).toBe(false);
  upstream.abort();
  await expect(request).rejects.toThrow('upstream_aborted');
  expect(transportSignal?.aborted).toBe(true);
});
