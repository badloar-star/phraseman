export const DAILY_JOURNEY_TOTAL_DAYS = 50;
export const DAILY_JOURNEY_CHAPTER_SIZE = 10;

export type DailyJourneyRewardKind =
  | 'pearls'
  | 'runes'
  | 'energy_full'
  | 'energy_plus'
  | 'spins'
  | 'freeze';

export type DailyJourneyReward = Readonly<{
  day: number;
  kind: DailyJourneyRewardKind;
  amount: number;
}>;

/** Exact durable payload used when a Daily Journey day becomes an occurrence. */
export type DailyJourneyRewardPayload = Readonly<{
  kind: DailyJourneyRewardKind;
  amount: number;
}>;

const RAW_REWARDS: readonly (readonly [DailyJourneyRewardKind, number])[] = [
  ['pearls', 10], ['runes', 100], ['energy_full', 1], ['spins', 1], ['freeze', 1],
  ['pearls', 20], ['runes', 200], ['energy_plus', 2], ['spins', 2], ['runes', 500],
  ['pearls', 20], ['runes', 200], ['energy_plus', 2], ['spins', 1], ['freeze', 1],
  ['pearls', 50], ['runes', 300], ['energy_full', 1], ['spins', 2], ['runes', 600],
  ['pearls', 50], ['runes', 300], ['energy_plus', 3], ['spins', 2], ['freeze', 1],
  ['pearls', 100], ['runes', 400], ['energy_full', 1], ['spins', 3], ['runes', 700],
  ['pearls', 100], ['runes', 400], ['energy_plus', 3], ['spins', 2], ['freeze', 2],
  ['pearls', 250], ['runes', 500], ['energy_full', 1], ['spins', 3], ['runes', 800],
  ['pearls', 250], ['runes', 500], ['energy_plus', 3], ['spins', 3], ['freeze', 2],
  ['pearls', 250], ['runes', 750], ['energy_full', 1], ['spins', 5], ['runes', 1000],
];

export const DAILY_JOURNEY_REWARDS: readonly DailyJourneyReward[] = Object.freeze(
  RAW_REWARDS.map(([kind, amount], index) => Object.freeze({ day: index + 1, kind, amount })),
);

export function normalizeDailyJourneyDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.max(1, Math.min(DAILY_JOURNEY_TOTAL_DAYS, Math.round(day)));
}

export function dailyJourneyRewardForDay(day: number): DailyJourneyReward {
  return DAILY_JOURNEY_REWARDS[normalizeDailyJourneyDay(day) - 1];
}

// Keep the journal payload derived from the same frozen reward table as the
// reveal.  The modal never calculates an amount of its own.
export function dailyJourneyRewardPayloadForDay(day: number): DailyJourneyRewardPayload {
  const reward = dailyJourneyRewardForDay(day);
  return Object.freeze({ kind: reward.kind, amount: reward.amount });
}

export function dailyJourneyChapterForDay(day: number): readonly DailyJourneyReward[] {
  const normalizedDay = normalizeDailyJourneyDay(day);
  const chapterStart = Math.floor((normalizedDay - 1) / DAILY_JOURNEY_CHAPTER_SIZE) * DAILY_JOURNEY_CHAPTER_SIZE;
  return DAILY_JOURNEY_REWARDS.slice(chapterStart, chapterStart + DAILY_JOURNEY_CHAPTER_SIZE);
}

export function dailyJourneyChapterNumber(day: number): number {
  return Math.floor((normalizeDailyJourneyDay(day) - 1) / DAILY_JOURNEY_CHAPTER_SIZE) + 1;
}
