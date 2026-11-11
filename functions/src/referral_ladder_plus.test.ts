// зачем (лесенка C): сторож условий Plus за приглашённых — пройденный урок, «другое устройство» по хэшу push-токена,
// не чаще раза в 30 дней. Транзакции — отдельно.
import {
  LADDER_PLUS_COOLDOWN_MS,
  decideLadderPlusEligibility,
  ladderPlusClaim,
  ladderPushTokenHash,
} from './referral_ladder_plus';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 2, 10, 0);

describe('лесенка C — засчитывается ли друг для Plus', () => {
  const lessonsDone = { lessons_completed: 5 };
  const h = (s: string) => ladderPushTokenHash(s);

  it('хэш токена: без сырого токена, пустое → null', () => {
    expect(h('ExponentPushToken[abc]')).toMatch(/^[0-9a-f]{32}$/);
    expect(h('  ExponentPushToken[abc] ')).toBe(h('ExponentPushToken[abc]'));
    expect(ladderPushTokenHash('')).toBeNull();
    expect(ladderPushTokenHash(undefined)).toBeNull();
  });

  it('то же устройство (текущий токен или токен при вводе кода) — навсегда не для Plus', () => {
    expect(decideLadderPlusEligibility({ refereeProgress: lessonsDone, refereeLessonsCompleted: 5, refereeTokenHash: h('A'), refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'not_eligible', reason: 'same_device' });
    expect(decideLadderPlusEligibility({ refereeProgress: lessonsDone, refereeLessonsCompleted: 5, refereeTokenHash: h('B'), refereeApplyTokenHash: h('A'), referrerTokenHash: h('A') }).status)
      .toBe('not_eligible');
  });

  // зачем (слово владельца 06.11): Plus за друга — один пройденный урок.
  it('нет уроков — ждём; один обычный урок и разные токены — засчитан', () => {
    expect(decideLadderPlusEligibility({ refereeProgress: {}, refereeLessonsCompleted: 0, refereeTokenHash: h('B'), refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'waiting', reason: 'lesson_missing' });
    expect(decideLadderPlusEligibility({ refereeProgress: { lessons_completed: 1 }, refereeLessonsCompleted: 1, refereeTokenHash: h('B'), refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'eligible', reason: 'lesson_device_different' });
  });

  it('токена нет у кого-то — «неизвестно», засчитан по уроку (решение координатора 29.10)', () => {
    expect(decideLadderPlusEligibility({ refereeProgress: {}, refereeLessonsCompleted: 1, refereeTokenHash: null, refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'eligible', reason: 'lesson_device_unknown' });
    expect(decideLadderPlusEligibility({ refereeProgress: {}, refereeLessonsCompleted: 2, refereeTokenHash: h('B'), refereeApplyTokenHash: null, referrerTokenHash: null }))
      .toEqual({ status: 'eligible', reason: 'lesson_device_unknown' });
  });
});

describe('лесенка C — ступень Plus не чаще раза в 30 дней', () => {
  const base = { plusTierClaimed: 0, lastLadderPlusAtMs: 0, nowMs: T0, friendsPerTier: 3 };

  it('меньше 3 друзей для Plus — выдавать нечего', () => {
    expect(ladderPlusClaim({ ...base, plusEligibleTotal: 2 })).toMatchObject({ claimTier: null, reason: 'nothing_due', dueTiers: 0 });
  });

  it('3 друга, Plus ещё не было — первая ступень', () => {
    expect(ladderPlusClaim({ ...base, plusEligibleTotal: 3 })).toMatchObject({ claimTier: 1, reason: 'claim', dueTiers: 1 });
  });

  it('6 друзей, ступень 1 выдана 10 дней назад — ждём, ступень не теряется', () => {
    const r = ladderPlusClaim({ ...base, plusEligibleTotal: 6, plusTierClaimed: 1, lastLadderPlusAtMs: T0 - 10 * DAY });
    expect(r).toMatchObject({ claimTier: null, reason: 'cooldown', dueTiers: 2 });
    expect(r.cooldownLeftMs).toBe(LADDER_PLUS_COOLDOWN_MS - 10 * DAY);
  });

  it('после 30 дней — следующая ступень, по одной за раз', () => {
    expect(ladderPlusClaim({ ...base, plusEligibleTotal: 9, plusTierClaimed: 1, lastLadderPlusAtMs: T0 - 30 * DAY }))
      .toMatchObject({ claimTier: 2, reason: 'claim', dueTiers: 3 });
  });
});
