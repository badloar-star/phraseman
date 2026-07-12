import {
  buildEmailAudienceCandidates,
  buildEmailPreviewPlan,
  emailCampaignCancellationTarget,
  readEmailAudienceCandidates,
  parseEmailCampaignDraft,
  selectEmailCampaignAudience,
  type EmailAudienceCandidate,
} from './admin_email_campaigns';

const DAY = 24 * 60 * 60 * 1000;
const now = 2_000_000_000_000;

const candidates: EmailAudienceCandidate[] = [
  { contactId: 'plus', email: 'plus@example.com', sources: ['app'], bulkEligibility: 'eligible', premiumActive: true, lastActiveAtMs: now - DAY, identityHidden: false },
  { contactId: 'free', email: 'free@example.com', sources: ['app'], bulkEligibility: 'eligible', premiumActive: false, lastActiveAtMs: now - 40 * DAY, identityHidden: false },
  { contactId: 'site', email: 'site@example.com', sources: ['site'], bulkEligibility: 'eligible', premiumActive: false, lastActiveAtMs: 0, identityHidden: false },
  { contactId: 'unknown', email: 'unknown@example.com', sources: ['app'], bulkEligibility: 'unknown', premiumActive: false, lastActiveAtMs: now - DAY, identityHidden: false },
  { contactId: 'contact-only', email: 'support@example.com', sources: ['site'], bulkEligibility: 'ineligible', premiumActive: false, lastActiveAtMs: 0, identityHidden: false },
  { contactId: 'hidden', email: 'hidden@example.com', sources: ['app'], bulkEligibility: 'eligible', premiumActive: false, lastActiveAtMs: now - DAY, identityHidden: true },
  { contactId: 'relay', email: 'relay@privaterelay.appleid.com', sources: ['app'], bulkEligibility: 'eligible', premiumActive: false, lastActiveAtMs: now - DAY, identityHidden: false },
  { contactId: 'duplicate', email: 'PLUS@example.com', sources: ['site'], bulkEligibility: 'eligible', premiumActive: true, lastActiveAtMs: now - DAY, identityHidden: false },
];

describe('email campaign audience', () => {
  test('accepts typed audiences and rejects client recipient arrays', () => {
    expect(parseEmailCampaignDraft({
      subject: 'A useful update',
      text: 'Here is a useful Phraseman update.',
      audience: { kind: 'active' },
    })).toEqual({
      subject: 'A useful update',
      text: 'Here is a useful Phraseman update.',
      audience: { kind: 'active' },
    });
    expect(() => parseEmailCampaignDraft({
      subject: 'A useful update',
      text: 'Here is a useful Phraseman update.',
      audience: { kind: 'all' },
      emails: ['attacker@example.com'],
    })).toThrow('raw_recipients_forbidden');
  });

  test.each([
    ['all', ['plus@example.com', 'free@example.com', 'site@example.com']],
    ['plus', ['plus@example.com']],
    ['active', ['plus@example.com']],
    ['free', ['free@example.com']],
    ['dormant', ['free@example.com']],
    ['app', ['plus@example.com', 'free@example.com']],
    ['site', ['site@example.com', 'plus@example.com']],
  ] as const)('resolves %s server-side with canonical exclusions', (kind, expected) => {
    const result = selectEmailCampaignAudience(candidates, { kind }, new Set<string>(), now);
    expect(result.recipients.map((item) => item.email)).toEqual(expected);
  });

  test('reports every exclusion without returning addresses in the preview summary', () => {
    const result = selectEmailCampaignAudience(candidates, { kind: 'all' }, new Set(['free@example.com']), now);
    expect(result.recipients.map((item) => item.email)).toEqual(['plus@example.com', 'site@example.com']);
    expect(result.summary).toEqual({
      directoryMatched: 8,
      recipientCount: 2,
      suppressed: 1,
      unknownPurpose: 1,
      ineligible: 1,
      hidden: 1,
      relay: 1,
      invalid: 0,
      duplicates: 1,
    });
    expect(JSON.stringify(result.summary)).not.toContain('@');
  });

  test('hydrates premium, hidden identity and activity from canonical user records', () => {
    const hydrated = buildEmailAudienceCandidates([
      { id: 'contact-1', data: { email: 'member@example.com', sources: ['app'], appStableIds: ['stable-1'], bulkEligibility: 'eligible', eligibilitySource: 'explicit', appLastSignInAt: now - 60 * DAY } },
    ], [
      { id: 'stable-1', data: { identityHidden: false, last_active_at: now - DAY, progress: { premium_plan: 'monthly', premium_expiry: now + 10 * DAY } } },
    ], now);
    expect(hydrated).toMatchObject([{
      contactId: 'contact-1',
      email: 'member@example.com',
      sources: ['app'],
      bulkEligibility: 'eligible',
      premiumActive: true,
      lastActiveAtMs: now - DAY,
      identityHidden: false,
    }]);

    const hidden = buildEmailAudienceCandidates([
      { id: 'contact-2', data: { email: 'hidden@example.com', sources: ['app'], appStableIds: ['stable-2'], bulkEligibility: 'eligible' } },
    ], [
      { id: 'stable-2', data: { identityHidden: true } },
    ], now);
    expect(hidden[0].identityHidden).toBe(true);
  });

  test('does not classify a dormant app user as active because of a newer site signal', () => {
    const hydrated = buildEmailAudienceCandidates([{
      id: 'mixed-source',
      data: {
        email: 'mixed@example.com', sources: ['app', 'site'], bulkEligibility: 'eligible',
        appLastSignInAt: now - 60 * DAY,
        siteLastSignalAtMs: now - DAY,
        lastSeenAtMs: now - DAY,
      },
    }], [], now);

    expect(selectEmailCampaignAudience(hydrated, { kind: 'active' }, new Set<string>(), now).recipients).toHaveLength(0);
    expect(selectEmailCampaignAudience(hydrated, { kind: 'dormant' }, new Set<string>(), now).recipients.map((item) => item.email))
      .toEqual(['mixed@example.com']);
  });

  test('builds immutable contact-id shards while keeping addresses out of the preview response', () => {
    const draft = parseEmailCampaignDraft({ subject: 'Product update', text: 'A sufficiently long update body.', audience: { kind: 'all' } });
    const selection = selectEmailCampaignAudience(candidates, { kind: 'all' }, new Set<string>(), now);
    const plan = buildEmailPreviewPlan('preview-1', draft, selection, 'admin-a', now, 2);
    expect(plan.document).toMatchObject({ actorUid: 'admin-a', recipientCount: 3, subject: 'Product update' });
    expect(plan.shards.map((shard) => shard.contactIds)).toEqual([['plus', 'free'], ['site']]);
    expect(plan.response).toMatchObject({ previewId: 'preview-1', recipientCount: 3, requiresApproval: true });
    expect(JSON.stringify(plan.response)).not.toContain('@');
    expect(JSON.stringify(plan.document)).not.toContain('@');
  });

  test('cancels held work immediately and stops processing work after the current batch', () => {
    expect(emailCampaignCancellationTarget('queued_hold')).toBe('cancelled');
    expect(emailCampaignCancellationTarget('processing')).toBe('cancel_requested');
    expect(emailCampaignCancellationTarget('completed')).toBeNull();
    expect(emailCampaignCancellationTarget('cancelled')).toBeNull();
  });

  test('reads contacts and users server-side before resolving an audience', async () => {
    const collections: Record<string, Array<{ id: string; data: () => Record<string, unknown> }>> = {
      email_contacts: [{ id: 'contact-1', data: () => ({ email: 'member@example.com', sources: ['app'], appStableIds: ['stable-1'], bulkEligibility: 'eligible' }) }],
      users: [{ id: 'stable-1', data: () => ({ last_active_at: now - DAY, progress: { premium_plan: 'monthly', premium_expiry: now + DAY } }) }],
    };
    const db = {
      collection: (name: string) => ({
        orderBy: () => ({
          limit: () => ({ get: async () => ({ empty: false, size: collections[name].length, docs: collections[name] }) }),
        }),
      }),
    };
    await expect(readEmailAudienceCandidates(db as never, now)).resolves.toMatchObject([
      { contactId: 'contact-1', email: 'member@example.com', premiumActive: true },
    ]);
  });
});
