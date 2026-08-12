import { gunzipSync } from 'node:zlib';

jest.mock('../app/analytics_consent', () => ({
  isAnalyticsConsentGranted: () => true,
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios ?? options.default },
  AppState: {
    currentState: 'active',
    addEventListener: () => ({ remove: () => undefined }),
  },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Linking: { getInitialURL: async () => null },
}));

const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

afterAll(() => {
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
  else process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
});

test('the installed PostHog SDK retains a deferred batch and flushes it after quiet releases', async () => {
  jest.resetModules();
  jest.unmock('posthog-react-native');
  process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
  const requests: { url: string; body: BodyInit | null | undefined }[] = [];
  global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), body: init?.body });
    return {
      status: 200,
      headers: { get: () => null },
      body: { cancel: async () => undefined },
      text: async () => '{}',
      json: async () => ({}),
    } as unknown as Response;
  }) as unknown as typeof fetch;

  const quietModule = await import('../app/interactive_network_quiet');
  const posthog = await import('../app/posthog_client');
  const quiet = quietModule.beginInteractiveNetworkQuiet();
  await quietModule.waitForInteractiveNetworkQuiet(quiet);

  for (let index = 0; index < 24; index += 1) {
    posthog.capturePostHog(`queued_during_quiet_${index}`);
  }
  await new Promise((resolve) => setImmediate(resolve));
  expect(requests).toEqual([]);

  quietModule.releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
  posthog.capturePostHog('release_flush_trigger');

  const expectedEvents = [
    ...Array.from({ length: 24 }, (_, index) => `queued_during_quiet_${index}`),
    'release_flush_trigger',
  ];
  let observedEvents: string[] = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    observedEvents = [];
    for (const request of requests.filter(({ url }) => url.includes('/batch/'))) {
      let encoded: string;
      if (typeof request.body === 'string') encoded = request.body;
      else if (request.body instanceof Blob) {
        encoded = gunzipSync(Buffer.from(await request.body.arrayBuffer())).toString('utf8');
      } else continue;
      const parsed = JSON.parse(encoded) as { batch?: { event?: unknown }[] };
      for (const item of parsed.batch ?? []) {
        if (typeof item.event === 'string') observedEvents.push(item.event);
      }
    }
    if (expectedEvents.every((event) => observedEvents.includes(event))) break;
  }
  for (const event of expectedEvents) {
    expect(observedEvents.filter((candidate) => candidate === event)).toHaveLength(1);
  }
});
