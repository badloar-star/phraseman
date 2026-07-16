import {
  AGENT_OFFICE_SCHEMA_VERSION,
  approvalDocumentId,
  assertAgentCaseTransition,
  parseAgentApproval,
  parseAgentAuditEvent,
  parseAgentCase,
  parseAgentOfficeControl,
  parseAgentRecommendation,
  parseAgentTask,
} from './contracts';
import { requireAgentOfficeOwner, requireAgentOfficeReader } from './auth';
import {
  projectAgentAuditEvent,
  projectAgentCase,
  projectAgentRecommendation,
  projectAgentTask,
} from './projection';

const HASH = 'a'.repeat(64);

function validCase() {
  return {
    schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
    caseId: 'case-1',
    revision: 3,
    status: 'awaiting_decision',
    summary: 'Retention signal for a redacted cohort.',
    sourceHealth: [{ source: 'analytics', state: 'ready', observedAtMs: 2_000_000_000_000 }],
    confidence: { score: 0.82, basis: 'complete cohort window', insufficientEvidence: false },
    sourceRefs: [{ source: 'analytics', ref: 'cohort:opaque-123' }],
    currentRecommendation: { recommendationId: 'rec-1', revision: 2, contentHash: HASH },
    createdAtMs: 1_999_999_000_000,
    updatedAtMs: 2_000_000_000_000,
    retentionUntilMs: 2_100_000_000_000,
  } as const;
}

function validRecommendation() {
  return {
    schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
    recommendationId: 'rec-1',
    caseId: 'case-1',
    revision: 2,
    contentHash: HASH,
    evidence: [{ summary: 'D7 retention changed.', sourceRef: 'cohort:opaque-123', observedAtMs: 2_000_000_000_000 }],
    risk: { level: 'low', summary: 'Preparation is isolated and reversible.' },
    cost: { currency: 'EUR', estimatedMinor: 0, summary: 'No external spend.' },
    rollback: { possible: true, plan: 'Discard the prepared branch.' },
    actionType: 'code_change_prepare',
    scope: 'prepare_only',
    validUntilMs: 2_000_100_000_000,
    createdAtMs: 2_000_000_000_000,
  } as const;
}

describe('Agent Office immutable contracts', () => {
  test('strictly accepts the W0 case and recommendation shapes', () => {
    expect(parseAgentCase(validCase())).toEqual(validCase());
    expect(parseAgentRecommendation(validRecommendation())).toEqual(validRecommendation());
  });

  test('rejects unknown fields, executable scopes and invalid hashes', () => {
    expect(() => parseAgentCase({ ...validCase(), rawEmailBody: 'private@example.com' })).toThrow('unknown field');
    expect(() => parseAgentRecommendation({ ...validRecommendation(), scope: 'execute' })).toThrow('scope');
    expect(() => parseAgentRecommendation({ ...validRecommendation(), contentHash: 'short' })).toThrow('contentHash');
  });

  test('allows only declared monotonic case transitions', () => {
    expect(() => assertAgentCaseTransition('awaiting_decision', 'approved')).not.toThrow();
    expect(() => assertAgentCaseTransition('awaiting_decision', 'cancelled')).not.toThrow();
    expect(() => assertAgentCaseTransition('completed', 'executing')).toThrow('invalid case transition');
    expect(() => assertAgentCaseTransition('approved', 'awaiting_decision')).toThrow('invalid case transition');
  });

  test('defines immutable approval, task, audit and control records', () => {
    const approvalId = approvalDocumentId('case-1', 'rec-1', 2);
    expect(approvalId).toMatch(/^[a-f0-9]{64}$/);
    expect(parseAgentApproval({
      schemaVersion: 1,
      approvalId,
      caseId: 'case-1',
      caseRevisionBefore: 3,
      caseRevisionAfter: 4,
      recommendationId: 'rec-1',
      recommendationRevision: 2,
      recommendationContentHash: HASH,
      decision: 'approve',
      scope: 'prepare_only',
      ownerUid: 'owner-uid',
      reason: 'Prepare the isolated change.',
      idempotencyKeyHash: 'b'.repeat(64),
      idempotencyPayloadHash: 'c'.repeat(64),
      decidedAtMs: 2_000_000_000_100,
      enqueuedTaskId: null,
    })).toMatchObject({ approvalId, scope: 'prepare_only', enqueuedTaskId: null });

    expect(parseAgentTask({
      schemaVersion: 1,
      taskId: 'task-1',
      caseId: 'case-1',
      approvalId,
      taskType: 'code_change_prepare',
      status: 'pending',
      scope: 'prepare_only',
      createdAtMs: 2_000_000_000_200,
      expiresAtMs: 2_000_100_000_000,
    })).toMatchObject({ status: 'pending', scope: 'prepare_only' });

    expect(parseAgentAuditEvent({
      schemaVersion: 1,
      eventId: 'decision_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      eventType: 'recommendation_decided',
      caseId: 'case-1',
      recommendationId: 'rec-1',
      approvalId,
      decision: 'approve',
      caseRevision: 4,
      actorRole: 'owner',
      scope: 'prepare_only',
      idempotencyKeyHash: 'b'.repeat(64),
      payloadHash: 'c'.repeat(64),
      occurredAtMs: 2_000_000_000_100,
      piiClass: 'none',
    })).toMatchObject({ piiClass: 'none', actorRole: 'owner' });

    expect(parseAgentOfficeControl({
      schemaVersion: 1,
      controlId: 'global',
      killSwitchEnabled: true,
      revision: 1,
      lastChangedAtMs: 2_000_000_000_300,
      lastChangedByUid: 'owner-uid',
      lastIdempotencyKeyHash: 'd'.repeat(64),
      lastPayloadHash: 'e'.repeat(64),
    })).toMatchObject({ controlId: 'global', killSwitchEnabled: true, revision: 1 });
  });
});

describe('Agent Office explicit roles', () => {
  test('denies missing, unknown and legacy admin-only role claims', () => {
    expect(() => requireAgentOfficeReader({ uid: 'u1', token: { admin: true } }, 'briefing.read')).toThrow('adminRole claim required');
    expect(() => requireAgentOfficeReader({ uid: 'u1', token: { admin: true, adminRole: 'legacy_admin' } }, 'briefing.read')).toThrow('adminRole claim required');
    expect(() => requireAgentOfficeReader({ uid: 'u1', token: { admin: false, adminRole: 'owner' } }, 'briefing.read')).toThrow('Admin only');
  });

  test('permits safe reads by explicit permission and decisions only by owner', () => {
    expect(requireAgentOfficeReader({ uid: 'analyst-uid', token: { admin: true, adminRole: 'analyst' } }, 'briefing.read')).toMatchObject({ role: 'analyst' });
    expect(() => requireAgentOfficeReader({ uid: 'support-uid', token: { admin: true, adminRole: 'support' } }, 'briefing.read')).toThrow('Role cannot use briefing.read');
    expect(() => requireAgentOfficeOwner({ uid: 'admin-uid', token: { admin: true, adminRole: 'admin' } })).toThrow('Owner only');
    expect(requireAgentOfficeOwner({ uid: 'owner-uid', token: { admin: true, adminRole: 'owner' } })).toEqual({ actorUid: 'owner-uid', role: 'owner' });
  });
});

describe('Agent Office safe projections', () => {
  test('allowlists fields and removes PII-bearing raw fields from cases and recommendations', () => {
    const projectedCase = projectAgentCase('case-1', {
      ...validCase(),
      ownerEmail: 'owner@example.com',
      rawBody: 'private payload',
      summary: 'Contact private@example.com or +353 87 123 4567.',
    });
    expect(projectedCase).not.toHaveProperty('ownerEmail');
    expect(projectedCase).not.toHaveProperty('rawBody');
    expect(JSON.stringify(projectedCase)).not.toContain('private@example.com');
    expect(JSON.stringify(projectedCase)).not.toContain('123 4567');

    const projectedRecommendation = projectAgentRecommendation('rec-1', {
      ...validRecommendation(),
      prompt: 'malicious raw prompt',
      evidence: [{
        summary: 'User private@example.com reported +353 87 123 4567.',
        sourceRef: 'cohort:opaque-123',
        observedAtMs: 2_000_000_000_000,
        rawPayload: 'secret',
      }],
    });
    expect(projectedRecommendation).not.toHaveProperty('prompt');
    expect(JSON.stringify(projectedRecommendation)).not.toContain('private@example.com');
    expect(JSON.stringify(projectedRecommendation)).not.toContain('rawPayload');
  });

  test('never exposes task internals or audit owner identifiers', () => {
    const task = projectAgentTask('task-1', {
      schemaVersion: 1,
      taskId: 'task-1',
      caseId: 'case-1',
      approvalId: 'a'.repeat(64),
      taskType: 'code_change_prepare',
      status: 'pending',
      scope: 'prepare_only',
      createdAtMs: 2_000_000_000_000,
      expiresAtMs: 2_000_100_000_000,
      command: 'deploy --prod',
      secret: 'token',
    });
    expect(task).not.toHaveProperty('command');
    expect(task).not.toHaveProperty('secret');

    const audit = projectAgentAuditEvent('audit-1', {
      schemaVersion: 1,
      eventId: 'audit-1',
      eventType: 'kill_switch_changed',
      controlRevision: 2,
      killSwitchEnabled: true,
      actorRole: 'owner',
      idempotencyKeyHash: 'b'.repeat(64),
      payloadHash: 'c'.repeat(64),
      occurredAtMs: 2_000_000_000_000,
      piiClass: 'none',
      actorUid: 'owner-uid',
    });
    expect(audit).not.toHaveProperty('actorUid');
    expect(audit).not.toHaveProperty('idempotencyKeyHash');
    expect(audit).not.toHaveProperty('payloadHash');
    expect(audit).toMatchObject({ piiClass: 'none', actorRole: 'owner' });
  });
});
