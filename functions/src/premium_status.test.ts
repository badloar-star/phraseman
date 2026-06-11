import { isPremiumAccessActive, isVipActive, parseProgressMs } from './premium_status';

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
});
