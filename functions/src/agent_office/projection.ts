import {
  isSafeOpaqueRef,
  parseAgentAuditEvent,
  parseAgentCase,
  parseAgentOfficeControl,
  parseAgentRecommendation,
  parseAgentTask,
  type AgentAuditEvent,
  type AgentCase,
  type AgentOfficeControl,
  type AgentRecommendation,
  type AgentTask,
} from './contracts';

type Row = Record<string, unknown>;
const REDACTED_OPAQUE_REF = `redacted:sha256:${'0'.repeat(64)}`;

export type SafeAgentRecommendation = Omit<AgentRecommendation, 'evidence'> & Readonly<{
  evidence: readonly Readonly<{
    summary: string;
    sourceRef: string | null;
    observedAtMs: number;
  }>[];
}>;

function redactText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]');
}

export function projectAgentCase(id: string, raw: Row): AgentCase {
  const confidence = raw.confidence as Row;
  return parseAgentCase({
    schemaVersion: raw.schemaVersion,
    caseId: raw.caseId ?? id,
    revision: raw.revision,
    status: raw.status,
    summary: redactText(raw.summary),
    sourceHealth: Array.isArray(raw.sourceHealth) ? raw.sourceHealth.map((item) => {
      const value = item as Row;
      return { source: value.source, state: value.state, observedAtMs: value.observedAtMs };
    }) : raw.sourceHealth,
    confidence: {
      score: confidence?.score,
      basis: redactText(confidence?.basis),
      insufficientEvidence: confidence?.insufficientEvidence,
    },
    sourceRefs: Array.isArray(raw.sourceRefs) ? raw.sourceRefs.flatMap((item) => {
      const value = item as Row;
      return isSafeOpaqueRef(value.ref) ? [{ source: value.source, ref: value.ref }] : [];
    }) : raw.sourceRefs,
    currentRecommendation: raw.currentRecommendation,
    createdAtMs: raw.createdAtMs,
    updatedAtMs: raw.updatedAtMs,
    retentionUntilMs: raw.retentionUntilMs,
  });
}

export function projectAgentRecommendation(id: string, raw: Row): SafeAgentRecommendation {
  const risk = raw.risk as Row;
  const cost = raw.cost as Row;
  const rollback = raw.rollback as Row;
  const safeSourceRefs = Array.isArray(raw.evidence)
    ? raw.evidence.map((item) => {
      const value = item as Row;
      return isSafeOpaqueRef(value.sourceRef) ? value.sourceRef : null;
    })
    : [];
  const parsed = parseAgentRecommendation({
    schemaVersion: raw.schemaVersion,
    recommendationId: raw.recommendationId ?? id,
    caseId: raw.caseId,
    revision: raw.revision,
    contentHash: raw.contentHash,
    evidence: Array.isArray(raw.evidence) ? raw.evidence.map((item, index) => {
      const value = item as Row;
      return {
        summary: redactText(value.summary),
        sourceRef: safeSourceRefs[index] ?? REDACTED_OPAQUE_REF,
        observedAtMs: value.observedAtMs,
      };
    }) : raw.evidence,
    risk: { level: risk?.level, summary: redactText(risk?.summary) },
    cost: { currency: cost?.currency, estimatedMinor: cost?.estimatedMinor, summary: redactText(cost?.summary) },
    rollback: { possible: rollback?.possible, plan: redactText(rollback?.plan) },
    actionType: raw.actionType,
    scope: raw.scope,
    validUntilMs: raw.validUntilMs,
    createdAtMs: raw.createdAtMs,
  });
  return Object.freeze({
    ...parsed,
    evidence: Object.freeze(parsed.evidence.map((item, index) => Object.freeze({
      ...item,
      sourceRef: safeSourceRefs[index] ?? null,
    }))),
  });
}

export function projectAgentTask(id: string, raw: Row): AgentTask {
  return parseAgentTask({
    schemaVersion: raw.schemaVersion,
    taskId: raw.taskId ?? id,
    caseId: raw.caseId,
    approvalId: raw.approvalId,
    taskType: raw.taskType,
    status: raw.status,
    scope: raw.scope,
    createdAtMs: raw.createdAtMs,
    expiresAtMs: raw.expiresAtMs,
  });
}

export function projectAgentAuditEvent(id: string, raw: Row): Omit<AgentAuditEvent, 'idempotencyKeyHash' | 'payloadHash'> {
  const projected: Row = {
    schemaVersion: raw.schemaVersion,
    eventId: raw.eventId ?? id,
    eventType: raw.eventType,
    actorRole: raw.actorRole,
    idempotencyKeyHash: raw.idempotencyKeyHash,
    payloadHash: raw.payloadHash,
    occurredAtMs: raw.occurredAtMs,
    piiClass: raw.piiClass,
  };
  if (raw.eventType === 'recommendation_decided') {
    Object.assign(projected, {
      caseId: raw.caseId,
      recommendationId: raw.recommendationId,
      approvalId: raw.approvalId,
      decision: raw.decision,
      caseRevision: raw.caseRevision,
      scope: raw.scope,
    });
  } else {
    Object.assign(projected, { controlRevision: raw.controlRevision, killSwitchEnabled: raw.killSwitchEnabled });
  }
  const parsed = parseAgentAuditEvent(projected);
  const { idempotencyKeyHash: _keyHash, payloadHash: _payloadHash, ...safe } = parsed;
  return Object.freeze(safe);
}

export function projectAgentOfficeControl(raw: Row): Readonly<{
  controlId: 'global';
  killSwitchEnabled: boolean;
  revision: number;
  state: 'ready';
  lastChangedAtMs: number;
}> {
  const parsed: AgentOfficeControl = parseAgentOfficeControl(raw);
  return Object.freeze({
    controlId: 'global',
    killSwitchEnabled: parsed.killSwitchEnabled,
    revision: parsed.revision,
    state: 'ready',
    lastChangedAtMs: parsed.lastChangedAtMs,
  });
}
