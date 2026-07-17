import assert from 'node:assert/strict';
import { buildAgentOfficeDecisionConfirmation, buildAgentOfficeDecisionRequest, decisionAvailability } from '../admin/v2/scripts/admin-agent-office.mjs';

const agentCase = Object.freeze({ caseId: 'case-42', revision: 7, status: 'awaiting_decision', summary: 'Падение конверсии' });
const recommendation = Object.freeze({ recommendationId: 'rec-9', revision: 3, contentHash: 'a'.repeat(64) });

const ownerAvailability = decisionAvailability({ authorized: true, role: 'owner', busy: false, agentCase, recommendation });
assert.deepEqual(ownerAvailability, { enabled: true, reason: '' }, 'current owner may decide an active recommendation');

const payload = buildAgentOfficeDecisionRequest({
  availability: ownerAvailability,
  agentCase,
  recommendation,
  decision: 'approve',
  reason: 'Проверил данные и принимаю подготовку.',
  idempotencyKey: 'agent-office-decision-12345678',
});
assert.deepEqual(payload, {
  ok: true,
  value: {
    caseId: 'case-42',
    expectedCaseRevision: 7,
    recommendationId: 'rec-9',
    recommendationRevision: 3,
    recommendationContentHash: 'a'.repeat(64),
    decision: 'approve',
    reason: 'Проверил данные и принимаю подготовку.',
    idempotencyKey: 'agent-office-decision-12345678',
  },
}, 'payload binds exact current revision, hash and idempotency key');

for (const input of [
  { authorized: false, role: 'owner', busy: false, agentCase, recommendation },
  { authorized: true, role: 'admin', busy: false, agentCase, recommendation },
  { authorized: true, role: 'owner', busy: true, agentCase, recommendation },
  { authorized: true, role: 'owner', busy: false, agentCase: { ...agentCase, status: 'approved' }, recommendation },
]) assert.equal(decisionAvailability(input).enabled, false, 'stale, unauthorized, or busy decision is disabled');

assert.deepEqual(buildAgentOfficeDecisionRequest({ availability: ownerAvailability, agentCase, recommendation, decision: 'approve', reason: 'нет', idempotencyKey: 'agent-office-decision-12345678' }), { ok: false, reason: 'reason_required' }, 'reason is required');
assert.deepEqual(buildAgentOfficeDecisionRequest({ availability: ownerAvailability, agentCase, recommendation, decision: 'execute', reason: 'Есть причина решения.', idempotencyKey: 'agent-office-decision-12345678' }), { ok: false, reason: 'decision_invalid' }, 'unsupported decision is rejected');

const confirmation = buildAgentOfficeDecisionConfirmation({ agentCase, recommendation, decision: 'approve', reason: 'Проверил данные и принимаю подготовку.' });
for (const exactValue of ['одобрить подготовку', 'case-42', 'Версия дела: 7', 'rec-9 / версия 3', 'prepare_only', 'Проверил данные и принимаю подготовку.']) {
  assert.ok(confirmation.includes(exactValue), `confirmation must disclose ${exactValue}`);
}

console.log('Agent Office decision behavior passed');
