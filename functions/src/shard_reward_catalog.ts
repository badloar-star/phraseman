export const SHARD_EARN_DAILY_COUNTERS_COLLECTION = 'shard_earn_daily_counters';

// ═══════════════════════════════════════════════════════════════════════════
// НОВАЯ ЭКОНОМИКА (план docs/plans/2026-07-20-coins-stars-economy-plan.ru.md,
// §5–§7): «Осколки» стали «Монетами» и больше НЕ фармятся — единственные
// источники монет: покупка за реальные деньги (RevenueCat, вне этого каталога)
// и ровно 1 монета за подтверждённый полезный репорт (начисляется через
// Admin V2 / applyReportStatusFix, тоже вне этого каталога). Вся учебная
// награда переехала в Звёзды (V2), обмен монет в звёзды — через серверную
// биржу (coin_exchange.ts).
//
// Поэтому ВСЕ gameplay-варианты ниже обнулены (amounts: [0]): любой
// client-initiated earn с положительной суммой отклоняется
// resolveShardEarnPolicy → shardsApplyDelta возвращает
// 'earn reason/amount is not in the server catalog'. Структура каталога,
// ключи и суточные капы намеренно сохранены (мёртвый, но безвредный код) —
// так проще вернуть конкретный источник отдельным решением, а клиентские
// reason-строки остаются задокументированными.
//
// ИСКЛЮЧЕНИЕ (решение владельца 2026-07-26): «+1 жемчужина за достижение» —
// см. ветку ACHIEVEMENT_REASON_RE в resolveShardEarnPolicy ниже.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Global compatibility ceiling for generic client-initiated earns.
 *
 * 1000 is deliberately above a legitimate heavy day:
 * - up to 128 first lesson completions,
 * - their perfect/quiz/completion bonuses,
 * - a large one-day achievement backlog,
 * - bounded arena/gift compatibility rewards.
 *
 * Per-source caps below are normally reached first. This total is the final
 * backstop until B2 replaces client-verifiable rewards with server evidence.
 */
export const SHARD_EARN_DAILY_TOTAL_MAX = 1000;

export type ShardEarnPolicy = Readonly<{
  reasonKey: string;
  amount: number;
  perSourceDailyMax: number;
}>;

export type ShardEarnDailyCounter = Readonly<{
  dayKey: string;
  totalEarned: number;
  bySource: Readonly<Record<string, number>>;
}>;

type CatalogEntry = Readonly<{
  amounts: readonly number[];
  perSourceDailyMax: number;
}>;

/**
 * Compatibility catalog for CURRENT generic client producers.
 *
 * Все суммы обнулены новой экономикой (см. шапку файла): записи оставлены как
 * реестр известных reason-ключей и их бывших суточных капов. Поскольку
 * resolveShardEarnPolicy отклоняет amount <= 0 и ни один обнулённый вариант не
 * совпадает с положительным requestedAmount, каждый gameplay earn отклоняется.
 */
const FIXED_REASON_CATALOG: Readonly<Record<string, CatalogEntry>> = Object.freeze({
  lesson_first: { amounts: [0], perSourceDailyMax: 128 },
  lesson_perfect: { amounts: [0], perSourceDailyMax: 256 },
  lesson_quiz_passed: { amounts: [0], perSourceDailyMax: 128 },
  lesson_completed: { amounts: [0], perSourceDailyMax: 128 },
  streak_7: { amounts: [0], perSourceDailyMax: 3 },
  streak_30: { amounts: [0], perSourceDailyMax: 5 },
  arena_win: { amounts: [0], perSourceDailyMax: 100 },
  arena_10_wins: { amounts: [0], perSourceDailyMax: 10 },
  arena_rank_up_streak: { amounts: [0], perSourceDailyMax: 20 },
  daily_tasks_all: { amounts: [0], perSourceDailyMax: 1 },
  topic_completed: { amounts: [0], perSourceDailyMax: 96 },
  exam_excellent: { amounts: [0], perSourceDailyMax: 3 },
  diagnostic_test: { amounts: [0], perSourceDailyMax: 1 },
  lessons_5_perfect: { amounts: [0], perSourceDailyMax: 60 },
  level_gift: { amounts: [0], perSourceDailyMax: 100 },
  preposition_drill_perfect: { amounts: [0], perSourceDailyMax: 32 },
  plan_day_complete: { amounts: [0], perSourceDailyMax: 32 },
  trainer_perfect_session: { amounts: [0], perSourceDailyMax: 20 },
  level_premium_gift: { amounts: [0], perSourceDailyMax: 100 },
  streak_wager_win: { amounts: [0], perSourceDailyMax: 60 },
  global_broadcast_modal: { amounts: [0], perSourceDailyMax: 30 },
  boon_comeback: { amounts: [0], perSourceDailyMax: 5 },
  boon_mystery_monday: { amounts: [0], perSourceDailyMax: 15 },
  boon_perfect_week: { amounts: [0], perSourceDailyMax: 20 },
});

const ACHIEVEMENT_REASON_RE = /^achievement:[A-Za-z0-9_-]{1,48}$/;

// зачем (2026-08-02): владелец 2026-07-26 вернул «+1 жемчужина за достижение»
// (app/achievements.ts → claimAchievementShardReward, коммит 17482fdfc), а каталог
// остался с полным запретом от 2026-07-21 (f6cc0859d). Из-за рассинхрона клиент
// начислял +1 локально, сервер отклонял синк — и жемчужина «испарялась» при
// следующей сверке баланса. Разрешаем РОВНО 1. Счётчик ведём под общим
// ключом-бакетом 'achievement': двоеточие в bySource-ключах отфильтровывает
// normalizeShardEarnDailyCounter, а разовость конкретного достижения и так
// гарантируют серверные receipts по стабильному opId клиента.
const ACHIEVEMENT_SHARD_AMOUNT = 1;
const ACHIEVEMENT_BUDGET_KEY = 'achievement';
// 200 покрывает полный бэклог из 194 достижений, забранных за один день.
const ACHIEVEMENT_DAILY_MAX = 200;

export function resolveShardEarnPolicy(
  reason: string,
  requestedAmount: number,
): ShardEarnPolicy | null {
  if (!Number.isSafeInteger(requestedAmount) || requestedAmount <= 0) return null;
  // Единственное живое исключение из обнулённого каталога — «+1 за достижение».
  if (ACHIEVEMENT_REASON_RE.test(reason)) {
    if (requestedAmount !== ACHIEVEMENT_SHARD_AMOUNT) return null;
    return {
      reasonKey: ACHIEVEMENT_BUDGET_KEY,
      amount: ACHIEVEMENT_SHARD_AMOUNT,
      perSourceDailyMax: ACHIEVEMENT_DAILY_MAX,
    };
  }
  // hasOwnProperty: 'toString'/'constructor'/'__proto__' — унаследованные ключи
  // Object.prototype, а не записи каталога; без гварда lookup возвращал
  // Object.prototype и падал на entry.amounts.
  if (!Object.prototype.hasOwnProperty.call(FIXED_REASON_CATALOG, reason)) return null;
  const entry = FIXED_REASON_CATALOG[reason];
  if (!entry || !entry.amounts.includes(requestedAmount)) return null;
  return {
    reasonKey: reason,
    amount: requestedAmount,
    perSourceDailyMax: entry.perSourceDailyMax,
  };
}

export function utcShardEarnDayKey(nowMs: number): string {
  const date = new Date(nowMs);
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_shard_earn_timestamp');
  return date.toISOString().slice(0, 10);
}

function readNonNegativeInteger(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

export function emptyShardEarnDailyCounter(dayKey: string): ShardEarnDailyCounter {
  return { dayKey, totalEarned: 0, bySource: {} };
}

export function normalizeShardEarnDailyCounter(
  dayKey: string,
  value: unknown,
): ShardEarnDailyCounter {
  const row = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const rawBySource = row.bySource && typeof row.bySource === 'object'
    && !Array.isArray(row.bySource)
    ? row.bySource as Record<string, unknown>
    : {};
  const bySource = Object.fromEntries(
    Object.entries(rawBySource)
      .filter(([key]) => /^[A-Za-z0-9_-]{1,64}$/.test(key))
      .map(([key, amount]) => [key, readNonNegativeInteger(amount)]),
  );
  return {
    dayKey,
    totalEarned: readNonNegativeInteger(row.totalEarned),
    bySource,
  };
}

export function applyShardEarnBudget(
  current: ShardEarnDailyCounter,
  policy: ShardEarnPolicy,
  receiptAlreadyExists: boolean,
):
  | { allowed: true; counted: false; counter: ShardEarnDailyCounter }
  | { allowed: true; counted: true; counter: ShardEarnDailyCounter }
  | { allowed: false; counted: false; counter: ShardEarnDailyCounter } {
  if (receiptAlreadyExists) {
    return { allowed: true, counted: false, counter: current };
  }
  const sourceEarned = readNonNegativeInteger(current.bySource[policy.reasonKey]);
  const nextSourceEarned = sourceEarned + policy.amount;
  const nextTotalEarned = readNonNegativeInteger(current.totalEarned) + policy.amount;
  if (
    nextSourceEarned > policy.perSourceDailyMax
    || nextTotalEarned > SHARD_EARN_DAILY_TOTAL_MAX
  ) {
    return { allowed: false, counted: false, counter: current };
  }
  return {
    allowed: true,
    counted: true,
    counter: {
      dayKey: current.dayKey,
      totalEarned: nextTotalEarned,
      bySource: {
        ...current.bySource,
        [policy.reasonKey]: nextSourceEarned,
      },
    },
  };
}
