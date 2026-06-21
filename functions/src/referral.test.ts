import {
  MAX_REFERRER_CLAIMS_PER_DAY,
  MAX_REFERRER_CLAIMS_PER_MONTH,
  REFERRAL_REWARD_DAYS,
  REFERRAL_DEFAULTS,
  referralConfigFromData,
  buildReferralVipProgressPatch,
  hasCompletedFirstLesson,
  isSnapshotMigrationWrite,
  referralClaimSlotsLeft,
  stackVipUntilMs,
  vipUntilFromProgress,
  prunePeriodCounter,
} from './referral';

describe('prunePeriodCounter — анти-рост счётчиков в progress (M1)', () => {
  it('оставляет N самых свежих периодов (дни)', () => {
    const map = { '2026-06-01': 1, '2026-06-02': 2, '2026-06-03': 3, '2026-06-04': 4 };
    const out = prunePeriodCounter(map, 2);
    expect(Object.keys(out).sort()).toEqual(['2026-06-03', '2026-06-04']);
  });

  it('оставляет N самых свежих месяцев (YYYY-MM сортируется хронологически)', () => {
    const map = { '2026-01': 5, '2026-02': 3, '2026-03': 7, '2026-04': 1 };
    const out = prunePeriodCounter(map, 3);
    expect(Object.keys(out).sort()).toEqual(['2026-02', '2026-03', '2026-04']);
    expect(out['2026-01']).toBeUndefined();
  });

  it('меньше периодов чем keep → возвращает всё', () => {
    const map = { '2026-06': 2 };
    expect(prunePeriodCounter(map, 3)).toEqual({ '2026-06': 2 });
  });

  it('пустая карта → пустая карта', () => {
    expect(prunePeriodCounter({}, 3)).toEqual({});
  });
});

describe('referralClaimSlotsLeft — анти-фарм: сколько наград можно выдать (день+месяц кап)', () => {
  // Защита от фарминга свежими аккаунтами: даже при бесконечных «новых» рефералах
  // пригласивший выбирает не больше дневного лимита в день и месячного — в месяц.
  it('ограничено дневным капом, когда месячный ещё далеко', () => {
    expect(referralClaimSlotsLeft(0, 0)).toBe(MAX_REFERRER_CLAIMS_PER_DAY);
    expect(referralClaimSlotsLeft(0, 1)).toBe(MAX_REFERRER_CLAIMS_PER_DAY - 1);
  });

  it('0 когда дневной кап исчерпан', () => {
    expect(referralClaimSlotsLeft(0, MAX_REFERRER_CLAIMS_PER_DAY)).toBe(0);
    expect(referralClaimSlotsLeft(5, MAX_REFERRER_CLAIMS_PER_DAY + 3)).toBe(0);
  });

  it('0 когда месячный кап исчерпан (даже если день свободен)', () => {
    expect(referralClaimSlotsLeft(MAX_REFERRER_CLAIMS_PER_MONTH, 0)).toBe(0);
    expect(referralClaimSlotsLeft(MAX_REFERRER_CLAIMS_PER_MONTH + 2, 0)).toBe(0);
  });

  it('берёт МИНИМУМ из оставшегося дневного и месячного остатка', () => {
    // месяц почти полон: остался 1 слот, хотя день позволяет больше
    expect(referralClaimSlotsLeft(MAX_REFERRER_CLAIMS_PER_MONTH - 1, 0)).toBe(1);
  });

  it('не уходит в минус при «грязных» счётчиках', () => {
    expect(referralClaimSlotsLeft(-5, -5)).toBe(MAX_REFERRER_CLAIMS_PER_DAY);
    expect(referralClaimSlotsLeft(999, 999)).toBe(0);
  });

  it('дневной кап строго меньше месячного (иначе бессмысленно)', () => {
    expect(MAX_REFERRER_CLAIMS_PER_DAY).toBeLessThan(MAX_REFERRER_CLAIMS_PER_MONTH);
  });

  it('принимает капы из «Пульта» параметрами (override дефолтов)', () => {
    // день=1, месяц=10 → минимум остатка = 1
    expect(referralClaimSlotsLeft(0, 0, 10, 1)).toBe(1);
    // месяц исчерпан (5/5) при свободном дне
    expect(referralClaimSlotsLeft(5, 0, 5, 3)).toBe(0);
  });
});

describe('referralConfigFromData — тюнинг рефералов из remote_config/app.numbers', () => {
  it('пусто/undefined → дефолты (7 дней, 3/день, 30/мес)', () => {
    expect(referralConfigFromData(undefined)).toEqual(REFERRAL_DEFAULTS);
    expect(referralConfigFromData({})).toEqual(REFERRAL_DEFAULTS);
    expect(REFERRAL_DEFAULTS.rewardDays).toBe(REFERRAL_REWARD_DAYS);
  });

  it('читает заданные значения', () => {
    const cfg = referralConfigFromData({
      referral_reward_days: 14,
      referral_max_claims_month: 50,
      referral_max_claims_day: 5,
    });
    expect(cfg).toEqual({ rewardDays: 14, maxClaimsPerMonth: 50, maxClaimsPerDay: 5 });
  });

  it('мусор/нечисло → дефолт по полю (не роняет)', () => {
    const cfg = referralConfigFromData({ referral_reward_days: 'seven', referral_max_claims_day: NaN });
    expect(cfg.rewardDays).toBe(REFERRAL_DEFAULTS.rewardDays);
    expect(cfg.maxClaimsPerDay).toBe(REFERRAL_DEFAULTS.maxClaimsPerDay);
  });

  it('отрицательные клампятся к 0 (а не уходят в минус)', () => {
    const cfg = referralConfigFromData({ referral_reward_days: -10, referral_max_claims_day: -3 });
    expect(cfg.rewardDays).toBe(0);
    expect(cfg.maxClaimsPerDay).toBe(0);
  });
});

describe('isSnapshotMigrationWrite — миграция снапшота НЕ должна квалифицировать реферал', () => {
  // Дыра: progressMigrateSnapshot доверяет клиентскому lesson1_pass_count и пишет его серверно
  // (progress_events.ts buildMigrationPatch) → раньше это срабатывало как «урок пройден» и
  // выдавало 7 дней без реального прохождения. Отличаем миграцию по полю progressMigratedAt.
  it('true когда появился/изменился progressMigratedAt (это миграция, не живое событие урока)', () => {
    expect(isSnapshotMigrationWrite(undefined, { progressMigratedAt: 111 })).toBe(true);
    expect(isSnapshotMigrationWrite({ progressMigratedAt: 100 }, { progressMigratedAt: 222 })).toBe(true);
  });

  it('false для обычного живого события урока (progressMigratedAt не менялся)', () => {
    expect(isSnapshotMigrationWrite({ progressMigratedAt: 100 }, { progressMigratedAt: 100 })).toBe(false);
    expect(isSnapshotMigrationWrite({ lesson1_pass_count: '0' }, { lesson1_pass_count: '1' })).toBe(false);
    expect(isSnapshotMigrationWrite(undefined, { lesson1_pass_count: '1' })).toBe(false);
    expect(isSnapshotMigrationWrite(undefined, {})).toBe(false);
  });
});

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
