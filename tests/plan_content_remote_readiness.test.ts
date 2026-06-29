import { PLAN_CONTENT_REMOTE_ENABLED } from '../app/course_pack_loader';

// Control the flag per-test without touching the const: mock the loader module.
let flagEnabled = false;
jest.mock('../app/course_pack_loader', () => ({
  get PLAN_CONTENT_REMOTE_ENABLED() { return flagEnabled; },
  get COURSE_PACK_REMOTE_LOADING_ENABLED() { return false; },
  resolveCoursePackReadiness: jest.fn(),
}));

// Mock the remote loader so we can simulate verified / corrupt / not-cached.
const readVerified = jest.fn<Promise<unknown>, [string, string]>();
const evict = jest.fn<Promise<void>, [string]>(() => Promise.resolve());
jest.mock('../app/course_pack_remote_loader', () => ({
  readVerifiedCoursePackDay: (cacheKey: string, rowPath: string) => readVerified(cacheKey, rowPath),
  evictCachedCoursePack: (cacheKey: string) => evict(cacheKey),
}));

// Mock the bundled registry so we have a known bundled day.
const BUNDLED_DAY = { planId: 'echo', dayIndex: 1, topic: { ru: 'bundled' } };
jest.mock('../app/plan_content_registry', () => ({
  getAuthoredPlanContentDay: jest.fn((planId: string, dayIndex: number) =>
    planId === 'echo' && dayIndex === 1 ? BUNDLED_DAY : undefined,
  ),
}));

import { resolveRemoteOrBundledPlanContentDay } from '../app/plan_content_remote_readiness';

describe('plan content remote readiness bridge', () => {
  beforeEach(() => {
    flagEnabled = false;
    readVerified.mockReset();
    evict.mockClear();
  });

  it('reads the dedicated plan_content remote flag (mocked here for control)', () => {
    // The real shipped value is true; this suite mocks it so each case can drive
    // enabled/disabled behavior deterministically.
    expect(typeof PLAN_CONTENT_REMOTE_ENABLED).toBe('boolean');
  });

  it('returns the bundled day and NEVER touches the loader while disabled', async () => {
    const r = await resolveRemoteOrBundledPlanContentDay('echo', 1, 'cache-key');
    expect(r).toEqual({ day: BUNDLED_DAY, source: 'bundled_compatibility', recoveredFromCorruption: false });
    expect(readVerified).not.toHaveBeenCalled();
  });

  it('returns bundled when no cacheKey is supplied (even if enabled)', async () => {
    flagEnabled = true;
    const r = await resolveRemoteOrBundledPlanContentDay('echo', 1);
    expect(r.source).toBe('bundled_compatibility');
    expect(r.day).toBe(BUNDLED_DAY);
    expect(readVerified).not.toHaveBeenCalled();
  });

  it('returns the verified server day when enabled and the cache verifies', async () => {
    flagEnabled = true;
    const SERVER_DAY = { planId: 'echo', dayIndex: 1, topic: { ru: 'server' } };
    readVerified.mockResolvedValue(SERVER_DAY);
    const r = await resolveRemoteOrBundledPlanContentDay('echo', 1, 'cache-key');
    expect(r).toEqual({ day: SERVER_DAY, source: 'downloaded_pack', recoveredFromCorruption: false });
    expect(readVerified).toHaveBeenCalledWith('cache-key', 'plans/echo/day-001.json');
  });

  it('evicts and falls back to bundled when the server copy is corrupt', async () => {
    flagEnabled = true;
    readVerified.mockResolvedValue({ corrupt: true });
    const r = await resolveRemoteOrBundledPlanContentDay('echo', 1, 'cache-key');
    expect(evict).toHaveBeenCalledWith('cache-key');
    expect(r).toEqual({ day: BUNDLED_DAY, source: 'bundled_compatibility', recoveredFromCorruption: true });
  });

  it('falls back to bundled while the pack is not yet cached', async () => {
    flagEnabled = true;
    readVerified.mockResolvedValue(null);
    const r = await resolveRemoteOrBundledPlanContentDay('echo', 1, 'cache-key');
    expect(r.source).toBe('bundled_compatibility');
    expect(r.day).toBe(BUNDLED_DAY);
  });

  it('never throws even if the loader rejects', async () => {
    flagEnabled = true;
    readVerified.mockRejectedValue(new Error('disk error'));
    const r = await resolveRemoteOrBundledPlanContentDay('echo', 1, 'cache-key');
    expect(r.source).toBe('bundled_compatibility');
  });

  it('reports missing only when bundled has no day either', async () => {
    flagEnabled = true;
    readVerified.mockResolvedValue(null);
    const r = await resolveRemoteOrBundledPlanContentDay('ghost', 99, 'cache-key');
    expect(r).toEqual({ day: null, source: 'missing', recoveredFromCorruption: false });
  });
});
