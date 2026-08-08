import { buildDecision, type Decision, type DecisionStatus } from './decision';
import {
  JARVIS_FOLLOW_UP_MAX_ATTEMPTS,
  buildInternalFollowUpTask,
  parseJarvisFollowUpTasksFlag,
} from './jarvis_follow_up_tasks';

function makeDecision(overrides: { status?: DecisionStatus; actionability?: Decision['actionability'] } = {}): Decision {
  const decision = buildDecision({
    department: 'quality',
    mode: 'observe',
    trigger: 'scheduled',
    question: 'Do error reports need a follow-up?',
    finding: 'A confirmed error spike is present.',
    hypothesis: 'The latest release introduced a regression.',
    options: [
      { title: 'Inspect the release diff', cost: 0, risk: 'low' },
      { title: 'Wait for more reports', cost: 0, risk: 'medium' },
    ],
    recommendation: 'Inspect the release diff.',
    risk: 'Investigation time.',
    cost: 0,
    successMetric: 'Root cause identified.',
    rollback: 'Archive the internal task.',
    evidence: [{
      sourceId: 'error_reports',
      state: 'ready',
      count: 4,
      truncated: false,
      droppedCount: 0,
      observedAtMs: 1_000,
    }],
    actionability: overrides.actionability ?? 'confirmed_action',
    nowMs: 1_000,
  });
  return Object.freeze({ ...decision, status: overrides.status ?? decision.status });
}

describe('Jarvis safe internal follow-up tasks', () => {
  test('feature flag is fail-closed and only the exact true value enables creation', () => {
    expect(parseJarvisFollowUpTasksFlag(undefined)).toBe(false);
    expect(parseJarvisFollowUpTasksFlag('1')).toBe(false);
    expect(parseJarvisFollowUpTasksFlag('TRUE')).toBe(false);
    expect(parseJarvisFollowUpTasksFlag('true')).toBe(true);
  });

  test.each<DecisionStatus>(['awaiting_owner', 'approved'])(
    'creates one owner-visible internal record for confirmed status %s',
    (status) => {
      const decision = makeDecision({ status });
      const task = buildInternalFollowUpTask({ decision, existing: null, nowMs: 2_000, enabled: true });

      expect(task).toMatchObject({
        id: `follow-up:${decision.contentHash}`,
        status: 'pending',
        department: 'quality',
        summary: decision.recommendation,
        attemptCount: 0,
        maxAttempts: JARVIS_FOLLOW_UP_MAX_ATTEMPTS,
        createdAtMs: 2_000,
        updatedAtMs: 2_000,
        audit: {
          createdBy: 'jarvis_safe_follow_up_v1',
          sourceDecisionHash: decision.contentHash,
          sourceDecisionStatus: status,
          sourceActionability: 'confirmed_action',
          sideEffectScope: 'internal_firestore_record_only',
          externalDelivery: 'disabled',
        },
      });
      expect(task?.maxAttempts).toBe(3);
    },
  );

  test.each<DecisionStatus>(['draft', 'insufficient_evidence', 'rejected', 'expired'])(
    'does not create a task for unconfirmed status %s',
    (status) => {
      expect(buildInternalFollowUpTask({
        decision: makeDecision({ status }), existing: null, nowMs: 2_000, enabled: true,
      })).toBeNull();
    },
  );

  test('does not create a task for evidence_only even with an otherwise confirmed status', () => {
    expect(buildInternalFollowUpTask({
      decision: makeDecision({ status: 'approved', actionability: 'evidence_only' }),
      existing: null,
      nowMs: 2_000,
      enabled: true,
    })).toBeNull();
  });

  test('does not create a task while the default-off feature flag is closed', () => {
    expect(buildInternalFollowUpTask({
      decision: makeDecision(), existing: null, nowMs: 2_000, enabled: false,
    })).toBeNull();
  });

  test('is idempotent and preserves the original audit and retry state on repeated runs', () => {
    const decision = makeDecision({ status: 'approved' });
    const created = buildInternalFollowUpTask({ decision, existing: null, nowMs: 2_000, enabled: true });
    if (!created) throw new Error('expected initial task');
    const attempted = Object.freeze({ ...created, attemptCount: 2, updatedAtMs: 3_000 });

    const rerun = buildInternalFollowUpTask({ decision, existing: attempted, nowMs: 9_000, enabled: true });
    expect(rerun).toBe(attempted);
    expect(rerun?.attemptCount).toBe(2);
    expect(rerun?.createdAtMs).toBe(2_000);
  });
});
