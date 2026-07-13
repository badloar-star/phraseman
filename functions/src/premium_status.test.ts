import { isGiftAccessActive, isPremiumAccessActive, isVipActive, parseProgressMs, resolvePremiumAccess, resolvePremiumAccessBreakdown } from './premium_status';

const NOW = 1_700_000_000_000;
const FUTURE = NOW + 86_400_000;
const PAST = NOW - 86_400_000;

describe('premium_status — серверный источник правды по премиуму', () => {
  test('canonical breakdown exposes overlapping origins without double-counting active status', () => {
    const breakdown = resolvePremiumAccessBreakdown({
      premium_plan: 'yearly', premium_rc_product_id: 'yearly', premium_rc_expiry_ms: String(FUTURE),
      vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(FUTURE),
    }, NOW);
    expect(breakdown).toMatchObject({ active: true, storeActive: true, vipShapeActive: true, giftActive: false, legacyAdminGrantActive: false });
  });
  describe('store-премиум (RevenueCat)', () => {
    it('monthly с expiry=0 (бессрочный активный) → премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'monthly', premium_expiry: '0' }, NOW)).toBe(true);
    });
    it('yearly с expiry в будущем → премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'yearly', premium_expiry: String(FUTURE) }, NOW)).toBe(true);
    });
    it('monthly с истёкшим expiry → НЕ премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'monthly', premium_expiry: String(PAST) }, NOW)).toBe(false);
    });
    it('пустой plan → НЕ премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: '', premium_expiry: '0' }, NOW)).toBe(false);
    });
    it('lifetime с expiry=0 (навсегда) → премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toBe(true);
    });
    it('lifetime без поля expiry (по умолчанию бессрочный) → премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'lifetime' }, NOW)).toBe(true);
    });

    // ── rc_expiry leak (утечка дохода при потерянном EXPIRATION-вебхуке) ──
    it('expiry=0 но rc_expiry истёк ДАВНО (>72ч grace) → НЕ премиум (закрыта утечка)', () => {
      const rcExpiry = NOW - 80 * 60 * 60 * 1000; // 80ч назад > 72ч grace
      expect(isPremiumAccessActive({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(rcExpiry) }, NOW)).toBe(false);
    });
    it('expiry=0 и rc_expiry истёк НЕДАВНО (в пределах 72ч grace) → ещё премиум', () => {
      const rcExpiry = NOW - 10 * 60 * 60 * 1000; // 10ч назад < 72ч grace (опоздавший RENEWAL)
      expect(isPremiumAccessActive({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(rcExpiry) }, NOW)).toBe(true);
    });
    it('expiry=0 и rc_expiry в будущем → премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: String(FUTURE) }, NOW)).toBe(true);
    });
    it('lifetime: expiry=0 и НЕТ rc_expiry → премиум (бессрочный, не трогаем)', () => {
      expect(isPremiumAccessActive({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toBe(true);
    });
  });

  describe('админский грант', () => {
    it('admin_premium_override=true бессрочно → премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' }, NOW)).toBe(true);
    });
    it('admin_grant с истёкшим сроком → НЕ премиум', () => {
      expect(isPremiumAccessActive({ premium_plan: 'admin_grant', premium_expiry: String(PAST) }, NOW)).toBe(false);
    });
    it('override=false гасит грант', () => {
      expect(isPremiumAccessActive({ premium_plan: 'admin_grant', admin_premium_override: 'false', premium_expiry: '0' }, NOW)).toBe(false);
    });
  });

  describe('VIP-доступ (рефералка / опрос / ручная выдача)', () => {
    it('vip_active=true, окно открыто → премиум', () => {
      expect(isVipActive({ vip_active: 'true', vip_until: String(FUTURE) }, NOW)).toBe(true);
      expect(isPremiumAccessActive({ vip_active: 'true', vip_until: String(FUTURE) }, NOW)).toBe(true);
    });
    it('vip_until истёк → НЕ премиум', () => {
      expect(isVipActive({ vip_active: 'true', vip_until: String(PAST) }, NOW)).toBe(false);
    });
    it('vip_admin_override=false (revoke) гасит VIP даже при vip_active', () => {
      expect(isVipActive({ vip_active: 'true', vip_admin_override: 'false', vip_until: String(FUTURE) }, NOW)).toBe(false);
    });
    it('vip_until=0 (бессрочный VIP) → активен', () => {
      expect(isVipActive({ vip_active: 'true', vip_until: '0' }, NOW)).toBe(true);
    });
    it('promo_lifetime + vip_until=0 → активный Plus/VIP на сервере', () => {
      expect(isVipActive({
        vip_active: 'true',
        vip_plan: 'promo_lifetime',
        vip_until: '0',
        vip_admin_override: 'true',
      }, NOW)).toBe(true);
      expect(isPremiumAccessActive({
        vip_active: 'true',
        vip_plan: 'promo_lifetime',
        vip_until: '0',
        vip_admin_override: 'true',
      }, NOW)).toBe(true);
    });
  });

  describe('подарок 72ч (intro / loyalty)', () => {
    it('loyalty_gift_until_ms в будущем даёт Premium access на сервере', () => {
      expect(isGiftAccessActive({ loyalty_gift_until_ms: String(FUTURE) }, NOW)).toBe(true);
      expect(isPremiumAccessActive({ loyalty_gift_until_ms: String(FUTURE) }, NOW)).toBe(true);
    });

    it('loyalty_gift_until_ms в прошлом не даёт доступ после истечения', () => {
      expect(isGiftAccessActive({ loyalty_gift_until_ms: String(PAST) }, NOW)).toBe(false);
      expect(isPremiumAccessActive({ loyalty_gift_until_ms: String(PAST) }, NOW)).toBe(false);
    });

    it('intro_access_until_ms тоже считается подарочным Premium access', () => {
      expect(isGiftAccessActive({ intro_access_until_ms: String(FUTURE) }, NOW)).toBe(true);
      expect(isPremiumAccessActive({ intro_access_until_ms: String(FUTURE) }, NOW)).toBe(true);
    });
  });

  describe('защита от подделки', () => {
    it('пустой progress → НЕ премиум (тело запроса не влияет)', () => {
      expect(isPremiumAccessActive({}, NOW)).toBe(false);
      expect(isPremiumAccessActive(null, NOW)).toBe(false);
      expect(isPremiumAccessActive(undefined, NOW)).toBe(false);
    });
    it('левые поля не дают премиум', () => {
      expect(isPremiumAccessActive({ isPremium: true, premium: 'yes', wantPremium: '1' }, NOW)).toBe(false);
    });
  });

  describe('parseProgressMs', () => {
    it('строка/число/Timestamp-подобное', () => {
      expect(parseProgressMs('123')).toBe(123);
      expect(parseProgressMs(456)).toBe(456);
      expect(parseProgressMs({ toMillis: () => 789 })).toBe(789);
      expect(parseProgressMs({ seconds: 2 })).toBe(2000);
      expect(parseProgressMs('')).toBe(0);
      expect(parseProgressMs(null)).toBe(0);
    });
  });

  describe('resolvePremiumAccess', () => {
    function fakeDb(users: Record<string, Record<string, unknown>>, links: Record<string, Record<string, unknown>> = {}) {
      return {
        collection(name: string) {
          if (name === 'auth_links') {
            return {
              doc(id: string) {
                return {
                  async get() {
                    const data = links[id];
                    return { exists: !!data, data: () => data };
                  },
                };
              },
            };
          }
          return {
            doc(id: string) {
              return {
                async get() {
                  const data = users[id];
                  return { exists: !!data, data: () => data };
                },
              };
            },
            where(_field: string, _op: string, value: string) {
              return {
                limit(_n: number) {
                  return {
                    async get() {
                      const docs = Object.entries(users)
                        .filter(([, data]) => data.firebaseAuthUid === value)
                        .map(([id, data]) => ({ id, data: () => data }));
                      return { docs };
                    },
                  };
                },
              };
            },
          };
        },
      };
    }

    it('finds premium on the stable user linked to the current auth uid', async () => {
      const db = fakeDb({
        auth_1: { progress: {} },
        stable_1: {
          firebaseAuthUid: 'auth_1',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      }) as any;

      await expect(resolvePremiumAccess(db, 'auth_1', NOW, 'auth_1')).resolves.toBe(true);
    });

    it('follows auth_links when the callable resolved a legacy direct auth doc first', async () => {
      const db = fakeDb(
        {
          auth_2: { progress: {} },
          stable_2: { progress: { vip_active: 'true', vip_until: String(FUTURE) } },
        },
        { auth_2: { stable_id: 'stable_2' } },
      ) as any;

      await expect(resolvePremiumAccess(db, 'auth_2', NOW, 'auth_2')).resolves.toBe(true);
    });
  });
});
