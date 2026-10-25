// зачем (бэклог 22.10 L710/L819): у подписки premium_expiry='0' — «срок ведёт вебхук», настоящий срок в premium_rc_expiry_ms.
// realPlusUntilMs отдавал 0 («бессрочно»), и кольцо Plus у подписчика в публичном профиле горело вечно. Сторож: срок подписки —
// rc-срок + тот же запас 72 ч, что у isStorePremiumActive; пожизненный и грант без срока — 0; «нет Plus» — null (≠ 0).
import { isStorePremiumActive, realPlusUntilMs } from './premium_status';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const GRACE = 72 * 60 * 60 * 1000;

describe('realPlusUntilMs — срок настоящего Plus для кольца', () => {
  it('подписка (premium_expiry=0, срок у вебхука) → rc-срок + 72 ч, а не «бессрочно»', () => {
    const rc = NOW + 20 * DAY;
    expect(realPlusUntilMs({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(rc) }, NOW)).toBe(rc + GRACE);
  });

  it('подписка в запасе после rc-срока — ещё активна, срок = rc + 72 ч (в будущем)', () => {
    const rc = NOW - DAY;
    const progress = { premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: String(rc) };
    expect(isStorePremiumActive(progress, NOW)).toBe(true);
    expect(realPlusUntilMs(progress, NOW)).toBe(rc + GRACE);
  });

  it('подписка дальше запаса — Plus нет → null', () => {
    expect(realPlusUntilMs({ premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(NOW - 4 * DAY) }, NOW)).toBeNull();
  });

  it('явный premium_expiry в будущем — он и есть срок', () => {
    expect(realPlusUntilMs({ premium_plan: 'monthly', premium_expiry: String(NOW + DAY) }, NOW)).toBe(NOW + DAY);
  });

  it('пожизненный (expiry=0, rc-срока нет) → 0 «бессрочно»', () => {
    expect(realPlusUntilMs({ premium_plan: 'lifetime', premium_expiry: '0' }, NOW)).toBe(0);
  });

  it('грант админа без срока → 0; со сроком → срок', () => {
    expect(realPlusUntilMs({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' }, NOW)).toBe(0);
    expect(realPlusUntilMs({ premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: String(NOW + 5 * DAY) }, NOW)).toBe(NOW + 5 * DAY);
  });

  it('VIP со сроком → vip_until; VIP без срока → 0', () => {
    expect(realPlusUntilMs({ vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(NOW + 9 * DAY) }, NOW)).toBe(NOW + 9 * DAY);
    expect(realPlusUntilMs({ vip_active: 'true', vip_plan: 'admin_vip' }, NOW)).toBe(0);
  });

  it('нет Plus → null, а не 0 (иначе кольцо зажглось бы всем)', () => {
    expect(realPlusUntilMs({}, NOW)).toBeNull();
    expect(realPlusUntilMs({ premium_plan: 'monthly', premium_expiry: String(NOW - DAY) }, NOW)).toBeNull();
  });
});
