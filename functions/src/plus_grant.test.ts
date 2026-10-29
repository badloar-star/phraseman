// зачем (владелец 29.10 ~07:55): Plus за места 1/2/3 (3/2/1 мес.) и за 3 друзей (14 дней) начисляется автоматически
// механизмом Telegram (vip_*), продлевая, а не затирая; повтор не начисляет второй раз. Сторож чистого ядра выдачи.
import { buildAccessProjection } from './access_projection';
import { isVipActive } from './premium_status';
import { addUtcMonths, buildPlusGrantPatch, currentPlusEndMs, plusGrantLedgerId } from './plus_grant';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 1, 0, 10); // 1.11 00:10 UTC — запуск финализации

describe('plus_grant — продление, а не затирание', () => {
  it('нет Plus → сейчас + 3 календарных месяца, vip_* как у Telegram, Plus активен', () => {
    const r = buildPlusGrantPatch({}, NOW, { months: 3 }, 'community_month', 'community_month:2026-11:place1');
    expect(r.kind).toBe('grant');
    if (r.kind !== 'grant') return;
    expect(r.untilMs).toBe(Date.UTC(2027, 1, 1, 0, 10));
    expect(r.patch).toMatchObject({ vip_active: 'true', vip_plan: 'community_month', vip_until: String(r.untilMs), vip_from: String(NOW) });
    expect(isVipActive(r.patch, NOW + DAY)).toBe(true);
    expect(isVipActive(r.patch, r.untilMs + 1)).toBe(false);
    // проекция для приложения: Plus из vip_* отражается полем vipActive (как Telegram-Plus), premiumActive — магазин/админ/приз
    expect(buildAccessProjection(r.patch, NOW + DAY).vipActive).toBe(true);
    expect(buildAccessProjection(r.patch, r.untilMs + 1).vipActive).toBe(false);
  });

  it('действующий VIP до X → X + 2 месяца, начало окна не сдвигается', () => {
    const from = NOW - 10 * DAY;
    const until = NOW + 20 * DAY;
    const p = { vip_active: 'true', vip_plan: 'promo', vip_from: String(from), vip_until: String(until), vip_admin_override: 'true' };
    const r = buildPlusGrantPatch(p, NOW, { months: 2 }, 'community_month', 'community_month:2026-11:place2');
    if (r.kind !== 'grant') throw new Error('expected grant');
    expect(r.baseMs).toBe(until);
    expect(r.untilMs).toBe(addUtcMonths(until, 2));
    expect(r.patch.vip_from).toBe(String(from));
  });

  it('платная подписка магазина до X → Plus продлевается после X', () => {
    const storeUntil = NOW + 40 * DAY;
    const p = { premium_active: 'true', premium_plan: 'monthly', premium_expiry: String(storeUntil) };
    expect(currentPlusEndMs(p, NOW)).toBe(storeUntil);
    const r = buildPlusGrantPatch(p, NOW, { days: 14 }, 'referral_ladder', 'referral_ladder:u1_tier3');
    if (r.kind !== 'grant') throw new Error('expected grant');
    expect(r.untilMs).toBe(storeUntil + 14 * DAY);
  });

  it('истёкший Plus не продлевается «из прошлого»: база — сейчас', () => {
    const p = { vip_active: 'true', vip_plan: 'promo', vip_until: String(NOW - 5 * DAY) };
    const r = buildPlusGrantPatch(p, NOW, { months: 1 }, 'community_month', 'community_month:2026-11:place3');
    if (r.kind !== 'grant') throw new Error('expected grant');
    expect(r.baseMs).toBe(NOW);
  });

  it('бессрочный Plus — выдавать нечего (lifetime)', () => {
    expect(buildPlusGrantPatch({ vip_active: 'true', vip_plan: 'promo_lifetime', vip_until: '0' }, NOW, { months: 3 }, 'community_month', 'community_month:2026-11:place1').kind).toBe('lifetime');
  });

  it('календарные месяцы прижимаются к последнему дню', () => {
    expect(addUtcMonths(Date.UTC(2027, 0, 31), 1)).toBe(Date.UTC(2027, 1, 28));
    expect(addUtcMonths(Date.UTC(2028, 0, 31), 1)).toBe(Date.UTC(2028, 1, 29));
    expect(addUtcMonths(Date.UTC(2026, 10, 30), 3)).toBe(Date.UTC(2027, 1, 28));
  });

  it('ключ журнала: месяц+место / приглашение — валиден и без «/»', () => {
    expect(plusGrantLedgerId('community_month:2026-11:place1')).toBe('community_month__2026-11__place1');
    expect(() => plusGrantLedgerId('community_month:2026/11')).toThrow();
  });
});
