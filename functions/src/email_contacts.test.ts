import {
  mergeEmailContactProjection,
  projectEmailContactForAdmin,
  resolveEmailBulkEligibility,
  upsertEmailContact,
} from './email_contacts';

describe('email contact eligibility', () => {
  test('keeps support messages in the directory but out of bulk campaigns', () => {
    expect(resolveEmailBulkEligibility({ source: 'site', provider: 'site_form' })).toEqual({
      bulkEligibility: 'ineligible',
      eligibilitySource: 'support_contact_only',
    });
  });

  test('accepts an explicit lead purpose but leaves app identities and orders unknown', () => {
    expect(resolveEmailBulkEligibility({ source: 'site', provider: 'quiz_lead' })).toEqual({
      bulkEligibility: 'eligible',
      eligibilitySource: 'quiz_lead_product_email',
    });
    expect(resolveEmailBulkEligibility({ source: 'app', provider: 'google' })).toEqual({
      bulkEligibility: 'unknown',
      eligibilitySource: 'app_identity_unverified',
    });
    expect(resolveEmailBulkEligibility({ source: 'site', provider: 'web_order' })).toEqual({
      bulkEligibility: 'unknown',
      eligibilitySource: 'site_order_unverified',
    });
  });

  test('does not let an older backfill overwrite newer context or downgrade eligibility', () => {
    const merged = mergeEmailContactProjection({
      email: 'person@example.com',
      sources: ['site'],
      bulkEligibility: 'eligible',
      eligibilitySource: 'quiz_lead_product_email',
      eligibilityUpdatedAtMs: 2_000,
      lastSeenAtMs: 2_000,
      displayName: 'Fresh Name',
      contextLabel: 'quiz lead',
    }, {
      email: 'PERSON@example.com',
      source: 'app',
      provider: 'google',
      displayName: 'Old Name',
      contextLabel: 'old backfill',
      signalAtMs: 1_000,
    }, 3_000);

    expect(merged.sources).toEqual(['app', 'site']);
    expect(merged.displayName).toBe('Fresh Name');
    expect(merged.contextLabel).toBe('quiz lead');
    expect(merged.lastSeenAtMs).toBe(2_000);
    expect(merged.bulkEligibility).toBe('eligible');
    expect(merged.eligibilitySource).toBe('quiz_lead_product_email');
  });

  test('admin projection is bounded and does not expose raw UID or order arrays', () => {
    const row = projectEmailContactForAdmin('contact-1', {
      email: 'person@example.com',
      sources: ['app', 'site'],
      displayName: 'Person',
      contextLabel: 'quiz lead',
      lastSeenAtMs: 2_000,
      bulkEligibility: 'eligible',
      eligibilitySource: 'quiz_lead_product_email',
      appStableIds: ['private-stable-id'],
      siteOrderIds: ['private-order-id'],
    }, new Set(['person@example.com']));

    expect(row).toEqual({
      id: 'contact-1',
      email: 'person@example.com',
      sources: ['app', 'site'],
      displayName: 'Person',
      contextLabel: 'quiz lead',
      lastSeenAtMs: 2_000,
      bulkEligibility: 'eligible',
      eligibilitySource: 'quiz_lead_product_email',
      suppressed: true,
    });
    expect(row).not.toHaveProperty('appStableIds');
    expect(row).not.toHaveProperty('siteOrderIds');
  });
});

describe('email contact persistence', () => {
  test('uses a transaction so concurrent source signals cannot overwrite each other', async () => {
    let transactionUsed = false;
    let written: Record<string, unknown> | null = null;
    const existingData = {
      email: 'person@example.com',
      sources: ['site'],
      bulkEligibility: 'eligible',
      eligibilitySource: 'quiz_lead_product_email',
      eligibilityUpdatedAtMs: 2_000,
      lastSeenAtMs: 2_000,
      appLastSignalAtMs: 2_000,
      appLastProvider: 'apple',
      appLastProviderUid: 'new-provider-uid',
      appLastStableId: 'new-stable-id',
      appLastDisplayName: 'Fresh Name',
      appLastSignInAt: 2_000,
    };
    const ref = {
      get: async () => { throw new Error('direct read is not atomic'); },
      set: async () => { throw new Error('direct write is not atomic'); },
    };
    const db = {
      collection: () => ({ doc: () => ref }),
      runTransaction: async (worker: (tx: {
        get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> }>;
        set: (_ref: unknown, value: Record<string, unknown>) => void;
      }) => Promise<void>) => {
        transactionUsed = true;
        await worker({
          get: async () => ({
            exists: true,
            data: () => existingData,
          }),
          set: (_target, value) => { written = { ...existingData, ...value }; },
        });
      },
    };

    await expect(upsertEmailContact(db as never, {
      email: 'person@example.com',
      source: 'app',
      provider: 'google',
      providerUid: 'old-provider-uid',
      stableId: 'old-stable-id',
      displayName: 'Old Name',
      lastSignInAt: 1_000,
      signalAtMs: 1_000,
      countSignal: false,
    })).resolves.toBe(true);

    expect(transactionUsed).toBe(true);
    expect(written).toMatchObject({
      email: 'person@example.com',
      sources: ['app', 'site'],
      bulkEligibility: 'eligible',
      eligibilitySource: 'quiz_lead_product_email',
      lastSeenAtMs: 2_000,
      appLastSignalAtMs: 2_000,
      appLastProvider: 'apple',
      appLastProviderUid: 'new-provider-uid',
      appLastStableId: 'new-stable-id',
      appLastDisplayName: 'Fresh Name',
      appLastSignInAt: 2_000,
    });
  });
});
