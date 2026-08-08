function hasCurrentRecommendation(agentCase, recommendation) {
  return Boolean(agentCase && recommendation
    && agentCase.status === 'awaiting_decision'
    && typeof agentCase.caseId === 'string' && agentCase.caseId
    && Number.isInteger(agentCase.revision) && agentCase.revision > 0
    && typeof recommendation.recommendationId === 'string' && recommendation.recommendationId
    && Number.isInteger(recommendation.revision) && recommendation.revision > 0
    && /^[a-f0-9]{64}$/i.test(String(recommendation.contentHash || '')));
}

export function decisionAvailability({ authorized, role, busy, agentCase, recommendation }) {
  if (!authorized) return Object.freeze({ enabled: false, reason: 'unauthorized' });
  if (role !== 'owner') return Object.freeze({ enabled: false, reason: 'owner_required' });
  if (busy) return Object.freeze({ enabled: false, reason: 'busy' });
  if (!hasCurrentRecommendation(agentCase, recommendation)) return Object.freeze({ enabled: false, reason: 'stale' });
  return Object.freeze({ enabled: true, reason: '' });
}

export function buildAgentOfficeDecisionRequest({ availability, agentCase, recommendation, decision, reason, idempotencyKey }) {
  if (!availability?.enabled) return Object.freeze({ ok: false, reason: availability?.reason || 'stale' });
  const normalizedReason = String(reason || '').trim();
  if (normalizedReason.length < 5) return Object.freeze({ ok: false, reason: 'reason_required' });
  if (!['approve', 'decline'].includes(decision)) return Object.freeze({ ok: false, reason: 'decision_invalid' });
  if (!/^[A-Za-z0-9._-]{8,160}$/.test(String(idempotencyKey || ''))) return Object.freeze({ ok: false, reason: 'idempotency_invalid' });
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      caseId: agentCase.caseId,
      expectedCaseRevision: agentCase.revision,
      recommendationId: recommendation.recommendationId,
      recommendationRevision: recommendation.revision,
      recommendationContentHash: recommendation.contentHash,
      decision,
      reason: normalizedReason,
      idempotencyKey,
    }),
  });
}

export function buildAgentOfficeDecisionConfirmation({ agentCase, recommendation, decision, reason }) {
  const verb = decision === 'approve' ? 'одобрить подготовку' : 'отклонить рекомендацию';
  return `${verb}?\n\nДело: ${agentCase.summary} (${agentCase.caseId})\nВерсия дела: ${agentCase.revision}\nРекомендация: ${recommendation.recommendationId} / версия ${recommendation.revision}\nОбласть: prepare_only — задача, Telegram и внешние эффекты не запускаются.\n\nПричина: ${reason}`;
}
