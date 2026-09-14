import { buildAccessProjection } from './access_projection';

describe('access projection', () => {
  test('contains only bounded server-owned access fields', () => {
    expect(buildAccessProjection({
      premium_plan: 'yearly',
      premium_expiry: '2000',
      premium_rc_expiry_ms: '2000',
      vip_active: 'false',
      user_total_xp: '999999',
      email: 'private@example.com',
    }, 1_000)).toEqual({
      schemaVersion: 'access-projection.v1',
      premiumActive: true,
      premiumPlan: 'yearly',
      premiumExpiresAtMs: 2_000,
      vipActive: false,
      updatedAtMs: 1_000,
    });
  });

  test('expired premium and VIP project inactive without leaking source fields', () => {
    expect(buildAccessProjection({
      premium_plan: 'monthly',
      premium_expiry: '900',
      vip_active: 'true',
      vip_until: '900',
      premium_rc_product_id: 'secret-product',
    }, 1_000)).toEqual({
      schemaVersion: 'access-projection.v1',
      premiumActive: false,
      premiumPlan: 'monthly',
      premiumExpiresAtMs: 900,
      vipActive: false,
      updatedAtMs: 1_000,
    });
  });

  test('does not show stale store access after the server RevenueCat grace window closes', () => {
    const now = 1_700_000_000_000;
    const expiredMoreThanGraceAgo = now - 73 * 60 * 60 * 1000;

    expect(buildAccessProjection({
      premium_plan: 'monthly',
      // A stale client flag must never override the expiry authority.
      premium_active: 'true',
      premium_expiry: '0',
      premium_rc_expiry_ms: String(expiredMoreThanGraceAgo),
    }, now)).toMatchObject({ premiumActive: false });
  });

  test('explicit admin revoke and legacy VIP-plan windows keep their access semantics', () => {
    expect(buildAccessProjection({
      premium_plan: 'admin_grant',
      premium_expiry: '2000',
      admin_premium_override: 'false',
      vip_plan: 'referral',
      vip_until: '2000',
    }, 1_000)).toMatchObject({ premiumActive: false, vipActive: true });
  });
});
