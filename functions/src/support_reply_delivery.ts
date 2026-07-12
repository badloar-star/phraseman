import { createHash } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';

export const SUPPORT_REPLY_SCHEMA_VERSION = 2;
export const SUPPORT_REPLY_CONFIRMATION_TTL_MS = 15 * 60 * 1000;
export const SUPPORT_REPLY_TEXT_MAX_CHARS = 20_000;

export type SupportReplyState =
  | 'prepared'
  | 'dispatching'
  | 'accepted'
  | 'delivery_unknown'
  | 'verified_not_sent'
  | 'cancelled'
  | 'expired';

export interface SupportReplyPayload {
  readonly to: string;
  readonly subject: string;
  readonly inReplyTo: string;
  readonly finalText: string;
  readonly signatureRevision: number;
}

export interface SupportReplyOperation {
  readonly schemaVersion: 2;
  readonly operationId: string;
  readonly messageDocId: string;
  readonly replySequence: number;
  readonly batchId?: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
  readonly state: SupportReplyState;
  readonly draftRevision: number;
  readonly payloadHash: string;
  readonly payload: SupportReplyPayload;
  readonly outboundMessageId: string;
  readonly confirmationNonce: string;
  readonly confirmationExpiresAt: string;
  readonly confirmedAt?: string;
  readonly confirmedBy?: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly dispatchStartedAt?: string;
  readonly dispatchInvocationId?: string;
  readonly acceptedAt?: string;
  readonly reconciledAt?: string;
  readonly lastErrorCode?: string;
}

export interface SupportReplyPrepareRequest {
  readonly messageDocId: string;
  readonly replyText: string;
  readonly expectedDraftRevision: number;
  readonly idempotencyKey: string;
  readonly requestId: string;
}

export interface SupportReplyDispatchRequest {
  readonly operationId: string;
  readonly confirmationNonce: string;
  readonly payloadHash: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedRequired(value: unknown, name: string, max: number): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > max) {
    throw new HttpsError('invalid-argument', `${name} required (max ${max})`);
  }
  return normalized;
}

export function parseSupportReplyPrepareRequest(data: unknown): SupportReplyPrepareRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  const expectedDraftRevision = Number(data.expectedDraftRevision);
  if (!Number.isInteger(expectedDraftRevision) || expectedDraftRevision < 0) {
    throw new HttpsError('invalid-argument', 'expectedDraftRevision must be a non-negative integer');
  }
  return Object.freeze({
    messageDocId: boundedRequired(data.messageDocId, 'messageDocId', 500),
    replyText: boundedRequired(data.replyText, 'replyText', SUPPORT_REPLY_TEXT_MAX_CHARS),
    expectedDraftRevision,
    idempotencyKey: boundedRequired(data.idempotencyKey, 'idempotencyKey', 120),
    requestId: boundedRequired(data.requestId, 'requestId', 120),
  });
}

export function parseSupportReplyDispatchRequest(data: unknown): SupportReplyDispatchRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  const operationId = boundedRequired(data.operationId, 'operationId', 120);
  const confirmationNonce = boundedRequired(data.confirmationNonce, 'confirmationNonce', 200);
  const payloadHash = boundedRequired(data.payloadHash, 'payloadHash', 128);
  if (!/^[a-f0-9]{64}$/i.test(payloadHash)) throw new HttpsError('invalid-argument', 'payloadHash must be sha256');
  return Object.freeze({
    operationId,
    confirmationNonce,
    payloadHash: payloadHash.toLowerCase(),
  });
}

function canonicalPayload(payload: SupportReplyPayload): string {
  return JSON.stringify({
    to: String(payload.to),
    subject: String(payload.subject),
    inReplyTo: String(payload.inReplyTo),
    finalText: String(payload.finalText),
    signatureRevision: Number(payload.signatureRevision),
  });
}

export function canonicalReplyPayloadHash(payload: SupportReplyPayload): string {
  return createHash('sha256').update(canonicalPayload(payload), 'utf8').digest('hex');
}

export function supportReplyOperationId(idempotencyKey: string): string {
  return `sr_${createHash('sha256').update(idempotencyKey, 'utf8').digest('hex').slice(0, 40)}`;
}

export interface SupportReplyBatchChildIdentity {
  readonly operationId: string;
  readonly messageDocId: string;
  readonly payloadHash: string;
}

export type SupportReplyBatchState = 'prepared' | 'dispatching' | 'accepted' | 'attention_required' | 'partial' | 'cancelled';

export function isSupportReplyBatchDispatchableState(state: unknown): state is 'prepared' | 'dispatching' | 'attention_required' | 'partial' {
  return state === 'prepared' || state === 'dispatching' || state === 'attention_required' || state === 'partial';
}

export function supportReplyBatchId(idempotencyKey: string): string {
  return `srb_${createHash('sha256').update(idempotencyKey, 'utf8').digest('hex').slice(0, 40)}`;
}

export function canonicalSupportBatchManifestHash(children: readonly SupportReplyBatchChildIdentity[]): string {
  const canonical = [...children]
    .map((child) => ({
      operationId: String(child.operationId),
      messageDocId: String(child.messageDocId),
      payloadHash: String(child.payloadHash).toLowerCase(),
    }))
    .sort((left, right) => left.operationId.localeCompare(right.operationId));
  return createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}

export function summarizeSupportReplyBatch(states: readonly SupportReplyState[]): {
  readonly state: SupportReplyBatchState;
  readonly accepted: number;
  readonly attention: number;
  readonly pending: number;
  readonly failed: number;
} {
  const accepted = states.filter((state) => state === 'accepted').length;
  const attention = states.filter((state) => state === 'delivery_unknown' || state === 'dispatching').length;
  const pending = states.filter((state) => state === 'prepared').length;
  const failed = states.length - accepted - attention - pending;
  const state: SupportReplyBatchState = attention > 0
    ? 'attention_required'
    : pending > 0
      ? 'dispatching'
      : failed > 0
        ? 'partial'
        : 'accepted';
  return Object.freeze({ state, accepted, attention, pending, failed });
}

export function deterministicSupportMessageId(operationId: string): string {
  const safe = String(operationId).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  return `<pm-support-${safe}@phraseman.app>`;
}

export function buildPreparedSupportReply(input: {
  readonly operationId: string;
  readonly messageDocId: string;
  readonly replySequence: number;
  readonly batchId?: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
  readonly draftRevision: number;
  readonly payload: SupportReplyPayload;
  readonly confirmationNonce: string;
  readonly confirmationExpiresAt: string;
  readonly actorUid: string;
  readonly createdAt: string;
  readonly state?: SupportReplyState;
}): SupportReplyOperation {
  const frozenPayload = Object.freeze({ ...input.payload });
  return Object.freeze({
    schemaVersion: SUPPORT_REPLY_SCHEMA_VERSION,
    operationId: input.operationId,
    messageDocId: input.messageDocId,
    replySequence: input.replySequence,
    ...(input.batchId ? { batchId: input.batchId } : {}),
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    requestFingerprint: input.requestFingerprint,
    state: input.state ?? 'prepared',
    draftRevision: input.draftRevision,
    payloadHash: canonicalReplyPayloadHash(frozenPayload),
    payload: frozenPayload,
    outboundMessageId: deterministicSupportMessageId(input.operationId),
    confirmationNonce: input.confirmationNonce,
    confirmationExpiresAt: input.confirmationExpiresAt,
    createdAt: input.createdAt,
    createdBy: input.actorUid,
  });
}

export type SupportReplyClaimResult =
  | { readonly kind: 'claimed'; readonly operation: SupportReplyOperation }
  | { readonly kind: 'replay'; readonly state: SupportReplyState };

export interface SupportReplyDispatchDependencies {
  readonly preflight: () => Promise<void>;
  readonly claim: (input: SupportReplyDispatchRequest & { readonly invocationId: string }) => Promise<SupportReplyClaimResult>;
  readonly deliver: (
    payload: SupportReplyPayload,
    headers: { readonly messageId: string; readonly operationId: string },
  ) => Promise<{ readonly outboundMessageId?: string }>;
  readonly accept: (operationId: string, invocationId: string, outboundMessageId: string) => Promise<void>;
  readonly markUnknown: (operationId: string, invocationId: string, errorCode: string) => Promise<void>;
  readonly createInvocationId: () => string;
}

export interface SupportReplyDispatchResult {
  readonly operationId: string;
  readonly state: SupportReplyState;
  readonly replayed: boolean;
  readonly outboundMessageId?: string;
  readonly errorCode?: string;
}

function boundedErrorCode(error: unknown): string {
  const candidate = error instanceof Error ? error.message : String(error ?? 'smtp_unknown');
  return candidate.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'smtp_unknown';
}

/**
 * Performs one durable dispatch attempt. Once claim() wins, every ambiguous
 * SMTP outcome is terminal `delivery_unknown`; this function never retries.
 */
export async function dispatchSupportReply(
  request: SupportReplyDispatchRequest,
  dependencies: SupportReplyDispatchDependencies,
): Promise<SupportReplyDispatchResult> {
  await dependencies.preflight();
  const invocationId = dependencies.createInvocationId();
  const claim = await dependencies.claim({ ...request, invocationId });
  if (claim.kind === 'replay') {
    return { operationId: request.operationId, state: claim.state, replayed: true };
  }

  const operation = claim.operation;
  try {
    const delivered = await dependencies.deliver(operation.payload, {
      messageId: deterministicSupportMessageId(operation.operationId),
      operationId: operation.operationId,
    });
    const outboundMessageId = String(delivered.outboundMessageId || operation.outboundMessageId);
    try {
      await dependencies.accept(operation.operationId, invocationId, outboundMessageId);
      return { operationId: operation.operationId, state: 'accepted', replayed: false, outboundMessageId };
    } catch (error) {
      const errorCode = boundedErrorCode(error);
      await dependencies.markUnknown(operation.operationId, invocationId, errorCode).catch(() => undefined);
      return { operationId: operation.operationId, state: 'delivery_unknown', replayed: false, outboundMessageId, errorCode };
    }
  } catch (error) {
    const errorCode = boundedErrorCode(error);
    await dependencies.markUnknown(operation.operationId, invocationId, errorCode).catch(() => undefined);
    return { operationId: operation.operationId, state: 'delivery_unknown', replayed: false, errorCode };
  }
}
