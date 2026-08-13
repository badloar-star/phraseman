const trackEvent = jest.fn<Promise<void>, [string, Record<string, unknown>?]>(() => Promise.resolve());
jest.mock('../app/analytics', () => ({ trackEvent: (event: string, props?: Record<string, unknown>) => trackEvent(event, props) }));

import {
  recordPlanContentSource,
  telemetryFromRemoteDay,
  type PlanContentTelemetryRecord,
} from '../app/plan_content_remote_telemetry';
import type { PlanContentRemoteDay } from '../app/plan_content_remote_readiness';

function rec(over: Partial<PlanContentTelemetryRecord> = {}): PlanContentTelemetryRecord {
  return {
    planId: 'echo', dayIndex: 1, surface: 'theory',
    source: 'downloaded_pack', reason: '', recoveredFromCorruption: false,
    ...over,
  };
}

describe('plan content remote telemetry', () => {
  beforeEach(() => {
    trackEvent.mockClear();
    // reset module dedup map between tests
    jest.resetModules();
  });

  it('emits plan_content_source on a verified server day, no fallback event', async () => {
    const { recordPlanContentSource: r } = await import('../app/plan_content_remote_telemetry');
    r(rec({ source: 'downloaded_pack' }));
    const names = trackEvent.mock.calls.map((c) => c[0]);
    expect(names).toContain('plan_content_source');
    expect(names).not.toContain('plan_content_fallback');
  });

  it('emits BOTH plan_content_source and plan_content_fallback on a bundled fallback', async () => {
    const { recordPlanContentSource: r } = await import('../app/plan_content_remote_telemetry');
    r(rec({ source: 'bundled_compatibility', reason: 'pack_not_cached' }));
    const names = trackEvent.mock.calls.map((c) => c[0]);
    expect(names).toContain('plan_content_source');
    expect(names).toContain('plan_content_fallback');
    const fallbackProps = trackEvent.mock.calls.find((c) => c[0] === 'plan_content_fallback')?.[1];
    expect(fallbackProps).toMatchObject({ planId: 'echo', dayIndex: 1, surface: 'theory', source: 'bundled_compatibility', reason: 'pack_not_cached' });
  });

  it('dedups identical decisions within the window (no flood from re-renders)', async () => {
    const { recordPlanContentSource: r } = await import('../app/plan_content_remote_telemetry');
    r(rec({ source: 'downloaded_pack' }));
    r(rec({ source: 'downloaded_pack' }));
    r(rec({ source: 'downloaded_pack' }));
    const sourceCalls = trackEvent.mock.calls.filter((c) => c[0] === 'plan_content_source');
    expect(sourceCalls).toHaveLength(1);
  });

  it('does NOT dedup when the situation actually changed (source flip)', async () => {
    const { recordPlanContentSource: r } = await import('../app/plan_content_remote_telemetry');
    r(rec({ source: 'downloaded_pack' }));
    r(rec({ source: 'bundled_compatibility', reason: 'integrity_failure', recoveredFromCorruption: true }));
    const sourceCalls = trackEvent.mock.calls.filter((c) => c[0] === 'plan_content_source');
    expect(sourceCalls).toHaveLength(2);
  });

  it('never throws even when trackEvent rejects', async () => {
    trackEvent.mockImplementation(() => { throw new Error('analytics down'); });
    const { recordPlanContentSource: r } = await import('../app/plan_content_remote_telemetry');
    expect(() => r(rec({ source: 'bundled_compatibility', reason: 'network_unavailable' }))).not.toThrow();
  });

  it('telemetryFromRemoteDay derives reason from bridge result', () => {
    const verified: PlanContentRemoteDay = { day: { planId: 'echo', dayIndex: 1 } as never, source: 'downloaded_pack', recoveredFromCorruption: false };
    const corrupt: PlanContentRemoteDay = { day: { planId: 'echo', dayIndex: 1 } as never, source: 'bundled_compatibility', recoveredFromCorruption: true };
    const notCached: PlanContentRemoteDay = { day: { planId: 'echo', dayIndex: 1 } as never, source: 'bundled_compatibility', recoveredFromCorruption: false };
    const missing: PlanContentRemoteDay = { day: null, source: 'missing', recoveredFromCorruption: false };
    expect(telemetryFromRemoteDay('echo', 1, 'theory', verified).reason).toBe('');
    expect(telemetryFromRemoteDay('echo', 1, 'theory', corrupt).reason).toBe('integrity_failure');
    expect(telemetryFromRemoteDay('echo', 1, 'theory', notCached).reason).toBe('pack_not_cached');
    // extraReason refines the cause when the bridge alone can't tell — here
    // 'remote_disabled' is more specific than the generic 'pack_not_cached'.
    expect(telemetryFromRemoteDay('echo', 1, 'theory', notCached, 'remote_disabled').reason).toBe('remote_disabled');
    expect(telemetryFromRemoteDay('echo', 1, 'theory', missing).reason).toBe('no_bundled_day');
  });
});
