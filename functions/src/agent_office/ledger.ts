import { HttpsError } from 'firebase-functions/v2/https';
import type { AdminPermission } from '../admin/permissions';
import { requireAgentOfficeOwner, requireAgentOfficeReader, type AgentOfficeAuth } from './auth';
import {
  AGENT_OFFICE_SCHEMA_VERSION,
  AGENT_OFFICE_SCOPE,
  agentRecommendationContentHash,
  approvalDocumentId,
  assertAgentCaseTransition,
  assertExactKeys,
  isRecord,
  parseAgentApproval,
  parseAgentAuditEvent,
  parseAgentCase,
  parseAgentOfficeControl,
  parseAgentRecommendation,
  parseBoolean,
  parseBoundedText,
  parseDecision,
  parseHash,
  parseIdempotencyKey,
  parseIdentifier,
  parseNonNegativeInteger,
  parsePositiveInteger,
  sha256,
  type AgentApproval,
  type AgentAuditEvent,
  type AgentDecision,
  type AgentOfficeControl,
} from './contracts';
import {
  projectAgentAuditEvent,
  projectAgentAggregateHealth,
  projectAgentCase,
  projectAgentOfficeControl,
  projectAgentRecommendation,
  projectAgentTask,
} from './projection';
import {
  parseAgentTelegramApprovalToken,
  telegramApprovalTokenPath,
  type AgentTelegramDecisionGuard,
} from './telegram_contracts';

export interface AgentOfficeDocument {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface AgentOfficeCursor {
  readonly value: number;
  readonly id: string;
}

export interface AgentOfficeQuery {
  readonly collection: 'agent_cases' | 'agent_recommendations' | 'agent_tasks' | 'agent_audit_events' | 'agent_observation_receipts';
  readonly orderBy: 'updatedAtMs' | 'revision' | 'createdAtMs' | 'occurredAtMs' | 'observedAtMs';
  readonly limit: number;
  readonly caseId?: string;
  readonly cursor?: AgentOfficeCursor;
}

export interface AgentOfficeTransaction {
  get(path: string): Promise<AgentOfficeDocument | null>;
  create(path: string, data: Record<string, unknown>): void;
  update(path: string, data: Record<string, unknown>): void;
  set(path: string, data: Record<string, unknown>): void;
}

export interface AgentOfficeRepository {
  get(path: string): Promise<AgentOfficeDocument | null>;
  query(input: AgentOfficeQuery): Promise<readonly AgentOfficeDocument[]>;
  runTransaction<T>(body: (transaction: AgentOfficeTransaction) => Promise<T>): Promise<T>;
}

interface ListInput {
  readonly limit: number;
  readonly cursor: string;
}

interface CaseListInput extends ListInput {
  readonly caseId: string;
}

interface DecisionInput {
  readonly caseId: string;
  readonly expectedCaseRevision: number;
  readonly recommendationId: string;
  readonly recommendationRevision: number;
  readonly recommendationContentHash: string;
  readonly decision: AgentDecision;
  readonly reason: string;
  readonly idempotencyKey: string;
}

interface SetKillSwitchInput {
  readonly enabled: boolean;
  readonly expectedRevision: number;
  readonly reason: string;
  readonly idempotencyKey: string;
}

function invalidInput(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

function inputRow(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalidInput(`${label} must be an object`);
  return value;
}

function parseLimit(value: unknown): number {
  if (value === undefined) return 50;
  const limit = parsePositiveInteger(value, 'limit');
  if (limit > 100) invalidInput('limit is invalid');
  return limit;
}

function parseCursorText(value: unknown): string {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,800}$/.test(value)) invalidInput('cursor is invalid');
  return value;
}

function parseListInput(value: unknown): ListInput {
  const input = inputRow(value, 'list request');
  const allowed = ['limit', 'cursor'];
  const unknown = Object.keys(input).find((key) => !allowed.includes(key));
  if (unknown) invalidInput(`list request unknown field: ${unknown}`);
  return Object.freeze({ limit: parseLimit(input.limit), cursor: parseCursorText(input.cursor) });
}

function parseCaseListInput(value: unknown, allowEmptyCaseId: boolean): CaseListInput {
  const input = inputRow(value, 'case list request');
  const allowed = ['caseId', 'limit', 'cursor'];
  const unknown = Object.keys(input).find((key) => !allowed.includes(key));
  if (unknown) invalidInput(`case list request unknown field: ${unknown}`);
  const rawCaseId = input.caseId;
  const caseId = allowEmptyCaseId && (rawCaseId === '' || rawCaseId === undefined) ? '' : parseIdentifier(rawCaseId, 'caseId');
  return Object.freeze({ caseId, limit: parseLimit(input.limit), cursor: parseCursorText(input.cursor) });
}

function decodeCursor(
  encoded: string,
  collection: AgentOfficeQuery['collection'],
  orderBy: AgentOfficeQuery['orderBy'],
  caseId: string,
): AgentOfficeCursor | undefined {
  if (!encoded) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown;
    if (!isRecord(parsed)) throw new Error('not object');
    assertExactKeys(parsed, ['collection', 'orderBy', 'caseId', 'value', 'id'], 'cursor');
    if (parsed.collection !== collection || parsed.orderBy !== orderBy || parsed.caseId !== caseId) throw new Error('cursor scope mismatch');
    return Object.freeze({
      value: parseNonNegativeInteger(parsed.value, 'cursor.value'),
      id: parseIdentifier(parsed.id, 'cursor.id'),
    });
  } catch {
    throw new HttpsError('invalid-argument', 'cursor is invalid');
  }
}

function encodeCursor(query: AgentOfficeQuery, row: AgentOfficeDocument): string {
  const value = parseNonNegativeInteger(row.data[query.orderBy], `cursor.${query.orderBy}`);
  return Buffer.from(JSON.stringify({
    collection: query.collection,
    orderBy: query.orderBy,
    caseId: query.caseId ?? '',
    value,
    id: row.id,
  }), 'utf8').toString('base64url');
}

function parseDecisionInput(value: unknown): DecisionInput {
  const input = inputRow(value, 'decision request');
  assertExactKeys(input, [
    'caseId', 'expectedCaseRevision', 'recommendationId', 'recommendationRevision',
    'recommendationContentHash', 'decision', 'reason', 'idempotencyKey',
  ], 'decision request');
  return Object.freeze({
    caseId: parseIdentifier(input.caseId, 'caseId'),
    expectedCaseRevision: parsePositiveInteger(input.expectedCaseRevision, 'expectedCaseRevision'),
    recommendationId: parseIdentifier(input.recommendationId, 'recommendationId'),
    recommendationRevision: parsePositiveInteger(input.recommendationRevision, 'recommendationRevision'),
    recommendationContentHash: parseHash(input.recommendationContentHash, 'recommendationContentHash'),
    decision: parseDecision(input.decision),
    reason: parseBoundedText(input.reason, 'reason', 500),
    idempotencyKey: parseIdempotencyKey(input.idempotencyKey),
  });
}

function parseSetKillSwitchInput(value: unknown): SetKillSwitchInput {
  const input = inputRow(value, 'kill switch request');
  assertExactKeys(input, ['enabled', 'expectedRevision', 'reason', 'idempotencyKey'], 'kill switch request');
  return Object.freeze({
    enabled: parseBoolean(input.enabled, 'enabled'),
    expectedRevision: parseNonNegativeInteger(input.expectedRevision, 'expectedRevision'),
    reason: parseBoundedText(input.reason, 'reason', 500),
    idempotencyKey: parseIdempotencyKey(input.idempotencyKey),
  });
}

function keyHash(actorUid: string, idempotencyKey: string): string {
  return sha256(JSON.stringify([actorUid, idempotencyKey]));
}

function decisionPayloadHash(actorUid: string, input: DecisionInput): string {
  return sha256(JSON.stringify({
    actorUid,
    caseId: input.caseId,
    expectedCaseRevision: input.expectedCaseRevision,
    recommendationId: input.recommendationId,
    recommendationRevision: input.recommendationRevision,
    recommendationContentHash: input.recommendationContentHash,
    decision: input.decision,
    reason: input.reason,
    scope: AGENT_OFFICE_SCOPE,
  }));
}

function controlPayloadHash(actorUid: string, input: SetKillSwitchInput): string {
  return sha256(JSON.stringify({
    actorUid,
    enabled: input.enabled,
    expectedRevision: input.expectedRevision,
    reason: input.reason,
  }));
}

function decisionResult(approval: AgentApproval, idempotent: boolean) {
  return Object.freeze({
    ok: true as const,
    idempotent,
    approvalId: approval.approvalId,
    decision: approval.decision,
    scope: AGENT_OFFICE_SCOPE,
    enqueuedTaskId: null,
    caseRevision: approval.caseRevisionAfter,
  });
}

function controlResult(control: AgentOfficeControl, idempotent: boolean) {
  return Object.freeze({
    ok: true as const,
    idempotent,
    operation: Object.freeze({ revision: control.revision, killSwitchEnabled: control.killSwitchEnabled }),
    control: projectAgentOfficeControl(control as unknown as Record<string, unknown>),
  });
}

function currentControlProjection(document: AgentOfficeDocument | null) {
  if (!document) {
    return Object.freeze({
      controlId: 'global' as const,
      killSwitchEnabled: true,
      revision: 0,
      state: 'missing_fail_closed' as const,
      lastChangedAtMs: null,
    });
  }
  try {
    return projectAgentOfficeControl(document.data);
  } catch {
    return Object.freeze({
      controlId: 'global' as const,
      killSwitchEnabled: true,
      revision: 0,
      state: 'invalid_fail_closed' as const,
      lastChangedAtMs: null,
    });
  }
}

export class AgentOfficeLedger {
  constructor(
    private readonly repository: AgentOfficeRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async listCases(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    requireAgentOfficeReader(auth, 'briefing.read');
    const input = parseListInput(value);
    const baseQuery = {
      collection: 'agent_cases' as const,
      orderBy: 'updatedAtMs' as const,
      limit: input.limit + 1,
    };
    const query: AgentOfficeQuery = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, '') };
    const rows = await this.repository.query(query);
    const page = rows.slice(0, input.limit);
    return Object.freeze({
      ok: true as const,
      items: Object.freeze(page.map((row) => projectAgentCase(row.id, row.data))),
      nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
    });
  }

  async getCase(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    requireAgentOfficeReader(auth, 'briefing.read');
    const input = inputRow(value, 'get case request');
    assertExactKeys(input, ['caseId'], 'get case request');
    const caseId = parseIdentifier(input.caseId, 'caseId');
    const document = await this.repository.get(`agent_cases/${caseId}`);
    if (!document) throw new HttpsError('not-found', 'Agent case not found');
    return Object.freeze({ ok: true as const, item: projectAgentCase(document.id, document.data) });
  }

  async getAggregateHealth(auth: AgentOfficeAuth | null | undefined) {
    requireAgentOfficeReader(auth, 'briefing.read');
    requireAgentOfficeOwner(auth);
    const rows = await this.repository.query({
      collection: 'agent_observation_receipts',
      orderBy: 'observedAtMs',
      limit: 1,
    });
    const latest = rows[0];
    if (!latest) throw new HttpsError('failed-precondition', 'Agent Office aggregate health is unavailable');
    return Object.freeze({
      ok: true as const,
      items: projectAgentAggregateHealth(latest.data),
    });
  }

  async listRecommendations(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    requireAgentOfficeReader(auth, 'briefing.read');
    const input = parseCaseListInput(value, false);
    const baseQuery = {
      collection: 'agent_recommendations' as const,
      orderBy: 'revision' as const,
      limit: input.limit + 1,
      caseId: input.caseId,
    };
    const query: AgentOfficeQuery = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, input.caseId) };
    const rows = await this.repository.query(query);
    const page = rows.slice(0, input.limit);
    return Object.freeze({
      ok: true as const,
      items: Object.freeze(page.map((row) => projectAgentRecommendation(row.id, row.data))),
      nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
    });
  }

  async listTasks(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    requireAgentOfficeReader(auth, 'diagnostics.read');
    const input = parseListInput(value);
    const baseQuery = {
      collection: 'agent_tasks' as const,
      orderBy: 'createdAtMs' as const,
      limit: input.limit + 1,
    };
    const query: AgentOfficeQuery = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, '') };
    const rows = await this.repository.query(query);
    const page = rows.slice(0, input.limit);
    return Object.freeze({
      ok: true as const,
      items: Object.freeze(page.map((row) => projectAgentTask(row.id, row.data))),
      nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
    });
  }

  async listAuditEvents(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    requireAgentOfficeReader(auth, 'diagnostics.read');
    const input = parseCaseListInput(value, true);
    const baseQuery = {
      collection: 'agent_audit_events' as const,
      orderBy: 'occurredAtMs' as const,
      limit: input.limit + 1,
      ...(input.caseId ? { caseId: input.caseId } : {}),
    };
    const query: AgentOfficeQuery = { ...baseQuery, cursor: decodeCursor(input.cursor, baseQuery.collection, baseQuery.orderBy, input.caseId) };
    const rows = await this.repository.query(query);
    const page = rows.slice(0, input.limit);
    return Object.freeze({
      ok: true as const,
      items: Object.freeze(page.map((row) => projectAgentAuditEvent(row.id, row.data))),
      nextCursor: rows.length > input.limit && page.length ? encodeCursor(query, page[page.length - 1]) : null,
    });
  }

  async decideRecommendation(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    return this.decideRecommendationInternal(auth, value);
  }

  async decideTelegramRecommendation(
    auth: AgentOfficeAuth | null | undefined,
    value: unknown,
    guard: AgentTelegramDecisionGuard,
  ) {
    return this.decideRecommendationInternal(auth, value, guard);
  }

  private async decideRecommendationInternal(
    auth: AgentOfficeAuth | null | undefined,
    value: unknown,
    telegramGuard?: AgentTelegramDecisionGuard,
  ) {
    const actor = requireAgentOfficeOwner(auth);
    const input = parseDecisionInput(value);
    const guardedToken = telegramGuard ? parseAgentTelegramApprovalToken(telegramGuard.token) : null;
    const guardedUpdateIdHash = telegramGuard ? parseHash(telegramGuard.updateIdHash, 'Telegram updateIdHash') : null;
    const approvalId = approvalDocumentId(input.caseId, input.recommendationId, input.recommendationRevision);
    const idempotencyKeyHash = keyHash(actor.actorUid, input.idempotencyKey);
    const payloadHash = decisionPayloadHash(actor.actorUid, input);
    const auditId = `decision_${idempotencyKeyHash}`;
    const auditPath = `agent_audit_events/${auditId}`;
    const approvalPath = `agent_approvals/${approvalId}`;
    const casePath = `agent_cases/${input.caseId}`;
    const recommendationPath = `agent_recommendations/${input.caseId}__r${input.recommendationRevision}`;
    const controlPath = 'agent_office_control/global';
    const tokenPath = guardedToken ? telegramApprovalTokenPath(guardedToken.tokenIdHash) : null;
    return this.repository.runTransaction(async (transaction) => {
      const controlDocument = guardedToken ? await transaction.get(controlPath) : null;
      const tokenDocument = tokenPath ? await transaction.get(tokenPath) : null;
      const replayAuditDocument = await transaction.get(auditPath);
      const caseDocument = await transaction.get(casePath);
      const recommendationDocument = await transaction.get(recommendationPath);
      const approvalDocument = await transaction.get(approvalPath);
      const nowMs = this.now();

      let persistedToken: ReturnType<typeof parseAgentTelegramApprovalToken> | null = null;
      if (guardedToken) {
        if (!guardedUpdateIdHash || !controlDocument || !tokenDocument || !tokenPath) {
          throw new HttpsError('failed-precondition', 'Telegram approval guard is unavailable');
        }
        const control = parseAgentOfficeControl(controlDocument.data);
        if (control.killSwitchEnabled) throw new HttpsError('failed-precondition', 'Agent Office kill switch is enabled');
        if (control.revision !== guardedToken.controlRevision) throw new HttpsError('failed-precondition', 'stale Telegram control revision');
        persistedToken = parseAgentTelegramApprovalToken(tokenDocument.data);
        if (JSON.stringify(persistedToken) !== JSON.stringify(guardedToken)) {
          throw new HttpsError('failed-precondition', 'Telegram approval token binding mismatch');
        }
        if (persistedToken.ownerUid !== actor.actorUid
          || persistedToken.caseId !== input.caseId
          || persistedToken.expectedCaseRevision !== input.expectedCaseRevision
          || persistedToken.recommendationId !== input.recommendationId
          || persistedToken.recommendationRevision !== input.recommendationRevision
          || persistedToken.recommendationContentHash !== input.recommendationContentHash
          || (persistedToken.permittedVerb === 'authorize' ? 'approve' : 'decline') !== input.decision) {
          throw new HttpsError('failed-precondition', 'Telegram approval token scope mismatch');
        }
        if (persistedToken.issuedAtMs > nowMs || persistedToken.validUntilMs <= nowMs) {
          throw new HttpsError('failed-precondition', 'Telegram approval token expired');
        }
        if (persistedToken.status === 'revoked') throw new HttpsError('failed-precondition', 'Telegram approval token is revoked');
        if (persistedToken.status === 'consumed'
          && (persistedToken.consumedUpdateIdHash !== guardedUpdateIdHash || persistedToken.consumedApprovalId !== approvalId)) {
          throw new HttpsError('failed-precondition', 'Telegram approval token replay mismatch');
        }
      }

      if (replayAuditDocument) {
        if (persistedToken && persistedToken.status !== 'consumed') {
          throw new HttpsError('data-loss', 'Telegram approval token consumption is missing');
        }
        const replayAudit = parseAgentAuditEvent(replayAuditDocument.data);
        if (replayAudit.eventType !== 'recommendation_decided' || replayAudit.payloadHash !== payloadHash) {
          throw new HttpsError('failed-precondition', 'idempotency key conflict');
        }
        if (!approvalDocument) throw new HttpsError('data-loss', 'idempotent approval is missing');
        const approval = parseAgentApproval(approvalDocument.data);
        if (approval.idempotencyKeyHash !== idempotencyKeyHash || approval.idempotencyPayloadHash !== payloadHash) {
          throw new HttpsError('data-loss', 'idempotent approval mismatch');
        }
        return decisionResult(approval, true);
      }

      if (!caseDocument) throw new HttpsError('not-found', 'Agent case not found');
      const agentCase = parseAgentCase(caseDocument.data);
      if (agentCase.revision !== input.expectedCaseRevision) throw new HttpsError('failed-precondition', 'stale case revision');
      if (agentCase.status !== 'awaiting_decision') throw new HttpsError('failed-precondition', 'case is not awaiting decision');
      const current = agentCase.currentRecommendation;
      if (!current || current.recommendationId !== input.recommendationId || current.revision !== input.recommendationRevision) {
        throw new HttpsError('failed-precondition', 'stale recommendation revision');
      }
      if (current.contentHash !== input.recommendationContentHash) throw new HttpsError('failed-precondition', 'recommendation contentHash mismatch');
      if (!recommendationDocument) throw new HttpsError('not-found', 'Agent recommendation not found');
      if (approvalDocument) throw new HttpsError('failed-precondition', 'immutable approval already exists');

      const recommendation = parseAgentRecommendation(recommendationDocument.data);
      if (recommendation.caseId !== input.caseId || recommendation.recommendationId !== input.recommendationId || recommendation.revision !== input.recommendationRevision) {
        throw new HttpsError('failed-precondition', 'recommendation identity mismatch');
      }
      if (recommendation.contentHash !== input.recommendationContentHash) throw new HttpsError('failed-precondition', 'recommendation contentHash mismatch');
      if (recommendation.contentHash !== agentRecommendationContentHash(recommendation)) {
        throw new HttpsError('failed-precondition', 'recommendation canonical contentHash mismatch');
      }
      if (recommendation.scope !== AGENT_OFFICE_SCOPE) throw new HttpsError('failed-precondition', 'recommendation scope is not prepare_only');
      if (recommendation.validUntilMs <= nowMs) throw new HttpsError('failed-precondition', 'recommendation expired');
      if (persistedToken && persistedToken.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Telegram approval token already consumed');
      }

      const nextStatus = input.decision === 'approve' ? 'approved' : 'cancelled';
      assertAgentCaseTransition(agentCase.status, nextStatus);
      const nextCaseRevision = agentCase.revision + 1;
      const approval = parseAgentApproval({
        schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
        approvalId,
        caseId: input.caseId,
        caseRevisionBefore: agentCase.revision,
        caseRevisionAfter: nextCaseRevision,
        recommendationId: input.recommendationId,
        recommendationRevision: input.recommendationRevision,
        recommendationContentHash: input.recommendationContentHash,
        decision: input.decision,
        scope: AGENT_OFFICE_SCOPE,
        ownerUid: actor.actorUid,
        reason: input.reason,
        idempotencyKeyHash,
        idempotencyPayloadHash: payloadHash,
        decidedAtMs: nowMs,
        enqueuedTaskId: null,
      });
      const audit: AgentAuditEvent = parseAgentAuditEvent({
        schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
        eventId: auditId,
        eventType: 'recommendation_decided',
        caseId: input.caseId,
        recommendationId: input.recommendationId,
        approvalId,
        decision: input.decision,
        caseRevision: nextCaseRevision,
        actorRole: 'owner',
        scope: AGENT_OFFICE_SCOPE,
        idempotencyKeyHash,
        payloadHash,
        occurredAtMs: nowMs,
        piiClass: 'none',
      });

      transaction.create(approvalPath, approval as unknown as Record<string, unknown>);
      transaction.create(auditPath, audit as unknown as Record<string, unknown>);
      transaction.update(casePath, { status: nextStatus, revision: nextCaseRevision, updatedAtMs: nowMs });
      if (tokenPath && guardedUpdateIdHash) {
        transaction.update(tokenPath, {
          status: 'consumed',
          consumedAtMs: nowMs,
          consumedApprovalId: approvalId,
          consumedUpdateIdHash: guardedUpdateIdHash,
        });
      }
      return decisionResult(approval, false);
    });
  }

  async getControl(auth: AgentOfficeAuth | null | undefined) {
    requireAgentOfficeReader(auth, 'briefing.read');
    const document = await this.repository.get('agent_office_control/global');
    return Object.freeze({ ok: true as const, control: currentControlProjection(document) });
  }

  async setKillSwitch(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    const actor = requireAgentOfficeOwner(auth);
    const input = parseSetKillSwitchInput(value);
    const idempotencyKeyHash = keyHash(actor.actorUid, input.idempotencyKey);
    const payloadHash = controlPayloadHash(actor.actorUid, input);
    const auditId = `control_${idempotencyKeyHash}`;
    const auditPath = `agent_audit_events/${auditId}`;
    const controlPath = 'agent_office_control/global';
    const nowMs = this.now();

    return this.repository.runTransaction(async (transaction) => {
      const replayAuditDocument = await transaction.get(auditPath);
      const controlDocument = await transaction.get(controlPath);

      if (replayAuditDocument) {
        const replayAudit = parseAgentAuditEvent(replayAuditDocument.data);
        if (replayAudit.eventType !== 'kill_switch_changed' || replayAudit.payloadHash !== payloadHash) {
          throw new HttpsError('failed-precondition', 'idempotency key conflict');
        }
        return Object.freeze({
          ok: true as const,
          idempotent: true,
          operation: Object.freeze({
            revision: replayAudit.controlRevision,
            killSwitchEnabled: replayAudit.killSwitchEnabled,
          }),
          control: currentControlProjection(controlDocument),
        });
      }

      let current: AgentOfficeControl | null = null;
      if (controlDocument) current = parseAgentOfficeControl(controlDocument.data);
      if (!current && !input.enabled) throw new HttpsError('failed-precondition', 'control uninitialized; initialize enabled first');
      const currentRevision = current?.revision ?? 0;
      if (input.expectedRevision !== currentRevision) throw new HttpsError('failed-precondition', 'stale control revision');
      const nextRevision = currentRevision + 1;
      const control = parseAgentOfficeControl({
        schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
        controlId: 'global',
        killSwitchEnabled: input.enabled,
        revision: nextRevision,
        lastChangedAtMs: nowMs,
        lastChangedByUid: actor.actorUid,
        lastIdempotencyKeyHash: idempotencyKeyHash,
        lastPayloadHash: payloadHash,
      });
      const audit = parseAgentAuditEvent({
        schemaVersion: AGENT_OFFICE_SCHEMA_VERSION,
        eventId: auditId,
        eventType: 'kill_switch_changed',
        controlRevision: nextRevision,
        killSwitchEnabled: input.enabled,
        actorRole: 'owner',
        idempotencyKeyHash,
        payloadHash,
        occurredAtMs: nowMs,
        piiClass: 'none',
      });

      transaction.set(controlPath, control as unknown as Record<string, unknown>);
      transaction.create(auditPath, audit as unknown as Record<string, unknown>);
      return controlResult(control, false);
    });
  }
}

export type AgentOfficeReadPermission = Extract<AdminPermission, 'briefing.read' | 'diagnostics.read'>;
