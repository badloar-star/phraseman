import {
  REFERRAL_REWARD_DAYS,
  buildReferralVipProgressPatch,
  hasCompletedFirstLesson,
  stackVipUntilMs,
  vipUntilFromProgress,
} from './referral';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // фиксированный «сейчас» для детерминизма

describe('hasCompletedFirstLesson — квалификация = РЕАЛЬНО пройден урок 1, не «открыт»', () => {
  it('false для пустого/отсутствующего прогресса', () => {
    expect(hasCompletedFirstLesson(undefined)).toBe(false);
    expect(hasCompletedFirstLesson({})).toBe(false);
  });

  // C2: «открыт урок 2» НЕ значит «пройден урок 1». Premium/intro-триал/сдача зачёта
  // открывают уроки без прохождения — это НЕ должно квалифицировать друга.
  it('false когда урок 2 лишь ОТКРЫТ, но урок 1 не пройден (premium/intro/exam-unlock)', () => {
    expect(hasCompletedFirstLesson({ unlocked_lessons: '[1,2,3]' })).toBe(false);
    expect(hasCompletedFirstLesson({ unlocked_lessons: JSON.stringify([1, 2]) })).toBe(false);
    // весь уровень открыт премиумом — но ни одного pass_count
    const premiumUnlockAll: Record<string, string> = { unlocked_lessons: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]) };
    expect(hasCompletedFirstLesson(premiumUnlockAll)).toBe(false);
  });

  it('true когда урок 1 реально пройден (EN: lesson1_pass_count >= 1)', () => {
    expect(hasCompletedFirstLesson({ lesson1_pass_count: '1' })).toBe(true);
    expect(hasCompletedFirstLesson({ lesson1_pass_count: '3', unlocked_lessons: '[1,2]' })).toBe(true);
  });

  it('false когда pass_count нулевой/мусорный', () => {
    expect(hasCompletedFirstLesson({ lesson1_pass_count: '0' })).toBe(false);
    expect(hasCompletedFirstLesson({ lesson1_pass_count: 'abc' })).toBe(false);
  });

  // C3: французский курс пишет scoped-ключ. Раньше триггер его не видел → fr никогда не квалифицировался.
  it('true когда урок 1 пройден на ФРАНЦУЗСКОМ (scoped key lesson_progress_v2::fr::lesson1_pass_count)', () => {
    expect(hasCompletedFirstLesson({ 'lesson_progress_v2::fr::lesson1_pass_count': '1' })).toBe(true);
  });

  it('false когда на fr урок 2 лишь открыт, но урок 1 не пройден', () => {
    expect(hasCompletedFirstLesson({ 'lesson_progress_v2::fr::unlocked_lessons': '[1,2]' })).toBe(false);
  });

  it('поддерживает number и string значения pass_count', () => {
    expect(hasCompletedFirstLesson({ lesson1_pass_count: 1 as unknown as string })).toBe(true);
    expect(hasCompletedFirstLesson({ lesson1_pass_count: 0 as unknown as string })).toBe(false);
  });
});

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

  it('grants 7 days to the invited friend and 7 separate days to the referrer', () => {
    const referee = buildReferralVipProgressPatch(undefined, NOW, REFERRAL_REWARD_DAYS, 'referee');
    const referrer = buildReferralVipProgressPatch(undefined, NOW, REFERRAL_REWARD_DAYS, 'referrer');

    expect(referee.vip_until).toBe(String(NOW + 7 * DAY));
    expect(referrer.vip_until).toBe(String(NOW + 7 * DAY));
    expect(referee.referral_vip_last_source).toBe('referee');
    expect(referrer.referral_vip_last_source).toBe('referrer');
  });

  it('keeps 7+7 as two people, not 14 days on one clean account', () => {
    const referee = buildReferralVipProgressPatch(undefined, NOW, REFERRAL_REWARD_DAYS, 'referee');

    expect(referee.vip_until).not.toBe(String(NOW + 14 * DAY));
  });
});
