import {
  isGiftAccessActive,
  isPremiumAccessActive,
  isVipActive,
  parseProgressMs,
  resolveIsMaxTier,
  resolvePremiumAccess,
} from './premium_status';

const NOW = 1_700_000_000_000;
const FUTURE = NOW + 86_400_000;
const PAST = NOW - 86_400_000;

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
            where(field: string, _op: string, value: string) {
              return {
                limit(n: number) {
                  return {
                    async get() {
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

    describe('resolveIsMaxTier canonical authority', () => {
      it('does not resurrect MAX from an owned hidden alias after canonical downgrade', async () => {
        const db = fakeDb({
          canonical: { firebaseAuthUid: 'auth-max', progress: { premium_plan: 'monthly', premium_expiry: '0' } },
          stale_max_alias: {
            identityHidden: true, canonicalStableId: 'canonical', firebaseAuthUid: 'auth-max',
            progress: { premium_plan: 'max_monthly', premium_expiry: '0' },
          },
        }, { 'auth-max': { stable_id: 'canonical' } }) as any;

        await expect(resolveIsMaxTier(db, 'canonical', NOW, 'auth-max')).resolves.toBe(false);
      });

      it('does not resurrect MAX from a hidden alias after canonical revoke', async () => {
        const db = fakeDb({
          canonical: {
            firebaseAuthUid: 'auth-revoked',
            progress: { premium_plan: 'max_monthly', premium_expiry: String(PAST) },
          },
          stale_max_alias: {
            identityHidden: true, canonicalStableId: 'canonical', firebaseAuthUid: 'auth-revoked',
            progress: { premium_plan: 'max_monthly', premium_expiry: '0' },
          },
        }, { 'auth-revoked': { stable_id: 'canonical' } }) as any;

        await expect(resolveIsMaxTier(db, 'canonical', NOW, 'auth-revoked')).resolves.toBe(false);
      });

      it('still finds active MAX on the visible canonical identity reached through auth_links', async () => {
        const db = fakeDb({
          legacy_auth_doc: { identityHidden: true, canonicalStableId: 'canonical', progress: {} },
          canonical: { firebaseAuthUid: 'auth-live', progress: { premium_plan: 'max_monthly', premium_expiry: '0' } },
        }, { 'auth-live': { stable_id: 'canonical' } }) as any;

        await expect(resolveIsMaxTier(db, 'legacy_auth_doc', NOW, 'auth-live')).resolves.toBe(true);
      });
    });

    it('routes auth link, provider, user, and reverse-alias reads through the supplied transaction', async () => {
      const users: Record<string, Record<string, unknown>> = {
        stable_tx: { firebaseAuthUid: 'auth_tx', progress: {} },
        duplicate_0: { firebaseAuthUid: 'auth_tx', progress: {} },
        duplicate_1: { firebaseAuthUid: 'auth_tx', progress: {} },
        duplicate_2: { firebaseAuthUid: 'auth_tx', progress: {} },
        duplicate_3: { firebaseAuthUid: 'auth_tx', progress: {} },
        hidden_vip: {
          identityHidden: true,
          canonicalStableId: 'stable_tx',
          firebaseAuthUid: 'auth_tx',
          progress: { vip_active: 'true', vip_until: String(FUTURE) },
        },
      };
      const ordinaryGet = jest.fn(async () => {
        throw new Error('ordinary_db_read_forbidden');
      });
      const makeDoc = (path: string) => ({ kind: 'doc', path, get: ordinaryGet });
      const makeQuery = (field: string, value: string, limit: number) => ({
        kind: 'query', field, value, limit, get: ordinaryGet,
      });
      const db = {
        collection(name: string) {
          return {
            doc: (id: string) => makeDoc(`${name}/${id}`),
            where: (field: string, _op: string, value: string) => ({
              limit: (limit: number) => makeQuery(field, value, limit),
            }),
          };
        },
      } as any;
      const tx = {
        get: jest.fn(async (target: any) => {
          if (target.kind === 'doc') {
            const [, id] = String(target.path).split('/');
            const data = target.path.startsWith('auth_links/')
              ? (id === 'auth_tx' ? { stable_id: 'stable_tx' } : undefined)
              : users[id];
            return { exists: !!data, id, data: () => data };
          }
          const docs = Object.entries(users)
            .filter(([, data]) => data[target.field] === target.value)
            .slice(0, target.limit)
            .map(([id, data]) => ({ id, exists: true, data: () => data }));
          return { docs };
        }),
      } as any;

      await expect(resolvePremiumAccess(db, 'stable_tx', NOW, 'auth_tx', tx)).resolves.toBe(true);
      expect(ordinaryGet).not.toHaveBeenCalled();
      expect(tx.get).toHaveBeenCalledWith(expect.objectContaining({ path: 'auth_links/auth_tx' }));
      expect(tx.get).toHaveBeenCalledWith(expect.objectContaining({ field: 'firebaseAuthUid' }));
      expect(tx.get).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/stable_tx' }));
      expect(tx.get).toHaveBeenCalledWith(expect.objectContaining({ field: 'canonicalStableId' }));
    });

    it.each([
      ['identity lookup', 1],
      ['user lookup', 3],
    ])('propagates a transaction %s read failure', async (_label, failAtCall) => {
      const db = fakeDb(
        {
          stable_failure: {
            firebaseAuthUid: 'auth_failure',
            progress: { premium_plan: 'monthly', premium_expiry: '0' },
          },
        },
        { auth_failure: { stable_id: 'stable_failure' } },
      ) as any;
      let callCount = 0;
      const tx = {
        get: jest.fn(async (target: { get: () => Promise<unknown> }) => {
          callCount += 1;
          if (callCount === failAtCall) throw new Error(`tx_read_failed_${failAtCall}`);
          return target.get();
        }),
      } as any;

      await expect(resolvePremiumAccess(
        db,
        'stable_failure',
        NOW,
        'auth_failure',
        tx,
      )).rejects.toThrow(`tx_read_failed_${failAtCall}`);
    });

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

    it('finds an active admin VIP on an owned hidden alias after auth_links moved to canonical', async () => {
      const users: Record<string, Record<string, unknown>> = {
        stable_3: {
          firebaseAuthUid: 'auth_3',
          linkedAuth: { providerUid: 'auth_3' },
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
          stable_3b: { firebaseAuthUid: 'auth_3b', progress: {} },
          vip_alias_3b: {
            identityHidden: true,
            canonicalStableId: 'stable_3b',
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
  });
});
