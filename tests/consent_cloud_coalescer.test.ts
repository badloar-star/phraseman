// зачем (Дизайн через координатора 12.10, R1_SETTINGS_OPTIMISTIC_UI.md E-2): серия быстрых тапов по тумблеру согласия — ОДНА запись
// в облако с последним положением (trailing 1,5 с), при уходе в фон — сразу; ключи не мешают друг другу.
const mockAppStateListeners: ((state: string) => void)[] = [];
jest.mock('react-native', () => ({
  AppState: { addEventListener: (_event: string, listener: (state: string) => void) => { mockAppStateListeners.push(listener); return { remove: jest.fn() }; } },
}));

type Coalescer = typeof import('../app/consent_cloud_coalescer');

function load(): Coalescer {
  let mod!: Coalescer;
  jest.isolateModules(() => { mod = require('../app/consent_cloud_coalescer'); });
  return mod;
}

describe('consent cloud coalescer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAppStateListeners.length = 0;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('five quick taps send once, with the last send, 1.5 s after the last tap', () => {
    const c = load();
    const sends = [1, 2, 3, 4, 5].map((n) => jest.fn(async () => n));
    for (const send of sends) {
      c.scheduleConsentCloudRecord('analytics', send);
      jest.advanceTimersByTime(300);
    }
    expect(sends.every((s) => s.mock.calls.length === 0)).toBe(true);
    jest.advanceTimersByTime(c.CONSENT_CLOUD_COALESCE_MS - 300 - 1);
    expect(sends[4]).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(sends.slice(0, 4).every((s) => s.mock.calls.length === 0)).toBe(true);
    expect(sends[4]).toHaveBeenCalledTimes(1);
    expect(c.hasPendingConsentCloudRecordForTest('analytics')).toBe(false);
  });

  it('keys are independent: one tap on each switch is one send each', () => {
    const c = load();
    const analytics = jest.fn(async () => true);
    const dialog = jest.fn(async () => false);
    c.scheduleConsentCloudRecord('analytics', analytics);
    c.scheduleConsentCloudRecord('ai_dialog', dialog);
    jest.advanceTimersByTime(c.CONSENT_CLOUD_COALESCE_MS);
    expect(analytics).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveBeenCalledTimes(1);
  });

  it('going to the background sends the pending record at once, and the timer does not send it twice', () => {
    const c = load();
    const send = jest.fn(async () => true);
    c.scheduleConsentCloudRecord('ai_explain', send);
    expect(mockAppStateListeners).toHaveLength(1);
    mockAppStateListeners[0]('background');
    expect(send).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(c.CONSENT_CLOUD_COALESCE_MS * 2);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('a failed or throwing send is logged, not thrown, and the next tap schedules again', async () => {
    const c = load();
    const warn = console.warn as jest.Mock;
    c.scheduleConsentCloudRecord('analytics', () => Promise.reject(new Error('offline')));
    jest.advanceTimersByTime(c.CONSENT_CLOUD_COALESCE_MS);
    await Promise.resolve();
    await Promise.resolve();
    expect(warn.mock.calls.some(([line]) => String(line).includes('reason=offline'))).toBe(true);
    c.scheduleConsentCloudRecord('analytics', () => { throw new Error('sync boom'); });
    expect(() => jest.advanceTimersByTime(c.CONSENT_CLOUD_COALESCE_MS)).not.toThrow();
    const next = jest.fn(async () => true);
    c.scheduleConsentCloudRecord('analytics', next);
    jest.advanceTimersByTime(c.CONSENT_CLOUD_COALESCE_MS);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
