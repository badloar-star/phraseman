import { aggregateContentFactoryRolloutMetrics, deriveContentFactoryRolloutMetricsFromDocuments } from './rollout_metrics';

describe('content factory rollout metrics', () => {
  it('aggregates normalized quality, latency, correction and budget-proxy metrics', () => {
    const metrics = aggregateContentFactoryRolloutMetrics({
      window: { fromMs: 1000, toMs: 5000 },
      attempts: [
        { artifactId: 'a1', accepted: true, failureCode: null, qaStatus: 'passed', qaScore: 0.98, operatorCorrected: false, latencyMs: 100, reservedBudgetUnits: 1, consumedBudgetUnits: 1 },
        { artifactId: 'a2', accepted: false, failureCode: 'provider_rate_limit', qaStatus: 'failed', qaScore: 0.6, operatorCorrected: true, latencyMs: 300, reservedBudgetUnits: 1, consumedBudgetUnits: 0 },
        { artifactId: 'a2', accepted: true, failureCode: null, qaStatus: 'passed', qaScore: 0.9, operatorCorrected: true, latencyMs: 200, reservedBudgetUnits: 1, consumedBudgetUnits: 1 },
      ],
      budgetCapUnits: 10,
    });
    expect(metrics).toMatchObject({
      attemptCount: 3,
      acceptedArtifactCount: 2,
      attemptsPerAcceptedArtifact: 1.5,
      failuresByCategory: { provider_rate_limit: 1 },
      qa: { passed: 2, failed: 1, unscored: 0, averageScore: 0.8267 },
      operatorCorrectionRate: 0.5,
      operatorCorrection: { status: 'available', collectedAcceptedArtifacts: 2, correctedAcceptedArtifacts: 1 },
      latencyMs: { p50: 200, p95: 300 },
      budgetProxy: { reservedUnits: 3, consumedUnits: 2, capUnits: 10, utilization: 0.3, unit: 'generation_reservations', label: 'budget_proxy_not_billed_cost' },
    });
  });

  it('reports operator correction as unavailable instead of a misleading zero', () => {
    const metrics = aggregateContentFactoryRolloutMetrics({ window: { fromMs: 1, toMs: 2 }, attempts: [{ artifactId: 'a1', accepted: true }], budgetCapUnits: 0 });
    expect(metrics).toMatchObject({ operatorCorrectionRate: 0, operatorCorrection: { status: 'unavailable_not_collected', collectedAcceptedArtifacts: 0 } });
  });

  it('defines zero-denominator behavior and rejects invalid or unbounded input', () => {
    expect(aggregateContentFactoryRolloutMetrics({ window: { fromMs: 1, toMs: 2 }, attempts: [], budgetCapUnits: 0 })).toMatchObject({ attemptsPerAcceptedArtifact: 0, operatorCorrectionRate: 0, latencyMs: { p50: 0, p95: 0 } });
    expect(() => aggregateContentFactoryRolloutMetrics({ window: { fromMs: 2, toMs: 1 }, attempts: [], budgetCapUnits: 0 })).toThrow('rollout_metrics_window_invalid');
    expect(() => aggregateContentFactoryRolloutMetrics({ window: { fromMs: 1, toMs: 2 }, attempts: Array.from({ length: 5001 }, () => ({})), budgetCapUnits: 0 })).toThrow('rollout_metrics_input_too_large');
    expect(() => aggregateContentFactoryRolloutMetrics({ window: { fromMs: 1, toMs: 2 }, attempts: [{ latencyMs: -1 }], budgetCapUnits: 0 })).toThrow('rollout_metrics_attempt_invalid');
  });

  it('derives canonical bounded metrics from sanitized stage and job documents', () => {
    const metrics = deriveContentFactoryRolloutMetricsFromDocuments({
      nowMs: 10_000,
      stageDocs: [
        { id: 's1', artifactId: 'a1', state: 'approved', attempts: 2, startedAtMs: 1000, completedAtMs: 3000, qaReceipt: { status: 'passed', score: 0.95 }, operatorCorrected: true, attemptHistory: [{ errorCode: 'RESOURCE_EXHAUSTED' }] },
        { id: 's2', state: 'failed', attempts: 1, startedAtMs: 4000, completedAtMs: 5000, errorCode: 'generation_stage_schema_failed', qaReceipt: { status: 'failed', score: 0.4 } },
      ],
      unitDocs: [
        { id: 'u1', unitId: 'legacy-1', contentHash: 'f'.repeat(64), state: 'succeeded', attempts: 2, startedAtMs: 6000, completedAtMs: 9000, qaReceipt: { status: 'passed', score: 0.8 }, attemptHistory: [{ code: 'provider_rate_limit' }] },
      ],
      jobDocs: [{ id: 'j1', state: 'partial', createdAtMs: 500, updatedAtMs: 6000 }],
      budgetCapUnits: 500,
      budgetReservedUnits: 2,
    });
    expect(metrics).toMatchObject({ isPartial: false, rolloutEligible: true, documentCount: 4, unitDocumentCount: 1, attemptCount: 5, acceptedArtifactCount: 2, attemptsPerAcceptedArtifact: 2.5, failuresByCategory: { provider_rate_limit: 2, schema_validation: 1 }, operatorCorrectionRate: 0.5, latencyMs: { p50: 1000, p95: 3000 }, budgetProxy: { reservedUnits: 2, consumedUnits: 0, capUnits: 500, utilization: 0.004, unit: 'generation_reservations', label: 'budget_proxy_not_billed_cost' }, populations: { staged: { attemptCount: 3, acceptedArtifactCount: 1 }, legacy: { attemptCount: 2, acceptedArtifactCount: 1, failuresByCategory: { provider_rate_limit: 1 }, latencyMs: { p95: 3000 } } }, samples: { stages: { returned: 2, limit: 100, truncated: false }, units: { returned: 1, limit: 100, truncated: false }, jobs: { returned: 1, limit: 100, truncated: false } } });
  });

  it('marks a capped population partial and blocks rollout decisions', () => {
    const metrics = deriveContentFactoryRolloutMetricsFromDocuments({
      nowMs: 1000, stageDocs: [{ id: 's1' }], unitDocs: [], jobDocs: [], budgetCapUnits: 0,
      truncation: { stages: true, units: false, jobs: false },
    });
    expect(metrics).toMatchObject({
      isPartial: true,
      rolloutEligible: false,
      samples: { stages: { returned: 1, limit: 100, truncated: true } },
    });
  });

  it('fails closed above the 100+100 document read boundary', () => {
    expect(() => deriveContentFactoryRolloutMetricsFromDocuments({ nowMs: 1000, stageDocs: Array.from({ length: 101 }, (_, id) => ({ id: String(id) })), unitDocs: [], jobDocs: [], budgetCapUnits: 0 })).toThrow('rollout_metrics_document_limit_exceeded');
    expect(() => deriveContentFactoryRolloutMetricsFromDocuments({ nowMs: 1000, stageDocs: [], unitDocs: Array.from({ length: 101 }, (_, id) => ({ id: String(id) })), jobDocs: [], budgetCapUnits: 0 })).toThrow('rollout_metrics_document_limit_exceeded');
  });
});
