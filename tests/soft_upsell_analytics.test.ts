const firebaseLogEvent = jest.fn();
const capturePostHog = jest.fn();

jest.mock('../app/firebase', () => ({ logEvent: (...args: unknown[]) => firebaseLogEvent(...args) }));
jest.mock('../app/posthog_client', () => ({
  capturePostHog: (...args: unknown[]) => capturePostHog(...args),
  identifyPostHog: jest.fn(), resetPostHog: jest.fn(), isPostHogEnabled: () => true,
}));

// Jest mocks must be registered before this module import.
// eslint-disable-next-line import/first
import { SOFT_UPSELL_ANALYTICS_EVENTS, trackSoftUpsellEvent } from '../app/analytics';

const base = {
  context: 'first_lesson_success' as const,
  trigger: 'first_lesson' as const,
  studyTarget: 'en' as const,
  overlayOccupied: false,
  schemaVersion: 1 as const,
  triggerValue: 1,
};

beforeEach(() => { firebaseLogEvent.mockClear(); capturePostHog.mockClear(); });

test('publishes the exact finite soft-upsell event catalog', () => {
  expect(SOFT_UPSELL_ANALYTICS_EVENTS).toEqual([
    'soft_upsell_eligible', 'soft_upsell_impression', 'soft_upsell_cta',
    'soft_upsell_dismiss', 'soft_upsell_suppressed',
  ]);
});

test('forwards a valid bounded payload through the existing analytics path', async () => {
  await trackSoftUpsellEvent('soft_upsell_cta', { ...base, destination: 'personal_plan' });
  expect(capturePostHog).toHaveBeenCalledWith('soft_upsell_cta', {
    context: 'first_lesson_success', trigger: 'first_lesson', destination: 'personal_plan',
    studyTarget: 'en', overlayOccupied: false, schemaVersion: 1, triggerValue: 1,
  });
  expect(firebaseLogEvent).toHaveBeenCalled();
});

test.each([
  ['soft_upsell_eligible', base],
  ['soft_upsell_impression', { ...base, destination: 'personal_plan' }],
  ['soft_upsell_cta', { ...base, destination: 'personal_plan' }],
  ['soft_upsell_dismiss', base],
  ['soft_upsell_suppressed', { ...base, suppressionReason: 'disabled' }],
] as const)('forwards valid %s payload', async (event, payload) => {
  await trackSoftUpsellEvent(event, payload);
  expect(capturePostHog).toHaveBeenCalledTimes(1);
  expect(capturePostHog.mock.calls[0]?.[0]).toBe(event);
});

test.each([NaN, Infinity, -1, 10_001, 1.5])('rejects invalid triggerValue %p', async (triggerValue) => {
  await trackSoftUpsellEvent('soft_upsell_eligible', { ...base, triggerValue });
  expect(capturePostHog).not.toHaveBeenCalled();
});

test('strips arbitrary and free-text fields', async () => {
  await trackSoftUpsellEvent('soft_upsell_eligible', {
    ...base, userId: 'secret', reviewText: 'free text', rawError: 'raw', extra: 'extra',
  } as never);
  expect(capturePostHog.mock.calls[0]?.[1]).toEqual(base);
});

test('suppressed requires a bounded reason and other events reject inappropriate missing fields', async () => {
  await trackSoftUpsellEvent('soft_upsell_suppressed', base as never);
  await trackSoftUpsellEvent('soft_upsell_impression', base as never);
  await trackSoftUpsellEvent('soft_upsell_cta', base as never);
  await trackSoftUpsellEvent('soft_upsell_dismiss', { ...base, context: 'bad' } as never);
  expect(capturePostHog).not.toHaveBeenCalled();

  await trackSoftUpsellEvent('soft_upsell_suppressed', { ...base, suppressionReason: 'disabled' });
  expect(capturePostHog).toHaveBeenCalledTimes(1);
});

test.each([
  ['soft_upsell_eligible', { ...base, destination: 'paywall' }],
  ['soft_upsell_eligible', { ...base, suppressionReason: 'disabled' }],
  ['soft_upsell_impression', { ...base, destination: 'invalid' }],
  ['soft_upsell_impression', { ...base, destination: 'paywall', suppressionReason: 'disabled' }],
  ['soft_upsell_cta', { ...base, destination: 'invalid' }],
  ['soft_upsell_cta', { ...base, destination: 'paywall', suppressionReason: 'disabled' }],
  ['soft_upsell_dismiss', { ...base, destination: 'paywall' }],
  ['soft_upsell_dismiss', { ...base, suppressionReason: 'disabled' }],
  ['soft_upsell_suppressed', { ...base, destination: 'paywall', suppressionReason: 'disabled' }],
  ['soft_upsell_suppressed', { ...base, suppressionReason: 'not_a_reason' }],
] as const)('rejects invalid fields for %s', async (event, payload) => {
  await trackSoftUpsellEvent(event, payload as never);
  expect(capturePostHog).not.toHaveBeenCalled();
});
