import {
  buildResendBatchMessages,
  buildEmailBatchFingerprint,
  claimEmailCampaignBatch,
  emailCampaignClaimDecision,
  emailCampaignFinalStatus,
  emailCampaignActualCheckedCount,
  emailBatchRetryDecision,
  sanitizeEmailProviderError,
  finalizeEmailCampaignBatch,
  selectEmailBatchRecipients,
  sendResendBatch,
} from './admin_email_campaign_worker';

describe('email campaign Resend batches', () => {
  test('sends at most 100 messages with a stable idempotency key', async () => {
    const fetchImpl = jest.fn(async (_url: string, init: RequestInit) => {
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer resend-key',
        'Content-Type': 'application/json; charset=utf-8',
        'Idempotency-Key': 'email/campaign-1/0000/hash',
      });
      expect(JSON.parse(String(init.body))).toHaveLength(2);
      return new Response(JSON.stringify({ data: [{ id: 'r1' }, { id: 'r2' }] }), { status: 200 });
    });
    await expect(sendResendBatch([
      { from: 'Phraseman <mail@example.com>', to: ['a@example.com'], subject: 'Update', text: 'Text', html: '<p>Text</p>' },
      { from: 'Phraseman <mail@example.com>', to: ['b@example.com'], subject: 'Update', text: 'Text', html: '<p>Text</p>' },
    ], 'email/campaign-1/0000/hash', 'resend-key', fetchImpl as never)).resolves.toEqual({ state: 'accepted', acceptedCount: 2, providerIds: ['r1', 'r2'] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('rejects oversized batches before contacting the provider', async () => {
    const fetchImpl = jest.fn();
    const messages = Array.from({ length: 101 }, (_, index) => ({ from: 'x@example.com', to: [`${index}@example.com`], subject: 'S', text: 'T', html: 'H' }));
    await expect(sendResendBatch(messages, 'key', 'resend-key', fetchImpl as never)).rejects.toThrow('resend_batch_limit');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('marks transport ambiguity as uncertain and never retries after the 24-hour provider window', async () => {
    const fetchImpl = jest.fn(async () => { throw new Error('socket closed'); });
    await expect(sendResendBatch([{ from: 'x@example.com', to: ['a@example.com'], subject: 'S', text: 'T', html: 'H' }], 'stable-key', 'resend-key', fetchImpl as never))
      .resolves.toEqual({ state: 'delivery_uncertain', acceptedCount: 0, providerIds: [], error: 'socket closed' });
    expect(emailBatchRetryDecision('delivery_uncertain', 1_000, 1_000 + 23 * 60 * 60 * 1000)).toBe('retry_same_key');
    expect(emailBatchRetryDecision('delivery_uncertain', 1_000, 1_000 + 25 * 60 * 60 * 1000)).toBe('manual_review');
    expect(emailBatchRetryDecision('accepted', 1_000, 2_000)).toBe('skip');
  });

  test('rechecks eligibility and suppression immediately before each batch', () => {
    const selected = selectEmailBatchRecipients([
      { contactId: 'a', email: 'a@example.com', bulkEligibility: 'eligible' },
      { contactId: 'b', email: 'b@example.com', bulkEligibility: 'eligible' },
      { contactId: 'c', email: 'c@example.com', bulkEligibility: 'unknown' },
    ], new Set(['b@example.com']));
    expect(selected).toEqual({ recipients: [{ contactId: 'a', email: 'a@example.com', bulkEligibility: 'eligible' }], suppressedCount: 1, ineligibleCount: 1 });
  });

  test('builds per-recipient RFC one-click unsubscribe headers', () => {
    const messages = buildResendBatchMessages(
      [{ contactId: 'a', email: 'a@example.com', bulkEligibility: 'eligible' }],
      { subject: 'Update', text: 'A useful product update.' },
      'Phraseman <mail@example.com>',
      (email) => `https://example.com/unsubscribe?email=${encodeURIComponent(email)}`,
    );
    expect(messages[0]).toMatchObject({
      to: ['a@example.com'],
      headers: {
        'List-Unsubscribe': '<https://example.com/unsubscribe?email=a%40example.com>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  });

  test('honours the cancellation hold and terminal worker states', () => {
    expect(emailCampaignClaimDecision({ status: 'queued_hold', holdUntilMs: 2_000 }, 1_000)).toBe('hold');
    expect(emailCampaignClaimDecision({ status: 'queued_hold', holdUntilMs: 2_000 }, 2_000)).toBe('claim');
    expect(emailCampaignClaimDecision({ status: 'cancel_requested' }, 2_000)).toBe('cancel');
    expect(emailCampaignClaimDecision({ status: 'processing', updatedAtMs: 1_900 }, 2_000)).toBe('busy');
    expect(emailCampaignClaimDecision({ status: 'processing', updatedAtMs: 1 }, 20 * 60 * 1000)).toBe('claim');
    expect(emailCampaignClaimDecision({ status: 'completed' }, 2_000)).toBe('terminal');
  });

  test('reports provider acceptance without claiming delivery', () => {
    expect(emailCampaignFinalStatus({ accepted: 10, failed: 0, uncertain: 0, cancelled: false })).toBe('completed');
    expect(emailCampaignFinalStatus({ accepted: 9, failed: 1, uncertain: 0, cancelled: false })).toBe('partial_failed');
    expect(emailCampaignFinalStatus({ accepted: 9, failed: 0, uncertain: 1, cancelled: false })).toBe('delivery_uncertain');
    expect(emailCampaignFinalStatus({ accepted: 4, failed: 0, uncertain: 0, cancelled: true })).toBe('cancelled_partial');
    expect(emailCampaignFinalStatus({ accepted: 0, failed: 0, uncertain: 0, cancelled: true })).toBe('cancelled');
    expect(emailCampaignActualCheckedCount({ accepted: 4, failed: 1, uncertain: 2, suppressed: 3, ineligible: 5 })).toBe(15);
  });

  test('binds an idempotency key to the exact provider payload', () => {
    const messages = [{ from: 'x@example.com', to: ['a@example.com'], subject: 'S', text: 'T', html: 'H' }];
    expect(buildEmailBatchFingerprint(messages)).toMatch(/^[a-f0-9]{32}$/);
    expect(buildEmailBatchFingerprint(messages)).toBe(buildEmailBatchFingerprint(messages));
    expect(buildEmailBatchFingerprint([{ ...messages[0], subject: 'Changed' }])).not.toBe(buildEmailBatchFingerprint(messages));
  });

  test('removes recipient addresses from stored provider errors', () => {
    expect(sanitizeEmailProviderError('Rejected a.person@example.com and B@EXAMPLE.org')).toBe('Rejected [email] and [email]');
  });

  test('treats a provider idempotency conflict as uncertain rather than permanent failure', async () => {
    const fetchImpl = jest.fn(async () => new Response('same idempotency key is already processing', { status: 409 }));
    await expect(sendResendBatch(
      [{ from: 'x@example.com', to: ['a@example.com'], subject: 'S', text: 'T', html: 'H' }],
      'stable-key',
      'resend-key',
      fetchImpl as never,
    )).resolves.toMatchObject({ state: 'delivery_uncertain', acceptedCount: 0 });
  });

  test('only one worker leases a dispatch batch and stale finalizers cannot overwrite acceptance', async () => {
    let row: Record<string, unknown> = {};
    const campaignRef = { path: 'email_campaigns/c1' } as never;
    const ref = { path: 'email_campaigns/c1/batches/b1', async get() { return { data: () => row }; } } as never;
    const db = {
      runTransaction: async (fn: any) => fn({
        get: async (target: { path: string }) => ({ data: () => target.path === 'email_campaigns/c1' ? { status: 'processing' } : ({ ...row }) }),
        set: (_ref: unknown, patch: Record<string, unknown>) => { row = { ...row, ...patch }; },
      }),
    } as never;
    const input = {
      nowMs: 1_000, leaseOwner: 'worker-a', payloadFingerprint: 'hash', idempotencyKey: 'key',
      recipientContactIds: ['a'], recipientCount: 1, suppressedCount: 0, ineligibleCount: 0,
    };
    await expect(claimEmailCampaignBatch(db, campaignRef, ref, input)).resolves.toMatchObject({ claimed: true });
    await expect(claimEmailCampaignBatch(db, campaignRef, ref, { ...input, leaseOwner: 'worker-b', nowMs: 1_001 })).resolves.toEqual({ claimed: false, reason: 'busy' });
    await expect(finalizeEmailCampaignBatch(db, ref, 'worker-a', { state: 'accepted', acceptedCount: 1 })).resolves.toBe(true);
    await expect(finalizeEmailCampaignBatch(db, ref, 'worker-b', { state: 'failed', failedCount: 1 })).resolves.toBe(false);
    expect(row).toMatchObject({ state: 'accepted', acceptedCount: 1 });
  });
});
