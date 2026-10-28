import fs from 'fs';
import path from 'path';

describe('Android Metro bundle delivery', () => {
  const relevantEnvironment = [
    'EAS_BUILD',
    'CI',
    'EXPO_PUBLIC_STORE_RELEASE',
    'EXPO_METRO_ALLOW_MULTIPART',
  ] as const;
  const initialEnvironment = Object.fromEntries(
    relevantEnvironment.map((key) => [key, process.env[key]]),
  );
  const initialPlatform = process.platform;

  afterEach(() => {
    for (const key of relevantEnvironment) {
      if (initialEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = initialEnvironment[key];
    }
    Object.defineProperty(process, 'platform', { configurable: true, value: initialPlatform });
    jest.resetModules();
  });

  const loadConfig = (
    environment: Partial<Record<(typeof relevantEnvironment)[number], string>> = {},
    platform = initialPlatform,
  ) => {
    for (const key of relevantEnvironment) delete process.env[key];
    Object.assign(process.env, environment);
    Object.defineProperty(process, 'platform', { configurable: true, value: platform });
    jest.resetModules();
    return require('../metro.config');
  };

  const runRequest = (config: { server: { enhanceMiddleware: Function } }, url: string, accept?: string) => {
    const downstream = jest.fn();
    const middleware = config.server.enhanceMiddleware(downstream, {});
    const request = { url, headers: accept === undefined ? {} : { accept } };
    middleware(request, {}, jest.fn());
    return { request, downstream };
  };

  test('streams Android bundle requests by removing multipart media types with parameters', () => {
    const { request, downstream } = runRequest(
      loadConfig(),
      '/index.bundle?platform=android&dev=true',
      'application/javascript, multipart/mixed; q=0.9',
    );

    expect(request.headers.accept).toBe('application/javascript');
    expect(downstream).toHaveBeenCalledTimes(1);
  });

  test('leaves non-bundle requests untouched and permits an explicit multipart compatibility check', () => {
    const unrelated = runRequest(loadConfig(), '/hot', 'multipart/mixed; q=0.9');
    expect(unrelated.request.headers.accept).toBe('multipart/mixed; q=0.9');

    const optedOut = runRequest(
      loadConfig({ EXPO_METRO_ALLOW_MULTIPART: '1' }),
      '/index.bundle?platform=android&dev=true',
      'application/javascript, multipart/mixed; q=0.9',
    );
    expect(optedOut.request.headers.accept).toBe('application/javascript, multipart/mixed; q=0.9');
  });

  test('disables the local Windows disk cache but preserves non-Windows and build caches', () => {
    expect(loadConfig({}, 'win32').cacheStores).toEqual([]);
    expect(loadConfig({}, 'linux').cacheStores).not.toEqual([]);
    expect(loadConfig({ CI: 'true' }, 'win32').cacheStores).not.toEqual([]);
  });

  test('documents the evidence-backed delivery policy rather than implying multipart is HMR', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'metro.config.js'), 'utf8');
    expect(source).toContain('282,819,076 bytes');
    expect(source).toContain('/hot');
  });
});
