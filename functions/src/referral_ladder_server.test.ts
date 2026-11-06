// зачем (владелец 29.10, лесенка приглашений): сторож чистой части серверной лесенки — флаг, счётчики, ответ списка,
// переход «первый урок», формат истории. Транзакция засчитывания проверяется эмулятором отдельно.
import { buildAccessProjection } from './access_projection';
import {
  ladderLessonTransition,
  ladderLogId,
  ladderMonthKey,
  ladderSummary,
  readLadderStats,
  referralLadderEnabledFromData,
  referralLadderStoryValue,
} from './referral_ladder_server';

describe('referral_ladder_server — чистая часть', () => {
  it('флаг: bools как у клиента, numbers — запасной, дефолт выкл', () => {
    expect(referralLadderEnabledFromData(undefined)).toBe(false);
    expect(referralLadderEnabledFromData({ bools: {} })).toBe(false);
    expect(referralLadderEnabledFromData({ bools: { referral_ladder_enabled: true } })).toBe(true);
    expect(referralLadderEnabledFromData({ bools: { referral_ladder_enabled: 'true' } })).toBe(false);
    expect(referralLadderEnabledFromData({ numbers: { referral_ladder_enabled: true } })).toBe(true);
  });

  it('месяц — UTC', () => {
    expect(ladderMonthKey(Date.UTC(2026, 10, 30, 23, 59))).toBe('2026-11');
    expect(ladderMonthKey(Date.UTC(2026, 11, 1, 0, 0))).toBe('2026-12');
  });

  it('счётчики: мусор → нули, чужие ключи месяцев отброшены', () => {
    const zero = { plusEligibleTotal: 0, plusTierClaimed: 0, lastLadderPlusAtMs: 0 };
    expect(readLadderStats(undefined)).toEqual({ countedTotal: 0, months: {}, plusTiersGranted: 0, ...zero });
    expect(readLadderStats({ countedTotal: '4', months: { '2026-11': 4, bad: 9 }, plusTiersGranted: -1 }))
      .toEqual({ countedTotal: 4, months: { '2026-11': 4 }, plusTiersGranted: 0, ...zero });
    expect(readLadderStats({ plusEligibleTotal: '5', plusTierClaimed: 1, lastLadderPlusAtMs: 1700000000000 }))
      .toMatchObject({ plusEligibleTotal: 5, plusTierClaimed: 1, lastLadderPlusAtMs: 1700000000000 });
  });

  it('ответ списка (контракт с Дизайном): Plus — реально выданные ступени (лесенка C), месячный счётчик текущего месяца', () => {
    const now = Date.UTC(2026, 10, 15);
    // 7 друзей за монеты, но Plus выдан один раз: остальные не прошли проверки или ждут 30 дней
    expect(ladderSummary(readLadderStats({ countedTotal: 7, plusTiersGranted: 1, months: { '2026-10': 4, '2026-11': 3 } }), now)).toEqual({
      countedFriends: 7, plusGrants: 1, coinsPerFriend: 500, plusDaysPerGrant: 14, friendsPerGrant: 3,
      monthCounted: 3, monthlyCap: 10, lessonWindowDays: 30,
    });
  });

  it('первый урок: только переход 0 → ≥1, любой курс', () => {
    expect(ladderLessonTransition({}, { lessons_completed: 1 })).toBe(true);
    expect(ladderLessonTransition(undefined, { learning_v2_course_progress_sync_v1: '1' })).toBe(true);
    expect(ladderLessonTransition({}, { 'learning_v2_course_progress_sync_v1:target:es': '1' })).toBe(true);
    expect(ladderLessonTransition({ lessons_completed: 1 }, { lessons_completed: 2 })).toBe(false);
    expect(ladderLessonTransition({}, { xp: 10 })).toBe(false);
  });

  it('история: JSON v1 без uid; лог-id без сырого uid', () => {
    const story = JSON.parse(referralLadderStoryValue({ role: 'referrer', coins: 500, plusDays: 14, friendNumber: 3, atMs: 1 }));
    expect(story).toEqual({ v: 1, kind: 'ladder', role: 'referrer', coins: 500, plusDays: 14, friendNumber: 3, atMs: 1 });
    expect(ladderLogId('SomeStableUid123')).toMatch(/^[0-9a-f]{10}$/);
  });

  it('история доходит до телефона через проекцию доступа; нет истории — нет поля', () => {
    const story = referralLadderStoryValue({ role: 'referee', coins: 500, plusDays: 0, friendNumber: 1, atMs: 5 });
    expect(buildAccessProjection({ referral_last_reward: story }, 10).referralLastReward).toBe(story);
    expect('referralLastReward' in buildAccessProjection({}, 10)).toBe(false);
  });
});

// зачем (слово владельца 06.11): Plus за друга — один пройденный урок любого курса (источник тот же, что у монет)
describe('лесенка C — Plus за друга по одному уроку', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { decideLadderPlusEligibility, ladderPushTokenHash } = require('./referral_ladder_plus') as typeof import('./referral_ladder_plus');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { contestLessonsCompleted } = require('./community_month_tally') as typeof import('./community_month_tally');
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');

  const decide = (progress: Record<string, unknown>) => decideLadderPlusEligibility({
    refereeProgress: progress,
    refereeLessonsCompleted: contestLessonsCompleted(progress),
    refereeTokenHash: ladderPushTokenHash('ExponentPushToken[B]'),
    refereeApplyTokenHash: null,
    referrerTokenHash: ladderPushTokenHash('ExponentPushToken[A]'),
  });

  it('обычный «старый» урок засчитывает друга для Plus (V2 и два дня не нужны)', () => {
    expect(decide({ lessons_completed: 1 })).toMatchObject({ status: 'eligible', reason: 'lesson_device_different' });
    expect(decide({ completed_lessons: ['l1'] })).toMatchObject({ status: 'eligible' });
  });

  it('без уроков друг ждёт (waiting / lesson_missing), с первым уроком переход 0 → ≥1 запускает пересчёт', () => {
    expect(decide({})).toEqual({ status: 'waiting', reason: 'lesson_missing' });
    expect(ladderLessonTransition({}, { lessons_completed: 1 })).toBe(true);
  });

  it('ждавшие друзья пересчитываются при заходе пригласившего: запрос waiting, до 5, с журналом [REFERRAL-PLUS]', () => {
    const src = fs.readFileSync(path.join(__dirname, 'referral_ladder_server.ts'), 'utf8');
    expect(src).toContain(".where('ladderPlus', '==', 'waiting')");
    expect(src).toContain('.limit(5)');
    expect(src).toContain("step: 'recount_waiting'");
    expect(src).toContain("processLadderPlusEligibility(db, doc.id, 'list_retry')");
    expect(src).toContain("'[REFERRAL-PLUS]'");
    expect(src).toContain("source: 'contestLessonsCompleted'");
  });
});
