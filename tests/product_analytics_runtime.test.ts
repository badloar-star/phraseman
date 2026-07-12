import { createProductAnalyticsRuntime } from '../app/product_analytics_runtime';

const context = {
  platform: 'ios' as const,
  appVersion: '2.0.0',
  buildNumber: '200',
  studyTarget: 'en',
};

describe('product analytics runtime', () => {
  let now = 1_000;
  let id = 0;
  const emitted: any[] = [];
  const sessionChanges: Array<string | null> = [];

  beforeEach(() => {
    now = 1_000;
    id = 0;
    emitted.length = 0;
    sessionChanges.length = 0;
  });

  const runtime = () => createProductAnalyticsRuntime({
    emit: (event) => emitted.push(event),
    now: () => now,
    createId: () => `id-${++id}`,
    context: () => context,
    onSessionIdChanged: (sessionId) => sessionChanges.push(sessionId),
  });

  it('emits nothing before consent', () => {
    const tracker = runtime();
    tracker.setCurrentScreen('home');
    tracker.setConsent(false);
    expect(emitted).toEqual([]);
  });

  it('starts one session and one screen view when consent becomes granted', () => {
    const tracker = runtime();
    tracker.setCurrentScreen('home');
    tracker.setConsent(true);
    tracker.setConsent(true);
    expect(emitted.map((event) => event.eventName)).toEqual([
      'product_session_start',
      'product_screen_view',
    ]);
    expect(new Set(emitted.map((event) => event.sessionId)).size).toBe(1);
  });

  it('emits leave then view on a route transition and ignores repeat renders', () => {
    const tracker = runtime();
    tracker.setCurrentScreen('home');
    tracker.setConsent(true);
    now = 2_000;
    tracker.setCurrentScreen('lesson');
    tracker.setCurrentScreen('lesson');
    expect(emitted.slice(-2).map((event) => event.eventName)).toEqual([
      'product_screen_leave',
      'product_screen_view',
    ]);
    expect(emitted.at(-2)).toMatchObject({ screenId: 'home', durationMs: 1_000, leaveReason: 'route_change' });
  });

  it('resumes the session after a short background and starts a new one after 30 minutes', () => {
    const tracker = runtime();
    tracker.setCurrentScreen('home');
    tracker.setConsent(true);
    const firstSession = emitted[0].sessionId;
    now = 2_000;
    tracker.setAppActive(false);
    now = 10_000;
    tracker.setAppActive(true);
    expect(emitted.at(-2).eventName).toBe('product_session_resume');
    expect(emitted.at(-2).sessionId).toBe(firstSession);

    now = 20_000;
    tracker.setAppActive(false);
    now = 20_000 + 30 * 60 * 1_000 + 1;
    tracker.setAppActive(true);
    expect(emitted.at(-2).eventName).toBe('product_session_start');
    expect(emitted.at(-2).sessionId).not.toBe(firstSession);
  });

  it('stops immediately when consent is withdrawn', () => {
    const tracker = runtime();
    tracker.setCurrentScreen('home');
    tracker.setConsent(true);
    tracker.setConsent(false);
    tracker.setCurrentScreen('lesson');
    tracker.setAppActive(false);
    expect(emitted).toHaveLength(2);
    expect(sessionChanges.at(-1)).toBeNull();
  });

  it('publishes the current session id and rotates it after a long background', () => {
    const tracker = runtime();
    tracker.setConsent(true);
    const first = sessionChanges.at(-1);
    expect(first).toMatch(/^id-/);
    now += 1_000;
    tracker.setAppActive(false);
    now += 30 * 60 * 1_000 + 1;
    tracker.setAppActive(true);
    expect(sessionChanges.at(-1)).not.toBe(first);
  });
});
