import {
  COHORT_RETENTION_MIN_SAMPLE,
  runCohortRetentionDepartment,
} from './cohort_retention_department';
import type { CohortRetentionMetric } from './learning_metrics';

const NOW = Date.parse('2026-08-08T12:00:00Z');

function metric(
  horizonDays: 1 | 7,
  cohortSize: number,
  returningUsers: number,
): CohortRetentionMetric {
  return {
    sourceId: `jarvis_learning_cohorts_d${horizonDays}`,
    state: 'ready',
    horizonDays,
    cohortDate: horizonDays === 1 ? '2026-08-07' : '2026-08-01',
    cohortSize,
    returningUsers,
    observedAtMs: NOW,
  };
}

describe('Jarvis cohort retention department', () => {
  test('reports exact D1 and D7 cohort sizes, returning users and rates', () => {
    const result = runCohortRetentionDepartment({
      metrics: [metric(1, 100, 42), metric(7, 80, 20)], trigger: 'owner_request', nowMs: NOW,
    });

    expect(result.decisions).toHaveLength(2);
    expect(result.decisions[0]).toMatchObject({ department: 'retention', status: 'awaiting_owner', actionability: 'evidence_only' });
    expect(result.decisions[0].finding).toContain('D1');
    expect(result.decisions[0].finding).toContain('100');
    expect(result.decisions[0].finding).toContain('42');
    expect(result.decisions[0].finding).toContain('42%');
    expect(result.decisions[1].finding).toContain('D7');
    expect(result.decisions[1].finding).toContain('25%');
  });

  test('declares insufficient evidence below the minimum cohort sample', () => {
    const result = runCohortRetentionDepartment({
      metrics: [metric(1, COHORT_RETENTION_MIN_SAMPLE - 1, 1)], trigger: 'owner_request', nowMs: NOW,
    });

    expect(result.decisions[0]).toMatchObject({ status: 'insufficient_evidence', confidence: 0 });
    expect(result.decisions[0].finding).toContain(String(COHORT_RETENTION_MIN_SAMPLE - 1));
    expect(result.decisions[0].finding).toMatch(/insufficient|minimum sample/i);
  });

  test('missing rollout data is unknown, not a zero-percent cohort', () => {
    const result = runCohortRetentionDepartment({
      metrics: [{
        sourceId: 'jarvis_learning_cohorts_d7', state: 'empty', horizonDays: 7,
        cohortDate: '2026-08-01', cohortSize: null, returningUsers: null, observedAtMs: NOW,
      }],
      trigger: 'owner_request', nowMs: NOW,
    });

    expect(result.decisions[0].status).toBe('insufficient_evidence');
    expect(result.decisions[0].finding).not.toContain('0%');
  });

  test('never exposes member keys or raw identity fields', () => {
    const result = runCohortRetentionDepartment({
      metrics: [metric(1, 100, 42)], trigger: 'owner_request', nowMs: NOW,
    });
    expect(JSON.stringify(result)).not.toMatch(/uid|memberKey|stable-user/i);
  });
});
