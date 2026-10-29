// зачем (лесенка C, решения владельца 29.10): сторож условий Plus за приглашённых — 2 серверных дня только с новой
// версии (голова курса), «другое устройство» по хэшу push-токена, не чаще раза в 30 дней. Транзакции — отдельно.
import {
  LADDER_PLUS_COOLDOWN_MS,
  LADDER_SERVER_DAY1_KEY,
  LADDER_SERVER_DAY2_KEY,
  LADDER_TRUSTED_COURSE_HEADS_V1,
  decideLadderPlusEligibility,
  hasTwoServerDays,
  isTrustedLadderCourseHead,
  ladderPlusClaim,
  ladderPushTokenHash,
  ladderSecondDayTransition,
  ladderServerDayPatch,
  utcDayNumber,
} from './referral_ladder_plus';

const EN_HEAD = LADDER_TRUSTED_COURSE_HEADS_V1.en[0];
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 2, 10, 0);

describe('лесенка C — метки серверных дней', () => {
  it('голова курса: только из списка и только для en/es', () => {
    expect(isTrustedLadderCourseHead('en', EN_HEAD)).toBe(true);
    expect(isTrustedLadderCourseHead('en', 'a'.repeat(64))).toBe(false);
    expect(isTrustedLadderCourseHead('fr', EN_HEAD)).toBe(false);
    expect(isTrustedLadderCourseHead('es', EN_HEAD)).toBe(false);
  });

  it('старая версия (чужая голова) метку не получает', () => {
    expect(ladderServerDayPatch({ progress: {}, nowMs: T0, targetLanguage: 'en', activeHeadFingerprint: 'b'.repeat(64) }))
      .toEqual({ patch: null, reason: 'untrusted_head', day: utcDayNumber(T0) });
  });

  it('первый итог → день 1; тот же день → ничего; другой день → день 2; дальше — ничего', () => {
    const first = ladderServerDayPatch({ progress: {}, nowMs: T0, targetLanguage: 'en', activeHeadFingerprint: EN_HEAD });
    expect(first).toEqual({ patch: { [LADDER_SERVER_DAY1_KEY]: String(utcDayNumber(T0)) }, reason: 'day1_set', day: utcDayNumber(T0) });
    const p1 = { ...first.patch };
    expect(ladderServerDayPatch({ progress: p1, nowMs: T0 + 3600_000, targetLanguage: 'en', activeHeadFingerprint: EN_HEAD }).reason)
      .toBe('same_day');
    const second = ladderServerDayPatch({ progress: p1, nowMs: T0 + DAY, targetLanguage: 'en', activeHeadFingerprint: EN_HEAD });
    expect(second.patch).toEqual({ [LADDER_SERVER_DAY2_KEY]: String(utcDayNumber(T0 + DAY)) });
    const p2 = { ...p1, ...second.patch };
    expect(ladderServerDayPatch({ progress: p2, nowMs: T0 + 5 * DAY, targetLanguage: 'en', activeHeadFingerprint: EN_HEAD }).reason)
      .toBe('already_two_days');
    expect(hasTwoServerDays(p1)).toBe(false);
    expect(hasTwoServerDays(p2)).toBe(true);
  });

  it('переход второго дня — только 1 → 2 дня; мусор в метках не считается', () => {
    const d1 = { [LADDER_SERVER_DAY1_KEY]: '20000' };
    const d2 = { ...d1, [LADDER_SERVER_DAY2_KEY]: '20001' };
    expect(ladderSecondDayTransition(d1, d2)).toBe(true);
    expect(ladderSecondDayTransition(d2, d2)).toBe(false);
    expect(ladderSecondDayTransition(undefined, { [LADDER_SERVER_DAY1_KEY]: 'x', [LADDER_SERVER_DAY2_KEY]: '20001' })).toBe(false);
    // склейка аккаунтов (max по ключу) может дать day1 > day2 — дни всё равно разные
    expect(hasTwoServerDays({ [LADDER_SERVER_DAY1_KEY]: '20005', [LADDER_SERVER_DAY2_KEY]: '20001' })).toBe(true);
    expect(hasTwoServerDays({ [LADDER_SERVER_DAY1_KEY]: '20001', [LADDER_SERVER_DAY2_KEY]: '20001' })).toBe(false);
  });
});

describe('лесенка C — засчитывается ли друг для Plus', () => {
  const twoDays = { [LADDER_SERVER_DAY1_KEY]: '20000', [LADDER_SERVER_DAY2_KEY]: '20002' };
  const h = (s: string) => ladderPushTokenHash(s);

  it('хэш токена: без сырого токена, пустое → null', () => {
    expect(h('ExponentPushToken[abc]')).toMatch(/^[0-9a-f]{32}$/);
    expect(h('  ExponentPushToken[abc] ')).toBe(h('ExponentPushToken[abc]'));
    expect(ladderPushTokenHash('')).toBeNull();
    expect(ladderPushTokenHash(undefined)).toBeNull();
  });

  it('то же устройство (текущий токен или токен при вводе кода) — навсегда не для Plus', () => {
    expect(decideLadderPlusEligibility({ refereeProgress: twoDays, refereeTokenHash: h('A'), refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'not_eligible', reason: 'same_device' });
    expect(decideLadderPlusEligibility({ refereeProgress: twoDays, refereeTokenHash: h('B'), refereeApplyTokenHash: h('A'), referrerTokenHash: h('A') }).status)
      .toBe('not_eligible');
  });

  it('нет второго дня — ждём; два дня и разные токены — засчитан', () => {
    expect(decideLadderPlusEligibility({ refereeProgress: {}, refereeTokenHash: h('B'), refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'waiting', reason: 'days_missing' });
    expect(decideLadderPlusEligibility({ refereeProgress: twoDays, refereeTokenHash: h('B'), refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'eligible', reason: 'two_days_device_different' });
  });

  it('токена нет у кого-то — «неизвестно», засчитан по двум дням (решение координатора 29.10)', () => {
    expect(decideLadderPlusEligibility({ refereeProgress: twoDays, refereeTokenHash: null, refereeApplyTokenHash: null, referrerTokenHash: h('A') }))
      .toEqual({ status: 'eligible', reason: 'two_days_device_unknown' });
    expect(decideLadderPlusEligibility({ refereeProgress: twoDays, refereeTokenHash: h('B'), refereeApplyTokenHash: null, referrerTokenHash: null }))
      .toEqual({ status: 'eligible', reason: 'two_days_device_unknown' });
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
