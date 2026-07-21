"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_REPLY_TEXT_MAX_CHARS = exports.SUPPORT_REPLY_CONFIRMATION_TTL_MS = exports.SUPPORT_REPLY_SCHEMA_VERSION = void 0;
exports.parseSupportReplyPrepareRequest = parseSupportReplyPrepareRequest;
exports.parseSupportReplyDispatchRequest = parseSupportReplyDispatchRequest;
exports.canonicalReplyPayloadHash = canonicalReplyPayloadHash;
exports.supportReplyOperationId = supportReplyOperationId;
exports.isSupportReplyBatchDispatchableState = isSupportReplyBatchDispatchableState;
exports.supportReplyBatchId = supportReplyBatchId;
exports.canonicalSupportBatchManifestHash = canonicalSupportBatchManifestHash;
exports.summarizeSupportReplyBatch = summarizeSupportReplyBatch;
exports.deterministicSupportMessageId = deterministicSupportMessageId;
exports.buildPreparedSupportReply = buildPreparedSupportReply;
exports.dispatchSupportReply = dispatchSupportReply;
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
exports.SUPPORT_REPLY_SCHEMA_VERSION = 2;
exports.SUPPORT_REPLY_CONFIRMATION_TTL_MS = 15 * 60 * 1000;
exports.SUPPORT_REPLY_TEXT_MAX_CHARS = 20000;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function boundedRequired(value, name, max) {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.length > max) {
        throw new https_1.HttpsError('invalid-argument', `${name} required (max ${max})`);
    }
    return normalized;
}
function parseSupportReplyPrepareRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const expectedDraftRevision = Number(data.expectedDraftRevision);
    if (!Number.isInteger(expectedDraftRevision) || expectedDraftRevision < 0) {
        throw new https_1.HttpsError('invalid-argument', 'expectedDraftRevision must be a non-negative integer');
    }
    return Object.freeze({
        messageDocId: boundedRequired(data.messageDocId, 'messageDocId', 500),
        replyText: boundedRequired(data.replyText, 'replyText', exports.SUPPORT_REPLY_TEXT_MAX_CHARS),
        expectedDraftRevision,
        idempotencyKey: boundedRequired(data.idempotencyKey, 'idempotencyKey', 120),
        requestId: boundedRequired(data.requestId, 'requestId', 120),
    });
}
function parseSupportReplyDispatchRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const operationId = boundedRequired(data.operationId, 'operationId', 120);
    const confirmationNonce = boundedRequired(data.confirmationNonce, 'confirmationNonce', 200);
    const payloadHash = boundedRequired(data.payloadHash, 'payloadHash', 128);
    if (!/^[a-f0-9]{64}$/i.test(payloadHash))
        throw new https_1.HttpsError('invalid-argument', 'payloadHash must be sha256');
    return Object.freeze({
        operationId,
        confirmationNonce,
        payloadHash: payloadHash.toLowerCase(),
    });
}
function canonicalPayload(payload) {
    return JSON.stringify({
        to: String(payload.to),
        subject: String(payload.subject),
        inReplyTo: String(payload.inReplyTo),
        finalText: String(payload.finalText),
        signatureRevision: Number(payload.signatureRevision),
    });
}
function canonicalReplyPayloadHash(payload) {
    return (0, crypto_1.createHash)('sha256').update(canonicalPayload(payload), 'utf8').digest('hex');
}
function supportReplyOperationId(idempotencyKey) {
    return `sr_${(0, crypto_1.createHash)('sha256').update(idempotencyKey, 'utf8').digest('hex').slice(0, 40)}`;
}
function isSupportReplyBatchDispatchableState(state) {
    return state === 'prepared' || state === 'dispatching' || state === 'attention_required' || state === 'partial';
}
function supportReplyBatchId(idempotencyKey) {
    return `srb_${(0, crypto_1.createHash)('sha256').update(idempotencyKey, 'utf8').digest('hex').slice(0, 40)}`;
}
function canonicalSupportBatchManifestHash(children) {
    const canonical = [...children]
        .map((child) => ({
        operationId: String(child.operationId),
        messageDocId: String(child.messageDocId),
        payloadHash: String(child.payloadHash).toLowerCase(),
    }))
        .sort((left, right) => left.operationId.localeCompare(right.operationId));
    return (0, crypto_1.createHash)('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}
function summarizeSupportReplyBatch(states) {
    const accepted = states.filter((state) => state === 'accepted').length;
    const attention = states.filter((state) => state === 'delivery_unknown' || state === 'dispatching').length;
    const pending = states.filter((state) => state === 'prepared').length;
    const failed = states.length - accepted - attention - pending;
    const state = attention > 0
        ? 'attention_required'
        : pending > 0
            ? 'dispatching'
            : failed > 0
                ? 'partial'
                : 'accepted';
    return Object.freeze({ state, accepted, attention, pending, failed });
}
function deterministicSupportMessageId(operationId) {
    const safe = String(operationId).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    return `<pm-support-${safe}@phraseman.app>`;
}
function buildPreparedSupportReply(input) {
    const frozenPayload = Object.freeze({ ...input.payload });
    return Object.freeze({
        schemaVersion: exports.SUPPORT_REPLY_SCHEMA_VERSION,
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
function boundedErrorCode(error) {
    const candidate = error instanceof Error ? error.message : String(error ?? 'smtp_unknown');
    return candidate.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'smtp_unknown';
}
/**
 * Performs one durable dispatch attempt. Once claim() wins, every ambiguous
 * SMTP outcome is terminal `delivery_unknown`; this function never retries.
 */
async function dispatchSupportReply(request, dependencies) {
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
        }
        catch (error) {
            const errorCode = boundedErrorCode(error);
            await dependencies.markUnknown(operation.operationId, invocationId, errorCode).catch(() => undefined);
            return { operationId: operation.operationId, state: 'delivery_unknown', replayed: false, outboundMessageId, errorCode };
        }
    }
    catch (error) {
        const errorCode = boundedErrorCode(error);
        await dependencies.markUnknown(operation.operationId, invocationId, errorCode).catch(() => undefined);
        return { operationId: operation.operationId, state: 'delivery_unknown', replayed: false, errorCode };
    }
}
//# sourceMappingURL=support_reply_delivery.js.map