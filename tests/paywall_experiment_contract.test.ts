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

const validSevenWay: ExperimentPassport = {
  ...valid,
  experimentId: 'paywall_v5_2026_08',
  allocation: { A: 40, B: 10, C: 10, D: 10, E: 10, F: 10, G: 10 },
  controlVariant: 'A',
};

describe('experiment passport and exposure', () => {
  it('requires control, predeclared metrics, dates, stop rule and exact allocation', () => {
    expect(normalizeExperimentPassport(valid)).toEqual(valid);
    // Неизвестная буква контроля (H/Z не существуют) → паспорт невалиден.
    expect(normalizeExperimentPassport({ ...valid, controlVariant: 'H' })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, controlVariant: 'Z' })).toBeNull();
    // Контроль обязан входить в allocation с долей > 0.
    expect(normalizeExperimentPassport({ ...valid, controlVariant: 'D' })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, primaryMetric: '' })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, guardrails: [] })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, allocation: { A: 70, B: 20, C: 20 } })).toBeNull();
    expect(normalizeExperimentPassport({ ...valid, endUtc: valid.startUtc })).toBeNull();
  });

  it('accepts allocations over A–G and rejects malformed ones', () => {
    // 7-сторонний сплит с контролем A — валиден.
    expect(normalizeExperimentPassport(validSevenWay)).toEqual(validSevenWay);
    // Подмножество новых вариантов — валидно (контроль входит, сумма 100).
    const subset: ExperimentPassport = { ...valid, allocation: { A: 50, D: 50 } };
    expect(normalizeExperimentPassport(subset)).toEqual(subset);
    const noAbc = { ...valid, allocation: { D: 50, E: 25, G: 25 }, controlVariant: 'D' as const };
    expect(normalizeExperimentPassport(noAbc)).toEqual(noAbc);
    // Неизвестная буква в allocation → невалиден.
    expect(normalizeExperimentPassport({ ...valid, allocation: { A: 50, B: 25, C: 25, H: 0 } })).toBeNull();
    // Один вариант — невалиден (нужно минимум 2).
    expect(normalizeExperimentPassport({ ...valid, allocation: { A: 100 } })).toBeNull();
    // Сумма ≠ 100 — невалидна.
    expect(normalizeExperimentPassport({ ...validSevenWay, allocation: { A: 40, B: 10, C: 10, D: 10, E: 10, F: 10, G: 5 } })).toBeNull();
    // Дробные/нечисловые доли — невалидны.
    expect(normalizeExperimentPassport({ ...valid, allocation: { A: 50.5, B: 49.5 } })).toBeNull();
    // Контроль с нулевой долей — невалиден.
    expect(normalizeExperimentPassport({ ...valid, allocation: { A: 0, B: 60, C: 40 } })).toBeNull();
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

  it('builds exposure for the new variants when allocation includes them', () => {
    for (const variantId of ['D', 'E', 'F', 'G'] as const) {
      const payload = buildExperimentExposurePayload({
        passport: validSevenWay,
        variantId,
        exposureId: `imp-${variantId}`,
        surface: 'paywall',
        assignmentQuality: 'frozen',
        occurredAtMs: 5,
      });
      expect(payload.variant_id).toBe(variantId);
      expect(payload.control_variant_id).toBe('A');
    }
  });

  it('rejects pending fallback and variant mismatch from causal exposure', () => {
    expect(() => buildExperimentExposurePayload({ passport: valid, variantId: 'A', exposureId: 'x', surface: 'paywall', assignmentQuality: 'pending_fallback', occurredAtMs: 1 })).toThrow('experiment_exposure_not_analyzable');
    // D — валидная буква, но её нет в allocation {A,B,C} → exposure отклоняется.
    expect(() => buildExperimentExposurePayload({ passport: valid, variantId: 'D', exposureId: 'x', surface: 'paywall', assignmentQuality: 'frozen', occurredAtMs: 1 })).toThrow('experiment_variant_invalid');
    // Вариант с нулевой долей в allocation — тоже не causal exposure.
    expect(() => buildExperimentExposurePayload({ passport: validSevenWay, variantId: 'H' as never, exposureId: 'x', surface: 'paywall', assignmentQuality: 'frozen', occurredAtMs: 1 })).toThrow('experiment_variant_invalid');
  });
});
