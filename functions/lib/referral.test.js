"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const referral_1 = require("./referral");
describe('prunePeriodCounter — анти-рост счётчиков в progress (M1)', () => {
    it('оставляет N самых свежих периодов (дни)', () => {
        const map = { '2026-06-01': 1, '2026-06-02': 2, '2026-06-03': 3, '2026-06-04': 4 };
        const out = (0, referral_1.prunePeriodCounter)(map, 2);
        expect(Object.keys(out).sort()).toEqual(['2026-06-03', '2026-06-04']);
    });
    it('оставляет N самых свежих месяцев (YYYY-MM сортируется хронологически)', () => {
        const map = { '2026-01': 5, '2026-02': 3, '2026-03': 7, '2026-04': 1 };
        const out = (0, referral_1.prunePeriodCounter)(map, 3);
        expect(Object.keys(out).sort()).toEqual(['2026-02', '2026-03', '2026-04']);
        expect(out['2026-01']).toBeUndefined();
    });
    it('меньше периодов чем keep → возвращает всё', () => {
        const map = { '2026-06': 2 };
        expect((0, referral_1.prunePeriodCounter)(map, 3)).toEqual({ '2026-06': 2 });
    });
    it('пустая карта → пустая карта', () => {
        expect((0, referral_1.prunePeriodCounter)({}, 3)).toEqual({});
    });
});
describe('referralClaimSlotsLeft — анти-фарм: сколько наград можно выдать (день+месяц кап)', () => {
    // Защита от фарминга свежими аккаунтами: даже при бесконечных «новых» рефералах
    // пригласивший выбирает не больше дневного лимита в день и месячного — в месяц.
    it('ограничено дневным капом, когда месячный ещё далеко', () => {
        expect((0, referral_1.referralClaimSlotsLeft)(0, 0)).toBe(referral_1.MAX_REFERRER_CLAIMS_PER_DAY);
        expect((0, referral_1.referralClaimSlotsLeft)(0, 1)).toBe(referral_1.MAX_REFERRER_CLAIMS_PER_DAY - 1);
    });
    it('0 когда дневной кап исчерпан', () => {
        expect((0, referral_1.referralClaimSlotsLeft)(0, referral_1.MAX_REFERRER_CLAIMS_PER_DAY)).toBe(0);
        expect((0, referral_1.referralClaimSlotsLeft)(5, referral_1.MAX_REFERRER_CLAIMS_PER_DAY + 3)).toBe(0);
    });
    it('0 когда месячный кап исчерпан (даже если день свободен)', () => {
        expect((0, referral_1.referralClaimSlotsLeft)(referral_1.MAX_REFERRER_CLAIMS_PER_MONTH, 0)).toBe(0);
        expect((0, referral_1.referralClaimSlotsLeft)(referral_1.MAX_REFERRER_CLAIMS_PER_MONTH + 2, 0)).toBe(0);
    });
    it('берёт МИНИМУМ из оставшегося дневного и месячного остатка', () => {
        // месяц почти полон: остался 1 слот, хотя день позволяет больше
        expect((0, referral_1.referralClaimSlotsLeft)(referral_1.MAX_REFERRER_CLAIMS_PER_MONTH - 1, 0)).toBe(1);
    });
    it('не уходит в минус при «грязных» счётчиках', () => {
        expect((0, referral_1.referralClaimSlotsLeft)(-5, -5)).toBe(referral_1.MAX_REFERRER_CLAIMS_PER_DAY);
        expect((0, referral_1.referralClaimSlotsLeft)(999, 999)).toBe(0);
    });
    it('дневной кап строго меньше месячного (иначе бессмысленно)', () => {
        expect(referral_1.MAX_REFERRER_CLAIMS_PER_DAY).toBeLessThan(referral_1.MAX_REFERRER_CLAIMS_PER_MONTH);
    });
    it('принимает капы из «Пульта» параметрами (override дефолтов)', () => {
        // день=1, месяц=10 → минимум остатка = 1
        expect((0, referral_1.referralClaimSlotsLeft)(0, 0, 10, 1)).toBe(1);
        // месяц исчерпан (5/5) при свободном дне
        expect((0, referral_1.referralClaimSlotsLeft)(5, 0, 5, 3)).toBe(0);
    });
});
describe('referralConfigFromData — тюнинг рефералов из remote_config/app.numbers', () => {
    it('пусто/undefined → дефолты (7 дней, 3/день, 30/мес)', () => {
        expect((0, referral_1.referralConfigFromData)(undefined)).toEqual(referral_1.REFERRAL_DEFAULTS);
        expect((0, referral_1.referralConfigFromData)({})).toEqual(referral_1.REFERRAL_DEFAULTS);
        expect(referral_1.REFERRAL_DEFAULTS.rewardDays).toBe(referral_1.REFERRAL_REWARD_DAYS);
    });
    it('читает заданные значения', () => {
        const cfg = (0, referral_1.referralConfigFromData)({
            referral_reward_days: 14,
            referral_max_claims_month: 50,
            referral_max_claims_day: 5,
        });
        expect(cfg).toEqual({ rewardDays: 14, maxClaimsPerMonth: 50, maxClaimsPerDay: 5 });
    });
    it('мусор/нечисло → дефолт по полю (не роняет)', () => {
        const cfg = (0, referral_1.referralConfigFromData)({ referral_reward_days: 'seven', referral_max_claims_day: NaN });
        expect(cfg.rewardDays).toBe(referral_1.REFERRAL_DEFAULTS.rewardDays);
        expect(cfg.maxClaimsPerDay).toBe(referral_1.REFERRAL_DEFAULTS.maxClaimsPerDay);
    });
    it('отрицательные клампятся: rewardDays к минимуму 1, капы к 0 (не уходят в минус)', () => {
        const cfg = (0, referral_1.referralConfigFromData)({ referral_reward_days: -10, referral_max_claims_day: -3 });
        expect(cfg.rewardDays).toBe(1); // min=1: 0 дней = бессмысленная награда
        expect(cfg.maxClaimsPerDay).toBe(0);
    });
});
describe('isSnapshotMigrationWrite — миграция снапшота НЕ должна квалифицировать реферал', () => {
    // Дыра: progressMigrateSnapshot доверяет клиентскому lesson1_pass_count и пишет его серверно
    // (progress_events.ts buildMigrationPatch) → раньше это срабатывало как «урок пройден» и
    // выдавало 7 дней без реального прохождения. Отличаем миграцию по полю progressMigratedAt.
    it('true когда появился/изменился progressMigratedAt (это миграция, не живое событие урока)', () => {
        expect((0, referral_1.isSnapshotMigrationWrite)(undefined, { progressMigratedAt: 111 })).toBe(true);
        expect((0, referral_1.isSnapshotMigrationWrite)({ progressMigratedAt: 100 }, { progressMigratedAt: 222 })).toBe(true);
    });
    it('false для обычного живого события урока (progressMigratedAt не менялся)', () => {
        expect((0, referral_1.isSnapshotMigrationWrite)({ progressMigratedAt: 100 }, { progressMigratedAt: 100 })).toBe(false);
        expect((0, referral_1.isSnapshotMigrationWrite)({ lesson1_pass_count: '0' }, { lesson1_pass_count: '1' })).toBe(false);
        expect((0, referral_1.isSnapshotMigrationWrite)(undefined, { lesson1_pass_count: '1' })).toBe(false);
        expect((0, referral_1.isSnapshotMigrationWrite)(undefined, {})).toBe(false);
    });
});
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1700000000000; // фиксированный «сейчас» для детерминизма
describe('hasCompletedFirstLesson — квалификация = РЕАЛЬНО пройден урок 1, не «открыт»', () => {
    it('false для пустого/отсутствующего прогресса', () => {
        expect((0, referral_1.hasCompletedFirstLesson)(undefined)).toBe(false);
        expect((0, referral_1.hasCompletedFirstLesson)({})).toBe(false);
    });
    // C2: «открыт урок 2» НЕ значит «пройден урок 1». Premium/intro-триал/сдача зачёта
    // открывают уроки без прохождения — это НЕ должно квалифицировать друга.
    it('false когда урок 2 лишь ОТКРЫТ, но урок 1 не пройден (premium/intro/exam-unlock)', () => {
        expect((0, referral_1.hasCompletedFirstLesson)({ unlocked_lessons: '[1,2,3]' })).toBe(false);
        expect((0, referral_1.hasCompletedFirstLesson)({ unlocked_lessons: JSON.stringify([1, 2]) })).toBe(false);
        // весь уровень открыт премиумом — но ни одного pass_count
        const premiumUnlockAll = { unlocked_lessons: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]) };
        expect((0, referral_1.hasCompletedFirstLesson)(premiumUnlockAll)).toBe(false);
    });
    it('true когда урок 1 реально пройден (EN: lesson1_pass_count >= 1)', () => {
        expect((0, referral_1.hasCompletedFirstLesson)({ lesson1_pass_count: '1' })).toBe(true);
        expect((0, referral_1.hasCompletedFirstLesson)({ lesson1_pass_count: '3', unlocked_lessons: '[1,2]' })).toBe(true);
    });
    it('false когда pass_count нулевой/мусорный', () => {
        expect((0, referral_1.hasCompletedFirstLesson)({ lesson1_pass_count: '0' })).toBe(false);
        expect((0, referral_1.hasCompletedFirstLesson)({ lesson1_pass_count: 'abc' })).toBe(false);
    });
    // C3: французский курс пишет scoped-ключ. Раньше триггер его не видел → fr никогда не квалифицировался.
    it('true когда урок 1 пройден на ФРАНЦУЗСКОМ (scoped key lesson_progress_v2::fr::lesson1_pass_count)', () => {
        expect((0, referral_1.hasCompletedFirstLesson)({ 'lesson_progress_v2::fr::lesson1_pass_count': '1' })).toBe(true);
    });
    it('false когда на fr урок 2 лишь открыт, но урок 1 не пройден', () => {
        expect((0, referral_1.hasCompletedFirstLesson)({ 'lesson_progress_v2::fr::unlocked_lessons': '[1,2]' })).toBe(false);
    });
    it('поддерживает number и string значения pass_count', () => {
        expect((0, referral_1.hasCompletedFirstLesson)({ lesson1_pass_count: 1 })).toBe(true);
        expect((0, referral_1.hasCompletedFirstLesson)({ lesson1_pass_count: 0 })).toBe(false);
    });
});
describe('referralApply new-account gate — регрессия: существующий аккаунт не принимает код', () => {
    const MAX_AGE = 72 * 60 * 60 * 1000;
    it('считает аккаунт старым по created_at в разных форматах', () => {
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: NOW - MAX_AGE - 1 }, NOW, MAX_AGE)).toBe(true);
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: String(NOW - MAX_AGE - 1) }, NOW, MAX_AGE)).toBe(true);
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: { toMillis: () => NOW - MAX_AGE - 1 } }, NOW, MAX_AGE)).toBe(true);
    });
    it('считает аккаунт старым по createTime документа (метаданные Firestore, клиент не подделает)', () => {
        // created_at «свежий» (клиент мог переписать) — но createTime дока старый → отказ.
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: NOW - 1000 }, NOW, MAX_AGE, NOW - MAX_AGE - 1)).toBe(true);
        // Оба свежие → ок.
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: NOW - 1000 }, NOW, MAX_AGE, NOW - 1000)).toBe(false);
        // createTime свежий, но created_at старый (merge перенёс старую личность) → отказ.
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: NOW - MAX_AGE - 1 }, NOW, MAX_AGE, NOW - 1000)).toBe(true);
    });
    it('УЧЕБНАЯ АКТИВНОСТЬ больше НЕ отсекает свежий аккаунт (фикс воронки 2026-07-04): друг мог пройти урок 1 до ввода кода', () => {
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: NOW - 1000, progress: { user_total_xp: '150', lesson1_pass_count: '1' } }, NOW, MAX_AGE, NOW - 1000)).toBe(false);
        // Без created_at и без createTime (док ещё не создан толком) — не отсекаем.
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ progress: { user_total_xp: '10' } }, NOW, MAX_AGE)).toBe(false);
    });
    it('разрешает свежий пустой аккаунт без учебной активности', () => {
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: NOW - 1000, progress: {} }, NOW, MAX_AGE)).toBe(false);
    });
    it('maxAccountAgeMs=0 полностью выключает проверку', () => {
        expect((0, referral_1.isReferralAccountTooEstablishedForApply)({ created_at: NOW - MAX_AGE * 10 }, NOW, 0, NOW - MAX_AGE * 10)).toBe(false);
    });
});
describe('hasLiveFirstLessonPass — live-маркер урока 1 (квалификация при apply)', () => {
    it('true по en и fr live-маркерам', () => {
        expect((0, referral_1.hasLiveFirstLessonPass)({ lesson1_pass_live: '1' })).toBe(true);
        expect((0, referral_1.hasLiveFirstLessonPass)({ 'lesson_progress_v2::fr::lesson1_pass_live': '1' })).toBe(true);
    });
    it('false без маркера — голому lesson1_pass_count не доверяем (мог прийти миграцией)', () => {
        expect((0, referral_1.hasLiveFirstLessonPass)(undefined)).toBe(false);
        expect((0, referral_1.hasLiveFirstLessonPass)({})).toBe(false);
        expect((0, referral_1.hasLiveFirstLessonPass)({ lesson1_pass_count: '3' })).toBe(false);
        expect((0, referral_1.hasLiveFirstLessonPass)({ lesson1_pass_live: '' })).toBe(false);
        expect((0, referral_1.hasLiveFirstLessonPass)({ lesson1_pass_live: '0' })).toBe(false);
    });
});
describe('referralListMyInvites display names — регрессия: не показываем технический stableId вместо имени', () => {
    it('берёт реальное имя из progress.user_name раньше provider displayName', () => {
        expect((0, referral_1.referralDisplayNameFromUserData)({
            displayName: 'Google Name',
            progress: { user_name: 'Roma' },
        })).toBe('Roma');
    });
    it('использует displayName/name, если user_name нет', () => {
        expect((0, referral_1.referralDisplayNameFromUserData)({ displayName: 'Alice' })).toBe('Alice');
        expect((0, referral_1.referralDisplayNameFromUserData)({ name: 'Bob' })).toBe('Bob');
    });
    it('фильтрует автогенерированные placeholder-имена и чистит пробелы', () => {
        expect((0, referral_1.cleanReferralDisplayName)('  Maria   Stone  ')).toBe('Maria Stone');
        expect((0, referral_1.cleanReferralDisplayName)('User 12345')).toBe('');
        expect((0, referral_1.cleanReferralDisplayName)('Друг #ABC123')).toBe('');
        expect((0, referral_1.referralDisplayNameFromUserData)({
            displayName: 'User 777',
            progress: { user_name: 'Friend 1234' },
        })).toBeNull();
    });
});
describe('vipUntilFromProgress', () => {
    it('returns 0 for empty/missing progress', () => {
        expect((0, referral_1.vipUntilFromProgress)(undefined)).toBe(0);
        expect((0, referral_1.vipUntilFromProgress)({})).toBe(0);
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: '0' })).toBe(0);
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: 'abc' })).toBe(0);
    });
    it('parses numeric and string ms', () => {
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: NOW })).toBe(NOW);
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: String(NOW) })).toBe(NOW);
    });
    it('falls back to legacy vip_expiry when vip_until absent', () => {
        expect((0, referral_1.vipUntilFromProgress)({ vip_expiry: NOW })).toBe(NOW);
    });
    it('prefers vip_until over vip_expiry', () => {
        expect((0, referral_1.vipUntilFromProgress)({ vip_until: NOW, vip_expiry: 1 })).toBe(NOW);
    });
});
describe('stackVipUntilMs — «копить на потом»', () => {
    it('grants 7 days from now when no existing VIP window', () => {
        expect((0, referral_1.stackVipUntilMs)(0, NOW, 7)).toBe(NOW + 7 * DAY);
    });
    it('stacks on top of a future VIP window (does not burn existing days)', () => {
        const existing = NOW + 3 * DAY; // ещё 3 дня осталось
        // ключевой инвариант: новые 7 дней добавляются к концу, итого 10 дней от now
        expect((0, referral_1.stackVipUntilMs)(existing, NOW, 7)).toBe(NOW + 10 * DAY);
    });
    it('treats an expired window as if starting from now', () => {
        const expired = NOW - 5 * DAY;
        expect((0, referral_1.stackVipUntilMs)(expired, NOW, 7)).toBe(NOW + 7 * DAY);
    });
    it('is associative across multiple friends claimed in one call', () => {
        // 3 друга подряд → 21 день от now
        let until = 0;
        for (let i = 0; i < 3; i += 1)
            until = (0, referral_1.stackVipUntilMs)(until, NOW, 7);
        expect(until).toBe(NOW + 21 * DAY);
    });
    it('stacking already-active referral window keeps accumulating', () => {
        // первый клик дал 7 дней; ещё один друг qualified → +7 = 14 дней
        const afterFirst = (0, referral_1.stackVipUntilMs)(0, NOW, 7); // NOW + 7d
        // второй клик чуть позже (now+1h), окно ещё открыто → стакаем к концу
        const later = NOW + 60 * 60 * 1000;
        expect((0, referral_1.stackVipUntilMs)(afterFirst, later, 7)).toBe(afterFirst + 7 * DAY);
    });
    it('ignores negative/zero day grants safely', () => {
        expect((0, referral_1.stackVipUntilMs)(0, NOW, 0)).toBe(NOW);
        expect((0, referral_1.stackVipUntilMs)(0, NOW, -5)).toBe(NOW);
    });
    it('grants 7 days to the invited friend and 7 separate days to the referrer', () => {
        const referee = (0, referral_1.buildReferralVipProgressPatch)(undefined, NOW, referral_1.REFERRAL_REWARD_DAYS, 'referee');
        const referrer = (0, referral_1.buildReferralVipProgressPatch)(undefined, NOW, referral_1.REFERRAL_REWARD_DAYS, 'referrer');
        expect(referee.vip_until).toBe(String(NOW + 7 * DAY));
        expect(referrer.vip_until).toBe(String(NOW + 7 * DAY));
        expect(referee.referral_vip_last_source).toBe('referee');
        expect(referrer.referral_vip_last_source).toBe('referrer');
    });
    it('keeps 7+7 as two people, not 14 days on one clean account', () => {
        const referee = (0, referral_1.buildReferralVipProgressPatch)(undefined, NOW, referral_1.REFERRAL_REWARD_DAYS, 'referee');
        expect(referee.vip_until).not.toBe(String(NOW + 14 * DAY));
    });
});
//# sourceMappingURL=referral.test.js.map