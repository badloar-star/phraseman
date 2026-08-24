import {
  PERSONAL_PLAN_GRANDFATHER_CUTOFF_AT_MS,
  PERSONAL_PLAN_SUNSET_AT_MS,
  formatPersonalPlanSunsetCountdown,
  hasPersonalPlanRouteMarker,
  resolvePersonalPlanPremiumProbe,
  resolvePersonalPlanSunsetAccess,
  splitPersonalPlanSunsetCountdown,
} from '../app/personal_plan_sunset';

const ELIGIBLE_CREATED_AT = '2026-08-20T12:00:00.000Z';

describe('Personal Plan sunset access contract', () => {
  test('uses the fixed grandfather cutoff and fixed global sunset', () => {
    expect(PERSONAL_PLAN_GRANDFATHER_CUTOFF_AT_MS)
      .toBe(Date.parse('2026-08-20T23:59:59.999Z'));
    expect(PERSONAL_PLAN_SUNSET_AT_MS)
      .toBe(Date.parse('2026-10-20T00:00:00.000Z'));
  });

  test.each(['active', 'paused', 'completed'] as const)(
    'grandfathers a persisted %s plan created by the cutoff before sunset',
    (status) => {
      expect(resolvePersonalPlanSunsetAccess({
        hasOriginalFeatureAccess: true,
        savedState: { status, createdAt: ELIGIBLE_CREATED_AT },
        nowMs: PERSONAL_PLAN_SUNSET_AT_MS - 1,
      })).toEqual({ status: 'allowed', grandfathered: true });
    },
  );

  test('keeps the original premium/remote gate as an additional requirement', () => {
    expect(resolvePersonalPlanSunsetAccess({
      hasOriginalFeatureAccess: false,
      savedState: { status: 'active', createdAt: ELIGIBLE_CREATED_AT },
      nowMs: PERSONAL_PLAN_SUNSET_AT_MS - 1,
    })).toEqual({ status: 'needs_original_access', grandfathered: true });
  });

  test.each([
    ['missing state', null],
    ['missing status', { createdAt: ELIGIBLE_CREATED_AT }],
    ['invalid status', { status: 'bogus', createdAt: ELIGIBLE_CREATED_AT }],
    ['missing createdAt', { status: 'active' as const }],
    ['invalid createdAt', { status: 'active' as const, createdAt: 'not-a-date' }],
    ['created after cutoff', { status: 'active' as const, createdAt: '2026-08-21T00:00:00.000Z' }],
  ])('fails closed for %s', (_label, savedState) => {
    expect(resolvePersonalPlanSunsetAccess({
      hasOriginalFeatureAccess: true,
      savedState,
      nowMs: PERSONAL_PLAN_SUNSET_AT_MS - 1,
    })).toEqual({ status: 'not_grandfathered', grandfathered: false });
  });

  test('does not trust stale cached premium before access resolution', () => {
    expect(resolvePersonalPlanPremiumProbe({
      mode: 'premium-required',
      accessResolved: false,
      featureRequiresPremium: true,
      featureAccess: true,
    })).toBe('verify');
    expect(resolvePersonalPlanPremiumProbe({
      mode: 'premium-required',
      accessResolved: false,
      featureRequiresPremium: false,
      featureAccess: false,
    })).toBe('allowed');
  });

  test('allows the last millisecond before sunset and expires exactly at the boundary', () => {
    const input = {
      hasOriginalFeatureAccess: true,
      savedState: { status: 'active' as const, createdAt: ELIGIBLE_CREATED_AT },
    };
    expect(resolvePersonalPlanSunsetAccess({ ...input, nowMs: PERSONAL_PLAN_SUNSET_AT_MS - 1 }).status)
      .toBe('allowed');
    expect(resolvePersonalPlanSunsetAccess({ ...input, nowMs: PERSONAL_PLAN_SUNSET_AT_MS }).status)
      .toBe('expired');
    expect(resolvePersonalPlanSunsetAccess({ ...input, nowMs: PERSONAL_PLAN_SUNSET_AT_MS + 1 }).status)
      .toBe('expired');
  });
});

describe('Personal Plan sunset countdown', () => {
  test('splits remaining time without going negative', () => {
    expect(splitPersonalPlanSunsetCountdown(PERSONAL_PLAN_SUNSET_AT_MS - 90_061_000)).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
      expired: false,
    });
    expect(splitPersonalPlanSunsetCountdown(PERSONAL_PLAN_SUNSET_AT_MS)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    });
  });

  test('formats a stable day/hour/minute/second timer', () => {
    expect(formatPersonalPlanSunsetCountdown(PERSONAL_PLAN_SUNSET_AT_MS - 90_061_000))
      .toBe('01:01:01:01');
    expect(formatPersonalPlanSunsetCountdown(PERSONAL_PLAN_SUNSET_AT_MS + 10_000))
      .toBe('00:00:00:00');
  });
});

describe('shared route marker classification', () => {
  test('recognizes only an explicit value of 1 for a real plan marker', () => {
    expect(hasPersonalPlanRouteMarker({ planTask: '1' }, ['planTask'])).toBe(true);
    expect(hasPersonalPlanRouteMarker({ planPracticeTask: ['1'] }, ['planPracticeTask'])).toBe(true);
    expect(hasPersonalPlanRouteMarker({ planTask: '0' }, ['planTask'])).toBe(false);
    expect(hasPersonalPlanRouteMarker({ planTask: 'true' }, ['planTask'])).toBe(false);
    expect(hasPersonalPlanRouteMarker({}, ['planTask'])).toBe(false);
  });
});
