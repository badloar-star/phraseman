import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const AGENT_OFFICE_SCHEMA_VERSION = 1 as const;
export const AGENT_OFFICE_SCOPE = 'prepare_only' as const;

export const AGENT_CASE_STATUSES = [
  'observed',
  'investigating',
  'insufficient_data',
  'awaiting_decision',
  'approved',
  'executing',
  'verifying',
  'completed',
  'cancelled',
] as const;

export type AgentCaseStatus = (typeof AGENT_CASE_STATUSES)[number];
export type AgentDecision = 'approve' | 'decline';
export type AgentActionType = 'analysis_prepare' | 'code_change_prepare' | 'experiment_prepare' | 'support_reply_prepare';

export interface AgentRecommendationRef {
  readonly recommendationId: string;
  readonly revision: number;
  readonly contentHash: string;
}

export interface AgentCase {
  readonly schemaVersion: 1;
  readonly caseId: string;
  readonly revision: number;
  readonly status: AgentCaseStatus;
  readonly summary: string;
  readonly sourceHealth: readonly {
    readonly source: string;
    readonly state: 'ready' | 'empty' | 'partial' | 'error' | 'truncated';
    readonly observedAtMs: number;
  }[];
  readonly confidence: {
    readonly score: number;
    readonly basis: string;
    readonly insufficientEvidence: boolean;
  };
  readonly sourceRefs: readonly { readonly source: string; readonly ref: string }[];
  readonly currentRecommendation: AgentRecommendationRef | null;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly retentionUntilMs: number;
}

export interface AgentRecommendation {
  readonly schemaVersion: 1;
  readonly recommendationId: string;
  readonly caseId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly evidence: readonly {
    readonly summary: string;
    readonly sourceRef: string;
    readonly observedAtMs: number;
  }[];
  readonly risk: { readonly level: 'low' | 'medium' | 'high' | 'critical'; readonly summary: string };
  readonly cost: { readonly currency: 'EUR'; readonly estimatedMinor: number; readonly summary: string };
  readonly rollback: { readonly possible: boolean; readonly plan: string };
  readonly actionType: AgentActionType;
  readonly scope: 'prepare_only';
  readonly validUntilMs: number;
  readonly createdAtMs: number;
}

export interface AgentApproval {
  readonly schemaVersion: 1;
  readonly approvalId: string;
  readonly caseId: string;
  readonly caseRevisionBefore: number;
  readonly caseRevisionAfter: number;
  readonly recommendationId: string;
  readonly recommendationRevision: number;
  readonly recommendationContentHash: string;
  readonly decision: AgentDecision;
  readonly scope: 'prepare_only';
  readonly ownerUid: string;
  readonly reason: string;
  readonly idempotencyKeyHash: string;
  readonly idempotencyPayloadHash: string;
  readonly decidedAtMs: number;
  readonly enqueuedTaskId: null;
}

export interface AgentTask {
  readonly schemaVersion: 1;
  readonly taskId: string;
  readonly caseId: string;
  readonly approvalId: string;
  readonly taskType: AgentActionType;
  readonly status: 'pending' | 'claimed' | 'completed' | 'cancelled' | 'expired';
  readonly scope: 'prepare_only';
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
}

export type AgentAuditEvent = Readonly<{
  schemaVersion: 1;
  eventId: string;
  actorRole: 'owner';
  idempotencyKeyHash: string;
  payloadHash: string;
  occurredAtMs: number;
  piiClass: 'none';
} & (
  | {
    eventType: 'recommendation_decided';
    caseId: string;
    recommendationId: string;
    approvalId: string;
    decision: AgentDecision;
    caseRevision: number;
    scope: 'prepare_only';
  }
  | {
    eventType: 'kill_switch_changed';
    controlRevision: number;
    killSwitchEnabled: boolean;
  }
)>;

export interface AgentOfficeControl {
  readonly schemaVersion: 1;
  readonly controlId: 'global';
  readonly killSwitchEnabled: boolean;
  readonly revision: number;
  readonly lastChangedAtMs: number;
  readonly lastChangedByUid: string;
  readonly lastIdempotencyKeyHash: string;
  readonly lastPayloadHash: string;
}

type Row = Record<string, unknown>;

function invalid(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

export function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertExactKeys(value: Row, keys: readonly string[], label: string): void {
  const allowed = new Set(keys);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) invalid(`${label} unknown field: ${unknown}`);
  const missing = keys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing) invalid(`${label} missing field: ${missing}`);
}

function row(value: unknown, label: string): Row {
  if (!isRecord(value)) invalid(`${label} must be an object`);
  return value;
}

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') invalid(`${label} must be a string`);
  const result = value.trim();
  if (!result || result.length > max) invalid(`${label} is invalid`);
  return result;
}

function identifier(value: unknown, label: string): string {
  const result = text(value, label, 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) invalid(`${label} is invalid`);
  return result;
}

function opaqueRef(value: unknown, label: string): string {
  const result = text(value, label, 240);
  if (!isSafeOpaqueRef(result)) invalid(`${label} must be opaque`);
  return result;
}

export function isSafeOpaqueRef(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{1,31}:sha256:[a-f0-9]{64}$/.test(value);
}

function integer(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) invalid(`${label} is invalid`);
  return value;
}

function finite(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) invalid(`${label} is invalid`);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') invalid(`${label} must be boolean`);
  return value;
}

function literal<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) invalid(`${label} is invalid`);
  return value as T;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  invalid('canonical recommendation content contains a non-JSON value');
}

export function agentRecommendationContentHash(recommendation: AgentRecommendation): string {
  const { contentHash: _declaredHash, ...content } = recommendation;
  return sha256(canonicalJson(content));
}

function hash(value: unknown, label: string): string {
  const result = text(value, label, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) invalid(`${label} is invalid`);
  return result;
}

export function approvalDocumentId(caseId: string, recommendationId: string, revision: number): string {
  return sha256(JSON.stringify([identifier(caseId, 'caseId'), identifier(recommendationId, 'recommendationId'), integer(revision, 'revision', 1)]));
}

const ALLOWED_TRANSITIONS: Readonly<Record<AgentCaseStatus, ReadonlySet<AgentCaseStatus>>> = {
  observed: new Set(['investigating', 'insufficient_data', 'cancelled']),
  investigating: new Set(['awaiting_decision', 'insufficient_data', 'cancelled']),
  insufficient_data: new Set(['investigating', 'cancelled']),
  awaiting_decision: new Set(['approved', 'cancelled']),
  approved: new Set(['executing', 'cancelled']),
  executing: new Set(['verifying', 'cancelled']),
  verifying: new Set(['completed', 'cancelled']),
  completed: new Set(),
  cancelled: new Set(),
};

export function assertAgentCaseTransition(from: AgentCaseStatus, to: AgentCaseStatus): void {
  if (!ALLOWED_TRANSITIONS[from]?.has(to)) invalid(`invalid case transition: ${from} -> ${to}`);
}

function parseRecommendationRef(value: unknown): AgentRecommendationRef {
  const input = row(value, 'currentRecommendation');
  assertExactKeys(input, ['recommendationId', 'revision', 'contentHash'], 'currentRecommendation');
  return Object.freeze({
    recommendationId: identifier(input.recommendationId, 'currentRecommendation.recommendationId'),
    revision: integer(input.revision, 'currentRecommendation.revision', 1),
    contentHash: hash(input.contentHash, 'currentRecommendation.contentHash'),
  });
}

export function parseAgentCase(value: unknown): AgentCase {
  const input = row(value, 'AgentCase');
  assertExactKeys(input, [
    'schemaVersion', 'caseId', 'revision', 'status', 'summary', 'sourceHealth', 'confidence',
    'sourceRefs', 'currentRecommendation', 'createdAtMs', 'updatedAtMs', 'retentionUntilMs',
  ], 'AgentCase');
  if (input.schemaVersion !== AGENT_OFFICE_SCHEMA_VERSION) invalid('AgentCase schemaVersion is invalid');
  if (!Array.isArray(input.sourceHealth) || input.sourceHealth.length > 20) invalid('AgentCase sourceHealth is invalid');
  if (!Array.isArray(input.sourceRefs) || input.sourceRefs.length > 50) invalid('AgentCase sourceRefs is invalid');
  const confidence = row(input.confidence, 'AgentCase.confidence');
  assertExactKeys(confidence, ['score', 'basis', 'insufficientEvidence'], 'AgentCase.confidence');
  return Object.freeze({
    schemaVersion: 1,
    caseId: identifier(input.caseId, 'AgentCase.caseId'),
    revision: integer(input.revision, 'AgentCase.revision', 1),
    status: literal(input.status, AGENT_CASE_STATUSES, 'AgentCase.status'),
    summary: text(input.summary, 'AgentCase.summary', 800),
    sourceHealth: Object.freeze(input.sourceHealth.map((value, index) => {
      const health = row(value, `AgentCase.sourceHealth[${index}]`);
      assertExactKeys(health, ['source', 'state', 'observedAtMs'], `AgentCase.sourceHealth[${index}]`);
      return Object.freeze({
        source: identifier(health.source, `AgentCase.sourceHealth[${index}].source`),
        state: literal(health.state, ['ready', 'empty', 'partial', 'error', 'truncated'] as const, `AgentCase.sourceHealth[${index}].state`),
        observedAtMs: integer(health.observedAtMs, `AgentCase.sourceHealth[${index}].observedAtMs`),
      });
    })),
    confidence: Object.freeze({
      score: finite(confidence.score, 'AgentCase.confidence.score', 0, 1),
      basis: text(confidence.basis, 'AgentCase.confidence.basis', 400),
      insufficientEvidence: boolean(confidence.insufficientEvidence, 'AgentCase.confidence.insufficientEvidence'),
    }),
    sourceRefs: Object.freeze(input.sourceRefs.map((value, index) => {
      const ref = row(value, `AgentCase.sourceRefs[${index}]`);
      assertExactKeys(ref, ['source', 'ref'], `AgentCase.sourceRefs[${index}]`);
      return Object.freeze({
        source: identifier(ref.source, `AgentCase.sourceRefs[${index}].source`),
        ref: opaqueRef(ref.ref, `AgentCase.sourceRefs[${index}].ref`),
      });
    })),
    currentRecommendation: input.currentRecommendation === null ? null : parseRecommendationRef(input.currentRecommendation),
    createdAtMs: integer(input.createdAtMs, 'AgentCase.createdAtMs'),
    updatedAtMs: integer(input.updatedAtMs, 'AgentCase.updatedAtMs'),
    retentionUntilMs: integer(input.retentionUntilMs, 'AgentCase.retentionUntilMs'),
  });
}

export function parseAgentRecommendation(value: unknown): AgentRecommendation {
  const input = row(value, 'AgentRecommendation');
  assertExactKeys(input, [
    'schemaVersion', 'recommendationId', 'caseId', 'revision', 'contentHash', 'evidence', 'risk',
    'cost', 'rollback', 'actionType', 'scope', 'validUntilMs', 'createdAtMs',
  ], 'AgentRecommendation');
  if (input.schemaVersion !== 1) invalid('AgentRecommendation schemaVersion is invalid');
  if (!Array.isArray(input.evidence) || input.evidence.length < 1 || input.evidence.length > 20) invalid('AgentRecommendation evidence is invalid');
  const risk = row(input.risk, 'AgentRecommendation.risk');
  const cost = row(input.cost, 'AgentRecommendation.cost');
  const rollback = row(input.rollback, 'AgentRecommendation.rollback');
  assertExactKeys(risk, ['level', 'summary'], 'AgentRecommendation.risk');
  assertExactKeys(cost, ['currency', 'estimatedMinor', 'summary'], 'AgentRecommendation.cost');
  assertExactKeys(rollback, ['possible', 'plan'], 'AgentRecommendation.rollback');
  return Object.freeze({
    schemaVersion: 1,
    recommendationId: identifier(input.recommendationId, 'AgentRecommendation.recommendationId'),
    caseId: identifier(input.caseId, 'AgentRecommendation.caseId'),
    revision: integer(input.revision, 'AgentRecommendation.revision', 1),
    contentHash: hash(input.contentHash, 'AgentRecommendation.contentHash'),
    evidence: Object.freeze(input.evidence.map((value, index) => {
      const evidence = row(value, `AgentRecommendation.evidence[${index}]`);
      assertExactKeys(evidence, ['summary', 'sourceRef', 'observedAtMs'], `AgentRecommendation.evidence[${index}]`);
      return Object.freeze({
        summary: text(evidence.summary, `AgentRecommendation.evidence[${index}].summary`, 600),
        sourceRef: opaqueRef(evidence.sourceRef, `AgentRecommendation.evidence[${index}].sourceRef`),
        observedAtMs: integer(evidence.observedAtMs, `AgentRecommendation.evidence[${index}].observedAtMs`),
      });
    })),
    risk: Object.freeze({
      level: literal(risk.level, ['low', 'medium', 'high', 'critical'] as const, 'AgentRecommendation.risk.level'),
      summary: text(risk.summary, 'AgentRecommendation.risk.summary', 500),
    }),
    cost: Object.freeze({
      currency: literal(cost.currency, ['EUR'] as const, 'AgentRecommendation.cost.currency'),
      estimatedMinor: integer(cost.estimatedMinor, 'AgentRecommendation.cost.estimatedMinor'),
      summary: text(cost.summary, 'AgentRecommendation.cost.summary', 500),
    }),
    rollback: Object.freeze({
      possible: boolean(rollback.possible, 'AgentRecommendation.rollback.possible'),
      plan: text(rollback.plan, 'AgentRecommendation.rollback.plan', 800),
    }),
    actionType: literal(input.actionType, ['analysis_prepare', 'code_change_prepare', 'experiment_prepare', 'support_reply_prepare'] as const, 'AgentRecommendation.actionType'),
    scope: literal(input.scope, [AGENT_OFFICE_SCOPE], 'AgentRecommendation.scope'),
    validUntilMs: integer(input.validUntilMs, 'AgentRecommendation.validUntilMs'),
    createdAtMs: integer(input.createdAtMs, 'AgentRecommendation.createdAtMs'),
  });
}

export function parseAgentApproval(value: unknown): AgentApproval {
  const input = row(value, 'AgentApproval');
  assertExactKeys(input, [
    'schemaVersion', 'approvalId', 'caseId', 'caseRevisionBefore', 'caseRevisionAfter', 'recommendationId',
    'recommendationRevision', 'recommendationContentHash', 'decision', 'scope', 'ownerUid', 'reason',
    'idempotencyKeyHash', 'idempotencyPayloadHash', 'decidedAtMs', 'enqueuedTaskId',
  ], 'AgentApproval');
  if (input.schemaVersion !== 1) invalid('AgentApproval schemaVersion is invalid');
  const caseRevisionBefore = integer(input.caseRevisionBefore, 'AgentApproval.caseRevisionBefore', 1);
  const caseRevisionAfter = integer(input.caseRevisionAfter, 'AgentApproval.caseRevisionAfter', 2);
  if (caseRevisionAfter !== caseRevisionBefore + 1) invalid('AgentApproval case revision is invalid');
  if (input.enqueuedTaskId !== null) invalid('AgentApproval enqueuedTaskId must be null');
  const caseId = identifier(input.caseId, 'AgentApproval.caseId');
  const recommendationId = identifier(input.recommendationId, 'AgentApproval.recommendationId');
  const recommendationRevision = integer(input.recommendationRevision, 'AgentApproval.recommendationRevision', 1);
  const approvalId = hash(input.approvalId, 'AgentApproval.approvalId');
  if (approvalId !== approvalDocumentId(caseId, recommendationId, recommendationRevision)) invalid('AgentApproval approvalId is invalid');
  return Object.freeze({
    schemaVersion: 1,
    approvalId,
    caseId,
    caseRevisionBefore,
    caseRevisionAfter,
    recommendationId,
    recommendationRevision,
    recommendationContentHash: hash(input.recommendationContentHash, 'AgentApproval.recommendationContentHash'),
    decision: literal(input.decision, ['approve', 'decline'] as const, 'AgentApproval.decision'),
    scope: literal(input.scope, [AGENT_OFFICE_SCOPE], 'AgentApproval.scope'),
    ownerUid: identifier(input.ownerUid, 'AgentApproval.ownerUid'),
    reason: text(input.reason, 'AgentApproval.reason', 500),
    idempotencyKeyHash: hash(input.idempotencyKeyHash, 'AgentApproval.idempotencyKeyHash'),
    idempotencyPayloadHash: hash(input.idempotencyPayloadHash, 'AgentApproval.idempotencyPayloadHash'),
    decidedAtMs: integer(input.decidedAtMs, 'AgentApproval.decidedAtMs'),
    enqueuedTaskId: null,
  });
}

export function parseAgentTask(value: unknown): AgentTask {
  const input = row(value, 'AgentTask');
  assertExactKeys(input, ['schemaVersion', 'taskId', 'caseId', 'approvalId', 'taskType', 'status', 'scope', 'createdAtMs', 'expiresAtMs'], 'AgentTask');
  if (input.schemaVersion !== 1) invalid('AgentTask schemaVersion is invalid');
  return Object.freeze({
    schemaVersion: 1,
    taskId: identifier(input.taskId, 'AgentTask.taskId'),
    caseId: identifier(input.caseId, 'AgentTask.caseId'),
    approvalId: hash(input.approvalId, 'AgentTask.approvalId'),
    taskType: literal(input.taskType, ['analysis_prepare', 'code_change_prepare', 'experiment_prepare', 'support_reply_prepare'] as const, 'AgentTask.taskType'),
    status: literal(input.status, ['pending', 'claimed', 'completed', 'cancelled', 'expired'] as const, 'AgentTask.status'),
    scope: literal(input.scope, [AGENT_OFFICE_SCOPE], 'AgentTask.scope'),
    createdAtMs: integer(input.createdAtMs, 'AgentTask.createdAtMs'),
    expiresAtMs: integer(input.expiresAtMs, 'AgentTask.expiresAtMs'),
  });
}

export function parseAgentAuditEvent(value: unknown): AgentAuditEvent {
  const input = row(value, 'AgentAuditEvent');
  const common = ['schemaVersion', 'eventId', 'eventType', 'actorRole', 'idempotencyKeyHash', 'payloadHash', 'occurredAtMs', 'piiClass'];
  const eventType = literal(input.eventType, ['recommendation_decided', 'kill_switch_changed'] as const, 'AgentAuditEvent.eventType');
  if (eventType === 'recommendation_decided') {
    assertExactKeys(input, [...common, 'caseId', 'recommendationId', 'approvalId', 'decision', 'caseRevision', 'scope'], 'AgentAuditEvent');
  } else {
    assertExactKeys(input, [...common, 'controlRevision', 'killSwitchEnabled'], 'AgentAuditEvent');
  }
  if (input.schemaVersion !== 1) invalid('AgentAuditEvent schemaVersion is invalid');
  const base = {
    schemaVersion: 1 as const,
    eventId: identifier(input.eventId, 'AgentAuditEvent.eventId'),
    actorRole: literal(input.actorRole, ['owner'] as const, 'AgentAuditEvent.actorRole'),
    idempotencyKeyHash: hash(input.idempotencyKeyHash, 'AgentAuditEvent.idempotencyKeyHash'),
    payloadHash: hash(input.payloadHash, 'AgentAuditEvent.payloadHash'),
    occurredAtMs: integer(input.occurredAtMs, 'AgentAuditEvent.occurredAtMs'),
    piiClass: literal(input.piiClass, ['none'] as const, 'AgentAuditEvent.piiClass'),
  };
  if (eventType === 'recommendation_decided') {
    return Object.freeze({
      ...base,
      eventType,
      caseId: identifier(input.caseId, 'AgentAuditEvent.caseId'),
      recommendationId: identifier(input.recommendationId, 'AgentAuditEvent.recommendationId'),
      approvalId: hash(input.approvalId, 'AgentAuditEvent.approvalId'),
      decision: literal(input.decision, ['approve', 'decline'] as const, 'AgentAuditEvent.decision'),
      caseRevision: integer(input.caseRevision, 'AgentAuditEvent.caseRevision', 1),
      scope: literal(input.scope, [AGENT_OFFICE_SCOPE], 'AgentAuditEvent.scope'),
    });
  }
  return Object.freeze({
    ...base,
    eventType,
    controlRevision: integer(input.controlRevision, 'AgentAuditEvent.controlRevision', 1),
    killSwitchEnabled: boolean(input.killSwitchEnabled, 'AgentAuditEvent.killSwitchEnabled'),
  });
}

export function parseAgentOfficeControl(value: unknown): AgentOfficeControl {
  const input = row(value, 'AgentOfficeControl');
  assertExactKeys(input, [
    'schemaVersion', 'controlId', 'killSwitchEnabled', 'revision', 'lastChangedAtMs', 'lastChangedByUid',
    'lastIdempotencyKeyHash', 'lastPayloadHash',
  ], 'AgentOfficeControl');
  if (input.schemaVersion !== 1) invalid('AgentOfficeControl schemaVersion is invalid');
  return Object.freeze({
    schemaVersion: 1,
    controlId: literal(input.controlId, ['global'] as const, 'AgentOfficeControl.controlId'),
    killSwitchEnabled: boolean(input.killSwitchEnabled, 'AgentOfficeControl.killSwitchEnabled'),
    revision: integer(input.revision, 'AgentOfficeControl.revision', 1),
    lastChangedAtMs: integer(input.lastChangedAtMs, 'AgentOfficeControl.lastChangedAtMs'),
    lastChangedByUid: identifier(input.lastChangedByUid, 'AgentOfficeControl.lastChangedByUid'),
    lastIdempotencyKeyHash: hash(input.lastIdempotencyKeyHash, 'AgentOfficeControl.lastIdempotencyKeyHash'),
    lastPayloadHash: hash(input.lastPayloadHash, 'AgentOfficeControl.lastPayloadHash'),
  });
}

export function parseIdempotencyKey(value: unknown): string {
  const result = text(value, 'idempotencyKey', 160);
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(result)) invalid('idempotencyKey is invalid');
  return result;
}

export function parseIdentifier(value: unknown, label: string): string {
  return identifier(value, label);
}

export function parsePositiveInteger(value: unknown, label: string): number {
  return integer(value, label, 1);
}

export function parseNonNegativeInteger(value: unknown, label: string): number {
  return integer(value, label, 0);
}

export function parseHash(value: unknown, label: string): string {
  return hash(value, label);
}

export function parseBoundedText(value: unknown, label: string, max: number): string {
  return text(value, label, max);
}

export function parseDecision(value: unknown): AgentDecision {
  return literal(value, ['approve', 'decline'] as const, 'decision');
}

export function parseBoolean(value: unknown, label: string): boolean {
  return boolean(value, label);
}
