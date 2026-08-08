import { buildDecision, type Decision, type DecisionTrigger, type EvidenceInput } from './decision';
import type { CohortRetentionMetric } from './learning_metrics';

export const COHORT_RETENTION_MIN_SAMPLE = 30;

export interface RunCohortRetentionDepartmentInput {
  readonly metrics: readonly CohortRetentionMetric[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
}

export interface RunCohortRetentionDepartmentResult {
  readonly decisions: readonly Decision[];
}

function isTrustedMetric(metric: CohortRetentionMetric): boolean {
  return metric.state === 'ready'
    && Number.isSafeInteger(metric.cohortSize)
    && Number(metric.cohortSize) >= COHORT_RETENTION_MIN_SAMPLE
    && Number.isSafeInteger(metric.returningUsers)
    && Number(metric.returningUsers) >= 0
    && Number(metric.returningUsers) <= Number(metric.cohortSize);
}

function evidenceFor(metric: CohortRetentionMetric, trusted: boolean): EvidenceInput {
  return {
    sourceId: metric.sourceId,
    state: trusted ? 'ready' : 'partial',
    count: trusted ? metric.cohortSize : null,
    truncated: false,
    droppedCount: 0,
    observedAtMs: metric.observedAtMs,
    digest: JSON.stringify({
      horizonDays: metric.horizonDays,
      cohortDate: metric.cohortDate,
      cohortSize: metric.cohortSize,
      returningUsers: metric.returningUsers,
    }),
  };
}

function formatPercent(returningUsers: number, cohortSize: number): string {
  const rounded = Math.round((returningUsers / cohortSize) * 1_000) / 10;
  return `${rounded}%`;
}

function findingFor(metric: CohortRetentionMetric, trusted: boolean): string {
  const label = `D${metric.horizonDays}`;
  if (trusted) {
    return `${label} cohort ${metric.cohortDate}: ${metric.returningUsers} returning users out of ${metric.cohortSize}, retention ${formatPercent(Number(metric.returningUsers), Number(metric.cohortSize))}.`;
  }
  if (metric.state === 'ready' && metric.cohortSize !== null) {
    return `${label} cohort ${metric.cohortDate} has ${metric.cohortSize} users; insufficient evidence below the minimum sample of ${COHORT_RETENTION_MIN_SAMPLE}.`;
  }
  return `${label} cohort ${metric.cohortDate} is unavailable; retention is unknown until aggregate rollout data exists.`;
}

export function runCohortRetentionDepartment(
  input: RunCohortRetentionDepartmentInput,
): RunCohortRetentionDepartmentResult {
  const decisions = input.metrics.map((metric) => {
    const trusted = isTrustedMetric(metric);
    const label = `D${metric.horizonDays}`;
    return buildDecision({
      department: 'retention',
      mode: 'observe',
      trigger: input.trigger,
      question: input.question ?? `What is ${label} learning cohort retention?`,
      finding: findingFor(metric, trusted),
      hypothesis: trusted
        ? 'The aggregate establishes the retention rate but does not establish its cause.'
        : 'There is not enough aggregate evidence for a retention hypothesis.',
      options: [
        { title: 'Continue collecting server-owned cohort aggregates', cost: 0, risk: 'low' },
        { title: 'Review the learning path only after the minimum sample is reached', cost: 0, risk: 'low' },
      ],
      recommendation: trusted
        ? 'Track the cohort trend without changing user-facing behavior from this evidence alone.'
        : 'Wait for a complete cohort with the minimum sample.',
      risk: trusted
        ? 'Treating correlation as causation could lead to an unsupported product change.'
        : 'Reporting a percentage now would turn missing or undersized evidence into a false signal.',
      cost: 0,
      successMetric: `${label} remains measurable from aggregate cohort size and returning-user counts.`,
      rollback: 'Not applicable: this department is evidence-only.',
      evidence: [evidenceFor(metric, trusted)],
      evidencePolicy: 'all_trustworthy',
      actionability: 'evidence_only',
      nowMs: input.nowMs,
    });
  });

  return Object.freeze({ decisions: Object.freeze(decisions) });
}
