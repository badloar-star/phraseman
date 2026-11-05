// Governance-ID: TG-9326ED0B6BC6
import { realPlusTier } from './premium_status';

// зачем (слово владельца 06.11, «Plus/Ultra»; просьба сессии «Вход»): годовая подписка = Ultra, всё прочее = Plus, Plus нет = null.
const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

describe('realPlusTier', () => {
  it('годовая активная подписка → ultra (yearly и annual)', () => {
    expect(realPlusTier({ premium_plan: 'yearly', premium_expiry: String(NOW + DAY) }, NOW)).toBe('ultra');
    expect(realPlusTier({ premium_plan: 'annual', premium_expiry: String(NOW + DAY) }, NOW)).toBe('ultra');
  });

  it('месячная → plus', () => {
    expect(realPlusTier({ premium_plan: 'monthly', premium_expiry: String(NOW + DAY) }, NOW)).toBe('plus');
  });

  it('пожизненная → plus', () => {
    expect(realPlusTier({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toBe('plus');
  });

  it('админский грант и VIP → plus, даже если план назван годовым', () => {
    expect(realPlusTier({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: String(NOW + DAY) }, NOW)).toBe('plus');
    expect(realPlusTier({ vip_plan: 'referral', vip_until: String(NOW + DAY) }, NOW)).toBe('plus');
  });

  it('истёкшая годовая → Plus нет → null', () => {
    expect(realPlusTier({ premium_plan: 'yearly', premium_expiry: String(NOW - DAY) }, NOW)).toBeNull();
  });

  it('истёкшая годовая при живом VIP → plus, не ultra', () => {
    expect(realPlusTier({ premium_plan: 'yearly', premium_expiry: String(NOW - DAY), vip_plan: 'referral', vip_until: String(NOW + DAY) }, NOW)).toBe('plus');
  });

  it('пусто и вводный доступ → null', () => {
    expect(realPlusTier({}, NOW)).toBeNull();
    expect(realPlusTier({ intro_access_until_ms: String(NOW + DAY) }, NOW)).toBeNull();
  });
});
