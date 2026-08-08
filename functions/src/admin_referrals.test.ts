import { referralCreditId } from './referral_spin_ledger';
import {
  displayNameFromUser,
  projectReferralDashboardRow,
  reconcilePendingReferralPurchases,
  referralDashboardCursorFromAttribution,
  summarizeReferralDashboardPurchases,
} from './admin_referrals';

const NOW_MS = 2_000_000;

function attribution(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invitee-1',
    referrerStableId: 'inviter-1',
    refCode: 'FRIEND42',
    status: 'pending',
    createdAtMs: 1_000,
    ...overrides,
  };
}

function project(overrides: Partial<Parameters<typeof projectReferralDashboardRow>[0]> = {}) {
  return projectReferralDashboardRow({
    attribution: attribution(),
    refereeProgress: {},
    displayNames: {
      'inviter-1': 'Анна',
      'invitee-1': 'Борис',
    },
    spinReceipts: [],
    nowMs: NOW_MS,
    ...overrides,
  });
}

describe('referral admin dashboard projection', () => {
  it('uses progress.user_name before compatible root display-name fields', () => {
    expect(displayNameFromUser({
      progress: { user_name: 'Имя из прогресса' },
      displayName: 'Устаревшее корневое имя',
      name: 'Ещё одно корневое имя',
    })).toBe('Имя из прогресса');
  });

  it('counts every active store purchase in summary even without qualifiedBy', () => {
    const summary = summarizeReferralDashboardPurchases({
      attributionIds: ['paid-without-qualification', 'free-user'],
      progressByRefereeId: new Map([
        ['paid-without-qualification', {
          premium_plan: 'monthly',
          premium_expiry: String(NOW_MS + 100_000),
        }],
        ['free-user', { lesson_1_completed: true }],
      ]),
      nowMs: NOW_MS,
    });

    expect(summary).toEqual({ totalInvited: 2, plusPurchased: 1 });
    expect(summary.plusPurchased / summary.totalInvited).toBe(0.5);
  });

  it('preserves Firestore nanoseconds and document IDs in pagination cursors', () => {
    expect(referralDashboardCursorFromAttribution({
      id: 'invite-b',
      createdAt: { seconds: 5, nanoseconds: 900_001 },
    })).toEqual({ seconds: 5, nanoseconds: 900_001, attributionId: 'invite-b' });
    expect(referralDashboardCursorFromAttribution({
      id: 'invite-a',
      createdAt: { seconds: 5, nanoseconds: 900_000 },
    })).toEqual({ seconds: 5, nanoseconds: 900_000, attributionId: 'invite-a' });
    expect(referralDashboardCursorFromAttribution({
      id: 'invite-a',
      createdAt: { seconds: '5', nanoseconds: '900000' },
    })).toBeNull();
  });

  it('renders a pending attribution as awaiting purchase', () => {
    expect(project()).toMatchObject({
      refCode: 'FRIEND42',
      referrerName: 'Анна',
      refereeName: 'Борис',
      plusPurchased: false,
      purchasedAtMs: 0,
      roulette: { state: 'not_spun' },
    });
  });

  it('renders a premium-purchase qualification as purchased only while the store plan is active', () => {
    const row = project({
      attribution: attribution({
        status: 'qualified',
        qualifiedBy: 'premium_purchase',
        qualifiedAtMs: 1_500,
      }),
      refereeProgress: {
        premium_plan: 'yearly',
        premium_expiry: String(NOW_MS + 100_000),
        premium_rc_purchased_at_ms: '1400',
      },
    });

    expect(row.plusPurchased).toBe(true);
    expect(row.purchasedAtMs).toBe(1_400);
  });

  it.each([
    ['admin VIP', { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' }],
    ['gifted access', { loyalty_gift_until_ms: String(NOW_MS + 100_000) }],
    ['lesson progress', { lesson_1_completed: true }],
    ['expired store plan', { premium_plan: 'monthly', premium_expiry: String(NOW_MS - 1) }],
  ])('does not count %s as a Plus purchase', (_label, refereeProgress) => {
    const row = project({
      attribution: attribution({ status: 'qualified', qualifiedBy: 'premium_purchase' }),
      refereeProgress,
    });

    expect(row.plusPurchased).toBe(false);
    expect(row.purchasedAtMs).toBe(0);
  });

  it('attaches only the receipt whose deterministic credit belongs to this invitation', () => {
    const expectedCreditId = referralCreditId('invitee-1');
    const row = project({
      spinReceipts: [
        {
          creditId: 'legacy_000001',
          creditSource: 'legacy_aggregate',
          prizeDays: 365,
          prizeKind: 'days',
          prizePearls: 0,
          createdAtMs: 5_000,
        },
        {
          creditId: referralCreditId('someone-else'),
          creditSource: 'referral',
          prizeDays: 90,
          prizeKind: 'days',
          prizePearls: 0,
          createdAtMs: 4_000,
        },
        {
          creditId: expectedCreditId,
          creditSource: 'referral',
          prizeDays: 30,
          prizeKind: 'pearls',
          prizePearls: 70,
          createdAtMs: 3_000,
        },
      ],
    });

    expect(row.roulette).toEqual({
      state: 'spun',
      prizeDays: 30,
      prizeKind: 'pearls',
      prizePearls: 70,
      createdAtMs: 3_000,
    });
  });

  it('does not attach a receipt from a non-referral or different credit', () => {
    const row = project({
      spinReceipts: [
        {
          creditId: referralCreditId('invitee-1'),
          creditSource: 'dev_grant',
          prizeDays: 7,
          prizeKind: 'days',
          prizePearls: 0,
          createdAtMs: 3_000,
        },
        {
          creditId: referralCreditId('another-invite'),
          creditSource: 'referral',
          prizeDays: 30,
          prizeKind: 'days',
          prizePearls: 0,
          createdAtMs: 4_000,
        },
      ],
    });

    expect(row.roulette).toEqual({ state: 'not_spun' });
  });
});

describe('admin referral dashboard pending purchase repair', () => {
  it('bounds the scan, prefilters active store Premium, and reports per-row failures', async () => {
    const pendingDocs = Array.from({ length: 102 }, (_, index) => ({ id: `user-${index}` }));
    const limit = jest.fn(() => ({ get: async () => ({ docs: pendingDocs }) }));
    const where = jest.fn(() => ({ limit }));
    const db = {
      collection: jest.fn(),
      getAll: jest.fn(async (...refs: Array<{ id: string }>) => refs.map((ref) => ({
        id: ref.id,
        exists: true,
        data: () => ({
          progress: ref.id === 'user-0' || ref.id === 'user-1'
            ? { premium_plan: 'yearly', premium_expiry: String(NOW_MS + 100_000) }
            : {},
        }),
      }))),
    } as unknown as FirebaseFirestore.Firestore;
    (db.collection as jest.Mock).mockImplementation((collection: string) => (
      collection === 'referral_attributions'
        ? { where }
        : { doc: (id: string) => ({ id }) }
    ));
    const qualify = jest.fn(async (_db: FirebaseFirestore.Firestore, uid: string) => {
      if (uid === 'user-1') throw new Error('transient');
    });

    await expect(reconcilePendingReferralPurchases(db, NOW_MS, qualify)).resolves.toEqual({
      scanned: 100,
      eligible: 2,
      repaired: 1,
      failed: 1,
      truncated: true,
    });
    expect(where).toHaveBeenCalledWith('status', '==', 'pending');
    expect(limit).toHaveBeenCalledWith(101);
    expect(qualify.mock.calls.map((call) => call[1])).toEqual(['user-0', 'user-1']);
  });
});
