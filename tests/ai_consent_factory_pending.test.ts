// зачем (Дизайн через координатора 12.10, R1 E-2): ошибка облака для согласий на AI глоталась без повтора. Теперь каждая смена
// ставит отметку «не доставлено», успех ТОГО ЖЕ выбора её снимает, а при запуске недоставленное досылается один раз.
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
  },
}));
let mockSignedIn = true;
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => undefined),
  waitForAnonAuth: jest.fn(async () => mockSignedIn),
  getCurrentUid: () => (mockSignedIn ? 'uid-test' : null),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
const mockCallable = jest.fn(async (_data: { state: string }) => ({ data: { ok: true } }));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }), { virtual: true });
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => (data: { state: string }) => mockCallable(data),
}), { virtual: true });

type Factory = typeof import('../app/ai_consent_factory');
const KEY = 'ai_test_consent_v1';
const PENDING = `${KEY}_cloud_pending_v1`;

function load(): Factory {
  let mod!: Factory;
  jest.isolateModules(() => { mod = require('../app/ai_consent_factory'); });
  return mod;
}

describe('AI consent: undelivered cloud record is retried on launch', () => {
  beforeEach(() => {
    mockStore.clear();
    mockSignedIn = true;
    mockCallable.mockReset();
    mockCallable.mockImplementation(async () => ({ data: { ok: true } }));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a change marks pending; a delivered record of the same choice clears it', async () => {
    const consent = load().createAiConsentModule(KEY, 'recordTest');
    await consent.setConsent('denied');
    expect(mockStore.get(KEY)).toBe('denied');
    expect(mockStore.get(PENDING)).toBe('denied');
    await expect(consent.recordToCloud()).resolves.toBe(true);
    expect(mockCallable).toHaveBeenCalledWith({ state: 'denied' });
    expect(mockStore.has(PENDING)).toBe(false);
  });

  it('no sign-in or a cloud error keeps the mark and reports false', async () => {
    const consent = load().createAiConsentModule(KEY, 'recordTest');
    await consent.setConsent('granted');
    mockSignedIn = false;
    await expect(consent.recordToCloud()).resolves.toBe(false);
    expect(mockStore.get(PENDING)).toBe('granted');
    mockSignedIn = true;
    mockCallable.mockImplementationOnce(async () => { throw new Error('unavailable'); });
    await expect(consent.recordToCloud()).resolves.toBe(false);
    expect(mockStore.get(PENDING)).toBe('granted');
  });

  it('a late answer for an older choice does not clear the mark of a newer one', async () => {
    const consent = load().createAiConsentModule(KEY, 'recordTest');
    await consent.setConsent('granted');
    let release!: () => void;
    mockCallable.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ data: { ok: true } }); }));
    const older = consent.recordToCloud();
    await new Promise((resolve) => setImmediate(resolve));
    await consent.setConsent('denied');
    release();
    await expect(older).resolves.toBe(true);
    expect(mockCallable).toHaveBeenCalledWith({ state: 'granted' });
    expect(mockStore.get(PENDING)).toBe('denied');
  });

  it('on launch, hydration finds the mark and resends the stored choice once, after the delay', async () => {
    mockStore.set(KEY, 'denied');
    mockStore.set(PENDING, 'denied');
    jest.useFakeTimers();
    const factory = load();
    const consent = factory.createAiConsentModule(KEY, 'recordTest');
    await consent.hydrateFromStorage();
    expect(consent.getState()).toBe('denied');
    expect(mockCallable).not.toHaveBeenCalled();
    jest.advanceTimersByTime(factory.AI_CONSENT_RESUME_DELAY_MS);
    jest.useRealTimers();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledWith({ state: 'denied' });
    expect(mockStore.has(PENDING)).toBe(false);
  });

  it('no mark — hydration sends nothing', async () => {
    mockStore.set(KEY, 'granted');
    jest.useFakeTimers();
    const factory = load();
    const consent = factory.createAiConsentModule(KEY, 'recordTest');
    await consent.hydrateFromStorage();
    jest.advanceTimersByTime(factory.AI_CONSENT_RESUME_DELAY_MS * 2);
    expect(mockCallable).not.toHaveBeenCalled();
  });
});
