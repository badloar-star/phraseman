// зачем (владелец 29.10 + защита координатора): сторож правил лесенки приглашений — кто засчитывается и за что Plus.
import { plusGrantLedgerId } from './plus_grant';
import {
  LADDER_LESSON_WINDOW_MS,
  LADDER_MAX_FRIENDS_PER_MONTH,
  decideReferralLadder,
  ladderCoinsOpId,
  ladderPlusGrantKey,
  type LadderInput,
} from './referral_ladder';

const HOUR = 60 * 60 * 1000;
const APPLIED = Date.UTC(2026, 10, 3, 12);
const base = (over: Partial<LadderInput> = {}): LadderInput => ({
  referrerUid: 'refA', refereeUid: 'friendB', referrerInstallationId: 'inst-1', refereeInstallationId: 'inst-2',
  appliedAtMs: APPLIED, refereeCreatedAtMs: APPLIED - HOUR, refereeLessonsCompleted: 1, lessonAtMs: APPLIED + 2 * HOUR,
  alreadyCounted: false, referrerCountedThisMonth: 0, referrerCountedTotal: 0, ...over,
});

describe('лесенка: кто засчитывается', () => {
  it('свежий аккаунт, урок пройден → 500 монет обоим, первый друг', () => {
    expect(decideReferralLadder(base())).toEqual({ ok: true, coinsEach: 500, friendNumber: 1, plusTier: null, plusDays: 0 });
  });
  it('каждый 3-й засчитанный друг → Plus 14 дней (3 → ступень 1, 6 → ступень 2)', () => {
    expect(decideReferralLadder(base({ referrerCountedTotal: 2 }))).toMatchObject({ ok: true, friendNumber: 3, plusTier: 1, plusDays: 14 });
    expect(decideReferralLadder(base({ referrerCountedTotal: 4 }))).toMatchObject({ ok: true, friendNumber: 5, plusTier: null });
    expect(decideReferralLadder(base({ referrerCountedTotal: 5 }))).toMatchObject({ ok: true, friendNumber: 6, plusTier: 2, plusDays: 14 });
  });
  it.each([
    ['сам себя (тот же uid)', { refereeUid: 'refA' }, 'self_referral'],
    ['то же устройство', { refereeInstallationId: 'inst-1' }, 'same_installation'],
    ['старый аккаунт (создан за 31 сутки до ввода кода)', { refereeCreatedAtMs: APPLIED - 31 * 24 * HOUR }, 'account_not_fresh'],
    ['возраст аккаунта неизвестен', { refereeCreatedAtMs: null }, 'account_age_unknown'],
    ['урок не пройден', { refereeLessonsCompleted: 0 }, 'no_lesson'],
    ['урок позже 30 дней', { lessonAtMs: APPLIED + LADDER_LESSON_WINDOW_MS + 1 }, 'lesson_window_expired'],
    ['уже засчитан', { alreadyCounted: true }, 'already_counted'],
    ['лимит 10 в месяц', { referrerCountedThisMonth: LADDER_MAX_FRIENDS_PER_MONTH }, 'monthly_cap'],
  ] as const)('отказ: %s', (_label, over, reason) => {
    expect(decideReferralLadder(base(over as Partial<LadderInput>))).toMatchObject({ ok: false, reason });
  });
  it('устройство неизвестно у одного из двух — не повод отказать', () => {
    expect(decideReferralLadder(base({ refereeInstallationId: null })).ok).toBe(true);
  });
  it('ключ ступени Plus проходит журнал выдачи', () => {
    expect(plusGrantLedgerId(ladderPlusGrantKey('refA', 2))).toBe('referral_ladder__refA_tier2');
  });
  it('ключ монет проходит формат журнала монет и не несёт сырых uid', () => {
    const OP_ID_RE = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/;
    const a = ladderCoinsOpId('referrerStableUid_0123456789abcdef0123', 'refereeStableUid_0123456789abcdef0123', 'referrer');
    const b = ladderCoinsOpId('referrerStableUid_0123456789abcdef0123', 'refereeStableUid_0123456789abcdef0123', 'referee');
    expect(a).toMatch(OP_ID_RE);
    expect(b).toMatch(OP_ID_RE);
    expect(a).not.toBe(b);
    expect(a).not.toContain('referrerStableUid');
  });
  it('аккаунт, созданный за неделю до ввода кода, засчитывается (владелец 21.09: окно 30 дней)', () => {
    expect(decideReferralLadder(base({ refereeCreatedAtMs: APPLIED - 7 * 24 * HOUR })).ok).toBe(true);
  });
});
