import {
  buildExperimentExposurePayload,
  normalizeExperimentPassport,
  type ExperimentPassport,
} from '../app/analytics_experiments';

const valid: ExperimentPassport = {
  experimentId: 'paywall_v4_2026_07',
  definitionVersion: 1,
  assignmentSalt: 'locked-salt',
  allocation: { A: 50, B: 25, C: 25 },
  controlVariant: 'A',
  audience: 'paywall_eligible',
  primaryMetric: 'conversion.behavioral_purchase_completed.v1',
  guardrails: ['learning.weekly_effective_learner.v1', 'reliability.operation_failure.v1'],
  startUtc: '2026-07-14T00:00:00.000Z',
  endUtc: '2026-08-14T00:00:00.000Z',
  minimumSample: 500,
  maturityWindowDays: 7,
  stopRule: 'fixed_horizon',
  configRevision: 1,
  status: 'running',
};

describe('experiment passport and exposure', () => {
  it('requires control, predeclared metrics, dates, stop rule and exact allocation', () => {
    expect(normalizeExperimentPassport(valid)).toEqual(valid);
    expect(normalizeExperimentPassport({ ...valid, controlVariant: 'D' })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, primaryMetric: '' })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, guardrails: [] })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, allocation: { A: 70, B: 20, C: 20 } })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, endUtc: valid.startUtc })).toBeNull();
  });

  it('builds an allowlisted exposure without stable identity or free text', () => {
    const payload = buildExperimentExposurePayload({
      passport: valid,
      variantId: 'B',
      exposureId: 'impression-1',
      surface: 'paywall',
      assignmentQuality: 'frozen',
      occurredAtMs: 123,
    });
    expect(payload).toEqual({
      schema_version: 1,
      event_id: 'impression-1',
      experiment_id: valid.experimentId,
      definition_version: 1,
      variant_id: 'B',
      control_variant_id: 'A',
      exposure_id: 'impression-1',
      surface: 'paywall',
      config_revision: 1,
      assignment_quality: 'frozen',
      app_version: expect.any(String),
      build_number: expect.any(String),
      occurred_at_ms: 123,
    });
    expect(JSON.stringify(payload)).not.toContain('stable');
  });

  it('rejects pending fallback and variant mismatch from causal exposure', () => {
    expect(() => buildExperimentExposurePayload({ passport: valid, variantId: 'A', exposureId: 'x', surface: 'paywall', assignmentQuality: 'pending_fallback', occurredAtMs: 1 })).toThrow('experiment_exposure_not_analyzable');
    expect(() => buildExperimentExposurePayload({ passport: valid, variantId: 'D' as 'A', exposureId: 'x', surface: 'paywall', assignmentQuality: 'frozen', occurredAtMs: 1 })).toThrow('experiment_variant_invalid');
  });
});
