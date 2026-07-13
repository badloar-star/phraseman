import {
  createSoftUpsellAttribution,
  parseSoftUpsellAttribution,
  softUpsellEventId,
  softUpsellRouteParams,
} from '../app/soft_upsell_attribution';

const valid = {
  impressionId: '12345678-1234-1234-1234-123456789abc',
  trigger: 'first_lesson' as const,
  context: 'first_lesson_success' as const,
  mode: 'production' as const,
};

test('round-trips only the four governed route fields', () => {
  const attribution = createSoftUpsellAttribution(valid);
  expect(softUpsellRouteParams(attribution)).toEqual({
    soft_upsell_impression_id: valid.impressionId,
    soft_upsell_trigger: valid.trigger,
    soft_upsell_context: valid.context,
    soft_upsell_mode: valid.mode,
  });
  expect(parseSoftUpsellAttribution(softUpsellRouteParams(attribution))).toEqual(attribution);
});

test.each([
  {},
  { ...softUpsellRouteParams(valid), soft_upsell_mode: undefined },
  { ...softUpsellRouteParams(valid), soft_upsell_trigger: 'weekly_review' },
  { ...softUpsellRouteParams(valid), soft_upsell_context: 'weekly_review' },
  { ...softUpsellRouteParams(valid), soft_upsell_mode: 'qa' },
  { ...softUpsellRouteParams(valid), soft_upsell_impression_id: 'x'.repeat(81) },
  { ...softUpsellRouteParams(valid), soft_upsell_impression_id: ['bad', 'array'] },
])('atomically rejects missing, forged, or unbounded params %#', (params) => {
  expect(parseSoftUpsellAttribution(params)).toBeNull();
});

test('creates bounded stable semantic event ids', () => {
  const attribution = createSoftUpsellAttribution(valid);
  expect(softUpsellEventId(attribution, 'purchase_completed_attempt_123')).toBe(
    softUpsellEventId(attribution, 'purchase_completed_attempt_123'),
  );
  expect(softUpsellEventId(attribution, 'x'.repeat(200)).length).toBeLessThanOrEqual(80);
});

test('rejects invalid generated IDs and mismatched pairs', () => {
  expect(() => createSoftUpsellAttribution({ ...valid, impressionId: '' })).toThrow();
  expect(() => createSoftUpsellAttribution({ ...valid, context: 'weekly_review' })).toThrow();
});
