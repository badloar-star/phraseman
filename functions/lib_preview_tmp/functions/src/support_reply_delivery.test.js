"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const support_reply_delivery_1 = require("./support_reply_delivery");
const payload = {
    to: 'person@example.com',
    subject: 'Re: Help',
    inReplyTo: '<incoming@example.com>',
    finalText: 'Hello\n\nPhraseman Support',
    signatureRevision: 3,
};
function operation(state = 'prepared') {
    return (0, support_reply_delivery_1.buildPreparedSupportReply)({
        operationId: 'sr_test_operation',
        messageDocId: 'message-1',
        replySequence: 1,
        idempotencyKey: 'idem-1',
        requestId: 'request-1',
        requestFingerprint: 'fingerprint-1',
        draftRevision: 4,
        payload,
        confirmationNonce: 'nonce-1234567890',
        confirmationExpiresAt: '2030-01-01T00:10:00.000Z',
        actorUid: 'admin-1',
        createdAt: '2030-01-01T00:00:00.000Z',
        state,
    });
}
describe('support reply delivery contract', () => {
    test('parses bounded immutable prepare and dispatch requests', () => {
        expect((0, support_reply_delivery_1.parseSupportReplyPrepareRequest)({
            messageDocId: 'message-1',
            replyText: ' Exact edited reply ',
            expectedDraftRevision: 4,
            idempotencyKey: 'idem-1',
            requestId: 'request-1',
        })).toEqual({
            messageDocId: 'message-1',
            replyText: 'Exact edited reply',
            expectedDraftRevision: 4,
            idempotencyKey: 'idem-1',
            requestId: 'request-1',
        });
        expect((0, support_reply_delivery_1.parseSupportReplyDispatchRequest)({
            operationId: 'sr_test_operation',
            confirmationNonce: 'nonce-1234567890',
            payloadHash: (0, support_reply_delivery_1.canonicalReplyPayloadHash)(payload),
        })).toEqual({
            operationId: 'sr_test_operation',
            confirmationNonce: 'nonce-1234567890',
            payloadHash: (0, support_reply_delivery_1.canonicalReplyPayloadHash)(payload),
        });
        expect(() => (0, support_reply_delivery_1.parseSupportReplyPrepareRequest)({ messageDocId: 'x', replyText: '', expectedDraftRevision: 0, idempotencyKey: 'i', requestId: 'r' })).toThrow('replyText');
        expect(() => (0, support_reply_delivery_1.parseSupportReplyDispatchRequest)({ operationId: 'x', confirmationNonce: '', payloadHash: 'x' })).toThrow('confirmationNonce');
    });
    test('seals the exact recipient, reply, signature revision and deterministic headers', () => {
        const prepared = operation();
        expect(prepared.payload).toEqual(payload);
        expect(prepared.payloadHash).toBe((0, support_reply_delivery_1.canonicalReplyPayloadHash)(payload));
        expect((0, support_reply_delivery_1.canonicalReplyPayloadHash)({ ...payload, finalText: `${payload.finalText}!` })).not.toBe(prepared.payloadHash);
        expect((0, support_reply_delivery_1.deterministicSupportMessageId)(prepared.operationId)).toBe('<pm-support-sr_test_operation@phraseman.app>');
        expect(Object.isFrozen(prepared.payload)).toBe(true);
        expect(Object.isFrozen(prepared)).toBe(true);
    });
    test('two concurrent dispatches invoke SMTP at most once', async () => {
        let current = operation();
        let sends = 0;
        const dependencies = {
            preflight: jest.fn(async () => undefined),
            claim: jest.fn(async () => {
                if (current.state !== 'prepared')
                    return { kind: 'replay', state: current.state };
                current = { ...current, state: 'dispatching' };
                return { kind: 'claimed', operation: current };
            }),
            deliver: jest.fn(async () => {
                sends += 1;
                await Promise.resolve();
                return { outboundMessageId: '<gmail-accepted@example.com>' };
            }),
            accept: jest.fn(async (_operationId, _invocationId, outboundMessageId) => {
                current = { ...current, state: 'accepted', outboundMessageId };
            }),
            markUnknown: jest.fn(async () => {
                current = { ...current, state: 'delivery_unknown' };
            }),
            createInvocationId: () => 'invocation-1',
        };
        const request = {
            operationId: current.operationId,
            confirmationNonce: current.confirmationNonce,
            payloadHash: current.payloadHash,
        };
        const results = await Promise.all([
            (0, support_reply_delivery_1.dispatchSupportReply)(request, dependencies),
            (0, support_reply_delivery_1.dispatchSupportReply)(request, dependencies),
        ]);
        expect(sends).toBe(1);
        expect(results.map((result) => result.state)).toEqual(expect.arrayContaining(['accepted', 'dispatching']));
        expect(dependencies.accept).toHaveBeenCalledTimes(1);
    });
    test.each(['dispatching', 'accepted', 'delivery_unknown', 'cancelled', 'expired'])('a %s replay never invokes SMTP', async (state) => {
        const deliver = jest.fn();
        const result = await (0, support_reply_delivery_1.dispatchSupportReply)({
            operationId: 'sr_test_operation',
            confirmationNonce: 'nonce-1234567890',
            payloadHash: (0, support_reply_delivery_1.canonicalReplyPayloadHash)(payload),
        }, {
            preflight: jest.fn(async () => undefined),
            claim: jest.fn(async () => ({ kind: 'replay', state })),
            deliver,
            accept: jest.fn(),
            markUnknown: jest.fn(),
            createInvocationId: () => 'invocation-replay',
        });
        expect(result).toEqual({ operationId: 'sr_test_operation', state, replayed: true });
        expect(deliver).not.toHaveBeenCalled();
    });
    test('an SMTP timeout becomes delivery_unknown and is never automatically retried', async () => {
        let current = operation();
        const deliver = jest.fn(async () => { throw new Error('smtp_timeout'); });
        const dependencies = {
            preflight: jest.fn(async () => undefined),
            claim: jest.fn(async () => {
                if (current.state !== 'prepared')
                    return { kind: 'replay', state: current.state };
                current = { ...current, state: 'dispatching' };
                return { kind: 'claimed', operation: current };
            }),
            deliver,
            accept: jest.fn(),
            markUnknown: jest.fn(async () => { current = { ...current, state: 'delivery_unknown' }; }),
            createInvocationId: () => 'invocation-timeout',
        };
        const request = { operationId: current.operationId, confirmationNonce: current.confirmationNonce, payloadHash: current.payloadHash };
        await expect((0, support_reply_delivery_1.dispatchSupportReply)(request, dependencies)).resolves.toMatchObject({ state: 'delivery_unknown', replayed: false });
        await expect((0, support_reply_delivery_1.dispatchSupportReply)(request, dependencies)).resolves.toMatchObject({ state: 'delivery_unknown', replayed: true });
        expect(deliver).toHaveBeenCalledTimes(1);
    });
    test('preflight failure happens before the durable dispatch claim', async () => {
        const claim = jest.fn();
        await expect((0, support_reply_delivery_1.dispatchSupportReply)({
            operationId: 'sr_test_operation',
            confirmationNonce: 'nonce-1234567890',
            payloadHash: (0, support_reply_delivery_1.canonicalReplyPayloadHash)(payload),
        }, {
            preflight: jest.fn(async () => { throw new Error('smtp_auth_failed'); }),
            claim,
            deliver: jest.fn(),
            accept: jest.fn(),
            markUnknown: jest.fn(),
            createInvocationId: () => 'invocation-preflight',
        })).rejects.toThrow('smtp_auth_failed');
        expect(claim).not.toHaveBeenCalled();
    });
    test('batch manifest identity is order-stable and detects every child change', () => {
        const children = [
            { operationId: 'sr_b', messageDocId: 'm-b', payloadHash: 'b'.repeat(64) },
            { operationId: 'sr_a', messageDocId: 'm-a', payloadHash: 'a'.repeat(64) },
        ];
        expect((0, support_reply_delivery_1.canonicalSupportBatchManifestHash)(children)).toBe((0, support_reply_delivery_1.canonicalSupportBatchManifestHash)([...children].reverse()));
        expect((0, support_reply_delivery_1.canonicalSupportBatchManifestHash)(children)).not.toBe((0, support_reply_delivery_1.canonicalSupportBatchManifestHash)([
            children[0],
            { ...children[1], payloadHash: 'c'.repeat(64) },
        ]));
        expect((0, support_reply_delivery_1.supportReplyBatchId)('batch-key')).toMatch(/^srb_[a-f0-9]{40}$/);
    });
    test('batch summary requires attention for any ambiguous child and never calls it successful', () => {
        expect((0, support_reply_delivery_1.summarizeSupportReplyBatch)(['accepted', 'accepted'])).toEqual({ state: 'accepted', accepted: 2, attention: 0, pending: 0, failed: 0 });
        expect((0, support_reply_delivery_1.summarizeSupportReplyBatch)(['accepted', 'delivery_unknown', 'prepared'])).toEqual({ state: 'attention_required', accepted: 1, attention: 1, pending: 1, failed: 0 });
        expect((0, support_reply_delivery_1.summarizeSupportReplyBatch)(['accepted', 'cancelled'])).toEqual({ state: 'partial', accepted: 1, attention: 0, pending: 0, failed: 1 });
    });
    test('cancelled and accepted batches are terminal under a dispatch race', () => {
        expect((0, support_reply_delivery_1.isSupportReplyBatchDispatchableState)('prepared')).toBe(true);
        expect((0, support_reply_delivery_1.isSupportReplyBatchDispatchableState)('dispatching')).toBe(true);
        expect((0, support_reply_delivery_1.isSupportReplyBatchDispatchableState)('attention_required')).toBe(true);
        expect((0, support_reply_delivery_1.isSupportReplyBatchDispatchableState)('partial')).toBe(true);
        expect((0, support_reply_delivery_1.isSupportReplyBatchDispatchableState)('cancelled')).toBe(false);
        expect((0, support_reply_delivery_1.isSupportReplyBatchDispatchableState)('accepted')).toBe(false);
    });
});
//# sourceMappingURL=support_reply_delivery.test.js.map