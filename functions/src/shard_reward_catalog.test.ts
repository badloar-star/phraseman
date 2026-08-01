import {
  SHARD_EARN_DAILY_TOTAL_MAX,
  applyShardEarnBudget,
  emptyShardEarnDailyCounter,
  resolveShardEarnPolicy,
  utcShardEarnDayKey,
  type ShardEarnPolicy,
} from './shard_reward_catalog';

// Новая экономика (план docs/plans/2026-07-20-coins-stars-economy-plan.ru.md,
// §5–§7): монеты НЕ фармятся — только покупка и +1 за подтверждённый репорт
// (оба пути вне этого каталога). Все gameplay-варианты каталога обнулены,
// поэтому resolveShardEarnPolicy обязан отклонять КАЖДЫЙ client-initiated earn.

describe('generic shard earn compatibility catalog (zeroed by 2026-07-20 economy)', () => {
  it.each([
    ['lesson_first', 1],
    ['lesson_perfect', 2],
    ['lesson_quiz_passed', 1],
    ['lesson_completed', 1],
    ['streak_7', 3],
    ['streak_30', 5],
    ['arena_win', 1],
    ['arena_10_wins', 1],
    ['arena_rank_up_streak', 1],
    ['daily_tasks_all', 1],
    ['topic_completed', 3],
    ['exam_excellent', 3],
    ['diagnostic_test', 1],
    ['lessons_5_perfect', 3],
    ['preposition_drill_perfect', 1],
    ['plan_day_complete', 2],
    ['trainer_perfect_session', 1],
    ['achievement:streak_7', 1],
    ['achievement:anything', 1],
    ['boon_comeback', 5],
    ['boon_perfect_week', 20],
    ['level_gift', 3],
    ['level_premium_gift', 20],
    ['streak_wager_win', 60],
    ['global_broadcast_modal', 30],
    ['boon_mystery_monday', 15],
    ['unknown_dynamic_reward', 1],
    ['shards_store_purchase', 500],
    ['release_wave_bonus', 30],
    ['survey_completed', 3],
  ] as const)('rejects client-initiated earn %s=%d (coins are purchase-only now)', (reason, delta) => {
    expect(resolveShardEarnPolicy(reason, delta)).toBeNull();
  });

  it.each([
    'toString',
    'constructor',
    '__proto__',
  ])('controlled-rejects inherited object key %s', (reason) => {
    expect(resolveShardEarnPolicy(reason, 1)).toBeNull();
  });

  it('rejects non-positive amounts even for known reasons', () => {
    expect(resolveShardEarnPolicy('lesson_first', 0)).toBeNull();
    expect(resolveShardEarnPolicy('lesson_first', -5)).toBeNull();
    expect(resolveShardEarnPolicy('lesson_first', 1.5)).toBeNull();
  });
});

describe('generic shard earn UTC-day budgets', () => {
  // Бюджетный движок не зависит от каталога: проверяем его синтетической
  // политикой, потому что все реальные gameplay-политики обнулены.
  const syntheticPolicy: ShardEarnPolicy = Object.freeze({
    reasonKey: 'lesson_first',
    amount: 1,
    perSourceDailyMax: 128,
  });

  it('bounds earn operations by both source and total policy', () => {
    const policy = syntheticPolicy;
    let counter = emptyShardEarnDailyCounter('2026-07-18');
    let granted = 0;
    for (let index = 0; index < 1000; index += 1) {
      const outcome = applyShardEarnBudget(counter, policy, false);
      if (!outcome.allowed) continue;
      counter = outcome.counter;
      granted += policy.amount;
    }

    expect(granted).toBe(policy.perSourceDailyMax);
    expect(granted).toBeLessThanOrEqual(SHARD_EARN_DAILY_TOTAL_MAX);
  });

  it('does not consume source or total budget for an exact receipt retry', () => {
    const policy = syntheticPolicy;
    const full = {
      dayKey: '2026-07-18',
      totalEarned: SHARD_EARN_DAILY_TOTAL_MAX,
      bySource: { [policy.reasonKey]: policy.perSourceDailyMax },
    };

    expect(applyShardEarnBudget(full, policy, true)).toEqual({
      allowed: true,
      counted: false,
      counter: full,
    });
  });

  it('isolates counters across owners and UTC days', () => {
    const policy = syntheticPolicy;
    const ownerADay1 = applyShardEarnBudget(
      emptyShardEarnDailyCounter('2026-07-18'),
      policy,
      false,
    );
    const ownerBDay1 = applyShardEarnBudget(
      emptyShardEarnDailyCounter('2026-07-18'),
      policy,
      false,
    );
    const ownerADay2 = applyShardEarnBudget(
      emptyShardEarnDailyCounter('2026-07-19'),
      policy,
      false,
    );

    expect(ownerADay1.allowed).toBe(true);
    expect(ownerBDay1.allowed).toBe(true);
    expect(ownerADay2.allowed).toBe(true);
    expect(utcShardEarnDayKey(Date.UTC(2026, 6, 18, 23, 59, 59))).toBe('2026-07-18');
    expect(utcShardEarnDayKey(Date.UTC(2026, 6, 19, 0, 0, 0))).toBe('2026-07-19');
  });
});
