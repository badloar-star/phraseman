// зачем (владелец 29.10 ~07:55): «система начисляет автоматически Plus, и он активируется как надо» — приз конкурса и
// лесенка приглашений пишут на сервере vip_* (functions/src/plus_grant.ts → buildPlusGrantPatch, механизм Telegram).
// Этот сторож держит обратную сторону: ПРИЛОЖЕНИЕ узнаёт такой Plus и открывает по нему все 32 классических урока.
// Форма патча ниже — та же, что строит buildPlusGrantPatch (сервер проверяет её своим тестом plus_grant.test.ts).
import { isPremiumAccessProgressActive, isVipProgressActive } from '../app/premium_progress';
import { PLUS_OPENS_ALL_LESSONS, plusOpensLesson } from '../app/plus_lessons_rule';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 1, 0, 10);

const grantPatch = (plan: 'community_month' | 'referral_ladder', untilMs: number) => ({
  vip_active: 'true',
  vip_plan: plan,
  vip_from: String(NOW),
  vip_until: String(untilMs),
  vip_admin_override: 'true',
  vip_admin_grant_at: String(NOW),
  plus_grant_last_key: `${plan}:2026-11:place1`,
});

describe('автоначисленный Plus (vip_*) в приложении', () => {
  it.each(['community_month', 'referral_ladder'] as const)('%s: Plus активен весь срок и гаснет после конца', (plan) => {
    const until = NOW + 90 * DAY;
    const progress = grantPatch(plan, until);
    expect(isVipProgressActive(progress, NOW + DAY)).toBe(true);
    expect(isPremiumAccessProgressActive(progress, NOW + DAY)).toBe(true);
    expect(isPremiumAccessProgressActive(progress, until + 1)).toBe(false);
  });

  it('Plus открывает все 32 классических урока (PLUS_OPENS_ALL_LESSONS)', () => {
    expect(PLUS_OPENS_ALL_LESSONS).toBe(true);
    for (let lesson = 1; lesson <= 32; lesson += 1) expect(plusOpensLesson(lesson)).toBe(true);
  });

  it('поверх платной подписки vip_* не ломает распознавание', () => {
    const progress = { premium_active: 'true', premium_plan: 'monthly', premium_expiry: String(NOW + 10 * DAY), ...grantPatch('community_month', NOW + 100 * DAY) };
    expect(isPremiumAccessProgressActive(progress, NOW + 50 * DAY)).toBe(true);
  });
});
