import { HttpsError } from 'firebase-functions/v2/https';
import {
  isRecord,
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
const AGGREGATE_HEALTH_SOURCES = ['analytics', 'reports', 'audit'] as const;
const AGGREGATE_HEALTH_STATES = ['ready', 'empty', 'error', 'truncated'] as const;

export type AgentAggregateHealthSource = (typeof AGGREGATE_HEALTH_SOURCES)[number];
export type AgentAggregateHealthState = (typeof AGGREGATE_HEALTH_STATES)[number];
export type AgentAggregateHealthItem = Readonly<{
  source: AgentAggregateHealthSource;
  state: AgentAggregateHealthState;
  count: number;
  truncated: boolean;
  observedAtMs: number;
}>;

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

function invalidAggregateHealth(reason: string): never {
  throw new HttpsError('data-loss', `Agent Office aggregate health is unavailable: ${reason}`);
}

/**
 * Closed projection for aggregate Add-to-Plan hydration. The observation
 * receipt may contain internal fields, but this boundary emits only exact,
 * allowlisted source-health tuples in canonical source order.
 */
export function projectAgentAggregateHealth(raw: Row): readonly AgentAggregateHealthItem[] {
  if (!Array.isArray(raw.sourceHealth) || raw.sourceHealth.length !== AGGREGATE_HEALTH_SOURCES.length) {
    invalidAggregateHealth('exact source-health set required');
  }
  const bySource = new Map<AgentAggregateHealthSource, AgentAggregateHealthItem>();
  for (const candidate of raw.sourceHealth) {
    if (!isRecord(candidate)) invalidAggregateHealth('source-health tuple required');
    const source = candidate.source;
    if (typeof source !== 'string'
      || !(AGGREGATE_HEALTH_SOURCES as readonly string[]).includes(source)
      || bySource.has(source as AgentAggregateHealthSource)) {
      invalidAggregateHealth('unique allowlisted source required');
    }
    const state = candidate.state;
    if (typeof state !== 'string' || !(AGGREGATE_HEALTH_STATES as readonly string[]).includes(state)) {
      invalidAggregateHealth('allowlisted state required');
    }
    const count = candidate.count;
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      invalidAggregateHealth('non-negative safe count required');
    }
    const truncated = candidate.truncated;
    if (typeof truncated !== 'boolean' || (state === 'truncated') !== truncated) {
      invalidAggregateHealth('explicit coherent truncation receipt required');
    }
    const observedAtMs = candidate.observedAtMs;
    if (typeof observedAtMs !== 'number' || !Number.isSafeInteger(observedAtMs) || observedAtMs <= 0) {
      invalidAggregateHealth('positive safe observation timestamp required');
    }
    bySource.set(source as AgentAggregateHealthSource, Object.freeze({
      source: source as AgentAggregateHealthSource,
      state: state as AgentAggregateHealthState,
      count,
      truncated,
      observedAtMs,
    }));
  }
  if (!AGGREGATE_HEALTH_SOURCES.every((source) => bySource.has(source))) {
    invalidAggregateHealth('exact source-health set required');
  }
  return Object.freeze(AGGREGATE_HEALTH_SOURCES.map((source) => bySource.get(source)!));
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
