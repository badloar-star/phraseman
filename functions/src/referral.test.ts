import { stackVipUntilMs, vipUntilFromProgress } from './referral';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // фиксированный «сейчас» для детерминизма

describe('vipUntilFromProgress', () => {
  it('returns 0 for empty/missing progress', () => {
    expect(vipUntilFromProgress(undefined)).toBe(0);
    expect(vipUntilFromProgress({})).toBe(0);
    expect(vipUntilFromProgress({ vip_until: '0' })).toBe(0);
    expect(vipUntilFromProgress({ vip_until: 'abc' })).toBe(0);
  });

  it('parses numeric and string ms', () => {
    expect(vipUntilFromProgress({ vip_until: NOW })).toBe(NOW);
    expect(vipUntilFromProgress({ vip_until: String(NOW) })).toBe(NOW);
  });

  it('falls back to legacy vip_expiry when vip_until absent', () => {
    expect(vipUntilFromProgress({ vip_expiry: NOW })).toBe(NOW);
  });

  it('prefers vip_until over vip_expiry', () => {
    expect(vipUntilFromProgress({ vip_until: NOW, vip_expiry: 1 })).toBe(NOW);
  });
});

describe('stackVipUntilMs — «копить на потом»', () => {
  it('grants 7 days from now when no existing VIP window', () => {
    expect(stackVipUntilMs(0, NOW, 7)).toBe(NOW + 7 * DAY);
  });

  it('stacks on top of a future VIP window (does not burn existing days)', () => {
    const existing = NOW + 3 * DAY; // ещё 3 дня осталось
    // ключевой инвариант: новые 7 дней добавляются к концу, итого 10 дней от now
    expect(stackVipUntilMs(existing, NOW, 7)).toBe(NOW + 10 * DAY);
  });

  it('treats an expired window as if starting from now', () => {
    const expired = NOW - 5 * DAY;
    expect(stackVipUntilMs(expired, NOW, 7)).toBe(NOW + 7 * DAY);
  });

  it('is associative across multiple friends claimed in one call', () => {
    // 3 друга подряд → 21 день от now
    let until = 0;
    for (let i = 0; i < 3; i += 1) until = stackVipUntilMs(until, NOW, 7);
    expect(until).toBe(NOW + 21 * DAY);
  });

  it('stacking already-active referral window keeps accumulating', () => {
    // первый клик дал 7 дней; ещё один друг qualified → +7 = 14 дней
    const afterFirst = stackVipUntilMs(0, NOW, 7); // NOW + 7d
    // второй клик чуть позже (now+1h), окно ещё открыто → стакаем к концу
    const later = NOW + 60 * 60 * 1000;
    expect(stackVipUntilMs(afterFirst, later, 7)).toBe(afterFirst + 7 * DAY);
  });

  it('ignores negative/zero day grants safely', () => {
    expect(stackVipUntilMs(0, NOW, 0)).toBe(NOW);
    expect(stackVipUntilMs(0, NOW, -5)).toBe(NOW);
  });

  it('referrer-only grant: 7 days from a clean window', () => {
    // награду получает только referrer (по кнопке); другу VIP не даём — у него intro-доступ
    const referrerUntil = stackVipUntilMs(0, NOW, 7);
    expect(referrerUntil).toBe(NOW + 7 * DAY);
  });
});
