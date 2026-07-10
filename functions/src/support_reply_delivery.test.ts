import {
  buildPreparedSupportReply,
  canonicalSupportBatchManifestHash,
  canonicalReplyPayloadHash,
  deterministicSupportMessageId,
  dispatchSupportReply,
  parseSupportReplyDispatchRequest,
  parseSupportReplyPrepareRequest,
  summarizeSupportReplyBatch,
  supportReplyBatchId,
  isSupportReplyBatchDispatchableState,
  type SupportReplyOperation,
  type SupportReplyState,
} from './support_reply_delivery';

const payload = {
  to: 'person@example.com',
  subject: 'Re: Help',
  inReplyTo: '<incoming@example.com>',
  finalText: 'Hello\n\nPhraseman Support',
  signatureRevision: 3,
};

function operation(state: SupportReplyState = 'prepared'): SupportReplyOperation {
  return buildPreparedSupportReply({
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
    expect(parseSupportReplyPrepareRequest({
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
    expect(parseSupportReplyDispatchRequest({
      operationId: 'sr_test_operation',
      confirmationNonce: 'nonce-1234567890',
      payloadHash: canonicalReplyPayloadHash(payload),
    })).toEqual({
      operationId: 'sr_test_operation',
      confirmationNonce: 'nonce-1234567890',
      payloadHash: canonicalReplyPayloadHash(payload),
    });
    expect(() => parseSupportReplyPrepareRequest({ messageDocId: 'x', replyText: '', expectedDraftRevision: 0, idempotencyKey: 'i', requestId: 'r' })).toThrow('replyText');
    expect(() => parseSupportReplyDispatchRequest({ operationId: 'x', confirmationNonce: '', payloadHash: 'x' })).toThrow('confirmationNonce');
  });

  test('seals the exact recipient, reply, signature revision and deterministic headers', () => {
    const prepared = operation();
    expect(prepared.payload).toEqual(payload);
    expect(prepared.payloadHash).toBe(canonicalReplyPayloadHash(payload));
    expect(canonicalReplyPayloadHash({ ...payload, finalText: `${payload.finalText}!` })).not.toBe(prepared.payloadHash);
    expect(deterministicSupportMessageId(prepared.operationId)).toBe('<pm-support-sr_test_operation@phraseman.app>');
    expect(Object.isFrozen(prepared.payload)).toBe(true);
    expect(Object.isFrozen(prepared)).toBe(true);
  });

  test('two concurrent dispatches invoke SMTP at most once', async () => {
    let current = operation();
    let sends = 0;
    const dependencies = {
      preflight: jest.fn(async () => undefined),
      claim: jest.fn(async () => {
        if (current.state !== 'prepared') return { kind: 'replay' as const, state: current.state };
        current = { ...current, state: 'dispatching' };
        return { kind: 'claimed' as const, operation: current };
      }),
      deliver: jest.fn(async () => {
        sends += 1;
        await Promise.resolve();
        return { outboundMessageId: '<gmail-accepted@example.com>' };
      }),
      accept: jest.fn(async (_operationId: string, _invocationId: string, outboundMessageId: string) => {
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
      dispatchSupportReply(request, dependencies),
      dispatchSupportReply(request, dependencies),
    ]);

    expect(sends).toBe(1);
    expect(results.map((result) => result.state)).toEqual(expect.arrayContaining(['accepted', 'dispatching']));
    expect(dependencies.accept).toHaveBeenCalledTimes(1);
  });

  test.each<SupportReplyState>(['dispatching', 'accepted', 'delivery_unknown', 'cancelled', 'expired'])('a %s replay never invokes SMTP', async (state) => {
    const deliver = jest.fn();
    const result = await dispatchSupportReply({
      operationId: 'sr_test_operation',
      confirmationNonce: 'nonce-1234567890',
      payloadHash: canonicalReplyPayloadHash(payload),
    }, {
      preflight: jest.fn(async () => undefined),
      claim: jest.fn(async () => ({ kind: 'replay' as const, state })),
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
        if (current.state !== 'prepared') return { kind: 'replay' as const, state: current.state };
        current = { ...current, state: 'dispatching' };
        return { kind: 'claimed' as const, operation: current };
      }),
      deliver,
      accept: jest.fn(),
      markUnknown: jest.fn(async () => { current = { ...current, state: 'delivery_unknown' }; }),
      createInvocationId: () => 'invocation-timeout',
    };
    const request = { operationId: current.operationId, confirmationNonce: current.confirmationNonce, payloadHash: current.payloadHash };

    await expect(dispatchSupportReply(request, dependencies)).resolves.toMatchObject({ state: 'delivery_unknown', replayed: false });
    await expect(dispatchSupportReply(request, dependencies)).resolves.toMatchObject({ state: 'delivery_unknown', replayed: true });
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  test('preflight failure happens before the durable dispatch claim', async () => {
    const claim = jest.fn();
    await expect(dispatchSupportReply({
      operationId: 'sr_test_operation',
      confirmationNonce: 'nonce-1234567890',
      payloadHash: canonicalReplyPayloadHash(payload),
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
    expect(canonicalSupportBatchManifestHash(children)).toBe(canonicalSupportBatchManifestHash([...children].reverse()));
    expect(canonicalSupportBatchManifestHash(children)).not.toBe(canonicalSupportBatchManifestHash([
      children[0],
      { ...children[1], payloadHash: 'c'.repeat(64) },
    ]));
    expect(supportReplyBatchId('batch-key')).toMatch(/^srb_[a-f0-9]{40}$/);
  });

  test('batch summary requires attention for any ambiguous child and never calls it successful', () => {
    expect(summarizeSupportReplyBatch(['accepted', 'accepted'])).toEqual({ state: 'accepted', accepted: 2, attention: 0, pending: 0, failed: 0 });
    expect(summarizeSupportReplyBatch(['accepted', 'delivery_unknown', 'prepared'])).toEqual({ state: 'attention_required', accepted: 1, attention: 1, pending: 1, failed: 0 });
    expect(summarizeSupportReplyBatch(['accepted', 'cancelled'])).toEqual({ state: 'partial', accepted: 1, attention: 0, pending: 0, failed: 1 });
  });

  test('cancelled and accepted batches are terminal under a dispatch race', () => {
    expect(isSupportReplyBatchDispatchableState('prepared')).toBe(true);
    expect(isSupportReplyBatchDispatchableState('dispatching')).toBe(true);
    expect(isSupportReplyBatchDispatchableState('attention_required')).toBe(true);
    expect(isSupportReplyBatchDispatchableState('partial')).toBe(true);
    expect(isSupportReplyBatchDispatchableState('cancelled')).toBe(false);
    expect(isSupportReplyBatchDispatchableState('accepted')).toBe(false);
  });
});
