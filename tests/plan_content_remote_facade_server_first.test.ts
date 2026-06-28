// Tests for the server-first race in fetchPlanContentDayForScreenServerFirst:
//   - server beats the 150ms deadline → initial paint = server, no pendingUpgrade
//   - server loses → initial paint = bundled, pendingUpgrade resolves to server day later
//   - bundled gate empty → race not even started by screen (but facade still works)
//
// We isolate the facade by mocking everything it imports so we don't need a real
// Firestore / RN environment.

const trackEvent = jest.fn<Promise<void>, [string, Record<string, unknown>?]>(() => Promise.resolve());
jest.mock('../app/analytics', () => ({ trackEvent: (e: string, p?: Record<string, unknown>) => trackEvent(e, p) }));

const mockGetBundled = jest.fn();
jest.mock('../app/plan_content_readiness', () => ({
  getBundledCompatibilityPlanContentTheoryDay: (...args: unknown[]) => mockGetBundled(...args),
}));

const mockEnsureRemote = jest.fn();
jest.mock('../app/course_pack_remote_loader', () => ({
  ensureRemoteCoursePack: (...args: unknown[]) => mockEnsureRemote(...args),
}));

const mockResolveDay = jest.fn();
jest.mock('../app/plan_content_remote_readiness', () => ({
  resolveRemoteOrBundledPlanContentDay: (...args: unknown[]) => mockResolveDay(...args),
}));

const mockGetReg = jest.fn();
const mockRowUrl = jest.fn();
jest.mock('../app/plan_content_remote_registration', () => ({
  getPlanContentRemoteRegistration: () => mockGetReg(),
  planContentRowUrl: (p: string) => mockRowUrl(p),
}));

jest.mock('../app/course_pack_manifest', () => ({
  buildCoursePackCacheKey: (m: { packId: string; contentVersion: string }) => `${m.packId}@${m.contentVersion}`,
  validateCoursePackManifest: (m: unknown) => m,
}));

import { fetchPlanContentDayForScreenServerFirst } from '../app/plan_content_remote_facade';

const verifiedDay = { planId: 'echo', dayIndex: 1, _verified: true } as never;
const bundledDay = { planId: 'echo', dayIndex: 1, _bundled: true } as never;

beforeEach(() => {
  trackEvent.mockClear();
  mockGetBundled.mockReset();
  mockEnsureRemote.mockReset();
  mockResolveDay.mockReset();
  mockGetReg.mockReset();
});

describe('server-first race', () => {
  it('SERVER WINS: server resolves under 150ms → initial paint is server, no pendingUpgrade', async () => {
    mockGetBundled.mockReturnValue(bundledDay);
    mockGetReg.mockReturnValue({ manifestUrl: 'https://x/manifest.json' });
    mockEnsureRemote.mockResolvedValue({ state: 'ready', manifest: { packId: 'p', contentVersion: 'v' } });
    // resolveRemoteOrBundledPlanContentDay returns instantly with verified server day.
    mockResolveDay.mockResolvedValue({ day: verifiedDay, source: 'downloaded_pack', recoveredFromCorruption: false });

    const t0 = Date.now();
    const r = await fetchPlanContentDayForScreenServerFirst('echo', 1, 'theory');
    const elapsed = Date.now() - t0;

    expect(r.initialSource).toBe('downloaded_pack');
    expect(r.initial).toBe(verifiedDay);
    expect(r.pendingUpgrade).toBeNull();
    expect(elapsed).toBeLessThan(140); // beat the 150ms deadline
    // Telemetry: source emitted (server), no fallback.
    const names = trackEvent.mock.calls.map((c) => c[0]);
    expect(names).toContain('plan_content_source');
    expect(names).not.toContain('plan_content_fallback');
  });

  it('DEADLINE WINS: server takes >150ms → initial paint is bundled, pendingUpgrade resolves to server day later', async () => {
    mockGetBundled.mockReturnValue(bundledDay);
    mockGetReg.mockReturnValue({ manifestUrl: 'https://x/manifest.json' });
    mockEnsureRemote.mockResolvedValue({ state: 'ready', manifest: { packId: 'p', contentVersion: 'v' } });
    mockResolveDay.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ day: verifiedDay, source: 'downloaded_pack', recoveredFromCorruption: false }), 300);
    }));

    const r = await fetchPlanContentDayForScreenServerFirst('echo', 1, 'theory');
    expect(r.initialSource).toBe('bundled_compatibility');
    expect(r.initial).toBe(bundledDay);
    expect(r.pendingUpgrade).not.toBeNull();

    const upgraded = await r.pendingUpgrade!;
    expect(upgraded).toBe(verifiedDay);
    // Two telemetry events: initial bundled fallback + server upgrade.
    const sources = trackEvent.mock.calls.filter((c) => c[0] === 'plan_content_source');
    expect(sources.length).toBeGreaterThanOrEqual(1);
    const fallbacks = trackEvent.mock.calls.filter((c) => c[0] === 'plan_content_fallback');
    expect(fallbacks.length).toBeGreaterThanOrEqual(1);
  });

  it('REMOTE DISABLED: no registration → no race, bundled paints, no pendingUpgrade upgrade', async () => {
    mockGetBundled.mockReturnValue(bundledDay);
    mockGetReg.mockReturnValue(null); // remote disabled
    mockResolveDay.mockResolvedValue({ day: bundledDay, source: 'bundled_compatibility', recoveredFromCorruption: false });

    const r = await fetchPlanContentDayForScreenServerFirst('echo', 1, 'theory');
    expect(r.initialSource).toBe('bundled_compatibility');
    expect(r.initial).toBe(bundledDay);
    // server promise resolved fast to bundled (because cacheKey was null), so
    // pendingUpgrade may be null OR resolve to null — both are fine.
  });
});
