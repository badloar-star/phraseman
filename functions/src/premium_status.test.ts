import {
  isGiftAccessActive,
  isPremiumAccessActive,
  isVipActive,
  parseProgressMs,
  resolveIsLifetimePlan,
  resolvePremiumAccess,
} from './premium_status';

const NOW = 1_700_000_000_000;
const FUTURE = NOW + 86_400_000;
const PAST = NOW - 86_400_000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_GIFT_WINDOW_MS = 72 * HOUR_MS;

describe('premium_status — серверный источник правды по премиуму', () => {
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
      const progress = {
        loyalty_gift_granted_at_ms: String(NOW),
        loyalty_gift_until_ms: String(FUTURE),
      };
      expect(isGiftAccessActive(progress, NOW)).toBe(true);
      expect(isPremiumAccessActive(progress, NOW)).toBe(true);
    });

    it('loyalty_gift_until_ms в прошлом не даёт доступ после истечения', () => {
      const progress = {
        loyalty_gift_granted_at_ms: String(PAST - HOUR_MS),
        loyalty_gift_until_ms: String(PAST),
      };
      expect(isGiftAccessActive(progress, NOW)).toBe(false);
      expect(isPremiumAccessActive(progress, NOW)).toBe(false);
    });

    it('intro_access_until_ms тоже считается подарочным Premium access', () => {
      const progress = {
        intro_access_granted_at_ms: String(NOW),
        intro_access_until_ms: String(FUTURE),
      };
      expect(isGiftAccessActive(progress, NOW)).toBe(true);
      expect(isPremiumAccessActive(progress, NOW)).toBe(true);
    });

    it('accepts an active gift whose grant window is exactly 72 hours', () => {
      const grantedAt = NOW - HOUR_MS;
      const progress = {
        loyalty_gift_granted_at_ms: String(grantedAt),
        loyalty_gift_until_ms: String(grantedAt + MAX_GIFT_WINDOW_MS),
      };
      expect(isGiftAccessActive(progress, NOW)).toBe(true);
    });

    it('rejects an until-only gift that has no matching server grant time', () => {
      const loyaltyUntilOnly = { loyalty_gift_until_ms: String(FUTURE) };
      expect(isGiftAccessActive(loyaltyUntilOnly, NOW)).toBe(false);
      expect(isPremiumAccessActive(loyaltyUntilOnly, NOW)).toBe(false);
      expect(isGiftAccessActive({ intro_access_until_ms: String(FUTURE) }, NOW)).toBe(false);
    });

    it('rejects a gift whose grant time is in the future', () => {
      expect(isGiftAccessActive({
        intro_access_granted_at_ms: String(NOW + 1),
        intro_access_until_ms: String(FUTURE),
      }, NOW)).toBe(false);
    });

    it('rejects a gift window longer than 72 hours', () => {
      const grantedAt = NOW - HOUR_MS;
      expect(isGiftAccessActive({
        loyalty_gift_granted_at_ms: String(grantedAt),
        loyalty_gift_until_ms: String(grantedAt + MAX_GIFT_WINDOW_MS + 1),
      }, NOW)).toBe(false);
    });

    it('does not combine grant and expiry fields from different gift kinds', () => {
      expect(isGiftAccessActive({
        intro_access_granted_at_ms: String(NOW),
        loyalty_gift_until_ms: String(FUTURE),
      }, NOW)).toBe(false);
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
    interface FakeDbMetrics {
      authLinkGets: number;
      userDocGets: Record<string, number>;
      queryGets: Record<string, number>;
    }

    function fakeDb(
      users: Record<string, Record<string, unknown>>,
      links: Record<string, Record<string, unknown>> = {},
      queryFields: string[] = [],
      metrics?: FakeDbMetrics,
    ) {
      return {
        collection(name: string) {
          if (name === 'auth_links') {
            return {
              doc(id: string) {
                return {
                  async get() {
                    if (metrics) metrics.authLinkGets += 1;
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
                  if (metrics) {
                    metrics.userDocGets[id] = (metrics.userDocGets[id] ?? 0) + 1;
                  }
                  const data = users[id];
                  return { exists: !!data, data: () => data };
                },
              };
            },
            where(field: string, _op: string, value: string) {
              queryFields.push(field);
              return {
                limit(n: number) {
                  return {
                    async get() {
                      if (metrics) {
                        metrics.queryGets[field] = (metrics.queryGets[field] ?? 0) + 1;
                      }
                      const docs = Object.entries(users)
                        .filter(([, data]) => {
                          if (field === 'firebaseAuthUid') return data.firebaseAuthUid === value;
                          if (field === 'canonicalStableId') return data.canonicalStableId === value;
                          return false;
                        })
                        .slice(0, n)
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
        stable_1: {
          firebaseAuthUid: 'auth_1',
          progress: { premium_plan: 'monthly', premium_expiry: '0' },
        },
      }) as any;

      await expect(resolvePremiumAccess(db, 'stable_1', NOW, 'auth_1')).resolves.toBe(true);
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

    it('finds an active admin VIP on an owned hidden alias after auth_links moved to canonical', async () => {
      const users: Record<string, Record<string, unknown>> = {
        stable_3: {
          firebaseAuthUid: 'auth_3',
          linkedAuth: { providerUid: 'auth_3' },
          identityCleanupAt: NOW,
          progress: {},
        },
      };
      // Production had more provider-owned duplicates than the defensive by-auth
      // lookup limit. The hidden VIP alias was therefore absent from those first
      // five results even though it belonged to the same signed-in account.
      for (let i = 0; i < 5; i += 1) {
        users[`duplicate_${i}`] = { firebaseAuthUid: 'auth_3', progress: {} };
      }
      users.vip_alias = {
        identityHidden: true,
        canonicalStableId: 'stable_3',
        identityCanonicalizedAt: NOW,
        firebaseAuthUid: 'auth_3',
        progress: {
          vip_active: 'true',
          vip_plan: 'admin_vip',
          vip_until: String(FUTURE),
          vip_admin_override: 'true',
        },
      };
      const db = fakeDb(users, { auth_3: { stable_id: 'stable_3' } }) as any;

      await expect(resolvePremiumAccess(db, 'stable_3', NOW, 'auth_3')).resolves.toBe(true);
    });

    it('keeps owned hidden-alias access when the alias is inside the normal lookup window', async () => {
      const db = fakeDb(
        {
          stable_3b: {
            firebaseAuthUid: 'auth_3b',
            identityMergedAt: NOW,
            progress: {},
          },
          vip_alias_3b: {
            identityHidden: true,
            canonicalStableId: 'stable_3b',
            identityMergedAt: NOW,
            firebaseAuthUid: 'auth_3b',
            progress: {
              vip_active: 'true',
              vip_until: '0',
              vip_admin_override: 'true',
            },
          },
        },
        { auth_3b: { stable_id: 'stable_3b' } },
      ) as any;

      await expect(resolvePremiumAccess(db, 'stable_3b', NOW, 'auth_3b')).resolves.toBe(true);
    });

    it('does not inherit VIP from a hidden alias owned by another auth uid', async () => {
      const users: Record<string, Record<string, unknown>> = {
        stable_4: { firebaseAuthUid: 'auth_4', progress: {} },
        foreign_alias: {
          identityHidden: true,
          canonicalStableId: 'stable_4',
          firebaseAuthUid: 'different_auth',
          progress: {
            vip_active: 'true',
            vip_until: String(FUTURE),
            vip_admin_override: 'true',
          },
        },
      };
      for (let i = 0; i < 4; i += 1) {
        users[`owned_duplicate_${i}`] = { firebaseAuthUid: 'auth_4', progress: {} };
      }
      const db = fakeDb(
        users,
        { auth_4: { stable_id: 'stable_4' } },
      ) as any;

      await expect(resolvePremiumAccess(db, 'stable_4', NOW, 'auth_4')).resolves.toBe(false);
    });

    it('does not resurrect a canonical VIP that was explicitly revoked', async () => {
      const users: Record<string, Record<string, unknown>> = {
        stable_5: {
          firebaseAuthUid: 'auth_5',
          progress: { vip_active: 'false', vip_admin_override: 'false', vip_until: String(PAST) },
        },
        stale_alias: {
          identityHidden: true,
          canonicalStableId: 'stable_5',
          firebaseAuthUid: 'auth_5',
          progress: {
            vip_active: 'true',
            vip_until: String(FUTURE),
            vip_admin_override: 'true',
          },
        },
      };
      for (let i = 0; i < 4; i += 1) {
        users[`revoked_duplicate_${i}`] = { firebaseAuthUid: 'auth_5', progress: {} };
      }
      const db = fakeDb(users, { auth_5: { stable_id: 'stable_5' } }) as any;

      await expect(resolvePremiumAccess(db, 'stable_5', NOW, 'auth_5')).resolves.toBe(false);
    });

    it('treats a canonical legacy admin revoke as authoritative over a stale VIP alias', async () => {
      const db = fakeDb(
        {
          stable_6: {
            firebaseAuthUid: 'auth_6',
            progress: {
              admin_premium_override: 'false',
              premium_plan: 'admin_grant',
              premium_expiry: '0',
            },
          },
          stale_legacy_alias: {
            identityHidden: true,
            canonicalStableId: 'stable_6',
            firebaseAuthUid: 'auth_6',
            progress: {
              vip_active: 'true',
              vip_until: String(FUTURE),
              vip_admin_override: 'true',
            },
          },
        },
        { auth_6: { stable_id: 'stable_6' } },
      ) as any;

      await expect(resolvePremiumAccess(db, 'stable_6', NOW, 'auth_6')).resolves.toBe(false);
    });

    it('rejects a poisoned canonical pointer to another user premium document', async () => {
      const db = fakeDb(
        {
          attacker_alias: {
            identityHidden: true,
            canonicalStableId: 'victim_paid',
            identityCanonicalizedAt: NOW,
            firebaseAuthUid: 'attacker_auth',
            progress: {},
          },
          victim_paid: {
            firebaseAuthUid: 'victim_auth',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
        },
        { attacker_auth: { stable_id: 'attacker_alias' } },
      ) as any;

      // resolveStableUidForAuth can receive historical pointer-shaped documents.
      // Premium authorization must independently prove that the entitlement
      // document belongs to the signed-in Firebase uid.
      await expect(resolvePremiumAccess(db, 'victim_paid', NOW, 'attacker_auth')).resolves.toBe(false);
    });

    it('finds a hidden admin alias owned only through linkedAuth.providerUid', async () => {
      const db = fakeDb(
        {
          stable_7: {
            firebaseAuthUid: 'auth_7',
            identityCleanupAt: NOW,
            progress: {},
          },
          linked_only_alias: {
            identityHidden: true,
            canonicalStableId: 'stable_7',
            identityCanonicalizedAt: NOW,
            linkedAuth: { providerUid: 'auth_7' },
            progress: {
              vip_active: 'true',
              vip_until: String(FUTURE),
              vip_admin_override: 'true',
            },
          },
        },
        { auth_7: { stable_id: 'stable_7' } },
      ) as any;

      await expect(resolvePremiumAccess(db, 'stable_7', NOW, 'auth_7')).resolves.toBe(true);
    });

    it('keeps a canonical revoke authoritative over an active visible sibling', async () => {
      const db = fakeDb(
        {
          stable_8: {
            firebaseAuthUid: 'auth_8',
            progress: {
              vip_active: 'false',
              vip_admin_override: 'false',
              vip_until: String(PAST),
            },
          },
          stale_visible_sibling: {
            firebaseAuthUid: 'auth_8',
            progress: {
              vip_active: 'true',
              vip_until: String(FUTURE),
              vip_admin_override: 'true',
            },
          },
        },
        { auth_8: { stable_id: 'stable_8' } },
      ) as any;

      await expect(resolvePremiumAccess(db, 'stable_8', NOW, 'auth_8')).resolves.toBe(false);
    });

    it('does not query reverse aliases for a normal canonical paid account', async () => {
      const queryFields: string[] = [];
      const db = fakeDb(
        {
          stable_9: {
            firebaseAuthUid: 'auth_9',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
        },
        { auth_9: { stable_id: 'stable_9' } },
        queryFields,
      ) as any;

      await expect(resolvePremiumAccess(db, 'stable_9', NOW, 'auth_9')).resolves.toBe(true);
      expect(queryFields).not.toContain('canonicalStableId');
    });

    it('does not project lifetime Pro through a poisoned foreign canonical pointer', async () => {
      const db = fakeDb(
        {
          attacker_alias: {
            identityHidden: true,
            canonicalStableId: 'victim_lifetime',
            identityCanonicalizedAt: NOW,
            firebaseAuthUid: 'attacker_auth',
            progress: {},
          },
          victim_lifetime: {
            firebaseAuthUid: 'victim_auth',
            progress: { premium_plan: 'lifetime', premium_expiry: '0' },
          },
        },
        { attacker_auth: { stable_id: 'attacker_alias' } },
      ) as any;

      await expect(resolveIsLifetimePlan(db, 'victim_lifetime', NOW, 'attacker_auth')).resolves.toBe(false);
    });

    it('keeps the canonical lifetime record authoritative over a stale visible sibling', async () => {
      const db = fakeDb(
        {
          stable_lifetime: {
            firebaseAuthUid: 'lifetime_auth',
            progress: { premium_plan: 'monthly', premium_expiry: String(FUTURE) },
          },
          stale_lifetime: {
            firebaseAuthUid: 'lifetime_auth',
            progress: { premium_plan: 'lifetime', premium_expiry: '0' },
          },
        },
        { lifetime_auth: { stable_id: 'stable_lifetime' } },
      ) as any;

      await expect(resolveIsLifetimePlan(db, 'stable_lifetime', NOW, 'lifetime_auth')).resolves.toBe(false);
    });

    it('falls back to an owned stable document when auth_links points to a missing user', async () => {
      const db = fakeDb(
        {
          stable_orphan_recovery: {
            firebaseAuthUid: 'orphan_auth',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
        },
        { orphan_auth: { stable_id: 'deleted_link_target' } },
      ) as any;

      await expect(
        resolvePremiumAccess(db, 'stable_orphan_recovery', NOW, 'orphan_auth'),
      ).resolves.toBe(true);
    });

    it('uses the provider-owned query only after every direct authority is missing', async () => {
      const queryFields: string[] = [];
      const db = fakeDb(
        {
          provider_recovery: {
            firebaseAuthUid: 'provider_recovery_auth',
            progress: { premium_plan: 'yearly', premium_expiry: String(FUTURE) },
          },
        },
        { provider_recovery_auth: { stable_id: 'deleted_provider_target' } },
        queryFields,
      ) as any;

      await expect(
        resolvePremiumAccess(db, 'also_missing', NOW, 'provider_recovery_auth'),
      ).resolves.toBe(true);
      expect(queryFields).toContain('firebaseAuthUid');
    });

    it('does not scan provider siblings after an owned free canonical record is found', async () => {
      const queryFields: string[] = [];
      const db = fakeDb(
        {
          stable_free_authority: {
            firebaseAuthUid: 'free_authority_auth',
            progress: {},
          },
          stale_paid_sibling: {
            firebaseAuthUid: 'free_authority_auth',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
        },
        { free_authority_auth: { stable_id: 'deleted_free_target' } },
        queryFields,
      ) as any;

      await expect(
        resolvePremiumAccess(db, 'stable_free_authority', NOW, 'free_authority_auth'),
      ).resolves.toBe(false);
      expect(queryFields).not.toContain('firebaseAuthUid');
    });

    it('recovers from an unresolvable hidden auth_links target through an owned stable record', async () => {
      const db = fakeDb(
        {
          broken_hidden_anchor: {
            identityHidden: true,
            canonicalStableId: 'missing_hidden_target',
            identityCanonicalizedAt: NOW,
            firebaseAuthUid: 'broken_hidden_auth',
            progress: {},
          },
          stable_hidden_recovery: {
            firebaseAuthUid: 'broken_hidden_auth',
            progress: { vip_active: 'true', vip_until: String(FUTURE) },
          },
        },
        { broken_hidden_auth: { stable_id: 'broken_hidden_anchor' } },
      ) as any;

      await expect(
        resolvePremiumAccess(db, 'stable_hidden_recovery', NOW, 'broken_hidden_auth'),
      ).resolves.toBe(true);
    });

    it('does not query reverse aliases for an ordinary free canonical account', async () => {
      const queryFields: string[] = [];
      const db = fakeDb(
        {
          ordinary_free: {
            firebaseAuthUid: 'ordinary_free_auth',
            progress: {},
          },
          ordinary_hidden_vip: {
            identityHidden: true,
            canonicalStableId: 'ordinary_free',
            identityCanonicalizedAt: NOW,
            firebaseAuthUid: 'ordinary_free_auth',
            progress: {
              vip_active: 'true',
              vip_until: String(FUTURE),
              vip_admin_override: 'true',
            },
          },
        },
        { ordinary_free_auth: { stable_id: 'ordinary_free' } },
        queryFields,
      ) as any;

      await expect(
        resolvePremiumAccess(db, 'ordinary_free', NOW, 'ordinary_free_auth'),
      ).resolves.toBe(false);
      expect(queryFields).not.toContain('canonicalStableId');
    });

    it('does not resurrect a valid client gift from a hidden alias', async () => {
      const db = fakeDb(
        {
          gift_canonical: {
            firebaseAuthUid: 'gift_alias_auth',
            identityCleanupAt: NOW,
            progress: {},
          },
          hidden_client_gift: {
            identityHidden: true,
            canonicalStableId: 'gift_canonical',
            identityCanonicalizedAt: NOW,
            firebaseAuthUid: 'gift_alias_auth',
            progress: {
              loyalty_gift_granted_at_ms: String(NOW),
              loyalty_gift_until_ms: String(FUTURE),
            },
          },
        },
        { gift_alias_auth: { stable_id: 'gift_canonical' } },
      ) as any;

      await expect(
        resolvePremiumAccess(db, 'gift_canonical', NOW, 'gift_alias_auth'),
      ).resolves.toBe(false);
    });

    it('does not resurrect store or lifetime access from a hidden alias', async () => {
      const users = {
        store_canonical: {
          firebaseAuthUid: 'store_alias_auth',
          identityMergedAt: NOW,
          progress: {},
        },
        hidden_store_purchase: {
          identityHidden: true,
          canonicalStableId: 'store_canonical',
          identityMergedAt: NOW,
          firebaseAuthUid: 'store_alias_auth',
          progress: { premium_plan: 'lifetime', premium_expiry: '0' },
        },
      };
      const links = { store_alias_auth: { stable_id: 'store_canonical' } };
      const premiumDb = fakeDb(users, links) as any;
      const lifetimeQueryFields: string[] = [];
      const lifetimeDb = fakeDb(users, links, lifetimeQueryFields) as any;

      await expect(
        resolvePremiumAccess(premiumDb, 'store_canonical', NOW, 'store_alias_auth'),
      ).resolves.toBe(false);
      await expect(
        resolveIsLifetimePlan(lifetimeDb, 'store_canonical', NOW, 'store_alias_auth'),
      ).resolves.toBe(false);
      expect(lifetimeQueryFields).not.toContain('canonicalStableId');
    });

    it('shares one authority read between concurrent premium and lifetime checks', async () => {
      const metrics: FakeDbMetrics = {
        authLinkGets: 0,
        userDocGets: {},
        queryGets: {},
      };
      const db = fakeDb(
        {
          shared_lifetime: {
            firebaseAuthUid: 'shared_lifetime_auth',
            progress: { premium_plan: 'lifetime', premium_expiry: '0' },
          },
        },
        { shared_lifetime_auth: { stable_id: 'shared_lifetime' } },
        [],
        metrics,
      ) as any;

      await expect(Promise.all([
        resolvePremiumAccess(db, 'shared_lifetime', NOW, 'shared_lifetime_auth'),
        resolveIsLifetimePlan(db, 'shared_lifetime', NOW, 'shared_lifetime_auth'),
      ])).resolves.toEqual([true, true]);
      expect(metrics.authLinkGets).toBe(1);
      expect(metrics.userDocGets.shared_lifetime).toBe(1);
      expect(metrics.queryGets.firebaseAuthUid ?? 0).toBe(0);
    });
  });
});
